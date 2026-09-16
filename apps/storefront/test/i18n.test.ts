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

describe('locale publication and URL compatibility', () => {
  it('defaults to uk; reserves en/de without publishing them', () => {
    assert.equal(DEFAULT_LOCALE, 'uk');
    assert.deepEqual(SUPPORTED_LOCALES, ['uk', 'en', 'de']);
    assert.deepEqual(PUBLISHED_LOCALES, ['uk']);
    assert.equal(isPublishedLocale('en'), false);
    assert.equal(isPublishedLocale('uk'), true);
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
  it('does not generate draft routes or silently remove/double a locale prefix', () => {
    for (const locale of ['en', 'de'] as const) {
      assert.throws(() => buildLocalizedPath({ locale, path: '/catalog/' }), /not published/);
    }
    for (const path of ['/uk/', '/en/product/a/', '/de', 'https://example.com', '//example.com', '/\\example.com', '/catalog/../en/']) {
      assert.throws(() => buildLocalizedPath({ locale: 'uk', path }));
    }
  });
  it('preserves absolute product canonical URLs and URI encoding', () => {
    for (const slug of ['figure', 'фігурка', 'a b', 'a/b', 'a?b#c']) {
      assert.equal(buildProductUrl(slug), `https://www.skufnya.com/product/${encodeURIComponent(slug)}/`);
    }
  });
  it('keeps sitemap Ukrainian-only with the same eight static and product URLs', () => {
    const urls = sitemapUrls(['one', 'фігурка']);
    assert.equal(urls.length, 10);
    assert.deepEqual(urls.slice(0, 8), ['/', '/catalog/', '/contacts/', '/delivery/', '/payment/', '/returns/', '/privacy/', '/terms/'].map((p) => `https://www.skufnya.com${p}`));
    assert.ok(urls.every((url) => !/^\/(uk|en|de)(\/|$)/.test(new URL(url).pathname)));
    assert.equal(urls.at(-2), buildProductUrl('one'));
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
  it('fails on unpublished dictionaries instead of falling back to uk or exposing placeholders', () => {
    for (const locale of ['en', 'de'] as const) {
      assert.throws(() => getDictionary(locale), /not published/);
      assert.throws(() => getTranslator(locale), /not published/);
    }
    assert.deepEqual(en, {});
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
    const t = getTranslator('uk') as (key: string, values?: Record<string, unknown>) => string;
    assert.throws(() => t('missing.key'), /Missing translation/);
    assert.throws(() => t('toString'), /Missing translation/);
    assert.throws(() => t('header.cartCount'), /Missing translation parameter/);
    assert.throws(() => t('header.cartCount', { count: undefined }), /Missing translation parameter/);
    assert.throws(() => t('header.cartCount', { count: 1, typo: 2 }), /Unexpected translation parameter/);
  });
  it('does not recursively interpolate or interpret caller data as HTML', () => {
    assert.equal(getTranslator('uk')('header.submenu', { label: '<b>{count}</b>' }), 'Підменю <b>{count}</b>');
  });
  it('keeps dictionary access read-only', () => {
    assert.equal(Object.isFrozen(getDictionary('uk')), true);
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
