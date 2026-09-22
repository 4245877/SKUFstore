'use client';
import { presentApiError } from '../../../i18n/api-errors';

import { useI18n } from '../../../i18n/client';
import type { Translator } from '../../../i18n/translate';
import { useEffect, useState, useId } from 'react';
import Link from '../../../i18n/navigation';
import { useSearchParams } from 'next/navigation';
import { useRouter } from '../../../i18n/navigation';
import { buildOAuthStartUrl, loginAccount } from '../../../lib/api';
import {
  IconAlert,
  IconBow,
  IconEye,
  IconEyeOff,
  IconLock,
  IconMail,
} from '../../../components/icons';
import styles from './LoginPage.module.css';

/* ─────────────────────────────────────────
   Типи
───────────────────────────────────────── */
interface FormState {
  email: string;
  password: string;
  remember: boolean;
}

interface FieldErrors {
  email?: string;
  password?: string;
}

type ValidatedField = keyof FieldErrors;

function isValidatedField(name: string): name is ValidatedField {
  return name === 'email' || name === 'password';
}

function getFriendlyError(t: Translator, error: unknown): string {
  return presentApiError(t, error);
}

function getOAuthErrorMessage(t: Translator, code: string): string {
  switch (code) {
    case 'GOOGLE_ACCESS_DENIED':
    case 'FACEBOOK_ACCESS_DENIED':
      return t('auth.signInWasCancelled');
    case 'GOOGLE_STATE_MISMATCH':
    case 'FACEBOOK_STATE_MISMATCH':
      return t('auth.yourSignInSessionExpiredOrWas');
    case 'GOOGLE_CALLBACK_INVALID':
    case 'FACEBOOK_CALLBACK_INVALID':
      return t('auth.weCouldnTProcessTheSignIn');
    case 'GOOGLE_LOGIN_FAILED':
    case 'FACEBOOK_LOGIN_FAILED':
      return t('auth.weCouldnTSignYouInWith');
    case 'FACEBOOK_EMAIL_REQUIRED':
      return t('auth.facebookDidnTShareYourEmailAllow');
    case 'GOOGLE_EMAIL_REQUIRED':
      return t('auth.googleDidnTShareYourEmail');
    case 'GOOGLE_EMAIL_NOT_VERIFIED':
      return t('auth.yourGoogleEmailIsNotVerified');
    default:
      return t('auth.weCouldnTSignYouInWith_176');
  }
}

function sanitizeReturnTo(value: string | null | undefined) {
  if (!value) return '/profile';
  if (!value.startsWith('/')) return '/profile';
  if (value.startsWith('//')) return '/profile';
  return value;
}

/* ─────────────────────────────────────────
   Валідація
───────────────────────────────────────── */
function validate(t: Translator, values: FormState): FieldErrors {
  const errors: FieldErrors = {};

  if (!values.email) {
    errors.email = t('auth.enterYourEmail');
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
    errors.email = t('auth.enterAValidEmailAddress');
  }

  if (!values.password) {
    errors.password = t('auth.enterYourPassword');
  } else if (values.password.length < 8) {
    errors.password = t('auth.yourPasswordMustContainAtLeast8');
  }

  return errors;
}

