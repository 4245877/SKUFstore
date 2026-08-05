'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import {
  getAccountOrders,
  getAccountProfile,
  type AccountUser,
  type OrderRecord,
} from '../../../lib/api';
import styles from './ProfilePage.module.css';

function formatPrice(value: number) {
  return new Intl.NumberFormat('uk-UA', {
    style: 'currency',
    currency: 'UAH',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('uk-UA', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date(value));
}

const statusLabels: Record<string, string> = {
  pending: 'Ожидает подтверждения',
  confirmed: 'Подтверждён',
  awaiting_payment: 'Ожидает оплаты',
  paid: 'Оплачен',
  processing: 'В работе',
  shipped: 'Отправлен',
  delivered: 'Доставлен',
  cancelled: 'Отменён',
  returned: 'Возврат',
};

function getStatusLabel(status: string) {
  return statusLabels[String(status ?? '').toLowerCase()] ?? 'Неизвестно';
}

const statusClassMap: Record<string, string> = {
  pending: 'statusPending',
  confirmed: 'statusConfirmed',
  awaiting_payment: 'statusAwaitingPayment',
  paid: 'statusPaid',
  processing: 'statusProcessing',
  shipped: 'statusShipped',
  delivered: 'statusDelivered',
  cancelled: 'statusCancelled',
  returned: 'statusReturned',
};

/**
 * Неизвестный статус получает нейтральный класс: подставлять undefined
 * в className нельзя, а статика на Pages может отставать от backend.
 */
function getStatusClassName(status: string) {
  const key = statusClassMap[String(status ?? '').toLowerCase()] ?? 'statusUnknown';
  return styles[key] ?? styles.statusUnknown;
}

/* ── Quick-link config ─────────────────────── */
const quickLinks = [
  {
    href: '/profile/orders',
    title: 'Заказы',
    text: 'История покупок и текущие статусы',
  },
  {
    href: '/profile/addresses',
    title: 'Адреса',
    text: 'Сохранённые адреса и отделения',
  },
  {
    href: '/profile/settings',
    title: 'Настройки',
    text: 'Имя, email, пароль и уведомления',
  },
  {
    href: '/favorites',
    title: 'Избранное',
    text: 'Отложенные товары и коллекции',
  },
] as const;

const sideLinks = [
  { href: '/delivery', label: 'Доставка' },
  { href: '/payment', label: 'Оплата' },
  { href: '/returns', label: 'Возврат' },
  { href: '/contacts', label: 'Контакты' },
] as const;

/* ─────────────────────────────────────────── */

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<AccountUser | null>(null);
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [me, ordersResponse] = await Promise.all([getAccountProfile(), getAccountOrders()]);

        if (cancelled) return;

        setUser(me);
        setOrders(ordersResponse.items);
        setLoadError('');
      } catch (error) {
        if (cancelled) return;

        const status =
          typeof error === 'object' && error && 'status' in error
            ? (error as { status?: number }).status
            : undefined;

        if (status === 401) {
          router.replace('/login?returnTo=%2Fprofile');
          return;
        }

        setLoadError('Не удалось загрузить кабинет');
      } finally {
        if (!cancelled) setIsReady(true);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [router]);

  const lastOrder = orders[0] ?? null;

  const stats = useMemo(() => {
    const totalOrders = orders.length;
    const totalSpent = orders.reduce((sum, order) => sum + order.total, 0);
    const activeOrders = orders.filter((order) =>
      ['pending', 'paid', 'processing', 'shipped'].includes(order.status),
    ).length;

    return { totalOrders, totalSpent, activeOrders };
  }, [orders]);

  if (!isReady) {
    return (
      <main className={styles.page}>
        <div className={styles.container}>
          <p className={styles.loading}>Загрузка профиля…</p>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <div className={styles.hero}>
          <div className={styles.heroContent}>
            <p className={styles.eyebrow}>Личный кабинет</p>
            <h1 className={styles.title}>Профиль</h1>
            <p className={styles.subtitle}>
              Здесь можно быстро перейти к заказам, адресам, настройкам и избранному.
            </p>
          </div>

          <div className={styles.heroActions}>
            <Link href="/catalog" className={styles.secondaryButton}>
              Каталог
            </Link>
            <Link href="/profile/orders" className={styles.primaryButton}>
              Мои заказы
            </Link>
          </div>
        </div>

        <section className={styles.statsGrid} aria-label="Статистика аккаунта">
          <article className={styles.statCard}>
            <span className={styles.statLabel}>Всего заказов</span>
            <strong className={styles.statValue}>{stats.totalOrders}</strong>
          </article>

          <article className={styles.statCard}>
            <span className={styles.statLabel}>Активных</span>
            <strong className={styles.statValue}>{stats.activeOrders}</strong>
          </article>

          <article className={styles.statCard}>
            <span className={styles.statLabel}>Потрачено</span>
            <strong className={styles.statValue}>{formatPrice(stats.totalSpent)}</strong>
          </article>
        </section>

        <div className={styles.grid}>
          <div className={styles.mainColumn}>
            <section className={styles.card}>
              <div className={styles.sectionHead}>
                <div>
                  <h2 className={styles.sectionTitle}>Быстрые разделы</h2>
                  <p className={styles.sectionText}>Основные страницы аккаунта в одном месте.</p>
                </div>
              </div>

              <nav className={styles.quickLinks} aria-label="Разделы аккаунта">
                {quickLinks.map((link) => (
                  <Link key={link.href} href={link.href} className={styles.quickLink}>
                    <span className={styles.quickLinkTitle}>{link.title}</span>
                    <span className={styles.quickLinkText}>{link.text}</span>
                  </Link>
                ))}
              </nav>
            </section>

            <section className={styles.card}>
              <div className={styles.sectionHead}>
                <div>
                  <h2 className={styles.sectionTitle}>Последний заказ</h2>
                  <p className={styles.sectionText}>Последняя оформленная покупка.</p>
                </div>

                {lastOrder && (
                  <Link
                    href={`/profile/orders/details?id=${encodeURIComponent(lastOrder.id)}`}
                    className={styles.inlineLink}
                    aria-label={`Открыть заказ ${lastOrder.number}`}
                  >
                    Открыть
                  </Link>
                )}
              </div>

              {!lastOrder ? (
                <div className={styles.emptyState}>
                  <p className={styles.emptyTitle}>Заказов пока нет</p>
                  <p className={styles.emptyText}>
                    После оформления заказа информация появится здесь.
                  </p>
                  <Link href="/catalog" className={styles.primaryButton}>
                    Выбрать товары
                  </Link>
                </div>
              ) : (
                <article className={styles.orderPreview}>
                  <div className={styles.orderTop}>
                    <div>
                      <p className={styles.orderNumber}>{lastOrder.number}</p>
                      <p className={styles.orderDate}>{formatDate(lastOrder.createdAt)}</p>
                    </div>

                    <span className={`${styles.status} ${getStatusClassName(lastOrder.status)}`}>
                      {getStatusLabel(lastOrder.status)}
                    </span>
                  </div>

                  <div className={styles.orderMeta}>
                    <div className={styles.metaItem}>
                      <span className={styles.metaLabel}>Получатель</span>
                      <strong className={styles.metaValue}>{lastOrder.customer.fullName}</strong>
                    </div>

                    <div className={styles.metaItem}>
                      <span className={styles.metaLabel}>Товаров</span>
                      <strong className={styles.metaValue}>
                        {lastOrder.items.reduce((sum, item) => sum + item.quantity, 0)}
                      </strong>
                    </div>

                    <div className={styles.metaItem}>
                      <span className={styles.metaLabel}>Сумма</span>
                      <strong className={styles.metaValue}>{formatPrice(lastOrder.total)}</strong>
                    </div>
                  </div>

                  <div className={styles.previewList}>
                    {lastOrder.items.slice(0, 3).map((item) => (
                      <p key={item.id} className={styles.previewItem}>
                        {item.name}
                        <span>× {item.quantity}</span>
                      </p>
                    ))}
                  </div>
                </article>
              )}
            </section>
          </div>

          <aside className={styles.sideColumn}>
            <section className={styles.card}>
              <h2 className={styles.sectionTitle}>Профиль</h2>

              <div className={styles.profileInfo}>
                <div>
                  <span className={styles.detailLabel}>Имя</span>
                  <strong className={styles.detailValue}>
                    {user ? `${user.firstName} ${user.lastName}` : '—'}
                  </strong>
                </div>

                <div>
                  <span className={styles.detailLabel}>Email</span>
                  <strong className={styles.detailValue}>{user?.email ?? '—'}</strong>
                </div>

                <div>
                  <span className={styles.detailLabel}>Телефон</span>
                  <strong className={styles.detailValue}>{user?.phone ?? 'Не указан'}</strong>
                </div>
              </div>

              {loadError && <p className={styles.loading}>{loadError}</p>}

              <Link href="/profile/settings" className={styles.secondaryButtonWide}>
                Редактировать
              </Link>
            </section>

            <section className={styles.card}>
              <h2 className={styles.sectionTitle}>Полезное</h2>

              <nav className={styles.sideLinks} aria-label="Полезные страницы">
                {sideLinks.map((link) => (
                  <Link key={link.href} href={link.href} className={styles.sideLink}>
                    {link.label}
                  </Link>
                ))}
              </nav>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}