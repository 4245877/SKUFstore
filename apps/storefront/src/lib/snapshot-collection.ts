import fs from 'node:fs';
import path from 'node:path';

/** Single writer across Next workers. Failed/incomplete collections never become a snapshot. */
export async function collectSnapshotOnce<T>(options: {
  directory: string;
  buildId: string;
  collect: () => Promise<T>;
  timeoutMs?: number;
}): Promise<T> {
  const { directory, buildId, collect, timeoutMs = 600_000 } = options;
  if (!/^[a-zA-Z0-9-]+$/.test(buildId)) throw new Error('Invalid catalog build ID');
  fs.mkdirSync(directory, { recursive: true });
  const lock = path.join(directory, `collection-${buildId}.lock`);
  const done = path.join(directory, `collection-${buildId}.json`);
  const failed = path.join(directory, `collection-${buildId}.failed`);
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    if (fs.existsSync(failed)) throw new Error('Catalog collection failed in another build worker');
    if (fs.existsSync(done)) return JSON.parse(fs.readFileSync(done, 'utf8')) as T;
    let owner = false;
    try { fs.mkdirSync(lock); owner = true; }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error; }
    if (owner) {
      try {
        // A worker may have finished between our first read and acquiring the lock.
        if (fs.existsSync(done)) return JSON.parse(fs.readFileSync(done, 'utf8')) as T;
        const result = await collect();
        fs.writeFileSync(`${done}.tmp`, JSON.stringify(result));
        fs.renameSync(`${done}.tmp`, done);
        return result;
      } catch (error) {
        fs.writeFileSync(failed, 'Collection failed; do not reuse an older snapshot.');
        throw error;
      } finally { fs.rmdirSync(lock); }
    }
    if (Date.now() >= deadline) throw new Error('Timed out waiting for the catalog snapshot writer');
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}
