'use client';

import { useRef, useState } from 'react';
import { formatLocaleDate } from '../../../../i18n/presentation';
import { getProductAvailabilityDate } from '../../../../lib/product-offer';
import { useI18n } from '../../../../i18n/client';
import Link from '../../../../i18n/navigation';
import type { CatalogProductDetail, CatalogProductVariant, CatalogResinColor } from '../../../../lib/api';
import { buildProductUrl } from '../../../../lib/product-meta';
import { buildProductInquiry, productInquiryUrl } from '../../../../lib/product-inquiry';
import { assemblyDescription, finishDescription, packageDescription, productSize, productionTime, type PurchaseInfo } from '../../../../lib/product-purchase';
import styles from './ProductDetails.module.css';

export default function ProductPurchaseInfo({ product, variant, finish, color }: {
  product: CatalogProductDetail;
  variant: CatalogProductVariant | null;
  finish: 'MONO' | 'PAINTED';
  color: CatalogResinColor | null;
}) {
  const { t, locale } = useI18n();
  const [question, setQuestion] = useState('');
  const [copyResult, setCopyResult] = useState<{ message: string; ok: boolean } | null>(null);
  const messageRef = useRef<HTMLTextAreaElement>(null);
  const info: PurchaseInfo | undefined = product.attributes?.purchaseInfo;
  const size = productSize(product, variant, t);
  const finishLabel = finishDescription(finish, t);
  const context = {
    title: product.title, url: buildProductUrl(product.slug, locale),
    variant: variant ? [variant.name, variant.outfitLabel, variant.faceLabel].filter(Boolean).join(' · ') : null,
    size, color: finish === 'MONO' ? color?.name ?? null : null, finish: finishLabel,
  };
  const message = buildProductInquiry(context, t, question);
  const status = copyResult?.message === message ? copyResult : null;
  const contents = packageDescription(info, locale);
  const unknownDetails = !contents && (!info?.assembly || info.assembly === 'BY_AGREEMENT');
  const dispatchDate = variant && ['PREORDER', 'BACKORDER'].includes(product.saleType)
    ? getProductAvailabilityDate(product, variant) : undefined;
  const facts = [
    { label: t('shop.finish'), value: finishLabel },
    typeof product.material === 'string' && product.material.trim()
      ? { label: t('shop.material'), value: product.material.trim() } : null,
    size ? { label: t('purchase.size'), value: size } : null,
    { label: t('purchase.production'), value: productionTime(variant, t, locale) },
    dispatchDate ? { label: t('shop.estimatedDispatch'), value: <time dateTime={dispatchDate}>{formatLocaleDate(dispatchDate, locale)}</time> } : null,
    unknownDetails ? { label: t('purchase.details'), value: t('purchase.detailsUnknown') }
      : { label: t('purchase.assembly'), value: assemblyDescription(info, t) },
    !unknownDetails ? { label: t('purchase.contents'), value: contents ?? t('purchase.contentsUnknown') } : null,
  ].filter(fact => fact !== null);

  async function copyMessage() {
    try {
      await navigator.clipboard.writeText(message);
      setCopyResult({ message, ok: true });
    } catch {
      messageRef.current?.focus();
      messageRef.current?.select();
      setCopyResult({ message, ok: false });
    }
  }

  return <section className={styles.purchaseInfo} aria-labelledby={`purchase-${product.id}`}>
    <h2 className={styles.purchaseTitle} id={`purchase-${product.id}`}>{t('purchase.title')}</h2>
    <dl className={styles.purchaseFacts}>
      {facts.map(fact => <div key={fact.label} className={styles.purchaseFact}>
        <dt>{fact.label}</dt><dd>{fact.value}</dd>
      </div>)}
    </dl>
    {finish === 'MONO' && (product.images.length > 0 || (variant?.images.length ?? 0) > 0)
      ? <p className={styles.purchasePhotoNote}>{t('purchase.photoNote')}</p> : null}
    <div className={styles.purchaseFooter}>
    <details className={styles.inquiry}>
      <summary>{t('purchase.ask')}</summary>
      <div className={styles.inquiryBody}>
        <label htmlFor={`inquiry-question-${product.id}`}>{t('purchase.question')}</label>
        <textarea id={`inquiry-question-${product.id}`} rows={2} maxLength={1000}
          value={question} onChange={event => setQuestion(event.target.value)}
          placeholder={t('purchase.questionPlaceholder')} />
        <label htmlFor={`inquiry-context-${product.id}`}>{t('purchase.context')}</label>
        <textarea ref={messageRef} id={`inquiry-context-${product.id}`} rows={7} readOnly value={message} />
        <div className={styles.inquiryActions}>
          <a href={productInquiryUrl(message)} target="_blank" rel="noopener noreferrer">{t('purchase.openTelegram')}</a>
          <button type="button" onClick={() => void copyMessage()}>{t('purchase.copy')}</button>
        </div>
        <p role="status">{status ? (status.ok ? t('purchase.copied') : t('purchase.copyFailed')) : ''}</p>
        <p className={styles.inquiryHint}>{t('purchase.telegramHint')}</p>
      </div>
    </details>
    <div className={styles.purchaseLinks}>
      <Link href="/faq">{t('purchase.faq')}</Link>
      <Link href="/delivery">{t('purchase.delivery')}</Link>
    </div>
    </div>
  </section>;
}
