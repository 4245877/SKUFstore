'use client';
import { presentApiError } from '../../../../../i18n/api-errors';

import { formatLocaleDate, orderStatusLabel, orderPaymentLabel, presentConfiguration, presentItemSubtitle } from '../../../../../i18n/presentation';
import { useI18n } from '../../../../../i18n/client';
import type { Translator } from '../../../../../i18n/translate';
import Link from '../../../../../i18n/navigation';
import { useSearchParams } from 'next/navigation';

import { useEffect, useMemo, useState } from 'react';
import styles from '../OrderDetailsPage.module.css';
import {
  formatPrice,
} from '../../../../../lib/demo-store';
import { getAccountOrder, type OrderRecord } from '../../../../../lib/api';

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

function normalizeStatus(status: string) {
  return String(status ?? '').toLowerCase();
}

export default function OrderDetailsPage() {
  const { locale, t, path } = useI18n();

  const searchParams = useSearchParams();
  const [order, setOrder] = useState<OrderRecord | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const id = searchParams.get('id');

  useEffect(() => {
    setIsReady(false);
    setErrorMessage(null);

    if (!id) {
      setOrder(null);
      setIsReady(true);
      return;
    }

    let isMounted = true;

    (async () => {
      try {
        const response = await getAccountOrder(id);

        if (!isMounted) return;

        setOrder(response.order);
      } catch (error) {
        if (!isMounted) return;

        setErrorMessage(
          presentApiError(t, error),
        );
        setOrder(null);
      } finally {
        if (isMounted) {
          setIsReady(true);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [id]);

  const itemsCount = useMemo(() => {
    if (!order) return 0;
    return order.items.reduce((sum, item) => sum + item.quantity, 0);
  }, [order]);

  const normalizedStatus = order ? normalizeStatus(order.status) : 'pending';
  // Неизвестный статус не должен ломать страницу и не должен показывать undefined.
  const statusClassName = Object.hasOwn(statusClassMap, normalizedStatus) ? statusClassMap[normalizedStatus] : 'statusUnknown';

  if (!isReady) {
    return (
      <main className={styles.page}>
        <div className={styles.container}>
          <p className={styles.loading}>{t('account.loadingOrder')}</p>
        </div>
      </main>
    );
  }

  if (!order) {
    return (
      <main className={styles.page}>
        <div className={styles.container}>
          <section className={styles.emptyState}>
            <h1 className={styles.title}>{t('account.orderNotFound')}</h1>
            <p className={styles.emptyText}>
              {errorMessage ?? t('account.thisLinkMayHaveExpiredOrYou')}
            </p>
            <Link href="/profile/orders" className={styles.primaryLink}>
              {t('account.backToOrders')} </Link>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <div className={styles.breadcrumbs}>
          <Link href="/profile/orders" className={styles.breadcrumbLink}>
            {t('account.myOrders')} </Link>
          <span className={styles.breadcrumbDivider}>/</span>
          <span>{order.number}</span>
        </div>

        <div className={styles.heading}>
          <div>
            <p className={styles.eyebrow}>{t('account.orderDetails')}</p>
            <h1 className={styles.title}>{order.number}</h1>
            <p className={styles.subtitle}>
              {t('account.placedOn')} {formatLocaleDate(order.createdAt, locale)}
            </p>
          </div>

          <span className={`${styles.status} ${styles[statusClassName]}`}>
            {orderStatusLabel(t, order.status)}
          </span>
        </div>

        <div className={styles.layout}>
          <section className={styles.mainCard}>
            <h2 className={styles.sectionTitle}>{t('account.orderItems')}</h2>

            <div className={styles.items}>
              {order.items.map((item) => (
                <article key={item.id} className={styles.itemRow}>
                  <div className={styles.itemVisual}>{item.name.slice(0, 1)}</div>

                  <div className={styles.itemContent}>
                    <Link href={`/product/${item.slug}`} className={styles.itemName}>
                      {item.name}
                    </Link>

                    {item.configurationSnapshot ? <p className={styles.itemSubtitle}>{presentConfiguration(t, item.configurationSnapshot)}</p> : null}
                    {item.subtitle ? (
                      <p className={styles.itemSubtitle}>{presentItemSubtitle(t, item.subtitle, item.configurationSnapshot)}</p>
                    ) : null}

                    <p className={styles.itemMeta}>
                      {item.quantity} × {formatPrice(item.price)}
                    </p>
                  </div>

                  <p className={styles.itemTotal}>
                    {formatPrice(item.quantity * item.price)}
                  </p>
                </article>
              ))}
            </div>
          </section>

          <aside className={styles.sidebar}>
            <section className={styles.sideCard}>
              <h2 className={styles.sectionTitle}>{t('account.summary')}</h2>

              <div className={styles.summaryRow}>
                <span>{t('account.items')}</span>
                <span>{itemsCount}</span>
              </div>

              <div className={styles.summaryRow}>
                <span>{t('account.subtotal')}</span>
                <span>{formatPrice(order.subtotal)}</span>
              </div>

              <div className={styles.summaryRow}>
                <span>{t('account.delivery')}</span>
                <span>{formatPrice(order.deliveryPrice)}</span>
              </div>

              <div className={`${styles.summaryRow} ${styles.summaryTotal}`}>
                <span>{t('account.total')}</span>
                <span>{formatPrice(order.total)}</span>
              </div>
            </section>

            <section className={styles.sideCard}>
              <h2 className={styles.sectionTitle}>{t('account.recipient')}</h2>

              <div className={styles.detailsList}>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>{t('account.name')}</span>
                  <strong className={styles.detailValue}>{order.customer.fullName}</strong>
                </div>

                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>{t('account.phone')}</span>
                  <strong className={styles.detailValue}>{order.customer.phone}</strong>
                </div>

                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Email</span>
                  <strong className={styles.detailValue}>{order.customer.email}</strong>
                </div>
              </div>
            </section>

            <section className={styles.sideCard}>
              <h2 className={styles.sectionTitle}>{t('account.deliveryAndPayment')}</h2>

              <div className={styles.detailsList}>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>{t('account.city')}</span>
                  <strong className={styles.detailValue}>{order.customer.city}</strong>
                </div>

                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>{t('account.address')}</span>
                  <strong className={styles.detailValue}>{order.customer.address}</strong>
                </div>

                {order.trackingNumber ? (
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>
                      {order.carrier ? t('account.trackingValue', { value1: order.carrier }) : t('account.trackingNumber')}
                    </span>
                    <strong className={styles.detailValue}>
                      {order.trackingNumber}
                    </strong>
                  </div>
                ) : null}

                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>{t('account.paymentMethod')}</span>
                  <strong className={styles.detailValue}>
                    {orderPaymentLabel(t, order.customer.paymentMethod)}
                  </strong>
                </div>

                {order.customer.comment ? (
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>{t('account.comment')}</span>
                    <strong className={styles.detailValue}>{order.customer.comment}</strong>
                  </div>
                ) : null}
              </div>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}