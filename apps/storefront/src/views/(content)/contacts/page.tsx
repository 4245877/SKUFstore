'use client';

import { useI18n } from '../../../i18n/client';
import type { Translator } from '../../../i18n/translate';
import { useState } from 'react';
import {
  IconInstagram,
  IconMegaphone,
  IconTelegram,
  IconTiktok,
  IconViber,
} from '../../../components/icons';
import { SHOP_TELEGRAM_CHANNEL_URL, SHOP_TELEGRAM_URL, SHOP_VIBER_URL } from '../../../lib/shop-contacts';
import styles from './ContactsPage.module.css';

/* ─── Дані ─────────────────────────────────────────── */

const FAQ_ITEMS = (t: Translator) => ([
  {
    q: t('content.howLongDoesDeliveryTake'),
    a: t('content.withinUkraineDeliveryUsuallyTakes13'),
  },
  {
    q: t('content.areAllFiguresLicensed'),
    a: t('content.weMakeCustomAndCollectibleFiguresAnd'),
  },
  {
    q: t('content.canIPreorderAFigure'),
    a: t('content.yesIfAFigureIsAvailableFor'),
  },
  {
    q: t('content.whatIfMyFigureArrivesWithA'),
    a: t('content.contactUsAsSoonAsPossibleOn'),
  },
  {
    q: t('content.doYouHaveALoyaltyProgram'),
    a: t('content.weLlShareInformationAboutRewardsAnd'),
  },
  {
    q: t('content.canYouHelpMeFindARare'),
    a: t('content.yesSendUsTheFigureSName'),
  },
]);

const CONTACTS = (t: Translator) => ([
  {
    icon: IconTelegram,
    title: 'Telegram',
    text: t('content.theQuickestWayToAskAboutOrders'),
    label: '@SKUFnya_ua',
    href: SHOP_TELEGRAM_URL,
  },
  {
    icon: IconMegaphone,
    title: t('content.telegramChannel'),
    text: t('content.announcementsNewArrivalsCatalogUpdatesAndImportant'),
    label: t('content.visitChannel'),
    href: SHOP_TELEGRAM_CHANNEL_URL,
  },
  {
    icon: IconViber,
    title: 'Viber',
    text: t('content.contactUsOnViberForQuickQuestions'),
    label: '+380 93 821 31 02',
    href: SHOP_VIBER_URL,
  },
  {
    icon: IconInstagram,
    title: 'Instagram',
    text: t('content.photosOfFinishedFiguresNewArrivalsCollections'),
    label: '@skufnya_ua',
    href: 'https://www.instagram.com/skufnya_ua',
  },
  {
    icon: IconTiktok,
    title: 'TikTok',
    text: t('content.shortVideosBehindTheScenesClipsFigure'),
    label: '@skuf_nya',
    href: 'https://www.tiktok.com/@skuf_nya',
  },
]);

/* ─── Підкомпоненти ───────────────────────────────── */

function FaqItem({ q, a }: { q: string; a: string }) {
  const { locale, t, path } = useI18n();

  const [open, setOpen] = useState(false);

  return (
    <div className={`${styles.faqItem} ${open ? styles.faqItemOpen : ''}`}>
      <button
        type="button"
        className={styles.faqQuestion}
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        <span className={styles.faqQuestionText}>{q}</span>
        <span className={styles.faqChevron} aria-hidden="true">
          ▾
        </span>
      </button>

      <div className={styles.faqAnswer} aria-hidden={!open}>
        <div className={styles.faqAnswerInner}>{a}</div>
      </div>
    </div>
  );
}

/* ─── Головна сторінка ────────────────────────────── */

