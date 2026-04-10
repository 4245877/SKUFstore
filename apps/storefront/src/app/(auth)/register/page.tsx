'use client';

import { useEffect, useState, useId } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiFetch, buildOAuthStartUrl } from '../../../lib/api';
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

const STRENGTH_LABELS: Record<StrengthLevel, string> = {
  0: '',
  1: 'Слабкий',
  2: 'Добрий',
  3: 'Сильний',
};

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
      return 'Не вдалося виконати реєстрацію через соціальний акаунт. Спробуй ще раз трохи пізніше.';
    case 'FACEBOOK_EMAIL_REQUIRED':
      return 'Facebook не передав електронну пошту. Дозволь доступ до email або скористайся іншим способом входу.';
    case 'GOOGLE_EMAIL_REQUIRED':
      return 'Google не передав електронну пошту.';
    case 'GOOGLE_EMAIL_NOT_VERIFIED':
      return 'Електронну пошту Google не підтверджено.';
    default:
      return 'Не вдалося виконати реєстрацію через соціальний акаунт.';
  }
}

export default function RegisterPage() {
  const uid = useId();
  const router = useRouter();

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    username: '',
    password: '',
    confirm: '',
    agree: false,
    newsletter: false,
  });

  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const url = new URL(window.location.href);
    const code = url.searchParams.get('oauthError');
    if (!code) return;

    setGlobalError(getOAuthErrorMessage(code));

    url.searchParams.delete('oauthError');
    window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
  }, []);

  const strength = passwordStrength(form.password);

  const handleFieldChange =
    (key: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value =
        e.target.type === 'checkbox' ? e.target.checked : e.target.value;

      setForm(prev => ({ ...prev, [key]: value }));

      if (errors[key]) {
        setErrors(prev => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
      }
    };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};

    if (!form.firstName.trim()) errs.firstName = "Ім'я є обов’язковим";
    if (!form.lastName.trim()) errs.lastName = "Прізвище є обов’язковим";

    if (!form.email.trim()) errs.email = 'Електронна пошта є обов’язковою';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errs.email = 'Невірна адреса електронної пошти';
    }

    if (!form.username.trim()) errs.username = "Ім'я користувача є обов’язковим";
    else if (form.username.length < 3) errs.username = 'Мінімум 3 символи';

    if (!form.password) errs.password = 'Пароль є обов’язковим';
    else if (form.password.length < 8) errs.password = 'Мінімум 8 символів';

    if (form.password !== form.confirm) errs.confirm = 'Паролі не збігаються';
    if (!form.agree) errs.agree = 'Ти маєш прийняти умови';

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGlobalError('');

    if (!validate()) return;

    setLoading(true);

    try {
      await apiFetch<{ user: unknown }>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          firstName: form.firstName,
          lastName: form.lastName,
          username: form.username,
          email: form.email,
          password: form.password,
          remember: true,
        }),
      });

      router.push('/profile');
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Щось пішло не так. Будь ласка, спробуй ще раз.';

      setGlobalError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleSocialRegister = (provider: 'google' | 'facebook') => {
    window.location.assign(
      buildOAuthStartUrl(provider, {
        returnTo: '/profile',
        remember: true,
      })
    );
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
            Назад до магазину
          </Link>

          <header className={s.formHeader}>
            <p className={s.formEyebrow}>Приєднуйся до Skufnya</p>
            <h1 className={s.formTitle}>
              Створи свій <span className={s.formTitleAccent}>акаунт</span>
            </h1>
            <p className={s.formSubtitle}>
              Уже маєш акаунт?{' '}
              <Link href="/login" className={s.formSubtitleLink}>
                Увійди тут
              </Link>
            </p>
          </header>

          <div style={{ display: 'grid', gap: 12, marginBottom: 20 }}>
            <button
              type="button"
              className={s.submitBtn}
              onClick={() => handleSocialRegister('google')}
              disabled={loading}
            >
              Продовжити через Google
            </button>

            <button
              type="button"
              className={s.submitBtn}
              onClick={() => handleSocialRegister('facebook')}
              disabled={loading}
            >
              Продовжити через Facebook
            </button>
          </div>

          <div className={s.divider} role="separator">
            Реєстрація через електронну пошту
          </div>

          {globalError && (
            <div className={s.alertError} role="alert">
              <span className={s.alertIcon}>⚠️</span>
              {globalError}
            </div>
          )}

          <form
            className={s.form}
            onSubmit={handleSubmit}
            noValidate
            aria-label="Форма реєстрації"
          >
            <div className={s.fieldRow}>
              <Field
                id={`${uid}-fn`}
                label="Ім’я"
                required
                icon="✦"
                type="text"
                placeholder="Сакура"
                value={form.firstName}
                onChange={handleFieldChange('firstName')}
                error={errors.firstName}
                autoComplete="given-name"
              />
              <Field
                id={`${uid}-ln`}
                label="Прізвище"
                required
                icon="✦"
                type="text"
                placeholder="Танака"
                value={form.lastName}
                onChange={handleFieldChange('lastName')}
                error={errors.lastName}
                autoComplete="family-name"
              />
            </div>

            <Field
              id={`${uid}-email`}
              label="Електронна пошта"
              required
              icon="✉"
              type="email"
              placeholder="sakura@example.com"
              value={form.email}
              onChange={handleFieldChange('email')}
              error={errors.email}
              autoComplete="email"
            />

            <Field
              id={`${uid}-user`}
              label="Ім’я користувача"
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
                Пароль <span className={s.labelRequired}>*</span>
              </label>
              <div className={s.inputWrap}>
                <span className={s.inputIcon} aria-hidden="true">
                  🔒
                </span>
                <input
                  id={`${uid}-pw`}
                  className={`${s.input}${errors.password ? ` ${s.inputError}` : ''}`}
                  type={showPw ? 'text' : 'password'}
                  placeholder="Мінімум 8 символів"
                  value={form.password}
                  onChange={handleFieldChange('password')}
                  autoComplete="new-password"
                  aria-describedby={`${uid}-pw-strength`}
                  aria-invalid={!!errors.password}
                />
                <button
                  type="button"
                  className={s.inputToggle}
                  onClick={() => setShowPw(v => !v)}
                  aria-label={showPw ? 'Сховати пароль' : 'Показати пароль'}
                >
                  {showPw ? '🙈' : '👁'}
                </button>
              </div>

              {form.password && (
                <div
                  className={s.strengthMeter}
                  id={`${uid}-pw-strength`}
                  aria-live="polite"
                >
                  <div className={s.strengthBars} aria-hidden="true">
                    {([1, 2, 3] as const).map(n => (
                      <div
                        key={n}
                        className={`${s.strengthBar}${strength >= n ? ` ${s.active}` : ''}`}
                        data-level={strength}
                      />
                    ))}
                  </div>
                  <span className={s.strengthLabel}>{STRENGTH_LABELS[strength]}</span>
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
                Підтверди пароль <span className={s.labelRequired}>*</span>
              </label>
              <div className={s.inputWrap}>
                <span className={s.inputIcon} aria-hidden="true">
                  🔒
                </span>
                <input
                  id={`${uid}-confirm`}
                  className={`${s.input}${errors.confirm ? ` ${s.inputError}` : ''}`}
                  type={showConfirm ? 'text' : 'password'}
                  placeholder="Повтори пароль"
                  value={form.confirm}
                  onChange={handleFieldChange('confirm')}
                  autoComplete="new-password"
                  aria-invalid={!!errors.confirm}
                />
                <button
                  type="button"
                  className={s.inputToggle}
                  onClick={() => setShowConfirm(v => !v)}
                  aria-label={
                    showConfirm
                      ? 'Сховати підтвердження пароля'
                      : 'Показати підтвердження пароля'
                  }
                >
                  {showConfirm ? '🙈' : '👁'}
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
                  Я погоджуюся з{' '}
                  <Link href="/terms" className={s.checkLabelLink}>
                    Умовами користування
                  </Link>{' '}
                  та{' '}
                  <Link href="/privacy" className={s.checkLabelLink}>
                    Політикою конфіденційності
                  </Link>
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
                Надсилайте мені новинки, поповнення асортименту та ексклюзивні
                пропозиції 🌸
              </span>
            </label>

            <button
              type="submit"
              className={s.submitBtn}
              disabled={loading}
              aria-busy={loading}
            >
              {loading ? (
                <>
                  <span className={s.spinner} aria-hidden="true" />
                  Створення акаунта…
                </>
              ) : (
                <>Створити акаунт ✦</>
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
  return (
    <div className={s.petalsLayer} aria-hidden="true">
      {['🌸', '🌺', '🌸', '🌷', '🌸'].map((p, i) => (
        <span key={i} className={s.petal}>
          {p}
        </span>
      ))}
    </div>
  );
}

function DecoContent() {
  return (
    <div className={s.decoContent}>
      <div className={s.decoFrame}>
        <div className={s.decoFigure}>
          <span className={s.decoFigureIcon}>🎀</span>
          <span className={s.decoFigureLabel}>フィギュア</span>
        </div>
        <span className={s.decoBadge}>Нові надходження</span>
      </div>

      <p className={s.decoEyebrow}>Skufnya</p>
      <h2 className={s.decoTitle}>
        Твій шлях до
        <br />
        <span className={s.decoTitleAccent}>преміальних фігурок</span>
      </h2>
      <p className={s.decoText}>
        Створи акаунт, щоб зберігати улюблене, відстежувати замовлення та
        керувати своїм профілем.
      </p>

      <div className={s.decoTrust} aria-hidden="true" />
    </div>
  );
}