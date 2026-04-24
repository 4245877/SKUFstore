'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import styles from '../OrderDetailsPage.module.css';
import {
  formatDate,
  formatPrice,
  getStatusLabel,
} from '../../../../../lib/demo-store';
import { getAccountOrder, type OrderRecord } from '../../../../../lib/api';

const statusClassMap: Record<string, string> = {
  pending: 'statusPending',
  awaiting_payment: 'statusPending',
  paid: 'statusPaid',
  processing: 'statusProcessing',
  shipped: 'statusShipped',
  delivered: 'statusDelivered',
  cancelled: 'statusCancelled',
};

function normalizeStatus(status: string) {
  return status.toLowerCase();
}

export default function OrderDetailsPage() {
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
          error instanceof Error ? error.message : 'Не удалось загрузить заказ.',
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
  const statusClassName = statusClassMap[normalizedStatus] ?? statusClassMap.pending;

  if (!isReady) {
    return (
      <main className={styles.page}>
        <div className={styles.container}>
          <p className={styles.loading}>Загружаем заказ...</p>
        </div>
      </main>
    );
  }

  if (!order) {
    return (
      <main className={styles.page}>
        <div className={styles.container}>
          <section className={styles.emptyState}>
            <h1 className={styles.title}>Заказ не найден</h1>
            <p className={styles.emptyText}>
              {errorMessage ?? 'Возможно, ссылка устарела или у тебя нет доступа к этому заказу.'}
            </p>
            <Link href="/profile/orders" className={styles.primaryLink}>
              Вернуться к заказам
            </Link>
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
            Мои заказы
          </Link>
          <span className={styles.breadcrumbDivider}>/</span>
          <span>{order.number}</span>
        </div>

        <div className={styles.heading}>
          <div>
            <p className={styles.eyebrow}>Детали заказа</p>
            <h1 className={styles.title}>{order.number}</h1>
            <p className={styles.subtitle}>
              Оформлен {formatDate(order.createdAt)}
            </p>
          </div>

          <span className={`${styles.status} ${styles[statusClassName]}`}>
            {getStatusLabel(order.status)}
          </span>
        </div>

        <div className={styles.layout}>
          <section className={styles.mainCard}>
            <h2 className={styles.sectionTitle}>Состав заказа</h2>

            <div className={styles.items}>
              {order.items.map((item) => (
                <article key={item.id} className={styles.itemRow}>
                  <div className={styles.itemVisual}>{item.name.slice(0, 1)}</div>

                  <div className={styles.itemContent}>
                    <Link href={`/product/${item.slug}`} className={styles.itemName}>
                      {item.name}
                    </Link>

                    {item.subtitle ? (
                      <p className={styles.itemSubtitle}>{item.subtitle}</p>
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
              <h2 className={styles.sectionTitle}>Сводка</h2>

              <div className={styles.summaryRow}>
                <span>Позиций</span>
                <span>{itemsCount}</span>
              </div>

              <div className={styles.summaryRow}>
                <span>Подытог</span>
                <span>{formatPrice(order.subtotal)}</span>
              </div>

              <div className={styles.summaryRow}>
                <span>Доставка</span>
                <span>{formatPrice(order.deliveryPrice)}</span>
              </div>

              <div className={`${styles.summaryRow} ${styles.summaryTotal}`}>
                <span>Итого</span>
                <span>{formatPrice(order.total)}</span>
              </div>
            </section>

            <section className={styles.sideCard}>
              <h2 className={styles.sectionTitle}>Получатель</h2>

              <div className={styles.detailsList}>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Имя</span>
                  <strong className={styles.detailValue}>{order.customer.fullName}</strong>
                </div>

                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Телефон</span>
                  <strong className={styles.detailValue}>{order.customer.phone}</strong>
                </div>

                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Email</span>
                  <strong className={styles.detailValue}>{order.customer.email}</strong>
                </div>
              </div>
            </section>

            <section className={styles.sideCard}>
              <h2 className={styles.sectionTitle}>Доставка и оплата</h2>

              <div className={styles.detailsList}>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Город</span>
                  <strong className={styles.detailValue}>{order.customer.city}</strong>
                </div>

                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Адрес</span>
                  <strong className={styles.detailValue}>{order.customer.address}</strong>
                </div>

                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Способ оплаты</span>
                  <strong className={styles.detailValue}>
                    {order.customer.paymentMethod === 'card'
                      ? 'Оплата картой'
                      : 'Наложенный платёж'}
                  </strong>
                </div>

                {order.customer.comment ? (
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Комментарий</span>
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