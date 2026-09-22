'use client';

import { useI18n } from '../../../i18n/client';
import type { Translator } from '../../../i18n/translate';
import Link from '../../../i18n/navigation';
import { useState } from 'react';

import {
  IconBow,
  IconBox,
  IconChatHeart,
  IconClipboard,
  IconGlobe,
  IconMail,
  IconMap,
  IconMegaphone,
  IconPencil,
  IconPuzzle,
  IconTelegram,
  IconTruck,
  IconViber,
  IconWrench,
} from '../../../components/icons';
import styles from './DeliveryPage.module.css';

/* ─── Data ─────────────────────────────────────── */

const deliveryZones = (t: Translator) => ([
  {
    flag: 'UA',
    region: t('content.ukraineNovaPoshta'),
    days: t('content.13WorkingDays'),
    price: t('content.shownAtCheckout'),
    note: t('content.ourMainDeliveryService'),
    badge: t('content.recommended'),
    badgeType: 'popular',
  },
  {
    flag: 'UA',
    region: t('content.ukraineUkrposhta'),
    days: t('content.36WorkingDays'),
    price: t('content.shownAtCheckout'),
    note: t('content.mainlyForUnassembledKits'),
    badge: null,
    badgeType: null,
  },
  {
    flag: 'INT',
    region: t('content.internationalDelivery'),
    days: t('content.notAvailable'),
    price: t('content.notOfferedAtCheckout'),
    note: t('content.currentlyUnavailable'),
    badge: null,
    badgeType: null,
  },
]);

const packageFormats = (t: Translator) => ([
  {
    icon: IconPuzzle,
    name: t('content.unassembledKit'),
    desc: t('content.theSafestOptionForShippingPartsAre'),
    tag: t('content.bestForShipping'),
  },
  {
    icon: IconWrench,
    name: t('content.assembledAndGlued'),
    desc: t('content.basicAssemblyAndGluingCanBeArranged'),
    tag: t('content.byArrangement'),
  },
]);

const deliveryMethods = (t: Translator) => ([
  {
    icon: IconBox,
    name: t('content.novaPoshtaBranch'),
    desc: t('content.ourStandardAndMostConvenientDeliveryOption'),
    tag: t('content.mainDeliveryOption'),
  },
  {
    icon: IconTruck,
    name: t('content.novaPoshtaCourier'),
    desc: t('content.aConvenientOptionForAssembledAndGlued'),
    tag: t('content.forDelicateModels'),
  },
  {
    icon: IconMail,
    name: t('content.ukrposhta'),
    desc: t('content.availableForSelectedOrdersBestSuitedTo'),
    tag: t('content.byArrangement'),
  },
  {
    icon: IconGlobe,
    name: t('content.internationalDelivery'),
    desc: t('content.internationalDeliveryIsNotAvailableAtCheckout'),
    tag: t('content.notAvailableAtCheckout'),
  },
]);

const processSteps = (t: Translator) => ([
  {
    icon: IconPencil,
    title: t('content.orderConfirmation'),
    text: t('content.afterYouPlaceAnOrderWeCheck'),
    tag: t('content.afterOrdering'),
  },
  {
    icon: IconWrench,
    title: t('content.productionAndPreparation'),
    text: t('content.yourFigureIsMadeAndPreparedFor'),
    tag: t('content.dependsOnTheConfiguration'),
  },
  {
    icon: IconBox,
    title: t('content.packaging'),
    text: t('content.eachOrderIsPackedWithItsFragile'),
    tag: t('content.protectivePackaging'),
  },
  {
    icon: IconMap,
    title: t('content.dispatchAndTracking'),
    text: t('content.youReceiveATrackingNumberOnceThe'),
    tag: t('content.trackingAfterDispatch'),
  },
]);

