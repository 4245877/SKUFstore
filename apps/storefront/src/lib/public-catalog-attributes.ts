// Keep the public projection compatible with both the old and new catalog API.
// Arbitrary administrative JSON must not be embedded into static pages.
export function publicCatalogAttributes(input: unknown): Record<string, unknown> | null {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
  const source = input as Record<string, unknown>;
  const result: Record<string, unknown> = {};
  for (const key of ['line', 'scale', 'boxIncluded']) {
    const value = source[key];
    if (['string', 'number', 'boolean'].includes(typeof value)) result[key] = value;
  }
  if (source.merchant && typeof source.merchant === 'object' && !Array.isArray(source.merchant)) {
    const merchant: Record<string, unknown> = {};
    for (const key of ['enabled', 'content', 'defaultColorSlug', 'imageVariantId', 'imageStorageKey',
      'additionalImageStorageKeys', 'identifierPolicy', 'manufacturerBrand', 'mpn', 'gtin',
      'googleProductCategory', 'availabilityDate']) {
      const value = (source.merchant as Record<string, unknown>)[key];
      if (typeof value === 'string' || typeof value === 'boolean' ||
          (key === 'additionalImageStorageKeys' && Array.isArray(value) && value.every(item => typeof item === 'string'))) merchant[key] = value;
    }
    result.merchant = merchant;
  }
  return Object.keys(result).length ? result : null;
}
