// Read-only browser acceptance of the actual static export and stock refresh behavior.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { chromium } from 'playwright';
const root = path.resolve(process.env.EXPORT_ROOT || 'out');
const snapshot = JSON.parse(fs.readFileSync(process.env.MERCHANT_SNAPSHOT || '.next/cache/skufnya-build/catalog-snapshot.json'));
const slugs = ['johnny-joestar', 'cha-hae-in-solo-leveling', 'goblin-slayer-orcbolg-figure-statue-various-sizes', 'hornet-hollow-knight', 'yennefer-witcher'];
const server = http.createServer((req, res) => {
  let file = path.resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname));
  if (!file.startsWith(root + path.sep)) { res.writeHead(400); res.end(); return; }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  if (!fs.existsSync(file)) { res.writeHead(404); res.end(); return; }
  const mime = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.xml': 'application/xml', '.json': 'application/json' };
  res.writeHead(200, { 'content-type': mime[path.extname(file)] || 'application/octet-stream' }); fs.createReadStream(file).pipe(res);
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE || undefined, headless: true });
const rows = [], writes = [];
try {
  const context = await browser.newContext();
  await context.route('https://api.skufnya.com/**', async route => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.pathname === '/api/analytics/snapshot') return route.fulfill({ status: 204, body: '' });
    if (request.method() !== 'GET') { writes.push(request.url()); return route.abort(); }
    if (url.pathname === '/api/catalog/resin-colors') return route.fulfill({ json: { items: snapshot.resinColors.map(color => ({ ...color, priceDelta: color.priceDelta + 999, isInStock: !color.isInStock })) } });
    if (url.pathname === '/api/shipping/policy') return route.fulfill({ json: { currency: 'UAH', freeDeliveryThreshold: 1500, deliveryPrice: 120 } });
    if (url.pathname.startsWith('/uploads/')) return route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg"/>' });
    return route.fulfill({ status: 401, json: {} });
  });
  const page = await context.newPage();
  for (const slug of slugs) {
    const product = snapshot.items.find(product => product.slug === slug);
    const variant = product.variants.find(variant => variant.isDefault) ?? product.variants[0];
    const color = snapshot.resinColors.find(color => color.isInStock) ?? snapshot.resinColors[0];
    const expected = variant.price + color.priceDelta;
    await page.goto(`http://127.0.0.1:${server.address().port}/product/${slug}/`, { waitUntil: 'networkidle' });
    const amount = await page.locator('main [class*="priceMain"]').first().textContent();
    assert.equal(Number(amount.replace(/[^\d,.]/g, '').replace(',', '.')), expected, slug);
    const data = await page.locator('script[type="application/ld+json"]').first().textContent();
    assert.equal(JSON.parse(data).offers.price, expected, slug);
    rows.push({ slug, variantId: variant.id, color: color.slug, jsonLdPrice: expected, hydratedPrice: expected, stockRefreshChangedPrice: false });
  }
  assert.deepEqual(writes, []);
  console.log(JSON.stringify({ passed: rows.length, productionWrites: 0, rows }, null, 2));
} finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
