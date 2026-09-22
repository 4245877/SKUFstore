import { getTranslator, type Translator } from '../../../i18n/translate';
import type { PublishedLocale } from '../../../i18n/locales';
import { localizeHref } from '../../../i18n/paths';
import type { Metadata } from 'next'
import Link from '../../../i18n/navigation'

import s from './TermsPage.module.css'

export default function TermsPage({ locale }: { locale: PublishedLocale }) {
  const t = getTranslator(locale);
  const path = (href: string) => localizeHref(locale, href);

  return (
    <main className={s.page}>
      <div className={s.container}>
        <section className={s.hero}>
          <p className={s.eyebrow}>Terms of Service</p>
          <h1 className={s.title}>{t('content.termsOfUse')}</h1>
          <p className={s.lead}>
            {t('content.theseTermsGovernUseOfTheSkufnya')} </p>
        </section>

        <section className={s.section}>
          <h2 className={s.sectionTitle}>{t('content.1GeneralProvisions')}</h2>
          <p className={s.text}>
            {t('content.byUsingTheWebsiteYouAgreeTo')}{' '}
            <Link href="/privacy" className={s.link}>
              {t('content.privacyPolicy_634')} </Link>
            {t('content.andTheDeliveryPaymentAndReturnTerms')} </p>
        </section>

        <section className={s.section}>
          <h2 className={s.sectionTitle}>{t('content.2UsingTheWebsite')}</h2>
          <ul className={s.list}>
            <li>{t('content.theWebsiteIsIntendedForBrowsingProducts')}</li>
            <li>{t('content.youAgreeToProvideTruthfulAccurateAnd')}</li>
            <li>{t('content.youMustNotUseTheWebsiteFor')}</li>
            <li>
              {t('content.weMayRestrictAccessToTheService')} </li>
          </ul>
        </section>

        <section className={s.section}>
          <h2 className={s.sectionTitle}>{t('content.3YourAccount')}</h2>
          <p className={s.text}>
            {t('content.registrationMayBeRequiredToAccessCertain')}{' '}
            <Link href="/contacts" className={s.link}>
              {t('content.contactsPage')} </Link>
            .
          </p>
        </section>

        <section className={s.section}>
          <h2 className={s.sectionTitle}>{t('content.4ProductsAvailabilityPricesAndFigureCharacteristics')}</h2>
          <ul className={s.list}>
            <li>{t('content.weAimToKeepProductDescriptionsPhotos')}</li>
            <li>
              {t('content.howeverSomeCharacteristicsPackagingColorsOrShades')} </li>
            <li>
              {t('content.someFiguresMayBeProducedFinishedCleaned')} </li>
            <li>
              {t('content.figuresMayHaveMinorImperfectionsOrTraces')} </li>
            <li>
              {t('content.theseMinorCharacteristicsAreNotConsideredDefects')} </li>
            <li>
              {t('content.substantialDamageSignificantChipsCracksMissingAdvertised')} </li>
            <li>
              {t('content.productAvailabilityAndTheAbilityToFulfil')} </li>
            <li>{t('content.weReserveTheRightToChangeThe')}</li>
          </ul>
        </section>

        <section className={s.section}>
          <h2 className={s.sectionTitle}>{t('content.5PlacingAnOrder')}</h2>
          <p className={s.text}>
            {t('content.afterPlacingAnOrderYouReceiveConfirmation')} </p>
        </section>

        <section className={s.section}>
          <h2 className={s.sectionTitle}>{t('content.6PaymentDeliveryPackagingAndReturns')}</h2>
          <p className={s.text}>
            {t('content.paymentDeliveryAndReturnTermsMayDepend')} </p>
          <ul className={s.list}>
            <li>
              <Link href="/payment" className={s.link}>
                {t('account.payment')} </Link>
            </li>
            <li>
              <Link href="/delivery" className={s.link}>
                {t('account.delivery')} </Link>
            </li>
            <li>
              <Link href="/returns" className={s.link}>
                {t('content.returns_659')} </Link>
            </li>
          </ul>

          <p className={s.text}>
            {t('content.weUndertakeToPrepareProtectAndPack')} </p>

          <p className={s.text}>
            {t('content.afterAProperlyPackedParcelIsHanded')} </p>

          <p className={s.text}>
            {t('content.theStoreIsNotLiableForProduct')} </p>

          <p className={s.text}>
            {t('content.theBuyerMustInspectTheParcelOn')} </p>

          <p className={s.text}>
            {t('content.wherePossibleWeHelpTheBuyerWith')} </p>
        </section>

        <section className={s.section}>
          <h2 className={s.sectionTitle}>{t('content.7IntellectualProperty')}</h2>
          <p className={s.text}>
            {t('content.theWebsiteSTextDesignLogosGraphics')} </p>
        </section>

        <section className={s.section}>
          <h2 className={s.sectionTitle}>{t('content.8LimitationOfLiability')}</h2>
          <p className={s.text}>
            {t('content.weAimToKeepTheWebsiteOperating')} </p>

          <p className={s.text}>
            {t('content.theStoreIsResponsibleForSupplyingThe')} </p>

          <p className={s.text}>
            {t('content.theStoreIsNotResponsibleForActs')} </p>

          <p className={s.text}>
            {t('content.theseLimitationsDoNotApplyWhereDamage')} </p>

          <p className={s.text}>
            {t('content.theStoreIsNotLiableForIndirect')} </p>
        </section>

        <section className={s.section}>
          <h2 className={s.sectionTitle}>{t('content.9ChangesToTheseTerms')}</h2>
          <p className={s.text}>
            {t('content.weMayUpdateTheseTermsFromTime')} </p>
        </section>

        <section className={s.section}>
          <h2 className={s.sectionTitle}>{t('content.10Contact')}</h2>
          <p className={s.text}>
            {t('content.ifYouHaveQuestionsAboutTheseTerms')}{' '}
            <Link href="/contacts" className={s.link}>
              {t('content.contactsPage')} </Link>
            .
          </p>
          <p className={s.note}>
            {t('content.byUsingTheWebsiteYouConfirmThat')} </p>
        </section>
      </div>
    </main>
  )
}