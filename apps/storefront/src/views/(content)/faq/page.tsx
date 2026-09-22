import { getTranslator, type Translator } from '../../../i18n/translate';
import type { PublishedLocale } from '../../../i18n/locales';
import { localizeHref } from '../../../i18n/paths';
import type { Metadata } from 'next';
import Link from '../../../i18n/navigation';

import styles from './FaqPage.module.css';

type FaqItem = {
  question: string;
  answer: string;
};

type FaqSection = {
  title: string;
  items: FaqItem[];
};

const faqSections = (t: Translator): FaqSection[] => ([
  {
    title: t('content.ordersAndProduction'),
    items: [
      {
        question: t('content.whatDoesSkufnyaSell'),
        answer:
          t('content.skufnyaMakesCustomAndCollectibleFiguresTo'),
      },
      {
        question: t('content.isTheFigureReadyAsSoonAs'),
        answer:
          t('content.afterProductionTheModelIsCleanedIts'),
      },
      {
        question: t('content.canIOrderACustomOrOriginal'),
        answer:
          t('content.yesWeCanDiscussMakingACustom'),
      },
      {
        question: t('content.canYouMakeAModelFromMy'),
        answer:
          t('content.yesIfTheFileIsSuitableFor'),
      },
      {
        question: t('content.canTheResultDifferSlightlyFromThe'),
        answer:
          t('content.yesARenderReferencePhotoAndFinished'),
      },
    ],
  },
  {
    title: t('content.qualityAssemblyAndPainting'),
    items: [
      {
        question: t('content.doYouOfferFigurePainting'),
        answer:
          t('content.artisticPaintingIsTemporarilyUnavailableOurCurrent'),
      },
      {
        question: t('content.canIRequestGluingOrAssembly'),
        answer:
          t('content.yesBasicAssemblyOrGluingCanBe'),
      },
      {
        question: t('content.willTheAssemblyBePerfect'),
        answer:
          t('content.weAimForANeatFinishBut'),
      },
      {
        question: t('content.willINeedToFinishTheModel'),
        answer:
          t('content.inMostCasesTheModelWillBe'),
      },
    ],
  },
  {
    title: t('content.paymentAndLeadTimes'),
    items: [
      {
        question: t('content.howDoesPaymentWork'),
        answer:
          t('content.paymentIsArrangedAfterWeAgreeOn'),
      },
      {
        question: t('content.canIPayDirectlyOnTheWebsite'),
        answer:
          t('content.automaticOnlinePaymentIsNotCurrentlyAvailable'),
      },
      {
        question: t('content.isAnAdvancePaymentRequired'),
        answer:
          t('content.customOrdersMayRequireAnAdvancePayment'),
      },
      {
        question: t('content.howLongDoesProductionTake'),
        answer:
          t('content.theLeadTimeDependsOnTheSize'),
      },
    ],
  },
  {
    title: t('content.deliveryAndReturns'),
    items: [
      {
        question: t('content.whichDeliveryServicesAreAvailable'),
        answer:
          t('content.withinUkraineWeOfferNovaPoshtaAnd'),
      },
      {
        question: t('content.howAreFiguresPacked'),
        answer:
          t('content.figuresArePackedCarefullyTakingFragileParts'),
      },
      {
        question: t('content.whatIfMyFigureIsDamagedIn'),
        answer:
          t('content.pleaseInspectYourParcelWhenYouReceive'),
      },
      {
        question: t('content.canIReturnACustomOrder'),
        answer:
          t('content.customOrdersMadeForASpecificBuyer'),
      },
    ],
  },
]);

export default function FaqPage({ locale }: { locale: PublishedLocale }) {
  const t = getTranslator(locale);
  const path = (href: string) => localizeHref(locale, href);

  return (
    <main className={styles.page}>
      {/* ── Hero ─────────────────────────────── */}
      <section className={styles.hero}>
        {/* lace scallop */}
        <span className={styles.laceBorder} aria-hidden="true" />

        <p className={styles.eyebrow}>{t('content.faqFrequentlyAskedQuestions')}</p>

        <h1 className={styles.title}>
          {t('content.answersToYourQuestions')}{' '}
          <span className={styles.titleAccent}>{t('content.beforeYouOrder_478')}</span>
        </h1>

        <p className={styles.lead}>
          {t('content.keyInformationAboutProductionModelPreparationPayment')} </p>
      </section>

      {/* ── Important notice ─────────────────── */}
      <section className={styles.notice} aria-label={t('content.importantInformation')}>
        <div className={styles.noticeCard}>
          <h2 className={styles.noticeTitle}>{t('content.whatToKnowBeforeOrdering')}</h2>
          <p className={styles.noticeText}>
            {t('content.skufnyaMakesFiguresToOrderArtisticPainting')} </p>
        </div>
      </section>

      {/* ── FAQ content ──────────────────────── */}
      <section className={styles.content} aria-label={t('content.frequentlyAskedQuestionsList')}>
        {faqSections(t).map((section) => (
          <article key={section.title} className={styles.section}>
            <header className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>{section.title}</h2>
            </header>

            <div className={styles.faqList}>
              {section.items.map((item) => (
                <details key={item.question} className={styles.details}>
                  <summary className={styles.summary}>
                    <span className={styles.summaryText}>{item.question}</span>
                    <span className={styles.summaryIcon} aria-hidden="true">
                      +
                    </span>
                  </summary>
                  <p className={styles.answer}>{item.answer}</p>
                </details>
              ))}
            </div>
          </article>
        ))}

        {/* ── CTA ──────────────────────────────── */}
        <section className={styles.cta} aria-label={t('content.contactUs_484')}>
          <h2 className={styles.ctaTitle}>{t('content.canTFindAnAnswer')}</h2>

          <p className={styles.ctaText}>
            {t('content.contactUsBeforePlacingYourOrderWe')} </p>

          <div className={styles.ctaActions}>
            <Link href="/contacts" className={styles.primaryLink}>
              {t('content.goToContacts')} </Link>

            <a
              href="https://t.me/SKUFnya_ua"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.secondaryLink}
            >
              {t('content.messageUsOnTelegram_488')} </a>
          </div>
        </section>
      </section>
    </main>
  );
}