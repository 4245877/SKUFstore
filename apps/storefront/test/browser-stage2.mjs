// Local static export only. All API responses are fixtures; no production writes.
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { getTranslator } from '../src/i18n/translate.ts';
const results = [];
const browserLocales = process.env.SMOKE_LOCALE ? [process.env.SMOKE_LOCALE] : ['uk-UA', 'en-US'];
const routeLocales = process.env.SMOKE_ROUTE_LOCALE ? [process.env.SMOKE_ROUTE_LOCALE] : ['uk', 'en'];
const notFoundHtml = fs.readFileSync(path.join(process.env.SMOKE_EXPORT_ROOT || 'out', '404.html'), 'utf8');
const snapshot = JSON.parse(fs.readFileSync(process.env.SMOKE_SNAPSHOT || '.next/cache/skufnya-build/catalog-snapshot.json', 'utf8'));
const product = snapshot.items.find((p) => !p.isAdult && p.variants.filter(v => v.isActive).length > 1);
assert.ok(product, 'fixture needs a product with a non-default variant');
const selected = product.variants.find((v) => v.isActive && !v.isDefault);
const namePattern = (name) => new RegExp(name.trim().split(/\s+/).map(part => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('\\s+'));
const colors = [
  { id: 'test-pearl', slug: 'pearl', name: 'Перламутровий', hexColor: '#EEEEEE', priceDelta: 200, isInStock: true, sortOrder: 0 },
  { id: 'test-black', slug: 'black', name: 'Чорний', hexColor: '#111111', priceDelta: 100, isInStock: true, sortOrder: 1 },
];
async function run(routeLocale, browserLocale) {
const t = getTranslator(routeLocale);
const localized = p => routeLocale === 'en' ? '/en' + p : p;
let revision = 0;
let boundaryPrice = null;
let loginFailure = true;
let registerFailure = true;
let quoteFailure = false;
const authCalls = [];
const shippingChecks = [];
let createCalls = [];
let quoteCalls = [];
let failNextCreate = true;
const base = process.env.SMOKE_BASE || 'http://127.0.0.1:54332';
assert.equal(new URL(base).hostname, '127.0.0.1', 'fixture checkout smoke must run only on a local static server');
let authenticated = false;
let savedOrder;
const fixtureUser = { id: 'smoke-user', firstName: 'Test', lastName: 'Buyer', email: 'buyer@example.invalid', phone: '+380501112233', username: 'smoke', role: 'USER', createdAt: '2026-09-16T12:00:00.000Z' };
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_EXECUTABLE });
const context = await browser.newContext({ locale: browserLocale, viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
page.setDefaultTimeout(15000);
const activeRequests = new Set();
let lastNetworkEvent = Date.now();
page.on('request', request => { activeRequests.add(request); lastNetworkEvent = Date.now(); });
for (const event of ['requestfinished', 'requestfailed']) {
  page.on(event, request => { activeRequests.delete(request); lastNetworkEvent = Date.now(); });
}
async function settleNetwork() {
  // SPA navigation can leave networkidle satisfied while Link prefetches are queued.
  // Complete those requests before the test unloads their document.
  const deadline = Date.now() + 30000;
  while (activeRequests.size || Date.now() - lastNetworkEvent < 1000) {
    assert.ok(Date.now() < deadline, 'Stage 2 network did not settle: ' + [...activeRequests].map(request => request.url()).join(', '));
    await page.waitForTimeout(100);
  }
}
async function goto(url) {
  await settleNetwork();
  const response = await page.goto(url);
  await settleNetwork();
  return response;
}
const errors = [];
const consoleErrors = [];
const checks = [];
function check(message) { checks.push(message); console.log(JSON.stringify({ routeLocale, browserLocale, check: message })); }
page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
const captured = {};
const httpErrors = [];
page.on('response', r => { if (r.status() >= 400) { httpErrors.push({ url: r.url(), status: r.status() }); if (![400,401,404,409].includes(r.status())) console.log('HTTP ERROR', r.status(), r.url()); } });
async function visit(route) {
  const response = await goto(base + localized(route));
  assert.equal(response.status(), 200, route);
  await settleNetwork();
  assert.equal(await page.locator('html').getAttribute('lang'), routeLocale);
  assert.equal(new URL(page.url()).pathname, new URL(base + localized(route)).pathname);
}
async function capture(label) {
  await settleNetwork();
  captured[label] = await page.evaluate(() => ({
    lang: document.documentElement.lang,
    header: document.querySelector('header').innerText.replace(/\s+/g, ' ').trim(),
    footer: document.querySelector('footer').innerText.replace(/\s+/g, ' ').trim(),
    title: document.title,
    canonical: document.querySelector('link[rel=canonical]')?.href || null,
    controls: [...document.querySelectorAll('header [aria-label],footer [aria-label]')].map(n => n.getAttribute('aria-label')),
    links: [...document.querySelectorAll('header a,footer a')].map(n => n.getAttribute('href')),
  }));
  assert.equal(captured[label].lang, routeLocale);
  assert.equal(new URL(page.url()).pathname.startsWith('/en/'), routeLocale === 'en', 'Browser locale may not redirect route locale');
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
    const unitPrice = boundaryPrice ?? variant.price + delta;
    return { variantId: variant.id, productId: product.id, title: product.title, variantName: variant.name, sku: variant.sku, imageUrl: null, currency: 'UAH', unitPrice, qty: line.qty, totalPrice: unitPrice * line.qty,
      configurationSnapshot: { version: 1, finish: 'MONO', finishLabel: 'Монохромна версія', color: { ...color, priceDelta: delta }, baseUnitPrice: boundaryPrice === null ? variant.price : boundaryPrice - delta, finishPriceDelta: 0, currency: 'UAH' } };
  });
  const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
  const deliveryPrice = body.deliveryMethod === 'pickup' || subtotal >= 1500 ? 0 : 120;
  return { items, quoteToken: (body.deliveryMethod === 'pickup' ? (revision ? 'd' : 'c') : (revision ? 'b' : 'a')).repeat(64), subtotal, deliveryPrice, total: subtotal + deliveryPrice, currency: 'UAH', shippingPolicy: { currency: 'UAH', freeDeliveryThreshold: 1500, deliveryPrice: 120 } };
}
await context.route('**/*', async (route) => {
  const url = new URL(route.request().url());
  if (url.hostname === '127.0.0.1') {
    if (['/de/', '/uk/', '/en/missing-stage2-route/', '/missing-stage2-route/'].includes(url.pathname)) return route.fulfill({ status: 404, contentType: 'text/html', body: notFoundHtml });
    return route.continue();
  }
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
  if (path === '/api/orders/quote') {
    const body = route.request().postDataJSON(); quoteCalls.push(body);
    if (quoteFailure) return json({ error: 'INVALID_RESIN_COLOR', message: 'Backend source-language message must not leak' }, 400);
    return json({ quote: price(body) });
  }
  if (path === '/api/auth/login') {
    const body = route.request().postDataJSON(); authCalls.push({ path, body });
    if (loginFailure) return json({ error: 'INVALID_CREDENTIALS', message: 'Backend source-language message must not leak' }, 401);
    authenticated = true; return json({ user: fixtureUser });
  }
  if (path === '/api/auth/register/request-code') { authCalls.push({ path, body: route.request().postDataJSON() }); return json({ ok: true }); }
  if (path === '/api/auth/register') {
    const body = route.request().postDataJSON(); authCalls.push({ path, body });
    if (registerFailure) return json({ error: 'INVALID_VERIFICATION_CODE', message: 'Backend source-language message must not leak' }, 400);
    authenticated = true; return json({ user: fixtureUser });
  }
  if (path === '/api/account/profile' && authenticated) { const body = route.request().postDataJSON(); authCalls.push({ path, body }); return json({ user: { ...fixtureUser, ...body } }); }
  if (path === '/api/account/favorites' && authenticated) return json({ items: [] });
  if (path === '/api/np/warehouses' || path.includes('/nova-poshta/')) return json({ items: [] });
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
  if (path === '/api/auth/me') return json({ user: authenticated ? fixtureUser : null });
  if (authenticated && path === '/api/orders/my') return json({ items: savedOrder ? [savedOrder] : [], meta: { page: 1, pageCount: 1, total: 1 } });
  if (authenticated && path === '/api/orders/my/browser-order') return json({ order: savedOrder });
  if (path.includes('/auth/') || path.includes('/account/')) return json({ error: 'UNAUTHORIZED' }, 401);
  if (path.includes('/analytics')) return json({ ok: true });
  throw new Error('Unexpected API request: ' + route.request().method() + ' ' + path);
});
try {
  for (const route of ['/contacts/', '/delivery/', '/payment/', '/returns/', '/privacy/', '/terms/', '/faq/', '/user-data-deletion/', '/forgot-password/', '/profile/addresses/', '/checkout/failed/']) {
    await visit(route);
    assert.ok(await page.locator('h1').count(), 'Missing page heading ' + route);
    if (routeLocale === 'en') assert.doesNotMatch(await page.evaluate(() => { const copy = document.body.cloneNode(true); copy.querySelectorAll('header, footer, [role=dialog], script, style').forEach(node => node.remove()); return copy.textContent; }), /[\u0400-\u04FF]/u, 'Untranslated general page ' + route);
    const links = await page.locator('a[href^="/"]').evaluateAll(nodes => nodes.filter(n => !n.closest('header,footer,[role=dialog]')).map(n => n.getAttribute('href')));
    assert.ok(links.every(href => routeLocale === 'en' ? href.startsWith('/en/') : !href.startsWith('/en/')), 'General-page link leaves current locale ' + route);
  }
  check('Legal, delivery, payment, contacts, FAQ, account help and failed order pages are localized with current-locale links');
  await visit('/verify/');
  await page.getByRole('button', { name: t('shop.iAmUnder18ReturnToThe'), exact: true }).click();
  await page.waitForURL(u => u.pathname.replace(/\/$/, '') === localized('/catalog'));
  assert.equal(await page.evaluate(() => localStorage.getItem('skufnya:age_verified')), null);
  const ageReturn = '/catalog/?q=Sans#catalog-search';
  await visit('/verify/?returnTo=' + encodeURIComponent(ageReturn));
  await page.getByRole('button', { name: t('shop.iAm18OrOlder'), exact: false }).click();
  await page.waitForURL(u => u.pathname === localized('/catalog/') && u.searchParams.get('q') === 'Sans' && u.hash === '#catalog-search');
  assert.equal(await page.evaluate(() => localStorage.getItem('skufnya:age_verified')), 'true');
  check('Age verification and decline preserve current locale; accepted return preserves query/fragment and the existing age key');
  await visit('/cart/'); await page.getByRole('heading', { name: t('shop.yourCartIsEmpty'), exact: true }).waitFor();
  await visit('/checkout/'); await page.getByText(t('shop.addAProductToYourCartTo'), { exact: true }).waitFor();
  await visit('/checkout/success/'); await page.getByText(t('shop.informationAboutThisOrderIsUnavailableTry'), { exact: true }).waitFor();
  await visit('/favorites/'); assert.equal(await page.locator('main article').count(), 0);
  check('Empty cart, empty favorites, empty checkout and missing success state');
  await visit('/login/');
  await page.locator('input[name="email"]').fill('buyer@example.invalid');
  await page.locator('input[name="password"]').fill('fixture-password');
  await page.locator('form:has(input[name="email"]) button[type="submit"]').click();
  await page.getByText(t('errors.invalidCredentials'), { exact: true }).waitFor();
  assert.doesNotMatch(await page.locator('body').innerText(), /Backend source-language message/);
  await visit('/register/');
  const registration = page.getByRole('form', { name: t('auth.registrationForm') });
  await registration.locator('button[type="submit"]').click();
  await page.getByRole('alert').filter({ hasText: t('auth.firstNameIsRequired') }).first().waitFor();
  await page.getByPlaceholder(t('auth.sakura'), { exact: true }).fill('Test');
  await page.getByPlaceholder(t('auth.tanaka'), { exact: true }).fill('Buyer');
  await page.getByPlaceholder('sakura@example.com').fill('buyer@example.invalid');
  await page.getByPlaceholder('sakura_collector').fill('fixturebuyer');
  await page.getByPlaceholder(t('auth.atLeast8Characters'), { exact: true }).fill('fixture-password');
  await page.getByPlaceholder(t('auth.repeatYourPassword'), { exact: true }).fill('fixture-password');
  await registration.locator('label:has(input[type="checkbox"]) > span[aria-hidden="true"]').first().click();
  await registration.locator('button[type="submit"]').click();
  await page.getByPlaceholder('123456').waitFor();
  await page.getByPlaceholder('123456').fill('123456');
  await registration.locator('button[type="submit"]').click();
  await page.getByText(t('errors.codeInvalid'), { exact: true }).waitFor();
  assert.doesNotMatch(await page.locator('body').innerText(), /Backend source-language message/);
  check('Sign-in API error, registration validation, code request and localized verification-code API error; payloads contain no locale');
  await goto(base + localized('/'));
  await capture('home');
  assert.ok(captured.home.header.toLowerCase().includes(t('header.freeDelivery', { amount: '1 500 ₴' }).toLowerCase()));
  await page.getByRole('button', { name: t('header.search'), exact: true }).first().click();
  await page.getByPlaceholder(t('header.searchPlaceholder')).fill('figure');
  await page.locator('#search-bar').getByRole('button', { name: t('header.searchSubmit'), exact: true }).click();
  await page.waitForURL(u => u.pathname.replace(/\/$/, '') === localized('/catalog') && u.searchParams.get('q') === 'figure');
  assert.equal(new URL(page.url()).searchParams.get('q'), 'figure');
  await capture('catalog');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: t('header.openMenu') }).click();
  await page.getByRole('dialog', { name: t('header.mobileNavigation') }).waitFor({ state: 'visible' });
  await page.getByRole('button', { name: t('header.closeMenu') }).click();
  await page.setViewportSize({ width: 1440, height: 1000 });
  check('Header search, desktop/mobile navigation, 1500 UAH policy, Footer and route language');
  await goto(base + localized(`/product/${product.slug}/`));
  await capture('product');
  await page.getByRole('button', { name: t('shop.addToFavorites'), exact: true }).click();
  await page.waitForFunction(() => localStorage.getItem('skufnya:favorites') !== null);
  const favoritesBefore = await page.evaluate(() => localStorage.getItem('skufnya:favorites'));
  assert.ok(favoritesBefore);
  await goto(base + localized('/favorites/'));
  await page.getByRole('heading', { name: product.title, exact: true }).first().waitFor();
  assert.equal(await page.evaluate(() => localStorage.getItem('skufnya:favorites')), favoritesBefore);
  await capture('favorites');
  await goto(base + localized(`/product/${product.slug}/`));
  await page.getByRole('button', { name: namePattern(selected.name) }).first().click();
  await page.getByRole('button', { name: /Перламутровий/ }).click();
  await page.getByRole('button', { name: t('shop.addToCart') }).click();
  await page.getByRole('button', { name: /Чорний/ }).click();
  await page.getByRole('button', { name: new RegExp(t('shop.addedToCart') + '|' + t('shop.addToCart')) }).click();
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('skufnya:cart')));
  assert.equal(stored.length, 2);
  assert.ok(stored.every((line) => line.variantId === selected.id && line.finish === 'MONO'));
  assert.deepEqual(new Set(stored.map((line) => line.colorSlug)), new Set(['pearl', 'black']));
  // Both roots share the existing keys and switch through document navigation.
  const favoriteStorage = await page.evaluate(() => localStorage.getItem('skufnya:favorites'));
  const cartStorage = await page.evaluate(() => localStorage.getItem('skufnya:cart'));
  const target = routeLocale === 'uk' ? 'en' : 'uk';
  await settleNetwork();
  await page.locator(`header a[hreflang="${target}"]`).first().click();
  await page.waitForURL(u => u.pathname === (target === 'en' ? '/en' : '') + `/product/${product.slug}/`);
  await settleNetwork();
  assert.equal(await page.locator('html').getAttribute('lang'), target);
  assert.equal(await page.evaluate(() => localStorage.getItem('skufnya:favorites')), favoriteStorage);
  assert.equal(await page.evaluate(() => localStorage.getItem('skufnya:cart')), cartStorage);
  assert.equal(await page.evaluate(() => localStorage.getItem('skufnya:age_verified')), 'true');
  await settleNetwork();
  await page.locator(`header a[hreflang="${routeLocale}"]`).first().click();
  await page.waitForURL(u => u.pathname === localized(`/product/${product.slug}/`));
  await settleNetwork();
  assert.equal(await page.evaluate(() => localStorage.getItem('skufnya:cart')), cartStorage);
  check('Document language switches retain the shared cart, favorites, selected real variant and color configurations');
  // Exercise the threshold as authoritative backend results, not client estimates.
  for (const amount of [1499, 1500, 1501]) {
    boundaryPrice = amount;
    await page.evaluate(line => localStorage.setItem('skufnya:cart', JSON.stringify([line])), stored[0]);
    const responsePromise = page.waitForResponse(r => new URL(r.url()).pathname === '/api/orders/quote');
    await visit('/cart/');
    const response = await responsePromise; const { quote } = await response.json();
    const deliveryPrice = amount >= 1500 ? 0 : 120;
    assert.equal(quote.currency, 'UAH'); assert.equal(quote.subtotal, amount); assert.equal(quote.deliveryPrice, deliveryPrice); assert.equal(quote.total, amount + deliveryPrice);
    assert.deepEqual(quote.shippingPolicy, { currency: 'UAH', freeDeliveryThreshold: 1500, deliveryPrice: 120 });
    await page.getByRole('heading', { name: t('shop.cartSummary'), exact: true }).waitFor();
    await page.waitForFunction(m => !document.body.innerText.includes(m), t('shop.checkingPricesAndDelivery'));
    const summary = page.locator('[class*="summaryCard"]').first();
    const subtotalText = (await summary.locator('[class*="summaryLineVal"]').first().innerText()).replace(/\s/g, ' ');
    const totalText = (await summary.locator('[class*="summaryTotalVal"]').innerText()).replace(/\s/g, ' ');
    assert.ok(subtotalText.includes(new Intl.NumberFormat('uk-UA').format(amount).replace(/\s/g, ' ')), subtotalText);
    assert.ok(totalText.includes(new Intl.NumberFormat('uk-UA').format(amount + deliveryPrice).replace(/\s/g, ' ')), totalText);
    assert.match(totalText, /(?:₴|грн)/);
    const shippingText = (await summary.locator('[class*="summaryLineVal"]').nth(1).innerText()).replace(/\s/g, ' ');
    assert.ok(deliveryPrice === 0 ? shippingText === t('shop.free') : shippingText.includes('120'), shippingText);
    shippingChecks.push({ subtotal: amount, deliveryPrice, total: amount + deliveryPrice, currency: quote.currency, shippingPolicy: quote.shippingPolicy });
  }
  boundaryPrice = 1499;
  await visit('/checkout/');
  const pickupPromise = page.waitForResponse(r => new URL(r.url()).pathname === '/api/orders/quote' && r.request().postDataJSON().deliveryMethod === 'pickup');
  await page.getByRole('radio', { name: new RegExp(t('shop.pickup')) }).check();
  const pickup = (await (await pickupPromise).json()).quote;
  assert.equal(pickup.subtotal, 1499); assert.equal(pickup.deliveryPrice, 0); assert.equal(pickup.total, 1499);
  shippingChecks.push({ subtotal: pickup.subtotal, deliveryPrice: pickup.deliveryPrice, total: pickup.total, currency: pickup.currency, shippingPolicy: pickup.shippingPolicy });
  quoteFailure = true; await visit('/cart/');
  await page.getByText(t('errors.unavailable'), { exact: true }).waitFor();
  assert.doesNotMatch(await page.locator('body').innerText(), /Backend source-language message/);
  // A cart saved on UK must have English presentation even when no quote can supply a snapshot.
  const uk = getTranslator('uk'), en = getTranslator('en');
  const ukCartLine = { ...stored[0], subtitle: stored[0].subtitle.replace(` · ${t('shop.monochromeVersion')} · `, ` · ${uk('shop.monochromeVersion')} · `) };
  assert.equal(ukCartLine.configurationSnapshot, undefined);
  await page.evaluate(line => localStorage.setItem('skufnya:cart', JSON.stringify([line])), ukCartLine);
  await goto(base + '/cart/'); await settleNetwork();
  await page.getByText(uk('errors.unavailable'), { exact: true }).waitFor();
  const unavailableCartStorage = await page.evaluate(() => localStorage.getItem('skufnya:cart'));
  await settleNetwork();
  await page.locator('header a[hreflang="en"]').first().click();
  await page.waitForURL(u => u.pathname === '/en/cart/');
  await page.getByText(en('errors.unavailable'), { exact: true }).waitFor();
  for (const route of ['/en/cart/', '/en/checkout/']) {
    if (route.endsWith('/checkout/')) await goto(base + route);
    await settleNetwork();
    await page.getByText(en('errors.unavailable'), { exact: true }).waitFor();
    const visible = await page.locator('body').innerText();
    assert.doesNotMatch(visible, /Монохромна версія|Backend source-language message/);
    assert.ok(visible.includes(en('shop.monochromeVersion')));
    assert.ok(visible.includes(colors.find(color => color.slug === ukCartLine.colorSlug).name), 'Keep the original catalog color name');
    assert.equal(await page.evaluate(() => localStorage.getItem('skufnya:cart')), unavailableCartStorage, 'Presentation must not rewrite stored selections');
    if (route.endsWith('/checkout/')) assert.equal(await page.getByRole('button', { name: en('shop.confirmOrder') }).isDisabled(), true);
  }
  check('UK cart switches to English cart/checkout with localized finish and safe error even when quote fails; storage/source color are preserved');
  quoteFailure = false; boundaryPrice = null;
  await page.evaluate(items => localStorage.setItem('skufnya:cart', JSON.stringify(items)), stored);
  check('1499 UAH charges 120, 1500/1501 UAH are free, pickup at 1499 is free, unavailable quote is localized and does not leak backend prose');
  const cartQuote = page.waitForResponse((response) => response.url().endsWith('/api/orders/quote'));
  await goto(base + localized('/cart/'));
  await cartQuote;
  await page.waitForFunction(m => document.body.innerText.includes(m.heading) && !document.body.innerText.includes(m.loading), { heading: t('shop.cartSummary'), loading: t('shop.checkingPricesAndDelivery') });
  await capture('cart');
  if (routeLocale === 'en') {
    const visibleCart = await page.locator('body').innerText();
    assert.doesNotMatch(visibleCart, /Монохромна версія/);
    assert.ok(visibleCart.includes(t('shop.monochromeVersion')));
    for (const color of colors) assert.ok(visibleCart.includes(color.name), 'Source catalog color name must be retained');
  }
  assert.ok(quoteCalls.length);
  assert.equal(await page.locator('[aria-disabled="true"]').count(), 0);
  await goto(base + localized('/checkout/'));
  await page.getByRole('radio', { name: new RegExp(t('shop.pickup')) }).check();
  await page.getByPlaceholder(t('shop.forExampleMykhailoPetrenko')).fill('Тестовий Покупець');
  await page.getByPlaceholder('name@example.com').fill('buyer@example.com');
  await page.getByPlaceholder('+380 00 000 00 00').fill('+380501112233');
  await page.getByPlaceholder(t('shop.kyiv')).fill('Київ');
  await page.getByPlaceholder(t('shop.forExampleArrangeWithTheStore')).fill('Узгодити з менеджером');
  await page.locator('input[name="paymentMethod"][value="full-prepayment"]').check();
  await settleNetwork();
  const draftBeforeSwitch = await page.evaluate(() => sessionStorage.getItem('skufnya:checkout-draft'));
  assert.ok(draftBeforeSwitch, 'The shared checkout draft exists before document navigation');
  const quoteCallsBeforeSwitch = quoteCalls.length;
  for (const nextLocale of [target, routeLocale]) {
    await settleNetwork();
    await page.locator(`header a[hreflang="${nextLocale}"]`).first().click();
    await page.waitForURL(u => u.pathname === (nextLocale === 'en' ? '/en' : '') + '/checkout/');
    await settleNetwork();
    const nextT = getTranslator(nextLocale);
    assert.equal(await page.locator('html').getAttribute('lang'), nextLocale);
    assert.equal(await page.locator('input[name="deliveryMethod"][value="pickup"]').isChecked(), true);
    assert.equal(await page.locator('input[name="paymentMethod"][value="full-prepayment"]').isChecked(), true);
    assert.equal(await page.getByPlaceholder(nextT('shop.forExampleMykhailoPetrenko')).inputValue(), 'Тестовий Покупець');
    assert.equal(await page.getByPlaceholder('name@example.com').inputValue(), 'buyer@example.com');
    assert.equal(await page.getByPlaceholder('+380 00 000 00 00').inputValue(), '+380501112233');
    assert.equal(await page.getByPlaceholder(nextT('shop.kyiv')).inputValue(), 'Київ');
    assert.equal(await page.getByPlaceholder(nextT('shop.forExampleArrangeWithTheStore')).inputValue(), 'Узгодити з менеджером');
    assert.equal(await page.evaluate(() => sessionStorage.getItem('skufnya:checkout-draft')), draftBeforeSwitch);
  }
  assert.ok(quoteCalls.length > quoteCallsBeforeSwitch);
  assert.ok(quoteCalls.slice(quoteCallsBeforeSwitch).every(call => call.deliveryMethod === 'pickup'), 'Locale remount must never quote the default delivery method');
  await page.reload();
  await settleNetwork();
  assert.equal(await page.locator('input[name="deliveryMethod"][value="pickup"]').isChecked(), true);
  assert.equal(await page.locator('input[name="paymentMethod"][value="full-prepayment"]').isChecked(), true);
  check('Checkout language switches and reload preserve delivery, payment, contact/address draft and pickup quote contract');
  await capture('checkout');
  const confirm = page.getByRole('button', { name: t('shop.confirmOrder') });
  await confirm.click();
  await page.getByText(t('errors.quoteChanged'), { exact: true }).waitFor();
  assert.equal(createCalls.length, 1);
  assert.equal(createCalls[0].quoteToken, 'c'.repeat(64), 'First submit uses the reviewed pickup quote token');
  assert.ok(await page.evaluate(() => !!localStorage.getItem('skufnya:cart')));
  await page.waitForFunction(m => !document.body.innerText.includes(m), t('shop.checkingPricesAndDelivery'));
  await confirm.click();
  await page.waitForURL('**/checkout/success/**');
  assert.equal(createCalls.length, 2);
  assert.equal(createCalls[1].quoteToken, 'd'.repeat(64), 'Reviewed retry must use the refreshed quote token');
  assert.notEqual(createCalls[0].quoteToken, createCalls[1].quoteToken);
  assert.deepEqual(createCalls[0].items, createCalls[1].items);
  const order = await page.evaluate(() => JSON.parse(localStorage.getItem('skufnya:last-order')));
  assert.equal(order.items.length, 2);
  assert.equal(order.items[0].variantId, selected.id);
  assert.equal(order.total, price(createCalls[1]).total);
  assert.equal(order.items[0].price, price(createCalls[1]).items[0].unitPrice);
  assert.ok(order.items[0].configurationSnapshot.color.name);
  assert.equal(order.items[0].configurationSnapshot.finishLabel, 'Монохромна версія', 'Display translation must not rewrite the backend historical snapshot');
  assert.equal(await page.evaluate(() => localStorage.getItem('skufnya:cart')), null);
  assert.equal(await page.evaluate(() => sessionStorage.getItem('skufnya:checkout-draft')), null, 'Successful order clears its UI draft');
  assert.equal(createCalls[0].deliveryMethod, 'pickup');
  assert.equal(createCalls[0].paymentMethod, 'full-prepayment');
  assert.equal(createCalls[1].deliveryMethod, 'pickup');
  assert.equal(createCalls[1].paymentMethod, 'full-prepayment');
  check('Non-default variant, two resin colors, favorites/storage, cart quote, pickup, checkout 409/review/retry and saved snapshot');
  authenticated = true;
  for (const [path, heading] of [['/profile/', t('account.profile')], ['/profile/orders/', t('account.myOrders')], ['/profile/orders/details/?id=browser-order', savedOrder.number]]) {
    await goto(base + localized(path));
    await page.getByRole('heading', { name: heading, exact: true }).first().waitFor();
    await capture(path);
    await page.getByText(t('account.awaitingConfirmation'), { exact: true }).first().waitFor();
    const orderCopy = await page.locator('main').innerText();
    assert.match(orderCopy, routeLocale === 'en' ? /September/ : /вересня/, 'Order dates use the route locale');
    if (routeLocale === 'en') assert.doesNotMatch(orderCopy, /Монохромна версія|Очікує підтвердження|вересня/);
  }
  check('Profile order statuses, order dates and historical finish presentation use the route locale');
  await goto(base + localized('/profile/orders/'));
  const detailsLink = page.locator(`main a[href^="${localized('/profile/orders/details/')}"]`);
  await detailsLink.waitFor();
  assert.equal(await detailsLink.getAttribute('href'), localized('/profile/orders/details/?id=browser-order'));
  await detailsLink.hover();
  await settleNetwork();
  await detailsLink.click();
  await page.waitForURL('**/profile/orders/details/?id=browser-order');
  await page.getByRole('heading', { name: savedOrder.number, exact: true }).waitFor();
  await settleNetwork();
  check('Profile order href, real Link navigation, details rendering and prefetch without 404');
  authenticated = false; loginFailure = false;
  await visit('/login/');
  await page.locator('input[name="email"]').fill('buyer@example.invalid');
  await page.locator('input[name="password"]').fill('fixture-password');
  await page.locator('form:has(input[name="email"]) button[type="submit"]').click();
  await page.waitForURL(u => u.pathname.replace(/\/$/, '') === localized('/profile'));
  await page.getByRole('heading', { name: t('account.profile'), level: 1, exact: true }).waitFor();
  await visit('/profile/settings/');
  await page.getByPlaceholder(t('account.enterYourFirstName'), { exact: true }).fill('Updated');
  await page.getByRole('button', { name: t('account.saveChanges'), exact: true }).click();
  await page.getByText(t('account.yourChangesHaveBeenSaved'), { exact: true }).waitFor();
  authenticated = false; registerFailure = false;
  await visit('/register/');
  const successfulRegistration = page.getByRole('form', { name: t('auth.registrationForm') });
  await page.getByPlaceholder(t('auth.sakura'), { exact: true }).fill('Test');
  await page.getByPlaceholder(t('auth.tanaka'), { exact: true }).fill('Buyer');
  await page.getByPlaceholder('sakura@example.com').fill('buyer@example.invalid');
  await page.getByPlaceholder('sakura_collector').fill('fixturebuyer');
  await page.getByPlaceholder(t('auth.atLeast8Characters'), { exact: true }).fill('fixture-password');
  await page.getByPlaceholder(t('auth.repeatYourPassword'), { exact: true }).fill('fixture-password');
  await successfulRegistration.locator('label:has(input[type="checkbox"]) > span[aria-hidden="true"]').first().click();
  await successfulRegistration.locator('button[type="submit"]').click();
  await page.getByPlaceholder('123456').fill('123456');
  await successfulRegistration.locator('button[type="submit"]').click();
  await page.waitForURL(u => u.pathname.replace(/\/$/, '') === localized('/profile'));
  await page.getByRole('heading', { name: t('account.profile'), level: 1, exact: true }).waitFor();
  await settleNetwork();
  check('Successful fixture sign-in, registration and profile settings save retain locale and existing API payload contracts');
  assert.deepEqual(errors, []);
  assert.equal(httpErrors.filter(e => e.status === 404).length, 0, 'No profile or other prefetch 404 is allowed');
  assert.ok(httpErrors.every(e =>
    (e.status === 400 && ['/api/orders/quote', '/api/auth/register'].includes(new URL(e.url).pathname)) ||
    (e.status === 401 && new URL(e.url).pathname === '/api/auth/login') ||
    (e.status === 401 && ['/api/auth/me', '/api/account/favorites', '/api/account/favorites/' + product.id].includes(new URL(e.url).pathname)) ||
    (e.status === 409 && new URL(e.url).pathname === '/api/orders')), JSON.stringify(httpErrors));
  assert.ok(consoleErrors.every(e => /Failed to load resource: the server responded with a status of (400|401|409)/.test(e)), JSON.stringify(consoleErrors));
  check('No unexpected HTTP/console/page/hydration errors, including profile prefetch');
  const errorsBefore404 = errors.length;
  const consoleBefore404 = consoleErrors.length;
  const httpBefore404 = httpErrors.length;
  for (const invalidRoute of ['/de/', '/uk/', '/en/missing-stage2-route/', '/missing-stage2-route/', '/404.html']) {
    const response = await goto(base + invalidRoute); assert.equal(response.status(), invalidRoute === '/404.html' ? 200 : 404);
    await settleNetwork();
    assert.equal(await page.locator('html').getAttribute('lang'), 'uk', 'Global404 keeps the default document locale');
    await page.getByRole('heading', { name: '404', exact: true }).waitFor();
    const englishLink = page.locator('header a[hreflang="en"]').first();
    await englishLink.waitFor();
    const href = await englishLink.getAttribute('href');
    assert.equal(href, '/en/');
    await settleNetwork();
    await englishLink.click();
    await page.waitForURL(base + '/en/');
    await settleNetwork();
    assert.equal(await page.locator('html').getAttribute('lang'), 'en');
    assert.equal(errors.length, errorsBefore404, 'An unmatched or reserved path must not crash the locale switcher');
  }
  assert.ok(consoleErrors.slice(consoleBefore404).every(message => /Failed to load resource: the server responded with a status of 404/.test(message)), JSON.stringify(consoleErrors.slice(consoleBefore404)));
  assert.ok(httpErrors.slice(httpBefore404).every(response => response.status === 404 && ['/de/', '/uk/', '/en/missing-stage2-route/', '/missing-stage2-route/'].includes(new URL(response.url).pathname)), JSON.stringify(httpErrors.slice(httpBefore404)));
  check('Global404 renders under reserved UK/DE and missing EN paths without locale-switcher or hydration exceptions');
  for (const payload of [...quoteCalls, ...createCalls, ...authCalls.map(c => c.body)]) {
    assert.equal('locale' in payload, false);
    assert.equal('shippingCountry' in payload, false);
    assert.equal('market' in payload, false);
    if ('currency' in payload) assert.equal(payload.currency, 'UAH');
  }
  const financial = { stored, quoteCalls, createCalls, order, shippingChecks };
  results.push({ passed: true, routeLocale, browserLocale, checks, captured, financial, authCalls, errors, consoleErrors, httpErrors });
  console.log(JSON.stringify({ passed: true, routeLocale, browserLocale, checks: checks.length }));
} catch (error) {
  const outputDirectory = process.env.SMOKE_OUTPUT ? path.dirname(process.env.SMOKE_OUTPUT) : '/tmp/skuf-stage2';
  fs.mkdirSync(outputDirectory, { recursive: true });
  await page.screenshot({ path: path.join(outputDirectory, `browser-${routeLocale}-${browserLocale}-failure.png`), fullPage: true }).catch(() => {});
  results.push({ passed: false, routeLocale, browserLocale, checks, error: error.stack, errors, consoleErrors, httpErrors, body: await page.locator('body').innerText().catch(() => '<unavailable>') });
  console.log(JSON.stringify({ passed: false, routeLocale, browserLocale, error: error.stack }));
} finally { await browser.close(); }
}
for (const browserLocale of browserLocales) for (const routeLocale of routeLocales) await run(routeLocale, browserLocale);
const passed = results.filter(r => r.passed);
if (passed.length > 1) {
  const comparable = result => ({ stored: result.financial.stored.map(({ id, variantId, productId, finish, colorSlug, price, quantity, currency }) => ({ id, variantId, productId, finish, colorSlug, price, quantity, currency })), quoteCalls: [...new Set(result.financial.quoteCalls.map(JSON.stringify))].sort(), createCalls: result.financial.createCalls, shippingChecks: result.financial.shippingChecks, items: result.financial.order.items, subtotal: result.financial.order.subtotal, deliveryPrice: result.financial.order.deliveryPrice, total: result.financial.order.total, currency: result.financial.order.currency });
  for (const result of passed.slice(1)) {
    try { assert.deepEqual(comparable(result), comparable(passed[0]), `Financial behavior differs in ${result.routeLocale}/${result.browserLocale}`); result.checks.push('Financial amounts, variants, colors, policy, pickup and quote/create payloads equal the other locale combinations'); }
    catch (error) { result.passed = false; result.error = error.stack; }
  }
}
const output = { passed: results.filter(r => r.passed).length, failed: results.filter(r => !r.passed).length, skipped: 0, mode: 'fixture', productionWrites: 0, results };
if (process.env.SMOKE_OUTPUT) fs.writeFileSync(process.env.SMOKE_OUTPUT, JSON.stringify(output, null, 2));
console.log(JSON.stringify({ passed: output.passed, failed: output.failed, skipped: 0, productionWrites: 0 }));
if (output.failed) process.exitCode = 1;
