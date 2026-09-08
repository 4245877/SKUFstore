import type { CreateOrderInput, OrderQuote, OrderRecord } from './api';

export type CartItem = {
  id: string;
  variantId: string | null;
  productId?: string;
  finish?: 'MONO' | 'PAINTED';
  colorSlug?: string;
  configurationIssue?: string;
  configurationSnapshot?: OrderRecord['items'][number]['configurationSnapshot'];
  slug: string;
  name: string;
  price: number;
  quantity: number;
  currency?: string;
  subtitle?: string;
  series?: string | null;
  imageUrl?: string | null;
  imageAlt?: string | null;
  isAdult?: boolean;
};

export const CART_SELECTION_MESSAGE = 'Уточніть варіант і колір на сторінці товару та додайте його знову.';

export function cartLineKey(item: Pick<CartItem, 'variantId' | 'finish' | 'colorSlug'>) {
  return JSON.stringify([item.variantId, item.finish ?? null, item.colorSlug ?? null]);
}

/** Never guess a default variant or an AUTO color. Ambiguous lines stay visible. */
export function normalizeCart(value: unknown): CartItem[] {
  if (!Array.isArray(value)) return [];
  const result: CartItem[] = [];
  value.forEach((raw, index) => {
    if (!raw || typeof raw !== 'object') return;
    const item = { ...raw } as CartItem;
    const legacyId = typeof raw.id === 'string' ? raw.id : '';
    let issue = raw.configurationIssue;
    if (raw.variantId === undefined) {
      const parts = legacyId.split(':');
      if (parts.length === 3 && parts[0] && ['MONO', 'PAINTED'].includes(parts[1]) && parts[2] && parts[2] !== 'AUTO' && parts[0] !== raw.productId) {
        item.variantId = parts[0];
        item.finish = parts[1] as CartItem['finish'];
        item.colorSlug = parts[2];
      } else if (!legacyId.includes(':') && legacyId && raw.productId && legacyId !== raw.productId) {
        item.variantId = legacyId;
      } else {
        item.variantId = null;
        issue = CART_SELECTION_MESSAGE;
      }
    }
    if (!item.variantId || typeof item.variantId !== 'string' || item.variantId.includes(':') ||
        (item.finish !== undefined && !['MONO', 'PAINTED'].includes(item.finish)) ||
        (item.finish === 'MONO' && !item.colorSlug) ||
        !Number.isInteger(raw.quantity) || raw.quantity < 1 || raw.quantity > 100) {
      issue = CART_SELECTION_MESSAGE;
    }
    item.quantity = Number.isInteger(raw.quantity) && raw.quantity > 0 ? raw.quantity : 1;
    item.price = Number.isFinite(raw.price) && raw.price >= 0 ? raw.price : 0;
    item.slug = typeof raw.slug === 'string' ? raw.slug : '';
    item.name = typeof raw.name === 'string' ? raw.name : 'Товар кошика';
    item.configurationIssue = issue || undefined;
    item.id = issue ? legacyId || `unresolved-${index}` : cartLineKey(item);
    const existing = !issue && result.find((entry) => !entry.configurationIssue && entry.id === item.id);
    if (existing && existing.quantity + item.quantity <= 100) {
      existing.quantity += item.quantity;
    } else {
      if (existing) { item.id += `:${index}`; item.configurationIssue = CART_SELECTION_MESSAGE; }
      result.push(item);
    }
  });
  return result;
}

export function cartOrderItems(items: CartItem[]): CreateOrderInput['items'] {
  return items.map((item) => {
    if (!item.variantId || item.configurationIssue) throw new Error(CART_SELECTION_MESSAGE);
    return { variantId: item.variantId, productId: item.productId, finish: item.finish,
      colorSlug: item.colorSlug, qty: item.quantity };
  });
}

export function configurationLabel(snapshot: CartItem['configurationSnapshot']) {
  return [snapshot?.finishLabel, snapshot?.color?.name].filter(Boolean).join(' · ');
}

export function applyCartQuote(items: CartItem[], quote: OrderQuote): CartItem[] {
  if (items.length !== quote.items.length) throw new Error('Кошик змінився. Оновіть розрахунок.');
  return items.map((item, index) => {
    const priced = quote.items[index];
    const snapshot = priced.configurationSnapshot;
    if (priced.variantId !== item.variantId || (item.productId && priced.productId !== item.productId) ||
        priced.qty !== item.quantity || snapshot.finish !== (item.finish ?? (item.colorSlug ? 'MONO' : null)) ||
        (snapshot.color?.slug ?? undefined) !== item.colorSlug) {
      throw new Error('Конфігурація товару змінилася. Оберіть її знову.');
    }
    return { ...item, price: priced.unitPrice, currency: priced.currency,
      name: priced.title, subtitle: [priced.variantName, configurationLabel(snapshot)].filter(Boolean).join(' · '),
      imageUrl: priced.imageUrl, configurationSnapshot: snapshot };
  });
}

export function orderCartItems(order: OrderRecord): CartItem[] {
  return order.items.map((item) => ({
    id: item.id, variantId: item.variantId, productId: item.productId,
    slug: item.slug, name: item.name, price: item.price, quantity: item.quantity,
    currency: item.currency, imageUrl: item.imageUrl, series: item.series,
    finish: item.configurationSnapshot?.finish ?? undefined,
    colorSlug: item.configurationSnapshot?.color?.slug,
    subtitle: [item.subtitle, configurationLabel(item.configurationSnapshot)].filter(Boolean).join(' · '),
    configurationSnapshot: item.configurationSnapshot,
  }));
}
