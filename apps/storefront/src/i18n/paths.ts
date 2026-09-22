import { DEFAULT_LOCALE, assertPublishedLocale, isLocale, parseLocale, type Locale } from './locales.ts';

/** Strip only a published locale prefix; never treat /de as a public route. */
export function unprefixedPath(href: string): string {
  return href.replace(/^\/en(?=\/|[?#]|$)/, '') || '/';
}

/** Idempotent adapter for navigation. API, assets and external hrefs are not locale URLs. */
export function localizeHref(locale: Locale, href: string): string {
  if (!href.startsWith('/') || href.startsWith('//') || /^\/(?:api|uploads|_next)(?:\/|$)/.test(href)) return href;
  const path = unprefixedPath(href);
  return buildLocalizedPath({ locale, path: path.startsWith('/') ? path : `/${path}` });
}

/** The same semantic route, including repeated query keys and fragments. */
export function switchLocalePath(locale: Locale, href: string): string {
  return localizeHref(locale, href);
}

/**
 * Storefront hrefs only: preserves the caller's slash, query and fragment verbatim.
 * Existing links use both /catalog and /catalog/; canonical callers supply /.
 * Draft locale paths are deliberately rejected until routes are actually exported.
 * Next Link owns any deployment basePath; API/media/external URLs never go here.
 */
export function buildLocalizedPath({ locale, path }: { locale: Locale; path: string }): string {
  assertPublishedLocale(locale);
  if (!path.startsWith('/') || path.startsWith('//') || /[\\\s\u0000-\u001f]/u.test(path)) {
    throw new Error(`Expected an internal storefront path: ${path}`);
  }
  const pathname = path.split(/[?#]/, 1)[0];
  const segments = pathname.split('/').map((segment) => decodeURIComponent(segment));
  if (segments.some((segment) => segment === '.' || segment === '..') || isLocale(segments[1])) {
    throw new Error(`Expected an unprefixed storefront path: ${path}`);
  }
  // The non-default branch becomes reachable only after publication is enabled.
  return parseLocale(locale) === DEFAULT_LOCALE ? path : `/${locale}${path}`;
}
