'use client';

import Image from 'next/image';
import { useId } from 'react';
import type { CatalogFailureKind } from '../../lib/catalog-errors';
import connectionLostArt from '../../views/_media/catalog-connection-lost.png';
import styles from './CatalogLoadError.module.css';

const COPY = {
  connection: {
    title: 'Каталог на мить затих…',
    text: 'Мені шкода, зараз немає зв’язку із сервером крамнички.',
    detail: 'Можливо, це пов’язано з перебоями світла чи інтернету, зокрема через російські атаки на енергетичну інфраструктуру України.',
    reassurance: 'Крамничка працює й чекає на тебе. Щойно зв’язок відновиться, фігурки знову з’являться в каталозі.',
  },
  server: {
    title: 'Фігурки поки за лаштунками',
    text: 'Мені шкода, зараз не вдається завантажити каталог.',
    detail: 'Сервер відповів, але не зміг передати товари. Спробуй ще раз за трохи.',
    reassurance: 'Крамничка працює. Дякую, що залишаєшся поруч.',
  },
  'rate-limit': {
    title: 'Дай каталогу хвилинку',
    text: 'Зараз надходить забагато запитів, тож каталог трохи перепочиває.',
    detail: 'Будь ласка, зачекай хвилинку й спробуй ще раз.',
    reassurance: 'Дякую за твоє терпіння.',
  },
  request: {
    title: 'Не вдалося відкрити каталог',
    text: 'Мені шкода, цього разу не вдалося отримати товари.',
    detail: 'Спробуй ще раз. Якщо це повториться, зазирни трохи пізніше.',
    reassurance: 'Дякую, що завітав до крамнички.',
  },
} satisfies Record<CatalogFailureKind, { title: string; text: string; detail: string; reassurance: string }>;

type Props = {
  kind: CatalogFailureKind;
  retrying: boolean;
  onRetry: () => void;
};

/** Local artwork and copy stay available even when every API request fails. */
export default function CatalogLoadError({ kind, retrying, onRetry }: Props) {
  const titleId = useId();
  const copy = COPY[kind];

  return (
    <section className={styles.panel} lang="uk" aria-labelledby={titleId}>
      <div className={styles.art} aria-hidden="true">
        <Image
          src={connectionLostArt}
          alt=""
          className={styles.image}
          sizes="(max-width: 600px) 180px, 280px"
          loading="eager"
        />
      </div>

      <div className={styles.content}>
        <p className={styles.eyebrow}>Тимчасова пауза</p>
        <h2 id={titleId} className={styles.title}>{copy.title}</h2>
        <svg className={styles.lace} viewBox="0 0 120 8" aria-hidden="true" focusable="false">
          <path d="M0 4 Q10 0 20 4 Q30 8 40 4 Q50 0 60 4 Q70 8 80 4 Q90 0 100 4 Q110 8 120 4" fill="none" stroke="currentColor" />
        </svg>

        <div className={styles.message}>
          <p>{copy.text}</p>
          <p>{copy.detail}</p>
        </div>
        <p className={styles.reassurance}>{copy.reassurance}</p>

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
          {retrying ? 'Відновлюємо зв’язок…' : 'Спробувати ще раз'}
        </button>
        <p className={styles.status} role="status" aria-live="polite" aria-atomic="true">
          {retrying ? 'Перевіряємо, чи каталог уже повернувся.' : 'Каталог тимчасово недоступний. Можна спробувати ще раз.'}
        </p>
      </div>
    </section>
  );
}
