import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getTranslator } from '../src/i18n/translate.ts';
import { variantDisplayName, presentDefaultSubtitle } from '../src/lib/variant-presentation.ts';
import { presentItemSubtitle } from '../src/i18n/presentation.ts';

for (const locale of ['uk', 'en'] as const) {
  const t = getTranslator(locale);
  test(`${locale}: technical variant names use real parameters without changing source data`, () => {
    const variant = { id: 'unchanged', name: 'Default', sizeLabel: '1/8', outfitLabel: 'Armor' };
    assert.equal(variantDisplayName(variant, t), '1/8 · Armor');
    assert.equal(variant.name, 'Default');
    assert.equal(variantDisplayName({ name: 'default' }, t), t('shop.standardVariant'));
    assert.equal(variantDisplayName({ name: 'Custom Default Armor', sizeLabel: '1/8' }, t), 'Custom Default Armor');
    assert.equal(presentDefaultSubtitle('Default · MONO · Ivory', t), `${t('shop.standardVariant')} · MONO · Ivory`);
    assert.equal(presentItemSubtitle(t, 'Default'), t('shop.standardVariant'));
  });
}
