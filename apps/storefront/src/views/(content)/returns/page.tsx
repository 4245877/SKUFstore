import { getTranslator, type Translator } from '../../../i18n/translate';
import type { PublishedLocale } from '../../../i18n/locales';
import { localizeHref } from '../../../i18n/paths';
import Link from '../../../i18n/navigation';
import type { Metadata } from 'next';

import styles from './Returns.module.css';

export default function ReturnsPage({ locale }: { locale: PublishedLocale }) {
  const t = getTranslator(locale);
  const path = (href: string) => localizeHref(locale, href);

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroBg} aria-hidden="true">
          <span className={styles.heroBgCircle} />
          <span className={styles.heroBgCircle} />
        </div>

        <div className={styles.heroInner}>
          <div className={styles.heroText}>
            <nav className={styles.breadcrumb} aria-label={t('account.navigation')}>
              <Link href="/">SKUFNYA</Link>
              <span className={styles.breadcrumbSep}>/</span>
              <span>{t('content.returnsAndExchanges')}</span>
            </nav>

            <p className={styles.heroEyebrow}>{t('content.returnsAndExchanges')}</p>

            <h1 className={styles.heroTitle}>
              {t('content.termsFor')}{' '}
              <span className={styles.heroTitleAccent}>{t('content.returns')}</span> {t('content.andExchanges')} </h1>

            <p className={styles.heroLead}>
              {t('content.returnsHeroLead')} </p>
          </div>

          <div className={styles.heroBadgeGroup} aria-label={t('content.atAGlance')}>
            <div className={styles.heroBadge}>
              <span className={styles.heroBadgeIcon} aria-hidden="true">
                ✧
              </span>
              <span className={styles.heroBadgeText}>
                <span className={styles.heroBadgeLabel}>{t('content.returnsBadgeProductionLabel')}</span>
                <span className={styles.heroBadgeValue}>{t('content.returnsBadgeProductionValue')}</span>
              </span>
            </div>

            <div className={styles.heroBadge}>
              <span className={styles.heroBadgeIcon} aria-hidden="true">
                ※
              </span>
              <span className={styles.heroBadgeText}>
                <span className={styles.heroBadgeLabel}>{t('content.returnsBadgeQualityLabel')}</span>
                <span className={styles.heroBadgeValue}>{t('content.returnsBadgeQualityValue')}</span>
              </span>
            </div>

            <div className={styles.heroBadge}>
              <span className={styles.heroBadgeIcon} aria-hidden="true">
                ✓
              </span>
              <span className={styles.heroBadgeText}>
                <span className={styles.heroBadgeLabel}>{t('content.returnsBadgeDefectLabel')}</span>
                <span className={styles.heroBadgeValue}>{t('content.returnsBadgeDefectValue')}</span>
              </span>
            </div>
          </div>
        </div>
      </section>

      <main className={styles.main}>
        <div className={styles.content}>
          <section className={styles.sectionCard}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionIcon} aria-hidden="true">
                01
              </span>
              <h2 className={styles.sectionTitle}>{t('content.returnsHowMadeTitle')}</h2>
            </div>

            <div className={styles.sectionBody}>
              <p>
                {t('content.returnsHowMadeText')} </p>

              <div className={styles.conditionsList}>
                <span className={styles.conditionPill}>
                  <span className={styles.conditionPillCheck}>✓</span>
                  {t('content.returnsPillNoStock')} </span>
                <span className={styles.conditionPill}>
                  <span className={styles.conditionPillCheck}>✓</span>
                  {t('content.returnsPillMadeAfterOrder')} </span>
                <span className={styles.conditionPill}>
                  <span className={styles.conditionPillCheck}>✓</span>
                  {t('content.returnsPillIndividualSpec')} </span>
                <span className={styles.conditionPill}>
                  <span className={styles.conditionPillCheck}>✓</span>
                  {t('content.returnsPillHandFinished')} </span>
              </div>
            </div>
          </section>

          <section className={styles.sectionCard}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionIcon} aria-hidden="true">
                02
              </span>
              <h2 className={styles.sectionTitle}>
                {t('content.returnsNotAvailableTitle')} </h2>
            </div>

            <div className={styles.sectionBody}>
              <p>
                {t('content.returnsNotAvailableText')} </p>

              <div className={styles.infoBox}>
                <span className={styles.infoBoxIcon} aria-hidden="true">
                  §
                </span>
                <p className={styles.infoBoxText}>
                  <strong>{t('content.returnsLegalBasisLabel')}</strong>{' '}
                  {t('content.returnsNotAvailableLegalBasis')} </p>
              </div>
            </div>
          </section>

          <section className={styles.sectionCard}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionIcon} aria-hidden="true">
                03
              </span>
              <h2 className={styles.sectionTitle}>{t('content.returnsNotDefectTitle')}</h2>
            </div>

            <div className={styles.sectionBody}>
              <p>
                {t('content.returnsNotDefectText')} </p>
            </div>
          </section>

          <section className={styles.sectionCard}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionIcon} aria-hidden="true">
                04
              </span>
              <h2 className={styles.sectionTitle}>{t('content.returnsAcceptedTitle')}</h2>
            </div>

            <div className={styles.sectionBody}>
              <p>
                {t('content.returnsAcceptedIntro')} </p>

              <ul className={styles.stepsList}>
                <li className={styles.stepsItem}>
                  <span className={styles.stepsNum} aria-hidden="true">✓</span>
                  <span className={styles.stepsText}>{t('content.returnsAcceptedItemDefect')}</span>
                </li>

                <li className={styles.stepsItem}>
                  <span className={styles.stepsNum} aria-hidden="true">✓</span>
                  <span className={styles.stepsText}>{t('content.returnsAcceptedItemDamage')}</span>
                </li>

                <li className={styles.stepsItem}>
                  <span className={styles.stepsNum} aria-hidden="true">✓</span>
                  <span className={styles.stepsText}>{t('content.returnsAcceptedItemWrongItem')}</span>
                </li>

                <li className={styles.stepsItem}>
                  <span className={styles.stepsNum} aria-hidden="true">✓</span>
                  <span className={styles.stepsText}>{t('content.returnsAcceptedItemMismatch')}</span>
                </li>

                <li className={styles.stepsItem}>
                  <span className={styles.stepsNum} aria-hidden="true">✓</span>
                  <span className={styles.stepsText}>{t('content.returnsAcceptedItemMissingParts')}</span>
                </li>
              </ul>

              <div className={styles.infoBox}>
                <span className={styles.infoBoxIcon} aria-hidden="true">
                  §
                </span>
                <p className={styles.infoBoxText}>
                  <strong>{t('content.returnsLegalBasisLabel')}</strong>{' '}
                  {t('content.returnsAcceptedLegalBasis')} </p>
              </div>
            </div>
          </section>

          <section className={styles.sectionCard}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionIcon} aria-hidden="true">
                05
              </span>
              <h2 className={styles.sectionTitle}>{t('content.returnsCancelTitle')}</h2>
            </div>

            <div className={styles.sectionBody}>
              <p>
                {t('content.returnsCancelText')} </p>
            </div>
          </section>

          <section className={styles.sectionCard}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionIcon} aria-hidden="true">
                06
              </span>
              <h2 className={styles.sectionTitle}>{t('content.howToMakeARequest')}</h2>
            </div>

            <div className={styles.sectionBody}>
              <ol className={styles.stepsList}>
                <li className={styles.stepsItem}>
                  <span className={styles.stepsNum}>1</span>
                  <span className={styles.stepsText}>
                    {t('content.emailUsAt')}{' '}
                    <a className={styles.inlineLink} href="mailto:skufnya@gmail.com">
                      email
                    </a>
                    {t('content.messageUsOn')}{' '}
                    <a
                      className={styles.inlineLink}
                      href="https://t.me/SKUFnya_ua"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Telegram
                    </a>{' '}
                    {t('content.orViber')} </span>
                </li>

                <li className={styles.stepsItem}>
                  <span className={styles.stepsNum}>2</span>
                  <span className={styles.stepsText}>
                    {t('content.includeYourOrderNumberYourNameAnd')} </span>
                </li>

                <li className={styles.stepsItem}>
                  <span className={styles.stepsNum}>3</span>
                  <span className={styles.stepsText}>
                    {t('content.attachPhotosOfTheProductAndPackaging')} </span>
                </li>

                <li className={styles.stepsItem}>
                  <span className={styles.stepsNum}>4</span>
                  <span className={styles.stepsText}>
                    {t('content.waitForConfirmationFromOurTeamBefore_602')} </span>
                </li>
              </ol>
            </div>
          </section>

          <section className={styles.sectionCard}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionIcon} aria-hidden="true">
                07
              </span>
              <h2 className={styles.sectionTitle}>
                {t('content.returnDelivery')} </h2>
            </div>

            <div className={styles.sectionBody}>
              <p>
                {t('content.returnsDeliveryCostsText')} </p>
            </div>
          </section>

          <section className={styles.sectionCard}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionIcon} aria-hidden="true">
                08
              </span>
              <h2 className={styles.sectionTitle}>{t('content.refunds')}</h2>
            </div>

            <div className={styles.sectionBody}>
              <p>
                {t('content.returnsRefundText')} </p>
            </div>
          </section>

          <section className={styles.sectionCard}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionIcon} aria-hidden="true">
                09
              </span>
              <h2 className={styles.sectionTitle}>{t('content.contactUsAboutAReturn')}</h2>
            </div>

            <div className={styles.sectionBody}>
              <p>
                Email:{' '}
                <a className={styles.inlineLink} href="mailto:skufnya@gmail.com">
                  skufnya@gmail.com
                </a>
                <br />
                Telegram:{' '}
                <a
                  className={styles.inlineLink}
                  href="https://t.me/SKUFnya_ua"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  @SKUFnya_ua
                </a>
                <br />
                Viber:{' '}
                <a
                  className={styles.inlineLink}
                  href="viber://chat?number=%2B380938213102"
                >
                  +380 93 821 31 02
                </a>
              </p>
            </div>
          </section>
        </div>

        <aside className={styles.sidebar} aria-label={t('content.additionalInformation')}>
          <section className={styles.contactCard}>
            <p className={styles.contactCardLabel}>{t('content.help')}</p>

            <h2 className={styles.contactCardTitle}>
              {t('content.contactUsIfYouNeed')} <em>{t('content.help_611')}</em>
            </h2>

            <p className={styles.contactCardDesc}>
              {t('content.weLlExplainHowToSubmitYour')} </p>

            <div className={styles.contactLinks}>
              <a className={styles.contactLink} href="mailto:skufnya@gmail.com">
                <span className={styles.contactLinkIcon} aria-hidden="true">
                  ✉
                </span>
                <span className={styles.contactLinkText}>
                  skufnya@gmail.com
                </span>
                <span className={styles.contactLinkArrow} aria-hidden="true">
                  →
                </span>
              </a>

              <a
                className={styles.contactLink}
                href="https://t.me/SKUFnya_ua"
                target="_blank"
                rel="noopener noreferrer"
              >
                <span className={styles.contactLinkIcon} aria-hidden="true">
                  ◇
                </span>
                <span className={styles.contactLinkText}>@SKUFnya_ua</span>
                <span className={styles.contactLinkArrow} aria-hidden="true">
                  →
                </span>
              </a>

              <a
                className={styles.contactLink}
                href="viber://chat?number=%2B380938213102"
              >
                <span className={styles.contactLinkIcon} aria-hidden="true">
                  ☎
                </span>
                <span className={styles.contactLinkText}>
                  +380 93 821 31 02
                </span>
                <span className={styles.contactLinkArrow} aria-hidden="true">
                  →
                </span>
              </a>
            </div>
          </section>

          <section className={styles.timelineCard} aria-label={t('content.returnProcess')}>
            <p className={styles.timelineCardLabel}>{t('content.process')}</p>

            <div className={styles.timeline}>
              <div className={styles.timelineItem}>
                <div className={styles.timelineTrack}>
                  <span
                    className={`${styles.timelineDot} ${styles.timelineDotActive}`}
                  >
                    1
                  </span>
                </div>
                <div className={styles.timelineContent}>
                  <p className={styles.timelineStep}>{t('content.contact')}</p>
                  <p className={styles.timelineDesc}>
                    {t('content.contactUsWithABriefDescriptionOf')} </p>
                </div>
              </div>

              <div className={styles.timelineItem}>
                <div className={styles.timelineTrack}>
                  <span className={styles.timelineDot}>2</span>
                </div>
                <div className={styles.timelineContent}>
                  <p className={styles.timelineStep}>{t('content.review')}</p>
                  <p className={styles.timelineDesc}>
                    {t('content.ourTeamWillClarifyTheDetailsAnd')} </p>
                </div>
              </div>

              <div className={styles.timelineItem}>
                <div className={styles.timelineTrack}>
                  <span className={styles.timelineDot}>3</span>
                </div>
                <div className={styles.timelineContent}>
                  <p className={styles.timelineStep}>{t('content.resolution')}</p>
                  <p className={styles.timelineDesc}>
                    {t('content.returnsTimelineResolutionText')} </p>
                </div>
              </div>
            </div>
          </section>

          <section className={styles.policyNote} aria-label={t('content.noteOnReturnTerms')}>
            <span className={styles.policyNoteIcon} aria-hidden="true">
              ※
            </span>
            <p className={styles.policyNoteText}>
              <strong>{t('content.lastUpdated')}</strong> {t('content.returnsLastUpdatedValue')} </p>
          </section>
        </aside>
      </main>

      <footer className={styles.pageFooter}>
        <div className={styles.pageFooterInner}>
          <p className={styles.pageFooterText}>
            <strong>SKUFNYA</strong> {t('content.returnsAndExchanges_624')} </p>

          <nav className={styles.pageFooterNav} aria-label={t('content.footerNavigation')}>
            <Link className={styles.pageFooterLink} href="/">
              {t('content.backToHome')} </Link>
            <a className={styles.pageFooterLink} href="mailto:skufnya@gmail.com">
              {t('content.contactUs_627')} </a>
          </nav>
        </div>
      </footer>
    </div>
  );
}