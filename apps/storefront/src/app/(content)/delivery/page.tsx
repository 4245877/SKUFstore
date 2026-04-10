'use client';

import Link from 'next/link';
import { useState } from 'react';
import styles from './DeliveryPage.module.css';

/* ─── Data ─────────────────────────────────────── */

const deliveryZones = [
  {
    flag: '🇺🇦',
    region: 'Україна — Нова Пошта',
    days: '1–3 роб. дні',
    price: 'за тарифом перевізника',
    note: 'Основний спосіб доставки',
    badge: 'Рекомендовано',
    badgeType: 'popular',
  },
  {
    flag: '🇺🇦',
    region: 'Україна — Укрпошта',
    days: '3–6 роб. днів',
    price: 'за тарифом перевізника',
    note: 'Переважно для наборів у деталях',
    badge: null,
    badgeType: null,
  },
  {
    flag: '🌍',
    region: 'Міжнародна доставка',
    days: 'індивідуально',
    price: 'розрахунок перед оплатою',
    note: 'За попереднім погодженням',
    badge: null,
    badgeType: null,
  },
];

const packageFormats = [
  {
    icon: '🧩',
    name: 'Набір у деталях',
    desc: 'Найбезпечніший формат для перевезення. Деталі пакуються окремо, дрібні елементи додатково захищаються.',
    tag: 'Оптимально для доставки',
  },
  {
    icon: '🛠️',
    name: 'Зі складанням і склеюванням',
    desc: 'Модель проходить додаткову ручну підготовку перед відправленням. Для такого формату ми радимо лише безпечні способи отримання.',
    tag: 'Потрібно більше часу',
  },
];

const deliveryMethods = [
  {
    icon: '📦',
    name: 'Нова Пошта — відділення',
    desc: 'Базовий і найзручніший варіант по Україні. Підходить для більшості замовлень.',
    tag: 'Основний спосіб',
  },
  {
    icon: '🚚',
    name: 'Нова Пошта — курʼєр',
    desc: 'Зручний варіант для зібраних і склеєних моделей, коли важливо мінімізувати зайві переміщення посилки.',
    tag: 'Для делікатних моделей',
  },
  {
    icon: '✉️',
    name: 'Укрпошта',
    desc: 'Доступний варіант для частини замовлень. Найкраще підходить для наборів у деталях.',
    tag: 'За погодженням',
  },
  {
    icon: '🌐',
    name: 'Міжнародна доставка',
    desc: 'Доступна за запитом. Підсумкова вартість і строки залежать від країни, габаритів та обраного формату відправлення.',
    tag: 'Розрахунок перед оплатою',
  },
];

const processSteps = [
  {
    icon: '📝',
    title: 'Підтвердження замовлення',
    text: 'Після оформлення ми перевіряємо склад замовлення, формат відправлення та уточнюємо деталі, якщо це потрібно.',
    tag: 'Після оформлення',
  },
  {
    icon: '🖨️',
    title: 'Друк і підготовка',
    text: 'Фігурка друкується на фотополімерному принтері та проходить базову підготовку. Якщо обрана послуга складання, закладається додатковий час на ручну роботу.',
    tag: 'Залежить від комплектації',
  },
  {
    icon: '📦',
    title: 'Пакування',
    text: 'Кожне замовлення пакується з урахуванням крихких елементів. Для дрібних деталей і тонких частин використовується додатковий захист.',
    tag: 'Безпечне пакування',
  },
  {
    icon: '📮',
    title: 'Відправлення та трекінг',
    text: 'Після передачі перевізнику ви отримуєте номер відстеження. Для зібраних моделей радимо перевіряти посилку під час отримання.',
    tag: 'ТТН після відправлення',
  },
];

const faqItems = [
  {
    q: 'У чому різниця між набором у деталях і моделлю зі складанням?',
    a: 'Набір у деталях надсилається роздільно та краще переносить доставку. Модель зі складанням і склеюванням проходить додаткову ручну підготовку перед відправленням, але для неї важливіший безпечний спосіб доставки.',
  },
  {
    q: 'Чи можна відправити зібрану модель у поштомат?',
    a: 'Для зібраних і склеєних моделей ми радимо відділення або курʼєрську доставку. Це знижує ризик пошкоджень під час транспортування та видачі.',
  },
  {
    q: 'Скільки займає підготовка замовлення?',
    a: 'Точний строк залежить від моделі, завантаження та вибраної комплектації. Набори у деталях готуються швидше, а послуга складання і склеювання додає час на ручну роботу.',
  },
  {
    q: 'Що робити, якщо посилка приїхала пошкодженою?',
    a: 'Будь ласка, перевірте пакування та вміст під час отримання. Якщо є пошкодження, зафіксуйте їх на фото одразу у відділенні та звʼяжіться з нами через Telegram або Viber — ми допоможемо розібратися далі.',
  },
  {
    q: 'Чи є міжнародна доставка?',
    a: 'Так, але вона погоджується окремо до оплати. Ми заздалегідь уточнюємо країну, формат відправлення, вартість і орієнтовні строки.',
  },
];

