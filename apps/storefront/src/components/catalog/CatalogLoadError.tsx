'use client';

import Image from 'next/image';
import { useId } from 'react';
import { useI18n } from '../../i18n/client';
import type { TranslationKey } from '../../i18n/translate';
import type { CatalogFailureKind } from '../../lib/catalog-errors';
import connectionLostArt from '../../views/_media/catalog-connection-lost.png';
import styles from './CatalogLoadError.module.css';

type CopyKey = Extract<TranslationKey, `catalog.failure.${string}`>;

const COPY_KEYS: Record<CatalogFailureKind, {
  title: CopyKey;
  text: CopyKey;
  detail?: CopyKey;
  hint: CopyKey;
}> = {
  connection: {
    title: 'catalog.failure.connection.title',
    text: 'catalog.failure.connection.text',
    detail: 'catalog.failure.connection.detail',
    hint: 'catalog.failure.retryLater',
  },
  server: {
    title: 'catalog.failure.server.title',
    text: 'catalog.failure.server.text',
    hint: 'catalog.failure.retryLater',
  },
  'rate-limit': {
    title: 'catalog.failure.rateLimit.title',
    text: 'catalog.failure.rateLimit.text',
    hint: 'catalog.failure.rateLimit.hint',
  },
  request: {
    title: 'catalog.failure.request.title',
    text: 'catalog.failure.request.text',
    hint: 'catalog.failure.request.hint',
  },
};

type Props = {
  kind: CatalogFailureKind;
  retrying: boolean;
  onRetry: () => void;
};

/** Local artwork and copy stay available even when every API request fails. */
export default function CatalogLoadError({ kind, retrying, onRetry }: Props) {
  const { locale, t } = useI18n();
  const titleId = useId();
  const copy = COPY_KEYS[kind];

  return (
    <section className={styles.panel} lang={locale} aria-labelledby={titleId}>
      <div className={`${styles.layout} ${kind !== 'connection' ? styles.textOnly : ''}`}>
        {kind === 'connection' && (
          <div className={styles.art} aria-hidden="true">
            <Image
              src={connectionLostArt}
              alt=""
              className={styles.image}
              sizes="(max-width: 700px) 148px, 264px"
              loading="eager"
            />
          </div>
        )}

        <div className={styles.content}>
          <p className={styles.eyebrow}>{t('catalog.failure.eyebrow')}</p>
          <h2 id={titleId} className={styles.title}>{t(copy.title)}</h2>

          <div className={styles.message}>
            <p className={styles.lead}>{t(copy.text)}</p>
            {copy.detail && <p>{t(copy.detail)}</p>}
          </div>
          <p className={styles.hint}>{t(copy.hint)}</p>

          <button
            type="button"
            className={styles.retry}
            onClick={onRetry}
            disabled={retrying}
            aria-busy={retrying}
          >
            <svg className={retrying ? styles.spinning : undefined} width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
              <path d="M20 7v5h-5M4 17v-5h5M5.5 7a7.5 7.5 0 0 1 12.4-1.9L20 8M4 16l2.1 2.9A7.5 7.5 0 0 0 18.5 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {t(retrying ? 'catalog.failure.retrying' : 'catalog.failure.retry')}
          </button>
          <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
            {t(retrying ? 'catalog.failure.status.retrying' : 'catalog.failure.status.unavailable')}
          </p>
        </div>
      </div>
    </section>
  );
}
