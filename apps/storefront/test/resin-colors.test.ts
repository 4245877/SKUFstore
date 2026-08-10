import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  FALLBACK_RESIN_COLORS,
  OUT_OF_STOCK_LABEL,
  colorLabelWithStock,
  isLightSwatch,
  pickDefaultColorSlug,
  reconcileSelectedColorSlug,
  resolveSelectedColor,
} from '../src/lib/resin-colors.ts';

type ResinColor = (typeof FALLBACK_RESIN_COLORS)[number];

function color(overrides: Partial<ResinColor> & { slug: string }): ResinColor {
  return {
    id: overrides.slug,
    name: overrides.slug,
    hexColor: '#FFFFFF',
    priceDelta: 0,
    isInStock: true,
    sortOrder: 0,
    ...overrides,
  };
}

describe('выбор цвета смолы по умолчанию', () => {
  it('пропускает отсутствующий цвет ради того, что есть на складе', () => {
    const colors = [
      color({ slug: 'ivory', isInStock: false }),
      color({ slug: 'graphite', isInStock: true }),
    ];

    assert.equal(pickDefaultColorSlug(colors), 'graphite');
  });

  it('когда весь склад под заказ, берёт первый активный цвет', () => {
    const colors = [
      color({ slug: 'ivory', isInStock: false }),
      color({ slug: 'graphite', isInStock: false }),
    ];

    assert.equal(pickDefaultColorSlug(colors), 'ivory');
  });

  it('на пустом списке не выдумывает выбор', () => {
    assert.equal(pickDefaultColorSlug([]), '');
    assert.equal(resolveSelectedColor([], ''), null);
  });

  it('запасной набор всегда даёт рабочий выбор', () => {
    const slug = pickDefaultColorSlug(FALLBACK_RESIN_COLORS);

    assert.notEqual(slug, '');
    assert.equal(resolveSelectedColor(FALLBACK_RESIN_COLORS, slug)?.slug, slug);
  });
});

describe('обновление склада в браузере', () => {
  it('сохраняет выбор покупателя, если цвет остался в каталоге', () => {
    const colors = [
      color({ slug: 'ivory' }),
      color({ slug: 'pearl', isInStock: false }),
    ];

    assert.equal(
      reconcileSelectedColorSlug(colors, 'pearl', { userPicked: true }),
      'pearl',
    );
  });

  it('переводит выбор на доступный цвет, если прежний скрыли в админке', () => {
    // isActive = false в админке — цвет просто исчезает из публичной выдачи.
    const colors = [
      color({ slug: 'ivory', isInStock: false }),
      color({ slug: 'graphite' }),
    ];

    assert.equal(
      reconcileSelectedColorSlug(colors, 'pearl', { userPicked: true }),
      'graphite',
    );
  });

  it('пересчитывает нетронутый выбор со сборки по свежему складу', () => {
    // Страница собрана, когда весь склад был на месте, и подставила ivory.
    // После переключения в админке выбранным должен стать цвет в наличии.
    const colors = [
      color({ slug: 'ivory', isInStock: false }),
      color({ slug: 'graphite', isInStock: true }),
    ];

    assert.equal(
      reconcileSelectedColorSlug(colors, 'ivory', { userPicked: false }),
      'graphite',
    );
  });

  it('на опустевшем каталоге сбрасывает выбор', () => {
    for (const userPicked of [true, false]) {
      assert.equal(reconcileSelectedColorSlug([], 'ivory', { userPicked }), '');
    }
  });
});

describe('цена и подпись выбранного цвета', () => {
  it('на неизвестном slug отдаёт тот же цвет, что и выбор по умолчанию', () => {
    // Иначе покупатель увидел бы цену одного цвета, а пометку — другого.
    const colors = [
      color({ slug: 'ivory', isInStock: false, priceDelta: 0 }),
      color({ slug: 'graphite', isInStock: true, priceDelta: 100 }),
    ];

    const selected = resolveSelectedColor(colors, 'unknown-slug');

    assert.equal(selected?.slug, pickDefaultColorSlug(colors));
    assert.equal(selected?.priceDelta, 100);
  });

  it('помечает отсутствующий цвет как «Під замовлення»', () => {
    assert.equal(
      colorLabelWithStock(color({ slug: 'pearl', name: 'Перламутровий', isInStock: false })),
      `Перламутровий (${OUT_OF_STOCK_LABEL.toLowerCase()})`,
    );
  });

  it('цвет в наличии показывает без пометки', () => {
    assert.equal(
      colorLabelWithStock(color({ slug: 'ivory', name: 'Айворі', isInStock: true })),
      'Айворі',
    );
  });
});

describe('рамка светлого свотча', () => {
  it('понимает и трёхзначный, и шестизначный hex', () => {
    assert.equal(isLightSwatch('#FFF'), true);
    assert.equal(isLightSwatch('#F4EBDD'), true);
    assert.equal(isLightSwatch('#171717'), false);
  });

  it('не падает на мусорном значении', () => {
    assert.equal(isLightSwatch(''), false);
    assert.equal(isLightSwatch('не цвет'), false);
  });
});
