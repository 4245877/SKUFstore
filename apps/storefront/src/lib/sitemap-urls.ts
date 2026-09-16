import { DEFAULT_LOCALE } from '../i18n/locales.ts';
import { buildLocalizedPath } from '../i18n/paths.ts';
import { buildProductUrl } from './product-meta.ts';

export const STATIC_SITEMAP_PATHS = ['/', '/catalog/', '/contacts/', '/delivery/', '/payment/', '/returns/', '/privacy/', '/terms/'];
export function sitemapUrls(slugs: string[]) {
  return [...STATIC_SITEMAP_PATHS.map((path) => `https://www.skufnya.com${buildLocalizedPath({ locale: DEFAULT_LOCALE, path })}`),
    ...slugs.map((slug) => buildProductUrl(slug))];
}
