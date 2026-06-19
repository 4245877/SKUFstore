'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';

import {
  getCatalogCategories,
  getCatalogProducts,
  type CatalogCategoryTreeItem,
  type CatalogProductsResponse,
} from '../../../lib/api';

import CatalogPagination from './_components/CatalogPagination';
import { CatalogProductCard } from './_components/CatalogProductCard';
import { CatalogSidebar } from './_components/CatalogSidebar';
import { HiddenQueryInputs } from './_components/HiddenQueryInputs';

import {
  SORT_OPTIONS,
  buildCatalogHref,
  flattenCategoryTree,
  getSingleParam,
  normalizePriceRange,
  normalizeSort,
  parseIsAdult,
  parsePositiveInt,
  parsePrice,
  parseSaleType,
  resolvePageTitle,
  type SearchParamsMap,
} from './catalog.utils';

import styles from './Catalog.module.css';

const PAGE_SIZE = 24;
const priceFormatter = new Intl.NumberFormat('uk-UA');

function normalizeOptionalParam(value: string | string[] | undefined) {
  const normalized = getSingleParam(value)?.trim();
  return normalized || undefined;
}

function formatPriceRange(minPrice?: number, maxPrice?: number) {
  if (minPrice == null && maxPrice == null) {
    return 'будь-яка';
  }

  if (minPrice != null && maxPrice != null) {
    return `від ${priceFormatter.format(minPrice)} до ${priceFormatter.format(maxPrice)} грн`;
  }

  if (minPrice != null) {
    return `від ${priceFormatter.format(minPrice)} грн`;
  }

  return `до ${priceFormatter.format(maxPrice!)} грн`;
}

function formatAdultFilter(isAdult?: boolean) {
  if (isAdult === undefined) {
    return 'усі товари';
  }

  return isAdult ? 'тільки 18+' : 'без 18+';
}

function LaceDivider() {
  return (
    <svg
      viewBox="0 0 120 8"
      xmlns="http://www.w3.org/2000/svg"
      className={styles.laceDivider}
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M0 4 Q10 0 20 4 Q30 8 40 4 Q50 0 60 4 Q70 8 80 4 Q90 0 100 4 Q110 8 120 4"
        stroke="var(--rose)"
        strokeWidth="1"
        fill="none"
      />
    </svg>
  );
}

type CatalogStateMessageProps = {
  icon: string;
  title: string;
  text: string;
  href?: string;
  action?: string;
};

function CatalogStateMessage({
  icon,
  title,
  text,
  href,
  action,
}: CatalogStateMessageProps) {
  return (
    <div className={styles.grid}>
      <div className={styles.empty}>
        <span className={styles.emptyIcon} aria-hidden="true">
          {icon}
        </span>

        <h2 className={styles.emptyTitle}>{title}</h2>

        <p className={styles.emptyText}>{text}</p>

        {href && action ? (
          <Link href={href} className={styles.emptyBtn}>
            {action}
          </Link>
        ) : null}
      </div>
    </div>
  );
}

type LoadState =
  | {
      kind: 'loading';
      categories: CatalogCategoryTreeItem[];
      data: CatalogProductsResponse | null;
      selectedCategory?: CatalogCategoryTreeItem;
      flatCategories: CatalogCategoryTreeItem[];
      safePage: number;
    }
  | {
      kind: 'categories-error';
      categories: CatalogCategoryTreeItem[];
      data: CatalogProductsResponse | null;
      selectedCategory?: CatalogCategoryTreeItem;
      flatCategories: CatalogCategoryTreeItem[];
      safePage: number;
    }
  | {
      kind: 'invalid-category';
      categories: CatalogCategoryTreeItem[];
      data: CatalogProductsResponse | null;
      selectedCategory?: CatalogCategoryTreeItem;
      flatCategories: CatalogCategoryTreeItem[];
      safePage: number;
    }
  | {
      kind: 'products-error';
      categories: CatalogCategoryTreeItem[];
      data: CatalogProductsResponse | null;
      selectedCategory?: CatalogCategoryTreeItem;
      flatCategories: CatalogCategoryTreeItem[];
      safePage: number;
    }
  | {
      kind: 'ready';
      categories: CatalogCategoryTreeItem[];
      data: CatalogProductsResponse;
      selectedCategory?: CatalogCategoryTreeItem;
      flatCategories: CatalogCategoryTreeItem[];
      safePage: number;
    };

