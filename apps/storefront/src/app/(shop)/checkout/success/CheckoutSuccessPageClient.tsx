'use client';

import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useSearchParams } from 'next/navigation';
import styles from './CheckoutSuccessPage.module.css';
import { IconBow } from '../../../../components/icons';
import {
  formatDate,
  formatPrice,
  readLastOrder,
} from '../../../../lib/demo-store';
import type { StoreOrder } from '../../../../lib/demo-store';

const TELEGRAM_URL = 'https://t.me/SKUFnya_ua';

// ВАЖНО: замени на ссылку именно на твой профиль OLX.
const OLX_PROFILE_URL = 'https://www.olx.ua/uk/list/user/15L7LS';

type CardShellProps = {
  badge: string;
  title: string;
  subtitle: string;
  children?: ReactNode;
};

function getPaymentMethodLabel(value?: string) {
  switch (value) {
    case 'partial-prepayment':
      return 'Передплата 60%';
    case 'full-prepayment':
      return 'Повна передплата';
    default:
      return 'Узгодження після заявки';
  }
}

function CardShell({ badge, title, subtitle, children }: CardShellProps) {
  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <section className={styles.card}>
          <span className={styles.petalTopRight} aria-hidden="true">
            ❀
          </span>
          <span className={styles.petalBottomLeft} aria-hidden="true">
            ✿
          </span>

          <div className={styles.iconWrap} aria-hidden="true">
            <span className={styles.iconEmoji}>
              <IconBow size={30} strokeWidth={1.2} />
            </span>
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
    ? `/profile/orders/details/?id=${encodeURIComponent(queryOrderId)}`
    : "/profile/orders";

  return (
    <CardShell
      badge="Заявку створено"
      title="Дякуємо, заявку прийнято"
      subtitle="Ми зберегли заявку. Для підтвердження замовлення напиши нам в OLX або Telegram — там узгодимо деталі та спосіб передплати."
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

        <div className={styles.infoItem}>
          <span className={styles.infoLabel}>Передплата</span>
          <strong className={styles.infoValue}>
            {getPaymentMethodLabel(order?.customer.paymentMethod)}
          </strong>
        </div>
      </div>

      <div className={styles.divider}>Наступний крок</div>

      <div className={styles.actions}>
        <a
          href={OLX_PROFILE_URL}
          className={styles.primaryButton}
          target="_blank"
          rel="noreferrer"
        >
          Написати в OLX
        </a>

        <a
          href={TELEGRAM_URL}
          className={styles.secondaryButton}
          target="_blank"
          rel="noreferrer"
        >
          Написати в Telegram
        </a>

        <Link href={detailsHref} className={styles.ghostButton}>
          Переглянути заявку
        </Link>

        <Link href="/catalog" className={styles.ghostButton}>
          Повернутися до каталогу
        </Link>
      </div>

      <p className={styles.helpNote}>
        Оплата не проводиться автоматично на сайті. Передплата вноситься тільки
        після узгодження деталей замовлення.
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