const faqItems = (t: Translator) => ([
  {
    q: t('content.whatSTheDifferenceBetweenAnUnassembled'),
    a: t('content.anUnassembledKitIsShippedAsSeparate'),
  },
  {
    q: t('content.canAnAssembledModelBeSentTo'),
    a: t('content.forAssembledAndGluedModelsWeRecommend'),
  },
  {
    q: t('content.howLongDoesOrderPreparationTake'),
    a: t('content.theTimeDependsOnTheModelOur'),
  },
  {
    q: t('content.whatShouldIDoIfMyParcel'),
    a: t('content.pleaseInspectThePackagingAndContentsWhen'),
  },
  {
    q: t('content.doYouOfferInternationalDelivery'),
    a: t('content.internationalDeliveryIsNotAvailableAtCheckout_363'),
  },
]);

const trustItems = (t: Translator) => ([
  t('content.photosOrAConditionCheckBeforeDispatch'),
  t('content.protectivePackagingForFragileParts'),
  t('content.trackingAfterHandoverToTheCarrier'),
  t('content.packagingSuitedToKitsAndAssembledModels'),
  t('content.deliveryArrangementsConfirmedBeforePayment'),
  t('content.supportOnTelegramAndViber'),
]);

const supportLinks = (t: Translator) => ([
  {
    icon: IconTelegram,
    title: t('content.telegramSupport'),
    sub: '@SKUFnya_ua',
    href: 'https://t.me/SKUFnya_ua',
  },
  {
    icon: IconViber,
    title: 'Viber',
    sub: '+380 93 821 31 02',
    href: 'viber://chat?number=%2B380938213102',
  },
  {
    icon: IconMegaphone,
    title: t('content.telegramChannel'),
    sub: t('content.newsUpdatesAndAnnouncements'),
    href: 'https://t.me/+l3_CI64EkuxlZmYy',
  },
]);

type CalcResult = { time: string; price: string; note: string };

type CalcKey =
  | 'np:kit'
  | 'np:assembled'
  | 'ukrposhta:kit'
  | 'ukrposhta:assembled'
  | 'international:kit'
  | 'international:assembled';

/* ─── Component ─────────────────────────────────── */

