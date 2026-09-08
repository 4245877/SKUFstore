import { buildProductUrl } from './product-meta.ts';

export const STATIC_SITEMAP_PATHS = ['/', '/catalog/', '/contacts/', '/delivery/', '/payment/', '/returns/', '/privacy/', '/terms/'];
export function sitemapUrls(slugs: string[]) {
  return [...STATIC_SITEMAP_PATHS.map((path) => `https://www.skufnya.com${path}`),
    ...slugs.map(buildProductUrl)];
}
