import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { normalizeProductPricing } from '../src/lib/api.ts';
import { formatMoney, formatProductPriceLabel } from '../src/lib/product-price.ts';

describe('backend price presentation contract', () => {
  const range = { priceFrom: 1000, priceTo: 1700, activeVariantCount: 2, hasPriceRange: true };
  it('preserves the backend range without computing variant prices', () => {
    assert.deepEqual(normalizeProductPricing(range, 1000), range);
    assert.equal(formatProductPriceLabel(range, 1000, 'UAH'), `від ${formatMoney(1000, 'UAH')}`);
  });
  it('does not mark multiple equally priced variants as a range', () => {
    const pricing = { ...range, priceTo: 1000, hasPriceRange: false };
    assert.equal(formatProductPriceLabel(pricing, 1000, 'UAH'), formatMoney(1000, 'UAH'));
  });
  it('retains a legacy DTO minimum and does not invent a range', () => {
    for (const value of [undefined, null, {}]) {
      assert.deepEqual(normalizeProductPricing(value, 1000), { priceFrom: 1000, priceTo: 1000, activeVariantCount: 0, hasPriceRange: false });
    }
    assert.equal(formatProductPriceLabel(undefined, 1000, 'UAH'), formatMoney(1000, 'UAH'));
  });
  it('requires a boolean and complete backend evidence before displaying від', () => {
    for (const value of [{ ...range, hasPriceRange: 'false' }, { hasPriceRange: true }, { ...range, priceTo: null }, { ...range, activeVariantCount: 1 }]) {
      assert.equal(normalizeProductPricing(value, 1000).hasPriceRange, false);
    }
  });
  it('rejects nonfinite DTO amounts without emitting Infinity or NaN', () => {
    for (const raw of ['Infinity', Infinity, NaN, -1]) {
      const pricing = normalizeProductPricing({ ...range, priceFrom: raw, priceTo: raw }, 1000);
      assert.equal(pricing.priceFrom, 1000);
      assert.equal(pricing.priceTo, 1000);
      assert.equal(pricing.hasPriceRange, false);
    }
  });
  it('uses the top-level backend minimum that also drives sorting', () => {
    assert.equal(formatProductPriceLabel({ ...range, priceFrom: 999 }, 1000, 'UAH'), `від ${formatMoney(1000, 'UAH')}`);
  });
  it('keeps explicit Ukrainian currency presentation independent of browser locale', () => {
    assert.match(formatMoney(1000, 'UAH'), /(?:₴|грн)/);
    assert.doesNotMatch(formatMoney(1000, 'UAH'), /EUR|€/);
  });
});
