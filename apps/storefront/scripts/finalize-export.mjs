// Next 15.0 requires a parameter even for an intentionally empty static catalog.
// Remove its internal 404 placeholder from the final deploy artifact, never a product.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve('out');
if (process.env.DEPLOY_TARGET === 'pages' && fs.existsSync(root)) {
  const snapshot = JSON.parse(fs.readFileSync('.next/cache/skufnya-build/catalog-snapshot.json'));
  if (snapshot.count === 0 && snapshot.items.length === 0 && snapshot.emptyConfirmed === true) {
    for (const prefix of ['product', 'en/product']) {
      const directory = path.join(root, prefix, '_skuf-empty-catalog');
      const html = path.join(directory, 'index.html');
      if (fs.existsSync(html)) {
        assert.ok(fs.readFileSync(html, 'utf8').includes('noindex'), 'Empty-catalog placeholder must be a 404');
        assert.ok(!fs.readFileSync(html, 'utf8').includes('"@type":"Product"'), 'Refusing to remove a product');
      }
      fs.rmSync(directory, { recursive: true, force: true });
      fs.rmSync(directory + '.txt', { force: true });
      fs.rmSync(directory + '.html', { force: true });
    }
    console.log('[catalog-export] confirmed empty catalog; removed internal Next 15 static 404 placeholders');
  }
}
