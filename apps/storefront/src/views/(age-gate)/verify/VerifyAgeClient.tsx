'use client';

import { useI18n } from '../../../i18n/client';
import type { Translator } from '../../../i18n/translate';
import { useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useRouter } from '../../../i18n/navigation';
import { isSafeReturnTo, setAgeVerifiedClient } from '../../../lib/age-gate';
import { IconBow } from '../../../components/icons';
import styles from './Verify.module.css';

export default function VerifyAgeClient() {
  const { locale, t, path } = useI18n();

  const router = useRouter();
  const searchParams = useSearchParams();

  const returnTo = useMemo(() => {
    const value = searchParams.get('returnTo');

    if (!isSafeReturnTo(value)) {
      return '/catalog';
    }

    return value;
  }, [searchParams]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleVerify = () => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    setError('');

    try {
      setAgeVerifiedClient();

      router.replace(returnTo);
      router.refresh();
    } catch {
      setError(t('shop.weCouldnTConfirmYourAgePlease'));
      setIsSubmitting(false);
    }
  };

  const handleDecline = () => {
    router.replace('/catalog');
  };

  return (
    <div className={styles.page}>
      <div className={`${styles.laceBorder} ${styles.laceBorderTop}`} aria-hidden="true" />
      <div className={`${styles.laceBorder} ${styles.laceBorderBottom}`} aria-hidden="true" />

      <span className={styles.petalA} aria-hidden="true">✿</span>
      <span className={styles.petalB} aria-hidden="true">❀</span>
      <span className={styles.petalC} aria-hidden="true">✾</span>
      <span className={styles.petalD} aria-hidden="true">❁</span>

      <main className={styles.card}>
        <div className={styles.brandMark}>
          <span className={styles.brandIcon} aria-hidden="true">
            <IconBow size={34} strokeWidth={1.2} />
          </span>
          <span className={styles.brandName}>Skufnya</span>
          <span className={styles.brandSub}>アニメフィギュア</span>
        </div>

        <div className={styles.divider} aria-hidden="true">
          <span className={styles.dividerLine} />
          <span className={styles.dividerDot} />
          <span className={styles.dividerLine} />
        </div>

        <div className={styles.ageBadge}>18+</div>

        <h1 className={styles.title}>
          {t('shop.confirmYour')} <span className={styles.titleAccent}>{t('shop.age')}</span>
        </h1>

        <p className={styles.text}>
          {t('shop.thisSectionMayIncludeProductsMarked18')} </p>

        <p className={styles.text}>
          {t('shop.pleaseConfirmThatYouAre')} <strong>{t('shop.18YearsOld')}</strong>
           {t('shop.orOlderToContinueBrowsing')} </p>

        {error ? (
          <p className={styles.error} role="alert">
            {error}
          </p>
        ) : null}

        <div className={styles.actions}>
          <button
            type="button"
            onClick={handleVerify}
            className={styles.primaryButton}
            disabled={isSubmitting}
          >
            {isSubmitting ? t('shop.confirming') : t('shop.iAm18OrOlder')}
          </button>

          <button
            type="button"
            onClick={handleDecline}
            className={styles.secondaryButton}
            aria-label={t('shop.iAmUnder18ReturnToThe')}
          >
            {t('shop.iAmUnder18')} </button>
        </div>

        <div className={styles.footerNote} aria-hidden="true">
          <span className={styles.footerNoteDot} />
          <span>{t('shop.animeFigureStoreKyiv')}</span>
          <span className={styles.footerNoteDot} />
        </div>
      </main>
    </div>
  );
}