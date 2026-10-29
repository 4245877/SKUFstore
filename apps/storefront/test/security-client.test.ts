import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { apiFetch, createOrder, logoutAccount, type CreateOrderInput } from '../src/lib/api.ts';
import { clearPrivateOrderData, readPrivateSession, writePrivateSession } from '../src/lib/private-session.ts';
const originalFetch = globalThis.fetch;
const originalWindow = globalThis.window;
afterEach(() => { globalThis.fetch = originalFetch; Object.defineProperty(globalThis, 'window', { configurable: true, value: originalWindow }); });
function browser() {
  const local = new Map<string, string>(); const session = new Map<string, string>();
  const storage = (map: Map<string,string>) => ({ getItem: (k: string) => map.get(k) ?? null, setItem: (k: string, v: string) => map.set(k,v), removeItem: (k: string) => map.delete(k) });
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { localStorage: storage(local), sessionStorage: storage(session) } });
  return { local, session };
}
test('POST requests never automatically retry a failed HTTP response or connection', async () => {
  for (const mode of ['http', 'network']) {
    let calls = 0;
    globalThis.fetch = (async () => { calls++; if (mode === 'network') throw new Error('offline'); return new Response('{}', { status: 503 }); }) as typeof fetch;
    await assert.rejects(apiFetch('/api/orders', { method: 'POST', body: '{}', retry: true, maxAttempts: 5 }));
    assert.equal(calls, 1);
  }
});
test('manual checkout retry reuses a key and stores no personal data', async () => {
  const { local, session } = browser();
  const keys: string[] = []; let calls = 0;
  globalThis.fetch = (async (_url, init) => {
    keys.push(new Headers(init?.headers).get('Idempotency-Key')!); calls++;
    if (calls === 1) throw new Error('response lost');
    return new Response('{"order":{"id":"test-order"}}', { status: 201 });
  }) as typeof fetch;
  const payload = { email: 'sensitive@example.invalid', fullName: 'Private Buyer', phone: '+380501234567', city: 'Kyiv', address: 'Private Address', deliveryMethod: 'pickup', paymentMethod: 'full-prepayment', currency: 'UAH', items: [{ variantId: 'v1', qty: 1 }] } as CreateOrderInput;
  await assert.rejects(createOrder(payload));
  assert.ok(!JSON.stringify([...session]).includes('Private'));
  assert.ok(!JSON.stringify([...session]).includes('sensitive'));
  await createOrder(payload);
  assert.equal(keys[0], keys[1]); assert.ok(keys[0].length >= 16);
  assert.equal(session.has('skufnya:pending-order-key'), false);
  assert.equal(local.size, 0);
});
test('order PII is removed from legacy localStorage, expires in the tab and clears on logout', async () => {
  const { local, session } = browser();
  local.set('skufnya:orders', 'legacy PII'); local.set('skufnya:last-order', 'legacy PII');
  local.set('skufnya:cart', 'keep cart');
  writePrivateSession('skufnya:last-order', { customer: 'Buyer' });
  assert.equal(local.has('skufnya:orders'), false); assert.equal(local.has('skufnya:last-order'), false);
  assert.deepEqual(readPrivateSession('skufnya:last-order'), { customer: 'Buyer' });
  const stored = JSON.parse(session.get('skufnya:last-order')!);
  session.set('skufnya:last-order', JSON.stringify({ ...stored, expiresAt: Date.now() - 1 }));
  assert.equal(readPrivateSession('skufnya:last-order'), null);
  writePrivateSession('skufnya:last-order', { customer: 'Buyer' }); session.set('skufnya:checkout-draft', 'PII');
  globalThis.fetch = (async () => new Response('{"ok":true}')) as typeof fetch;
  await logoutAccount();
  assert.equal(session.size, 0); assert.equal(local.get('skufnya:cart'), 'keep cart');
  assert.doesNotThrow(() => clearPrivateOrderData());
});


test('legacy catalog responses cannot publish manufacturing fields', async () => {
  const { normalizeCatalogProductDetail } = await import('../src/lib/api.ts');
  const product = normalizeCatalogProductDetail({ id: 'safe-product', title: 'Physical item',
    attributes: { scale: '1/8', boxIncluded: true, slicer: 'internal', modelFiles: [{ url: 'private.stl' }] },
    modelFiles: [{ url: 'private.3mf' }], donariumJobId: 'internal-job',
    variants: [{ id: 'variant', name: 'Standard', resinGrams: 99, pricingSnapshot: { secret: true },
      modelFiles: [{ url: 'private.stl' }], leadTimeDays: 7, price: 100, currency: 'UAH' }] });
  assert.deepEqual(product.attributes, { scale: '1/8', boxIncluded: true });
  assert.equal(product.variants[0].leadTimeDays, 7);
  assert.doesNotMatch(JSON.stringify(product), /resinGrams|pricingSnapshot|modelFiles|internal-job|private\.(stl|3mf)/);
  const unknown = normalizeCatalogProductDetail({ variants: [{ id: 'v' }] });
  assert.equal(unknown.variants[0].leadTimeDays, null);
});
