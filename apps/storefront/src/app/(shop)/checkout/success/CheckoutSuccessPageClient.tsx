'use client';

import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useSearchParams } from 'next/navigation';
import styles from './CheckoutSuccessPage.module.css';
import {
  formatDate,
  formatPrice,
  readLastOrder,
} from '../../../../lib/demo-store';
import type { StoreOrder } from '../../../../lib/demo-store';

type CardShellProps = {
  badge: string;
  title: string;
  subtitle: string;
  children?: ReactNode;
};

function CardShell({ badge, title, subtitle, children }: CardShellProps) {
  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <section className={styles.card}>
          <span className={styles.petalTopRight} aria-hidden="true">
            🌸
          </span>
          <span className={styles.petalBottomLeft} aria-hidden="true">
            ✿
          </span>

          <div className={styles.iconWrap} aria-hidden="true">
            <span className={styles.iconEmoji}>🎀</span>
          </div>

          <div className={styles.badge}>{badge}</div>
          <h1 className={styles.title}>{title}</h1>
          <p className={styles.subtitle}>{subtitle}</p>

          {children}
        </section>
      </div>
    </main>
  );
}

function readOrderSafely(): StoreOrder | null {
  try {
    return readLastOrder();
  } catch {
    return null;
  }
}

function matchesOrderNumber(
  order: StoreOrder,
  queryOrderNumber: string | null,
): boolean {
  if (!queryOrderNumber) {
    return true;
  }

  return order.number === queryOrderNumber;
}

function CheckoutSuccessContent() {
  const searchParams = useSearchParams();
  const [lastOrder, setLastOrder] = useState<StoreOrder | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  const queryOrderNumber = searchParams.get('order')?.trim() || null;
  const queryOrderId = searchParams.get('id')?.trim() || null;

  useEffect(() => {
    setLastOrder(readOrderSafely());
    setIsLoaded(true);
  }, []);

  if (!isLoaded) {
    return <CheckoutSuccessFallback />;
  }

  const hasQueryReference = Boolean(queryOrderId || queryOrderNumber);

  const canUseLastOrder =
    Boolean(lastOrder) &&
    matchesOrderNumber(lastOrder as StoreOrder, queryOrderNumber) &&
    (!queryOrderId || Boolean(queryOrderNumber));

  const order = canUseLastOrder
    ? lastOrder
    : !hasQueryReference
      ? lastOrder
      : null;

  const hasOrderReference = Boolean(order || hasQueryReference);

  if (!hasOrderReference) {
    return (
      <CardShell
        badge="Дані не знайдено"
        title="Не вдалося знайти дані замовлення"
        subtitle="Схоже, інформація про це замовлення недоступна. Спробуй відкрити список замовлень або перевір лист із підтвердженням."
      >
        <p className={styles.notice}>
          Якщо замовлення було оформлене щойно, сторінка може оновитися із
          затримкою.
        </p>

        <div className={styles.actions}>
          <Link href="/profile/orders" className={styles.primaryButton}>
            Перейти до моїх замовлень
          </Link>
          <Link href="/catalog" className={styles.secondaryButton}>
            Повернутися до каталогу
          </Link>
        </div>

        <p className={styles.helpNote}>
          Потрібна допомога?{' '}
          <Link href="/contacts" className={styles.helpLink}>
            Напиши нам
          </Link>{' '}
          — підкажемо, де знайти замовлення.
        </p>
      </CardShell>
    );
  }

  const detailsHref = queryOrderId
    ? `/profile/orders/${queryOrderId}`
    : '/profile/orders';

  return (
    <CardShell
      badge="Замовлення оформлено"
      title="Дякуємо, замовлення прийнято"
      subtitle="Ми зберегли замовлення і незабаром почнемо його обробку. Очікуй підтвердження на пошті."
    >
      <div className={styles.infoGrid}>
        <div className={styles.infoItem}>
          <span className={styles.infoLabel}>Номер</span>
          <strong className={styles.infoValue}>
            {order?.number ?? queryOrderNumber ?? '—'}
          </strong>
        </div>

        <div className={styles.infoItem}>
          <span className={styles.infoLabel}>Дата</span>
          <strong className={styles.infoValue}>
            {order ? formatDate(order.createdAt) : 'Уточнюється'}
          </strong>
        </div>

        <div className={styles.infoItem}>
          <span className={styles.infoLabel}>Сума</span>
          <strong className={styles.infoValue}>
            {order ? formatPrice(order.total) : 'Уточнюється'}
          </strong>
        </div>
      </div>

      <div className={styles.divider}>Наступний крок</div>

      <div className={styles.actions}>
        <Link href={detailsHref} className={styles.primaryButton}>
          Переглянути замовлення
        </Link>
        <Link href="/catalog" className={styles.secondaryButton}>
          Повернутися до каталогу
        </Link>
      </div>

      <p className={styles.helpNote}>
        Маєш питання?{' '}
        <Link href="/contacts" className={styles.helpLink}>
          Напиши нам
        </Link>{' '}
        — відповімо протягом дня.
      </p>
    </CardShell>
  );
}

function CheckoutSuccessFallback() {
  return (
    <CardShell
      badge="Замовлення оформлено"
      title="Дякуємо, замовлення прийнято"
      subtitle="Завантажуємо дані замовлення…"
    />
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={<CheckoutSuccessFallback />}>
      <CheckoutSuccessContent />
    </Suspense>
  );
}