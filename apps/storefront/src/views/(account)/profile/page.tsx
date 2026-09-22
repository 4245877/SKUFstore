'use client';

import { useI18n } from '../../../i18n/client';
import type { Translator } from '../../../i18n/translate';
import Link from '../../../i18n/navigation';
import { useRouter } from '../../../i18n/navigation';
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

const statusLabels = (t: Translator): Record<string, string> => ({
  pending: t('account.awaitingConfirmation'),
  confirmed: t('account.confirmed'),
  awaiting_payment: t('account.awaitingPayment'),
  paid: t('account.paid'),
  processing: t('account.inProgress'),
  shipped: t('account.shipped'),
  delivered: t('account.delivered'),
  cancelled: t('account.cancelled'),
  returned: t('account.return'),
});

function getStatusLabel(t: Translator, status: string) {
  return statusLabels(t)[String(status ?? '').toLowerCase()] ?? t('account.unknown');
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
const quickLinks = (t: Translator) => ([
  {
    href: '/profile/orders',
    title: t('account.orders'),
    text: t('account.purchaseHistoryAndOrderStatus'),
  },
  {
    href: '/profile/addresses',
    title: t('account.addresses'),
    text: t('account.deliveryAddressInformation'),
  },
  {
    href: '/profile/settings',
    title: t('account.settings'),
    text: t('account.nameEmailPasswordAndNotifications'),
  },
  {
    href: '/favorites',
    title: t('account.favorites'),
    text: t('account.savedProductsAndCollections'),
  },
] as const);

const sideLinks = (t: Translator) => ([
  { href: '/delivery', label: t('account.delivery') },
  { href: '/payment', label: t('account.payment') },
  { href: '/returns', label: t('account.return') },
  { href: '/contacts', label: t('account.contacts') },
] as const);

/* ─────────────────────────────────────────── */

export default function ProfilePage() {
  const { locale, t, path } = useI18n();

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

        setLoadError(t('account.weCouldnTLoadYourAccount'));
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
          <p className={styles.loading}>{t('account.loadingProfile')}</p>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <div className={styles.hero}>
          <div className={styles.heroContent}>
            <p className={styles.eyebrow}>{t('account.myAccount')}</p>
            <h1 className={styles.title}>{t('account.profile')}</h1>
            <p className={styles.subtitle}>
              {t('account.quickAccessToYourOrdersAddressesSettings')} </p>
          </div>

          <div className={styles.heroActions}>
            <Link href="/catalog" className={styles.secondaryButton}>
              {t('account.catalog')} </Link>
            <Link href="/profile/orders" className={styles.primaryButton}>
              {t('account.myOrders')} </Link>
          </div>
        </div>

        <section className={styles.statsGrid} aria-label={t('account.accountOverview')}>
          <article className={styles.statCard}>
            <span className={styles.statLabel}>{t('account.totalOrders')}</span>
            <strong className={styles.statValue}>{stats.totalOrders}</strong>
          </article>

          <article className={styles.statCard}>
            <span className={styles.statLabel}>{t('account.active')}</span>
            <strong className={styles.statValue}>{stats.activeOrders}</strong>
          </article>

          <article className={styles.statCard}>
            <span className={styles.statLabel}>{t('account.spent')}</span>
            <strong className={styles.statValue}>{formatPrice(stats.totalSpent)}</strong>
          </article>
        </section>

        <div className={styles.grid}>
          <div className={styles.mainColumn}>
            <section className={styles.card}>
              <div className={styles.sectionHead}>
                <div>
                  <h2 className={styles.sectionTitle}>{t('account.quickLinks')}</h2>
                  <p className={styles.sectionText}>{t('account.yourMainAccountPagesInOnePlace')}</p>
                </div>
              </div>

              <nav className={styles.quickLinks} aria-label={t('account.accountSections')}>
                {quickLinks(t).map((link) => (
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
                  <h2 className={styles.sectionTitle}>{t('account.latestOrder')}</h2>
                  <p className={styles.sectionText}>{t('account.yourMostRecentPurchase')}</p>
                </div>

                {lastOrder && (
                  <Link
                    href={`/profile/orders/details?id=${encodeURIComponent(lastOrder.id)}`}
                    className={styles.inlineLink}
                    aria-label={t('account.viewOrderValue', { value1: lastOrder.number })}
                  >
                    {t('account.view')} </Link>
                )}
              </div>

              {!lastOrder ? (
                <div className={styles.emptyState}>
                  <p className={styles.emptyTitle}>{t('account.noOrdersYet')}</p>
                  <p className={styles.emptyText}>
                    {t('account.yourOrderDetailsWillAppearHereAfter')} </p>
                  <Link href="/catalog" className={styles.primaryButton}>
                    {t('account.browseProducts')} </Link>
                </div>
              ) : (
                <article className={styles.orderPreview}>
                  <div className={styles.orderTop}>
                    <div>
                      <p className={styles.orderNumber}>{lastOrder.number}</p>
                      <p className={styles.orderDate}>{formatDate(lastOrder.createdAt)}</p>
                    </div>

                    <span className={`${styles.status} ${getStatusClassName(lastOrder.status)}`}>
                      {getStatusLabel(t, lastOrder.status)}
                    </span>
                  </div>

                  <div className={styles.orderMeta}>
                    <div className={styles.metaItem}>
                      <span className={styles.metaLabel}>{t('account.recipient')}</span>
                      <strong className={styles.metaValue}>{lastOrder.customer.fullName}</strong>
                    </div>

                    <div className={styles.metaItem}>
                      <span className={styles.metaLabel}>{t('account.products')}</span>
                      <strong className={styles.metaValue}>
                        {lastOrder.items.reduce((sum, item) => sum + item.quantity, 0)}
                      </strong>
                    </div>

                    <div className={styles.metaItem}>
                      <span className={styles.metaLabel}>{t('account.amount')}</span>
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
              <h2 className={styles.sectionTitle}>{t('account.profile')}</h2>

              <div className={styles.profileInfo}>
                <div>
                  <span className={styles.detailLabel}>{t('account.name')}</span>
                  <strong className={styles.detailValue}>
                    {user ? `${user.firstName} ${user.lastName}` : '—'}
                  </strong>
                </div>

                <div>
                  <span className={styles.detailLabel}>Email</span>
                  <strong className={styles.detailValue}>{user?.email ?? '—'}</strong>
                </div>

                <div>
                  <span className={styles.detailLabel}>{t('account.phone')}</span>
                  <strong className={styles.detailValue}>{user?.phone ?? t('account.notProvided')}</strong>
                </div>
              </div>

              {loadError && <p className={styles.loading}>{loadError}</p>}

              <Link href="/profile/settings" className={styles.secondaryButtonWide}>
                {t('account.edit')} </Link>
            </section>

            <section className={styles.card}>
              <h2 className={styles.sectionTitle}>{t('account.usefulLinks')}</h2>

              <nav className={styles.sideLinks} aria-label={t('account.usefulPages')}>
                {sideLinks(t).map((link) => (
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