'use client';

import { useI18n } from '../../../../i18n/client';
import type { Translator } from '../../../../i18n/translate';
import type { CSSProperties } from 'react';

import Link from '../../../../i18n/navigation';

import type { CatalogCategoryTreeItem } from '../../../../lib/api';

import { HiddenQueryInputs } from './HiddenQueryInputs';

import { buildCatalogHref, type SearchParamsMap } from '../catalog.utils';

import styles from '../Catalog.module.css';

const CATEGORY_DEPTH_MAX = 6;

const AGE_FILTER_OPTIONS = (t: Translator): Array<{

  label: string;

  value: boolean | null;

}> => ([

  { label: t('shop.all'), value: null },

  { label: t('shop.18Only_830'), value: true },

  { label: t('shop.exclude18_831'), value: false },

]);

function getCategoryDepthStyle(depth: number): CSSProperties {

  return {

    ['--category-depth' as string]: String(Math.min(depth, CATEGORY_DEPTH_MAX)),

  } as CSSProperties;

}

function CategoryLinks({

  items,

  currentCategorySlug,

  searchParams,

  depth = 0,

}: {

  items: CatalogCategoryTreeItem[];

  currentCategorySlug?: string;

  searchParams: SearchParamsMap;

  depth?: number;

}) {
  const { locale, t, path } = useI18n();

  return (

    <ul className={styles.listReset}>

      {items.map((item) => {

        const isActive = item.slug === currentCategorySlug;

        const children = item.children ?? [];

        const href = buildCatalogHref(searchParams, {

          categorySlug: item.slug,

          page: 1,

        });

        return (

          <li key={item.id}>

            <Link

              href={href}

              aria-current={isActive ? 'page' : undefined}

              className={`${styles.filterRow} ${styles.filterRowCategory} ${

                isActive ? styles.filterRowActive : ''

              }`}

              style={getCategoryDepthStyle(depth)}

            >

              <span className={styles.filterCheck} aria-hidden="true">

                {isActive ? '•' : ''}

              </span>

              <span className={styles.filterLabel}>{item.name}</span>

            </Link>

            {children.length > 0 ? (

              <CategoryLinks

                items={children}

                currentCategorySlug={currentCategorySlug}

                searchParams={searchParams}

                depth={depth + 1}

              />

            ) : null}

          </li>

        );

      })}

    </ul>

  );

}

