import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { apiErrorCode, presentApiError } from '../src/i18n/api-errors.ts';
import { formatLocaleDate, orderStatusLabel, countNoun, formatDayCount, orderPaymentLabel, presentConfiguration, presentItemSubtitle, presentCartItemSubtitle } from '../src/i18n/presentation.ts';
import { getTranslator } from '../src/i18n/translate.ts';
import { localizeHref, switchLocalePath, localeSwitcherDestination } from '../src/i18n/paths.ts';

const sourceError = { message: 'Технічний текст сервера', details: { private: 'diagnostic' } };

describe('localized API error presentation', () => {
  it('uses stable backend codes for actionable errors in both locales', () => {
    for (const locale of ['uk', 'en'] as const) {
      const t = getTranslator(locale);
      for (const [code, key] of [
        ['INVALID_CREDENTIALS', 'errors.invalidCredentials'],
        ['BAD_REQUEST', 'errors.validation'],
        ['EMAIL_ALREADY_IN_USE', 'errors.emailTaken'],
        ['VERIFICATION_CODE_TOO_MANY_ATTEMPTS', 'errors.codeTooManyAttempts'],
        ['VERIFICATION_CODE_EXPIRED', 'errors.codeExpired'],
        ['INVALID_CONFIGURATION', 'errors.unavailable'],
        ['ORDER_PRICE_CHANGED', 'errors.quoteChanged'],
        ['EMAIL_SEND_FAILED', 'errors.emailDelivery'],
      ] as const) {
        assert.equal(presentApiError(t, { payload: { ...sourceError, error: code } }), t(key));
      }
    }
    assert.equal(apiErrorCode({ payload: { error: 'INVALID_CREDENTIALS' } }), 'INVALID_CREDENTIALS');
  });

  it('returns safe generic copy for unknown and inherited-property codes', () => {
    for (const locale of ['uk', 'en'] as const) {
      const t = getTranslator(locale);
      for (const code of ['NEW_BACKEND_CODE', '__proto__', 'constructor', 'toString', 'hasOwnProperty']) {
        const error = { ...sourceError, payload: { ...sourceError, error: code } };
        assert.equal(presentApiError(t, error), t('errors.generic'));
      }
      for (const error of [undefined, null, sourceError, new Error(sourceError.message)]) {
        assert.equal(presentApiError(t, error), t('errors.generic'));
      }
    }
  });

  it('presents HTTP and network errors without displaying transport messages', () => {
    const t = getTranslator('en');
    assert.equal(presentApiError(t, { status: 429, ...sourceError }), t('errors.rateLimit'));
    assert.equal(presentApiError(t, { status: 401, ...sourceError }), t('errors.signIn'));
    assert.equal(presentApiError(t, { status: 403, ...sourceError }), t('errors.signIn'));
    assert.equal(presentApiError(t, new TypeError('Failed to fetch private API URL')), t('errors.network'));
  });
});

