import type { Translator, TranslationKey } from './translate.ts';

// API uses payload.error for its stable code. The transport retains message/details
// for diagnostics; customer copy never depends on backend prose or language.
const ERROR_KEYS: Record<string, TranslationKey> = {
  VERIFICATION_CODE_COOLDOWN: 'errors.rateLimit', VERIFICATION_CODE_TOO_MANY_ATTEMPTS: 'errors.codeTooManyAttempts',
  VERIFICATION_CODE_EXPIRED: 'errors.codeExpired', INVALID_VERIFICATION_CODE: 'errors.codeInvalid',
  VERIFICATION_CODE_REQUIRED: 'errors.codeRequired', EMAIL_ALREADY_IN_USE: 'errors.emailTaken',
  INVALID_CONFIGURATION: 'errors.unavailable', INVALID_RESIN_COLOR: 'errors.unavailable',
  PRODUCT_NOT_FOUND: 'errors.unavailable',
  INVALID_CREDENTIALS: 'errors.invalidCredentials',
  VALIDATION_ERROR: 'errors.validation', INVALID_ORDER_PAYLOAD: 'errors.validation', BAD_REQUEST: 'errors.validation',
  RATE_LIMITED: 'errors.rateLimit', TOO_MANY_REQUESTS: 'errors.rateLimit',
  REGISTER_CODE_RATE_LIMITED: 'errors.rateLimit', REGISTER_CODE_TOO_MANY_ATTEMPTS: 'errors.codeTooManyAttempts',
  EMAIL_ALREADY_EXISTS: 'errors.emailTaken', EMAIL_TAKEN: 'errors.emailTaken',
  USERNAME_ALREADY_EXISTS: 'errors.usernameTaken', USERNAME_TAKEN: 'errors.usernameTaken',
  REGISTER_CODE_EXPIRED: 'errors.codeExpired', REGISTER_CODE_INVALID: 'errors.codeInvalid',
  REGISTER_CODE_REQUIRED: 'errors.codeRequired',
  ORDER_PRICE_CHANGED: 'errors.quoteChanged',
  INVALID_ORDER_ITEMS: 'errors.unavailable', VARIANT_NOT_FOUND: 'errors.unavailable',
  INVALID_VARIANT: 'errors.unavailable', INVALID_COLOR: 'errors.unavailable',
  UNAUTHORIZED: 'errors.signIn', FORBIDDEN: 'errors.signIn', USER_NOT_FOUND: 'errors.signIn',
  EMAIL_SEND_FAILED: 'errors.emailDelivery', MAILER_NOT_CONFIGURED: 'errors.emailDelivery',
};

export function apiErrorCode(error: unknown): string | undefined {
  if (!error || typeof error !== 'object') return undefined;
  const value = error as { code?: unknown; payload?: { error?: unknown; code?: unknown } };
  const code = value.payload?.code ?? value.payload?.error ?? value.code;
  return typeof code === 'string' ? code : undefined;
}

export function presentApiError(t: Translator, error: unknown): string {
  const code = apiErrorCode(error);
  if (code && Object.hasOwn(ERROR_KEYS, code)) return t(ERROR_KEYS[code] as 'errors.generic');
  const status = (error as { status?: number } | null)?.status;
  if (status === 429) return t('errors.rateLimit');
  if (status === 401 || status === 403) return t('errors.signIn');
  if (error instanceof TypeError) return t('errors.network');
  return t('errors.generic');
}
