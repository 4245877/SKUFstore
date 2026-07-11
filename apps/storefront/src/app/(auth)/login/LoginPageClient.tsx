'use client';

import { useEffect, useState, useId } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
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

function getFriendlyError(error: unknown): string {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    if (message.includes('network') || message.includes('fetch')) {
      return 'Проблема з підключенням. Спробуйте ще раз.';
    }
  }
  return 'Не вдалося увійти. Перевірте електронну пошту та пароль.';
}

function getOAuthErrorMessage(code: string): string {
  switch (code) {
    case 'GOOGLE_ACCESS_DENIED':
    case 'FACEBOOK_ACCESS_DENIED':
      return 'Вхід було скасовано.';
    case 'GOOGLE_STATE_MISMATCH':
    case 'FACEBOOK_STATE_MISMATCH':
      return 'Сеанс входу застарів або був перерваний. Спробуй ще раз.';
    case 'GOOGLE_CALLBACK_INVALID':
    case 'FACEBOOK_CALLBACK_INVALID':
      return 'Не вдалося обробити відповідь від сервісу входу. Спробуй ще раз.';
    case 'GOOGLE_LOGIN_FAILED':
    case 'FACEBOOK_LOGIN_FAILED':
      return 'Не вдалося виконати вхід через соціальний акаунт. Спробуй ще раз трохи пізніше.';
    case 'FACEBOOK_EMAIL_REQUIRED':
      return 'Facebook не передав електронну пошту. Дозволь доступ до email або скористайся іншим способом входу.';
    case 'GOOGLE_EMAIL_REQUIRED':
      return 'Google не передав електронну пошту.';
    case 'GOOGLE_EMAIL_NOT_VERIFIED':
      return 'Електронну пошту Google не підтверджено.';
    default:
      return 'Не вдалося виконати вхід через соціальний акаунт.';
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
function validate(values: FormState): FieldErrors {
  const errors: FieldErrors = {};

  if (!values.email) {
    errors.email = 'Вкажіть електронну пошту';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
    errors.email = 'Введіть коректну електронну пошту';
  }

  if (!values.password) {
    errors.password = 'Вкажіть пароль';
  } else if (values.password.length < 8) {
    errors.password = 'Пароль має містити щонайменше 8 символів';
  }

  return errors;
}

/* ─────────────────────────────────────────
   Компонент
───────────────────────────────────────── */
export default function LoginPage() {
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

    setGlobalError(getOAuthErrorMessage(code));

    url.searchParams.delete('oauthError');
    window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    const next = { ...values, [name]: type === 'checkbox' ? checked : value };
    setValues(next);

    if (isValidatedField(name) && touched[name]) {
      const newErrors = validate(next);
      setErrors(prev => ({ ...prev, [name]: newErrors[name] }));
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name } = e.target;

    if (!isValidatedField(name)) return;

    setTouched(prev => ({ ...prev, [name]: true }));
    const newErrors = validate(values);
    setErrors(prev => ({ ...prev, [name]: newErrors[name] }));
  };

  const handleSocialLogin = (provider: 'google' | 'facebook') => {
    window.location.assign(
      buildOAuthStartUrl(provider, {
        returnTo,
        remember: values.remember,
      })
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ email: true, password: true });

    const newErrors = validate(values);
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
      setGlobalError(getFriendlyError(error));
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
              <span className={styles.figureLabel}>Добірні аніме-фігурки</span>
            </div>

            <div className={`${styles.chip} ${styles.chipTop}`}>
              <span className={styles.chipDot} />
              <span className={styles.chipText}>Ретельно відібране</span>
            </div>

            <div className={`${styles.chip} ${styles.chipBottom}`}>
              <span className={`${styles.chipDot} ${styles.chipDotGold}`} />
              <span className={styles.chipText}>Фігурки • мерч • подарунки</span>
            </div>
          </div>
        </div>

        <div className={styles.panelTagline}>
          <p className={styles.taglineQuote}>
            Колекціонуй зі <span className={styles.taglineQuoteAccent}>смаком</span>.
          </p>
          <p className={styles.taglineSub}>
            Добірні аніме-фігурки, колекційні речі та затишні подарунки
          </p>

          <Link href="/" className={styles.backLink}>
            <span className={styles.backArrow}>←</span>
            Назад до каталогу
          </Link>

          <div className={styles.trustRow} aria-hidden="true">
            <div className={styles.trustItem}>
              <span className={styles.trustIcon}>✦</span>
              <span>Ретельно відібраний каталог</span>
            </div>
            <div className={styles.trustItem}>
              <span className={styles.trustIcon}>♡</span>
              <span>Турбота про колекціонерів</span>
            </div>
            <div className={styles.trustItem}>
              <span className={styles.trustIcon}>✿</span>
              <span>Ніжна естетика</span>
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
            <p className={styles.formEyebrow}>Обліковий запис SKUfnya</p>
            <h1 className={styles.formTitle}>
              З поверненням <span className={styles.formTitleAccent}>назад</span>
            </h1>
            <p className={styles.formSubtitle}>
              Увійди, щоб керувати замовленнями, обраним і деталями своєї колекції.
            </p>
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
                  Електронна пошта
                </label>
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
                    Пароль
                  </label>
                  <Link href="/forgot-password" className={styles.labelHint}>
                    Забули пароль?
                  </Link>
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
                    aria-label={showPassword ? 'Приховати пароль' : 'Показати пароль'}
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
                <span className={styles.rememberLabel}>Запам’ятати цей пристрій</span>
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
                    Вхід…
                  </>
                ) : (
                  <>
                    Увійти
                    <span className={styles.submitArrow} aria-hidden="true">
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
              Увійти через Google
            </button>

            <button
              type="button"
              className={styles.submitBtn}
              onClick={() => handleSocialLogin('facebook')}
              disabled={isLoading}
            >
              Увійти через Facebook
            </button>
          </div>

          <div className={styles.divider} aria-hidden="true">
            <span className={styles.dividerLine} />
            <span className={styles.dividerText}>SKUfnya</span>
            <span className={styles.dividerLine} />
          </div>

          <p className={styles.formFooter}>
            Вперше тут?{' '}
            <Link href="/register" className={styles.formFooterLink}>
              Створити обліковий запис
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}