export default function DeliveryPage() {
  const { locale, t, path } = useI18n();

  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [activeMethod, setActiveMethod] = useState(0);
  const [calcDeliveryZone, setCalcDeliveryZone] = useState<'np' | 'ukrposhta' | 'international'>('np');
  const [calcFormat, setCalcFormat] = useState<'kit' | 'assembled'>('kit');
  const [calcResult, setCalcResult] = useState<CalcResult | null>(null);

  const calcPrices: Record<CalcKey, CalcResult> = {
    'np:kit': {
      time: t('content.13WorkingDaysAfterPreparation'),
      price: t('content.shownAtCheckout_374'),
      note: t('content.branchParcelLockerOrCourier'),
    },
    'np:assembled': {
      time: t('content.13WorkingDaysAfterPreparation'),
      price: t('content.shownAtCheckout_374'),
      note: t('content.weRecommendABranchOrCourierAssembly'),
    },
    'ukrposhta:kit': {
      time: t('content.36WorkingDaysAfterPreparation'),
      price: t('content.shownAtCheckout_380'),
      note: t('content.suitableForUnassembledKits'),
    },
    'ukrposhta:assembled': {
      time: t('content.byArrangement_382'),
      price: t('content.toBeConfirmed'),
      note: t('content.notOurStandardOptionForAssembledModels'),
    },
    'international:kit': {
      time: t('content.notAvailable'),
      price: t('content.notOfferedAtCheckout'),
      note: t('content.deliveryWithinUkraineOnly'),
    },
    'international:assembled': {
      time: t('content.notAvailable'),
      price: t('content.notOfferedAtCheckout'),
      note: t('content.internationalDeliveryIsCurrentlyUnavailable'),
    },
  };

  function handleCalc() {
    const key = `${calcDeliveryZone}:${calcFormat}` as CalcKey;
    setCalcResult(calcPrices[key]);
  }

  function toggleFaq(i: number) {
    setOpenFaq(prev => (prev === i ? null : i));
  }

  return (
    <>
      {/* ── Page Hero ───────────────────────────────── */}
      <section className={styles.pageHero}>
        <div className={styles.pageHeroBg} aria-hidden>
          <div className={styles.pageHeroBgCircle} />
          <div className={styles.pageHeroBgCircle} />
        </div>

        <div className={styles.pageHeroInner}>
          <nav className={styles.breadcrumb} aria-label={t('content.breadcrumbs')}>
            <Link href="/" className={styles.breadcrumbLink}>{t('account.home')}</Link>
            <span className={styles.breadcrumbSep}>›</span>
            <span>{t('account.delivery')}</span>
          </nav>

          <p className={styles.pageEyebrow}>{t('content.deliveryInformation')}</p>

          <h1 className={styles.pageTitle}>
            {t('account.delivery')} <span className={styles.pageTitleAccent}>{t('content.andPackaging')}</span>
          </h1>

          <p className={styles.pageSubtitle}>
            {t('content.weShipAnimeFiguresWithinUkraineThe')} </p>
        </div>
      </section>

      {/* Вступний блок */}
      <section className={styles.introSection}>
        <div className={styles.introInner}>
          <p className={styles.introEyebrow}>{t('content.beforeYouOrder')}</p>
          <h2 className={styles.introTitle}>{t('content.madeToOrderAndPackedForSafe')}</h2>
          <p className={styles.introSub}>
            {t('content.everyFigureIsPreparedBeforeDispatchBasic')} </p>

          <div className={styles.introBadges}>
            <span className={styles.methodTag}>{t('content.madeToOrder')}</span>
            <span className={styles.methodTag}>{t('content.assemblyByArrangement')}</span>
            <span className={styles.methodTag}>{t('content.trackingAfterDispatch')}</span>
          </div>
        </div>
      </section>

      {/* Основний контент */}
      <section className={styles.main}>
        <div className={styles.mainInner}>

          {/* LEFT COLUMN */}
          <div className={styles.content}>

            {/* Delivery zones */}
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <div className={styles.cardHeaderIcon}>
                  <IconGlobe size={19} strokeWidth={1.4} />
                </div>
                <div>
                  <div className={styles.cardHeaderTitle}>{t('content.destinationsAndDeliveryTimes')}</div>
                  <div className={styles.cardHeaderSub}>{t('content.deliveryInformation')}</div>
                </div>
              </div>

              <div className={`${styles.cardBody} ${styles.cardBodyFlush}`}>
                <table className={styles.zonesTable}>
                  <thead>
                    <tr>
                      <th>{t('content.destination')}</th>
                      <th>{t('content.timeLimit')}</th>
                      <th>{t('content.cost')}</th>
                      <th>{t('content.note')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deliveryZones(t).map((z) => (
                      <tr key={z.region}>
                        <td>
                          <span className={styles.zoneRegion}>
                            <span className={styles.zoneFlag}>{z.flag}</span>
                            {z.region}
                            {z.badge && (
                              <span
                                className={
                                  z.badgeType === 'popular'
                                    ? `${styles.zoneBadge} ${styles.zoneBadgePopular}`
                                    : styles.zoneBadge
                                }
                              >
                                {z.badge}
                              </span>
                            )}
                          </span>
                        </td>
                        <td className={styles.zoneDays}>{z.days}</td>
                        <td className={styles.zonePrice}>{z.price}</td>
                        <td className={styles.zoneNote}>{z.note}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Package formats */}
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <div className={styles.cardHeaderIcon}>
                  <IconBox size={19} strokeWidth={1.4} />
                </div>
                <div>
                  <div className={styles.cardHeaderTitle}>{t('content.shippingFormats')}</div>
                  <div className={styles.cardHeaderSub}>{t('content.orderConfiguration')}</div>
                </div>
              </div>

              <div className={styles.cardBody}>
                <div className={styles.methodGrid}>
                  {packageFormats(t).map((item) => (
                    <div key={item.name} className={styles.infoCard}>
                      <span className={styles.methodIcon}>
                        <item.icon size={24} strokeWidth={1.3} />
                      </span>
                      <div className={styles.methodName}>{item.name}</div>
                      <div className={styles.methodDesc}>{item.desc}</div>
                      <span className={styles.methodTag}>{item.tag}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Delivery methods */}
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <div className={styles.cardHeaderIcon}>
                  <IconTruck size={19} strokeWidth={1.4} />
                </div>
                <div>
                  <div className={styles.cardHeaderTitle}>{t('content.deliveryMethods')}</div>
                  <div className={styles.cardHeaderSub}>{t('content.choosingHowToReceiveYourOrder')}</div>
                </div>
              </div>

              <div className={styles.cardBody}>
                <div className={styles.methodGrid}>
                  {deliveryMethods(t).map((m, i) => (
                    <button
                      key={m.name}
                      type="button"
                      className={
                        i === activeMethod
                          ? `${styles.methodCard} ${styles.methodCardActive}`
                          : styles.methodCard
                      }
                      onClick={() => setActiveMethod(i)}
                      aria-pressed={i === activeMethod}
                    >
                      <span className={styles.methodIcon}>
                        <m.icon size={24} strokeWidth={1.3} />
                      </span>
                      <span className={styles.methodName}>{m.name}</span>
                      <span className={styles.methodDesc}>{m.desc}</span>
                      <span className={styles.methodTag}>{m.tag}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Process steps */}
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <div className={styles.cardHeaderIcon}>
                  <IconClipboard size={19} strokeWidth={1.4} />
                </div>
                <div>
                  <div className={styles.cardHeaderTitle}>{t('content.howDispatchWorks')}</div>
                  <div className={styles.cardHeaderSub}>{t('content.orderPreparationSteps')}</div>
                </div>
              </div>

              <div className={styles.cardBody}>
                <div className={styles.steps}>
                  {processSteps(t).map((s, i) => (
                    <div key={s.title} className={styles.step}>
                      <div className={styles.stepDot}>
                        <s.icon size={16} strokeWidth={1.4} />
                        <span className={styles.stepNum}>{i + 1}</span>
                      </div>
                      <div className={styles.stepContent}>
                        <div className={styles.stepTitle}>{s.title}</div>
                        <div className={styles.stepText}>{s.text}</div>
                        <span className={styles.stepTag}>{s.tag}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* FAQ */}
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <div className={styles.cardHeaderIcon}>
                  <IconChatHeart size={19} strokeWidth={1.4} />
                </div>
                <div>
                  <div className={styles.cardHeaderTitle}>{t('content.frequentlyAskedQuestions')}</div>
                  <div className={styles.cardHeaderSub}>FAQ</div>
                </div>
              </div>

              <div className={styles.cardBody}>
                <div className={styles.faqList}>
                  {faqItems(t).map((f, i) => (
                    <div key={f.q} className={styles.faqItem}>
                      <button
                        className={styles.faqQuestion}
                        onClick={() => toggleFaq(i)}
                        aria-expanded={openFaq === i}
                      >
                        <span>{f.q}</span>
                        <span
                          className={
                            openFaq === i
                              ? `${styles.faqChevron} ${styles.faqChevronOpen}`
                              : styles.faqChevron
                          }
                        >
                          ▾
                        </span>
                      </button>

                      <div
                        className={
                          openFaq === i
                            ? `${styles.faqAnswer} ${styles.faqAnswerOpen}`
                            : styles.faqAnswer
                        }
                        aria-hidden={openFaq !== i}
                      >
                        <p className={styles.faqAnswerInner}>{f.a}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Права колонка */}
          <aside className={styles.sidebar}>

            {/* Delivery calculator */}
            <div className={`${styles.sideCard} ${styles.calcCard}`}>
              <div className={styles.calcHeader}>
                <div className={styles.calcTitle}>{t('content.estimatedDeliveryTimes')}</div>
                <div className={styles.calcSub}>{t('content.quickGuide')}</div>
              </div>

              <div className={styles.calcBody}>
                <div className={styles.calcField}>
                  <label className={styles.calcLabel} htmlFor="calc-country">
                    {t('content.destination')} </label>
                  <select
                    id="calc-country"
                    className={styles.calcSelect}
                    value={calcDeliveryZone}
                    onChange={e => {
                      setCalcDeliveryZone(e.target.value as 'np' | 'ukrposhta' | 'international');
                      setCalcResult(null);
                    }}
                  >
                    <option value="np">{t('content.ukraineNovaPoshta')}</option>
                    <option value="ukrposhta">{t('content.ukraineUkrposhta')}</option>
                    <option value="international">{t('content.internationalDelivery')}</option>
                  </select>
                </div>

                <div className={styles.calcField}>
                  <label className={styles.calcLabel} htmlFor="calc-format">
                    {t('content.orderFormat')} </label>
                  <select
                    id="calc-format"
                    className={styles.calcSelect}
                    value={calcFormat}
                    onChange={e => {
                      setCalcFormat(e.target.value as 'kit' | 'assembled');
                      setCalcResult(null);
                    }}
                  >
                    <option value="kit">{t('content.unassembledKit')}</option>
                    <option value="assembled">{t('content.assembledAndGlued')}</option>
                  </select>
                </div>

                <button className={styles.calcBtn} type="button" onClick={handleCalc}>
                  {t('content.showDetails')} </button>

                <div
                  className={
                    calcResult
                      ? `${styles.calcResult} ${styles.calcResultVisible}`
                      : styles.calcResult
                  }
                  aria-live="polite"
                >
                  {calcResult && (
                    <>
                      <div className={styles.calcResultRow}>
                        <span>{t('content.timeLimit')}</span>
                        <span className={styles.calcResultVal}>{calcResult.time}</span>
                      </div>
                      <div className={styles.calcResultRow}>
                        <span>{t('content.cost')}</span>
                        <span className={styles.calcResultVal}>{calcResult.price}</span>
                      </div>
                      <div className={styles.calcResultRow}>
                        <span>{t('content.note')}</span>
                        <span>{calcResult.note}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Support */}
            <div className={`${styles.sideCard} ${styles.supportCard}`}>
              <div className={styles.sideCardHeader}>
                <span className={styles.sideCardHeaderIcon}>
                  <IconBow size={18} strokeWidth={1.3} />
                </span>
                <span className={styles.sideCardTitle}>{t('content.contactUs_430')}</span>
              </div>

              <div className={styles.supportList}>
                {supportLinks(t).map((s) => (
                  <a
                    key={s.href}
                    href={s.href}
                    className={styles.supportItem}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <div className={styles.supportItemIcon}>
                      <s.icon size={17} strokeWidth={1.4} />
                    </div>
                    <div className={styles.supportItemText}>
                      <div className={styles.supportItemTitle}>{s.title}</div>
                      <div className={styles.supportItemSub}>{s.sub}</div>
                    </div>
                    <span className={styles.supportItemArrow}>›</span>
                  </a>
                ))}
              </div>
            </div>

            {/* Trust */}
            <div className={`${styles.sideCard} ${styles.trustCard}`}>
              <div className={styles.trustCardBody}>
                <div className={styles.trustTitle}>{t('content.ourApproach')}</div>
                <ul className={styles.trustList} role="list">
                  {trustItems(t).map((t) => (
                    <li key={t} className={styles.trustItem}>
                      <span className={styles.trustItemDot} aria-hidden />
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </aside>
        </div>
      </section>

      {/* Промоблок */}
      <section className={styles.promoBar}>
        <div className={styles.promoBarInner}>
          <div className={styles.promoBarText}>
            <span className={styles.promoBarLabel}>{t('content.needHelp')}</span>
            <h2 className={styles.promoBarTitle}>
              {t('content.notSureWhichDeliveryMethod')} <span className={styles.promoBarTitleAccent}>{t('content.toChoose')}</span>
            </h2>
            <p className={styles.promoBarSub}>
              {t('content.messageUsOnTelegramAndWeLl')} </p>
          </div>

          <a
            href="https://t.me/SKUFnya_ua"
            className={styles.promoBarCta}
            target="_blank"
            rel="noreferrer"
          >
            {t('content.messageUsOnTelegram')} </a>
        </div>
      </section>
    </>
  );
}