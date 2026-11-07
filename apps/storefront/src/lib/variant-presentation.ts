import type { Translator } from '../i18n/translate.ts';

/** A display label only; variant IDs and stored order snapshots stay intact. */
export function variantDisplayName(variant: {
  name?: string | null; sizeLabel?: string | null;
  outfitLabel?: string | null; faceLabel?: string | null;
}, t: Translator): string {
  const name = variant.name?.trim();
  if (name && name.toLowerCase() !== 'default') return name;
  return [variant.sizeLabel, variant.outfitLabel, variant.faceLabel]
    .filter(value => value?.trim()).join(' · ') || t('shop.standardVariant');
}

export function presentDefaultSubtitle(text: string, t: Translator): string {
  return text.split(' · ').map(part => part.trim().toLowerCase() === 'default'
    ? t('shop.standardVariant') : part).join(' · ');
}
