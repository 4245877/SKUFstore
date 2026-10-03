import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { collectSnapshotOnce, cleanupSnapshotCollections, snapshotCollectionPaths, writeJsonAtomically } from '../src/lib/snapshot-collection.ts';

const collectorUrl = new URL('../src/lib/snapshot-collection.ts', import.meta.url).href;
const configUrl = new URL('../next.config.ts', import.meta.url).href;

function temporary(t: { after: (callback: () => void) => void }) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'skuf-snapshot-test-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  return directory;
}

function worker(code: string, env: Record<string, string> = {}) {
  return new Promise<string>((resolve, reject) => {
    const child = spawn(process.execPath, ['--experimental-strip-types', '--input-type=module', '-e', code], { env: { ...process.env, ...env } });
    let output = '', errors = '';
    child.stdout.on('data', chunk => { output += chunk; });
    child.stderr.on('data', chunk => { errors += chunk; });
    child.on('error', reject);
    child.on('close', status => status === 0 ? resolve(output.trim()) : reject(new Error(`Worker exited ${status}: ${errors}`)));
  });
}

test('independent build workers collect exactly once and share a completed result', async t => {
  const directory = temporary(t), calls = path.join(directory, 'calls');
  const code = `import fs from 'node:fs'; import { collectSnapshotOnce } from ${JSON.stringify(collectorUrl)};
    const result = await collectSnapshotOnce({ directory: ${JSON.stringify(directory)}, buildId: 'one-build', collect: async () => {
      fs.appendFileSync(${JSON.stringify(calls)}, 'collected\\n');
      await new Promise(resolve => setTimeout(resolve, 100)); return { slugs: ['one', 'two'], count: 2 };
    }}); console.log(JSON.stringify(result));`;
  const results = await Promise.all(Array.from({ length: 4 }, () => worker(code)));
  assert.deepEqual(results.map(value => JSON.parse(value)), Array(4).fill({ slugs: ['one', 'two'], count: 2 }));
  assert.equal(fs.readFileSync(calls, 'utf8'), 'collected\n');
  const paths = snapshotCollectionPaths(directory, 'one-build');
  assert.equal(fs.existsSync(paths.lock), false);
  assert.equal(JSON.parse(fs.readFileSync(paths.done, 'utf8')).buildId, 'one-build');
});

test('repeated builds receive fresh isolated results without reusing an earlier run', async t => {
  const directory = temporary(t); let collections = 0;
  const run = (buildId: string) => collectSnapshotOnce({ directory, buildId, collect: async () => ({ generation: ++collections }) });
  assert.deepEqual(await run('first'), { generation: 1 });
  assert.deepEqual(await run('first'), { generation: 1 });
  assert.deepEqual(await run('second'), { generation: 2 });
  assert.equal(collections, 2);
  assert.notEqual(snapshotCollectionPaths(directory, 'first').snapshot, snapshotCollectionPaths(directory, 'second').snapshot);
});

test('failed writer fails all workers and never retries the failed run or exposes done', async t => {
  const directory = temporary(t); let calls = 0;
  const run = () => collectSnapshotOnce({ directory, buildId: 'failed-build', collect: async () => {
    calls++; await new Promise(resolve => setTimeout(resolve, 20)); throw new Error('API incomplete');
  }});
  const settled = await Promise.allSettled([run(), run(), run()]);
  assert.ok(settled.every(result => result.status === 'rejected'));
  await assert.rejects(run(), /failed in another/);
  assert.equal(calls, 1);
  const paths = snapshotCollectionPaths(directory, 'failed-build');
  assert.equal(fs.existsSync(paths.done), false); assert.equal(fs.existsSync(paths.lock), false); assert.equal(fs.existsSync(paths.failed), true);
});

test('terminated writer times out followers but cannot poison a later build', async t => {
  const directory = temporary(t);
  await worker(`import { collectSnapshotOnce } from ${JSON.stringify(collectorUrl)};
    await collectSnapshotOnce({ directory: ${JSON.stringify(directory)}, buildId: 'killed-build', collect: async () => { process.exit(0); }});`);
  const paths = snapshotCollectionPaths(directory, 'killed-build');
  assert.equal(fs.existsSync(paths.lock), true); assert.equal(fs.existsSync(paths.done), false);
  await assert.rejects(collectSnapshotOnce({ directory, buildId: 'killed-build', timeoutMs: 25, collect: async () => 'must not run' }), /Timed out/);
  assert.equal(await collectSnapshotOnce({ directory, buildId: 'next-build', collect: async () => 'fresh' }), 'fresh');
});

test('a result marker with the wrong build ID fails closed', async t => {
  const directory = temporary(t), paths = snapshotCollectionPaths(directory, 'current');
  fs.mkdirSync(paths.directory); writeJsonAtomically(paths.done, { buildId: 'old', result: { count: 1 } });
  await assert.rejects(collectSnapshotOnce({ directory, buildId: 'current', collect: async () => { throw new Error('must not recollect'); } }), /different build/);
});

