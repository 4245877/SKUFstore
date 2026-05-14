export const AGE_GATE_COOKIE = 'age_verified';
export const AGE_GATE_COOKIE_VALUE = 'true';

export const AGE_GATE_MAX_AGE = 60 * 60 * 24 * 30;

export function isAgeVerifiedCookieValue(value: unknown) {
  return value === AGE_GATE_COOKIE_VALUE;
}

export function isSafeReturnTo(value: unknown): value is string {
  if (typeof value !== 'string') return false;

  return value.startsWith('/') && !value.startsWith('//');
}

export function buildAgeVerifyPath(returnTo: string) {
  const safeReturnTo = isSafeReturnTo(returnTo) ? returnTo : '/catalog';

  return `/verify?returnTo=${encodeURIComponent(safeReturnTo)}`;
}