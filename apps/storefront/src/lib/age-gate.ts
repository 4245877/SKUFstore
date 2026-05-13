export const AGE_GATE_COOKIE = 'age_verified';

export const AGE_GATE_MAX_AGE = 60 * 60 * 24 * 30;

export function isSafeReturnTo(value: unknown): value is string {
  if (typeof value !== 'string') return false;

  return value.startsWith('/') && !value.startsWith('//');
}