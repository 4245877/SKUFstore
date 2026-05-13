import { Suspense } from 'react';

import VerifyAgeClient from './VerifyAgeClient';
import styles from './Verify.module.css';

export default function VerifyAgePage() {
  return (
    <Suspense
      fallback={
        <main className={styles.page}>
          <section className={styles.card}>
            <p>Завантаження...</p>
          </section>
        </main>
      }
    >
      <VerifyAgeClient />
    </Suspense>
  );
}