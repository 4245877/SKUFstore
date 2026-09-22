/** Stage 2A: route availability is independent of editorial translation readiness.
 * The API has no translation contract. Never infer readiness from Latin titles.
 * Every public snapshot product has UK and EN UI routes; EN source-content pages
 * are accessible but not indexed until Stage 2B provides reviewed English content.
 */
export const PRODUCT_ROUTE_LOCALES = ['uk', 'en'] as const;
export const PRODUCT_INDEXABLE_LOCALES = ['uk'] as const;
export function isProductIndexable(locale: 'uk' | 'en') {
  return (PRODUCT_INDEXABLE_LOCALES as readonly string[]).includes(locale);
}
