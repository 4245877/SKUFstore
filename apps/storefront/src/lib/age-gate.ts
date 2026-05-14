export const AGE_GATE_STORAGE_KEY = 'skufnya:age_verified';
export const AGE_GATE_COOKIE = 'age_verified';
export const AGE_GATE_COOKIE_VALUE = 'true';
export const AGE_GATE_MAX_AGE = 60 * 60 * 24 * 30;

export function isSafeReturnTo(value: unknown): value is string {
  if (typeof value !== 'string') return false;

  return value.startsWith('/') && !value.startsWith('//');
}

export function buildAgeVerifyPath(returnTo: string) {
  const safeReturnTo = isSafeReturnTo(returnTo) ? returnTo : '/catalog';

  return `/verify?returnTo=${encodeURIComponent(safeReturnTo)}`;
}

export function isAgeVerifiedClient() {
  if (typeof window === 'undefined') return false;

  if (window.localStorage.getItem(AGE_GATE_STORAGE_KEY) === AGE_GATE_COOKIE_VALUE) {
    return true;
  }

  return document.cookie
    .split('; ')
    .some((item) => item === `${AGE_GATE_COOKIE}=${AGE_GATE_COOKIE_VALUE}`);
}

export function setAgeVerifiedClient() {
  if (typeof window === 'undefined') return;

  window.localStorage.setItem(AGE_GATE_STORAGE_KEY, AGE_GATE_COOKIE_VALUE);

  document.cookie = [
    `${AGE_GATE_COOKIE}=${AGE_GATE_COOKIE_VALUE}`,
    'path=/',
    `max-age=${AGE_GATE_MAX_AGE}`,
    'samesite=lax',
    window.location.protocol === 'https:' ? 'secure' : '',
  ]
    .filter(Boolean)
    .join('; ');
}