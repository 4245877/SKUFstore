// Runs a separate synthetic Pages build. Its artifact is never uploaded/deployed.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { fixtureResponse, products } from './stage2b-fixtures.mjs';
import { verifyFreshness } from '../scripts/catalog-freshness.mjs';

const source = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const work = fs.mkdtempSync(path.join(os.tmpdir(), 'skuf-stage2b-fixture-'));
const app = path.join(work, 'storefront');
fs.cpSync(source, app, { recursive: true, filter: file => !['.next', 'out', 'node_modules', '.git'].includes(path.basename(file)) && !path.basename(file).startsWith('.env') });
fs.symlinkSync(path.join(source, 'node_modules'), path.join(app, 'node_modules'), 'dir');
const requests = [];
const api = http.createServer((request, response) => {
  requests.push(request.url);
  assert.equal(request.method, 'GET', 'Synthetic build API is read-only');
  try { response.writeHead(200, { 'content-type': 'application/json', 'access-control-allow-origin': '*' }); response.end(JSON.stringify(fixtureResponse(new URL(request.url, 'http://127.0.0.1')))); }
  catch (error) { response.writeHead(500); response.end(String(error)); }
});
await new Promise(resolve => api.listen(0, '127.0.0.1', resolve));
const fixtureApi = `http://127.0.0.1:${api.address().port}`;
const env = { ...process.env, DEPLOY_TARGET: 'pages', NEXT_PUBLIC_API_URL: 'https://api.skufnya.com', NEXT_PUBLIC_MEDIA_URL: 'https://api.skufnya.com',
  NEXT_TELEMETRY_DISABLED: '1', STAGE2B_FIXTURE_API: fixtureApi,
  NODE_OPTIONS: `${process.env.NODE_OPTIONS || ''} --require=${path.join(app, 'test/stage2b-network-fixture.cjs')}` };
function run(args, extra = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, { cwd: app, env: { ...env, ...extra }, stdio: 'inherit' });
    child.on('error', reject); child.on('exit', code => code === 0 ? resolve() : reject(new Error(`${args[0]} exited ${code}`)));
  });
}
let site;
try {
  await run([path.join(app, 'node_modules/next/dist/bin/next'), 'build']);
  const collected = [...requests];
  assert.equal(collected.filter(url => url.startsWith('/api/catalog/products?')).length, 2, 'Expected initial and final listings in one catalog collection');
  for (const product of products) assert.equal(collected.filter(url => url === `/api/catalog/products/${product.slug}`).length, 1, 'Expected one detail per product');
  assert.equal(collected.filter(url => url === '/api/catalog/resin-colors').length, 1, 'Expected one resin-color collection');
  await run(['--experimental-strip-types', 'test/verify-stage1-export.mjs']);
  const root = path.join(app, 'out');
  site = http.createServer((request, response) => {
    let pathname = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname);
    let file = path.resolve(root, '.' + pathname);
    if (!file.startsWith(root + path.sep) && file !== root) { response.writeHead(400); response.end(); return; }
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    const exists = fs.existsSync(file) && fs.statSync(file).isFile();
    if (!exists) file = path.join(root, '404.html');
    const mime = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.xml': 'application/xml', '.json': 'application/json', '.txt': 'text/plain', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp' };
    response.writeHead(exists ? 200 : 404, { 'content-type': mime[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(response);
  });
  await new Promise(resolve => site.listen(0, '127.0.0.1', resolve));
  const fixtureSite = `http://127.0.0.1:${site.address().port}`;
  const freshness = await verifyFreshness({ site: 'https://www.skufnya.com', api: fixtureApi }, async url => url.startsWith('https://www.skufnya.com') ? fetch(url.replace('https://www.skufnya.com', fixtureSite)) : fetch(url));
  assert.equal(freshness.fresh, true, JSON.stringify(freshness));
  await run(['--experimental-strip-types', 'test/browser-stage2b.mjs'], { SMOKE_BASE: fixtureSite, SMOKE_OUTPUT: path.join(work, 'browser.json') });
  const report = { passed: 1, failed: 0, skipped: 0, productionWrites: 0, productionFetches: 0, workspace: app,
    catalogBuildId: JSON.parse(fs.readFileSync(path.join(app, '.next/cache/skufnya-build/catalog-snapshot.json'))).buildId,
    fixtureProducts: products.length, fixtureEnglishReadyProducts: 1, collectionRequests: collected, freshness,
    browser: JSON.parse(fs.readFileSync(path.join(work, 'browser.json'))) };
  fs.writeFileSync(path.join(work, 'verification.json'), JSON.stringify(report, null, 2));
  if (process.env.STAGE2B_FIXTURE_OUTPUT) fs.writeFileSync(process.env.STAGE2B_FIXTURE_OUTPUT, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ passed: 1, failed: 0, skipped: 0, evidence: path.join(work, 'verification.json') }));
} finally {
  await new Promise(resolve => api.close(resolve));
  if (site) await new Promise(resolve => site.close(resolve));
}
