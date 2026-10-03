import type { CheckoutFormValues, DeliveryMethod, PaymentMethod } from './demo-store.ts';

/** Per-tab UI draft shared by both route locales; never a cart, quote or order. */
export const CHECKOUT_DRAFT_KEY = 'skufnya:checkout-draft';
const VERSION = 1;
// Carrier-selected labels can exceed manual-input limits; retain valid order address data.
const STRING_LIMITS = { fullName: 120, email: 160, phone: 30, city: 200, address: 500, comment: 1000 } as const;
const DELIVERY_METHODS: readonly DeliveryMethod[] = ['nova-poshta-branch', 'ukrposhta-branch', 'courier', 'pickup'];
const PAYMENT_METHODS: readonly PaymentMethod[] = ['partial-prepayment', 'full-prepayment'];

function validForm(value: unknown): CheckoutFormValues | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const form = value as Record<string, unknown>;
  for (const [field, limit] of Object.entries(STRING_LIMITS)) {
    if (!Object.hasOwn(form, field) || typeof form[field] !== 'string' || form[field].length > limit) return null;
  }
  if (!Object.hasOwn(form, 'deliveryMethod') || !DELIVERY_METHODS.includes(form.deliveryMethod as DeliveryMethod) ||
      !Object.hasOwn(form, 'paymentMethod') || !PAYMENT_METHODS.includes(form.paymentMethod as PaymentMethod)) return null;
  // Explicit fields prevent stale/foreign payload data from entering the UI draft.
  return {
    fullName: form.fullName as string, email: form.email as string, phone: form.phone as string,
    city: form.city as string, address: form.address as string, comment: form.comment as string,
    deliveryMethod: form.deliveryMethod as DeliveryMethod, paymentMethod: form.paymentMethod as PaymentMethod,
  };
}

function storage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try { return window.sessionStorage; } catch { return null; }
}

export function readCheckoutDraft(): CheckoutFormValues | null {
  try {
    const raw = storage()?.getItem(CHECKOUT_DRAFT_KEY);
    if (!raw) return null;
    const draft = JSON.parse(raw);
    return draft?.version === VERSION ? validForm(draft.form) : null;
  } catch { return null; }
}

export function saveCheckoutDraft(form: CheckoutFormValues): void {
  const validated = validForm(form);
  if (!validated) return;
  try { storage()?.setItem(CHECKOUT_DRAFT_KEY, JSON.stringify({ version: VERSION, form: validated })); } catch { /* UI remains usable when storage is unavailable. */ }
}

export function clearCheckoutDraft(): void {
  try { storage()?.removeItem(CHECKOUT_DRAFT_KEY); } catch { /* Storage failures cannot affect a confirmed order. */ }
}
