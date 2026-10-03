'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { LOCALE_PRESENTATION, PUBLISHED_LOCALES } from '../../i18n/locales';
import { localeSwitcherDestination } from '../../i18n/paths';
import { useI18n } from '../../i18n/client';
import styles from './LocaleSwitcher.module.css';

type SwitcherProps = {
  /** A missing route has no equivalent; link to a published home in both render phases. */
  isNotFound?: boolean;
  /** compact — сегменти «UK | EN» у шапці; full — повні назви в мобільному меню. */
  variant?: 'compact' | 'full';
  className?: string;
  /** Lets a closed drawer take its copy out of the tab order. */
  tabIndex?: number;
};

/**
 * The exported HTML carries the bare path; after hydration the live query keeps
 * the target href exact, including query-only navigations such as catalog
 * paging, which never fire popstate.
 */
export default function LocaleSwitcher(props: SwitcherProps) {
  return (
    <Suspense fallback={<Switcher {...props} search="" />}>
      <LiveSwitcher {...props} />
    </Suspense>
  );
}

function LiveSwitcher(props: SwitcherProps) {
  const searchParams = useSearchParams();
  // force-static routes (the catalog) prerender this with an empty query and
  // hydration keeps a mismatched href, so match the HTML first, then apply the URL.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const query = mounted ? searchParams?.toString() ?? '' : '';
  return <Switcher {...props} search={query ? `?${query}` : ''} />;
}

function Switcher({ variant = 'compact', className, tabIndex, search, isNotFound = false }: SwitcherProps & { search: string }) {
  const { locale, t } = useI18n();
  const pathname = usePathname() || '/';
  const [hash, setHash] = useState('');
  useEffect(() => {
    const update = () => setHash(window.location.hash);
    update();
    window.addEventListener('hashchange', update);
    return () => window.removeEventListener('hashchange', update);
  }, [pathname, search]);

  return (
    <nav
      aria-label={t('header.language')}
      className={[styles.switcher, variant === 'full' ? styles.full : '', className].filter(Boolean).join(' ')}
    >
      {PUBLISHED_LOCALES.map((target) => {
        const { shortLabel, nativeName } = LOCALE_PRESENTATION[target];
        // Include the exact visible abbreviation in the accessible name (WCAG 2.5.3).
        const label = variant === 'full'
          ? nativeName
          : <><span aria-hidden="true">{shortLabel}</span><span className="sr-only">{shortLabel} — {nativeName}</span></>;

        // The current language is a state, not a destination: no reload-to-self link.
        if (target === locale) {
          return (
            <span key={target} lang={target} className={`${styles.option} ${styles.current}`} aria-current="true">
              {label}
            </span>
          );
        }

        return (
          <a
            key={target}
            lang={target}
            hrefLang={target}
            title={variant === 'compact' ? nativeName : undefined}
            className={`${styles.option} ${styles.link}`}
            href={localeSwitcherDestination(target, pathname + search + hash, isNotFound)}
            tabIndex={tabIndex}
            onClick={(event) => {
              // Read the live URL at activation as well (a pushState hash change fires no event).
              event.currentTarget.href = localeSwitcherDestination(target, window.location.pathname + window.location.search + window.location.hash, isNotFound);
            }}
          >
            {label}
          </a>
        );
      })}
    </nav>
  );
}
