'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import styles from './OrdersPage.module.css';
import {
  formatDate,
  formatPrice,
  getStatusLabel,
} from '../../../../lib/demo-store';
import { getAccountOrders, type OrderRecord } from '../../../../lib/api';

const statusClassMap: Record<string, string> = {
  pending: 'statusPending',
  awaiting_payment: 'statusAwaitingPayment',
  paid: 'statusPaid',
  processing: 'statusProcessing',
  shipped: 'statusShipped',
  delivered: 'statusDelivered',
  cancelled: 'statusCancelled',
};

export default function ProfileOrdersPage() {
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
          setErrorMessage('Чтобы просматривать заказы, нужно войти в аккаунт.');
        } else {
          setErrorType('load');
          setErrorMessage('Не удалось загрузить заказы.');
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
            Загрузка заказов…
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <div className={styles.heading}>
          <div>
            <p className={styles.eyebrow}>Личный кабинет</p>
            <h1 className={styles.title}>Мои заказы</h1>
            <p className={styles.subtitle}>
              Здесь собраны оформленные заказы и их текущие статусы.
            </p>
          </div>

          <Link href="/catalog" className={styles.catalogLink}>
            Перейти в каталог
          </Link>
        </div>

        {orders.length === 0 ? (
          <section className={styles.emptyState}>
            <h2 className={styles.emptyTitle}>
              {errorMessage ? 'Не удалось загрузить заказы' : 'Заказов пока нет'}
            </h2>

            <p className={styles.emptyText}>
              {errorMessage ?? 'После оформления они будут отображаться здесь.'}
            </p>

            <Link
              href={
                errorType === 'auth'
                  ? '/login?next=/profile/orders'
                  : '/catalog'
              }
              className={styles.primaryLink}
            >
              {errorType === 'auth' ? 'Войти в аккаунт' : 'Перейти в каталог'}
            </Link>
          </section>
        ) : (
          <section className={styles.list} aria-label="Список заказов">
            {orders.map((order) => {
              const statusKey = String(order.status).toLowerCase();
              const statusClassName = statusClassMap[statusKey] || 'statusPending';
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
                        {formatDate(order.createdAt)}
                      </p>
                    </div>

                    <span className={`${styles.status} ${styles[statusClassName]}`}>
                      {getStatusLabel(order.status)}
                    </span>
                  </div>

                  <div className={styles.metaGrid}>
                    <div className={styles.metaItem}>
                      <span className={styles.metaLabel}>Товаров</span>
                      <strong className={styles.metaValue}>{itemsCount}</strong>
                    </div>

                    <div className={styles.metaItem}>
                      <span className={styles.metaLabel}>Получатель</span>
                      <strong className={styles.metaValue}>
                        {order.customer.fullName}
                      </strong>
                    </div>

                    <div className={styles.metaItem}>
                      <span className={styles.metaLabel}>Сумма</span>
                      <strong className={styles.metaValue}>
                        {formatPrice(order.total)}
                      </strong>
                    </div>
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
                      href={`/profile/orders/${encodeURIComponent(order.id)}`}
                      className={styles.detailsLink}
                    >
                      Открыть детали
                    </Link>
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