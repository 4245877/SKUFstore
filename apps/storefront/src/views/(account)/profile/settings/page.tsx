'use client';
import { presentApiError } from '../../../../i18n/api-errors';

import { useI18n } from '../../../../i18n/client';
import type { Translator } from '../../../../i18n/translate';
import Link from '../../../../i18n/navigation';

import { useRouter } from '../../../../i18n/navigation';

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
  const { locale, t, path } = useI18n();

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

        setLoadError(t('account.weCouldnTLoadYourProfileSettings'));

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

        text: t('account.yourChangesHaveBeenSaved'),

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

        presentApiError(t, error);

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

          <p className={styles.loading}>{t('account.loadingSettings')}</p>

        </div>

      </main>

    );

  }

  if (!user) {

    return (

      <main className={styles.page}>

        <div className={styles.container}>

          <p className={`${styles.loading} ${styles.messageError}`}>

            {loadError || t('account.weCouldnTLoadTheSettingsPage')}

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

        <nav className={styles.breadcrumb} aria-label={t('account.navigation')}>

          <Link href="/" className={styles.breadcrumbLink}>

            {t('account.home')} </Link>

          <span className={styles.breadcrumbSep}>›</span>

          <Link href="/profile" className={styles.breadcrumbLink}>

            {t('account.profile_106')} </Link>

          <span className={styles.breadcrumbSep}>›</span>

          <span className={styles.breadcrumbCurrent}>{t('account.settings_107')}</span>

        </nav>

        <header className={styles.hero}>

          <p className={styles.eyebrow}>{t('account.profileSettings')}</p>

          <h1 className={styles.title}>{t('account.profileSettings')}</h1>

          <p className={styles.subtitle}>

            {t('account.manageYourAccountDetailsAndViewAvailable')} </p>

        </header>

        <div className={styles.layout}>

          <section className={styles.mainColumn}>

            <form className={styles.card} onSubmit={handleSubmit}>

              <div className={styles.cardHead}>

                <div>

                  <p className={styles.cardLabel}>{t('account.profile_106')}</p>

                  <h2 className={styles.cardTitle}>{t('account.basicDetails')}</h2>

                </div>

                <span className={styles.statusPill}>{t('account.accountActive')}</span>

              </div>

              <div className={styles.formGrid}>

                <label className={styles.field}>

                  <span className={styles.label}>{t('account.firstName')}</span>

                  <input

                    className={styles.input}

                    type="text"

                    value={form.firstName}

                    onChange={handleFieldChange('firstName')}

                    placeholder={t('account.enterYourFirstName')}

                    autoComplete="given-name"

                    disabled={isSaving}

                  />

                </label>

                <label className={styles.field}>

                  <span className={styles.label}>{t('account.lastName')}</span>

                  <input

                    className={styles.input}

                    type="text"

                    value={form.lastName}

                    onChange={handleFieldChange('lastName')}

                    placeholder={t('account.enterYourLastName')}

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

                  <span className={styles.label}>{t('account.phone')}</span>

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

                  {isSaving ? t('account.saving') : t('account.saveChanges')}

                </button>

                <button

                  type="button"

                  className={styles.secondaryButton}

                  onClick={handleReset}

                  disabled={!isDirty || isSaving}

                >

                  {t('account.cancel')} </button>

              </div>

            </form>

            <div className={styles.card}>

              <div className={styles.cardHead}>

                <div>

                  <p className={styles.cardLabel}>{t('account.security')}</p>

                  <h2 className={styles.cardTitle}>{t('account.security')}</h2>

                </div>

              </div>

              <div className={styles.securityGrid}>

                <div className={styles.securityItem}>

                  <div>

                    <p className={styles.securityTitle}>{t('account.password')}</p>

                    <p className={styles.securityText}>

                      {t('account.passwordChangesAreNotAvailableOnlineYet')} </p>

                  </div>

                  <button type="button" className={styles.secondaryButton} disabled>

                    {t('account.comingSoon')} </button>

                </div>

                <div className={styles.securityItem}>

                  <div>

                    <p className={styles.securityTitle}>{t('account.socialSignIn')}</p>

                    <p className={styles.securityText}>

                      {t('account.youCanSignInWithGoogleOr')} </p>

                  </div>

                  <button type="button" className={styles.secondaryButton} disabled>

                    {t('account.comingSoon')} </button>

                </div>

                <div className={styles.securityItem}>

                  <div>

                    <p className={styles.securityTitle}>{t('account.twoFactorAuthentication')}</p>

                    <p className={styles.securityText}>

                      {t('account.twoFactorAuthenticationIsNotAvailableYet')} </p>

                  </div>

                  <button type="button" className={styles.secondaryButton} disabled>

                    {t('account.comingSoon')} </button>

                </div>

              </div>

              <p className={styles.sectionNote}>

                {t('account.theseSecuritySettingsAreNotAvailableYet')} </p>

            </div>

            <div className={styles.card}>

              <div className={styles.cardHead}>

                <div>

                  <p className={styles.cardLabel}>{t('account.notifications')}</p>

                  <h2 className={styles.cardTitle}>{t('account.notifications')}</h2>

                </div>

              </div>

              <div className={styles.toggleList}>

                <label className={styles.toggleRow}>

                  <div>

                    <p className={styles.toggleTitle}>{t('account.orderUpdates')}</p>

                    <p className={styles.toggleText}>

                      {t('account.paymentDispatchAndDeliveryEmails')} </p>

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

                    <p className={styles.toggleTitle}>{t('account.offersAndNewArrivals')}</p>

                    <p className={styles.toggleText}>

                      {t('account.promotionsNewProductsAndSeasonalCollections')} </p>

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

                    <p className={styles.toggleTitle}>{t('account.favorites_137')}</p>

                    <p className={styles.toggleText}>

                      {t('account.letMeKnowWhenSavedProductsAre')} </p>

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

                    <p className={styles.toggleTitle}>{t('account.commentsAndReviews')}</p>

                    <p className={styles.toggleText}>

                      {t('account.repliesToYourReviewsAndNewArrivals')} </p>

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

                {t('account.notificationPreferencesAreNotSavedYet')} </p>

            </div>

            <div className={`${styles.card} ${styles.dangerCard}`}>

              <div className={styles.cardHead}>

                <div>

                  <p className={styles.cardLabel}>{t('account.accountDeletion')}</p>

                  <h2 className={styles.cardTitle}>{t('account.accountDeletion')}</h2>

                </div>

              </div>

              <p className={styles.dangerText}>

                {t('account.toRequestAccountDeletionFollowTheInstructions')} </p>

              <div className={styles.actions}>

                <button type="button" className={styles.dangerButton} disabled>

                  {t('account.deleteAccount')} </button>

              </div>

            </div>

          </section>

          <aside className={styles.sidebar}>

            <div className={styles.sideCard}>

              <p className={styles.sideLabel}>{t('account.quickLinks_145')}</p>

              <div className={styles.sideLinks}>

                <Link href="/profile" className={styles.sideLink}>

                  {t('account.profile_106')} </Link>

                <Link href="/profile/orders" className={styles.sideLink}>

                  {t('account.myOrders_147')} </Link>

                <Link href="/profile/addresses" className={styles.sideLink}>

                  {t('account.addresses_148')} </Link>

                <Link href="/favorites" className={styles.sideLink}>

                  {t('account.favorites_137')} </Link>

              </div>

            </div>

            <div className={styles.sideCard}>

              <p className={styles.sideLabel}>{t('account.account')}</p>

              <p className={styles.sideText}>

                {accountName}

                <br />

                {user.email}

                <br />

                {user.phone || t('account.phoneNumberNotProvided')}

              </p>

            </div>

            <div className={styles.sideCard}>

              <p className={styles.sideLabel}>{t('account.availableSettings')}</p>

              <p className={styles.sideText}>

                {t('account.youCanUpdateYourBasicProfileDetails')} </p>

            </div>

          </aside>

        </div>

      </div>

    </main>

  );

}