/* ─────────────────────────────────────────
   Компонент
───────────────────────────────────────── */
export default function LoginPage() {
  const { locale, t, path } = useI18n();

  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = sanitizeReturnTo(searchParams.get('returnTo'));
  const emailId = useId();
  const passwordId = useId();
  const rememberId = useId();

  const [values, setValues] = useState<FormState>({
    email: '',
    password: '',
    remember: false,
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [globalError, setGlobalError] = useState('');
  const [touched, setTouched] = useState<Partial<Record<ValidatedField, boolean>>>({});

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const url = new URL(window.location.href);
    const code = url.searchParams.get('oauthError');
    if (!code) return;

    setGlobalError(getOAuthErrorMessage(t, code));

    url.searchParams.delete('oauthError');
    window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    const next = { ...values, [name]: type === 'checkbox' ? checked : value };
    setValues(next);

    if (isValidatedField(name) && touched[name]) {
      const newErrors = validate(t, next);
      setErrors(prev => ({ ...prev, [name]: newErrors[name] }));
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name } = e.target;

    if (!isValidatedField(name)) return;

    setTouched(prev => ({ ...prev, [name]: true }));
    const newErrors = validate(t, values);
    setErrors(prev => ({ ...prev, [name]: newErrors[name] }));
  };

  const handleSocialLogin = (provider: 'google' | 'facebook') => {
    window.location.assign(
      buildOAuthStartUrl(provider, {
        returnTo: path(returnTo),
        remember: values.remember,
      })
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ email: true, password: true });

    const newErrors = validate(t, values);
    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) return;

    setIsLoading(true);
    setGlobalError('');

    try {
      await loginAccount({
        email: values.email,
        password: values.password,
        remember: values.remember,
      });

      router.push(returnTo);
    } catch (error) {
      setGlobalError(getFriendlyError(t, error));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <aside className={styles.panel}>
        <div className={styles.panelGlow} />
        <div className={styles.panelLace} />

        <div className={styles.panelCenter}>
          <div className={styles.figureFrame}>
            <div className={styles.figureInner}>
              <span className={styles.figureEmoji}>
                <IconBow size={52} strokeWidth={1.1} />
              </span>
              <span className={styles.figureBrand}>
                SKUf<span className={styles.figureBrandAccent}>nya</span>
              </span>
              <span className={styles.figureLabel}>{t('auth.selectedAnimeFigures')}</span>
            </div>

            <div className={`${styles.chip} ${styles.chipTop}`}>
              <span className={styles.chipDot} />
              <span className={styles.chipText}>{t('auth.carefullySelected')}</span>
            </div>

            <div className={`${styles.chip} ${styles.chipBottom}`}>
              <span className={`${styles.chipDot} ${styles.chipDotGold}`} />
              <span className={styles.chipText}>{t('auth.figuresMerchandiseGifts')}</span>
            </div>
          </div>
        </div>

        <div className={styles.panelTagline}>
          <p className={styles.taglineQuote}>
            {t('auth.collectIn')} <span className={styles.taglineQuoteAccent}>{t('auth.style')}</span>.
          </p>
          <p className={styles.taglineSub}>
            {t('auth.selectedAnimeFiguresCollectiblesAndThoughtfulGifts')} </p>

          <Link href="/" className={styles.backLink}>
            <span className={styles.backArrow}>←</span>
            {t('auth.backToCatalog')} </Link>

          <div className={styles.trustRow} aria-hidden="true">
            <div className={styles.trustItem}>
              <span className={styles.trustIcon}>✦</span>
              <span>{t('auth.aCarefullySelectedCatalog')}</span>
            </div>
            <div className={styles.trustItem}>
              <span className={styles.trustIcon}>♡</span>
              <span>{t('auth.careForCollectors')}</span>
            </div>
            <div className={styles.trustItem}>
              <span className={styles.trustIcon}>✿</span>
              <span>{t('auth.aGentleAesthetic')}</span>
            </div>
          </div>
        </div>

        <div className={styles.laceDivider}>
          <div className={styles.laceDividerInner} />
        </div>
      </aside>

      <main className={styles.form}>
        <div className={styles.formInner}>
          <div className={styles.formHeader}>
            <p className={styles.formEyebrow}>{t('auth.skufnyaAccount')}</p>
            <h1 className={styles.formTitle}>
              {t('auth.welcome')} <span className={styles.formTitleAccent}>{t('auth.back')}</span>
            </h1>
            <p className={styles.formSubtitle}>
              {t('auth.signInToManageYourOrdersFavorites')} </p>
          </div>

          {globalError && (
            <div className={styles.alertError} role="alert">
              <span className={styles.alertIcon}>
                <IconAlert size={16} />
              </span>
              <span>{globalError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <div className={styles.fields}>
              <div className={styles.fieldGroup}>
                <label htmlFor={emailId} className={styles.label}>
                  {t('auth.email')} </label>
                <div className={styles.inputWrap}>
                  <span className={styles.inputIcon}>
                    <IconMail size={15} />
                  </span>
                  <input
                    id={emailId}
                    name="email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={values.email}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    disabled={isLoading}
                    aria-invalid={!!errors.email}
                    aria-describedby={errors.email ? `${emailId}-err` : undefined}
                    className={`${styles.input} ${errors.email ? styles.inputError : ''}`}
                  />
                  <div className={styles.inputFocusBar} />
                </div>
                {errors.email && (
                  <p id={`${emailId}-err`} className={styles.fieldError} role="alert">
                    <span>⚑</span> {errors.email}
                  </p>
                )}
              </div>

              <div className={styles.fieldGroup}>
                <div className={styles.labelRow}>
                  <label htmlFor={passwordId} className={styles.label}>
                    {t('account.password')} </label>
                  <Link href="/forgot-password" className={styles.labelHint}>
                    {t('auth.forgotPassword')} </Link>
                </div>
                <div className={styles.inputWrap}>
                  <span className={styles.inputIcon}>
                    <IconLock size={15} />
                  </span>
                  <input
                    id={passwordId}
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={values.password}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    disabled={isLoading}
                    aria-invalid={!!errors.password}
                    aria-describedby={errors.password ? `${passwordId}-err` : undefined}
                    className={`${styles.input} ${errors.password ? styles.inputError : ''}`}
                  />
                  <div className={styles.inputFocusBar} />
                  <button
                    type="button"
                    className={styles.eyeBtn}
                    onClick={() => setShowPassword(v => !v)}
                    disabled={isLoading}
                    aria-pressed={showPassword}
                    aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                  >
                    {showPassword ? <IconEyeOff size={16} /> : <IconEye size={16} />}
                  </button>
                </div>
                {errors.password && (
                  <p id={`${passwordId}-err`} className={styles.fieldError} role="alert">
                    <span>⚑</span> {errors.password}
                  </p>
                )}
              </div>

              <label className={styles.rememberRow}>
                <input
                  id={rememberId}
                  className={styles.visuallyHidden}
                  type="checkbox"
                  name="remember"
                  checked={values.remember}
                  onChange={handleChange}
                  disabled={isLoading}
                />
                <span className={styles.checkboxWrap}>{values.remember ? '✓' : ''}</span>
                <span className={styles.rememberLabel}>{t('auth.rememberThisDevice')}</span>
              </label>
            </div>

            <div className={styles.submitWrap}>
              <button
                type="submit"
                className={styles.submitBtn}
                disabled={isLoading}
                aria-busy={isLoading}
              >
                {isLoading ? (
                  <>
                    <span className={styles.spinner} aria-hidden="true" />
                    {t('auth.signingIn')} </>
                ) : (
                  <>
                    {t('auth.signIn')} <span className={styles.submitArrow} aria-hidden="true">
                      →
                    </span>
                  </>
                )}
              </button>
            </div>
          </form>

          <div style={{ marginTop: 20, display: 'grid', gap: 12 }}>
            <button
              type="button"
              className={styles.submitBtn}
              onClick={() => handleSocialLogin('google')}
              disabled={isLoading}
            >
              {t('auth.signInWithGoogle')} </button>

            <button
              type="button"
              className={styles.submitBtn}
              onClick={() => handleSocialLogin('facebook')}
              disabled={isLoading}
            >
              {t('auth.signInWithFacebook')} </button>
          </div>

          <div className={styles.divider} aria-hidden="true">
            <span className={styles.dividerLine} />
            <span className={styles.dividerText}>SKUfnya</span>
            <span className={styles.dividerLine} />
          </div>

          <p className={styles.formFooter}>
            {t('auth.newHere')}{' '}
            <Link href="/register" className={styles.formFooterLink}>
              {t('auth.createAnAccount')} </Link>
          </p>
        </div>
      </main>
    </div>
  );
}