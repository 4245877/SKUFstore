import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import { CHECKOUT_DRAFT_KEY, readCheckoutDraft, saveCheckoutDraft, clearCheckoutDraft } from '../src/lib/checkout-draft.ts';
import type { CheckoutFormValues } from '../src/lib/demo-store.ts';

const originalWindow = globalThis.window;
const form: CheckoutFormValues = {
  fullName: ' Buyer Name ', email: 'buyer@example.invalid', phone: '+380501112233',
  city: 'Київ', address: 'Узгодити з менеджером', comment: 'Keep these details',
  deliveryMethod: 'pickup', paymentMethod: 'full-prepayment',
};
function browser(data = new Map<string, string>()) {
  Object.defineProperty(globalThis, 'window', { configurable: true, value: {
    sessionStorage: { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => data.set(key, value), removeItem: (key: string) => data.delete(key) },
  } });
  return data;
}
afterEach(() => Object.defineProperty(globalThis, 'window', { configurable: true, value: originalWindow }));

describe('shared per-tab checkout draft', () => {
  it('preserves delivery, payment and customer details across locale document remounts', () => {
    const data = browser();
    for (const deliveryMethod of ['nova-poshta-branch', 'ukrposhta-branch', 'courier', 'pickup'] as const) {
      for (const paymentMethod of ['partial-prepayment', 'full-prepayment'] as const) {
        const selection = { ...form, deliveryMethod, paymentMethod };
        saveCheckoutDraft(selection);
        browser(data); // A newly mounted document reads the same origin/tab session.
        assert.deepEqual(readCheckoutDraft(), selection);
      }
    }
    assert.deepEqual([...data.keys()], [CHECKOUT_DRAFT_KEY]);
  });

  it('stores only form presentation data without locale, money, cart items or quote tokens', () => {
    const data = browser();
    saveCheckoutDraft({ ...form, locale: 'en', currency: 'EUR', items: [{ price: 1 }], quoteToken: 'stale', total: 1 } as CheckoutFormValues);
    const draft = JSON.parse(data.get(CHECKOUT_DRAFT_KEY)!);
    assert.deepEqual(draft, { version: 1, form });
    data.set(CHECKOUT_DRAFT_KEY, JSON.stringify({ version: 1, form: { ...form, locale: 'uk', quoteToken: 'stale' } }));
    assert.deepEqual(readCheckoutDraft(), form);
  });

  it('retains incomplete inputs exactly without applying order validation or changing selections', () => {
    browser();
    const unfinished = { ...form, fullName: '', email: 'buyer@', phone: '+38', address: '', comment: '  unfinished  ' };
    saveCheckoutDraft(unfinished);
    assert.deepEqual(readCheckoutDraft(), unfinished);
    const carrierSelection = { ...form, city: 'К'.repeat(130), address: 'А'.repeat(350) };
    saveCheckoutDraft(carrierSelection);
    assert.deepEqual(readCheckoutDraft(), carrierSelection, 'Carrier suggestions can exceed manual-input limits');
  });

  it('rejects corrupt, unknown-version and invalid drafts without guessing payment or delivery', () => {
    const data = browser();
    for (const raw of ['not json', 'null', '[]', JSON.stringify({ version: 2, form }), JSON.stringify({ version: '1', form }),
      ...[{ ...form, deliveryMethod: 'international' }, { ...form, paymentMethod: 'card' }, { ...form, email: null }, { ...form, city: 123 }, { ...form, phone: 'x'.repeat(31) }, { ...form, address: 'x'.repeat(501) }].map(form => JSON.stringify({ version: 1, form }))]) {
      data.set(CHECKOUT_DRAFT_KEY, raw);
      assert.equal(readCheckoutDraft(), null, raw);
    }
    data.delete(CHECKOUT_DRAFT_KEY);
    assert.equal(readCheckoutDraft(), null);
  });

  it('is safe during SSR and when browser session storage is blocked or throws', () => {
    Object.defineProperty(globalThis, 'window', { configurable: true, value: undefined });
    assert.equal(readCheckoutDraft(), null);
    assert.doesNotThrow(() => { saveCheckoutDraft(form); clearCheckoutDraft(); });
    Object.defineProperty(globalThis, 'window', { configurable: true, value: { get sessionStorage() { throw new Error('blocked'); } } });
    assert.equal(readCheckoutDraft(), null);
    assert.doesNotThrow(() => { saveCheckoutDraft(form); clearCheckoutDraft(); });
    Object.defineProperty(globalThis, 'window', { configurable: true, value: { sessionStorage: { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('quota'); }, removeItem() { throw new Error('blocked'); } } } });
    assert.equal(readCheckoutDraft(), null);
    assert.doesNotThrow(() => { saveCheckoutDraft(form); clearCheckoutDraft(); });
  });

  it('keeps the draft while prices are reviewed and clears only its own record after success', () => {
    const data = browser(new Map([['skufnya:cart', 'cart'], ['skufnya:favorites', 'favorites']]));
    saveCheckoutDraft(form);
    assert.deepEqual(readCheckoutDraft(), form); // Reading/reviewing a quote never consumes the draft.
    clearCheckoutDraft();
    assert.equal(readCheckoutDraft(), null);
    assert.deepEqual([...data.entries()], [['skufnya:cart', 'cart'], ['skufnya:favorites', 'favorites']]);
  });
});
