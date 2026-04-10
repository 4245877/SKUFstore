'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import {
  getAccountProfile,
  updateAccountProfile,
  type AccountUser,
  type UpdateAccountProfileInput,
} from '../../../../lib/api';
import styles from './ProfileSettingsPage.module.css';

type SettingsForm = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
};

type FormMessage =
  | {
      type: 'success' | 'error';
      text: string;
    }
  | null;

type NotificationSettings = {
  orderStatuses: boolean;
  promos: boolean;
  favorites: boolean;
  reviews: boolean;
};

const defaultNotifications: NotificationSettings = {
  orderStatuses: true,
  promos: false,
  favorites: true,
  reviews: false,
};

function toForm(user: AccountUser): SettingsForm {
  return {
    firstName: user.firstName ?? '',
    lastName: user.lastName ?? '',
    email: user.email ?? '',
    phone: user.phone ?? '',
  };
}

function normalizeForm(form: SettingsForm): UpdateAccountProfileInput {
  const phone = form.phone.trim();

  return {
    firstName: form.firstName.trim(),
    lastName: form.lastName.trim(),
    email: form.email.trim().toLowerCase(),
    phone: phone ? phone : null,
  };
}

export default function ProfileSettingsPage() {
  const router = useRouter();

  const [user, setUser] = useState<AccountUser | null>(null);
  const [form, setForm] = useState<SettingsForm>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
  });
  const [initialForm, setInitialForm] = useState<SettingsForm>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
  });
  const [notifications, setNotifications] =
    useState<NotificationSettings>(defaultNotifications);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [formMessage, setFormMessage] = useState<FormMessage>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      try {
        const profile = await getAccountProfile();

        if (cancelled) return;

        const nextForm = toForm(profile);

        setUser(profile);
        setForm(nextForm);
        setInitialForm(nextForm);
        setLoadError('');
      } catch (error) {
        if (cancelled) return;

        const status =
          typeof error === 'object' && error && 'status' in error
            ? (error as { status?: number }).status
            : undefined;

        if (status === 401) {
          router.replace('/login');
          return;
        }

        setLoadError('Не вдалося завантажити налаштування профілю');
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadProfile();

    return () => {
      cancelled = true;
    };
  }, [router]);

  const isDirty = useMemo(() => {
    const current = normalizeForm(form);
    const initial = normalizeForm(initialForm);

    return (
      current.firstName !== initial.firstName ||
      current.lastName !== initial.lastName ||
      current.email !== initial.email ||
      current.phone !== initial.phone
    );
  }, [form, initialForm]);

  function handleFieldChange(field: keyof SettingsForm) {
    return (event: ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => ({
        ...prev,
        [field]: event.target.value,
      }));
      setFormMessage(null);
    };
  }

  function handleReset() {
    setForm(initialForm);
    setFormMessage(null);
  }

  function toggleNotification(key: keyof NotificationSettings) {
    setNotifications((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setIsSaving(true);
    setFormMessage(null);

    try {
      const updatedUser = await updateAccountProfile(normalizeForm(form));
      const nextForm = toForm(updatedUser);

      setUser(updatedUser);
      setForm(nextForm);
      setInitialForm(nextForm);
      setFormMessage({
        type: 'success',
        text: 'Зміни успішно збережено.',
      });
    } catch (error) {
      const status =
        typeof error === 'object' && error && 'status' in error
          ? (error as { status?: number }).status
          : undefined;

      if (status === 401) {
        router.replace('/login');
        return;
      }

      const text =
        error instanceof Error ? error.message : 'Не вдалося зберегти зміни';

      setFormMessage({
        type: 'error',
        text,
      });
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <main className={styles.page}>
        <div className={styles.container}>
          <p className={styles.loading}>Завантаження налаштувань…</p>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className={styles.page}>
        <div className={styles.container}>
          <p className={`${styles.loading} ${styles.messageError}`}>
            {loadError || 'Не вдалося завантажити сторінку налаштувань.'}
          </p>
        </div>
      </main>
    );
  }

  const accountName =
    [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email;

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <nav className={styles.breadcrumb} aria-label="Навігація">
          <Link href="/" className={styles.breadcrumbLink}>
            Головна
          </Link>
          <span className={styles.breadcrumbSep}>›</span>
          <Link href="/profile" className={styles.breadcrumbLink}>
            Профіль
          </Link>
          <span className={styles.breadcrumbSep}>›</span>
          <span className={styles.breadcrumbCurrent}>Налаштування</span>
        </nav>

        <header className={styles.hero}>
          <p className={styles.eyebrow}>account settings</p>
          <h1 className={styles.title}>Налаштування профілю</h1>
          <p className={styles.subtitle}>
            Керуйте даними акаунту, сповіщеннями та безпекою.
          </p>
        </header>

        <div className={styles.layout}>
          <section className={styles.mainColumn}>
            <form className={styles.card} onSubmit={handleSubmit}>
              <div className={styles.cardHead}>
                <div>
                  <p className={styles.cardLabel}>Профіль</p>
                  <h2 className={styles.cardTitle}>Основні дані</h2>
                </div>
                <span className={styles.statusPill}>Акаунт активний</span>
              </div>

              <div className={styles.formGrid}>
                <label className={styles.field}>
                  <span className={styles.label}>Ім&apos;я</span>
                  <input
                    className={styles.input}
                    type="text"
                    value={form.firstName}
                    onChange={handleFieldChange('firstName')}
                    placeholder="Введіть ім'я"
                    autoComplete="given-name"
                    disabled={isSaving}
                  />
                </label>

                <label className={styles.field}>
                  <span className={styles.label}>Прізвище</span>
                  <input
                    className={styles.input}
                    type="text"
                    value={form.lastName}
                    onChange={handleFieldChange('lastName')}
                    placeholder="Введіть прізвище"
                    autoComplete="family-name"
                    disabled={isSaving}
                  />
                </label>

                <label className={`${styles.field} ${styles.fieldWide}`}>
                  <span className={styles.label}>Email</span>
                  <input
                    className={styles.input}
                    type="email"
                    value={form.email}
                    onChange={handleFieldChange('email')}
                    placeholder="name@example.com"
                    autoComplete="email"
                    disabled={isSaving}
                  />
                </label>

                <label className={`${styles.field} ${styles.fieldWide}`}>
                  <span className={styles.label}>Телефон</span>
                  <input
                    className={styles.input}
                    type="tel"
                    value={form.phone}
                    onChange={handleFieldChange('phone')}
                    placeholder="+380 XX XXX XX XX"
                    autoComplete="tel"
                    disabled={isSaving}
                  />
                </label>
              </div>

              {formMessage && (
                <p
                  className={`${styles.message} ${
                    formMessage.type === 'error'
                      ? styles.messageError
                      : styles.messageSuccess
                  }`}
                  aria-live="polite"
                >
                  {formMessage.text}
                </p>
              )}

              <div className={styles.actions}>
                <button
                  type="submit"
                  className={styles.primaryButton}
                  disabled={!isDirty || isSaving}
                >
                  {isSaving ? 'Збереження…' : 'Зберегти зміни'}
                </button>
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={handleReset}
                  disabled={!isDirty || isSaving}
                >
                  Скасувати
                </button>
              </div>
            </form>

            <div className={styles.card}>
              <div className={styles.cardHead}>
                <div>
                  <p className={styles.cardLabel}>Security</p>
                  <h2 className={styles.cardTitle}>Безпека</h2>
                </div>
              </div>

              <div className={styles.securityGrid}>
                <div className={styles.securityItem}>
                  <div>
                    <p className={styles.securityTitle}>Пароль</p>
                    <p className={styles.securityText}>
                      Зміна пароля потребує окремого auth-flow на бекенді.
                    </p>
                  </div>
                  <button type="button" className={styles.secondaryButton} disabled>
                    Скоро
                  </button>
                </div>

                <div className={styles.securityItem}>
                  <div>
                    <p className={styles.securityTitle}>Вхід через соцмережі</p>
                    <p className={styles.securityText}>
                      Google і Facebook можна підключити окремо, коли буде готовий OAuth UI.
                    </p>
                  </div>
                  <button type="button" className={styles.secondaryButton} disabled>
                    Скоро
                  </button>
                </div>

                <div className={styles.securityItem}>
                  <div>
                    <p className={styles.securityTitle}>Двофакторна аутентифікація</p>
                    <p className={styles.securityText}>
                      Для 2FA потрібні окремі таблиці, коди та підтвердження входу.
                    </p>
                  </div>
                  <button type="button" className={styles.secondaryButton} disabled>
                    Скоро
                  </button>
                </div>
              </div>

              <p className={styles.sectionNote}>
                Цей блок поки чесно відображається як майбутня функціональність.
              </p>
            </div>

            <div className={styles.card}>
              <div className={styles.cardHead}>
                <div>
                  <p className={styles.cardLabel}>Notifications</p>
                  <h2 className={styles.cardTitle}>Сповіщення</h2>
                </div>
              </div>

              <div className={styles.toggleList}>
                <label className={styles.toggleRow}>
                  <div>
                    <p className={styles.toggleTitle}>Статуси замовлень</p>
                    <p className={styles.toggleText}>
                      Листи про оплату, відправку і доставку.
                    </p>
                  </div>
                  <input
                    className={styles.toggle}
                    type="checkbox"
                    checked={notifications.orderStatuses}
                    onChange={() => toggleNotification('orderStatuses')}
                  />
                </label>

                <label className={styles.toggleRow}>
                  <div>
                    <p className={styles.toggleTitle}>Знижки і новинки</p>
                    <p className={styles.toggleText}>
                      Акції, нові надходження і сезонні добірки.
                    </p>
                  </div>
                  <input
                    className={styles.toggle}
                    type="checkbox"
                    checked={notifications.promos}
                    onChange={() => toggleNotification('promos')}
                  />
                </label>

                <label className={styles.toggleRow}>
                  <div>
                    <p className={styles.toggleTitle}>Обране</p>
                    <p className={styles.toggleText}>
                      Повідомляти, коли збережені товари знову у наявності.
                    </p>
                  </div>
                  <input
                    className={styles.toggle}
                    type="checkbox"
                    checked={notifications.favorites}
                    onChange={() => toggleNotification('favorites')}
                  />
                </label>

                <label className={styles.toggleRow}>
                  <div>
                    <p className={styles.toggleTitle}>Коментарі та відгуки</p>
                    <p className={styles.toggleText}>
                      Відповіді на ваші відгуки та нові надходження серії.
                    </p>
                  </div>
                  <input
                    className={styles.toggle}
                    type="checkbox"
                    checked={notifications.reviews}
                    onChange={() => toggleNotification('reviews')}
                  />
                </label>
              </div>

              <p className={styles.sectionNote}>
                Поки це локальний UI. Щоб зберігати сповіщення, краще додати окремі
                `user_settings` або JSON-поле в профіль.
              </p>
            </div>

            <div className={`${styles.card} ${styles.dangerCard}`}>
              <div className={styles.cardHead}>
                <div>
                  <p className={styles.cardLabel}>Danger zone</p>
                  <h2 className={styles.cardTitle}>Небезпечна зона</h2>
                </div>
              </div>

              <p className={styles.dangerText}>
                Видалення акаунту ще не підключене до бекенду. Кнопку краще не
                активувати, доки не буде окремого підтвердження, soft-delete або
                фонової очистки даних.
              </p>

              <div className={styles.actions}>
                <button type="button" className={styles.dangerButton} disabled>
                  Видалити акаунт
                </button>
              </div>
            </div>
          </section>

          <aside className={styles.sidebar}>
            <div className={styles.sideCard}>
              <p className={styles.sideLabel}>Швидкі переходи</p>
              <div className={styles.sideLinks}>
                <Link href="/profile" className={styles.sideLink}>
                  Профіль
                </Link>
                <Link href="/profile/orders" className={styles.sideLink}>
                  Мої замовлення
                </Link>
                <Link href="/profile/addresses" className={styles.sideLink}>
                  Адреси
                </Link>
                <Link href="/favorites" className={styles.sideLink}>
                  Обране
                </Link>
              </div>
            </div>

            <div className={styles.sideCard}>
              <p className={styles.sideLabel}>Акаунт</p>
              <p className={styles.sideText}>
                {accountName}
                <br />
                {user.email}
                <br />
                {user.phone || 'Телефон не вказано'}
              </p>
            </div>

            <div className={styles.sideCard}>
              <p className={styles.sideLabel}>Статус інтеграції</p>
              <p className={styles.sideText}>
                Уже підключено завантаження і збереження основних даних профілю.
                Безпека, 2FA, OAuth і серверні налаштування сповіщень — наступний крок.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}