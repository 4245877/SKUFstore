'use client';

import { useI18n } from '../../i18n/client';
import Link from '../../i18n/navigation';
import { SHOP_TELEGRAM_URL } from '../../lib/shop-contacts';
import { IconTelegram } from '../icons';
import styles from './ApiAssistance.module.css';

export default function ApiAssistance({ context = 'catalog', onRetry }: {
  context?: 'catalog' | 'quote' | 'submit';
  onRetry?: () => void;
}) {
  const { t } = useI18n();
  return <div className={styles.assistance}>
    <p>{t(context === 'quote' ? 'assistance.quote' : context === 'submit' ? 'assistance.submit' : 'assistance.catalog')}</p>
    <div className={styles.actions}>
      {onRetry && <button type="button" onClick={onRetry}>{t('shop.checkAgain')}</button>}
      <a href={SHOP_TELEGRAM_URL} target="_blank" rel="noopener noreferrer">
        <IconTelegram size={16} />{t('assistance.manager')}
      </a>
      <Link href="/contacts">{t('nav.contacts')}</Link>
    </div>
  </div>;
}
