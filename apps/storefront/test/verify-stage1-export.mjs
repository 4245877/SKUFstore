// Run after DEPLOY_TARGET=pages next build. Optional EXPORT_BASELINE compares prior HTML.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { buildProductUrl } from '../src/lib/product-meta.ts';
import { sitemapUrls } from '../src/lib/sitemap-urls.ts';

const root = path.resolve(process.env.EXPORT_ROOT || 'out');
const snapshot = JSON.parse(fs.readFileSync('.next/cache/skufnya-build/catalog-snapshot.json', 'utf8'));
const sitemap = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
const urls = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1].replaceAll('&amp;', '&'));
assert.deepEqual(urls, sitemapUrls(snapshot.items.map((item) => item.slug)));
for (const url of urls) {
  const pathname = decodeURIComponent(new URL(url).pathname);
  assert.ok(!/^\/(uk|en|de)(\/|$)/.test(pathname));
  assert.ok(fs.existsSync(path.join(root, pathname, 'index.html')), `Missing export: ${pathname}`);
}
for (const locale of ['uk', 'en', 'de']) assert.equal(fs.existsSync(path.join(root, locale)), false);

function htmlFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(dir, entry.name);
    return entry.isDirectory() ? htmlFiles(file) : file.endsWith('.html') ? [file] : [];
  });
}
function seo(html) {
  // Compare the actual rendered metadata and JSON-LD; ignore Next build IDs/assets.
  return [
    ...(html.match(/<title>.*?<\/title>|<meta\s[^>]+>|<link\s[^>]+rel="canonical"[^>]*>/gs) || []),
    ...(html.match(/<script type="application\/ld\+json">.*?<\/script>/gs) || []),
  ];
}
const files = htmlFiles(root);
for (const file of files) {
  const html = fs.readFileSync(file, 'utf8');
  assert.match(html, /<html[^>]+lang="uk"/);
  assert.doesNotMatch(html, /hrefLang=/i);
  assert.doesNotMatch(html, /href="\/(?:uk|en|de)(?:\/|"|\?)/);
  if (process.env.EXPORT_BASELINE) {
    const previous = fs.readFileSync(path.join(process.env.EXPORT_BASELINE, path.relative(root, file)), 'utf8');
    assert.deepEqual(seo(html), seo(previous), `Metadata changed: ${path.relative(root, file)}`);
  }
}
for (const product of snapshot.items) {
  const html = fs.readFileSync(path.join(root, 'product', product.slug, 'index.html'), 'utf8');
  assert.ok(html.includes(`<link rel="canonical" href="${buildProductUrl(product.slug)}"`));
}
if (process.env.EXPORT_BASELINE) {
  assert.deepEqual(files.map((f) => path.relative(root, f)), htmlFiles(process.env.EXPORT_BASELINE).map((f) => path.relative(process.env.EXPORT_BASELINE, f)));
  assert.equal(sitemap, fs.readFileSync(path.join(process.env.EXPORT_BASELINE, 'sitemap.xml'), 'utf8'));
}
console.log(JSON.stringify({ passed: true, products: snapshot.items.length, sitemapUrls: urls.length, htmlPages: files.length, baselineCompared: Boolean(process.env.EXPORT_BASELINE) }));
