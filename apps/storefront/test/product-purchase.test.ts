import assert from 'node:assert/strict';
import { test } from 'node:test';
import { productSize, productionTime, finishDescription, assemblyDescription, packageDescription } from '../src/lib/product-purchase.ts';
import { buildProductInquiry, productInquiryUrl } from '../src/lib/product-inquiry.ts';
import { restoreProductSelection } from '../src/lib/product-selection.ts';
import { normalizeCatalogProductDetail } from '../src/lib/api.ts';
import { publicCatalogAttributes } from '../src/lib/public-catalog-attributes.ts';
import { getTranslator } from '../src/i18n/translate.ts';

for (const locale of ['uk', 'en'] as const) {
  const t = getTranslator(locale);
  test(`${locale}: size follows variant, with product height only when compatible`, () => {
    assert.equal(productSize({ heightMm: 280 }, { sizeLabel: '1/8' }, t), `1/8 · ${t('shop.valueMm', { value1: 280 })}`);
    assert.equal(productSize({ heightMm: 280 }, { sizeLabel: '35 cm' }, t), '35 cm');
    assert.equal(productSize({ heightMm: 280 }, { sizeLabel: 'Large' }, t), 'Large');
    assert.equal(productSize({ heightMm: 280 }, { sizeLabel: null }, t), t('shop.valueMm', { value1: 280 }));
    assert.equal(productSize({ heightMm: null }, { sizeLabel: '1:6' }, t), '1:6');
    assert.equal(productSize({ heightMm: 0 }, null, t), null);
    assert.equal(productSize({ heightMm: 280, variants: [{ sizeLabel: '1/8' }, { sizeLabel: '1/6' }] }, { sizeLabel: '1/6' }, t), '1/6');
  });
  test(`${locale}: unknown or zero lead time never promises immediate dispatch`, () => {
    for (const leadTimeDays of [null, undefined, 0, -1, Infinity, 1.5]) {
      assert.equal(productionTime({ leadTimeDays }, t, locale), t('purchase.timeUnknown'));
    }
    assert.match(productionTime({ leadTimeDays: 12 }, t, locale), /12/);
    assert.equal(finishDescription('MONO', t), t('purchase.mono'));
    assert.equal(finishDescription('PAINTED', t), t('shop.artisticPainting'));
    assert.equal(assemblyDescription(undefined, t), t('purchase.assemblyUnknown'));
    assert.equal(assemblyDescription({ assembly: 'UNASSEMBLED' }, t), t('purchase.unassembled'));
    assert.equal(assemblyDescription({ assembly: 'ASSEMBLED' }, t), t('purchase.assembled'));
  });
  test(`${locale}: contact draft uses the current selection and encodes Unicode safely`, () => {
    const context = { title: 'Figure & Фігурка #1', url: 'https://www.skufnya.com/product/figure/',
      variant: 'Large · Armor', size: '35 cm', color: 'Ivory', finish: finishDescription('MONO', t) };
    const draft = buildProductInquiry(context, t, 'Чи є підставка? & extra');
    const url = new URL(productInquiryUrl(draft));
    assert.equal(url.origin + url.pathname, 'https://t.me/SKUFnya_ua');
    assert.equal(url.searchParams.get('text'), draft);
    for (const value of Object.values(context)) assert.ok(draft.includes(value));
    assert.ok(draft.includes('Чи є підставка? & extra'));
    assert.notEqual(draft, buildProductInquiry({ ...context, variant: 'Small', size: '15 cm', color: 'Black' }, t));
    const empty = buildProductInquiry({ ...context, variant: null, size: null, color: null }, t);
    assert.doesNotMatch(empty, /null|undefined|SKU|variantId/);
  });
}
test('English package contents require actual editorial English data', () => {
  assert.equal(packageDescription({ contentsUk: 'Деталі' }, 'en'), null);
  assert.equal(packageDescription({ contentsUk: 'Деталі', contentsEn: 'Parts' }, 'en'), 'Parts');
});
test('new public attributes remain explicitly limited and tolerate old APIs', () => {
  assert.equal(publicCatalogAttributes(null), null);
  assert.deepEqual(publicCatalogAttributes({ internal: 'private', purchaseInfo: { assembly: 'ASSEMBLED', contentsUk: ' Деталі ', secret: 4 } }), {
    purchaseInfo: { assembly: 'ASSEMBLED', contentsUk: 'Деталі' },
  });
  assert.equal(publicCatalogAttributes({ purchaseInfo: { assembly: 'anything', contentsUk: 'x'.repeat(601) } }), null);
});
test('saved preference is validated against active variants and current colours', () => {
  const variants = [{ id: 'one', isActive: true }, { id: 'hidden', isActive: false }];
  const colors = [{ slug: 'ivory' }];
  const selection = { variantId: 'one', finish: 'MONO', colorSlug: 'ivory' };
  assert.deepEqual(restoreProductSelection(JSON.stringify(selection), variants, colors), selection);
  for (const value of [null, 'bad JSON', '{}', JSON.stringify({ ...selection, variantId: 'hidden' }),
    JSON.stringify({ ...selection, finish: 'PAINTED' }), JSON.stringify({ ...selection, colorSlug: 'deleted' })]) {
    assert.equal(restoreProductSelection(value, variants, colors), null);
  }
});

test('detail normalization carries approved purchase facts into the build snapshot', () => {
  const product = normalizeCatalogProductDetail({ attributes: {
    purchaseInfo: { assembly: 'UNASSEMBLED', contentsUk: 'Деталі', contentsEn: 'Parts' },
    privateManufacturingNotes: 'must not be exported',
  } });
  assert.deepEqual(product.attributes, { purchaseInfo: {
    assembly: 'UNASSEMBLED', contentsUk: 'Деталі', contentsEn: 'Parts',
  } });
});
