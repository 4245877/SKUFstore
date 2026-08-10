import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { validateCatalogSnapshot } from '../src/lib/snapshot-integrity.ts';

/**
 * Снимок каталога — единственный источник данных статического экспорта.
 * Эти проверки решают, можно ли вообще собирать из него витрину: пропущенный
 * здесь дефект превращается в потерянную страницу товара на боевом сайте.
 */

function product(overrides: Record<string, unknown> = {}) {
  return {
    id: 'p1',
    slug: 'figure-one',
    title: 'Фігурка',
    status: 'ACTIVE',
    images: [],
    variants: [],
    ...overrides,
  };
}

function snapshot(items: Array<Record<string, unknown>>, overrides: Record<string, unknown> = {}) {
  return { generatedAt: '2026-08-10T00:00:00.000Z', count: items.length, items, ...overrides };
}

describe('целостность снимка каталога', () => {
  it('пропускает корректный каталог', () => {
    const issues = validateCatalogSnapshot(
      snapshot([product(), product({ id: 'p2', slug: 'figure-two' })]),
    );

    assert.deepEqual(issues, []);
  });

  it('ловит дубликат slug — иначе одна страница молча перетёрла бы другую', () => {
    const issues = validateCatalogSnapshot(snapshot([product(), product({ id: 'p2' })]));

    assert.equal(issues.length, 1);
    assert.match(issues[0], /duplicate slug figure-one/);
  });

  it('ловит расхождение count и items', () => {
    const issues = validateCatalogSnapshot(snapshot([product()], { count: 5 }));

    assert.ok(issues.some((issue) => /count 5 does not match items 1/.test(issue)));
  });

  it('ловит товар без slug', () => {
    const issues = validateCatalogSnapshot(snapshot([product({ slug: '   ' })]));

    assert.ok(issues.some((issue) => /item #0 has no slug/.test(issue)));
  });

  it('ловит отсутствие обязательных полей страницы', () => {
    const issues = validateCatalogSnapshot(
      snapshot([product({ title: '', images: null, variants: undefined })]),
    );

    assert.ok(issues.some((issue) => /missing title/.test(issue)));
    assert.ok(issues.some((issue) => /images is not an array/.test(issue)));
    assert.ok(issues.some((issue) => /variants is not an array/.test(issue)));
  });

  it('пустой каталог считается сломанным API, а не магазином без товаров', () => {
    const issues = validateCatalogSnapshot(snapshot([]));

    assert.ok(issues.some((issue) => /no products/.test(issue)));
  });

  it('отвергает мусор вместо снимка', () => {
    assert.deepEqual(validateCatalogSnapshot(null), ['snapshot is not an object']);
    assert.deepEqual(validateCatalogSnapshot('nope'), ['snapshot is not an object']);
    assert.deepEqual(validateCatalogSnapshot({ items: 'nope' }), [
      'snapshot.items is not an array',
    ]);
  });
});
