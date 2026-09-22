import { getTranslator, type Translator } from '../../../i18n/translate';
import type { PublishedLocale } from '../../../i18n/locales';
import { localizeHref } from '../../../i18n/paths';
import { Suspense } from 'react';

import VerifyAgeClient from './VerifyAgeClient';
import styles from './Verify.module.css';

export default function VerifyAgePage({ locale }: { locale: PublishedLocale }) {
  const t = getTranslator(locale);
  const path = (href: string) => localizeHref(locale, href);

  return (
    <Suspense
      fallback={
        <main className={styles.page}>
          <section className={styles.card}>
            <p>{t('shop.loading')}</p>
          </section>
        </main>
      }
    >
      <VerifyAgeClient />
    </Suspense>
  );
}