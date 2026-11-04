export type ProductSelection = { variantId: string; finish: 'MONO' | 'PAINTED'; colorSlug: string };

/** Stored configuration is only a preference; validate it against this build. */
export function restoreProductSelection(raw: string | null, variants: { id: string; isActive: boolean }[],
  colors: { slug: string }[]): ProductSelection | null {
  try {
    const value = JSON.parse(raw ?? 'null');
    if (!value || !variants.some(v => v.id === value.variantId && v.isActive !== false) ||
      value.finish !== 'MONO' || !colors.some(c => c.slug === value.colorSlug)) return null;
    return { variantId: value.variantId, finish: value.finish, colorSlug: value.colorSlug };
  } catch { return null; }
}
