'use client';

import { useI18n } from '../../../../i18n/client';
import type { Translator } from '../../../../i18n/translate';
import Link from '../../../../i18n/navigation';
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

function getPaymentMethodLabel(t: Translator, value?: string) {
  switch (value) {
    case 'partial-prepayment':
      return t('content.60AdvancePayment');
    case 'full-prepayment':
      return t('content.fullAdvancePayment');
    default:
      return t('shop.arrangedAfterOrdering');
  }
}

function CardShell({ badge, title, subtitle, children }: CardShellProps) {
  const { locale, t, path } = useI18n();

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
  const { locale, t, path } = useI18n();

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
        badge={t('shop.detailsNotFound')}
        title={t('shop.weCouldnTFindYourOrderDetails')}
        subtitle={t('shop.informationAboutThisOrderIsUnavailableTry')}
      >
        <p className={styles.notice}>
          {t('shop.ifYouJustPlacedTheOrderThe')} </p>

        <div className={styles.actions}>
          <Link href="/profile/orders" className={styles.primaryButton}>
            {t('shop.goToMyOrders')} </Link>
          <Link href="/catalog" className={styles.secondaryButton}>
            {t('shop.backToCatalog_949')} </Link>
        </div>

        <p className={styles.helpNote}>
          {t('shop.needHelp')}{' '}
          <Link href="/contacts" className={styles.helpLink}>
            {t('shop.contactUs')} </Link>{' '}
          {t('shop.weLlHelpYouFindYourOrder')} </p>
      </CardShell>
    );
  }

  const detailsHref = queryOrderId
    ? `/profile/orders/details/?id=${encodeURIComponent(queryOrderId)}`
    : "/profile/orders";

  return (
    <CardShell
      badge={t('shop.requestSubmitted')}
      title={t('shop.thankYouWeVeReceivedYourRequest')}
      subtitle={t('shop.yourRequestHasBeenSavedMessageUs')}
    >
      <div className={styles.infoGrid}>
        <div className={styles.infoItem}>
          <span className={styles.infoLabel}>{t('shop.number')}</span>
          <strong className={styles.infoValue}>
            {order?.number ?? queryOrderNumber ?? '—'}
          </strong>
        </div>

        <div className={styles.infoItem}>
          <span className={styles.infoLabel}>{t('shop.date')}</span>
          <strong className={styles.infoValue}>
            {order ? formatDate(order.createdAt) : t('shop.toBeConfirmed')}
          </strong>
        </div>

        <div className={styles.infoItem}>
          <span className={styles.infoLabel}>{t('shop.amount')}</span>
          <strong className={styles.infoValue}>
            {order ? formatPrice(order.total) : t('shop.toBeConfirmed')}
          </strong>
        </div>

        <div className={styles.infoItem}>
          <span className={styles.infoLabel}>{t('content.advancePayment')}</span>
          <strong className={styles.infoValue}>
            {getPaymentMethodLabel(t, order?.customer.paymentMethod)}
          </strong>
        </div>
      </div>

      <div className={styles.divider}>{t('shop.nextStep')}</div>

      <div className={styles.actions}>
        <a
          href={OLX_PROFILE_URL}
          className={styles.primaryButton}
          target="_blank"
          rel="noreferrer"
        >
          {t('content.messageUsOnOlx')} </a>

        <a
          href={TELEGRAM_URL}
          className={styles.secondaryButton}
          target="_blank"
          rel="noreferrer"
        >
          {t('shop.messageUsOnTelegram')} </a>

        <Link href={detailsHref} className={styles.ghostButton}>
          {t('shop.viewRequest')} </Link>

        <Link href="/catalog" className={styles.ghostButton}>
          {t('shop.backToCatalog_949')} </Link>
      </div>

      <p className={styles.helpNote}>
        {t('shop.theWebsiteDoesNotProcessPaymentsAutomatically')} </p>
    </CardShell>
  );
}

function CheckoutSuccessFallback() {
  const { locale, t, path } = useI18n();

  return (
    <CardShell
      badge={t('shop.orderPlaced')}
      title={t('shop.thankYouYourOrderHasBeenReceived')}
      subtitle={t('shop.loadingOrderDetails')}
    />
  );
}

export default function CheckoutSuccessPage() {
  const { locale, t, path } = useI18n();

  return (
    <Suspense fallback={<CheckoutSuccessFallback />}>
      <CheckoutSuccessContent />
    </Suspense>
  );
}