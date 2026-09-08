import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import { applyCartQuote, cartLineKey, cartOrderItems, normalizeCart, orderCartItems } from '../src/lib/cart-lines.ts';
import { addCartItem, readCart, formatPrice } from '../src/lib/demo-store.ts';
import type { CartItem } from '../src/lib/cart-lines.ts';
import type { OrderQuote, OrderRecord } from '../src/lib/api.ts';

function line(overrides: Partial<CartItem> = {}): CartItem {
  const selection = { variantId: 'cmvariant1', finish: 'MONO' as const, colorSlug: 'pearl' };
  return { ...selection, id: cartLineKey(selection), productId: 'cmproduct1', slug: 'figure', name: 'Figure', price: 1400, currency: 'UAH', quantity: 1, ...overrides };
}
function quote(): OrderQuote {
  return { quoteToken: 'a'.repeat(64), currency: 'UAH', subtotal: 1500, deliveryPrice: 0, total: 1500,
    shippingPolicy: { currency: 'UAH', freeDeliveryThreshold: 1500, deliveryPrice: 120 },
    items: [{ productId: 'cmproduct1', variantId: 'cmvariant1', title: 'Figure', variantName: 'Selected L', sku: 'L', imageUrl: null,
      currency: 'UAH', unitPrice: 1500, qty: 1, totalPrice: 1500,
      configurationSnapshot: { version: 1, finish: 'MONO', finishLabel: 'Монохромна версія', color: { id: 'cmcolor1', slug: 'pearl', name: 'Перламутровий', hexColor: '#EEEEEE', priceDelta: 200 }, baseUnitPrice: 1300, finishPriceDelta: 0, currency: 'UAH' } }] };
}
const originalWindow = globalThis.window;
function storage(raw: unknown) {
  const data = new Map<string, string>([['skufnya:cart', JSON.stringify(raw)]]);
  Object.defineProperty(globalThis, 'window', { configurable: true, value: {
    localStorage: { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => data.set(key, value) }, dispatchEvent: () => true,
  } });
  return data;
}
afterEach(() => { Object.defineProperty(globalThis, 'window', { configurable: true, value: originalWindow }); });

describe('cart identity, migration and authoritative amounts', () => {
  it('uses the explicit hryvnia symbol across server and browser Intl versions', () => {
    assert.match(formatPrice(1500), /₴/);
  });
  it('deduplicates only identical configurations; colors and variants remain separate', () => {
    storage([]);
    addCartItem(line());
    addCartItem(line({ colorSlug: 'black' }));
    addCartItem(line({ variantId: 'cmvariant2' }));
    const items = addCartItem(line());
    assert.equal(items.length, 3);
    assert.equal(new Set(items.map((item) => item.id)).size, 3);
    assert.equal(items.find((item) => item.variantId === 'cmvariant1' && item.colorSlug === 'pearl')?.quantity, 2);
  });
  it('checkout sends real variantId and structured options without trusting cached prices', () => {
    assert.deepEqual(cartOrderItems([line()]), [{ variantId: 'cmvariant1', productId: 'cmproduct1', finish: 'MONO', colorSlug: 'pearl', qty: 1 }]);
    assert.equal('price' in cartOrderItems([line()])[0], false);
  });
  it('migrates composite-id localStorage lines, retains quantities and backs up the original once', () => {
    const original = [line({ id: 'cmvariant1:MONO:pearl', variantId: undefined, quantity: 2 }), line({ id: 'cmvariant1:MONO:black', variantId: undefined, quantity: 3 })];
    const data = storage(original);
    const migrated = readCart();
    assert.equal(migrated.length, 2);
    assert.deepEqual(migrated.map((item) => [item.variantId, item.finish, item.colorSlug, item.quantity]), [['cmvariant1', 'MONO', 'pearl', 2], ['cmvariant1', 'MONO', 'black', 3]]);
    assert.deepEqual(JSON.parse(data.get('skufnya:cart:legacy-backup')!), original.map((item) => JSON.parse(JSON.stringify(item))));
    assert.deepEqual(readCart(), migrated);
    assert.deepEqual(JSON.parse(data.get('skufnya:cart')!), migrated.map((item) => JSON.parse(JSON.stringify(item))));
  });
  it('preserves ambiguous AUTO/product-only lines and blocks checkout instead of guessing', () => {
    const items = normalizeCart([
      line({ id: 'cmvariant1:MONO:AUTO', variantId: undefined }),
      line({ id: 'cmproduct1', variantId: undefined, productId: undefined }),
      line({ id: 'cmproduct1:MONO:pearl', variantId: undefined }),
      line({ id: 'bad:MONO:pearl:extra', variantId: undefined }),
    ]);
    assert.equal(items.length, 4);
    for (const item of items) { assert.ok(item.configurationIssue); assert.throws(() => cartOrderItems([item])); }
  });
  it('preserves a legacy bare variant with an explicit different productId', () => {
    const [item] = normalizeCart([line({ id: 'cmvariant1', variantId: undefined, finish: undefined, colorSlug: undefined })]);
    assert.equal(item.variantId, 'cmvariant1');
    assert.equal(item.configurationIssue, undefined);
  });
  it('updates displayed line price, configuration and totals from the server quote', () => {
    const authoritative = quote();
    const items = applyCartQuote([line()], authoritative);
    assert.equal(items[0].price, 1500);
    assert.match(items[0].subtitle!, /Перламутровий/);
    assert.equal(items.reduce((sum, item) => sum + item.price * item.quantity, 0), authoritative.subtotal);
    assert.equal(authoritative.subtotal + authoritative.deliveryPrice, authoritative.total);
    assert.equal(cartOrderItems(items)[0].variantId, 'cmvariant1');
  });
  it('rejects a quote that substitutes a variant, color, quantity or product', () => {
    for (const change of [{ variantId: 'wrong' }, { productId: 'wrong' }, { qty: 2 }]) {
      const authoritative = quote(); Object.assign(authoritative.items[0], change);
      assert.throws(() => applyCartQuote([line()], authoritative));
    }
    const authoritative = quote(); authoritative.items[0].configurationSnapshot.color!.slug = 'black';
    assert.throws(() => applyCartQuote([line()], authoritative));
  });
  it('stores confirmation lines from the order response, including prices and configuration', () => {
    const order = { items: [{ id: 'order-line', productId: 'cmproduct1', variantId: 'cmvariant1', slug: 'figure', name: 'Figure', subtitle: 'Selected L', price: 1500, quantity: 1, currency: 'UAH', configurationSnapshot: quote().items[0].configurationSnapshot }] } as OrderRecord;
    const [item] = orderCartItems(order);
    assert.equal(item.price, 1500);
    assert.equal(item.variantId, 'cmvariant1');
    assert.equal(item.configurationSnapshot?.color?.priceDelta, 200);
    assert.match(item.subtitle!, /Перламутровий/);
  });
  it('still reads old order response items with no configuration snapshot', () => {
    const order = { items: [{ id: 'old', variantId: 'cmvariant1', productId: 'cmproduct1', slug: 'figure', name: 'Figure', subtitle: 'Original variant', price: 900, quantity: 1, currency: 'UAH' }] } as OrderRecord;
    assert.equal(orderCartItems(order)[0].subtitle, 'Original variant');
  });
});
