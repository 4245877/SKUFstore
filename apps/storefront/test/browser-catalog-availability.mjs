// Run against a local production build: SMOKE_ROOT=/path/to/out node test/browser-catalog-availability.mjs
// All API traffic is fulfilled/aborted locally; the real backend is never contacted.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { chromium } from 'playwright';

let server;
let base = process.env.SMOKE_BASE;
if (process.env.SMOKE_ROOT) {
  const root = path.resolve(process.env.SMOKE_ROOT);
  server = http.createServer((request, response) => {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    let file = path.resolve(root, '.' + pathname);
    if (file !== root && !file.startsWith(root + path.sep)) { response.writeHead(400); response.end(); return; }
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    if (!fs.existsSync(file)) { response.writeHead(404); response.end(); return; }
    const mime = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2' };
    response.writeHead(200, { 'content-type': mime[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(response);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
}
assert.ok(base && ['127.0.0.1', 'localhost'].includes(new URL(base).hostname), 'Use a local test build');

const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_EXECUTABLE });
const results = [];
const products = Array.from({ length: 48 }, (_, i) => ({
  id: `p-${i}`, slug: `availability-figure-${i}`, title: `Фігурка ${i + 1}`, currency: 'UAH',
  priceFrom: 1500, pricing: { priceFrom: 1500, priceTo: 1500, activeVariantCount: 1, hasPriceRange: false },
  qualityScore: 9, category: { slug: 'figures', name: 'Фігурки' },
}));
const categories = [{ id: 'c', slug: 'figures', name: 'Фігурки', productCount: 48, children: [] }];
const panelSelector = 'section[lang="uk"][aria-labelledby]';

async function scenario(name, initialMode, { width = 1440, url = '/catalog/', recover = false, repeat = false } = {}) {
  const context = await browser.newContext({ viewport: { width, height: 1100 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  const errors = [], calls = [], documents = [];
  let mode = initialMode, releaseRetry;
  const retryGate = new Promise(resolve => { releaseRetry = resolve; });
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (/hydration|#418/i.test(message.text())) errors.push(message.text()); });
  page.on('request', request => { if (request.isNavigationRequest() && request.frame() === page.mainFrame()) documents.push(request.url()); });

  await context.route('**/*', async route => {
    const req = route.request(), u = new URL(req.url());
    if (u.origin === new URL(base).origin) return route.continue();
    const json = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
    if (!u.pathname.startsWith('/api/')) return route.fulfill({ status: 200, body: '' });
    if (u.pathname === '/api/shipping/policy') return json({ currency: 'UAH', freeDeliveryThreshold: 1500, deliveryPrice: 120 });
    if (!u.pathname.startsWith('/api/catalog/')) return json(u.pathname === '/api/auth/me' ? { user: null } : { ok: true });
    calls.push({ path: u.pathname, query: Object.fromEntries(u.searchParams), mode });
    const isCategory = u.pathname.endsWith('/categories');
    if (mode === 'disconnected' || (mode === 'categories-down' && isCategory)) return route.abort('connectionfailed');
    if (mode === 'delayed' && isCategory) await retryGate;
    if (isCategory) return json({ items: categories });
    if (mode === 'interrupted') { await new Promise(resolve => setTimeout(resolve, 50)); return route.abort('connectionreset'); }
    if (mode === 'timeout') return; // The browser request deadline must abort this pending route.
    if (typeof mode === 'number') return json({ message: 'http://internal.invalid/stack-trace', error: 'PRIVATE_ERROR' }, mode);
    if (mode === 'malformed') return route.fulfill({ status: 200, body: '<html>Unexpected gateway document</html>' });
    const items = mode === 'empty' ? [] : products;
    if (u.pathname.endsWith('/home')) return json({ items: items.slice(0, 4) });
    const currentPage = Number(u.searchParams.get('page') || 1), limit = Number(u.searchParams.get('limit') || 24);
    return json({ items: items.slice((currentPage - 1) * limit, currentPage * limit), meta: { page: currentPage, limit, total: items.length, pageCount: Math.ceil(items.length / limit) } });
  });

  try {
    if (mode === 'timeout') await page.clock.install();
    const productRequest = mode === 'timeout' ? page.waitForRequest(request => new URL(request.url()).pathname === '/api/catalog/products') : null;
    await page.goto(base + url);
    if (productRequest) { await productRequest; await page.clock.fastForward(10_050); }
    const panel = page.locator(panelSelector);
    if (mode === 'success' || mode === 'empty') {
      if (mode === 'success') await page.locator('article').first().waitFor();
      else await page.getByRole('heading', { name: 'Нічого не знайдено', exact: true }).waitFor();
      assert.equal(await panel.count(), 0, 'Successful/empty responses must never show the outage message');
    } else {
      const retry = page.getByRole('button', { name: 'Спробувати ще раз', exact: true });
      await retry.waitFor();
      assert.equal(await retry.isEnabled(), true);
      const text = await panel.innerText();
      assert.ok(!text.includes('internal.invalid') && !text.includes('PRIVATE_ERROR'));
      const thematic = ['disconnected', 'categories-down', 'interrupted', 'timeout', 502, 503, 504].includes(mode);
      assert.equal(text.includes('російські атаки'), thematic);
      if (mode === 500) assert.ok(text.includes('Сервер відповів'));
      if (mode === 429) assert.ok(text.includes('забагато запитів'));

      const img = panel.locator('img');
      await img.evaluate(image => image.decode());
      assert.equal(await img.getAttribute('alt'), '');
      const dimensions = await img.evaluate(image => ({ width: image.clientWidth, height: image.clientHeight, naturalWidth: image.naturalWidth, naturalHeight: image.naturalHeight, url: image.currentSrc }));
      assert.equal(dimensions.naturalWidth, 1254);
      assert.equal(dimensions.naturalHeight, 1254);
      assert.ok(Math.abs(dimensions.width - dimensions.height) <= 1, 'Artwork must retain its square proportions');
      assert.ok(dimensions.url.startsWith(base + '/_next/static/media/'), 'Artwork must be served by the frontend');
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true, 'No horizontal overflow');
      if (initialMode === 'disconnected' && process.env.SMOKE_SCREENSHOTS) {
        fs.mkdirSync(process.env.SMOKE_SCREENSHOTS, { recursive: true });
        await page.screenshot({ path: path.join(process.env.SMOKE_SCREENSHOTS, `${name}.png`), fullPage: true });
      }
      if (url === '/' && mode === 'categories-down') assert.ok(await page.locator('article').count() > 0, 'A category failure must leave successful product data visible');
      if (url === '/' && mode === 'disconnected') assert.equal(await panel.count(), 1, 'Homepage should have one illustrated message');

      if (repeat) {
        const before = calls.length;
        await retry.click();
        await page.getByRole('button', { name: 'Відновлюємо зв’язок…' }).waitFor({ state: 'hidden' });
        await retry.waitFor();
        assert.equal(calls.length, before + 1, 'A repeated outage uses one bounded request');
      }

      if (recover) {
        const originalUrl = page.url();
        const before = calls.filter(call => call.path.endsWith('/categories')).length;
        const rect = await panel.boundingBox();
        const initialScroll = await page.evaluate(() => window.scrollY);
        await panel.evaluate(element => { element.dataset.availabilityMarker = 'same-panel'; });
        mode = 'delayed';
        const requestStarted = page.waitForRequest(request => new URL(request.url()).pathname.endsWith('/categories'));
        await retry.focus();
        assert.equal(await retry.evaluate(element => element === document.activeElement), true);
        await page.keyboard.press('Enter');
        await requestStarted;
        const busy = page.getByRole('button', { name: 'Відновлюємо зв’язок…', exact: true });
        assert.equal(await busy.isDisabled(), true);
        await busy.evaluate(button => { for (let i = 0; i < 8; i++) button.click(); });
        assert.equal(calls.filter(call => call.path.endsWith('/categories')).length, before + 1, 'Rapid clicks must not enqueue duplicate loads');
        assert.equal(await panel.getAttribute('data-availability-marker'), 'same-panel');
        const busyRect = await panel.boundingBox();
        const busyScroll = await page.evaluate(() => window.scrollY);
        assert.ok(Math.abs(rect.height - busyRect.height) <= 1 && Math.abs(rect.y + initialScroll - busyRect.y - busyScroll) <= 1, 'Retry must keep the composition in place');
        releaseRetry();
        await page.locator('article').first().waitFor();
        assert.equal(await panel.count(), 0);
        assert.equal(page.url(), originalUrl, 'Recovery must preserve query, filters and page');
        assert.equal(documents.length, 1, 'Recovery must not reload the document');
      }
    }
    assert.deepEqual(errors, []);
    results.push({ name, passed: true, calls: calls.length });
  } catch (error) {
    results.push({ name, passed: false, error: error.stack, errors, calls });
  } finally {
    releaseRetry();
    await context.close();
    console.log(JSON.stringify(results.at(-1)));
  }
}

try {
  await scenario('catalog-success', 'success');
  await scenario('catalog-empty', 'empty');
  await scenario('desktop-outage', 'disconnected', { recover: true, repeat: true, url: '/catalog/?q=Фігурка&categorySlug=figures&minPrice=1000&sort=price_desc&page=2' });
  await scenario('mobile-outage', 'disconnected', { width: 390, recover: true });
  await scenario('narrow-outage', 'disconnected', { width: 320, recover: true });
  await scenario('interrupted-request', 'interrupted', { recover: true });
  await scenario('request-timeout', 'timeout', { recover: true });
  for (const status of [500, 502, 503, 504, 429, 400, 403]) await scenario(`http-${status}`, status, { recover: true, width: status === 500 ? 390 : 1440 });
  await scenario('malformed-response', 'malformed', { recover: true });
  await scenario('home-outage', 'disconnected', { url: '/', width: 390, recover: true });
  await scenario('home-category-failure', 'categories-down', { url: '/', recover: true });
  await scenario('english-route-ukrainian-message', 'disconnected', { url: '/en/catalog/', recover: true });
  const context = await browser.newContext();
  await context.route('**/api/**', route => route.abort());
  const page = await context.newPage();
  await page.goto(base + '/contacts/');
  await page.getByRole('heading', { level: 1 }).waitFor();
  assert.equal(await page.locator(panelSelector).count(), 0);
  results.push({ name: 'static-contacts-with-api-offline', passed: true });
  await context.close();
} finally {
  await browser.close();
  if (server) await new Promise(resolve => server.close(resolve));
}
const report = { passed: results.filter(result => result.passed).length, failed: results.filter(result => !result.passed).length, results };
if (process.env.SMOKE_OUTPUT) fs.writeFileSync(process.env.SMOKE_OUTPUT, JSON.stringify(report, null, 2));
console.log(JSON.stringify({ passed: report.passed, failed: report.failed }));
if (report.failed) process.exitCode = 1;
