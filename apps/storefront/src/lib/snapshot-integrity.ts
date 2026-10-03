/**
 * Проверки целостности снимка каталога.
 *
 * Живут отдельно от `build-snapshot.ts`, где сеть и файловая система: решение
 * «можно ли собирать витрину из этого снимка» должно проверяться тестами без
 * поднятого API и без сборки.
 *
 * Порога допустимых потерь здесь намеренно нет. Магазин, из которого молча
 * пропал товар, — это 404 для покупателя и выпавшая из индекса страница;
 * несостоявшийся деплой безобиднее, потому что на GitHub Pages остаётся
 * предыдущая рабочая версия.
 */

import { getProductLocalizationVersion, productLocalizationIssues } from '../i18n/catalog-policy.ts';

export type SnapshotIssue = string;

/** Publication and translation revisions must remain stable throughout collection. */
export function assertCatalogPublicationStable(...collections: Array<Array<Record<string, any>>>): void {
  const signatures = collections.map(products => {
    const seen = new Set<string>();
    return JSON.stringify(products.map(product => {
      const issues = productLocalizationIssues(product);
      if (!product.id || !product.slug || seen.has(product.slug) || issues.length) {
        throw new Error(`Invalid catalog publication listing: ${product.slug ?? 'missing slug'} ${issues.join('; ')}`);
      }
      seen.add(product.slug);
      return [product.slug, product.id, getProductLocalizationVersion(product)];
    }).sort((a, b) => a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
  });
  if (signatures.some(signature => signature !== signatures[0])) {
    throw new Error('Catalog publication/localization changed during collection; retry the build');
  }
}

export function validateCatalogSnapshot(payload: unknown, expectedBuildId?: string): SnapshotIssue[] {
  const issues: SnapshotIssue[] = [];

  if (!payload || typeof payload !== 'object') {
    return ['snapshot is not an object'];
  }

  const snapshot = payload as { buildId?: unknown; count?: unknown; items?: unknown };

  if (expectedBuildId !== undefined && snapshot.buildId !== expectedBuildId) {
    issues.push('snapshot belongs to a different build');
  }

  if (!Array.isArray(snapshot.items)) {
    return ['snapshot.items is not an array'];
  }

  const items = snapshot.items as Array<Record<string, any>>;

  if (items.length === 0) {
    // Пустой каталог почти наверняка означает сломанный API, а не магазин без
    // товаров. Публиковать витрину без единого товара молча нельзя.
    issues.push('snapshot contains no products');
  }

  if (typeof snapshot.count === 'number' && snapshot.count !== items.length) {
    issues.push(`count ${snapshot.count} does not match items ${items.length}`);
  }

  const seen = new Set<string>();

  items.forEach((item, index) => {
    const slug = typeof item?.slug === 'string' ? item.slug.trim() : '';

    if (!slug) {
      issues.push(`item #${index} has no slug`);
      return;
    }

    if (seen.has(slug)) {
      issues.push(`duplicate slug ${slug}`);
    }

    seen.add(slug);

    if (item.status !== 'ACTIVE') issues.push(`${slug}: product is not ACTIVE`);
    if (!item.id) issues.push(`${slug}: missing id`);
    if (!item.title) issues.push(`${slug}: missing title`);
    if (!Array.isArray(item.images)) issues.push(`${slug}: images is not an array`);
    if (!Array.isArray(item.variants)) issues.push(`${slug}: variants is not an array`);
    // Older API responses have neither additive field. A partial/new envelope
    // must be coherent: do not silently export broken editorial readiness.
    issues.push(...productLocalizationIssues(item).map(issue => `${slug}: ${issue}`));
  });

  return issues;
}
