// Read-only availability check: build consistency and live freshness are separate gates.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

function uniqueSlugs(slugs, label) {
  assert.ok(Array.isArray(slugs), `${label}: expected slugs`);
  for (const slug of slugs) assert.ok(typeof slug === 'string' && slug.length && !/[/?#\\]/.test(slug) && !['.', '..'].includes(slug), `${label}: invalid slug`);
  assert.equal(new Set(slugs).size, slugs.length, `${label}: duplicate slugs`);
  return new Set(slugs);
}
export function compareCatalogSlugs(liveSlugs, exportedSlugs) {
  const live = uniqueSlugs(liveSlugs, 'live'), exported = uniqueSlugs(exportedSlugs, 'exported');
  return {
    liveProducts: live.size, exportedProducts: exported.size,
    missing: [...live].filter(s => !exported.has(s)).sort(),
    stale: [...exported].filter(s => !live.has(s)).sort(),
  };
}
export function productSlugsFromSitemap(xml, origin) {
  assert.match(xml, /<urlset[\s>]/, 'Invalid sitemap');
  const urls = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map(m => new URL(m[1].replaceAll('&amp;', '&')));
  assert.ok(urls.length, 'Empty sitemap');
  for (const u of urls) assert.equal(u.origin, origin, 'Unexpected sitemap origin');
  return urls.filter(u => u.pathname.startsWith('/product/')).map(u => {
    assert.match(u.pathname, /^\/product\/[^/]+\/$/, 'Invalid product URL/trailing slash');
    return decodeURIComponent(u.pathname.split('/')[2]);
  });
}
async function request(url) {
  const r = await fetch(url, { headers: { 'cache-control': 'no-cache' }, signal: AbortSignal.timeout(30000) });
  return r;
}
export async function readLiveSlugs(api, fetchResponse = request) {
  const slugs = []; let expected;
  for (let page = 1; ; page++) {
    const r = await fetchResponse(`${api}/api/catalog/products?page=${page}&limit=100`);
    assert.equal(r.status, 200, `Catalog page ${page}: HTTP ${r.status}`);
    const data = await r.json();
    assert.ok(Array.isArray(data.items) && Number.isInteger(data.meta?.total) && data.meta.total >= 0, 'Invalid catalog listing');
    expected ??= data.meta.total;
    assert.equal(data.meta.total, expected, 'Catalog changed during listing; retry');
    assert.equal(data.meta.page, page, 'Wrong API page');
    slugs.push(...data.items.map(p => p.slug));
    if (slugs.length >= expected) break;
    assert.ok(data.items.length, 'Truncated listing');
  }
  assert.equal(slugs.length, expected, 'Incomplete listing');
  uniqueSlugs(slugs, 'live');
  return slugs;
}
export async function verifyFreshness({ site, api }, fetchResponse = request) {
  const live = await readLiveSlugs(api, fetchResponse);
  const sitemap = await fetchResponse(`${site}/sitemap.xml`);
  assert.equal(sitemap.status, 200, `Sitemap: HTTP ${sitemap.status}`);
  const diff = compareCatalogSlugs(live, productSlugsFromSitemap(await sitemap.text(), new URL(site).origin));
  const pages = [], queue = [...live];
  await Promise.all(Array.from({ length: 4 }, async () => {
    while (queue.length) {
      const slug = queue.shift(), url = `${site}/product/${encodeURIComponent(slug)}/`;
      const r = await fetchResponse(url), html = await r.text();
      // A generic 200 fallback must not disguise a missing product page.
      pages.push({ slug, status: r.status, canonical: html.includes(`<link rel="canonical" href="${url}"`), productJsonLd: /"@type"\s*:\s*"Product"/.test(html) });
    }
  }));
  const after = await readLiveSlugs(api, fetchResponse);
  assert.deepEqual([...after].sort(), [...live].sort(), 'Catalog changed during verification; retry');
  const broken = pages.filter(p => p.status !== 200 || !p.canonical || !p.productJsonLd);
  return { checkedAt: new Date().toISOString(), ...diff, checkedPages: pages.length, broken, fresh: !diff.missing.length && !diff.stale.length && !broken.length };
}
async function main() {
  const site = (process.env.STOREFRONT_URL || 'https://www.skufnya.com').replace(/\/$/, '');
  const api = (process.env.NEXT_PUBLIC_API_URL || 'https://api.skufnya.com').replace(/\/$/, '');
  const attempts = Math.max(1, Number(process.env.FRESHNESS_ATTEMPTS || 1));
  let result;
  for (let i = 0; i < attempts; i++) {
    result = await verifyFreshness({ site, api });
    if (result.fresh || i === attempts - 1) break;
    await new Promise(resolve => setTimeout(resolve, 15000));
  }
  console.log(JSON.stringify(result, null, 2));
  if (process.env.FRESHNESS_OUTPUT) fs.writeFileSync(process.env.FRESHNESS_OUTPUT, JSON.stringify(result, null, 2));
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `needs_build=${!result.fresh}\n`);
  if (!result.fresh) {
    console.error('::warning::Live public catalog differs from published Pages. Rebuild and verify; snapshot consistency alone cannot ensure freshness.');
    if (!process.argv.includes('--reconcile')) process.exitCode = 1;
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => { console.error(error); process.exitCode = 1; });
}