const trustItems = [
  'Фото або перевірка стану перед відправленням',
  'Надійне пакування для крихких елементів',
  'Трекінг після передачі перевізнику',
  'Окремий підхід до наборів і зібраних моделей',
  'Уточнення способу доставки до оплати',
  'Підтримка через Telegram та Viber',
];

const supportLinks = [
  {
    icon: '💬',
    title: 'Telegram-підтримка',
    sub: '@SKUFnya_ua',
    href: 'https://t.me/SKUFnya_ua',
  },
  {
    icon: '📱',
    title: 'Viber',
    sub: '+380 93 821 31 02',
    href: 'viber://chat?number=%2B380938213102',
  },
  {
    icon: '📣',
    title: 'Telegram-канал',
    sub: 'Новини, оновлення та анонси',
    href: 'https://t.me/+l3_CI64EkuxlZmYy',
  },
];

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
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [activeMethod, setActiveMethod] = useState(0);
  const [calcDeliveryZone, setCalcDeliveryZone] = useState<'np' | 'ukrposhta' | 'international'>('np');
  const [calcFormat, setCalcFormat] = useState<'kit' | 'assembled'>('kit');
  const [calcResult, setCalcResult] = useState<CalcResult | null>(null);

  const calcPrices: Record<CalcKey, CalcResult> = {
    'np:kit': {
      time: '1–3 роб. дні після готовності',
      price: 'за тарифом НП',
      note: 'Відділення, поштомат або курʼєр',
    },
    'np:assembled': {
      time: '1–3 роб. дні після готовності',
      price: 'за тарифом НП',
      note: 'Рекомендуємо відділення або курʼєра',
    },
    'ukrposhta:kit': {
      time: '3–6 роб. днів після готовності',
      price: 'за тарифом Укрпошти',
      note: 'Підходить для наборів у деталях',
    },
    'ukrposhta:assembled': {
      time: 'за погодженням',
      price: 'уточнюється',
      note: 'Для зібраних моделей не є базовим варіантом',
    },
    'international:kit': {
      time: 'індивідуально',
      price: 'розрахунок перед оплатою',
      note: 'Залежить від країни та ваги',
    },
    'international:assembled': {
      time: 'індивідуально',
      price: 'розрахунок перед оплатою',
      note: 'Погоджується окремо до оплати',
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
          <nav className={styles.breadcrumb} aria-label="Хлібні крихти">
            <Link href="/" className={styles.breadcrumbLink}>Головна</Link>
            <span className={styles.breadcrumbSep}>›</span>
            <span>Доставка</span>
          </nav>

          <p className={styles.pageEyebrow}>Умови доставки</p>

          <h1 className={styles.pageTitle}>
            Доставка <span className={styles.pageTitleAccent}>та пакування</span>
          </h1>

          <p className={styles.pageSubtitle}>
            Ми відправляємо аніме-фігурки по Україні та за запитом — за кордон.
            Формат доставки залежить від комплектації: набір у деталях або модель
            зі складанням і склеюванням.
          </p>
        </div>
      </section>

      {/* Вступний блок */}
      <section className={styles.introSection}>
        <div className={styles.introInner}>
          <p className={styles.introEyebrow}>✦ Важливо перед оформленням</p>
          <h2 className={styles.introTitle}>Друк під замовлення та безпечне відправлення</h2>
          <p className={styles.introSub}>
            Кожна фігурка проходить підготовку перед відправленням. Для зібраних моделей
            ми радимо безпечні способи отримання, а для наборів у деталях доступно більше варіантів доставки.
          </p>

          <div className={styles.introBadges}>
            <span className={styles.methodTag}>Друк під замовлення</span>
            <span className={styles.methodTag}>Складання за доплату</span>
            <span className={styles.methodTag}>ТТН після відправлення</span>
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
                <div className={styles.cardHeaderIcon}>🗺️</div>
                <div>
                  <div className={styles.cardHeaderTitle}>Напрямки та строки</div>
                  <div className={styles.cardHeaderSub}>Умови доставки</div>
                </div>
              </div>

              <div className={`${styles.cardBody} ${styles.cardBodyFlush}`}>
                <table className={styles.zonesTable}>
                  <thead>
                    <tr>
                      <th>Напрямок</th>
                      <th>Строк</th>
                      <th>Вартість</th>
                      <th>Примітка</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deliveryZones.map((z) => (
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
                <div className={styles.cardHeaderIcon}>🧷</div>
                <div>
                  <div className={styles.cardHeaderTitle}>Формати відправлення</div>
                  <div className={styles.cardHeaderSub}>Комплектація замовлення</div>
                </div>
              </div>

              <div className={styles.cardBody}>
                <div className={styles.methodGrid}>
                  {packageFormats.map((item) => (
                    <div key={item.name} className={styles.infoCard}>
                      <span className={styles.methodIcon}>{item.icon}</span>
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
                <div className={styles.cardHeaderIcon}>🚚</div>
                <div>
                  <div className={styles.cardHeaderTitle}>Способи доставки</div>
                  <div className={styles.cardHeaderSub}>Як краще отримати замовлення</div>
                </div>
              </div>

              <div className={styles.cardBody}>
                <div className={styles.methodGrid}>
                  {deliveryMethods.map((m, i) => (
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
                      <span className={styles.methodIcon}>{m.icon}</span>
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
                <div className={styles.cardHeaderIcon}>📋</div>
                <div>
                  <div className={styles.cardHeaderTitle}>Як відбувається відправлення</div>
                  <div className={styles.cardHeaderSub}>Етапи підготовки замовлення</div>
                </div>
              </div>

              <div className={styles.cardBody}>
                <div className={styles.steps}>
                  {processSteps.map((s, i) => (
                    <div key={s.title} className={styles.step}>
                      <div className={styles.stepDot}>
                        {s.icon}
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
                <div className={styles.cardHeaderIcon}>💭</div>
                <div>
                  <div className={styles.cardHeaderTitle}>Поширені запитання</div>
                  <div className={styles.cardHeaderSub}>FAQ</div>
                </div>
              </div>

              <div className={styles.cardBody}>
                <div className={styles.faqList}>
                  {faqItems.map((f, i) => (
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
                <div className={styles.calcTitle}>Орієнтовні строки</div>
                <div className={styles.calcSub}>Швидка підказка</div>
              </div>

              <div className={styles.calcBody}>
                <div className={styles.calcField}>
                  <label className={styles.calcLabel} htmlFor="calc-country">
                    Напрямок
                  </label>
                  <select
                    id="calc-country"
                    className={styles.calcSelect}
                    value={calcDeliveryZone}
                    onChange={e => {
                      setCalcDeliveryZone(e.target.value as 'np' | 'ukrposhta' | 'international');
                      setCalcResult(null);
                    }}
                  >
                    <option value="np">Україна — Нова Пошта</option>
                    <option value="ukrposhta">Україна — Укрпошта</option>
                    <option value="international">Міжнародна доставка</option>
                  </select>
                </div>

                <div className={styles.calcField}>
                  <label className={styles.calcLabel} htmlFor="calc-format">
                    Формат замовлення
                  </label>
                  <select
                    id="calc-format"
                    className={styles.calcSelect}
                    value={calcFormat}
                    onChange={e => {
                      setCalcFormat(e.target.value as 'kit' | 'assembled');
                      setCalcResult(null);
                    }}
                  >
                    <option value="kit">Набір у деталях</option>
                    <option value="assembled">Зі складанням і склеюванням</option>
                  </select>
                </div>

                <button className={styles.calcBtn} type="button" onClick={handleCalc}>
                  Показати умови
                </button>

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
                        <span>Строк</span>
                        <span className={styles.calcResultVal}>{calcResult.time}</span>
                      </div>
                      <div className={styles.calcResultRow}>
                        <span>Вартість</span>
                        <span className={styles.calcResultVal}>{calcResult.price}</span>
                      </div>
                      <div className={styles.calcResultRow}>
                        <span>Примітка</span>
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
                <span className={styles.sideCardHeaderIcon}>🎀</span>
                <span className={styles.sideCardTitle}>Звʼязок з нами</span>
              </div>

              <div className={styles.supportList}>
                {supportLinks.map((s) => (
                  <a
                    key={s.href}
                    href={s.href}
                    className={styles.supportItem}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <div className={styles.supportItemIcon}>{s.icon}</div>
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
                <div className={styles.trustTitle}>Наш підхід</div>
                <ul className={styles.trustList} role="list">
                  {trustItems.map((t) => (
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
            <span className={styles.promoBarLabel}>✦ Потрібна допомога</span>
            <h2 className={styles.promoBarTitle}>
              Не знаєш, який спосіб доставки <span className={styles.promoBarTitleAccent}>обрати?</span>
            </h2>
            <p className={styles.promoBarSub}>
              Напиши нам у Telegram — підкажемо, який формат відправлення краще підійде саме для твоєї фігурки.
            </p>
          </div>

          <a
            href="https://t.me/SKUFnya_ua"
            className={styles.promoBarCta}
            target="_blank"
            rel="noreferrer"
          >
            Написати в Telegram →
          </a>
        </div>
      </section>
    </>
  );
}