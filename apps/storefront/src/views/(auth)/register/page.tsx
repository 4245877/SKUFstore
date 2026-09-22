'use client';
import { presentApiError } from '../../../i18n/api-errors';

import { useI18n } from '../../../i18n/client';
import type { Translator } from '../../../i18n/translate';
import { useEffect, useState, useId } from 'react';
import Link from '../../../i18n/navigation';
import { useRouter } from '../../../i18n/navigation';
import {
  buildOAuthStartUrl,
  registerAccount,
  requestRegisterCode,
} from '../../../lib/api';
import {
  IconAlert,
  IconBow,
  IconEye,
  IconEyeOff,
  IconLock,
} from '../../../components/icons';
import s from './RegisterPage.module.css';

type StrengthLevel = 0 | 1 | 2 | 3;

function passwordStrength(pw: string): StrengthLevel {
  if (!pw) return 0;
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw) && /[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return score as StrengthLevel;
}

const STRENGTH_LABELS = (t: Translator): Record<StrengthLevel, string> => ({
  0: '',
  1: t('auth.weak'),
  2: t('auth.good'),
  3: t('auth.strong'),
});

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
      return t('auth.weCouldnTRegisterYouWithYour');
    case 'FACEBOOK_EMAIL_REQUIRED':
      return t('auth.facebookDidnTShareYourEmailAllow');
    case 'GOOGLE_EMAIL_REQUIRED':
      return t('auth.googleDidnTShareYourEmail');
    case 'GOOGLE_EMAIL_NOT_VERIFIED':
      return t('auth.yourGoogleEmailIsNotVerified');
    default:
      return t('auth.weCouldnTRegisterYouWithYour_217');
  }
}

