'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { PUBLISHED_LOCALES } from '../../i18n/locales';
import { switchLocalePath } from '../../i18n/paths';
import { useLocale } from '../../i18n/client';

export default function LocaleSwitcher() {
  const locale = useLocale();
  const pathname = usePathname() || '/';
  // First browser render matches the exported document, including query deep links.
  const [suffix, setSuffix] = useState('');
  useEffect(() => {
    const update = () => setSuffix(window.location.search + window.location.hash);
    update();
    window.addEventListener('hashchange', update);
    window.addEventListener('popstate', update);
    return () => { window.removeEventListener('hashchange', update); window.removeEventListener('popstate', update); };
  }, [pathname]);
  return <nav aria-label={locale === 'en' ? 'Language' : 'Мова'} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
    {PUBLISHED_LOCALES.map((target) => <a key={target} lang={target} hrefLang={target}
      aria-current={target === locale ? 'true' : undefined}
      href={switchLocalePath(target, pathname + suffix)}
      onClick={(event) => {
        // Read the live query at activation as well (SPA query changes keep pathname).
        event.currentTarget.href = switchLocalePath(target, window.location.pathname + window.location.search + window.location.hash);
      }}>{target.toUpperCase()}</a>)}
  </nav>;
}
