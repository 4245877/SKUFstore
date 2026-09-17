// Local exported pages with fixture API only. No requests reach production.
import assert from 'node:assert/strict';
import fs from 'node:fs';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.SMOKE_BASE || 'http://127.0.0.1:54332';
assert.equal(new URL(base).hostname, '127.0.0.1');
const snapshot = JSON.parse(fs.readFileSync(process.env.SMOKE_SNAPSHOT || '.next/cache/skufnya-build/catalog-snapshot.json', 'utf8'));
const range = snapshot.items.find(p => !p.isAdult && p.pricing?.hasPriceRange);
const single = snapshot.items.find(p => !p.isAdult && !p.pricing?.hasPriceRange);
assert.ok(range && single);
const legacy = { ...snapshot.items.find(p => !p.isAdult && p.id !== range.id && p.id !== single.id), pricing: undefined };
const products = [range, single, legacy];
let account = false;
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_EXECUTABLE });
const context = await browser.newContext({ locale: 'de-DE', viewport: { width: 1440, height: 1000 } });
await context.route('**/*', async route => {
  const request = route.request(), url = new URL(request.url());
  if (url.hostname === '127.0.0.1') return route.continue();
  const json = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
  if (request.resourceType() === 'image') return route.fulfill({ contentType: 'image/png', body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aE1sAAAAASUVORK5CYII=', 'base64') });
  assert.equal(url.hostname, 'api.skufnya.com', 'Unexpected external request');
  if (url.pathname === '/api/shipping/policy') return json({ currency: 'UAH', freeDeliveryThreshold: 1500, deliveryPrice: 120 });
  if (url.pathname === '/api/catalog/products/home') return json({ items: products });
  if (url.pathname === '/api/catalog/products') return json({ items: products, meta: { page: 1, pageCount: 1, total: 3, limit: 24 } });
  if (url.pathname === '/api/catalog/categories') return json({ items: [] });
  if (url.pathname === '/api/catalog/resin-colors') return json({ items: snapshot.resinColors || [] });
  if (url.pathname === '/api/catalog/products/' + range.slug) return json(range);
  if (url.pathname === '/api/account/favorites' && account) return json({ items: products.map(p => ({ ...p, productId: p.id, createdAt: '2026-09-17T00:00:00Z' })) });
  if (url.pathname.includes('/auth/') || url.pathname.includes('/account/')) return json({ error: 'UNAUTHORIZED' }, 401);
  if (url.pathname.includes('/analytics')) return json({ ok: true });
  throw new Error('Unexpected fixture request: ' + request.method() + ' ' + url.pathname);
});
const page = await context.newPage();
const errors = [], httpErrors = [], checks = [];
page.on('pageerror', e => errors.push(e.message));
page.on('response', r => { if (r.status() >= 400 && r.status() !== 401) httpErrors.push({ url: r.url(), status: r.status() }); });
const normalized = s => s.replace(/\s/g, ' ');
async function label(node, p) {
  const value = normalized(await node.innerText());
  assert.equal(value.startsWith('від '), p.pricing?.hasPriceRange === true, `${p.title}: ${value}`);
  assert.ok(value.includes(normalized(p.priceFrom.toLocaleString('uk-UA'))), value);
  assert.doesNotMatch(value, /NaN|Infinity/);
}
async function go(path) { await page.goto(base + path); await page.waitForLoadState('networkidle'); }
async function guestPrices() {
  for (const p of [range, single]) {
    const card = page.locator('article').filter({ has: page.getByRole('heading', { name: p.title, exact: true }) });
    await label(card.locator('[class*="cardPrice"], [class*="listCardPrice"]'), p);
  }
}
try {
  await go('/');
  for (const p of products) {
    const card = page.locator('main a').filter({ has: page.getByRole('heading', { name: p.title, exact: true }) }).first();
    await label(card.locator('[class*="cardPrice"]'), p);
  }
  checks.push('home: range, single, legacy DTO');
  await go('/catalog/');
  for (const p of products) {
    const card = page.locator('article').filter({ hasText: p.title });
    await label(card.locator('[class*="cardPrice"]'), p);
    if (p !== legacy) await card.getByRole('button', { name: 'Додати до обраного', exact: true }).click();
  }
  const storage = await page.evaluate(() => localStorage.getItem('skufnya:favorites'));
  assert.equal(JSON.parse(storage).find(p => p.productId === range.id).hasPriceRange, true);
  checks.push('catalog: range, single, fallback; guest snapshot retains range');
  await go('/favorites/'); await guestPrices();
  await page.getByRole('button', { name: 'Список', exact: true }).click(); await guestPrices();
  await page.reload(); await page.waitForLoadState('networkidle'); await guestPrices();
  assert.equal(await page.evaluate(() => localStorage.getItem('skufnya:favorites')), storage);
  checks.push('favorites grid/list/reload preserves price labels and storage');
  await page.evaluate(() => localStorage.removeItem('skufnya:favorites'));
  await go('/product/' + range.slug + '/');
  await page.getByRole('button', { name: 'Додати до обраного', exact: true }).click();
  await page.waitForFunction(() => localStorage.getItem('skufnya:favorites') !== null);
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('skufnya:favorites'))[0].hasPriceRange), true);
  await go('/favorites/');
  await label(page.locator('article').filter({ hasText: range.title }).locator('[class*="cardPrice"]'), range);
  checks.push('product → guest favorite retains range');
  // Existing snapshots without the optional field remain readable and unmodified.
  const old = { productId: single.id, slug: single.slug, title: single.title, priceFrom: single.priceFrom, currency: 'UAH', addedAt: '2026-09-16T00:00:00Z' };
  await page.evaluate(value => localStorage.setItem('skufnya:favorites', JSON.stringify([value])), old);
  await go('/favorites/');
  await label(page.locator('article').filter({ hasText: single.title }).locator('[class*="cardPrice"]'), single);
  assert.deepEqual(await page.evaluate(() => JSON.parse(localStorage.getItem('skufnya:favorites'))), [old]);
  checks.push('legacy favorites persistence requires no migration');
  account = true; await go('/favorites/');
  for (const p of products) await label(page.locator('article').filter({ hasText: p.title }).locator('[class*="cardPrice"]'), p);
  checks.push('account favorites: range, single, legacy DTO');
  assert.deepEqual(errors, []); assert.deepEqual(httpErrors, []);
  console.log(JSON.stringify({ passed: true, checks, pageErrors: errors, httpErrors }));
} finally { await browser.close(); }
