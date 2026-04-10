'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import s from './FavoritesPage.module.css';
import {
  addAccountFavorite,
  getAccountFavorites,
  getCatalogProducts,
  removeAccountFavorite,
  resolveMediaUrl,
  type AccountFavoriteItem,
  type CatalogProductListItem,
} from '../../../lib/api';
import {
  addCartItem,
  addFavorite,
  clearFavorites,
  readFavorites,
  removeFavorite,
  subscribeToFavoritesChange,
  type FavoriteSnapshot,
} from '../../../lib/demo-store';

type StockStatus = 'in-stock' | 'out-of-stock' | 'pre-order';
type ViewMode = 'grid' | 'list';
type SortKey = 'added' | 'price-asc' | 'price-desc' | 'name';
type FilterKey = 'all' | 'in-stock' | 'pre-order';
type SourceMode = 'loading' | 'guest' | 'account';

type FavoriteItem = {
  productId: string;
  slug: string;
  name: string;
  series: string;
  price: number;
  currency: string;
  metaLabel: string | null;
  imageUrl: string | null;
  imageAlt: string | null;
  stockStatus: StockStatus;
  addedAt: string;
};

const STOCK_LABEL: Record<StockStatus, string> = {
  'in-stock': 'В наличии',
  'out-of-stock': 'Нет в наличии',
  'pre-order': 'Предзаказ',
};

const STOCK_CLASS: Record<StockStatus, string> = {
  'in-stock': s.cardStockIn,
  'out-of-stock': s.cardStockOut,
  'pre-order': s.cardStockPre,
};