test('cached completion is validated and cannot reuse a missing or stale snapshot', async t => {
  const directory = temporary(t), paths = snapshotCollectionPaths(directory, 'current');
  const validate = () => { assert.equal(JSON.parse(fs.readFileSync(paths.snapshot, 'utf8')).buildId, 'current'); };
  await collectSnapshotOnce({ directory, buildId: 'current', validate, collect: async () => {
    writeJsonAtomically(paths.snapshot, { buildId: 'current' }); return { count: 1 };
  }});
  fs.rmSync(paths.snapshot);
  await assert.rejects(collectSnapshotOnce({ directory, buildId: 'current', validate, collect: async () => ({ count: 2 }) }), /ENOENT/);
  writeJsonAtomically(paths.snapshot, { buildId: 'previous' });
  await assert.rejects(collectSnapshotOnce({ directory, buildId: 'current', validate, collect: async () => ({ count: 2 }) }));
});

test('invalid build IDs cannot escape the catalog cache', async t => {
  const directory = temporary(t);
  for (const buildId of ['', '../outside', 'bad/id', 'bad.id']) {
    await assert.rejects(collectSnapshotOnce({ directory, buildId, collect: async () => 'invalid' }), /Invalid catalog build ID/);
  }
  assert.deepEqual(fs.readdirSync(directory), []);
});

test('atomic snapshot writes replace complete payloads and remove temporary files on failure', t => {
  const directory = temporary(t), file = path.join(directory, 'snapshot.json');
  writeJsonAtomically(file, { buildId: 'old' }); writeJsonAtomically(file, { buildId: 'new', items: Array(1000).fill('product') });
  assert.equal(JSON.parse(fs.readFileSync(file, 'utf8')).buildId, 'new');
  const blocked = path.join(directory, 'blocked.json'); fs.mkdirSync(blocked);
  assert.throws(() => writeJsonAtomically(blocked, { buildId: 'failed' }));
  assert.equal(fs.readdirSync(directory).some(name => name.endsWith('.tmp')), false);
});

test('cleanup removes old completed runs while preserving live, recent and unstarted runs', t => {
  const directory = temporary(t);
  for (const buildId of ['old', 'active', 'recent', 'unstarted', 'current']) {
    const paths = snapshotCollectionPaths(directory, buildId); fs.mkdirSync(paths.directory);
    if (buildId !== 'unstarted') writeJsonAtomically(paths.done, { buildId, result: 1 });
    if (buildId === 'active') fs.mkdirSync(paths.lock);
    if (buildId !== 'recent') fs.utimesSync(paths.directory, new Date(0), new Date(0));
  }
  cleanupSnapshotCollections(directory, 'current', 1000);
  assert.equal(fs.existsSync(snapshotCollectionPaths(directory, 'old').directory), false);
  for (const id of ['active', 'recent', 'unstarted', 'current']) assert.equal(fs.existsSync(snapshotCollectionPaths(directory, id).directory), true);
});

test('Next primary invocations replace reused IDs while webpack workers inherit the run', async () => {
  const code = `const config = (await import(${JSON.stringify(configUrl)})).default; console.log(config.env.SKUF_CATALOG_BUILD_ID);`;
  const env = { SKUF_CATALOG_BUILD_ID: 'previous-run', NEXT_PRIVATE_BUILD_WORKER: '' };
  const first = await worker(code, env), second = await worker(code, env);
  assert.notEqual(first, 'previous-run'); assert.notEqual(first, second);
  assert.equal(await worker(code, { SKUF_CATALOG_BUILD_ID: first, NEXT_PRIVATE_BUILD_WORKER: '1' }), first);
});


test('repeated primary config evaluations preserve one build ID and restore its environment', async () => {
  const code = `const first = (await import(${JSON.stringify(configUrl)} + '?first')).default;
    process.env.SKUF_CATALOG_BUILD_ID = 'stale-value-between-config-loads';
    const second = (await import(${JSON.stringify(configUrl)} + '?second')).default;
    console.log(JSON.stringify([first.env.SKUF_CATALOG_BUILD_ID, second.env.SKUF_CATALOG_BUILD_ID, process.env.SKUF_CATALOG_BUILD_ID]));`;
  const [first, second, inherited] = JSON.parse(await worker(code, { SKUF_CATALOG_BUILD_ID: 'previous-run', NEXT_PRIVATE_BUILD_WORKER: '' }));
  assert.notEqual(first, 'previous-run'); assert.equal(second, first); assert.equal(inherited, first);
});

test('actual Next 15 config transpilation reuses the primary process build ID', async () => {
  const transpilerUrl = new URL('../node_modules/next/dist/build/next-config-ts/transpile-config.js', import.meta.url).href;
  const code = `import { fileURLToPath } from 'node:url'; import path from 'node:path';
    const { transpileConfig } = await import(${JSON.stringify(transpilerUrl)});
    const nextConfigPath = fileURLToPath(${JSON.stringify(configUrl)}), cwd = path.dirname(nextConfigPath);
    const first = (await transpileConfig({ nextConfigPath, cwd })).default;
    process.env.SKUF_CATALOG_BUILD_ID = 'stale-value-between-config-loads';
    const second = (await transpileConfig({ nextConfigPath, cwd })).default;
    console.log(JSON.stringify([first.env.SKUF_CATALOG_BUILD_ID, second.env.SKUF_CATALOG_BUILD_ID, process.env.SKUF_CATALOG_BUILD_ID]));`;
  const [first, second, inherited] = JSON.parse(await worker(code, { SKUF_CATALOG_BUILD_ID: 'previous-run', NEXT_PRIVATE_BUILD_WORKER: '' }));
  assert.notEqual(first, 'previous-run'); assert.equal(second, first); assert.equal(inherited, first);
});
