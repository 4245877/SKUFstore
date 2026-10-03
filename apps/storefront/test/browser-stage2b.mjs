// Only a local synthetic export; API responses are fixtures and production writes are impossible.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fixtureResponse, products, translation, resinColors, translationVersion } from './stage2b-fixtures.mjs';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.SMOKE_BASE;
assert.equal(new URL(base).hostname, '127.0.0.1', 'Stage 2B synthetic browser must use a local static server');
const ready = products[0], fallback = products[1], results = [];
for (const browserLocale of ['uk-UA', 'en-US']) {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_EXECUTABLE, args: ['--no-sandbox'] });
  const context = await browser.newContext({ locale: browserLocale, viewport: { width: 1440, height: 1000 } });
  let accountFavorites = false;
  const errors = [], unexpectedConsole = [], apiCalls = [], quoteCalls = [], checks = [];
  await context.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url());
    if (url.origin === new URL(base).origin) return route.continue();
    const json = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
    if (request.resourceType() === 'image') return route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg"/>' });
    assert.equal(url.hostname, 'api.skufnya.com', 'Unexpected external request in synthetic browser');
    apiCalls.push({ path: url.pathname, query: Object.fromEntries(url.searchParams), method: request.method() });
    if (url.pathname.includes('/analytics')) return json({ ok: true });
    if (url.pathname === '/api/auth/me') return json({ user: null });
    if (url.pathname === '/api/account/favorites') return accountFavorites ? json({ items: products.slice(0, 2).map(p => ({ ...p, productId: p.id, createdAt: '2026-10-03T00:00:00Z' })) }) : json({ error: 'UNAUTHORIZED' }, 401);
    if (url.pathname === '/api/orders/quote' && request.method() === 'POST') {
      const payload = request.postDataJSON(); quoteCalls.push(payload);
      assert.equal('locale' in payload, false);
      const items = payload.items.map(line => {
        const product = products.find(p => p.id === line.productId), variant = product?.variants.find(v => v.id === line.variantId), color = resinColors.find(c => c.slug === line.colorSlug);
        assert.ok(product && variant && color); assert.equal(line.finish, 'MONO');
        assert.equal('price' in line, false); assert.equal('translationId' in line, false);
        const unitPrice = variant.price + color.priceDelta;
        return { productId: product.id, variantId: variant.id, title: product.title, variantName: variant.name, sku: variant.sku, currency: 'UAH', unitPrice, qty: line.qty, totalPrice: unitPrice * line.qty,
          configurationSnapshot: { version: 1, finish: 'MONO', finishLabel: 'Монохромна версія', color, baseUnitPrice: variant.price, finishPriceDelta: 0, currency: 'UAH' } };
      });
      const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0), deliveryPrice = payload.deliveryMethod === 'pickup' || subtotal >= 1500 ? 0 : 120;
      return json({ quote: { items, subtotal, deliveryPrice, total: subtotal + deliveryPrice, currency: 'UAH', quoteToken: 'a'.repeat(64), shippingPolicy: { currency: 'UAH', freeDeliveryThreshold: 1500, deliveryPrice: 120 } } });
    }
    assert.equal(request.method(), 'GET', 'No order, payment, or account write allowed');
    return json(fixtureResponse(url));
  });
  const page = await context.newPage(); page.setDefaultTimeout(20000);
  const active = new Set(); let lastRequest = Date.now();
  page.on('request', r => { active.add(r); lastRequest = Date.now(); });
  for (const event of ['requestfinished', 'requestfailed']) page.on(event, r => { active.delete(r); lastRequest = Date.now(); });
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error' || /hydration|#418/i.test(message.text())) {
      if (/Failed to load resource.*401/.test(message.text())) return; // exact guest-favorites fixture response
      unexpectedConsole.push(message.text());
    }
  });
  async function settle() {
    const deadline = Date.now() + 40000;
    while (active.size || Date.now() - lastRequest < 500) { assert.ok(Date.now() < deadline, 'Synthetic browser network did not settle'); await page.waitForTimeout(50); }
  }
  async function visit(pathname) { await settle(); const response = await page.goto(base + pathname); assert.equal(response.status(), 200); await settle(); return response; }
  async function switchTo(locale) { await settle(); await page.locator(`header a[hreflang="${locale}"]`).click(); await settle(); assert.equal(await page.locator('html').getAttribute('lang'), locale); }
  try {
    for (const product of [ready, fallback]) for (const locale of ['uk', 'en']) {
      const enReady = product === ready && locale === 'en', pathname = `${locale === 'en' ? '/en' : ''}/product/${product.slug}/`;
      const response = await visit(pathname), html = await response.text();
      assert.match(html, new RegExp(`<html[^>]*lang="${locale}"`));
      const name = enReady ? translation.title : product.title, description = enReady ? translation.description : product.description;
      assert.equal(await page.locator('h1').innerText(), name);
      assert.ok((await page.locator('[role="tabpanel"]').first().innerText()).includes(description));
      const seo = await page.evaluate(() => ({
        title: document.title, description: document.querySelector('meta[name="description"]')?.content,
        canonical: document.querySelector('link[rel="canonical"]')?.href,
        robots: document.querySelector('meta[name="robots"]')?.content,
        version: document.querySelector('meta[name="skufnya-en-content-version"]')?.content,
        alternates: [...document.querySelectorAll('link[rel="alternate"]')].map(n => ({ locale: n.hreflang, url: n.href })),
        ogTitle: document.querySelector('meta[property="og:title"]')?.content,
        imageAlt: document.querySelector('meta[property="og:image:alt"]')?.content,
        twitterTitle: document.querySelector('meta[name="twitter:title"]')?.content,
        product: JSON.parse(document.querySelector('script[type="application/ld+json"]').textContent),
      }));
      assert.equal(seo.canonical, 'https://www.skufnya.com' + pathname);
      assert.equal(seo.version, product === ready ? translationVersion : 'untranslated');
      assert.equal(seo.robots.includes('noindex'), locale === 'en' && product !== ready);
      assert.equal(seo.alternates.length, product === ready ? 2 : 0);
      assert.equal(seo.imageAlt, enReady ? translation.imageAlt : 'Вихідний image alt');
      assert.equal(seo.ogTitle, name); assert.equal(seo.twitterTitle, name); assert.equal(seo.product.name, name);
      assert.equal(seo.product.offers.price, product.priceFrom); assert.equal(seo.product.offers.priceCurrency, 'UAH'); assert.equal(seo.product.sku, product.sku);
      if (enReady) { assert.equal(seo.title, translation.metaTitle + ' | SKUFnya'); assert.equal(seo.description, translation.metaDescription); assert.equal(seo.product.category, translation.categoryName); }
      checks.push(`${locale}/${product.slug}: visible/static content, SEO, language, JSON-LD, indexability`);
    }
    await visit('/en/product/editorial-ready/?q=English&tag=one&tag=two#description');
    await switchTo('uk');
    assert.equal(new URL(page.url()).pathname, '/product/editorial-ready/');
    assert.equal(new URL(page.url()).search, '?q=English&tag=one&tag=two'); assert.equal(new URL(page.url()).hash, '#description');
    await switchTo('en'); assert.equal(new URL(page.url()).pathname, '/en/product/editorial-ready/');
    const favorite = { productId: ready.id, slug: ready.slug, title: ready.title, priceFrom: ready.priceFrom, currency: 'UAH', hasPriceRange: true, addedAt: '2026-10-03T00:00:00Z' };
    await page.evaluate(item => localStorage.setItem('skufnya:favorites', JSON.stringify([item])), favorite);
    const favoriteStorage = await page.evaluate(() => localStorage.getItem('skufnya:favorites'));
    await page.getByRole('button', { name: 'Add to cart', exact: true }).click();
    const cartStorage = await page.evaluate(() => localStorage.getItem('skufnya:cart'));
    assert.ok(cartStorage); const line = JSON.parse(cartStorage)[0];
    assert.equal(line.variantId, ready.variants[0].id); assert.equal(line.finish, 'MONO'); assert.equal(line.colorSlug, resinColors[0].slug);
    assert.equal('locale' in line, false); assert.equal('translationId' in line, false);
    await switchTo('uk'); await switchTo('en');
    assert.equal(await page.evaluate(() => localStorage.getItem('skufnya:cart')), cartStorage);
    assert.equal(await page.evaluate(() => localStorage.getItem('skufnya:favorites')), favoriteStorage);
    checks.push('Locale switch preserves slug/query/hash and source cart/favorites identities');
    await visit('/en/'); await page.getByRole('heading', { name: translation.title, exact: true }).waitFor();
    await visit('/en/catalog/'); await page.getByRole('heading', { name: translation.title, exact: true }).waitFor(); await page.getByRole('heading', { name: fallback.title, exact: true }).waitFor();
    await visit('/en/catalog/?q=English&sort=price_asc');
    assert.equal(await page.locator('article').count(), 1); await page.getByRole('heading', { name: translation.title, exact: true }).waitFor();
    assert.ok(apiCalls.some(call => call.path === '/api/catalog/products' && call.query.q === 'English' && call.query.locale === 'en'));
    await visit('/en/favorites/'); await page.getByRole('heading', { name: translation.title, exact: true }).waitFor();
    assert.equal(await page.evaluate(() => localStorage.getItem('skufnya:favorites')), favoriteStorage);
    await switchTo('uk'); await page.getByRole('heading', { name: ready.title, exact: true }).waitFor();
    accountFavorites = true; await visit('/en/favorites/'); await page.getByRole('heading', { name: translation.title, exact: true }).waitFor(); await page.getByRole('heading', { name: fallback.title, exact: true }).waitFor();
    checks.push('EN Home/Catalog/localized search/guest+account Favorites share ready/fallback policy');
    await visit('/en/cart/'); assert.ok(quoteCalls.length); assert.equal(quoteCalls.at(-1).items[0].variantId, ready.variants[0].id);
    assert.equal(await page.evaluate(() => localStorage.getItem('skufnya:cart')), cartStorage);
    checks.push('Source cart snapshot remains compatible with authoritative quote and UAH');
    assert.deepEqual(errors, []); assert.deepEqual(unexpectedConsole, []);
    results.push({ browserLocale, passed: true, checks, pageErrors: errors, unexpectedConsole, quoteCalls });
  } catch (error) {
    results.push({ browserLocale, passed: false, error: error.stack, checks, pageErrors: errors, unexpectedConsole, url: page.url(), body: await page.locator('body').innerText().catch(() => '<unavailable>') });
  } finally { await browser.close(); console.log(JSON.stringify({ browserLocale, passed: results.at(-1).passed, error: results.at(-1).error })); }
}
const report = { passed: results.filter(r => r.passed).length, failed: results.filter(r => !r.passed).length, skipped: 0, mode: 'synthetic-fixture', productionWrites: 0, results };
if (process.env.SMOKE_OUTPUT) fs.writeFileSync(process.env.SMOKE_OUTPUT, JSON.stringify(report, null, 2));
console.log(JSON.stringify({ passed: report.passed, failed: report.failed, skipped: 0, productionWrites: 0 }));
assert.equal(report.failed, 0, 'Stage 2B browser regression failed');
