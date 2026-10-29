// Short-lived, per-tab order confirmation. Never migrate legacy localStorage PII.
const ORDER_KEYS = ['skufnya:orders', 'skufnya:last-order'];
const TTL_MS = 30 * 60 * 1000;
export function clearPrivateOrderData(includeSession = true) {
  if (typeof window === 'undefined') return;
  for (const key of ORDER_KEYS) {
    try { window.localStorage.removeItem(key); } catch { /* storage optional */ }
    if (includeSession) try { window.sessionStorage.removeItem(key); } catch { /* storage optional */ }
  }
  if (includeSession) try {
    window.sessionStorage.removeItem('skufnya:checkout-draft');
    window.sessionStorage.removeItem('skufnya:pending-order-key');
  } catch { /* storage optional */ }
}
export function readPrivateSession<T>(key: string): T | null {
  clearPrivateOrderData(false);
  try {
    const raw = window.sessionStorage.getItem(key);
    if (!raw) return null;
    const value = JSON.parse(raw);
    if (!Number.isFinite(value.expiresAt) || value.expiresAt <= Date.now()) {
      window.sessionStorage.removeItem(key); return null;
    }
    return value.data as T;
  } catch { return null; }
}
export function writePrivateSession(key: string, data: unknown) {
  clearPrivateOrderData(false);
  try { window.sessionStorage.setItem(key, JSON.stringify({ data, expiresAt: Date.now() + TTL_MS })); } catch { /* storage optional */ }
}
