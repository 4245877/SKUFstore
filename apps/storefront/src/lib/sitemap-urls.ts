import { PUBLISHED_LOCALES } from '../i18n/locales.ts';
import { buildLocalizedPath } from '../i18n/paths.ts';
import { buildProductUrl } from './product-meta.ts';

export const STATIC_SITEMAP_PATHS = ['/', '/catalog/', '/contacts/', '/delivery/', '/payment/', '/returns/', '/privacy/', '/terms/', '/faq/', '/user-data-deletion/'];
export function sitemapUrls(slugs: string[], enReadySlugs: string[] = []) {
  const publicSlugs = new Set(slugs);
  if (publicSlugs.size !== slugs.length || new Set(enReadySlugs).size !== enReadySlugs.length ||
      enReadySlugs.some(slug => !publicSlugs.has(slug))) {
    throw new Error('Invalid public/EN-ready sitemap product coverage');
  }
  return [...PUBLISHED_LOCALES.flatMap(locale => STATIC_SITEMAP_PATHS.map((path) => `https://www.skufnya.com${buildLocalizedPath({ locale, path })}`)),
    ...slugs.map((slug) => buildProductUrl(slug)),
    ...enReadySlugs.map((slug) => buildProductUrl(slug, 'en'))];
}
