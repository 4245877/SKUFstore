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
  if (source.purchaseInfo && typeof source.purchaseInfo === 'object' && !Array.isArray(source.purchaseInfo)) {
    const info = source.purchaseInfo as Record<string, unknown>;
    const purchaseInfo: Record<string, string> = {};
    if (typeof info.assembly === 'string' && ['UNASSEMBLED', 'ASSEMBLED', 'BY_AGREEMENT'].includes(info.assembly)) {
      purchaseInfo.assembly = info.assembly;
    }
    for (const key of ['contentsUk', 'contentsEn']) {
      if (typeof info[key] === 'string' && info[key].trim() && info[key].trim().length <= 600) {
        purchaseInfo[key] = info[key].trim();
      }
    }
    if (Object.keys(purchaseInfo).length) result.purchaseInfo = purchaseInfo;
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
