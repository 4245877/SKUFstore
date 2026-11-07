// Local static export only. Every API request, including order creation, is intercepted.
// SMOKE_BASE=http://127.0.0.1:54347 SMOKE_SNAPSHOT=... SMOKE_OUTPUT=... SMOKE_BROWSER=chromium node --experimental-strip-types test/browser-remaining-improvements.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { chromium, firefox } from 'playwright';
import { getTranslator } from '../src/i18n/translate.ts';

const base = process.env.SMOKE_BASE;
assert.equal(new URL(base).hostname, '127.0.0.1');
const snapshot = JSON.parse(fs.readFileSync(process.env.SMOKE_SNAPSHOT, 'utf8'));
const output = process.env.SMOKE_OUTPUT;
fs.mkdirSync(output, { recursive: true });
const products = snapshot.items;
const colors = snapshot.resinColors;
const product = products.find(p => !p.isAdult && p.variants.some(v => v.isActive !== false));
const variant = product.variants.find(v => v.isActive !== false);
const color = colors[0];
const categories = [{ id: product.category.id, slug: product.category.slug, name: product.category.name, children: [], productCount: 1 },
  { id: 'synthetic-empty', slug: 'synthetic-empty', name: 'Synthetic empty category', children: [], productCount: 0 }];
const seed = { id: JSON.stringify([variant.id, 'MONO', color.slug]), variantId: variant.id, productId: product.id,
  finish: 'MONO', colorSlug: color.slug, slug: product.slug, name: product.title,
  price: variant.price + color.priceDelta, quantity: 1, currency: 'UAH', subtitle: 'Default' };