describe('route-selected customer presentation', () => {
  it('formats English and Ukrainian dates without changing their source value', () => {
    const date = '2026-09-19T12:00:00.000Z';
    assert.match(formatLocaleDate(date, 'en'), /September/u);
    assert.match(formatLocaleDate(date, 'uk'), /вересня/u);
    assert.ok(!/[\u0400-\u04FF]/u.test(formatLocaleDate(date, 'en', 'short')));
    assert.match(formatLocaleDate(date, 'uk', 'short'), /вер/u);
    assert.equal(date, '2026-09-19T12:00:00.000Z');
  });

  it('translates every known order status and safely handles future status values', () => {
    const expected = {
      pending: 'Awaiting confirmation', confirmed: 'Confirmed', awaiting_payment: 'Awaiting payment',
      paid: 'Paid', processing: 'In progress', shipped: 'Shipped', delivered: 'Delivered',
      cancelled: 'Cancelled', returned: 'Return',
    };
    for (const [status, label] of Object.entries(expected)) {
      assert.equal(orderStatusLabel(getTranslator('en'), status.toUpperCase()), label);
      assert.match(orderStatusLabel(getTranslator('uk'), status), /[\u0400-\u04FF]/u);
    }
    for (const locale of ['uk', 'en'] as const) {
      const t = getTranslator(locale);
      for (const status of ['', 'future_status', '__proto__', 'constructor', 'toString']) {
        assert.equal(orderStatusLabel(t, status), t('account.unknown'));
      }
    }
  });

  it('uses the English and Ukrainian plural rules for product counts and lead times', () => {
    const en = getTranslator('en');
    const uk = getTranslator('uk');
    for (const count of [0, 1, 2, 4, 5, 11, 21, 22, 101]) {
      assert.equal(countNoun(en, 'en', count, 'products'), count === 1 ? 'product' : 'products');
      assert.equal(countNoun(en, 'en', count, 'categories'), count === 1 ? 'category' : 'categories');
      assert.equal(countNoun(en, 'en', count, 'figures'), count === 1 ? 'figure' : 'figures');
      assert.equal(formatDayCount(en, 'en', count), `${count} ${count === 1 ? 'day' : 'days'}`);
    }
    assert.equal(formatDayCount(uk, 'uk', 1), '1 день');
    assert.equal(formatDayCount(uk, 'uk', 21), '21 день');
    assert.equal(formatDayCount(uk, 'uk', 22), '22 дні');
    assert.equal(formatDayCount(uk, 'uk', 11), '11 днів');
    assert.equal(countNoun(uk, 'uk', 21, 'products'), 'товар');
    assert.equal(countNoun(uk, 'uk', 22, 'products'), 'товари');
    assert.equal(countNoun(uk, 'uk', 25, 'products'), 'товарів');
  });

  it('shows the recorded manual payment option without changing order data', () => {
    const t = getTranslator('en');
    const methods = {
      card: 'Card payment', 'cash-on-delivery': 'Cash on delivery',
      'partial-prepayment': '60% advance payment', 'full-prepayment': 'Full advance payment',
      agreement: 'Arranged after ordering', unknown: 'Arranged after ordering',
    };
    for (const [method, expected] of Object.entries(methods)) {
      assert.equal(orderPaymentLabel(t, method), expected);
    }
  });

  it('localizes structured finish labels while preserving source colors and immutable snapshots', () => {
    const snapshot = {
      version: 1, finish: 'MONO' as const, finishLabel: 'Монохромна версія',
      color: { id: 'color', slug: 'graphite', name: 'Графіт', hexColor: '#333333', priceDelta: 200 },
      baseUnitPrice: 1000, finishPriceDelta: 0, currency: 'UAH',
    };
    const before = JSON.stringify(snapshot);
    const subtitle = 'Авторський варіант · Монохромна версія · Графіт';
    assert.equal(presentConfiguration(getTranslator('en'), snapshot), 'Monochrome version · Графіт');
    assert.equal(presentItemSubtitle(getTranslator('en'), subtitle, snapshot), 'Авторський варіант · Monochrome version · Графіт');
    assert.equal(presentItemSubtitle(getTranslator('uk'), subtitle, snapshot), subtitle);
    assert.equal(presentItemSubtitle(getTranslator('en'), 'Монохромна версія · Графіт', snapshot), 'Monochrome version · Графіт');
    assert.equal(presentItemSubtitle(getTranslator('en'), 'Авторський варіант', snapshot), 'Авторський варіант');
    assert.equal(presentItemSubtitle(getTranslator('en'), subtitle), subtitle);
    assert.equal(JSON.stringify(snapshot), before);
    assert.equal(subtitle, 'Авторський варіант · Монохромна версія · Графіт');
    assert.equal(presentConfiguration(getTranslator('en'), { ...snapshot, finish: 'PAINTED', finishLabel: 'Художній розпис', color: null }), 'Artistic painting');
    assert.equal(presentConfiguration(getTranslator('en'), null), '');
  });

  it('keeps the 404 language switcher usable on reserved and malformed paths', () => {
    for (const locale of ['uk', 'en'] as const) {
      const home = locale === 'en' ? '/en/' : '/';
      for (const href of ['/uk/', '/de/', '/de/catalog/?q=x#results', '/%64e/', '/bad%/', '/bad path/', '//example.com/', '/api/orders/quote', '/_not-found', '/en/_not-found/', '/%5Fnot-found/', '/en/api/orders/quote', '/_next/static/chunk.js', '/_internal/', '/404.html', '/404/', 'https://example.com/']) {
        assert.equal(localeSwitcherDestination(locale, href), home);
      }
      assert.equal(localeSwitcherDestination(locale, '/missing-route/?q=x#fragment', true), home);
      assert.equal(localeSwitcherDestination(locale, '/en/missing-route/', true), home);
      assert.equal(localeSwitcherDestination(locale, '/en/catalog/?q=a%20b#filters'), locale === 'en' ? '/en/catalog/?q=a%20b#filters' : '/catalog/?q=a%20b#filters');
    }
    assert.throws(() => localeSwitcherDestination('de', '/catalog/'), /not published/);
    assert.throws(() => switchLocalePath('en', '/de/'));
  });

  it('localizes current cart configuration before a quote without rewriting catalog or historical text', () => {
    const en = getTranslator('en'), uk = getTranslator('uk');
    const item = { finish: 'MONO' as const, colorSlug: 'graphite', subtitle: 'Авторський варіант · Монохромна версія · Графіт (під замовлення)' };
    const before = JSON.stringify(item);
    assert.equal(presentCartItemSubtitle(en, item), 'Авторський варіант · Monochrome version · Графіт (made to order)');
    assert.equal(presentCartItemSubtitle(uk, item), item.subtitle);
    assert.equal(presentCartItemSubtitle(uk, { ...item, subtitle: 'Original variant · Monochrome version · Графіт (made to order)' }), 'Original variant · Монохромна версія · Графіт (під замовлення)');
    assert.equal(presentCartItemSubtitle(en, { finish: 'PAINTED', subtitle: 'Авторський варіант · Художній розпис' }), 'Авторський варіант · Artistic painting');
    for (const subtitle of ['Монохромна версія · Графіт', 'Монохромна версія · Авторський варіант · Графіт', 'Авторський варіант · Unknown finish · Графіт']) {
      assert.equal(presentCartItemSubtitle(en, { ...item, subtitle }), subtitle);
    }
    assert.equal(presentCartItemSubtitle(en, { subtitle: item.subtitle }), item.subtitle);
    assert.equal(presentItemSubtitle(en, item.subtitle), item.subtitle, 'Historical freeform subtitle must be preserved');
    const snapshot = { version: 1, finish: 'MONO' as const, finishLabel: 'Монохромна версія', color: { id: 'color', slug: 'graphite', name: 'Графіт', hexColor: '#333333', priceDelta: 200 }, baseUnitPrice: 1000, finishPriceDelta: 0, currency: 'UAH' };
    const quoted = { ...item, subtitle: 'Авторський варіант · Монохромна версія · Графіт', configurationSnapshot: snapshot };
    assert.equal(presentCartItemSubtitle(en, quoted), presentItemSubtitle(en, quoted.subtitle, snapshot));
    assert.equal(JSON.stringify(item), before);
  });

  it('preserves semantic routes, repeated query parameters and fragments when switching locales', () => {
    const route = '/product/frieren/?q=a%20b&tag=one&tag=two#configuration';
    assert.equal(switchLocalePath('en', route), '/en' + route);
    assert.equal(switchLocalePath('uk', '/en' + route), route);
    assert.equal(localizeHref('en', '/en/catalog/?sort=price_asc#filters'), '/en/catalog/?sort=price_asc#filters');
    for (const href of ['/api/orders/quote', '/uploads/photo.webp', '/_next/chunk.js', 'https://example.com/en/', '//example.com/a']) {
      assert.equal(localizeHref('en', href), href);
    }
  });
});
