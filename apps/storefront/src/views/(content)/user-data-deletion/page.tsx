import { getTranslator, type Translator } from '../../../i18n/translate';
import type { PublishedLocale } from '../../../i18n/locales';
import { localizeHref } from '../../../i18n/paths';
import type { Metadata } from 'next'
import Link from '../../../i18n/navigation'

import s from './UserDataDeletionPage.module.css'

export default function UserDataDeletionPage({ locale }: { locale: PublishedLocale }) {
  const t = getTranslator(locale);
  const path = (href: string) => localizeHref(locale, href);

  return (
    <main className={s.page}>
      <div className={s.container}>
        <section className={s.hero}>
          <p className={s.eyebrow}>{t('content.userDataDeletion')}</p>
          <h1 className={s.title}>{t('content.userDataDeletion')}</h1>
          <p className={s.lead}>
            {t('content.ifYouWantToDeletePersonalData')} </p>
        </section>

        <section className={s.section}>
          <h2 className={s.sectionTitle}>{t('content.1HowToSubmitARequest')}</h2>
          <p className={s.text}>
            {t('content.toRequestDataDeletionPleaseContactUs')}{' '}
            <Link href="/contacts" className={s.link}>
              {t('content.contactsPage')} </Link>
            .
          </p>
          <p className={s.text}>
            {t('content.inTheSubjectLineOrMessageWrite')} <strong>{t('content.personalDataDeletion')}</strong>.
          </p>
        </section>

        <section className={s.section}>
          <h2 className={s.sectionTitle}>{t('content.2InformationToInclude')}</h2>
          <p className={s.text}>{t('content.toHelpUsLocateYourDataAnd')}</p>
          <ul className={s.list}>
            <li>{t('content.yourFirstAndLastName')}</li>
            <li>{t('content.theEmailAddressUsedForYourAccount')}</li>
            <li>{t('content.yourPhoneNumberIfLinkedToYour')}</li>
            <li>{t('content.yourOrderNumberIfTheRequestConcerns')}</li>
            <li>{t('content.anyDetailsAboutWhichDataYouWant')}</li>
          </ul>
        </section>

        <section className={s.section}>
          <h2 className={s.sectionTitle}>{t('content.3DataThatMayBeDeleted')}</h2>
          <ul className={s.list}>
            <li>{t('content.userProfileData')}</li>
            <li>{t('content.contactDetailsThatWeAreNotLegally')}</li>
            <li>{t('content.enquiryHistoryAndTechnicalDataThatNo')}</li>
            <li>{t('content.otherPersonalDataThatAreNoLonger')}</li>
          </ul>
        </section>

        <section className={s.section}>
          <h2 className={s.sectionTitle}>{t('content.4DataWeMayRetainAfterA')}</h2>
          <p className={s.text}>
            {t('content.inSomeCasesWeCannotDeleteAll')} </p>
          <ul className={s.list}>
            <li>{t('content.toMeetLegalObligations')}</li>
            <li>{t('content.forAccountingTaxOrFinancialRecords')}</li>
            <li>{t('content.toVerifyCompletedTransactionsReturnsOrDisputes')}</li>
            <li>{t('content.toMaintainSecurityAndPreventFraud')}</li>
          </ul>
          <p className={s.text}>
            {t('content.inTheseCasesProcessingMayBeRestricted')} </p>
        </section>

        <section className={s.section}>
          <h2 className={s.sectionTitle}>{t('content.5RequestProcessingTime')}</h2>
          <p className={s.text}>
            {t('content.weReviewDataDeletionRequestsWithinA')} </p>
        </section>

        <section className={s.section}>
          <h2 className={s.sectionTitle}>{t('content.6FurtherInformation')}</h2>
          <p className={s.text}>
            {t('content.ifYourRequestConcernsCorrectingUpdatingOr')}{' '}
            <Link href="/privacy" className={s.link}>
              {t('content.privacyPolicy_634')} </Link>
            .
          </p>
          <p className={s.note}>
            {t('content.weTreatPersonalDataWithCareAnd')} </p>
        </section>
      </div>
    </main>
  )
}