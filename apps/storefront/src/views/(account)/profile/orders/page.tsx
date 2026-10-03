'use client';

import { formatLocaleDate, orderStatusLabel } from '../../../../i18n/presentation';
import { useI18n } from '../../../../i18n/client';
import type { Translator } from '../../../../i18n/translate';
import Link from '../../../../i18n/navigation';
import { useEffect, useState } from 'react';
import styles from './OrdersPage.module.css';
import {
  formatPrice,
} from '../../../../lib/demo-store';
import { getAccountOrders, type OrderRecord } from '../../../../lib/api';

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

export default function ProfileOrdersPage() {
  const { locale, t, path } = useI18n();

  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<'auth' | 'load' | null>(null);

  useEffect(() => {
    let isMounted = true;

    (async () => {
      try {
        const response = await getAccountOrders();

        if (!isMounted) return;

        setOrders(response.items);
      } catch (error) {
        if (!isMounted) return;

        const status = (error as Error & { status?: number }).status;

        if (status === 401) {
          setErrorType('auth');
          setErrorMessage(t('account.signInToViewYourOrders'));
        } else {
          setErrorType('load');
          setErrorMessage(t('account.weCouldnTLoadYourOrders'));
        }
      } finally {
        if (isMounted) {
          setIsReady(true);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  if (!isReady) {
    return (
      <main className={styles.page}>
        <div className={styles.container}>
          <p className={styles.loading} role="status" aria-live="polite">
            {t('account.loadingOrders')} </p>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <div className={styles.heading}>
          <div>
            <p className={styles.eyebrow}>{t('account.myAccount')}</p>
            <h1 className={styles.title}>{t('account.myOrders')}</h1>
            <p className={styles.subtitle}>
              {t('account.yourOrdersAndTheirCurrentStatusAll')} </p>
          </div>

          <Link href="/catalog" className={styles.catalogLink}>
            {t('account.browseCatalog')} </Link>
        </div>

        {orders.length === 0 ? (
          <section className={styles.emptyState}>
            <h2 className={styles.emptyTitle}>
              {errorMessage ? t('account.weCouldnTLoadYourOrders_35') : t('account.noOrdersYet')}
            </h2>

            <p className={styles.emptyText}>
              {errorMessage ?? t('account.yourOrdersWillAppearHereOnceYou')}
            </p>

            <Link
              href={
                errorType === 'auth'
                  ? '/login?next=/profile/orders'
                  : '/catalog'
              }
              className={styles.primaryLink}
            >
              {errorType === 'auth' ? t('account.signIn') : t('account.browseCatalog')}
            </Link>
          </section>
        ) : (
          <section className={styles.list} aria-label={t('account.orderList')}>
            {orders.map((order) => {
              // Незнакомый статус получает нейтральный стиль вместо падения вёрстки.
              const statusKey = String(order.status).toLowerCase();
              const statusClassName = Object.hasOwn(statusClassMap, statusKey) ? statusClassMap[statusKey] : 'statusUnknown';
              const itemsCount = order.items.reduce(
                (sum, item) => sum + item.quantity,
                0,
              );

              return (
                <article key={order.id} className={styles.card}>
                  <div className={styles.cardTop}>
                    <div>
                      <p className={styles.orderNumber}>{order.number}</p>
                      <p className={styles.orderDate}>
                        {formatLocaleDate(order.createdAt, locale)}
                      </p>
                    </div>

                    <span className={`${styles.status} ${styles[statusClassName]}`}>
                      {orderStatusLabel(t, order.status)}
                    </span>
                  </div>

                  <div className={styles.metaGrid}>
                    <div className={styles.metaItem}>
                      <span className={styles.metaLabel}>{t('account.products')}</span>
                      <strong className={styles.metaValue}>{itemsCount}</strong>
                    </div>

                    <div className={styles.metaItem}>
                      <span className={styles.metaLabel}>{t('account.recipient')}</span>
                      <strong className={styles.metaValue}>
                        {order.customer.fullName}
                      </strong>
                    </div>

                    <div className={styles.metaItem}>
                      <span className={styles.metaLabel}>{t('account.amount')}</span>
                      <strong className={styles.metaValue}>
                        {formatPrice(order.total)}
                      </strong>
                    </div>

                    {order.trackingNumber ? (
                      <div className={styles.metaItem}>
                        <span className={styles.metaLabel}>{t('account.tracking')}</span>
                        <strong className={styles.metaValue}>
                          {order.trackingNumber}
                        </strong>
                      </div>
                    ) : null}
                  </div>

                  <div className={styles.previewList}>
                    {order.items.slice(0, 3).map((item) => (
                      <p key={item.id} className={styles.previewItem}>
                        <span className={styles.previewName}>{item.name}</span>
                        <span className={styles.previewQty}>× {item.quantity}</span>
                      </p>
                    ))}
                  </div>

                  <div className={styles.actions}>
                    <Link
                      href={`/profile/orders/details/?id=${encodeURIComponent(order.id)}`}
                      className={styles.detailsLink}
                    >
                      {t('account.viewDetails')} </Link>
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </div>
    </main>
  );
}