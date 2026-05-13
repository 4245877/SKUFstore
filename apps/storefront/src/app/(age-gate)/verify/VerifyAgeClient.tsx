'use client';

import { useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import styles from './Verify.module.css';

export default function VerifyAgeClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const returnTo = useMemo(() => {
    const value = searchParams.get('returnTo');

    if (!value || !value.startsWith('/')) {
      return '/';
    }

    return value;
  }, [searchParams]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleVerify = async () => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    setError('');

    try {
      const response = await fetch('/api/age-gate/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ returnTo }),
      });

      if (!response.ok) {
        throw new Error('AGE_CONFIRM_FAILED');
      }

      const data = await response.json();

      router.replace(data.returnTo || returnTo);
      router.refresh();
    } catch {
      setError('Не вдалося підтвердити вік. Будь ласка, спробуйте ще раз.');
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

      <span className={styles.petalA} aria-hidden="true">🌸</span>
      <span className={styles.petalB} aria-hidden="true">✿</span>
      <span className={styles.petalC} aria-hidden="true">🌸</span>
      <span className={styles.petalD} aria-hidden="true">✿</span>

      <main className={styles.card}>
        <div className={styles.brandMark}>
          <span className={styles.brandIcon} aria-hidden="true">🎀</span>
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
          Підтвердіть <span className={styles.titleAccent}>вік</span>
        </h1>

        <p className={styles.text}>
          Цей розділ може містити товари з позначкою 18+. Вони призначені лише
          для повнолітніх користувачів.
        </p>

        <p className={styles.text}>
          Будь ласка, підтвердьте, що вам виповнилось <strong>18 років</strong>
          або більше, щоб продовжити перегляд.
        </p>

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
            {isSubmitting ? 'Підтвердження…' : 'Мені є 18 років'}
          </button>

          <button
            type="button"
            onClick={handleDecline}
            className={styles.secondaryButton}
            aria-label="Мені ще немає 18 років — повернутися до каталогу"
          >
            Мені ще немає 18
          </button>
        </div>

        <div className={styles.footerNote} aria-hidden="true">
          <span className={styles.footerNoteDot} />
          <span>Магазин аніме фігурок · Київ</span>
          <span className={styles.footerNoteDot} />
        </div>
      </main>
    </div>
  );
}