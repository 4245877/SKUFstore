'use client';

import { useI18n } from '../../../../i18n/client';
import type { Translator } from '../../../../i18n/translate';
import Link from '../../../../i18n/navigation';

import styles from "./CatalogPagination.module.css";

type CatalogPaginationProps = {

  current: number;

  total: number;

  perPage: number;

  makeHref: (page: number) => string;

  className?: string;

};

type PageItem = number | "left-ellipsis" | "right-ellipsis";

export function getPages(current: number, pages: number): PageItem[] {

  const safePages = Math.max(1, pages);

  const safeCurrent = Math.min(Math.max(current, 1), safePages);

  if (safePages <= 7) {

    return Array.from({ length: safePages }, (_, index) => index + 1);

  }

  if (safeCurrent <= 4) {

    return [1, 2, 3, 4, 5, "right-ellipsis", safePages];

  }

  if (safeCurrent >= safePages - 3) {

    return [

      1,

      "left-ellipsis",

      safePages - 4,

      safePages - 3,

      safePages - 2,

      safePages - 1,

      safePages,

    ];

  }

  return [

    1,

    "left-ellipsis",

    safeCurrent - 1,

    safeCurrent,

    safeCurrent + 1,

    "right-ellipsis",

    safePages,

  ];

}

export default function CatalogPagination({

  current,

  total,

  perPage,

  makeHref,

  className,

}: CatalogPaginationProps) {
  const { locale, t, path } = useI18n();

  const safeTotal = Math.max(0, total);

  const safePerPage = Math.max(1, perPage);

  const pages = Math.ceil(safeTotal / safePerPage);

  if (pages <= 1) {

    return null;

  }

  const safeCurrent = Math.min(Math.max(current, 1), Math.max(1, pages));

  const pageItems = getPages(safeCurrent, pages);

  const rootClassName = [styles.pagination, className]

    .filter(Boolean)

    .join(" ");

  return (

    <nav className={rootClassName} aria-label={t('shop.catalogPagination')}>

      {safeCurrent > 1 ? (

        <Link

          href={makeHref(safeCurrent - 1)}

          className={styles.pageBtn}

          aria-label={t('shop.previousPage')}

          rel="prev"

        >

          ←

        </Link>

      ) : (

        <span

          className={`${styles.pageBtn} ${styles.pageBtnDisabled}`}

          aria-disabled="true"

          aria-label={t('shop.previousPage')}

        >

          ←

        </span>

      )}

      {pageItems.map((pageItem) => {

        if (typeof pageItem !== "number") {

          return (

            <span

              key={pageItem}

              className={styles.pageDots}

              aria-hidden="true"

            >

              …

            </span>

          );

        }

        return pageItem === safeCurrent ? (

          <span

            key={pageItem}

            className={`${styles.pageBtn} ${styles.pageBtnActive}`}

            aria-current="page"

          >

            {pageItem}

          </span>

        ) : (

          <Link

            key={pageItem}

            href={makeHref(pageItem)}

            className={styles.pageBtn}

            aria-label={t('shop.pageValue', { value1: pageItem })}

          >

            {pageItem}

          </Link>

        );

      })}

      {safeCurrent < pages ? (

        <Link

          href={makeHref(safeCurrent + 1)}

          className={styles.pageBtn}

          aria-label={t('shop.nextPage')}

          rel="next"

        >

          →

        </Link>

      ) : (

        <span

          className={`${styles.pageBtn} ${styles.pageBtnDisabled}`}

          aria-disabled="true"

          aria-label={t('shop.nextPage')}

        >

          →

        </span>

      )}

    </nav>

  );

}