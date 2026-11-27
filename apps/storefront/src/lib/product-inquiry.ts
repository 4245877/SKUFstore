import type { Translator } from '../i18n/translate';

export const SHOP_TELEGRAM_URL = 'https://t.me/SKUFnya_ua';

export function buildProductInquiry(context: {
  title: string; url: string; variant: string | null; size: string | null;
  color: string | null; finish: string;
}, t: Translator, question = ''): string {
  return [t('purchase.inquiryIntro'), context.title, context.url,
    context.variant ? `${t('shop.variant')}: ${context.variant}` : null,
    context.size ? `${t('purchase.size')}: ${context.size}` : null,
    `${t('shop.finish')}: ${context.finish}`,
    context.color ? `${t('purchase.materialColor')}: ${context.color}` : null,
    '', `${t('purchase.question')}: ${question.trim()}`,
  ].filter(line => line !== null).join('\n');
}

export function productInquiryUrl(message: string): string {
  return `${SHOP_TELEGRAM_URL}?text=${encodeURIComponent(message)}`;
}
