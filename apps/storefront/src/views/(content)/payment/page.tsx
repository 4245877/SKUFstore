import { getTranslator, type Translator } from '../../../i18n/translate';
import type { PublishedLocale } from '../../../i18n/locales';
import { localizeHref } from '../../../i18n/paths';
import Link from '../../../i18n/navigation';
import {
  IconBow,
  IconBox,
  IconCard,
  IconCart,
  IconChatHeart,
  IconClipboard,
  IconReceipt,
  IconShieldCheck,
} from '../../../components/icons';
import s from './PaymentPage.module.css';

const TELEGRAM_URL = 'https://t.me/SKUFnya_ua';

// ВАЖНО: замени на ссылку именно на твой профиль OLX.
const OLX_PROFILE_URL = 'https://www.olx.ua/uk/';

const paymentOptions = (t: Translator) => ([
  {
    icon: IconChatHeart,
    title: t('content.60AdvancePayment'),
    text: t('content.the60AdvancePaymentCoversMaterialsThe'),
    tag: t('content.convenientForYourFirstOrder'),
  },
  {
    icon: IconCard,
    title: t('content.fullAdvancePayment'),
    text: t('content.youCanPayTheFullAmountOnce'),
    tag: t('content.afterConfirmation'),
  },
]);

const steps = (t: Translator) => ([
  {
    icon: IconCart,
    title: t('content.placeAnOrderOnTheWebsite'),
    text: t('content.addAFigureToYourCartEnter'),
  },
  {
    icon: IconChatHeart,
    title: t('content.messageUsOnOlxOrTelegram'),
    text: t('content.weLlConfirmTheModelConfigurationLead'),
  },
  {
    icon: IconReceipt,
    title: t('content.payAfterTheDetailsAreAgreed'),
    text: t('content.paymentIsNotProcessedAutomaticallyOnThe'),
  },
  {
    icon: IconBox,
    title: t('content.receiveYourOrder'),
    text: t('content.afterProductionAndPackingWeDispatchYour'),
  },
]);

export default function PaymentPage({ locale }: { locale: PublishedLocale }) {
  const t = getTranslator(locale);
  const path = (href: string) => localizeHref(locale, href);

  return (
    <div className={s.page}>
      <div className={s.inner}>
        <nav className={s.breadcrumb} aria-label={t('content.breadcrumbs')}>
          <Link href="/" className={s.breadcrumbItem}>{t('account.home')}</Link>
          <span className={s.breadcrumbSep}>›</span>
          <span className={s.breadcrumbCurrent}>{t('account.payment')}</span>
        </nav>

        <div className={s.pageHead}>
          <div className={s.pageEyebrow}>{t('content.paymentByArrangement')}</div>
          <h1 className={s.pageTitle}>
            {t('content.advancePayment')} <span className={s.pageTitleAccent}>{t('content.afterConfirmation_508')}</span>
          </h1>
        </div>

        <div className={s.grid}>
          <div className={s.formCol}>
            <section className={s.card}>
              <div className={s.cardHeader}>
                <div className={s.cardHeaderLeft}>
                  <div className={s.cardIcon}>
                    <IconBow size={17} strokeWidth={1.3} />
                  </div>
                  <div>
                    <div className={s.cardTitle}>{t('content.howPaymentWorks')}</div>
                    <div className={s.cardSubtitle}>{t('content.noAutomaticChargesOnTheWebsite')}</div>
                  </div>
                </div>
              </div>

              <div className={s.cardBody}>
                <p className={s.checkLabel}>
                  {t('content.skufnyaCurrentlyConfirmsOrdersManuallyTheWebsite')} </p>
              </div>
            </section>

            <section className={s.card}>
              <div className={s.cardHeader}>
                <div className={s.cardHeaderLeft}>
                  <div className={s.cardIcon}>
                    <IconCard size={17} strokeWidth={1.4} />
                  </div>
                  <div>
                    <div className={s.cardTitle}>{t('content.advancePaymentOptions')}</div>
                    <div className={s.cardSubtitle}>{t('content.chooseWhenPlacingYourOrder')}</div>
                  </div>
                </div>
              </div>

              <div className={s.cardBody}>
                <div className={s.shippingOptions}>
                  {paymentOptions(t).map((item) => (
                    <div key={item.title} className={s.shippingOption}>
                      <span className={s.savedCardNet}>
                        <item.icon size={18} strokeWidth={1.4} />
                      </span>
                      <div className={s.shippingOptionInfo}>
                        <div className={s.shippingOptionName}>
                          {item.title}
                          <span className={s.shippingOptionBadge}>{item.tag}</span>
                        </div>
                        <div className={s.shippingOptionDesc}>{item.text}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className={s.card}>
              <div className={s.cardHeader}>
                <div className={s.cardHeaderLeft}>
                  <div className={s.cardIcon}>
                    <IconClipboard size={17} strokeWidth={1.4} />
                  </div>
                  <div>
                    <div className={s.cardTitle}>{t('content.orderingProcess')}</div>
                    <div className={s.cardSubtitle}>{t('content.fromOrderRequestToDelivery')}</div>
                  </div>
                </div>
              </div>

              <div className={s.cardBody}>
                <div className={s.trustCard}>
                  {steps(t).map((step) => (
                    <div key={step.title} className={s.trustItem}>
                      <div className={s.trustIcon}>
                        <step.icon size={15} strokeWidth={1.4} />
                      </div>
                      <div className={s.trustInfo}>
                        <div className={s.trustTitle}>{step.title}</div>
                        <div className={s.trustText}>{step.text}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>

          <aside className={s.sidebar}>
            <div className={s.summaryCard}>
              <div className={s.summaryHeader}>
                <span className={s.summaryTitle}>{t('content.contactUsBeforePayment')}</span>
                <span className={s.summaryCount}>{t('content.recommended')}</span>
              </div>

              <div className={s.orderTotals}>
                <p className={s.checkLabel}>
                  {t('content.forYourFirstPurchaseWeRecommendMessaging')} </p>
              </div>

              <div className={s.submitWrap}>
                <a
                  href={OLX_PROFILE_URL}
                  className={s.submitBtn}
                  target="_blank"
                  rel="noreferrer"
                >
                  {t('content.messageUsOnOlx')} </a>
              </div>

              <div className={s.submitWrap}>
                <a
                  href={TELEGRAM_URL}
                  className={s.confirmBtnSecondary}
                  target="_blank"
                  rel="noreferrer"
                >
                  {t('content.messageUsOnTelegram')} </a>
              </div>

              <p className={s.submitSubtext}>
                {t('content.payOnlyAfterTheDetailsAreAgreed')} </p>
            </div>

            <div className={s.trustCard}>
              <div className={s.trustItem}>
                <div className={s.trustIcon}>
                  <IconShieldCheck size={15} strokeWidth={1.4} />
                </div>
                <div className={s.trustInfo}>
                  <div className={s.trustTitle}>{t('content.noHiddenOnlineCharges')}</div>
                  <div className={s.trustText}>
                    {t('content.theWebsiteDoesNotAskForYour')} </div>
                </div>
              </div>

              <div className={s.trustItem}>
                <div className={s.trustIcon}>
                  <IconChatHeart size={15} strokeWidth={1.4} />
                </div>
                <div className={s.trustInfo}>
                  <div className={s.trustTitle}>{t('content.confirmationBeforePayment')}</div>
                  <div className={s.trustText}>
                    {t('content.advancePaymentIsMadeOnlyAfterWe')} </div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}