function buildSearchParamsMap(searchParams: URLSearchParams): SearchParamsMap {
  const result: Record<string, string | string[] | undefined> = {};

  for (const [key, value] of searchParams.entries()) {
    const existing = result[key];

    if (existing === undefined) {
      result[key] = value;
      continue;
    }

    if (Array.isArray(existing)) {
      result[key] = [...existing, value];
      continue;
    }

    result[key] = [existing, value];
  }

  return result as SearchParamsMap;
}

export default function CatalogPageClient() {
  const searchParams = useSearchParams();
  const searchParamsKey = searchParams.toString();

  const currentSearchParams = useMemo(
    () => buildSearchParamsMap(new URLSearchParams(searchParamsKey)),
    [searchParamsKey],
  );

  const currentQuery = normalizeOptionalParam(
    currentSearchParams.q ?? currentSearchParams.search,
  );

  const requestedCategorySlug = normalizeOptionalParam(currentSearchParams.categorySlug);

  const currentSaleType = parseSaleType(getSingleParam(currentSearchParams.saleType));
  const currentIsAdult = parseIsAdult(getSingleParam(currentSearchParams.isAdult));

  const parsedMinPrice = parsePrice(getSingleParam(currentSearchParams.minPrice));
  const parsedMaxPrice = parsePrice(getSingleParam(currentSearchParams.maxPrice));
  const { minPrice: currentMinPrice, maxPrice: currentMaxPrice } = normalizePriceRange(
    parsedMinPrice,
    parsedMaxPrice,
  );

  const requestedPage = parsePositiveInt(getSingleParam(currentSearchParams.page), 1);
  const currentSort = normalizeSort(getSingleParam(currentSearchParams.sort));

  const [state, setState] = useState<LoadState>({
    kind: 'loading',
    categories: [],
    data: null,
    selectedCategory: undefined,
    flatCategories: [],
    safePage: 1,
  });

  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // Закриваємо мобільний drawer фільтрів, коли змінюються параметри пошуку
  useEffect(() => {
    setMobileFiltersOpen(false);
  }, [searchParamsKey]);

  // Блокуємо прокручування фону, поки відкритий drawer фільтрів
  useEffect(() => {
    if (!mobileFiltersOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileFiltersOpen]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setState((prev) => ({
        ...prev,
        kind: 'loading',
      }));

      let categories: CatalogCategoryTreeItem[] = [];

      try {
        categories = (await getCatalogCategories()) ?? [];
      } catch {
        if (cancelled) return;

        setState({
          kind: 'categories-error',
          categories: [],
          data: null,
          selectedCategory: undefined,
          flatCategories: [],
          safePage: 1,
        });
        return;
      }

      const flatCategories = flattenCategoryTree(categories);
      const selectedCategory = requestedCategorySlug
        ? flatCategories.find((category) => category.slug === requestedCategorySlug)
        : undefined;

      if (requestedCategorySlug && !selectedCategory) {
        if (cancelled) return;

        setState({
          kind: 'invalid-category',
          categories,
          data: null,
          selectedCategory: undefined,
          flatCategories,
          safePage: 1,
        });
        return;
      }

      const currentCategorySlug = selectedCategory?.slug;

      const buildProductsParams = (page: number) => ({
        q: currentQuery,
        categorySlug: currentCategorySlug,
        saleType: currentSaleType,
        isAdult: currentIsAdult,
        minPrice: currentMinPrice,
        maxPrice: currentMaxPrice,
        sort: currentSort,
        page,
        limit: PAGE_SIZE,
      });

      try {
        let data = await getCatalogProducts(buildProductsParams(requestedPage));

        const pageCount = Math.max(1, data.meta.pageCount ?? 1);
        const clampedPage = Math.min(Math.max(requestedPage, 1), pageCount);

        if (clampedPage !== requestedPage) {
          data = await getCatalogProducts(buildProductsParams(clampedPage));
        }

        const safePage = Math.min(
          Math.max(data.meta.page ?? clampedPage, 1),
          Math.max(1, data.meta.pageCount ?? 1),
        );

        if (cancelled) return;

        setState({
          kind: 'ready',
          categories,
          data,
          selectedCategory,
          flatCategories,
          safePage,
        });
      } catch {
        if (cancelled) return;

        setState({
          kind: 'products-error',
          categories,
          data: null,
          selectedCategory,
          flatCategories,
          safePage: 1,
        });
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [
    currentIsAdult,
    currentMaxPrice,
    currentMinPrice,
    currentQuery,
    currentSaleType,
    currentSort,
    requestedCategorySlug,
    requestedPage,
  ]);

  const pageTitle =
    state.kind === 'categories-error'
      ? 'Каталог'
      : resolvePageTitle(state.selectedCategory?.slug, state.flatCategories);

  const currentCategorySlug = state.selectedCategory?.slug;

  const normalizedSearchParams: Record<string, string | string[] | undefined> = {
    ...currentSearchParams,
    sort: currentSort,
  };

  delete normalizedSearchParams.search;

  if (currentQuery) {
    normalizedSearchParams.q = currentQuery;
  } else {
    delete normalizedSearchParams.q;
  }

  if (currentCategorySlug) {
    normalizedSearchParams.categorySlug = currentCategorySlug;
  } else {
    delete normalizedSearchParams.categorySlug;
  }

  if (currentSaleType) {
    normalizedSearchParams.saleType = currentSaleType;
  } else {
    delete normalizedSearchParams.saleType;
  }

  if (currentIsAdult !== undefined) {
    normalizedSearchParams.isAdult = String(currentIsAdult);
  } else {
    delete normalizedSearchParams.isAdult;
  }

  if (currentMinPrice !== undefined) {
    normalizedSearchParams.minPrice = String(currentMinPrice);
  } else {
    delete normalizedSearchParams.minPrice;
  }

  if (currentMaxPrice !== undefined) {
    normalizedSearchParams.maxPrice = String(currentMaxPrice);
  } else {
    delete normalizedSearchParams.maxPrice;
  }

  if (state.safePage > 1) {
    normalizedSearchParams.page = String(state.safePage);
  } else {
    delete normalizedSearchParams.page;
  }

  if (state.kind === 'categories-error') {
    return (
      <div className={styles.page}>
        <header className={styles.pageHeader}>
          <div className={styles.pageHeaderInner}>
            <nav className={styles.breadcrumb} aria-label="Хлібні крихти">
              <Link href="/">Головна</Link>
              <span className={styles.breadcrumbSep}>›</span>
              <span className={styles.breadcrumbCurrent}>Каталог</span>
            </nav>

            <div className={styles.pageHeaderTop}>
              <div className={styles.pageTitleGroup}>
                <h1 className={styles.pageTitle}>Каталог</h1>
                <LaceDivider />
              </div>
            </div>
          </div>
        </header>

        <div className={styles.main}>
          <div className={styles.content}>
            <CatalogStateMessage
              icon="!"
              title="Не вдалося завантажити каталог"
              text="Сталася помилка під час завантаження категорій. Спробуй оновити сторінку трохи пізніше."
              href="/catalog"
              action="Оновити каталог →"
            />
          </div>
        </div>
      </div>
    );
  }

  if (state.kind === 'loading') {
    return (
      <div className={styles.page}>
        <header className={styles.pageHeader}>
          <div className={styles.pageHeaderInner}>
            <nav className={styles.breadcrumb} aria-label="Хлібні крихти">
              <Link href="/">Головна</Link>
              <span className={styles.breadcrumbSep}>›</span>
              <span className={styles.breadcrumbCurrent}>Каталог</span>
            </nav>

            <div className={styles.pageHeaderTop}>
              <div className={styles.pageTitleGroup}>
                <h1 className={styles.pageTitle}>{pageTitle}</h1>
                <LaceDivider />
              </div>
            </div>
          </div>
        </header>

        <div className={styles.main}>
          <CatalogSidebar
            categories={state.categories}
            searchParams={normalizedSearchParams as SearchParamsMap}
            currentQuery={currentQuery}
            currentCategorySlug={currentCategorySlug}
            currentSaleType={currentSaleType}
            currentIsAdult={currentIsAdult}
            currentMinPrice={currentMinPrice}
            currentMaxPrice={currentMaxPrice}
          />

          <div className={styles.content}>
            <CatalogStateMessage
              icon="…"
              title="Завантаження товарів…"
              text="Завантажуємо товари…"
            />
          </div>
        </div>
      </div>
    );
  }

  if (state.kind === 'invalid-category') {
    return (
      <div className={styles.page}>
        <header className={styles.pageHeader}>
          <div className={styles.pageHeaderInner}>
            <nav className={styles.breadcrumb} aria-label="Хлібні крихти">
              <Link href="/">Головна</Link>
              <span className={styles.breadcrumbSep}>›</span>
              <span className={styles.breadcrumbCurrent}>Каталог</span>
            </nav>

            <div className={styles.pageHeaderTop}>
              <div className={styles.pageTitleGroup}>
                <h1 className={styles.pageTitle}>Каталог</h1>
                <LaceDivider />
              </div>
            </div>
          </div>
        </header>

        <div className={styles.main}>
          <CatalogSidebar
            categories={state.categories}
            searchParams={normalizedSearchParams as SearchParamsMap}
            currentQuery={currentQuery}
            currentCategorySlug={undefined}
            currentSaleType={currentSaleType}
            currentIsAdult={currentIsAdult}
            currentMinPrice={currentMinPrice}
            currentMaxPrice={currentMaxPrice}
          />

          <div className={styles.content}>
            <CatalogStateMessage
              icon="?"
              title="Категорію не знайдено"
              text="Схоже, що обрана категорія більше не існує або має іншу адресу."
              href="/catalog"
              action="Повернутися до каталогу →"
            />
          </div>
        </div>
      </div>
    );
  }

  if (state.kind === 'products-error') {
    return (
      <div className={styles.page}>
        <header className={styles.pageHeader}>
          <div className={styles.pageHeaderInner}>
            <nav className={styles.breadcrumb} aria-label="Хлібні крихти">
              <Link href="/">Головна</Link>
              <span className={styles.breadcrumbSep}>›</span>
              <span className={styles.breadcrumbCurrent}>Каталог</span>
            </nav>

            <div className={styles.pageHeaderTop}>
              <div className={styles.pageTitleGroup}>
                <h1 className={styles.pageTitle}>{pageTitle}</h1>
                <LaceDivider />
              </div>
            </div>
          </div>
        </header>

        <div className={styles.main}>
          <CatalogSidebar
            categories={state.categories}
            searchParams={normalizedSearchParams as SearchParamsMap}
            currentQuery={currentQuery}
            currentCategorySlug={currentCategorySlug}
            currentSaleType={currentSaleType}
            currentIsAdult={currentIsAdult}
            currentMinPrice={currentMinPrice}
            currentMaxPrice={currentMaxPrice}
          />

          <div className={styles.content}>
            <CatalogStateMessage
              icon="!"
              title="Не вдалося завантажити товари"
              text="Сталася помилка під час запиту до каталогу. Спробуй оновити сторінку або змінити фільтри."
              href="/catalog"
              action="Скинути фільтри →"
            />
          </div>
        </div>
      </div>
    );
  }

  const data = state.data;
  const pageCount = Math.max(1, data.meta.pageCount ?? 1);
  const safePage = state.safePage;

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div className={styles.pageHeaderInner}>
          <nav className={styles.breadcrumb} aria-label="Хлібні крихти">
            <Link href="/">Головна</Link>
            <span className={styles.breadcrumbSep}>›</span>

            {state.selectedCategory ? (
              <>
                <Link href="/catalog">Каталог</Link>
                <span className={styles.breadcrumbSep}>›</span>
                <span className={styles.breadcrumbCurrent}>{state.selectedCategory.name}</span>
              </>
            ) : (
              <span className={styles.breadcrumbCurrent}>Каталог</span>
            )}
          </nav>

          <div className={styles.pageHeaderTop}>
            <div className={styles.pageTitleGroup}>
              <h1 className={styles.pageTitle}>{pageTitle}</h1>
              <LaceDivider />
            </div>

            <p className={styles.pageTotal}>
              Знайдено: <strong>{data.meta.total}</strong>
            </p>
          </div>
        </div>
      </header>

      <div className={styles.main}>
        <CatalogSidebar
          categories={state.categories}
          searchParams={normalizedSearchParams as SearchParamsMap}
          currentQuery={currentQuery}
          currentCategorySlug={currentCategorySlug}
          currentSaleType={currentSaleType}
          currentIsAdult={currentIsAdult}
          currentMinPrice={currentMinPrice}
          currentMaxPrice={currentMaxPrice}
        />

        <div className={styles.content}>
          <div className={styles.toolbar}>
            <div className={styles.toolbarLeft}>
              <button
                type="button"
                className={styles.filterToggle}
                onClick={() => setMobileFiltersOpen(true)}
                aria-haspopup="dialog"
                aria-expanded={mobileFiltersOpen}
                aria-controls="catalog-filters-drawer"
              >
                <span className={styles.filterToggleIcon} aria-hidden="true">
                  ⚙
                </span>
                Фільтри
              </button>

              <span className={styles.pageCountLabel}>
                Сторінка {safePage} з {pageCount}
              </span>
            </div>

            <div className={styles.toolbarRight}>
              <form method="get" className={styles.sortSelect}>
                <HiddenQueryInputs
                  searchParams={normalizedSearchParams as SearchParamsMap}
                  excludeKeys={['sort', 'page']}
                />

                <span className={styles.sortTextLabel}>Сортування:</span>

                <select
                  name="sort"
                  className={styles.sortDropdown}
                  value={currentSort}
                  aria-label="Сортувати за"
                  onChange={(event) => {
                    event.currentTarget.form?.requestSubmit();
                  }}
                >
                  {SORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>

                <noscript>
                  <button type="submit" className={styles.pageBtn}>
                    OK
                  </button>
                </noscript>
              </form>
            </div>
          </div>

          {data.items.length === 0 ? (
            <div className={styles.grid}>
              <div className={styles.empty}>
                <span className={styles.emptyIcon} aria-hidden="true">
                  0
                </span>

                <h2 className={styles.emptyTitle}>Нічого не знайдено</h2>

                <p className={styles.emptyText}>
                  За поточними параметрами товарів не знайдено. Спробуй змінити фільтри або скинути
                  пошук.
                </p>

                <p className={styles.emptyText}>
                  Пошук: <strong>{currentQuery ? `«${currentQuery}»` : 'не задано'}</strong>
                </p>

                <p className={styles.emptyText}>
                  Категорія: <strong>{state.selectedCategory?.name ?? 'усі категорії'}</strong>
                </p>

                <p className={styles.emptyText}>
                  18+: <strong>{formatAdultFilter(currentIsAdult)}</strong>
                </p>

                <p className={styles.emptyText}>
                  Ціна: <strong>{formatPriceRange(currentMinPrice, currentMaxPrice)}</strong>
                </p>

                <Link href="/catalog" className={styles.emptyBtn}>
                  Скинути фільтри →
                </Link>
              </div>
            </div>
          ) : (
            <>
              <div className={styles.grid}>
                {data.items.map((product) => (
                  <CatalogProductCard key={product.id} product={product} />
                ))}
              </div>

              <CatalogPagination
                total={data.meta.total}
                perPage={data.meta.limit ?? PAGE_SIZE}
                current={safePage}
                makeHref={(page) =>
                  buildCatalogHref(normalizedSearchParams as SearchParamsMap, {
                    page,
                  })
                }
              />
            </>
          )}
        </div>
      </div>

      <div
        className={`${styles.drawerOverlay} ${
          mobileFiltersOpen ? styles.drawerOverlayOpen : ''
        }`}
        onClick={() => setMobileFiltersOpen(false)}
        aria-hidden="true"
      />

      <aside
        id="catalog-filters-drawer"
        className={`${styles.drawer} ${mobileFiltersOpen ? styles.drawerOpen : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="Фільтри каталогу"
        aria-hidden={!mobileFiltersOpen}
      >
        <div className={styles.drawerHeader}>
          <span className={styles.drawerTitle}>Фільтри</span>
          <button
            type="button"
            className={styles.drawerClose}
            onClick={() => setMobileFiltersOpen(false)}
            aria-label="Закрити фільтри"
          >
            ✕
          </button>
        </div>

        <CatalogSidebar
          className={styles.drawerFilters}
          idPrefix="catalog-drawer"
          categories={state.categories}
          searchParams={normalizedSearchParams as SearchParamsMap}
          currentQuery={currentQuery}
          currentCategorySlug={currentCategorySlug}
          currentSaleType={currentSaleType}
          currentIsAdult={currentIsAdult}
          currentMinPrice={currentMinPrice}
          currentMaxPrice={currentMaxPrice}
        />
      </aside>
    </div>
  );
}