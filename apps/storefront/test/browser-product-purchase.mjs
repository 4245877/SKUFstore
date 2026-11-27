// Run against a local Pages export and its public snapshot. All API writes are mocked.
// SMOKE_BASE=http://127.0.0.1:54339 SMOKE_SNAPSHOT=... SMOKE_OUTPUT=... node --experimental-strip-types test/browser-product-purchase.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { chromium, firefox } from 'playwright';
import { getTranslator } from '../src/i18n/translate.ts';
import { productSize, productionTime } from '../src/lib/product-purchase.ts';
const base = process.env.SMOKE_BASE;
assert.equal(new URL(base).hostname, '127.0.0.1', 'Only a local preview is allowed');
const snapshot = JSON.parse(fs.readFileSync(process.env.SMOKE_SNAPSHOT, 'utf8'));
const products = snapshot.items;
const colors = snapshot.resinColors;
const output = process.env.SMOKE_OUTPUT;
fs.mkdirSync(output, { recursive: true });
const sample = products.find(p => p.slug === 'dota-2-juggernaut-ancient-exile');
const multiple = products.find(p => !p.isAdult && p.variants.length > 1 && p.variants.every(v => v.sizeLabel) && new Set(p.variants.map(v => v.sizeLabel)).size > 1);
const knownTime = products.find(p => !p.isAdult && p.variants.some(v => v.leadTimeDays > 0));
assert.ok(sample && multiple && knownTime && colors.length > 1);
const results = [];
const browserType = process.env.SMOKE_BROWSER === 'firefox' ? firefox : chromium;
const browser = await browserType.launch({ headless: true, executablePath: process.env.SMOKE_EXECUTABLE, args: browserType === chromium ? ['--no-sandbox'] : [] });
try {
 for (const locale of ['uk', 'en']) {
  const t = getTranslator(locale), prefix = locale === 'en' ? '/en' : '';
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  let hideColors = false, failColors = false;
  const quotes = [], errors = [], unexpected = [];
  await context.route('**/*', async route => {
    const req = route.request(), url = new URL(req.url());
    if (url.origin === new URL(base).origin) return route.continue();
    const json = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
    if (req.resourceType() === 'image' && req.method() === 'GET') return route.continue();
    if (url.hostname !== 'api.skufnya.com') { unexpected.push(req.url()); return route.abort(); }
    if (url.pathname.includes('/analytics')) return json({ ok: true });
    if (url.pathname.includes('/auth/') || url.pathname.includes('/account/')) return json({ error: 'UNAUTHORIZED' }, 401);
    if (url.pathname === '/api/catalog/resin-colors') {
      if (failColors) return route.abort();
      return json({ items: hideColors ? [] : colors });
    }
    if (url.pathname === '/api/shipping/policy') return json({ currency: 'UAH', freeDeliveryThreshold: 1500, deliveryPrice: 120 });
    if (url.pathname === '/api/orders/quote' && req.method() === 'POST') {
      const body = req.postDataJSON(); quotes.push(body);
      const items = body.items.map(line => {
        assert.equal('price' in line, false);
        const product = products.find(p => p.id === line.productId), variant = product.variants.find(v => v.id === line.variantId), color = colors.find(c => c.slug === line.colorSlug);
        assert.equal(line.finish, 'MONO');
        const unitPrice = variant.price + color.priceDelta;
        return { ...line, title: product.title, variantName: variant.name, sku: variant.sku, currency: 'UAH', imageUrl: product.images[0]?.url ?? null,
          unitPrice, totalPrice: unitPrice * line.qty,
          configurationSnapshot: { version: 1, finish: 'MONO', finishLabel: 'MONO', color, baseUnitPrice: variant.price, finishPriceDelta: 0, currency: 'UAH' } };
      });
      const subtotal = items.reduce((sum, i) => sum + i.totalPrice, 0);
      return json({ quote: { quoteToken: 'local-test-only', currency: 'UAH', subtotal, deliveryPrice: 0, total: subtotal, items,
        shippingPolicy: { currency: 'UAH', freeDeliveryThreshold: 1500, deliveryPrice: 120 } } });
    }
    if (req.method() !== 'GET') { unexpected.push(`${req.method()} ${url.pathname}`); return route.abort(); }
    if (url.pathname === '/api/catalog/products/home') return json({ items: products.slice(0, 8) });
    if (url.pathname === '/api/catalog/products') return json({ items: products, meta: { page: 1, pageCount: 1, total: products.length, limit: 200 } });
    if (url.pathname === '/api/catalog/categories') return json({ items: [] });
    unexpected.push(url.pathname); return route.abort();
  });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: {
      writeText: async text => { window.__copiedMessage = text; },
    } });
  });
  const go = async product => { await page.goto(`${base}${prefix}/product/${product.slug}/`); await page.waitForLoadState('networkidle'); };
  const purchase = page.locator('[class*="purchaseInfo"]');
  const openInquiry = async () => {
    const summary = purchase.locator('summary');
    if (!await purchase.locator('details').getAttribute('open').then(value => value !== null)) { await summary.focus(); await page.keyboard.press('Enter'); }
    await purchase.locator('textarea[readonly]').waitFor({ state: 'visible' });
  };
  await go(sample);
  assert.ok((await purchase.innerText()).includes(t('purchase.mono')));
  assert.ok((await purchase.innerText()).includes(t('purchase.timeUnknown')));
  assert.ok((await purchase.innerText()).includes(t('purchase.detailsUnknown')));
  assert.equal(await purchase.getByText(t('shop.material'), { exact: true }).count(), 0);
  assert.equal(await page.getByRole('button', { name: new RegExp(t('shop.artisticPainting')) }).isDisabled(), true);
  await page.locator('[class*="mainImage"]').filter({ hasNot: page.locator('div') }).first().waitFor();
  const gallery = page.locator('img[class*="mainImage"]').last();
  await gallery.evaluate(img => img.decode());
  const thumbs = page.locator('button[class*="thumb"]');
  if (await thumbs.count() > 1) { await thumbs.nth(1).click(); await gallery.evaluate(img => img.decode()); await thumbs.first().click(); }
  for (const width of [320, 390, 430, 1440]) {
    await page.setViewportSize({ width, height: width === 1440 ? 1000 : 900 });
    const layout = await page.evaluate(() => ({ viewport: innerWidth, scroll: document.documentElement.scrollWidth }));
    assert.ok(layout.scroll <= width, `${locale}/${width}: horizontal overflow ${layout.scroll}`);
    await page.evaluate(() => { document.activeElement?.blur(); window.scrollTo({ top: 0, behavior: 'instant' }); });
    await page.waitForTimeout(200);
    await page.screenshot({ path: path.join(output, `after-${locale}-${width}.png`), fullPage: true });
    await openInquiry();
    for (const control of await purchase.locator('summary, .unused, [class*="inquiryActions"] a, [class*="inquiryActions"] button').all()) {
      // Firefox can round a 44px CSS box by a fraction of a device pixel.
      const box = await control.boundingBox();
      assert.ok(box.height >= 43.95, `Touch target below 44px: ${JSON.stringify(box)}`);
      assert.ok(await control.evaluate(node => parseFloat(getComputedStyle(node).minHeight) >= 44));
    }
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await purchase.locator('summary').click();
    results.push(`${locale}: ${width}px, gallery, collapsed/expanded contact, no overflow, keyboard, touch targets`);
  }
  await page.setViewportSize({ width: 390, height: 900 });
  await go(multiple);
  const variant = multiple.variants[1], color = colors[1];
  const variantButtons = page.locator('[class*="variantsSection"]').first().getByRole('button');
  await variantButtons.nth(1).click();
  const colorSection = page.locator('[class*="variantsSection"]').filter({ has: page.getByRole('heading', { name: t('purchase.materialColor'), exact: true }) });
  await colorSection.getByRole('button').nth(1).click();
  await purchase.getByText(productSize(multiple, variant, t), { exact: true }).waitFor();
  const expectedPrice = variant.price + color.priceDelta;
  assert.equal((await page.locator('[class*="priceMain"]').innerText()).replace(/\D/g, ''), String(expectedPrice));
  await openInquiry();
  await purchase.getByLabel(t('purchase.question'), { exact: true }).fill('Чи є підставка? & base?');
  const message = await purchase.locator('textarea[readonly]').inputValue();
  assert.ok(message.includes(variant.name) && message.includes(color.name) && message.includes('Чи є підставка? & base?'));
  assert.equal(new URL(await purchase.getByRole('link', { name: t('purchase.openTelegram') }).getAttribute('href')).searchParams.get('text'), message);
  await purchase.getByRole('button', { name: t('purchase.copy'), exact: true }).click();
  assert.equal(await page.evaluate(() => window.__copiedMessage), message);
  await purchase.getByRole('status').filter({ hasText: t('purchase.copied') }).waitFor();
  await page.evaluate(() => { navigator.clipboard.writeText = async () => { throw new Error('denied'); }; });
  await purchase.getByRole('button', { name: t('purchase.copy'), exact: true }).click();
  assert.equal(await page.evaluate(() => document.activeElement.selectionEnd - document.activeElement.selectionStart), message.length);
  assert.ok((await purchase.getByRole('status').innerText()).includes(t('purchase.copyFailed')));
  await variantButtons.first().click();
  assert.equal(await purchase.locator('[role=status]').textContent(), '', 'Copy status must not describe a stale draft');
  await variantButtons.nth(1).click();
  await page.reload(); await page.waitForLoadState('networkidle');
  assert.equal(await variantButtons.nth(1).getAttribute('aria-pressed'), 'true');
  assert.equal(await colorSection.getByRole('button').nth(1).getAttribute('aria-pressed'), 'true');
  await page.goto(`${base}${locale === 'en' ? '' : '/en'}/product/${multiple.slug}/`); await page.waitForLoadState('networkidle');
  assert.equal(await page.locator('[class*="variantsSection"]').first().getByRole('button').nth(1).getAttribute('aria-pressed'), 'true');
  await go(multiple);
  await page.goto(base + prefix + '/catalog/'); await page.goBack(); await page.waitForLoadState('networkidle');
  assert.equal(await variantButtons.nth(1).getAttribute('aria-pressed'), 'true');
  await page.getByRole('button', { name: t('shop.addToCart'), exact: true }).click();
  const cart = await page.evaluate(() => JSON.parse(localStorage.getItem('skufnya:cart')));
  const line = cart.find(item => item.variantId === variant.id && item.colorSlug === color.slug);
  assert.ok(line); assert.equal(line.finish, 'MONO'); assert.equal(line.price, expectedPrice);
  await page.goto(base + prefix + '/cart/'); await page.waitForLoadState('networkidle');
  assert.ok(quotes.length > 0); assert.ok(quotes.at(-1).items.some(i => i.variantId === variant.id && i.colorSlug === color.slug));
  await go(knownTime);
  const knownVariant = knownTime.variants.find(v => v.leadTimeDays > 0);
  await page.locator('[class*="variantsSection"]').first().getByRole('button').nth(knownTime.variants.indexOf(knownVariant)).click();
  assert.ok((await purchase.innerText()).includes(productionTime(knownVariant, t, locale)));
  failColors = true; await go(sample);
  assert.equal(await page.getByRole('button', { name: t('shop.addToCart'), exact: true }).isEnabled(), true, 'Runtime outage retains build selection');
  failColors = false; hideColors = true; await page.reload(); await page.waitForLoadState('networkidle');
  assert.equal(await page.getByRole('button', { name: t('shop.addToCart'), exact: true }).isDisabled(), true);
  await openInquiry();
  assert.ok(!(await purchase.locator('textarea[readonly]').inputValue()).includes(t('purchase.materialColor') + ':'));
  assert.deepEqual(errors, []); assert.deepEqual(unexpected, []);
  results.push(`${locale}: variant/size/colour/price/draft, clipboard success/failure, refresh/back persistence, cart + quote, known lead time, API outage, removed colours`);
  await context.close();
 }
 fs.writeFileSync(path.join(output, `browser-${process.env.SMOKE_BROWSER || 'chromium'}.json`), JSON.stringify({ passed: true, checks: results }, null, 2));
 console.log(JSON.stringify({ passed: true, checks: results }, null, 2));
} finally { await browser.close(); }
