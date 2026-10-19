// Read-only reconciliation of published Merchant data with the current public API.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolveMediaUrl } from '../src/lib/api.ts';
import { buildMerchantSourceState, buildMerchantFeed } from '../src/lib/merchant-feed.ts';

import { readLiveMerchantData } from '../src/lib/catalog-source.ts';
export { readLiveMerchantData };

async function request(url) {
  return fetch(url, { headers: { 'cache-control': 'no-cache' }, signal: AbortSignal.timeout(30000) });
}
function record(value, label) {
  assert.ok(value && typeof value === 'object' && !Array.isArray(value), `${label}: expected object`);
}
function validateState(state) {
  record(state, 'Published Merchant state');
  assert.equal(state.version, 2, 'Unsupported published Merchant state version');
  assert.match(state.fingerprint, /^[a-f0-9]{64}$/, 'Invalid published Merchant fingerprint');
  assert.ok(Number.isInteger(state.productCount) && state.productCount >= 0, 'Invalid published Merchant product count');
  return state;
}
export async function verifyMerchantFreshness({ site, api }, fetchResponse = request) {
  // Even on the first deployment (state 404), an unavailable API is a failed
  // check, never a valid empty catalog that could replace the published feed.
  const [live, response, xmlResponse] = await Promise.all([
    readLiveMerchantData(api, fetchResponse),
    fetchResponse(`${site}/google-merchant-state.json`),
    fetchResponse(`${site}/google-merchant.xml`),
  ]);
  const state = buildMerchantSourceState(live.products, live.colors);
  if (response.status !== 404) assert.equal(response.status, 200, `Published Merchant state: HTTP ${response.status}`);
  const published = response.status === 404 ? null : await response.json();
  // Old versions request a rebuild; malformed current states remain errors.
  if (published !== null && published?.version !== 1) validateState(published);
  const expectedXml = buildMerchantFeed(live.products, live.colors, resolveMediaUrl).xml;
  assert.ok([200, 404].includes(xmlResponse.status), `Published XML: HTTP ${xmlResponse.status}`);
  const publishedXml = xmlResponse.status === 200 ? await xmlResponse.text() : null;
  const xmlMatches = publishedXml === expectedXml;
  return {
    checkedAt: new Date().toISOString(),
    liveProducts: state.productCount,
    publishedProducts: published?.productCount ?? null,
    liveFingerprint: state.fingerprint,
    publishedFingerprint: published?.fingerprint ?? null,
    publishedStateMissing: published === null,
    publishedXmlMissing: publishedXml === null,
    xmlMatches,
    fresh: xmlMatches && published?.version === 2 && published.productCount === state.productCount && published.fingerprint === state.fingerprint,
  };
}

async function main() {
  const site = (process.env.STOREFRONT_URL || 'https://www.skufnya.com').replace(/\/+$/, '');
  const api = (process.env.NEXT_PUBLIC_API_URL || 'https://api.skufnya.com').replace(/\/+$/, '');
  const attempts = Number(process.env.MERCHANT_FRESHNESS_ATTEMPTS || 1);
  assert.ok(Number.isInteger(attempts) && attempts > 0 && attempts <= 10, 'Invalid MERCHANT_FRESHNESS_ATTEMPTS');
  let result;
  for (let attempt = 0; attempt < attempts; attempt++) {
    result = await verifyMerchantFreshness({ site, api });
    if (result.fresh || attempt === attempts - 1) break;
    await new Promise(resolve => setTimeout(resolve, 15000));
  }
  console.log(JSON.stringify(result, null, 2));
  if (process.env.MERCHANT_FRESHNESS_OUTPUT) fs.writeFileSync(process.env.MERCHANT_FRESHNESS_OUTPUT, JSON.stringify(result, null, 2));
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `needs_build=${!result.fresh}\n`);
  if (!result.fresh) {
    console.error('::warning::Published Merchant data differs from the public catalog. Rebuild to refresh prices, stock, descriptions, variants and resin colors.');
    if (!process.argv.includes('--reconcile')) process.exitCode = 1;
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => { console.error(error); process.exitCode = 1; });
}
