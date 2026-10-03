'use client';

import { useI18n } from '../../../i18n/client';
import type { Translator } from '../../../i18n/translate';
import Link from '../../../i18n/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useRouter } from '../../../i18n/navigation';

import {
  getCatalogCategories,
  getCatalogProducts,
  type CatalogCategoryTreeItem,
  type CatalogProductsResponse,
} from '../../../lib/api';

import { IconFilter } from '../../../components/icons';
import CatalogPagination from './_components/CatalogPagination';
import { CatalogProductCard } from './_components/CatalogProductCard';
import { CatalogSidebar } from './_components/CatalogSidebar';
import { HiddenQueryInputs } from './_components/HiddenQueryInputs';

import {
  getSortOptions,
  buildCatalogHref,
  flattenCategoryTree,
  getSingleParam,
  normalizePriceRange,
  normalizeSort,
  parseIsAdult,
  parsePositiveInt,
  parsePrice,
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

function formatPriceRange(t: Translator, minPrice?: number, maxPrice?: number) {
  if (minPrice == null && maxPrice == null) {
    return t('shop.anyPrice');
  }

  if (minPrice != null && maxPrice != null) {
    return t('shop.uahValueValue', { value1: priceFormatter.format(minPrice), value2: priceFormatter.format(maxPrice) });
  }

  if (minPrice != null) {
    return t('shop.fromUahValue', { value1: priceFormatter.format(minPrice) });
  }

  return t('shop.upToUahValue', { value1: priceFormatter.format(maxPrice!) });
}

function formatAdultFilter(t: Translator, isAdult?: boolean) {
  if (isAdult === undefined) {
    return t('shop.allProducts');
  }

  return isAdult ? t('shop.18Only') : t('shop.exclude18');
}

function LaceDivider() {
  const { locale, t, path } = useI18n();

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
  const { locale, t, path } = useI18n();

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
  const { locale, t, path } = useI18n();

  const router = useRouter();
  const searchParams = useSearchParams();
  const [mounted, setMounted] = useState(false);
  // Pages serves one force-static document for every query. Hydrate its empty
  // query state first, then apply the real URL without changing the URL itself.
  // This also keeps the loading sidebar's hidden inputs identical on hydration.
  const searchParamsKey = mounted ? searchParams.toString() : '';

  useEffect(() => {
    setMounted(true);
  }, []);

  const currentSearchParams = useMemo(
    () => buildSearchParamsMap(new URLSearchParams(searchParamsKey)),
    [searchParamsKey],
  );

  const currentQuery = normalizeOptionalParam(
    currentSearchParams.q ?? currentSearchParams.search,
  );

  const requestedCategorySlug = normalizeOptionalParam(currentSearchParams.categorySlug);
  const currentBrandSlug = normalizeOptionalParam(currentSearchParams.brandSlug);
  const currentFranchiseSlug = normalizeOptionalParam(currentSearchParams.franchiseSlug);
  const currentCharacterSlug = normalizeOptionalParam(currentSearchParams.characterSlug);

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
  const [readySearchParamsKey, setReadySearchParamsKey] = useState<string | null>(null);

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
    // Do not request (or canonicalize) the empty prerender query before the
    // actual deep link is available.
    if (!mounted) return;

    let cancelled = false;

    async function load() {
      setReadySearchParamsKey(null);
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
        locale,
        q: currentQuery,
        categorySlug: currentCategorySlug,
        brandSlug: currentBrandSlug,
        franchiseSlug: currentFranchiseSlug,
        characterSlug: currentCharacterSlug,
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

        setReadySearchParamsKey(searchParamsKey);
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
    locale,
    mounted,
    currentBrandSlug,
    currentCharacterSlug,
    currentFranchiseSlug,
    currentIsAdult,
    currentMaxPrice,
    currentMinPrice,
    currentQuery,
    currentSort,
    requestedCategorySlug,
    requestedPage,
    searchParamsKey,
  ]);

  const pageTitle =
    state.kind === 'categories-error'
      ? t('account.catalog')
      : resolvePageTitle(state.selectedCategory?.slug, state.flatCategories, locale);

  const currentCategorySlug = state.selectedCategory?.slug;

  const normalizedSearchParams: Record<string, string | string[] | undefined> = {
    ...currentSearchParams,
  };

  delete normalizedSearchParams.search;
  delete normalizedSearchParams.saleType;

  if (currentQuery) {
    normalizedSearchParams.q = currentQuery;
  } else {
    delete normalizedSearchParams.q;
  }

  if (currentSort !== 'newest') {
    normalizedSearchParams.sort = currentSort;
  } else {
    delete normalizedSearchParams.sort;
  }

  if (currentCategorySlug) {
    normalizedSearchParams.categorySlug = currentCategorySlug;
  } else {
    delete normalizedSearchParams.categorySlug;
  }

  if (currentBrandSlug) {
    normalizedSearchParams.brandSlug = currentBrandSlug;
  } else {
    delete normalizedSearchParams.brandSlug;
  }

  if (currentFranchiseSlug) {
    normalizedSearchParams.franchiseSlug = currentFranchiseSlug;
  } else {
    delete normalizedSearchParams.franchiseSlug;
  }

  if (currentCharacterSlug) {
    normalizedSearchParams.characterSlug = currentCharacterSlug;
  } else {
    delete normalizedSearchParams.characterSlug;
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

  const canonicalCatalogHref = buildCatalogHref(
    normalizedSearchParams as SearchParamsMap,
    {},
  );

  useEffect(() => {
    if (state.kind !== 'ready' || readySearchParamsKey !== searchParamsKey) {
      return;
    }

    const currentHref = searchParamsKey ? `/catalog?${searchParamsKey}` : '/catalog';

    if (canonicalCatalogHref !== currentHref) {
      router.replace(canonicalCatalogHref, { scroll: false });
    }
  }, [
    canonicalCatalogHref,
    readySearchParamsKey,
    router,
    searchParamsKey,
    state.kind,
  ]);

  if (state.kind === 'categories-error') {
    return (
      <div className={styles.page}>
        <header className={styles.pageHeader}>
          <div className={styles.pageHeaderInner}>
            <nav className={styles.breadcrumb} aria-label={t('content.breadcrumbs')}>
              <Link href="/">{t('account.home')}</Link>
              <span className={styles.breadcrumbSep}>›</span>
              <span className={styles.breadcrumbCurrent}>{t('account.catalog')}</span>
            </nav>

            <div className={styles.pageHeaderTop}>
              <div className={styles.pageTitleGroup}>
                <h1 className={styles.pageTitle}>{t('account.catalog')}</h1>
                <LaceDivider />
              </div>
            </div>
          </div>
        </header>

        <div className={styles.main}>
          <div className={styles.content}>
            <CatalogStateMessage
              icon="!"
              title={t('shop.weCouldnTLoadTheCatalog')}
              text={t('shop.weCouldnTLoadTheCategoriesPlease')}
              href="/catalog"
              action={t('shop.reloadCatalog')}
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
            <nav className={styles.breadcrumb} aria-label={t('content.breadcrumbs')}>
              <Link href="/">{t('account.home')}</Link>
              <span className={styles.breadcrumbSep}>›</span>
              <span className={styles.breadcrumbCurrent}>{t('account.catalog')}</span>
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
            currentIsAdult={currentIsAdult}
            currentMinPrice={currentMinPrice}
            currentMaxPrice={currentMaxPrice}
          />

          <div className={styles.content}>
            <CatalogStateMessage
              icon="…"
              title={t('shop.loadingProducts')}
              text={t('shop.loadingProducts_784')}
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
            <nav className={styles.breadcrumb} aria-label={t('content.breadcrumbs')}>
              <Link href="/">{t('account.home')}</Link>
              <span className={styles.breadcrumbSep}>›</span>
              <span className={styles.breadcrumbCurrent}>{t('account.catalog')}</span>
            </nav>

            <div className={styles.pageHeaderTop}>
              <div className={styles.pageTitleGroup}>
                <h1 className={styles.pageTitle}>{t('account.catalog')}</h1>
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
            currentIsAdult={currentIsAdult}
            currentMinPrice={currentMinPrice}
            currentMaxPrice={currentMaxPrice}
          />

          <div className={styles.content}>
            <CatalogStateMessage
              icon="?"
              title={t('shop.categoryNotFound')}
              text={t('shop.thisCategoryMayNoLongerExistOr')}
              href="/catalog"
              action={t('shop.backToCatalog')}
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
            <nav className={styles.breadcrumb} aria-label={t('content.breadcrumbs')}>
              <Link href="/">{t('account.home')}</Link>
              <span className={styles.breadcrumbSep}>›</span>
              <span className={styles.breadcrumbCurrent}>{t('account.catalog')}</span>
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
            currentIsAdult={currentIsAdult}
            currentMinPrice={currentMinPrice}
            currentMaxPrice={currentMaxPrice}
          />

          <div className={styles.content}>
            <CatalogStateMessage
              icon="!"
              title={t('shop.weCouldnTLoadProducts')}
              text={t('shop.somethingWentWrongWhileLoadingTheCatalog')}
              href="/catalog"
              action={t('shop.resetFilters')}
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
          <nav className={styles.breadcrumb} aria-label={t('content.breadcrumbs')}>
            <Link href="/">{t('account.home')}</Link>
            <span className={styles.breadcrumbSep}>›</span>

            {state.selectedCategory ? (
              <>
                <Link href="/catalog">{t('account.catalog')}</Link>
                <span className={styles.breadcrumbSep}>›</span>
                <span className={styles.breadcrumbCurrent}>{state.selectedCategory.name}</span>
              </>
            ) : (
              <span className={styles.breadcrumbCurrent}>{t('account.catalog')}</span>
            )}
          </nav>

          <div className={styles.pageHeaderTop}>
            <div className={styles.pageTitleGroup}>
              <h1 className={styles.pageTitle}>{pageTitle}</h1>
              <LaceDivider />
            </div>

            <p className={styles.pageTotal}>
              {t('shop.found')} <strong>{data.meta.total}</strong>
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
                  <IconFilter size={15} />
                </span>
                {t('shop.filters')} </button>

              <span className={styles.pageCountLabel}>
                {t('shop.page')} {safePage} {t('shop.of')} {pageCount}
              </span>
            </div>

            <div className={styles.toolbarRight}>
              <form method="get" className={styles.sortSelect}>
                <HiddenQueryInputs
                  searchParams={normalizedSearchParams as SearchParamsMap}
                  excludeKeys={['sort', 'page']}
                />

                <span className={styles.sortTextLabel}>{t('shop.sort')}</span>

                <select
                  name="sort"
                  className={styles.sortDropdown}
                  value={currentSort}
                  aria-label={t('shop.sortBy')}
                  onChange={(event) => {
                    event.currentTarget.form?.requestSubmit();
                  }}
                >
                  {getSortOptions(locale).map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>

                <noscript>
                  <button type="submit" className={styles.pageBtn}>
                    {t('shop.apply')}
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

                <h2 className={styles.emptyTitle}>{t('shop.noResultsFound')}</h2>

                <p className={styles.emptyText}>
                  {t('shop.noProductsMatchYourSelectionTryDifferent')} </p>

                <p className={styles.emptyText}>
                  {t('shop.search')} <strong>{currentQuery ? `«${currentQuery}»` : t('shop.notSet')}</strong>
                </p>

                <p className={styles.emptyText}>
                  {t('shop.category')} <strong>{state.selectedCategory?.name ?? t('shop.allCategories')}</strong>
                </p>

                <p className={styles.emptyText}>
                  18+: <strong>{formatAdultFilter(t, currentIsAdult)}</strong>
                </p>

                <p className={styles.emptyText}>
                  {t('shop.price_814')} <strong>{formatPriceRange(t, currentMinPrice, currentMaxPrice)}</strong>
                </p>

                <Link href="/catalog" className={styles.emptyBtn}>
                  {t('shop.resetFilters')} </Link>
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
        aria-label={t('shop.catalogFilters')}
        aria-hidden={!mobileFiltersOpen}
      >
        <div className={styles.drawerHeader}>
          <span className={styles.drawerTitle}>{t('shop.filters')}</span>
          <button
            type="button"
            className={styles.drawerClose}
            onClick={() => setMobileFiltersOpen(false)}
            aria-label={t('shop.closeFilters')}
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
          currentIsAdult={currentIsAdult}
          currentMinPrice={currentMinPrice}
          currentMaxPrice={currentMaxPrice}
        />
      </aside>
    </div>
  );
}
