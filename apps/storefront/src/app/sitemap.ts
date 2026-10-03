import type { MetadataRoute } from 'next';
import { getSnapshotProducts } from '../lib/build-snapshot';
import { isEnglishProductReady } from '../i18n/catalog-policy';
import { languageAlternates } from '../i18n/metadata';
import { unprefixedPath } from '../i18n/paths';
import { sitemapUrls } from '../lib/sitemap-urls';

export const dynamic = 'force-static';

export default function sitemap(): MetadataRoute.Sitemap {
  // In Pages builds generateStaticParams collects the snapshot before export workers run.
  // Never start a second catalog fetch here or read a different list from the live API.
  const products = process.env.DEPLOY_TARGET === 'pages' ? getSnapshotProducts() : [];
  const readySlugs = products.filter(isEnglishProductReady).map(product => product.slug);
  const ready = new Set(readySlugs);
  return sitemapUrls(products.map(product => product.slug), readySlugs).map((url) => {
    const pathname = unprefixedPath(new URL(url).pathname);
    const isProduct = pathname.startsWith('/product/');
    const slug = isProduct ? decodeURIComponent(pathname.split('/')[2]) : null;
    return { url, ...(!isProduct || ready.has(slug!) ? {
      alternates: { languages: languageAlternates(pathname) },
    } : {}) };
  });
}