function isAuthError(error: unknown) {
  const status = (error as { status?: number } | null)?.status;
  return status === 401 || status === 403;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatPrice(value: number, currency: string) {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

function getStockStatus(saleType?: string, stockQty = 0): StockStatus {
  if (saleType === 'PREORDER' || saleType === 'BACKORDER') {
    return 'pre-order';
  }

  return stockQty > 0 ? 'in-stock' : 'out-of-stock';
}

function getSeriesLabel(...values: Array<string | null | undefined>) {
  return values.find((value) => Boolean(value?.trim()))?.trim() ?? 'Каталог SKUFNYA';
}

function getMetaLabel(...values: Array<string | null | undefined>) {
  return values.find((value) => Boolean(value?.trim()))?.trim() ?? null;
}

function pluralizeFigures(count: number) {
  const mod10 = count % 10;
  const mod100 = count % 100;

  if (mod10 === 1 && mod100 !== 11) return 'фигурка';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'фигурки';
  return 'фигурок';
}

function mapAccountFavorite(item: AccountFavoriteItem): FavoriteItem {
  return {
    productId: item.productId,
    slug: item.slug,
    name: item.title,
    series: getSeriesLabel(
      item.series,
      item.franchise?.name as string | undefined,
      item.brand?.name as string | undefined,
      item.category?.name as string | undefined,
    ),
    price: item.priceFrom,
    currency: item.currency,
    metaLabel: getMetaLabel(
      item.defaultVariant?.sizeLabel,
      item.productType,
      item.category?.name as string | undefined,
    ),
    imageUrl: item.coverImage?.url ?? null,
    imageAlt: item.coverImage?.alt ?? item.title,
    stockStatus: getStockStatus(item.saleType, item.stockQty),
    addedAt: item.createdAt,
  };
}

function mapGuestFavorite(item: FavoriteSnapshot): FavoriteItem {
  return {
    productId: item.productId,
    slug: item.slug,
    name: item.title,
    series: getSeriesLabel(item.series),
    price: item.priceFrom,
    currency: item.currency,
    metaLabel: null,
    imageUrl: item.coverImage?.url ?? null,
    imageAlt: item.coverImage?.alt ?? item.title,
    stockStatus: getStockStatus(item.saleType, item.stockQty ?? 0),
    addedAt: item.addedAt,
  };
}

function buildGuestFavoriteSnapshot(product: CatalogProductListItem): Omit<FavoriteSnapshot, 'addedAt'> {
  return {
    productId: product.id,
    slug: product.slug,
    title: product.title,
    series: getSeriesLabel(
      product.series,
      product.franchise?.name as string | undefined,
      product.brand?.name as string | undefined,
      product.category?.name as string | undefined,
    ),
    priceFrom: product.priceFrom,
    currency: product.currency,
    saleType: product.saleType,
    stockQty: product.stockQty,
    isAdult: product.isAdult,
    coverImage: product.coverImage
      ? {
          url: product.coverImage.url,
          alt: product.coverImage.alt ?? product.title,
        }
      : null,
  };
}

function mapCatalogProductToFavorite(product: CatalogProductListItem): FavoriteItem {
  return {
    productId: product.id,
    slug: product.slug,
    name: product.title,
    series: getSeriesLabel(
      product.series,
      product.franchise?.name as string | undefined,
      product.brand?.name as string | undefined,
      product.category?.name as string | undefined,
    ),
    price: product.priceFrom,
    currency: product.currency,
    metaLabel: getMetaLabel(product.productType, product.category?.name as string | undefined),
    imageUrl: product.coverImage?.url ?? null,
    imageAlt: product.coverImage?.alt ?? product.title,
    stockStatus: getStockStatus(product.saleType, product.stockQty),
    addedAt: new Date().toISOString(),
  };
}

function GridCard({
  item,
  onRemove,
  onAddToCart,
}: {
  item: FavoriteItem;
  onRemove: (productId: string) => void;
  onAddToCart: (item: FavoriteItem) => void;
}) {
  return (
    <article className={s.card}>
      <div className={s.cardImageWrap}>
        <Link href={`/product/${item.slug}`} className={s.cardLink}>
          {item.imageUrl ? (
            <img
              src={resolveMediaUrl(item.imageUrl) || ''}
              alt={item.imageAlt || item.name}
              className={s.cardImage}
            />
          ) : (
            <div className={s.cardImagePlaceholder}>
              <span className={s.cardImageIcon}>🎀</span>
              <span className={s.cardImageLabel}>{item.metaLabel || 'Фигурка'}</span>
            </div>
          )}
        </Link>

        <button
          type="button"
          className={`${s.cardHeartBtn} ${s.isWished}`}
          onClick={() => onRemove(item.productId)}
          title="Убрать из избранного"
          aria-label="Убрать из избранного"
        >
          🩷
        </button>

        <div className={s.cardActions}>
          <button type="button" className={s.cardBtn} onClick={() => onAddToCart(item)}>
            В корзину
          </button>
        </div>
      </div>

      <div className={s.cardBody}>
        <p className={s.cardSeries}>{item.series}</p>
        <h3 className={s.cardName}>
          <Link href={`/product/${item.slug}`}>{item.name}</Link>
        </h3>

        <div className={s.cardMeta}>
          <span className={s.cardPrice}>{formatPrice(item.price, item.currency)}</span>
          <span className={s.cardScale}>{item.metaLabel || 'Фигурка'}</span>
        </div>

        <div className={s.cardFooter}>
          <span className={`${s.cardStock} ${STOCK_CLASS[item.stockStatus]}`}>
            <span className={s.cardStockDot} />
            {STOCK_LABEL[item.stockStatus]}
          </span>
          <span className={s.cardAddedDate}>{formatDate(item.addedAt)}</span>
        </div>
      </div>
    </article>
  );
}

function ListCard({
  item,
  onRemove,
  onAddToCart,
}: {
  item: FavoriteItem;
  onRemove: (productId: string) => void;
  onAddToCart: (item: FavoriteItem) => void;
}) {
  return (
    <article className={s.listCard}>
      <div className={s.listCardImage}>
        {item.imageUrl ? (
          <img
            src={resolveMediaUrl(item.imageUrl) || ''}
            alt={item.imageAlt || item.name}
            className={s.listCardImageFull}
          />
        ) : (
          <span className={s.listCardImagePlaceholderIcon}>🎀</span>
        )}
      </div>

      <div className={s.listCardBody}>
        <div className={s.listCardTop}>
          <p className={s.listCardSeries}>{item.series}</p>
          <h3 className={s.listCardName}>
            <Link href={`/product/${item.slug}`}>{item.name}</Link>
          </h3>
        </div>

        <div className={s.listCardBottom}>
          <span className={s.listCardPrice}>{formatPrice(item.price, item.currency)}</span>
          <div className={s.listCardMeta}>
            {item.metaLabel ? <span className={s.listCardScale}>{item.metaLabel}</span> : null}
            <span className={`${s.cardStock} ${STOCK_CLASS[item.stockStatus]}`}>
              <span className={s.cardStockDot} />
              {STOCK_LABEL[item.stockStatus]}
            </span>
          </div>
        </div>
      </div>

      <div className={s.listCardActions}>
        <button
          type="button"
          className={s.listCardActionBtn}
          onClick={() => onAddToCart(item)}
        >
          <span className={s.listCardActionIcon}>🛒</span>
          В корзину
        </button>

        <button
          type="button"
          className={`${s.listCardActionBtn} ${s.listCardActionBtnDanger}`}
          onClick={() => onRemove(item.productId)}
          title="Убрать из избранного"
          aria-label="Убрать из избранного"
        >
          <span className={s.listCardActionIcon}>🩷</span>
          Убрать
        </button>
      </div>
    </article>
  );
}

export default function FavoritesPage() {
  const [items, setItems] = useState<FavoriteItem[]>([]);
  const [view, setView] = useState<ViewMode>('grid');
  const [sort, setSort] = useState<SortKey>('added');
  const [filter, setFilter] = useState<FilterKey>('all');
  const [toast, setToast] = useState<string | null>(null);
  const [sourceMode, setSourceMode] = useState<SourceMode>('loading');
  const [isLoading, setIsLoading] = useState(true);
  const [suggestions, setSuggestions] = useState<CatalogProductListItem[]>([]);
  const [pendingSuggestionIds, setPendingSuggestionIds] = useState<Set<string>>(new Set());

  const showToast = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 3000);
  }, []);

  const loadFavorites = useCallback(async () => {
    try {
      const response = await getAccountFavorites();
      setItems(response.items.map(mapAccountFavorite));
      setSourceMode('account');
    } catch (error) {
      if (!isAuthError(error)) {
        console.error(error);
      }

      setItems(readFavorites().map(mapGuestFavorite));
      setSourceMode('guest');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadFavorites();
  }, [loadFavorites]);

  useEffect(() => {
    let active = true;

    void getCatalogProducts({ page: 1, limit: 8 })
      .then((response) => {
        if (!active) return;
        setSuggestions(response.items);
      })
      .catch((error) => {
        console.error(error);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (sourceMode !== 'guest') return;

    return subscribeToFavoritesChange(() => {
      setItems(readFavorites().map(mapGuestFavorite));
    });
  }, [sourceMode]);

  const sorted = useMemo(() => {
    const filtered = items.filter((item) => {
      if (filter === 'all') return true;
      return item.stockStatus === filter;
    });

    const arr = [...filtered];

    if (sort === 'added') arr.sort((a, b) => b.addedAt.localeCompare(a.addedAt));
    if (sort === 'price-asc') arr.sort((a, b) => a.price - b.price);
    if (sort === 'price-desc') arr.sort((a, b) => b.price - a.price);
    if (sort === 'name') arr.sort((a, b) => a.name.localeCompare(b.name, 'ru'));

    return arr;
  }, [items, filter, sort]);

  const totalPrice = items.reduce((acc, item) => acc + item.price, 0);
  const inStockCount = items.filter((item) => item.stockStatus === 'in-stock').length;
  const preOrderCount = items.filter((item) => item.stockStatus === 'pre-order').length;
  const favoriteIds = new Set(items.map((item) => item.productId));

  const visibleSuggestions = useMemo(() => {
    return suggestions
      .filter((item) => !favoriteIds.has(item.id))
      .slice(0, 4);
  }, [suggestions, favoriteIds]);

  function handleAddToCart(item: FavoriteItem) {
    addCartItem({
      id: item.productId,
      slug: item.slug,
      name: item.name,
      price: item.price,
      quantity: 1,
      subtitle: item.series,
    });

    showToast(`«${item.name}» добавлена в корзину`);
  }

  async function handleRemove(productId: string) {
    const current = [...items];
    const item = current.find((entry) => entry.productId === productId);
    if (!item) return;

    setItems((prev) => prev.filter((entry) => entry.productId !== productId));

    try {
      if (sourceMode === 'account') {
        await removeAccountFavorite(productId);
      } else {
        removeFavorite(productId);
      }

      showToast(`«${item.name}» удалена из избранного`);
    } catch (error) {
      console.error(error);
      setItems(current);
      showToast('Не удалось обновить избранное');
    }
  }

  async function handleClearAll() {
    const current = [...items];
    setItems([]);

    try {
      if (sourceMode === 'account') {
        await Promise.all(current.map((item) => removeAccountFavorite(item.productId)));
      } else {
        clearFavorites();
      }

      showToast('Список избранного очищен');
    } catch (error) {
      console.error(error);
      setItems(current);
      showToast('Не удалось очистить избранное');
    }
  }

  async function handleToggleSuggestion(product: CatalogProductListItem) {
    const alreadyFavorite = items.some((item) => item.productId === product.id);

    if (alreadyFavorite) {
      await handleRemove(product.id);
      return;
    }

    setPendingSuggestionIds((prev) => {
      const next = new Set(prev);
      next.add(product.id);
      return next;
    });

    try {
      if (sourceMode === 'account') {
        await addAccountFavorite(product.id);
        setItems((prev) => [mapCatalogProductToFavorite(product), ...prev]);
      } else {
        addFavorite(buildGuestFavoriteSnapshot(product));
        setItems(readFavorites().map(mapGuestFavorite));
      }

      showToast(`«${product.title}» добавлена в избранное`);
    } catch (error) {
      console.error(error);
      showToast('Не удалось добавить товар в избранное');
    } finally {
      setPendingSuggestionIds((prev) => {
        const next = new Set(prev);
        next.delete(product.id);
        return next;
      });
    }
  }

  return (
    <div className={s.page}>
      <header className={s.pageHeader}>
        <div className={s.headerInner}>
          <div className={s.headerLeft}>
            <nav className={s.breadcrumb} aria-label="Навигация">
              <Link href="/" className={s.breadcrumbLink}>Главная</Link>
              <span className={s.breadcrumbSep}>❯</span>
              <span className={s.breadcrumbCurrent}>Избранное</span>
            </nav>

            <p className={s.headerEyebrow}>избранное</p>
            <h1 className={s.headerTitle}>
              Моё <span className={s.headerTitleAccent}>избранное</span>
              <span className={s.headerTitleJp}>Коллекция любимых фигурок</span>
            </h1>
          </div>

          <div className={s.headerRight}>
            <div className={s.headerCount}>
              <span className={s.headerCountIcon}>🩷</span>
              <span className={s.headerCountText}>{items.length}</span>
              <span className={s.headerCountLabel}>{pluralizeFigures(items.length)}</span>
            </div>
          </div>
        </div>
      </header>

      {!isLoading && items.length > 0 && (
        <div className={s.toolbar} role="toolbar" aria-label="Управление избранным">
          <div className={s.toolbarInner}>
            <div className={s.toolbarLeft}>
              <button
                type="button"
                className={`${s.toolbarTab} ${filter === 'all' ? s.toolbarTabActive : ''}`}
                onClick={() => setFilter('all')}
              >
                Все
                <span className={s.toolbarTabCount}>{items.length}</span>
              </button>

              <button
                type="button"
                className={`${s.toolbarTab} ${filter === 'in-stock' ? s.toolbarTabActive : ''}`}
                onClick={() => setFilter('in-stock')}
              >
                В наличии
                <span className={s.toolbarTabCount}>{inStockCount}</span>
              </button>

              <button
                type="button"
                className={`${s.toolbarTab} ${filter === 'pre-order' ? s.toolbarTabActive : ''}`}
                onClick={() => setFilter('pre-order')}
              >
                Предзаказ
                <span className={s.toolbarTabCount}>{preOrderCount}</span>
              </button>
            </div>

            <div className={s.toolbarRight}>
              <select
                className={s.sortSelect}
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
                aria-label="Сортировка"
              >
                <option value="added">По дате добавления</option>
                <option value="price-asc">Цена: по возрастанию</option>
                <option value="price-desc">Цена: по убыванию</option>
                <option value="name">По названию</option>
              </select>

              <div className={s.toolbarSep} />

              <div className={s.viewToggle} role="group" aria-label="Вид отображения">
                <button
                  type="button"
                  className={`${s.viewBtn} ${view === 'grid' ? s.viewBtnActive : ''}`}
                  onClick={() => setView('grid')}
                  aria-pressed={view === 'grid'}
                  title="Сетка"
                >
                  ⊞
                </button>
                <button
                  type="button"
                  className={`${s.viewBtn} ${view === 'list' ? s.viewBtnActive : ''}`}
                  onClick={() => setView('list')}
                  aria-pressed={view === 'list'}
                  title="Список"
                >
                  ☰
                </button>
              </div>

              <div className={s.toolbarSep} />

              <button
                type="button"
                className={`${s.toolbarBtn} ${s.toolbarBtnDanger}`}
                onClick={handleClearAll}
              >
                🗑 Очистить всё
              </button>
            </div>
          </div>
        </div>
      )}

      <main className={s.main}>
        {isLoading ? (
          <div className={s.emptyState} role="status" aria-live="polite">
            <div className={s.emptyIllustration} aria-hidden="true">
              <div className={s.emptyCircle}>🩷</div>
              <div className={s.emptyDot} />
              <div className={s.emptyDot} />
            </div>
            <span className={s.emptyJp}>загрузка</span>
            <h2 className={s.emptyTitle}>Загружаем избранное…</h2>
          </div>
        ) : items.length === 0 ? (
          <div className={s.emptyState} role="status" aria-live="polite">
            <div className={s.emptyIllustration} aria-hidden="true">
              <div className={s.emptyCircle}>🎀</div>
              <div className={s.emptyDot} />
              <div className={s.emptyDot} />
            </div>
            <span className={s.emptyJp}>список пуст</span>
            <h2 className={s.emptyTitle}>
              Здесь пока <span className={s.emptyTitleAccent}>пусто</span>
            </h2>
            <p className={s.emptyText}>
              Добавляй понравившиеся фигурки в избранное,
              нажимая на сердечко на карточке товара.
            </p>
            <Link href="/catalog" className={s.emptyCta}>
              Перейти в каталог →
            </Link>
          </div>
        ) : view === 'grid' ? (
          <div className={s.grid} role="list" aria-label="Избранные фигурки">
            {sorted.map((item) => (
              <div key={item.productId} role="listitem">
                <GridCard
                  item={item}
                  onRemove={(productId) => void handleRemove(productId)}
                  onAddToCart={handleAddToCart}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className={s.gridList} role="list" aria-label="Избранные фигурки">
            {sorted.map((item) => (
              <div key={item.productId} role="listitem">
                <ListCard
                  item={item}
                  onRemove={(productId) => void handleRemove(productId)}
                  onAddToCart={handleAddToCart}
                />
              </div>
            ))}
          </div>
        )}
      </main>

      {visibleSuggestions.length > 0 && (
        <section className={s.suggestions} aria-label="Возможно, вам понравится">
          <div className={s.suggestionsInner}>
            <div className={s.suggestionsHead}>
              <div>
                <p className={s.suggestionsLabel}>рекомендуем</p>
                <h2 className={s.suggestionsTitle}>
                  Вам может <span className={s.suggestionsTitleAccent}>понравиться</span>
                </h2>
              </div>
              <Link href="/catalog" className={s.suggestionsLink}>
                Весь каталог →
              </Link>
            </div>

            <div className={s.suggestionsGrid}>
              {visibleSuggestions.map((item) => (
                <article key={item.id} className={s.suggestCard}>
                  <div className={s.suggestCardImageWrap}>
                    <Link href={`/product/${item.slug}`} className={s.cardLink}>
                      {item.coverImage?.url ? (
                        <img
                          src={resolveMediaUrl(item.coverImage.url) || ''}
                          alt={item.coverImage.alt || item.title}
                          className={s.cardImage}
                        />
                      ) : (
                        <div className={s.suggestCardImagePlaceholder}>🎀</div>
                      )}
                    </Link>
                  </div>

                  <div className={s.suggestCardBody}>
                    <p className={s.suggestCardSeries}>
                      {getSeriesLabel(
                        item.series,
                        item.franchise?.name as string | undefined,
                        item.brand?.name as string | undefined,
                        item.category?.name as string | undefined,
                      )}
                    </p>

                    <h3 className={s.suggestCardName}>
                      <Link href={`/product/${item.slug}`}>{item.title}</Link>
                    </h3>

                    <div className={s.suggestCardBottom}>
                      <span className={s.suggestCardPrice}>
                        {formatPrice(item.priceFrom, item.currency)}
                      </span>

                      <button
                        type="button"
                        className={s.suggestCardWishBtn}
                        onClick={() => void handleToggleSuggestion(item)}
                        disabled={pendingSuggestionIds.has(item.id)}
                        title="В избранное"
                        aria-label="В избранное"
                      >
                        {pendingSuggestionIds.has(item.id) ? '…' : '🤍'}
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {items.length > 0 && (
        <div
          className={`${s.summaryBar} ${s.summaryBarVisible}`}
          role="complementary"
          aria-label="Итог избранного"
        >
          <div className={s.summaryBarInner}>
            <div className={s.summaryInfo}>
              <div className={s.summaryItem}>
                <span className={s.summaryItemLabel}>Фигурок</span>
                <span className={s.summaryItemValue}>{items.length}</span>
              </div>

              <div className={s.summaryDivider} />

              <div className={s.summaryItem}>
                <span className={s.summaryItemLabel}>В наличии</span>
                <span className={s.summaryItemValue}>{inStockCount}</span>
              </div>

              <div className={s.summaryDivider} />

              <div className={s.summaryItem}>
                <span className={s.summaryItemLabel}>Общая стоимость</span>
                <span className={`${s.summaryItemValue} ${s.summaryItemValueAccent}`}>
                  {formatPrice(totalPrice, items[0]?.currency || 'UAH')}
                </span>
              </div>
            </div>

            <div className={s.summaryActions}>
              <Link href="/catalog" className={s.summaryBtnSecondary}>
                Продолжить выбор
              </Link>
              <button
                type="button"
                className={s.summaryBtnPrimary}
                onClick={() => {
                  items.forEach(handleAddToCart);
                }}
              >
                🛒 Добавить всё в корзину
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className={s.toast} role="alert" aria-live="assertive">
          <span className={s.toastIcon}>✓</span>
          {toast}
        </div>
      )}
    </div>
  );
}