import { PUBLISHED_LOCALES } from '../i18n/locales.ts';
import { buildLocalizedPath } from '../i18n/paths.ts';
import { buildProductUrl } from './product-meta.ts';

export const STATIC_SITEMAP_PATHS = ['/', '/catalog/', '/contacts/', '/delivery/', '/payment/', '/returns/', '/privacy/', '/terms/', '/faq/', '/user-data-deletion/'];
export function sitemapUrls(slugs: string[]) {
  return [...PUBLISHED_LOCALES.flatMap(locale => STATIC_SITEMAP_PATHS.map((path) => `https://www.skufnya.com${buildLocalizedPath({ locale, path })}`)),
    ...slugs.map((slug) => buildProductUrl(slug))];
}