export default function ContactsPage() {
  const { locale, t, path } = useI18n();
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [phoneCopyFailed, setPhoneCopyFailed] = useState(false);

  return (
    <>
      {/* ── Hero ── */}
      <section className={styles.pageHero}>
        <span className={styles.heroPetal} aria-hidden="true">✿</span>
        <span className={styles.heroPetal} aria-hidden="true">❀</span>
        <span className={styles.heroPetal} aria-hidden="true">✾</span>
        <span className={styles.heroPetal} aria-hidden="true">❁</span>

        <div className={styles.pageHeroInner}>
          <p className={styles.pageEyebrow}>{t('content.contacts')}</p>
          <h1 className={styles.pageTitle}>
            {t('content.getIn')} <span className={styles.pageTitleAccent}>{t('content.touch')}</span>
          </h1>
          <p className={styles.pageSubtitle}>
            {t('content.youCanReachUsThroughTelegramOur')} </p>
        </div>
      </section>

      {/* ── Основний блок: вступ + сайдбар ── */}
      <section className={styles.contactsMain}>
        <div className={styles.contactsInner}>
          <div className={styles.contactIntroCard}>
            <div className={styles.contactIntroHeader}>
              <p className={styles.contactIntroLabel}>{t('content.contacts')}</p>
              <h2 className={styles.contactIntroTitle}>
                {t('content.waysTo')} <span className={styles.contactIntroTitleAccent}>{t('content.contactUs')}</span>
              </h2>
            </div>

            <div className={styles.contactIntroList}>
              <div className={styles.contactIntroItem}>
                <p className={styles.contactIntroText}>
                  {t('content.forQuickQuestionsAboutOrdersAvailabilityDelivery')} </p>
                <a
                  href={SHOP_TELEGRAM_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.contactIntroLink}
                >
                  {t('content.openTelegram')} <span className={styles.contactIntroLinkArrow} aria-hidden="true">→</span>
                </a>
              </div>

              <div className={styles.contactIntroItem}>
                <p className={styles.contactIntroText}>
                  {t('content.followOurTelegramChannelForNewArrivals')} </p>
                <a
                  href={SHOP_TELEGRAM_CHANNEL_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.contactIntroLink}
                >
                  {t('content.visitChannel')} <span className={styles.contactIntroLinkArrow} aria-hidden="true">→</span>
                </a>
              </div>

              <div className={styles.contactIntroItem}>
                <p className={styles.contactIntroText}>
                  {t('content.youCanAlsoReachUsOnViber')} </p>
                <a href={SHOP_VIBER_URL} className={styles.contactIntroLink}>
                  {t('contacts.writeViber')}
                  <span className={styles.contactIntroLinkArrow} aria-hidden="true">→</span>
                </a>
                <p>+380 93 821 31 02</p>
                <a href="tel:+380938213102" className={styles.contactIntroLink}>{t('contacts.call')}</a>
                <button type="button" className={styles.contactIntroLink} onClick={async () => {
                  try {
                    await navigator.clipboard.writeText('+380938213102');
                    setCopiedPhone(true); setPhoneCopyFailed(false);
                  } catch { setPhoneCopyFailed(true); setCopiedPhone(false); }
                }}>{t('contacts.copyNumber')}</button>
                <p role="status">{phoneCopyFailed ? t('contacts.copyManually') : copiedPhone ? t('contacts.numberCopied') : ''}</p>
              </div>

              <div className={styles.contactIntroItem}>
                <p className={styles.contactIntroText}>
                  {t('content.weSharePhotosNewArrivalsAndCatalog')} </p>
                <a
                  href="https://www.instagram.com/skufnya_ua"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.contactIntroLink}
                >
                  {t('content.openInstagram')} <span className={styles.contactIntroLinkArrow} aria-hidden="true">→</span>
                </a>
              </div>

              <div className={styles.contactIntroItem}>
                <p className={styles.contactIntroText}>
                  {t('content.wePostShortVideosReviewsAndAnnouncements')} </p>
                <a
                  href="https://www.tiktok.com/@skuf_nya"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.contactIntroLink}
                >
                  {t('content.openTiktok')} <span className={styles.contactIntroLinkArrow} aria-hidden="true">→</span>
                </a>
              </div>
            </div>
          </div>

          <aside className={styles.sidebar}>
            {CONTACTS(t).map(contact => (
              <div className={styles.infoCard} key={contact.title}>
                <div className={styles.infoCardIcon} aria-hidden="true">
                  <contact.icon size={20} strokeWidth={1.4} />
                </div>
                <h3 className={styles.infoCardTitle}>{contact.title}</h3>
                <p className={styles.infoCardText}>{contact.text}</p>
                <a
                  href={contact.href}
                  target={contact.href.startsWith('http') ? '_blank' : undefined}
                  rel={contact.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                  className={styles.infoCardLink}
                >
                  {contact.label}
                  <span className={styles.infoCardLinkArrow} aria-hidden="true">→</span>
                </a>
              </div>
            ))}
          </aside>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className={styles.faqSection}>
        <div className={styles.faqInner}>
          <div className={styles.faqHead}>
            <p className={styles.faqEyebrow}>FAQ</p>
            <h2 className={styles.faqTitle}>
              {t('content.frequentlyAsked')} <span className={styles.faqTitleAccent}>{t('content.questions')}</span>
            </h2>
          </div>

          <div className={styles.faqGrid}>
            {FAQ_ITEMS(t).map(item => (
              <FaqItem key={item.q} q={item.q} a={item.a} />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
