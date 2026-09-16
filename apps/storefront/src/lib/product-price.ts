import type { ProductPricing } from './api';

/**
 * Как витрина показывает цену товара.
 *
 * Цену считает backend; здесь решается только одно: писать её как точную или как
 * «від». Подпись «від» появляется ровно тогда, когда у товара несколько активных
 * вариаций с разной ценой — то есть когда показанное число меньше того, что
 * покупатель увидит, выбрав другую вариацию.
 *
 * Показанная цена, `priceFrom` и сортировка каталога по цене — это одно и то же
 * число, иначе карточка противоречила бы порядку выдачи.
 */
export function formatMoney(value: number, currency: string) {
  try {
    return new Intl.NumberFormat('uk-UA', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `${value} ${currency}`;
  }
}

export function formatProductPriceLabel(
  pricing: ProductPricing | null | undefined,
  priceFrom: number,
  currency: string,
) {
  const amount = pricing ? pricing.priceFrom : priceFrom;
  const formatted = formatMoney(amount, currency);

  return pricing?.hasPriceRange ? `від ${formatted}` : formatted;
}