export default function RegisterPage() {
  const { locale, t, path } = useI18n();

  const uid = useId();
  const router = useRouter();

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    username: '',
    password: '',
    confirm: '',
    code: '',
    agree: false,
    newsletter: false,
  });

  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState('');
  const [loading, setLoading] = useState(false);
  const [codeRequested, setCodeRequested] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const url = new URL(window.location.href);
    const code = url.searchParams.get('oauthError');
    if (!code) return;

    setGlobalError(getOAuthErrorMessage(t, code));

    url.searchParams.delete('oauthError');
    window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
  }, []);

  const strength = passwordStrength(form.password);

  const handleFieldChange =
    (key: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;

      setForm((prev) => ({ ...prev, [key]: value }));

      if (errors[key]) {
        setErrors((prev) => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
      }
    };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};

    if (!form.firstName.trim()) errs.firstName = t('auth.firstNameIsRequired');
    if (!form.lastName.trim()) errs.lastName = t('auth.lastNameIsRequired');

    if (!form.email.trim()) errs.email = t('auth.emailIsRequired');
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errs.email = t('auth.invalidEmailAddress');
    }

    if (!form.username.trim()) errs.username = t('auth.usernameIsRequired');
    else if (form.username.length < 3) errs.username = t('auth.atLeast3Characters');

    if (!form.password) errs.password = t('auth.passwordIsRequired');
    else if (form.password.length < 8) errs.password = t('auth.atLeast8Characters');

    if (form.password !== form.confirm) errs.confirm = t('auth.passwordsDoNotMatch');
    if (!form.agree) errs.agree = t('auth.youMustAcceptTheTerms');

    if (codeRequested) {
      if (!form.code.trim()) errs.code = t('auth.enterTheCodeFromYourEmail');
      else if (!/^\d{6}$/.test(form.code.trim())) errs.code = t('auth.theCodeMustContain6Digits');
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGlobalError('');
    setSuccessMessage('');

    if (!validate()) return;

    setLoading(true);

    try {
      if (!codeRequested) {
        await requestRegisterCode(form.email);

        setCodeRequested(true);
        setSuccessMessage(t('auth.weVeSentA6DigitCode'));
        return;
      }

      await registerAccount({
        firstName: form.firstName,
        lastName: form.lastName,
        username: form.username,
        email: form.email,
        password: form.password,
        code: form.code.trim(),
        remember: true,
      });

      router.push('/profile');
    } catch (error) {
      const message =
        presentApiError(t, error);

      setGlobalError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleSocialRegister = (provider: 'google' | 'facebook') => {
    window.location.assign(
      buildOAuthStartUrl(provider, {
        returnTo: path('/profile'),
        remember: true,
      }),
    );
  };

  const handleResendCode = async () => {
    setGlobalError('');
    setSuccessMessage('');

    if (!form.email.trim()) {
      setErrors((prev) => ({
        ...prev,
        email: t('auth.enterYourEmailFirst'),
      }));
      return;
    }

    setLoading(true);

    try {
      await requestRegisterCode(form.email);

      setCodeRequested(true);
      setSuccessMessage(t('auth.aNewVerificationCodeHasBeenSent'));
    } catch (error) {
      const message =
        presentApiError(t, error);

      setGlobalError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className={s.page}>
      <aside className={s.deco} aria-hidden="true">
        <div className={s.decoOrb} />
        <div className={s.decoOrb} />
        <div className={s.decoOrb} />
        <div className={s.decoPattern} />
        <div className={s.decoLaceEdge} />
        <PetalsLayer />
        <DecoContent />
      </aside>

      <section className={s.formPanel}>
        <div className={s.formInner}>
          <Link href="/" className={s.backLink}>
            <span className={s.backArrow}>←</span>
            {t('auth.backToTheStore')} </Link>

          <header className={s.formHeader}>
            <p className={s.formEyebrow}>{t('auth.joinSkufnya')}</p>
            <h1 className={s.formTitle}>
              {t('auth.createYour')} <span className={s.formTitleAccent}>{t('auth.account')}</span>
            </h1>
            <p className={s.formSubtitle}>
              {t('auth.alreadyHaveAnAccount')}{' '}
              <Link href="/login" className={s.formSubtitleLink}>
                {t('auth.signInHere')} </Link>
            </p>
          </header>

          <div style={{ display: 'grid', gap: 12, marginBottom: 20 }}>
            <button
              type="button"
              className={s.submitBtn}
              onClick={() => handleSocialRegister('google')}
              disabled={loading}
            >
              {t('auth.continueWithGoogle')} </button>

            <button
              type="button"
              className={s.submitBtn}
              onClick={() => handleSocialRegister('facebook')}
              disabled={loading}
            >
              {t('auth.continueWithFacebook')} </button>
          </div>

          <div className={s.divider} role="separator">
            {t('auth.registerWithEmail')} </div>

          {globalError && (
            <div className={s.alertError} role="alert">
              <span className={s.alertIcon}>
                <IconAlert size={15} />
              </span>
              {globalError}
            </div>
          )}

          {successMessage && (
            <div
              role="status"
              style={{
                marginBottom: 16,
                padding: '12px 14px',
                borderRadius: 14,
                border: '1px solid rgba(120,180,120,0.35)',
                background: 'rgba(120,180,120,0.10)',
              }}
            >
              {successMessage}
            </div>
          )}

          <form className={s.form} onSubmit={handleSubmit} noValidate aria-label={t('auth.registrationForm')}>
            <div className={s.fieldRow}>
              <Field
                id={`${uid}-fn`}
                label={t('auth.firstName')}
                required
                icon="✦"
                type="text"
                placeholder={t('auth.sakura')}
                value={form.firstName}
                onChange={handleFieldChange('firstName')}
                error={errors.firstName}
                autoComplete="given-name"
              />
              <Field
                id={`${uid}-ln`}
                label={t('account.lastName')}
                required
                icon="✦"
                type="text"
                placeholder={t('auth.tanaka')}
                value={form.lastName}
                onChange={handleFieldChange('lastName')}
                error={errors.lastName}
                autoComplete="family-name"
              />
            </div>

            <Field
              id={`${uid}-email`}
              label={t('auth.email')}
              required
              icon="✉"
              type="email"
              placeholder="sakura@example.com"
              value={form.email}
              onChange={handleFieldChange('email')}
              error={errors.email}
              autoComplete="email"
            />

            {codeRequested && (
              <div className={s.field}>
                <label className={s.label} htmlFor={`${uid}-code`}>
                  {t('auth.emailVerificationCode')} <span className={s.labelRequired}>*</span>
                </label>
                <div className={s.inputWrap}>
                  <span className={s.inputIcon} aria-hidden="true">
                    ✉
                  </span>
                  <input
                    id={`${uid}-code`}
                    className={`${s.input}${errors.code ? ` ${s.inputError}` : ''}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="123456"
                    value={form.code}
                    onChange={handleFieldChange('code')}
                    aria-invalid={!!errors.code}
                    aria-describedby={errors.code ? `${uid}-code-err` : undefined}
                  />
                </div>

                {errors.code && (
                  <span className={s.fieldError} id={`${uid}-code-err`} role="alert">
                    <span aria-hidden="true">⚠</span> {errors.code}
                  </span>
                )}

                <button
                  type="button"
                  onClick={handleResendCode}
                  disabled={loading}
                  style={{
                    marginTop: 10,
                    background: 'transparent',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    font: 'inherit',
                  }}
                >
                  {t('auth.resendCode')} </button>
              </div>
            )}

            <Field
              id={`${uid}-user`}
              label={t('auth.username')}
              required
              icon="♡"
              type="text"
              placeholder="sakura_collector"
              value={form.username}
              onChange={handleFieldChange('username')}
              error={errors.username}
              autoComplete="username"
            />

            <div className={s.field}>
              <label className={s.label} htmlFor={`${uid}-pw`}>
                {t('account.password')} <span className={s.labelRequired}>*</span>
              </label>
              <div className={s.inputWrap}>
                <span className={s.inputIcon} aria-hidden="true">
                  <IconLock size={15} />
                </span>
                <input
                  id={`${uid}-pw`}
                  className={`${s.input}${errors.password ? ` ${s.inputError}` : ''}`}
                  type={showPw ? 'text' : 'password'}
                  placeholder={t('auth.atLeast8Characters')}
                  value={form.password}
                  onChange={handleFieldChange('password')}
                  autoComplete="new-password"
                  aria-describedby={`${uid}-pw-strength`}
                  aria-invalid={!!errors.password}
                />
                <button
                  type="button"
                  className={s.inputToggle}
                  onClick={() => setShowPw((v) => !v)}
                  aria-label={showPw ? t('auth.hidePassword_255') : t('auth.showPassword')}
                >
                  {showPw ? <IconEyeOff size={16} /> : <IconEye size={16} />}
                </button>
              </div>

              {form.password && (
                <div className={s.strengthMeter} id={`${uid}-pw-strength`} aria-live="polite">
                  <div className={s.strengthBars} aria-hidden="true">
                    {([1, 2, 3] as const).map((n) => (
                      <div
                        key={n}
                        className={`${s.strengthBar}${strength >= n ? ` ${s.active}` : ''}`}
                        data-level={strength}
                      />
                    ))}
                  </div>
                  <span className={s.strengthLabel}>{STRENGTH_LABELS(t)[strength]}</span>
                </div>
              )}

              {errors.password && (
                <span className={s.fieldError} role="alert">
                  <span aria-hidden="true">⚠</span> {errors.password}
                </span>
              )}
            </div>

            <div className={s.field}>
              <label className={s.label} htmlFor={`${uid}-confirm`}>
                {t('auth.confirmPassword')} <span className={s.labelRequired}>*</span>
              </label>
              <div className={s.inputWrap}>
                <span className={s.inputIcon} aria-hidden="true">
                  <IconLock size={15} />
                </span>
                <input
                  id={`${uid}-confirm`}
                  className={`${s.input}${errors.confirm ? ` ${s.inputError}` : ''}`}
                  type={showConfirm ? 'text' : 'password'}
                  placeholder={t('auth.repeatYourPassword')}
                  value={form.confirm}
                  onChange={handleFieldChange('confirm')}
                  autoComplete="new-password"
                  aria-invalid={!!errors.confirm}
                />
                <button
                  type="button"
                  className={s.inputToggle}
                  onClick={() => setShowConfirm((v) => !v)}
                  aria-label={
                    showConfirm
                      ? t('auth.hidePasswordConfirmation')
                      : t('auth.showPasswordConfirmation')
                  }
                >
                  {showConfirm ? <IconEyeOff size={16} /> : <IconEye size={16} />}
                </button>
              </div>
              {errors.confirm && (
                <span className={s.fieldError} role="alert">
                  <span aria-hidden="true">⚠</span> {errors.confirm}
                </span>
              )}
            </div>

            <div className={s.field}>
              <label className={s.checkRow}>
                <input
                  type="checkbox"
                  className={s.checkboxInput}
                  checked={form.agree}
                  onChange={handleFieldChange('agree')}
                  id={`${uid}-agree`}
                  aria-invalid={!!errors.agree}
                />
                <span className={s.checkboxBox} aria-hidden="true" />
                <span className={s.checkLabel}>
                  {t('auth.iAgreeToThe')}{' '}
                  <Link href="/terms" className={s.checkLabelLink}>
                    {t('auth.termsOfUse')} </Link>{' '}
                  {t('auth.and')}{' '}
                  <Link href="/privacy" className={s.checkLabelLink}>
                    {t('auth.privacyPolicy')} </Link>
                </span>
              </label>
              {errors.agree && (
                <span className={s.fieldError} role="alert">
                  <span aria-hidden="true">⚠</span> {errors.agree}
                </span>
              )}
            </div>

            <label className={s.checkRow}>
              <input
                type="checkbox"
                className={s.checkboxInput}
                checked={form.newsletter}
                onChange={handleFieldChange('newsletter')}
                id={`${uid}-nl`}
              />
              <span className={s.checkboxBox} aria-hidden="true" />
              <span className={s.checkLabel}>
                {t('auth.sendMeNewArrivalsRestocksAndExclusive')} </span>
            </label>

            <button type="submit" className={s.submitBtn} disabled={loading} aria-busy={loading}>
              {loading ? (
                <>
                  <span className={s.spinner} aria-hidden="true" />
                  {codeRequested ? t('shop.confirming') : t('auth.sendingCode')}
                </>
              ) : codeRequested ? (
                <>{t('auth.verifyCodeAndCreateAccount')}</>
              ) : (
                <>{t('auth.sendCode')}</>
              )}
            </button>
          </form>

          <footer className={s.formFooter} />

          <div className={s.formOrnament} aria-hidden="true" />
        </div>
      </section>
    </main>
  );
}

interface FieldProps {
  id: string;
  label: string;
  required?: boolean;
  icon: string;
  type: React.HTMLInputTypeAttribute;
  placeholder: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error?: string;
  autoComplete?: string;
}

function Field({
  id,
  label,
  required,
  icon,
  type,
  placeholder,
  value,
  onChange,
  error,
  autoComplete,
}: FieldProps) {
  const { locale, t, path } = useI18n();

  return (
    <div className={s.field}>
      <label className={s.label} htmlFor={id}>
        {label}
        {required && <span className={s.labelRequired}>*</span>}
      </label>
      <div className={s.inputWrap}>
        <span className={s.inputIcon} aria-hidden="true">
          {icon}
        </span>
        <input
          id={id}
          className={`${s.input}${error ? ` ${s.inputError}` : ''}`}
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-err` : undefined}
        />
      </div>
      {error && (
        <span className={s.fieldError} id={`${id}-err`} role="alert">
          <span aria-hidden="true">⚠</span> {error}
        </span>
      )}
    </div>
  );
}

function PetalsLayer() {
  const { locale, t, path } = useI18n();

  return (
    <div className={s.petalsLayer} aria-hidden="true">
      {['✿', '❀', '✾', '❁', '✿'].map((p, i) => (
        <span key={i} className={s.petal}>
          {p}
        </span>
      ))}
    </div>
  );
}

function DecoContent() {
  const { locale, t, path } = useI18n();

  return (
    <div className={s.decoContent}>
      <div className={s.decoFrame}>
        <div className={s.decoFigure}>
          <span className={s.decoFigureIcon}>
            <IconBow size={60} strokeWidth={1} />
          </span>
          <span className={s.decoFigureLabel}>フィギュア</span>
        </div>
        <span className={s.decoBadge}>{t('auth.newArrivals')}</span>
      </div>

      <p className={s.decoEyebrow}>Skufnya</p>
      <h2 className={s.decoTitle}>
        {t('auth.yourWayTo')} <br />
        <span className={s.decoTitleAccent}>{t('auth.beautifulFigures')}</span>
      </h2>
      <p className={s.decoText}>
        {t('auth.createAnAccountToSaveYourFavorites')} </p>

      <div className={s.decoTrust} aria-hidden="true" />
    </div>
  );
}