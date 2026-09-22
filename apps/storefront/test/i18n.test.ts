import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { DEFAULT_LOCALE, SUPPORTED_LOCALES, PUBLISHED_LOCALES, isLocale, parseLocale, isPublishedLocale } from '../src/i18n/locales.ts';
import { buildLocalizedPath } from '../src/i18n/paths.ts';
import { getDictionary, getTranslator, validateDictionary, type Dictionary } from '../src/i18n/translate.ts';
import { uk } from '../src/i18n/dictionaries/uk.ts';
import { en } from '../src/i18n/dictionaries/en.ts';
import { de } from '../src/i18n/dictionaries/de.ts';
import { buildProductUrl } from '../src/lib/product-meta.ts';
import { sitemapUrls } from '../src/lib/sitemap-urls.ts';

/** Every static page the sitemap publishes, in the order sitemapUrls emits them. */
const STATIC_PATHS = ['/', '/catalog/', '/contacts/', '/delivery/', '/payment/', '/returns/', '/privacy/', '/terms/', '/faq/', '/user-data-deletion/'];

describe('locale publication and URL compatibility', () => {
  it('defaults to uk, publishes uk and en, and keeps de reserved but unpublished', () => {
    assert.equal(DEFAULT_LOCALE, 'uk');
    assert.deepEqual(SUPPORTED_LOCALES, ['uk', 'en', 'de']);
    assert.deepEqual(PUBLISHED_LOCALES, ['uk', 'en']);
    assert.equal(isPublishedLocale('uk'), true);
    assert.equal(isPublishedLocale('en'), true);
    assert.equal(isPublishedLocale('de'), false);
    for (const value of [undefined, null, '', 'UK', 'EN', 'uk-UA', 'en-GB', 'fr', {}, '__proto__']) {
      assert.equal(isPublishedLocale(value), false);
    }
  });
  it('rejects unsupported and malformed locale values instead of choosing a fallback', () => {
    for (const value of [undefined, null, '', 'UK', 'uk-UA', 'fr', {}, '__proto__']) {
      assert.equal(isLocale(value), false);
      assert.throws(() => parseLocale(value), /Unsupported locale/);
    }
    for (const value of SUPPORTED_LOCALES) assert.equal(parseLocale(value), value);
  });
  it('retains every existing Ukrainian link, query, fragment and slash policy', () => {
    for (const path of ['/', '/catalog', '/catalog/', '/product/figure/', '/catalog?sort=newest&q=a%20b', '/profile/orders/details/?id=123#items', '/product/%D1%84%D1%96%D0%B3%D1%83%D1%80%D0%BA%D0%B0/']) {
      assert.equal(buildLocalizedPath({ locale: 'uk', path }), path);
    }
  });
  it('prefixes published English routes verbatim and keeps the Ukrainian ones unprefixed', () => {
    for (const path of ['/', '/catalog', '/catalog/', '/product/figure/', '/catalog?sort=newest&q=a%20b', '/profile/orders/details/?id=123#items', '/product/%D1%84%D1%96%D0%B3%D1%83%D1%80%D0%BA%D0%B0/']) {
      assert.equal(buildLocalizedPath({ locale: 'en', path }), `/en${path}`);
      assert.notEqual(buildLocalizedPath({ locale: 'en', path }), buildLocalizedPath({ locale: 'uk', path }));
    }
  });
  it('does not generate draft routes or silently remove/double a locale prefix', () => {
    assert.throws(() => buildLocalizedPath({ locale: 'de', path: '/catalog/' }), /not published/);
    for (const locale of ['uk', 'en'] as const) {
      for (const path of ['/uk/', '/en/product/a/', '/de', 'https://example.com', '//example.com', '/\\example.com', '/catalog/../en/']) {
        assert.throws(() => buildLocalizedPath({ locale, path }));
      }
    }
  });
  it('preserves absolute product canonical URLs and URI encoding', () => {
    for (const slug of ['figure', 'фігурка', 'a b', 'a/b', 'a?b#c']) {
      assert.equal(buildProductUrl(slug), `https://www.skufnya.com/product/${encodeURIComponent(slug)}/`);
      assert.equal(buildProductUrl(slug, 'en'), `https://www.skufnya.com/en/product/${encodeURIComponent(slug)}/`);
    }
  });
  it('publishes every static page in both locales and keeps sitemap product URLs Ukrainian-only', () => {
    const urls = sitemapUrls(['one', 'фігурка']);
    assert.equal(urls.length, STATIC_PATHS.length * PUBLISHED_LOCALES.length + 2);
    assert.deepEqual(urls.slice(0, STATIC_PATHS.length), STATIC_PATHS.map((p) => `https://www.skufnya.com${p}`));
    assert.deepEqual(urls.slice(STATIC_PATHS.length, STATIC_PATHS.length * 2), STATIC_PATHS.map((p) => `https://www.skufnya.com/en${p}`));
    assert.deepEqual(urls.slice(-2), [buildProductUrl('one'), buildProductUrl('фігурка')]);
    assert.equal(new Set(urls).size, urls.length);
    assert.ok(urls.every((url) => !/^\/(uk|de)(\/|$)/.test(new URL(url).pathname)));
    // EN product pages are routed but deliberately not indexed, so they stay out of the sitemap.
    assert.ok(urls.every((url) => !new URL(url).pathname.startsWith('/en/product/')));
  });
});

