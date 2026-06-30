'use client';

import { useState } from 'react';
import styles from './ContactsPage.module.css';

/* ─── Дані ─────────────────────────────────────────── */

const FAQ_ITEMS = [
  {
    q: 'Як довго триває доставка?',
    a: 'По Україні — 1–3 робочі дні. Ми працюємо з Новою Поштою та Укрпоштою. Трекінг-номер надсилаємо одразу після пакування.',
  },
  {
    q: 'Усі фігурки ліцензійні?',
    a: 'Авторські колекційні фігурки та моделі на замовлення з акуратним виготовленням і дбайливим пакуванням.',
  },
  {
    q: 'Чи можна зробити передзамовлення?',
    a: 'Звісно. Якщо фігурка доступна для передзамовлення, це буде вказано на сторінці товару.',
  },
  {
    q: 'Що робити, якщо фігурка прийшла з дефектом?',
    a: 'Напишіть нам якомога швидше в Telegram або Viber і додайте фото. Ми розберемося із ситуацією та запропонуємо рішення.',
  },
  {
    q: 'Чи є програма лояльності?',
    a: 'Інформація про бонуси та спеціальні пропозиції з’являтиметься в наших каналах зв’язку та на сайті.',
  },
  {
    q: 'Чи приймаєте ви заявки на пошук рідкісних фігурок?',
    a: 'Так, будь ласка, напишіть нам у Telegram або Viber назву фігурки чи надішліть фото — постараємося допомогти.',
  },
];

const CONTACTS = [
  {
    icon: '✈️',
    title: 'Telegram',
    text: 'Найшвидший спосіб зв’язку з питань замовлення, наявності, доставки та підбору фігурок.',
    label: '@SKUFnya_ua',
    href: 'https://t.me/SKUFnya_ua',
  },
  {
    icon: '📢',
    title: 'Telegram-канал',
    text: 'Анонси, новинки, оновлення асортименту та важливі повідомлення магазину.',
    label: 'Перейти в канал',
    href: 'https://t.me/+l3_CI64EkuxlZmYy',
  },
  {
    icon: '💬',
    title: 'Viber',
    text: 'Номер для зв’язку у Viber. Підходить для швидких уточнень і листування.',
    label: '+380 93 821 31 02',
    href: 'tel:+380938213102',
  },
  {
    icon: '📸',
    title: 'Instagram',
    text: 'Фото готових фігурок, новинки, добірки та короткі оновлення магазину.',
    label: '@skufnya_ua',
    href: 'https://www.instagram.com/skufnya_ua',
  },
  {
    icon: '🎵',
    title: 'TikTok',
    text: 'Короткі відео, процеси, огляди фігурок і швидкі анонси новинок.',
    label: '@skuf_nya',
    href: 'https://www.tiktok.com/@skuf_nya',
  },
];

/* ─── Підкомпоненти ───────────────────────────────── */

function FaqItem({ q, a }: { q: string; a: string }) {
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
  return (
    <>
      {/* ── Hero ── */}
      <section className={styles.pageHero}>
        <span className={styles.heroPetal} aria-hidden="true">🌸</span>
        <span className={styles.heroPetal} aria-hidden="true">🌸</span>
        <span className={styles.heroPetal} aria-hidden="true">✿</span>
        <span className={styles.heroPetal} aria-hidden="true">❀</span>

        <div className={styles.pageHeroInner}>
          <p className={styles.pageEyebrow}>Контакти</p>
          <h1 className={styles.pageTitle}>
            Зв’яжіться <span className={styles.pageTitleAccent}>з нами</span>
          </h1>
          <p className={styles.pageSubtitle}>
            Зараз з нами можна зв’язатися через Telegram, Telegram-канал, Viber,
            Instagram і TikTok. Це актуальні контакти магазину.
          </p>
        </div>
      </section>

      {/* ── Основний блок: вступ + сайдбар ── */}
      <section className={styles.contactsMain}>
        <div className={styles.contactsInner}>
          <div className={styles.contactIntroCard}>
            <div className={styles.contactIntroHeader}>
              <p className={styles.contactIntroLabel}>✉️ Контакти</p>
              <h2 className={styles.contactIntroTitle}>
                Актуальні <span className={styles.contactIntroTitleAccent}>способи зв’язку</span>
              </h2>
            </div>

            <div className={styles.contactIntroList}>
              <div className={styles.contactIntroItem}>
                <p className={styles.contactIntroText}>
                  Для швидких запитань щодо замовлень, наявності, доставки та пошуку фігурок
                  найкраще писати нам у Telegram.
                </p>
                <a
                  href="https://t.me/SKUFnya_ua"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.contactIntroLink}
                >
                  Відкрити Telegram
                  <span className={styles.contactIntroLinkArrow} aria-hidden="true">→</span>
                </a>
              </div>

              <div className={styles.contactIntroItem}>
                <p className={styles.contactIntroText}>
                  Telegram-канал підходить для новинок, анонсів та оновлень асортименту.
                </p>
                <a
                  href="https://t.me/+l3_CI64EkuxlZmYy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.contactIntroLink}
                >
                  Перейти в канал
                  <span className={styles.contactIntroLinkArrow} aria-hidden="true">→</span>
                </a>
              </div>

              <div className={styles.contactIntroItem}>
                <p className={styles.contactIntroText}>
                  Також для зв’язку доступний Viber за номером:
                </p>
                <a href="tel:+380938213102" className={styles.contactIntroLink}>
                  +380 93 821 31 02
                  <span className={styles.contactIntroLinkArrow} aria-hidden="true">→</span>
                </a>
              </div>

              <div className={styles.contactIntroItem}>
                <p className={styles.contactIntroText}>
                  В Instagram ділимося фото, новинками та добірками з асортименту.
                </p>
                <a
                  href="https://www.instagram.com/skufnya_ua"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.contactIntroLink}
                >
                  Відкрити Instagram
                  <span className={styles.contactIntroLinkArrow} aria-hidden="true">→</span>
                </a>
              </div>

              <div className={styles.contactIntroItem}>
                <p className={styles.contactIntroText}>
                  У TikTok публікуємо короткі відео, огляди та швидкі анонси.
                </p>
                <a
                  href="https://www.tiktok.com/@skuf_nya"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.contactIntroLink}
                >
                  Відкрити TikTok
                  <span className={styles.contactIntroLinkArrow} aria-hidden="true">→</span>
                </a>
              </div>
            </div>
          </div>

          <aside className={styles.sidebar}>
            {CONTACTS.map(contact => (
              <div className={styles.infoCard} key={contact.title}>
                <div className={styles.infoCardIcon} aria-hidden="true">
                  {contact.icon}
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
              Поширені <span className={styles.faqTitleAccent}>запитання</span>
            </h2>
          </div>

          <div className={styles.faqGrid}>
            {FAQ_ITEMS.map(item => (
              <FaqItem key={item.q} q={item.q} a={item.a} />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