const browserType = process.env.SMOKE_BROWSER === 'firefox' ? firefox : chromium;
const browser = await browserType.launch({ headless: true, executablePath: process.env.SMOKE_EXECUTABLE, args: browserType === chromium ? ['--no-sandbox'] : [] });
const checks = [];
const record = message => { checks.push(message); console.log(`[PASS] ${message}`); };
try {
 for (const locale of ['uk', 'en']) {
  const t = getTranslator(locale), prefix = locale === 'en' ? '/en' : '';
  const context = await browser.newContext({ viewport: { width: 390, height: 900 } });
  const errors = [], unexpected = [], requests = [], orderKeys = [];
  let catalogFailure = '', quoteFailure = '', orderFailure = 'network';
  let lastQuote;
  await context.route('**/*', async route => {
    const req = route.request(), url = new URL(req.url());
    if (url.origin === new URL(base).origin && !url.pathname.startsWith('/api/')) return route.continue();
    if (req.resourceType() === 'image') return route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><rect width="20" height="20" fill="#eadbd9"/></svg>' });
    if (url.hostname !== 'api.skufnya.com' && url.origin !== new URL(base).origin) { unexpected.push(req.url()); return route.abort(); }
    requests.push(`${req.method()} ${url.pathname}`);
    const json = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
    const fail = async kind => {
      if (kind === 'network') return route.abort('failed');
      if (kind === 'timeout') {
        await new Promise(resolve => setTimeout(resolve, 11000));
        return route.abort('timedout').catch(() => {});
      }
      return json({ error: 'SYNTHETIC_UNAVAILABLE' }, 503);
    };
    if (url.pathname.includes('/analytics')) return json({ ok: true });
    if (url.pathname.includes('/auth/') || url.pathname.includes('/account/')) return json({ error: 'UNAUTHORIZED' }, 401);
    if (url.pathname === '/api/catalog/resin-colors') return json({ items: colors });
    if (url.pathname === '/api/shipping/policy') return json({ currency: 'UAH', freeDeliveryThreshold: 1500, deliveryPrice: 120 });
    if (url.pathname === '/api/catalog/categories') return catalogFailure === 'products' ? json({ items: categories }) : catalogFailure ? fail(catalogFailure) : json({ items: categories });
    if (url.pathname === '/api/catalog/products/home') return catalogFailure ? fail(catalogFailure) : json({ items: [product] });
    if (url.pathname === '/api/catalog/products') return catalogFailure ? fail(catalogFailure) : json({
      items: url.searchParams.get('categorySlug') === 'synthetic-empty' ? [] : [product],
      meta: { page: 1, pageCount: 1, total: url.searchParams.get('categorySlug') === 'synthetic-empty' ? 0 : 1, limit: 24 },
    });
    if (url.pathname === '/api/orders/quote' && req.method() === 'POST') {
      if (quoteFailure) return fail(quoteFailure);
      const body = req.postDataJSON();
      const items = body.items.map(line => {
        assert.equal('price' in line, false);
        const p = products.find(p => p.id === line.productId), v = p.variants.find(v => v.id === line.variantId), c = colors.find(c => c.slug === line.colorSlug);
        return { ...line, title: p.title, variantName: v.name, sku: v.sku, unitPrice: v.price + c.priceDelta,
          totalPrice: (v.price + c.priceDelta) * line.qty, currency: 'UAH', imageUrl: null,
          configurationSnapshot: { version: 1, finish: 'MONO', finishLabel: 'MONO', color: c, baseUnitPrice: v.price, finishPriceDelta: 0, currency: 'UAH' } };
      });
      const subtotal = items.reduce((sum, i) => sum + i.totalPrice, 0);
      lastQuote = { quoteToken: 'synthetic-only', currency: 'UAH', subtotal, deliveryPrice: 0, total: subtotal, items,
        shippingPolicy: { currency: 'UAH', freeDeliveryThreshold: 1500, deliveryPrice: 120 } };
      return json({ quote: lastQuote });
    }
    if (url.pathname === '/api/orders' && req.method() === 'POST') {
      orderKeys.push(req.headers()['idempotency-key']);
      if (orderFailure) return fail(orderFailure);
      const body = req.postDataJSON();
      return json({ order: { id: 'synthetic-local-order', number: 'SYNTHETIC-ONLY', createdAt: '2026-11-07T12:00:00Z', status: 'pending',
        currency: 'UAH', subtotal: lastQuote.subtotal, deliveryPrice: 0, total: lastQuote.total, customer: body,
        items: lastQuote.items.map((line, index) => ({ id: `synthetic-${index}`, productId: line.productId, variantId: line.variantId,
          slug: product.slug, name: line.title, subtitle: line.variantName, price: line.unitPrice, quantity: line.qty,
          currency: line.currency, configurationSnapshot: line.configurationSnapshot })),
      } }, 201);
    }
    if (url.pathname === '/api/nova-poshta/warehouses') return json({ cities: [{ ref: 'synthetic-city', name: 'Synthetic Kyiv', present: 'Synthetic Kyiv' }],
      matchedCity: { ref: 'synthetic-city', name: 'Synthetic Kyiv' }, warehouses: [{ ref: 'synthetic-branch', type: 'branch', description: 'Synthetic branch 1', label: 'Synthetic branch 1', shortAddress: 'Synthetic street' }], warnings: [] });
    unexpected.push(`${req.method()} ${url.pathname}`); return route.abort();
  });
  const page = await context.newPage();
  page.on('pageerror', err => errors.push(err.message));
  const go = async route => { await page.goto(base + prefix + route); await page.waitForLoadState('networkidle'); };
  const noOverflow = async label => {
    const size = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth }));
    assert.ok(size.scroll <= size.width, `${locale} ${label}: ${JSON.stringify(size)}`);
  };
  const assistance = () => page.locator('[class*="assistance"]');
  const managerLinks = async () => {
    for (const link of await assistance().getByRole('link', { name: t('assistance.manager') }).all()) assert.equal(await link.getAttribute('href'), 'https://t.me/SKUFnya_ua');
  };
  await go('/catalog/');
  await page.getByRole('button', { name: t('shop.filters'), exact: true }).waitFor();
  assert.equal(await page.locator('main').count(), 1);
  assert.equal(await page.getByRole('link', { name: 'Synthetic empty category', exact: true }).count(), 0);
  const trigger = page.getByRole('button', { name: t('shop.filters'), exact: true });
  const dialog = page.getByRole('dialog', { name: t('shop.catalogFilters') });
  await trigger.focus(); await page.keyboard.press('Enter'); await dialog.waitFor();
  assert.ok(await dialog.evaluate(node => node.contains(document.activeElement)));
  const focusable = dialog.locator('a[href], button, input:not([type=hidden]), select, textarea');
  await focusable.last().focus(); await page.keyboard.press('Tab');
  assert.ok(await dialog.evaluate(node => node.contains(document.activeElement)));
  await focusable.first().focus(); await page.keyboard.press('Shift+Tab');
  assert.ok(await dialog.evaluate(node => node.contains(document.activeElement)));
  await page.locator('footer a').first().evaluate(node => node.focus());
  assert.ok(await dialog.evaluate(node => node.contains(document.activeElement)), 'Background must be inert');
  await page.keyboard.press('Escape'); await dialog.waitFor({ state: 'hidden' });
  assert.equal(await trigger.evaluate(node => node === document.activeElement), true);
  await trigger.click(); await page.mouse.click(385, 200); await dialog.waitFor({ state: 'hidden' });
  await trigger.click(); await page.setViewportSize({ width: 1440, height: 1000 }); await dialog.waitFor({ state: 'hidden' });
  assert.equal(await page.evaluate(() => document.body.style.overflow), '');
  await page.setViewportSize({ width: 390, height: 900 });
  await go('/catalog/?categorySlug=synthetic-empty');
  assert.ok(page.url().includes('categorySlug=synthetic-empty'));
  assert.ok((await page.locator('main').innerText()).includes(t('shop.noResultsFound')));
  record(`${locale}: filter initial/contained/returned focus, inert background, Escape, backdrop, breakpoint; empty-category deep link`);
  for (const kind of ['network', 'server', 'products', 'timeout']) {
    catalogFailure = kind;
    await go('/catalog/');
    await assistance().waitFor({ timeout: 20000 }); await managerLinks();
    assert.equal(await page.locator('main').count(), 1);
    await noOverflow(`catalog ${kind}`);
    catalogFailure = '';
    await page.getByRole('button', { name: t('catalog.failure.retry'), exact: true }).click();
    await trigger.waitFor();
  }
  catalogFailure = 'network'; await go('/'); await assistance().first().waitFor(); await managerLinks();
  catalogFailure = ''; await page.getByRole('button', { name: t('catalog.failure.retry'), exact: true }).first().click();
  await page.getByRole('link', { name: product.title, exact: true }).first().waitFor();
  record(`${locale}: home/catalog network, 5xx, products error, timeout, manual retry and recovery`);
  await page.evaluate(seed => localStorage.setItem('skufnya:cart', JSON.stringify([seed])), seed);
  for (const kind of ['network', 'server', 'timeout']) {
    quoteFailure = kind; await go('/cart/');
    await assistance().waitFor({ timeout: 20000 }); await managerLinks();
    assert.equal(await page.locator('main').count(), 1);
    assert.equal(await page.getByRole('link', { name: t('shop.checkout'), exact: true }).getAttribute('aria-disabled'), 'true');
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('skufnya:cart')).length), 1);
    quoteFailure = ''; await page.getByRole('button', { name: t('shop.checkAgain'), exact: true }).click();
    await page.waitForFunction(() => document.querySelector('a[aria-disabled="false"]'));
  }
  quoteFailure = 'network'; await go('/checkout/'); await assistance().waitFor(); await managerLinks();
  const submit = page.getByRole('button', { name: t('shop.confirmOrder'), exact: true });
  assert.equal(await submit.isDisabled(), true);
  quoteFailure = ''; await page.getByRole('button', { name: t('shop.checkAgain'), exact: true }).click(); await submit.waitFor();
  await page.locator('input[autocomplete="name"]').fill('Synthetic Buyer');
  await page.locator('input[type="tel"]').fill('+380501112233');
  await page.locator('input[type="email"]').fill('synthetic@example.invalid');
  await page.locator('input[name="deliveryMethod"][value="pickup"]').check();
  await page.locator('input[autocomplete="address-level2"]').fill('Synthetic City');
  await page.locator('input[autocomplete="street-address"]').fill('Synthetic Address');
  await submit.click(); await assistance().waitFor(); await managerLinks();
  assert.ok(!page.url().includes('/success/'));
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('skufnya:cart')).length), 1);
  await page.reload(); await page.waitForLoadState('networkidle');
  assert.equal(await page.locator('input[autocomplete="name"]').inputValue(), 'Synthetic Buyer');
  orderFailure = 'server'; await submit.click(); await assistance().waitFor();
  assert.ok(!page.url().includes('/success/'));
  assert.equal(orderKeys[0], orderKeys[1], 'Ambiguous retry must retain the idempotency key');
  for (const width of [320, 390, 430, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 }); await noOverflow(`checkout error ${width}`);
  }
  await page.setViewportSize({ width: 390, height: 900 });
  orderFailure = ''; await submit.click(); await page.waitForURL('**/checkout/success/**');
  await page.getByText('SYNTHETIC-ONLY', { exact: true }).waitFor();
  assert.equal(orderKeys[0], orderKeys[2]);
  assert.equal(await page.evaluate(() => localStorage.getItem('skufnya:cart')), null);
  record(`${locale}: quote failures/retry, saved cart/draft, blocked submit, order failure without false success, idempotent retry after reload, mocked 201 SPA success`);
  for (const width of [320, 390, 430, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 }); await noOverflow(`success ${width}`);
    if (width <= 768) {
      await page.getByRole('button', { name: t('header.openMenu') }).click();
      await page.getByRole('button', { name: t('header.closeMenu') }).click();
      await page.waitForTimeout(450); await noOverflow(`success closed nav ${width}`);
    }
    await page.screenshot({ path: path.join(output, `${locale}-success-${width}.png`), fullPage: true });
  }
  await page.evaluate(() => { sessionStorage.clear(); });
  await go('/checkout/success/?id=unverified&order=unverified');
  assert.equal(await page.getByRole('heading', { name: t('shop.thankYouWeVeReceivedYourRequest') }).count(), 0);
  for (const route of ['/catalog/', '/cart/', '/contacts/', '/checkout/']) {
    if (route !== '/catalog/') await page.evaluate(seed => localStorage.setItem('skufnya:cart', JSON.stringify([seed])), seed);
    await go(route);
    for (const width of [320, 390, 430, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 }); await noOverflow(`${route} ${width}`);
    }
  }
  await go('/contacts/');
  assert.ok(await page.locator('a[href="https://t.me/skufnya_shop"]').count() >= 2);
  assert.ok(await page.locator('a[href="https://t.me/SKUFnya_ua"]').count() >= 2);
  assert.ok(await page.locator('a[href="viber://chat?number=%2B380938213102"]').count() >= 2);
  assert.ok(await page.getByRole('link', { name: t('contacts.call'), exact: true }).count());
  await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async text => { window.__copiedPhone = text; } } }));
  await page.getByRole('button', { name: t('contacts.copyNumber') }).click();
  assert.equal(await page.evaluate(() => window.__copiedPhone), '+380938213102');
  await page.evaluate(() => { navigator.clipboard.writeText = async () => { throw new Error('denied'); }; });
  await page.getByRole('button', { name: t('contacts.copyNumber') }).click();
  assert.ok((await page.getByRole('status').allTextContents()).some(text => text.includes(t('contacts.copyManually'))));
  for (const link of await page.locator('a[href="https://t.me/skufnya_shop"]').all()) { await link.focus(); assert.equal(await link.evaluate(node => document.activeElement === node), true); }
  record(`${locale}: 320/390/430/768/1440 layouts, closed mobile nav after SPA, unverified success URL, channel/support separation, keyboard links, Viber/call/copy success/failure`);
  assert.deepEqual(errors, []); assert.deepEqual(unexpected, []);
  await context.close();
 }
 const result = { passed: true, browser: process.env.SMOKE_BROWSER || 'chromium', checks };
 fs.writeFileSync(path.join(output, 'results.json'), JSON.stringify(result, null, 2));
 console.log(JSON.stringify(result, null, 2));
} finally { await browser.close(); }
