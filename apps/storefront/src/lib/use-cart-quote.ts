import { useEffect, useState } from 'react';
import { quoteOrder, type OrderDeliveryMethod, type OrderQuote } from './api';
import { applyCartQuote, cartOrderItems, type CartItem } from './cart-lines';

export function useCartQuote(items: CartItem[], deliveryMethod: OrderDeliveryMethod) {
  const [revision, setRevision] = useState(0);
  const key = JSON.stringify([items, deliveryMethod, revision]);
  const [result, setResult] = useState<{ key: string; quote?: OrderQuote; items?: CartItem[]; error?: string }>({ key: '' });
  useEffect(() => {
    if (!items.length) return;
    const controller = new AbortController();
    async function update() {
      try {
        const { quote } = await quoteOrder(cartOrderItems(items), deliveryMethod, controller.signal);
        const pricedItems = applyCartQuote(items, quote);
        if (!controller.signal.aborted) setResult({ key, quote, items: pricedItems });
      } catch (error) {
        if (!controller.signal.aborted) setResult({ key, error: error instanceof Error ? error.message : 'Не вдалося перевірити ціни.' });
      }
    }
    void update();
    return () => controller.abort();
    // key captures the complete cart and delivery choice, including cross-tab changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const current = result.key === key ? result : null;
  const quote = current?.quote ?? null;
  return {
    quote, items: current?.items ?? items,
    message: current?.error ?? (!quote && items.length ? 'Перевіряємо ціни та доставку…' :
      quote && items.some((item, index) => item.price !== quote.items[index].unitPrice || item.currency !== quote.items[index].currency)
        ? 'Ціни оновлено. Перевірте суму перед підтвердженням.' : null),
    error: current?.error,
    refresh: () => setRevision((value) => value + 1),
  };
}
