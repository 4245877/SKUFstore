// Run against a Pages export, never next dev: dev renders search params per request.
// Fixture mode is deterministic. CATALOG_API_MODE=live verifies read-only production.
import assert from 'node:assert/strict';
import fs from 'node:fs';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.SMOKE_BASE || 'http://127.0.0.1:54332';
const live = process.env.CATALOG_API_MODE === 'live';
const browserLocales = process.env.SMOKE_LOCALE ? [process.env.SMOKE_LOCALE] : ['uk-UA', 'en-US'];
const routeLocales = process.env.SMOKE_ROUTE_LOCALE ? [process.env.SMOKE_ROUTE_LOCALE] : ['uk', 'en'];
const messages = {
  uk: { sort: 'Сортувати за', from: 'від ', heading: 'Каталог товарів', loading: 'Завантаження товарів', next: 'Наступна сторінка', pagination: 'Пагінація каталогу', apply: 'Застосувати', search: 'Знайти', empty: 'Нічого не знайдено' },
  en: { sort: 'Sort by', from: 'from ', heading: 'Product catalog', loading: 'Loading products', next: 'Next page', pagination: 'Catalog pagination', apply: 'Apply', search: 'Search', empty: 'No results found' },
};
let routeLocale = 'uk', browserLocale = 'en-US';
const localize = path => routeLocale === 'en' ? '/en' + path : path;
const source = live ? [] : JSON.parse(fs.readFileSync(process.env.SMOKE_SNAPSHOT || '.next/cache/skufnya-build/catalog-snapshot.json', 'utf8')).items;
const products = source.slice(0, 60).map((p, i) => ({
  id: p.id, slug: p.slug, title: `Sans figure ${i}`,
  priceFrom: 800 + i * 70, currency: 'UAH', isAdult: false,
  pricing: { priceFrom: 800 + i * 70, priceTo: 800 + i * 70, activeVariantCount: 1, hasPriceRange: false },
}));
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_EXECUTABLE });
const results = [];
async function scenario(name, path, action) {
  const m = messages[routeLocale];
  name = `${routeLocale}/${browserLocale}: ${name}`;
  path = localize(path);
  const context = await browser.newContext({ locale: browserLocale, viewport: { width: 1440, height: 1000 } });
  const errors = [], requests = [], responses = [];
  await context.route('**/*', async route => {
    const req = route.request(), u = new URL(req.url());
    const json = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
    if (u.hostname !== 'api.skufnya.com') return route.continue();
    if (u.pathname.includes('/analytics')) return json({ ok: true });
    // Auth is unrelated to catalog; avoid expected guest 401 console errors.
    if (u.pathname === '/api/auth/me') return json({ user: null });
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method())) {
      errors.push('Unexpected write ' + req.method() + ' ' + u.pathname);
      return route.abort();
    }
    if (u.pathname === '/api/catalog/products') requests.push(Object.fromEntries(u.searchParams));
    if (live) return route.continue();
    if (req.resourceType() === 'image') return route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg"/>' });
    if (u.pathname === '/api/shipping/policy') return json({ currency: 'UAH', freeDeliveryThreshold: 1500, deliveryPrice: 120 });
    if (u.pathname === '/api/catalog/categories') return json({ items: [] });
    if (u.pathname === '/api/catalog/products') {
      const q = u.searchParams;
      let items = products.filter(p => (!q.get('q') || p.title.toLowerCase().includes(q.get('q').toLowerCase())) && (!q.has('minPrice') || p.priceFrom >= +q.get('minPrice')) && (!q.has('maxPrice') || p.priceFrom <= +q.get('maxPrice')));
      if (q.get('sort') === 'price_asc') items.sort((a, b) => a.priceFrom - b.priceFrom);
      if (q.get('sort') === 'price_desc') items.sort((a, b) => b.priceFrom - a.priceFrom);
      const page = +(q.get('page') || 1), limit = +(q.get('limit') || 24), total = items.length;
      return json({ items: items.slice((page - 1) * limit, page * limit), meta: { page, limit, total, pageCount: Math.ceil(total / limit) } });
    }
    errors.push('Unexpected API ' + u.pathname); return json({});
  });
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  const activeRequests = new Set();
  let lastNetworkEvent = Date.now();
  page.on('request', request => { activeRequests.add(request); lastNetworkEvent = Date.now(); });
  for (const event of ['requestfinished', 'requestfailed']) {
    page.on(event, request => { activeRequests.delete(request); lastNetworkEvent = Date.now(); });
  }
  async function settleNetwork() {
    // waitForLoadState('networkidle') may already be satisfied after SPA/history
    // navigation. Drain newly queued Link prefetches before unloading the document.
    const deadline = Date.now() + 30000;
    while (activeRequests.size || Date.now() - lastNetworkEvent < 1000) {
      assert.ok(Date.now() < deadline, 'Catalog network did not settle');
      await page.waitForTimeout(100);
    }
  }
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error' || /hydration|#418/i.test(m.text())) errors.push(m.text()); });
  const pending = [];
  page.on('response', r => {
    if (r.status() >= 400) errors.push(`HTTP ${r.status()} ${r.url()}`);
    if (new URL(r.url()).pathname === '/api/catalog/products') pending.push(r.json().then(data => responses.push({ data, url: r.url() })).catch(e => errors.push(e.message)));
  });
  async function verify() {
    await page.waitForLoadState('networkidle');
    const expectedQuery = new URL(page.url()).searchParams;
    function matchesCurrentQuery(response) {
      const query = new URL(response.url).searchParams;
      return ['q', 'category', 'minPrice', 'maxPrice', 'adult', 'sort', 'page'].every(key => {
        const fallback = key === 'sort' ? 'newest' : key === 'page' ? '1' : '';
        return (query.get(key) || fallback) === (expectedQuery.get(key) || fallback);
      });
    }
    const responseDeadline = Date.now() + 15000;
    while (!responses.some(matchesCurrentQuery)) {
      assert.ok(Date.now() < responseDeadline, 'Catalog response did not match current URL query');
      await page.waitForTimeout(50);
    }
    await Promise.all(pending);
    const data = responses.findLast(matchesCurrentQuery).data; assert.ok(Array.isArray(data?.items));
    // History/SPA changes can reuse an already settled load state. Wait for React
    // to render this response's cards rather than observing a transient loading tree.
    await page.waitForFunction(slugs => {
      const cards = [...document.querySelectorAll('article')];
      return cards.length === slugs.length && slugs.every((slug, i) => cards[i].querySelector('a')?.getAttribute('href').includes('/product/' + slug));
    }, data.items.map(item => item.slug));
    if (!data.items.length) await page.getByRole('heading', { name: m.empty, exact: true }).waitFor();
    const cards = page.locator('article'); assert.equal(await cards.count(), data.items.length);
    for (let i = 0; i < data.items.length; i++) {
      const p = data.items[i], card = cards.nth(i);
      assert.ok((await card.locator('a').first().getAttribute('href')).includes('/product/' + p.slug));
      const label = (await card.locator('[class*="cardPrice"]').innerText()).replace(/\s/g, ' ');
      assert.ok(label.includes(new Intl.NumberFormat('uk-UA').format(p.priceFrom).replace(/\s/g, ' ')), label);
      assert.equal(label.startsWith(m.from), p.pricing?.hasPriceRange === true);
    }
    const q = new URL(page.url()).searchParams;
    assert.equal(await page.getByLabel(m.sort).inputValue(), q.get('sort') || 'newest');
    assert.equal(await page.locator('#catalog-search').inputValue(), q.get('q') || '');
    assert.equal(await page.locator('#catalog-min-price').inputValue(), q.get('minPrice') || '');
    assert.equal(await page.locator('#catalog-max-price').inputValue(), q.get('maxPrice') || '');
    if (q.has('minPrice')) assert.ok(data.items.every(p => p.priceFrom >= +q.get('minPrice')));
    if (q.has('maxPrice')) assert.ok(data.items.every(p => p.priceFrom <= +q.get('maxPrice')));
    if (q.has('q')) assert.ok(data.items.every(p => p.title.toLowerCase().includes(q.get('q').toLowerCase())));
    for (let i = 1; i < data.items.length; i++) {
      if (q.get('sort') === 'price_asc') assert.ok(data.items[i - 1].priceFrom <= data.items[i].priceFrom);
      if (q.get('sort') === 'price_desc') assert.ok(data.items[i - 1].priceFrom >= data.items[i].priceFrom);
    }
    assert.equal(await page.locator('html').getAttribute('lang'), routeLocale);
    assert.equal(new URL(page.url()).pathname.startsWith('/en/'), routeLocale === 'en', 'Browser language must never redirect the selected route');
    assert.ok(requests.every(q => q.locale === routeLocale && !('currency' in q) && !('market' in q) && !('shippingCountry' in q)), 'Catalog locale may choose search presentation only');
    await settleNetwork();
    return data;
  }
  try {
    const response = await page.goto(base + path); assert.equal(response.status(), 200);
    // The server document still includes a heading, loading content and sidebar.
    const html = await response.text();
    assert.ok(html.includes(m.heading)); assert.ok(html.includes(m.loading));
    assert.match(html, /id="catalog-search"/);
    await verify();
    const expected = new URL(base + path).searchParams;
    for (const [key, value] of expected) {
      assert.equal(new URL(page.url()).searchParams.get(key), value);
      assert.equal(requests[0][key], value, 'First API request must use the deep link');
    }
    if (action) await action({ page, verify, responses });
    assert.deepEqual(errors, []);
    results.push({ name, passed: true, requests, errors });
  } catch (e) { results.push({ name, passed: false, error: e.stack, errors, requests, url: page.url(), body: await page.locator('body').innerText({ timeout: 1000 }).catch(() => '<unavailable>') }); }
  finally { console.log(JSON.stringify({ scenario: name, passed: results.at(-1)?.passed, error: results.at(-1)?.error })); await context.close(); }
}
try {
 for (browserLocale of browserLocales) for (routeLocale of routeLocales) {
  const m = messages[routeLocale];
  for (const path of ['/catalog/', '/catalog/?sort=price_asc', '/catalog/?sort=price_desc', '/catalog/?minPrice=1000&maxPrice=5000', '/catalog/?q=Sans', '/catalog/?q=DefinitelyMissingStage2Figure']) await scenario(path, path);
  const combined = '/catalog/?sort=price_asc&minPrice=1000&maxPrice=5000' + (live ? '' : '&q=Sans');
  await scenario('pagination, reload, history preserve combined query', combined, async ({ page, verify }) => {
    const before = new URL(page.url()).searchParams;
    const first = (await verify()).items.map(p => p.id);
    await page.getByRole('link', { name: m.next, exact: true }).click();
    await page.waitForURL(u => u.searchParams.get('page') === '2');
    const second = (await verify()).items.map(p => p.id);
    assert.ok(second.every(id => !first.includes(id)));
    for (const [k, v] of before) assert.equal(new URL(page.url()).searchParams.get(k), v);
    await page.reload(); await verify();
    const backResponse = page.waitForResponse(r => new URL(r.url()).pathname === '/api/catalog/products' && new URL(r.url()).searchParams.get('page') === '1');
    await page.goBack(); await backResponse;
    await page.waitForFunction(label => document.querySelector(`nav[aria-label="${label}"] [aria-current="page"]`)?.textContent.trim() === '1', m.pagination);
    await verify();
    assert.equal(new URL(page.url()).searchParams.has('page'), false);
    for (const [k, v] of before) assert.equal(new URL(page.url()).searchParams.get(k), v);
  });
  await scenario('sort control and filter GET form preserve query', '/catalog/?sort=price_asc', async ({ page, verify }) => {
    await page.getByLabel(m.sort).selectOption('price_desc');
    await page.waitForURL(u => u.searchParams.get('sort') === 'price_desc'); await verify();
    await page.locator('#catalog-min-price').fill('1000'); await page.locator('#catalog-max-price').fill('5000');
    await page.getByRole('button', { name: m.apply, exact: true }).click();
    await page.waitForURL(u => u.searchParams.get('minPrice') === '1000'); await verify();
    assert.equal(new URL(page.url()).searchParams.get('sort'), 'price_desc');
  });
  await scenario('search GET form preserves sort', '/catalog/?sort=price_asc', async ({ page, verify }) => {
    await page.locator('#catalog-search').fill('Sans'); await page.getByRole('search').getByRole('button', { name: m.search, exact: true }).click();
    await page.waitForURL(u => u.searchParams.get('q') === 'Sans'); await verify();
    assert.equal(new URL(page.url()).searchParams.get('sort'), 'price_asc');
  });
  await scenario('language switch preserves live query and fragment', '/catalog/?sort=price_desc&minPrice=1000&maxPrice=5000#catalog-search', async ({ page }) => {
    const before = new URL(page.url());
    const target = routeLocale === 'uk' ? 'en' : 'uk';
    const link = page.locator(`header a[hreflang="${target}"]`).first();
    const expectedPath = target === 'en' ? '/en/catalog/' : '/catalog/';
    await link.click();
    await page.waitForURL(u => u.pathname === expectedPath);
    await page.waitForLoadState('networkidle');
    const after = new URL(page.url());
    assert.equal(after.search, before.search); assert.equal(after.hash, before.hash);
    assert.equal(await page.locator('html').getAttribute('lang'), target);
  });
 }
} finally { await browser.close(); }
const output = { base, mode: live ? 'live' : 'fixture', passed: results.filter(r => r.passed).length, failed: results.filter(r => !r.passed).length, skipped: 0, results };
if (process.env.SMOKE_OUTPUT) fs.writeFileSync(process.env.SMOKE_OUTPUT, JSON.stringify(output, null, 2));
console.log(JSON.stringify(output, null, 2)); if (output.failed) process.exitCode = 1;