export function CatalogSidebar({

  categories,

  searchParams,

  currentQuery,

  currentCategorySlug,

  currentIsAdult,

  currentMinPrice,

  currentMaxPrice,

  className,

  idPrefix = 'catalog',

}: {

  categories: CatalogCategoryTreeItem[];

  searchParams: SearchParamsMap;

  currentQuery?: string;

  currentCategorySlug?: string;

  currentIsAdult?: boolean;

  currentMinPrice?: number;

  currentMaxPrice?: number;

  className?: string;

  idPrefix?: string;

}) {
  const { locale, t, path } = useI18n();

  const searchActionsClassName = [styles.priceRange, styles.searchActions]

    .filter(Boolean)

    .join(' ');

  const searchInputClassName = [styles.priceInput, styles.searchInput]

    .filter(Boolean)

    .join(' ');

  const allCategoriesHref = buildCatalogHref(searchParams, {

    categorySlug: null,

    page: 1,

  });

  const isAllAdultContentActive = currentIsAdult == null;

  return (

    <aside className={className ?? styles.sidebar}>

      <div className={styles.sidebarBlock}>

        <div className={styles.sidebarBlockHeader}>

          <span className={styles.sidebarBlockTitle}>{t('shop.search_832')}</span>

        </div>

        <form method="get" role="search" className={styles.sidebarBlockBody}>

          <HiddenQueryInputs

            searchParams={searchParams}

            excludeKeys={['q', 'page']}

          />

          <label htmlFor={`${idPrefix}-search`} className={styles.priceInputLabel}>

            {t('shop.searchByName')} </label>

          <div className={searchActionsClassName}>

            <input

              id={`${idPrefix}-search`}

              type="search"

              name="q"

              className={searchInputClassName}

              placeholder={t('shop.productName')}

              defaultValue={currentQuery ?? ''}

            />

            <button type="submit" className={styles.priceApply}>

              {t('shop.search_835')} </button>

          </div>

        </form>

      </div>

      <div className={styles.sidebarBlock}>

        <div className={styles.sidebarBlockHeader}>

          <span className={styles.sidebarBlockTitle}>{t('shop.priceUah')}</span>

        </div>

        <form method="get" className={styles.sidebarBlockBody}>

          <HiddenQueryInputs

            searchParams={searchParams}

            excludeKeys={['minPrice', 'maxPrice', 'page']}

          />

          <div className={styles.priceRange}>

            <div className={styles.priceInputRow}>

              <div>

                <label

                  htmlFor={`${idPrefix}-min-price`}

                  className={styles.priceInputLabel}

                >

                  {t('shop.min')} </label>

                <input

                  id={`${idPrefix}-min-price`}

                  type="number"

                  name="minPrice"

                  className={styles.priceInput}

                  placeholder="0"

                  min={0}

                  step={1}

                  inputMode="numeric"

                  defaultValue={currentMinPrice ?? ''}

                />

              </div>

              <div>

                <label

                  htmlFor={`${idPrefix}-max-price`}

                  className={styles.priceInputLabel}

                >

                  {t('shop.max')} </label>

                <input

                  id={`${idPrefix}-max-price`}

                  type="number"

                  name="maxPrice"

                  className={styles.priceInput}

                  placeholder="50000"

                  min={0}

                  step={1}

                  inputMode="numeric"

                  defaultValue={currentMaxPrice ?? ''}

                />

              </div>

            </div>

            <button type="submit" className={styles.priceApply}>

              {t('shop.apply')} </button>

          </div>

        </form>

      </div>

      {categories.length > 0 ? (

        <div className={styles.sidebarBlock}>

          <div className={styles.sidebarBlockHeader}>

            <span className={styles.sidebarBlockTitle}>{t('shop.categories')}</span>

          </div>

          <div className={styles.sidebarBlockBody}>

            <ul className={styles.listReset}>

              <li>

                <Link

                  href={allCategoriesHref}

                  aria-current={!currentCategorySlug ? 'page' : undefined}

                  className={`${styles.filterRow} ${styles.filterRowCategory} ${

                    !currentCategorySlug ? styles.filterRowActive : ''

                  }`}

                  style={getCategoryDepthStyle(0)}

                >

                  <span className={styles.filterCheck} aria-hidden="true">

                    {!currentCategorySlug ? '•' : ''}

                  </span>

                  <span className={styles.filterLabel}>{t('shop.allCategories_841')}</span>

                </Link>

              </li>

            </ul>

            <CategoryLinks

              items={categories}

              currentCategorySlug={currentCategorySlug}

              searchParams={searchParams}

            />

          </div>

        </div>

      ) : null}

      <div className={styles.sidebarBlock}>

        <div className={styles.sidebarBlockHeader}>

          <span className={styles.sidebarBlockTitle}>{t('shop.18Content')}</span>

        </div>

        <div className={styles.sidebarBlockBody}>

          {AGE_FILTER_OPTIONS(t).map((item) => {

            const isActive =

              item.value === null

                ? isAllAdultContentActive

                : currentIsAdult === item.value;

            const href = buildCatalogHref(searchParams, {

              isAdult: item.value,

              page: 1,

            });

            return (

              <Link

                key={item.label}

                href={href}

                className={`${styles.filterRow} ${

                  isActive ? styles.filterRowActive : ''

                }`}

              >

                <span className={styles.filterCheck} aria-hidden="true">

                  {isActive ? '•' : ''}

                </span>

                <span className={styles.filterLabel}>{item.label}</span>

              </Link>

            );

          })}

        </div>

      </div>

      <div className={styles.filtersReset}>

        <Link href="/catalog" className={styles.filtersResetLink}>

          {t('shop.resetFilters_843')} </Link>

      </div>

    </aside>

  );

}

