import { getTranslator, type Translator } from '../../../i18n/translate';
import type { PublishedLocale } from '../../../i18n/locales';
import { localizeHref } from '../../../i18n/paths';
import type { Metadata } from 'next'
import Link from '../../../i18n/navigation'

import s from './PrivacyPage.module.css'

export default function PrivacyPage({ locale }: { locale: PublishedLocale }) {
  const t = getTranslator(locale);
  const path = (href: string) => localizeHref(locale, href);

  return (
    <main className={s.page}>
      <div className={s.container}>
        <section className={s.hero}>
          <p className={s.eyebrow}>Privacy Policy</p>
          <h1 className={s.title}>{t('content.privacyPolicy')}</h1>
          <p className={s.lead}>
            {t('content.thisPageExplainsWhichPersonalDataSkufnya')} </p>
        </section>

        <section className={s.section}>
          <h2 className={s.sectionTitle}>{t('content.1DataWeMayCollect')}</h2>
          <p className={s.text}>
            {t('content.whenYouUseTheWebsiteRegisterPlace')} </p>
          <ul className={s.list}>
            <li>{t('content.yourFirstAndLastName')}</li>
            <li>{t('content.yourEmailAddress')}</li>
            <li>{t('content.yourPhoneNumber')}</li>
            <li>{t('content.yourCityDeliveryAddressAndOtherDetails')}</li>
            <li>{t('content.informationAboutOrdersPaymentsAndReturns')}</li>
            <li>{t('content.technicalDataIncludingYourIpAddressDevice')}</li>
            <li>{t('content.otherInformationYouVoluntarilyProvideInWebsite')}</li>
          </ul>
        </section>

        <section className={s.section}>
          <h2 className={s.sectionTitle}>{t('content.2HowWeUseYourData')}</h2>
          <ul className={s.list}>
            <li>{t('content.toCreateAndMaintainYourAccount')}</li>
            <li>{t('content.toProcessOrdersPaymentsDeliveriesAndRelated')}</li>
            <li>{t('content.toContactYouAboutYourOrderStatus')}</li>
            <li>{t('content.toImproveTheWebsiteSecurityAndService')}</li>
            <li>{t('content.toMeetLegalAccountingAndTaxObligations')}</li>
            <li>{t('content.toPreventFraudMisuseAndTechnicalFailures')}</li>
          </ul>
        </section>

        <section className={s.section}>
          <h2 className={s.sectionTitle}>{t('content.3WhoWeMayShareDataWith')}</h2>
          <p className={s.text}>
            {t('content.weDoNotSellPersonalDataTo')} </p>
          <ul className={s.list}>
            <li>{t('content.deliveryServicesToDispatchOrders')}</li>
            <li>{t('content.paymentServicesToProcessPayments')}</li>
            <li>{t('content.hostingTechnicalInfrastructureAndAnalyticsProviders')}</li>
            <li>{t('content.publicAuthoritiesOnlyWhereExpresslyRequiredBy')}</li>
          </ul>
        </section>

        <section className={s.section}>
          <h2 className={s.sectionTitle}>{t('content.4HowLongWeKeepData')}</h2>
          <p className={s.text}>
            {t('content.weKeepPersonalDataOnlyForAs')} </p>
        </section>

        <section className={s.section}>
          <h2 className={s.sectionTitle}>{t('content.5HowWeProtectData')}</h2>
          <p className={s.text}>
            {t('content.weUseOrganisationalAndTechnicalMeasuresTo')} </p>
        </section>

        <section className={s.section}>
          <h2 className={s.sectionTitle}>{t('content.6YourRights')}</h2>
          <p className={s.text}>{t('content.youCanContactUsToRequest')}</p>
          <ul className={s.list}>
            <li>{t('content.informationAboutHowYourDataIsProcessed')}</li>
            <li>{t('content.correctionOrUpdatingOfYourData')}</li>
            <li>{t('content.deletionOfDataWhereThisDoesNot')}</li>
            <li>{t('content.restrictionOfProcessingInCertainCircumstances')}</li>
            <li>{t('content.withdrawalOfConsentWhereProcessingIsBased')}</li>
          </ul>
        </section>

        <section className={s.section}>
          <h2 className={s.sectionTitle}>{t('content.7CookiesAndTechnicalData')}</h2>
          <p className={s.text}>
            {t('content.theWebsiteMayUseCookiesAndSimilar')} </p>
        </section>

        <section className={s.section}>
          <h2 className={s.sectionTitle}>{t('content.8PersonalDataRequests')}</h2>
          <p className={s.text}>
            {t('content.toCorrectUpdateOrDeleteYourData')}{' '}
            <Link href="/user-data-deletion" className={s.link}>
              {t('content.userDataDeletionPage')} </Link>{' '}
            {t('content.orContactUsThroughThe')}{' '}
            <Link href="/contacts" className={s.link}>
              {t('content.contactsPage')} </Link>
            .
          </p>
          <p className={s.note}>
            {t('content.byContinuingToUseTheWebsiteYou')} </p>
        </section>
      </div>
    </main>
  )
}