describe('strict, framework-independent dictionaries', () => {
  it('provides the same Ukrainian copy for Server and Client Components', () => {
    assert.equal(getDictionary('uk'), uk);
    const t = getTranslator('uk');
    assert.equal(t('nav.catalog'), 'Каталог');
    assert.equal(t('errors.notFound'), 'Сторінку не знайдено');
    assert.equal(t('header.freeDelivery', { amount: '1 500 ₴' }), 'Безкоштовна доставка від 1 500 ₴');
    assert.equal(t('header.cartCount', { count: 0 }), 'Кошик (0)');
  });
  it('serves real English copy instead of falling back to uk or exposing placeholders', () => {
    assert.equal(getDictionary('en'), en);
    assert.doesNotThrow(() => validateDictionary(en));
    const t = getTranslator('en');
    assert.equal(t('nav.catalog'), 'Catalog');
    assert.equal(t('errors.notFound'), 'Page not found');
    assert.equal(t('header.freeDelivery', { amount: '1 500 ₴' }), 'Free delivery from 1 500 ₴');
    assert.equal(t('header.cartCount', { count: 0 }), 'Cart (0)');
    // A key still serving Ukrainian text would be exactly the silent fallback this contract forbids.
    for (const [key, message] of Object.entries(en)) {
      assert.ok(!/[\u0400-\u04FF]/u.test(message), `Untranslated Ukrainian copy left in en.${key}`);
    }
  });
  it('fails on unpublished dictionaries instead of falling back to a published one', () => {
    assert.throws(() => getDictionary('de'), /not published/);
    assert.throws(() => getTranslator('de'), /not published/);
    assert.deepEqual(de, {});
  });
  it('checks the complete key contract and interpolation contract at runtime', () => {
    assert.doesNotThrow(() => validateDictionary(uk));
    const missing = { ...uk } as { -readonly [K in keyof Dictionary]?: string };
    delete missing['nav.cart'];
    assert.throws(() => validateDictionary(missing), /Missing translation: nav.cart/);
    assert.throws(() => validateDictionary({ ...uk, 'nav.cart': ' ' }), /Missing translation/);
    assert.throws(() => validateDictionary({ ...uk, typo: 'Cart' }), /Unknown translation/);
    assert.throws(() => validateDictionary({ ...uk, 'header.cartCount': 'Cart ({total})' }), /parameters differ/);
  });
  it('fails loudly for untyped callers with missing keys or interpolation values', () => {
    for (const locale of PUBLISHED_LOCALES) {
      const t = getTranslator(locale) as (key: string, values?: Record<string, unknown>) => string;
      assert.throws(() => t('missing.key'), /Missing translation/);
      assert.throws(() => t('toString'), /Missing translation/);
      assert.throws(() => t('header.cartCount'), /Missing translation parameter/);
      assert.throws(() => t('header.cartCount', { count: undefined }), /Missing translation parameter/);
      assert.throws(() => t('header.cartCount', { count: 1, typo: 2 }), /Unexpected translation parameter/);
    }
  });
  it('does not recursively interpolate or interpret caller data as HTML', () => {
    assert.equal(getTranslator('uk')('header.submenu', { label: '<b>{count}</b>' }), 'Підменю <b>{count}</b>');
    assert.equal(getTranslator('en')('header.submenu', { label: '<b>{count}</b>' }), '<b>{count}</b> submenu');
  });
  it('keeps dictionary access read-only', () => {
    for (const locale of PUBLISHED_LOCALES) assert.equal(Object.isFrozen(getDictionary(locale)), true);
  });
});

// These negative contracts are checked by the normal storefront typecheck/build.
function typeContracts() {
  const t = getTranslator('uk');
  // @ts-expect-error Unknown translation keys cannot reach production accidentally.
  t('nav.typo');
  // @ts-expect-error Required interpolation values cannot be omitted.
  t('header.cartCount');
  // @ts-expect-error Parameter names are inferred from the source dictionary.
  t('header.cartCount', { total: 2 });
  // @ts-expect-error A static message accepts no interpolation values.
  t('nav.cart', { count: 2 });
  // @ts-expect-error Published dictionaries must implement the complete contract.
  const incomplete: Dictionary = { 'nav.cart': 'Cart' };
  return incomplete;
}
