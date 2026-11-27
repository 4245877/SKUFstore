import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { test } from 'node:test';

const workspaceRequire = createRequire(new URL('../../../package.json', import.meta.url));
const workspaceRoot = fileURLToPath(new URL('../../../', import.meta.url));

test('parser minimatch bounds globstar-parent expansion at the requested budget', () => {
  const parserRequire = createRequire(workspaceRequire.resolve('@typescript-eslint/parser'));
  const estreeRequire = createRequire(parserRequire.resolve('@typescript-eslint/typescript-estree'));
  const minimatchPath = estreeRequire.resolve('minimatch');
  // Small synthetic input; a separate bounded process also protects the test
  // runner if the upstream amplification bug is accidentally reintroduced.
  const script = `const { Minimatch } = require(process.argv[1]);
    const pattern = Array(12).fill('**/../segment/tail').join('/');
    const matcher = new Minimatch(pattern, { optimizationLevel: 2, braceExpandMax: 32 });
    if (matcher.set.length > 32) throw new Error('Pattern expansion exceeded budget');
    if (!new Minimatch('src/**/*.ts').match('src/nested/file.ts')) throw new Error('Normal matching regressed');`;
  const child = spawnSync(process.execPath, ['--max-old-space-size=64', '-e', script, minimatchPath],
    { encoding: 'utf8', timeout: 10000, maxBuffer: 128 * 1024 });
  assert.ifError(child.error);
  assert.equal(child.status, 0, child.stderr);
});

test('upgraded ESLint still applies the project rules and parses TS, JSX and CommonJS', async () => {
  const { ESLint } = workspaceRequire('eslint');
  const eslint = new ESLint({ cwd: workspaceRoot });
  const jsFile = path.join(workspaceRoot, 'apps/storefront/src', '__dependency_probe__.jsx');
  const [invalid] = await eslint.lintText('releaseUndefinedProbe();', { filePath: jsFile });
  assert.equal(invalid.fatalErrorCount, 0);
  assert.ok(invalid.messages.some((message: { ruleId: string }) => message.ruleId === 'no-undef'),
    'The lint upgrade must not silently ignore files or disable correctness rules');
  for (const [extension, source] of [
    ['tsx', 'const value: number = 1; console.log(value);'],
    ['jsx', 'const Card = () => <span />; console.log(Card);'],
    ['cjs', 'module.exports = 1;']
  ]) {
    const [valid] = await eslint.lintText(source, {
      filePath: path.join(workspaceRoot, 'apps/storefront/src', `__dependency_probe__.${extension}`)
    });
    assert.equal(valid.errorCount, 0, JSON.stringify(valid.messages));
    assert.equal(valid.warningCount, 0, JSON.stringify(valid.messages));
  }
});
