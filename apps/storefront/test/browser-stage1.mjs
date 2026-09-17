// Local static export only. All API responses are fixtures; no production writes.
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
import assert from 'node:assert/strict';
import fs from 'node:fs';
const snapshot = JSON.parse(fs.readFileSync(process.env.SMOKE_SNAPSHOT || '.next/cache/skufnya-build/catalog-snapshot.json', 'utf8'));
const product = snapshot.items.find((p) => !p.isAdult && p.variants.length > 1);
assert.ok(product, 'fixture needs a product with a non-default variant');
const selected = product.variants.find((v) => !v.isDefault);
const namePattern = (name) => new RegExp(name.trim().split(/\s+/).map(part => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('\\s+'));
const colors = [
  { id: 'test-pearl', slug: 'pearl', name: 'Перламутровий', hexColor: '#EEEEEE', priceDelta: 200, isInStock: true, sortOrder: 0 },
  { id: 'test-black', slug: 'black', name: 'Чорний', hexColor: '#111111', priceDelta: 100, isInStock: true, sortOrder: 1 },
];
let revision = 0;
let createCalls = [];
let quoteCalls = [];
let failNextCreate = true;
const base = process.env.SMOKE_BASE || 'http://127.0.0.1:54330';
assert.equal(new URL(base).hostname, '127.0.0.1', 'fixture checkout smoke must run only on a local static server');
let authenticated = false;
let savedOrder;
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_EXECUTABLE });
const context = await browser.newContext({ locale: process.env.SMOKE_LOCALE || 'de-DE', viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
const errors = [];
const consoleErrors = [];
const checks = [];
page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
const captured = {};
const httpErrors = [];
page.on('response', r => { if (r.status() >= 400) { httpErrors.push({ url: r.url(), status: r.status() }); if (![401,409].includes(r.status())) console.log('HTTP ERROR', r.status(), r.url()); } });
async function capture(label) {
  await page.waitForLoadState('networkidle');
  captured[label] = await page.evaluate(() => ({
    lang: document.documentElement.lang,
    header: document.querySelector('header').innerText.replace(/\s+/g, ' ').trim(),
    footer: document.querySelector('footer').innerText.replace(/\s+/g, ' ').trim(),
    title: document.title,
    canonical: document.querySelector('link[rel=canonical]')?.href || null,
    controls: [...document.querySelectorAll('header [aria-label],footer [aria-label]')].map(n => n.getAttribute('aria-label')),
    links: [...document.querySelectorAll('header a,footer a')].map(n => n.getAttribute('href')),
  }));
  assert.equal(captured[label].lang, 'uk');
}
page.on('pageerror', (e) => { errors.push(e.message); console.log('PAGE ERROR', page.url(), e.message); });
function price(body) {
  const items = body.items.map((line) => {
    const variant = product.variants.find((v) => v.id === line.variantId);
    assert.ok(variant, 'checkout sent an actual variant id');
    assert.equal(line.productId, product.id);
    assert.equal(line.finish, 'MONO');
    assert.equal('price' in line, false);
    const color = colors.find((c) => c.slug === line.colorSlug);
    assert.ok(color, 'checkout sent structured colorSlug');
    const delta = color.priceDelta + revision * 50;
    return { variantId: variant.id, productId: product.id, title: product.title, variantName: variant.name, sku: variant.sku, imageUrl: null, currency: 'UAH', unitPrice: variant.price + delta, qty: line.qty, totalPrice: (variant.price + delta) * line.qty,
      configurationSnapshot: { version: 1, finish: 'MONO', finishLabel: 'Монохромна версія', color: { ...color, priceDelta: delta }, baseUnitPrice: variant.price, finishPriceDelta: 0, currency: 'UAH' } };
  });
  const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
  const deliveryPrice = body.deliveryMethod === 'pickup' || subtotal >= 1500 ? 0 : 120;
  return { items, quoteToken: (revision ? 'b' : 'a').repeat(64), subtotal, deliveryPrice, total: subtotal + deliveryPrice, currency: 'UAH', shippingPolicy: { currency: 'UAH', freeDeliveryThreshold: 1500, deliveryPrice: 120 } };
}
await context.route('**/*', async (route) => {
  const url = new URL(route.request().url());
  if (url.hostname === '127.0.0.1') return route.continue();
  if (route.request().resourceType() === 'image') return route.fulfill({ contentType: 'image/png', body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aE1sAAAAASUVORK5CYII=', 'base64') });
  if (url.hostname !== 'api.skufnya.com') throw new Error('Unexpected external request: ' + url);
  const path = url.pathname;
  const json = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
  if (path === '/api/shipping/policy') return json({ currency: 'UAH', freeDeliveryThreshold: 1500, deliveryPrice: 120 });
  if (path === '/api/catalog/resin-colors') return json({ items: colors });
  if (path === '/api/catalog/products/home') return json({ items: [product] });
  if (path === '/api/catalog/products') return json({ items: [product], meta: { page: 1, pageCount: 1, total: 1, limit: 24 } });
  if (path === '/api/catalog/products/' + product.slug) return json(product);
  if (path === '/api/catalog/categories') return json({ items: [] });
  if (path === '/api/orders/quote') { const body = route.request().postDataJSON(); quoteCalls.push(body); return json({ quote: price(body) }); }
  if (path === '/api/orders') {
    const body = route.request().postDataJSON();
    createCalls.push(body);
    if (failNextCreate) {
      failNextCreate = false; revision = 1;
      return json({ error: 'ORDER_PRICE_CHANGED', message: 'Ціна змінилася. Перевірте оновлене замовлення.' }, 409);
    }
    const quote = price(body);
    assert.equal(body.quoteToken, quote.quoteToken);
    savedOrder = { ...quote, id: 'browser-order', number: 'SKF-BROWSER-TEST', status: 'pending', createdAt: '2026-09-16T12:00:00.000Z', customer: body,
      items: quote.items.map((item, index) => ({ ...item, id: `line-${index}`, slug: product.slug, name: item.title, subtitle: item.variantName, price: item.unitPrice, quantity: item.qty })) };
    return json({ order: savedOrder }, 201);
  }
  if (authenticated && path === '/api/auth/me') return json({ user: { id: 'smoke-user', firstName: 'Тестовий', lastName: 'Покупець', email: 'buyer@example.invalid', phone: '+380501112233', username: 'smoke', role: 'USER', createdAt: '2026-09-16T12:00:00.000Z' } });
  if (authenticated && path === '/api/orders/my') return json({ items: [savedOrder], meta: { page: 1, pageCount: 1, total: 1 } });
  if (authenticated && path === '/api/orders/my/browser-order') return json({ order: savedOrder });
  if (path.includes('/auth/') || path.includes('/account/')) return json({ error: 'UNAUTHORIZED' }, 401);
  if (path.includes('/analytics')) return json({ ok: true });
  throw new Error('Unexpected API request: ' + route.request().method() + ' ' + path);
});
try {
  await page.goto(base + '/');
  await capture('home');
  assert.match(captured.home.header, /Безкоштовна доставка від 1\s?500\s?₴/i);
  await page.getByRole('button', { name: 'Пошук', exact: true }).first().click();
  await page.getByPlaceholder('Знайти фігурку, серію або бренд...').fill('figure');
  await page.getByRole('button', { name: 'Шукати', exact: true }).first().click();
  await page.waitForURL('**/catalog/**');
  assert.equal(new URL(page.url()).searchParams.get('q'), 'figure');
  await capture('catalog');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Відкрити меню' }).click();
  await page.getByRole('dialog', { name: 'Мобільна навігація' }).waitFor({ state: 'visible' });
  await page.getByRole('button', { name: 'Закрити меню' }).click();
  await page.setViewportSize({ width: 1440, height: 1000 });
  checks.push('Header search, desktop/mobile navigation, live policy, Footer and uk language');
  await page.goto(`${base}/product/${product.slug}/`);
  await capture('product');
  await page.getByRole('button', { name: 'Додати до обраного', exact: true }).click();
  await page.waitForFunction(() => localStorage.getItem('skufnya:favorites') !== null);
  const favoritesBefore = await page.evaluate(() => localStorage.getItem('skufnya:favorites'));
  assert.ok(favoritesBefore);
  await page.goto(base + '/favorites/');
  await page.getByRole('heading', { name: product.title, exact: true }).first().waitFor();
  assert.equal(await page.evaluate(() => localStorage.getItem('skufnya:favorites')), favoritesBefore);
  await capture('favorites');
  await page.goto(`${base}/product/${product.slug}/`);
  await page.getByRole('button', { name: namePattern(selected.name) }).first().click();
  await page.getByRole('button', { name: /Перламутровий/ }).click();
  await page.getByRole('button', { name: /Додати до кошика/ }).click();
  await page.getByRole('button', { name: /Чорний/ }).click();
  await page.getByRole('button', { name: /Додано до кошика|Додати до кошика/ }).click();
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('skufnya:cart')));
  assert.equal(stored.length, 2);
  assert.ok(stored.every((line) => line.variantId === selected.id && line.finish === 'MONO'));
  assert.deepEqual(new Set(stored.map((line) => line.colorSlug)), new Set(['pearl', 'black']));
  const cartQuote = page.waitForResponse((response) => response.url().endsWith('/api/orders/quote'));
  await page.goto(`${base}/cart/`);
  await cartQuote;
  await page.waitForFunction(() => document.body.innerText.includes('Підсумок кошика') && !document.body.innerText.includes('Перевіряємо ціни та доставку'));
  await capture('cart');
  assert.ok(quoteCalls.length);
  assert.equal(await page.locator('[aria-disabled="true"]').count(), 0);
  await page.goto(`${base}/checkout/`);
  await page.getByRole('radio', { name: /Самовивіз/ }).check();
  await page.getByPlaceholder('Наприклад, Михайло Петренко').fill('Тестовий Покупець');
  await page.getByPlaceholder('name@example.com').fill('buyer@example.com');
  await page.getByPlaceholder('+380 00 000 00 00').fill('+380501112233');
  await page.getByPlaceholder('Київ').fill('Київ');
  await page.getByPlaceholder('Наприклад, узгодити з менеджером').fill('Узгодити з менеджером');
  await capture('checkout');
  const confirm = page.getByRole('button', { name: 'Підтвердити замовлення' });
  await confirm.click();
  await page.getByText('Ціна змінилася. Перевірте оновлене замовлення.').waitFor();
  assert.equal(createCalls.length, 1);
  assert.ok(await page.evaluate(() => !!localStorage.getItem('skufnya:cart')));
  await page.waitForFunction(() => !document.body.innerText.includes('Перевіряємо ціни та доставку'));
  await confirm.click();
  await page.waitForURL('**/checkout/success/**');
  assert.equal(createCalls.length, 2);
  const order = await page.evaluate(() => JSON.parse(localStorage.getItem('skufnya:last-order')));
  assert.equal(order.items.length, 2);
  assert.equal(order.items[0].variantId, selected.id);
  assert.equal(order.total, price(createCalls[1]).total);
  assert.equal(order.items[0].price, price(createCalls[1]).items[0].unitPrice);
  assert.ok(order.items[0].configurationSnapshot.color.name);
  assert.equal(await page.evaluate(() => localStorage.getItem('skufnya:cart')), null);
  checks.push('Non-default variant, two resin colors, favorites/storage, cart quote, pickup, checkout 409/review/retry and saved snapshot');
  authenticated = true;
  for (const [path, heading] of [['/profile/', 'Профиль'], ['/profile/orders/', 'Мои заказы'], ['/profile/orders/details/?id=browser-order', savedOrder.number]]) {
    await page.goto(base + path);
    await page.getByRole('heading', { name: heading, exact: true }).first().waitFor();
    await capture(path);
  }
  await page.goto(base + '/profile/orders/');
  const detailsLink = page.locator('main a[href^="/profile/orders/details/"]');
  await detailsLink.waitFor();
  assert.equal(await detailsLink.getAttribute('href'), '/profile/orders/details/?id=browser-order');
  await detailsLink.hover();
  await page.waitForLoadState('networkidle');
  await detailsLink.click();
  await page.waitForURL('**/profile/orders/details/?id=browser-order');
  await page.getByRole('heading', { name: savedOrder.number, exact: true }).waitFor();
  await page.waitForLoadState('networkidle');
  checks.push('Profile order href, real Link navigation, details rendering and prefetch without 404');
  assert.deepEqual(errors, []);
  assert.equal(httpErrors.filter(e => e.status === 404).length, 0, 'No profile or other prefetch 404 is allowed');
  assert.ok(httpErrors.every(e =>
    (e.status === 401 && ['/api/auth/me', '/api/account/favorites', '/api/account/favorites/' + product.id].includes(new URL(e.url).pathname)) ||
    (e.status === 409 && new URL(e.url).pathname === '/api/orders')), JSON.stringify(httpErrors));
  assert.ok(consoleErrors.every(e => /Failed to load resource: the server responded with a status of (401|409)/.test(e)), JSON.stringify(consoleErrors));
  checks.push('No unexpected HTTP/console/page/hydration errors, including profile prefetch');
  for (const payload of [...quoteCalls, ...createCalls]) {
    assert.equal('locale' in payload, false);
    assert.equal('shippingCountry' in payload, false);
    assert.equal('market' in payload, false);
    if ('currency' in payload) assert.equal(payload.currency, 'UAH');
  }
  // Render evidence and exact financial payloads can be compared across baseline/candidate.
  fs.writeFileSync(process.env.SMOKE_OUTPUT || '/tmp/skuf-stage1/browser.json', JSON.stringify({ passed: true, browserLocale: process.env.SMOKE_LOCALE || 'de-DE', checks, captured, stored, quoteCalls, createCalls, order, errors, consoleErrors, httpErrors }, null, 2));
  console.log('PASS: product selection → distinct cart lines → server quote → stale-price rejection → reviewed retry → authoritative confirmation');
} catch (error) {
  await page.screenshot({ path: '/tmp/skuf-stage1/browser-failure.png', fullPage: true });
  fs.writeFileSync('/tmp/skuf-stage1/browser-failure.txt', await page.locator('body').innerText());
  throw error;
} finally { await browser.close(); }
