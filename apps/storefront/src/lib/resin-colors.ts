import type { CatalogResinColor } from './api';

/**
 * Правила выбора цвета смолы вынесены из карточки товара: карточка — клиентский
 * компонент с JSX, и в тестах его не поднять, а именно эта логика решает, что
 * увидит покупатель, когда склад пуст или API недоступен.
 */

export const OUT_OF_STOCK_LABEL = 'Під замовлення';

// Запасной набор на случай недоступного склада: повторяет то, что миграция
// завела в админке, поэтому витрина никогда не остаётся без выбора.
// Заменяется данными API, как только браузер получит ответ.
export const FALLBACK_RESIN_COLORS: CatalogResinColor[] = [
  {
    id: 'ivory',
    name: 'Айворі',
    slug: 'ivory',
    hexColor: '#F4EBDD',
    priceDelta: 0,
    isInStock: true,
    sortOrder: 0,
  },
  {
    id: 'graphite',
    name: 'Графіт',
    slug: 'graphite',
    hexColor: '#55585F',
    priceDelta: 100,
    isInStock: true,
    sortOrder: 1,
  },
  {
    id: 'black',
    name: 'Чорний',
    slug: 'black',
    hexColor: '#171717',
    priceDelta: 100,
    isInStock: true,
    sortOrder: 2,
  },
  {
    id: 'pearl',
    name: 'Перламутровий',
    slug: 'pearl',
    hexColor: '#E8E4EF',
    priceDelta: 200,
    isInStock: true,
    sortOrder: 3,
  },
];

/**
 * Первым предлагаем то, что реально есть на складе: цвет «Під замовлення»
 * тоже можно заказать, но по умолчанию покупателю показываем самый быстрый
 * вариант. Если склад пуст целиком — берём первый активный цвет.
 */
export function pickDefaultColorSlug(colors: CatalogResinColor[]) {
  const preferred = colors.find((color) => color.isInStock) ?? colors[0] ?? null;
  return preferred?.slug ?? '';
}

/** A stock refresh must never silently select a differently priced configuration. */
export function reconcileSelectedColorSlug(
  _colors: CatalogResinColor[], currentSlug: string, _options: { userPicked: boolean },
) {
  return currentSlug;
}

/** Keep build-time commercial data; refresh availability and remove hidden colors only. */
export function refreshColorStock(snapshot: CatalogResinColor[], live: CatalogResinColor[]): CatalogResinColor[] {
  return snapshot.flatMap(color => {
    const current = live.find(item => item.slug === color.slug);
    return current ? [{ ...color, isInStock: current.isInStock }] : [];
  });
}

/**
 * Неизвестный выбранный slug нельзя подменять цветом по умолчанию.
 * null заставляет карточку запросить новый выбор перед добавлением в корзину.
 */
export function resolveSelectedColor(
  colors: CatalogResinColor[],
  slug: string,
): CatalogResinColor | null {
  if (slug) return colors.find((color) => color.slug === slug) ?? null;
  return colors.find((color) => color.slug === pickDefaultColorSlug(colors)) ?? null;
}

export function colorLabelWithStock(color: CatalogResinColor, outOfStockLabel = OUT_OF_STOCK_LABEL.toLowerCase()) {
  return color.isInStock
    ? color.name
    : `${color.name} (${outOfStockLabel})`;
}

// Светлая смола на светлой карточке сливается с фоном — ей нужна рамка.
export function isLightSwatch(hexColor: string) {
  const normalized = hexColor.replace('#', '');
  const full =
    normalized.length === 3
      ? normalized
          .split('')
          .map((char) => char + char)
          .join('')
      : normalized;

  if (full.length !== 6) return false;

  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);

  if (![r, g, b].every(Number.isFinite)) return false;

  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.75;
}
