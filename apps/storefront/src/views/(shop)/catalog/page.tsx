import { getTranslator, type Translator } from '../../../i18n/translate';
import type { PublishedLocale } from '../../../i18n/locales';
import { localizeHref } from '../../../i18n/paths';
import Link from '../../../i18n/navigation';

import { Suspense } from 'react';

import CatalogPageClient from './CatalogPageClient';

import styles from './Catalog.module.css';

export const dynamic = 'force-static';

function LaceDivider({ locale }: { locale: PublishedLocale }) {
  const t = getTranslator(locale);
  const path = (href: string) => localizeHref(locale, href);

  return (

    <svg

      viewBox="0 0 120 8"

      xmlns="http://www.w3.org/2000/svg"

      className={styles.laceDivider}

      aria-hidden

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

function CatalogFallback({ locale }: { locale: PublishedLocale }) {
  const t = getTranslator(locale);
  const path = (href: string) => localizeHref(locale, href);

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

              <LaceDivider locale={locale} />

            </div>

          </div>

        </div>

      </header>

      <div className={styles.main}>

        <div className={styles.content}>

          <div className={styles.grid}>

            <div className={styles.empty}>

              <span className={styles.emptyIcon}>…</span>

              <h2 className={styles.emptyTitle}>{t('shop.loadingCatalog')}</h2>

              <p className={styles.emptyText}>{t('shop.pleaseWaitAMoment')}</p>

            </div>

          </div>

        </div>

      </div>

    </div>

  );

}

export default function CatalogPage({ locale }: { locale: PublishedLocale }) {
  const t = getTranslator(locale);
  const path = (href: string) => localizeHref(locale, href);

  return (

    <Suspense fallback={<CatalogFallback locale={locale} />}>

      <CatalogPageClient />

    </Suspense>

  );

}