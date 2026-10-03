import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

export function snapshotCollectionPaths(directory: string, buildId: string) {
  if (!/^[a-zA-Z0-9-]+$/.test(buildId)) throw new Error('Invalid catalog build ID');
  const collectionDirectory = path.join(directory, `collection-${buildId}`);
  return {
    directory: collectionDirectory,
    lock: path.join(collectionDirectory, 'writer.lock'),
    done: path.join(collectionDirectory, 'result.json'),
    failed: path.join(collectionDirectory, 'failed'),
    snapshot: path.join(collectionDirectory, 'catalog-snapshot.json'),
  };
}

/** Readers only ever see a complete JSON document, even if the writer dies. */
export function writeJsonAtomically(file: string, value: unknown) {
  const temporary = `${file}.${process.pid}-${randomUUID()}.tmp`;
  try {
    fs.writeFileSync(temporary, JSON.stringify(value));
    fs.renameSync(temporary, file);
  } finally {
    fs.rmSync(temporary, { force: true });
  }
}

/** Keep reusable Next cache bounded without removing another active writer. */
export function cleanupSnapshotCollections(directory: string, buildId: string, maxAgeMs = 86_400_000) {
  if (!fs.existsSync(directory)) return;
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (!entry.isDirectory() || !/^collection-[a-zA-Z0-9-]+$/.test(entry.name) || entry.name === `collection-${buildId}`) continue;
    const candidate = path.join(directory, entry.name);
    if (fs.existsSync(path.join(candidate, 'writer.lock'))) continue;
    // Only a completed/failed older collection is safe to clean. An empty run
    // directory can belong to a worker that has not acquired its lock yet.
    if (!fs.existsSync(path.join(candidate, 'result.json')) && !fs.existsSync(path.join(candidate, 'failed'))) continue;
    try {
      if (Date.now() - fs.statSync(candidate).mtimeMs > maxAgeMs) fs.rmSync(candidate, { recursive: true, force: true });
    } catch (error) {
      // Other workers may clean the same completed cache entry concurrently.
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
  }
}

/** Single writer across Next workers. Failed/incomplete collections never become a snapshot. */
export async function collectSnapshotOnce<T>(options: {
  directory: string;
  buildId: string;
  collect: () => Promise<T>;
  validate?: (result: T) => void;
  timeoutMs?: number;
}): Promise<T> {
  const { directory, buildId, collect, validate, timeoutMs = 600_000 } = options;
  const paths = snapshotCollectionPaths(directory, buildId);
  fs.mkdirSync(paths.directory, { recursive: true });
  cleanupSnapshotCollections(directory, buildId);
  const deadline = Date.now() + timeoutMs;
  function completed(): { result: T } | null {
    if (fs.existsSync(paths.failed)) throw new Error('Catalog collection failed in another build worker');
    if (!fs.existsSync(paths.done)) return null;
    const envelope = JSON.parse(fs.readFileSync(paths.done, 'utf8')) as { buildId?: string; result: T };
    if (envelope.buildId !== buildId) throw new Error('Catalog collection result belongs to a different build');
    validate?.(envelope.result);
    return { result: envelope.result };
  }
  for (;;) {
    const result = completed();
    if (result) return result.result;
    let owner = false;
    try { fs.mkdirSync(paths.lock); owner = true; }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error; }
    if (owner) {
      try {
        // Both success and failure must be rechecked after acquiring the lock:
        // the preceding owner may have settled between our first read and mkdir.
        const prior = completed();
        if (prior) return prior.result;
        const result = await collect();
        validate?.(result);
        writeJsonAtomically(paths.done, { buildId, result });
        return result;
      } catch (error) {
        fs.writeFileSync(paths.failed, 'Collection failed; do not reuse an older snapshot.');
        throw error;
      } finally { fs.rmdirSync(paths.lock); }
    }
    if (Date.now() >= deadline) throw new Error('Timed out waiting for the catalog snapshot writer');
    await new Promise(resolve => setTimeout(resolve, Math.min(100, Math.max(1, deadline - Date.now()))));
  }
}
