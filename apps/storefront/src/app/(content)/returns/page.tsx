import Link from 'next/link';
import type { Metadata } from 'next';

import styles from './Returns.module.css';

export const metadata: Metadata = {
  title: 'Повернення та обмін',
  description:
    'Умови повернення та обміну товарів у магазині SKUFNYA: строки, стан товару, порядок звернення та контакти.',
};

export default function ReturnsPage() {
  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroBg} aria-hidden="true">
          <span className={styles.heroBgCircle} />
          <span className={styles.heroBgCircle} />
        </div>

        <div className={styles.heroInner}>
          <div className={styles.heroText}>
            <nav className={styles.breadcrumb} aria-label="Навігація">
              <Link href="/">SKUFNYA</Link>
              <span className={styles.breadcrumbSep}>/</span>
              <span>Повернення та обмін</span>
            </nav>

            <p className={styles.heroEyebrow}>Повернення та обмін</p>

            <h1 className={styles.heroTitle}>
              Умови{' '}
              <span className={styles.heroTitleAccent}>повернення</span> та
              обміну
            </h1>

            <p className={styles.heroLead}>
              Ми уважно перевіряємо товари перед відправленням і дбайливо
              пакуємо кожне замовлення. Якщо з товаром виникла проблема,
              будь ласка, напиши нам — ми допоможемо розібратися та знайти
              зручне рішення.
            </p>
          </div>

          <div className={styles.heroBadgeGroup} aria-label="Короткі умови">
            <div className={styles.heroBadge}>
              <span className={styles.heroBadgeIcon} aria-hidden="true">
                ↺
              </span>
              <span className={styles.heroBadgeText}>
                <span className={styles.heroBadgeLabel}>Строк</span>
                <span className={styles.heroBadgeValue}>14 днів</span>
              </span>
            </div>

            <div className={styles.heroBadge}>
              <span className={styles.heroBadgeIcon} aria-hidden="true">
                ✧
              </span>
              <span className={styles.heroBadgeText}>
                <span className={styles.heroBadgeLabel}>Стан товару</span>
                <span className={styles.heroBadgeValue}>Без використання</span>
              </span>
            </div>

            <div className={styles.heroBadge}>
              <span className={styles.heroBadgeIcon} aria-hidden="true">
                ✉
              </span>
              <span className={styles.heroBadgeText}>
                <span className={styles.heroBadgeLabel}>Звернення</span>
                <span className={styles.heroBadgeValue}>Email / Telegram</span>
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
              <h2 className={styles.sectionTitle}>Коли можливе повернення</h2>
            </div>

            <div className={styles.sectionBody}>
              <p>
                Повернення або обмін можливі протягом 14 днів з моменту
                отримання замовлення, якщо товар не був у використанні, має
                збережений товарний вигляд, повну комплектацію, оригінальне
                пакування та підтвердження покупки.
              </p>

              <div className={styles.conditionsList}>
                <span className={styles.conditionPill}>
                  <span className={styles.conditionPillCheck}>✓</span>
                  14 днів
                </span>
                <span className={styles.conditionPill}>
                  <span className={styles.conditionPillCheck}>✓</span>
                  Без слідів використання
                </span>
                <span className={styles.conditionPill}>
                  <span className={styles.conditionPillCheck}>✓</span>
                  Збережене пакування
                </span>
                <span className={styles.conditionPill}>
                  <span className={styles.conditionPillCheck}>✓</span>
                  Є підтвердження покупки
                </span>
              </div>
            </div>
          </section>

          <section className={styles.sectionCard}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionIcon} aria-hidden="true">
                02
              </span>
              <h2 className={styles.sectionTitle}>
                Коли товар не підлягає поверненню
              </h2>
            </div>

            <div className={styles.sectionBody}>
              <p>
                Товар може не підлягати поверненню, якщо він має сліди
                використання, пошкоджене пакування або комплектацію, був
                виготовлений чи індивідуально підготовлений під конкретне
                замовлення, якщо інше не передбачено законодавством України.
              </p>

              <div className={styles.infoBox}>
                <span className={styles.infoBoxIcon} aria-hidden="true">
                  !
                </span>
                <p className={styles.infoBoxText}>
                  <strong>Важливо:</strong> перед відправкою товару назад
                  обов’язково дочекайся підтвердження від менеджера.
                </p>
              </div>
            </div>
          </section>

          <section className={styles.sectionCard}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionIcon} aria-hidden="true">
                03
              </span>
              <h2 className={styles.sectionTitle}>Як оформити звернення</h2>
            </div>

            <div className={styles.sectionBody}>
              <ol className={styles.stepsList}>
                <li className={styles.stepsItem}>
                  <span className={styles.stepsNum}>1</span>
                  <span className={styles.stepsText}>
                    Напиши нам на{' '}
                    <a className={styles.inlineLink} href="mailto:skufnya@gmail.com">
                      email
                    </a>
                    , у{' '}
                    <a
                      className={styles.inlineLink}
                      href="https://t.me/SKUFnya_ua"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Telegram
                    </a>{' '}
                    або Viber.
                  </span>
                </li>

                <li className={styles.stepsItem}>
                  <span className={styles.stepsNum}>2</span>
                  <span className={styles.stepsText}>
                    Вкажи номер замовлення, ім’я та коротко опиши ситуацію.
                  </span>
                </li>

                <li className={styles.stepsItem}>
                  <span className={styles.stepsNum}>3</span>
                  <span className={styles.stepsText}>
                    Додай фото товару й пакування, а також фото пошкоджень, якщо вони є.
                  </span>
                </li>

                <li className={styles.stepsItem}>
                  <span className={styles.stepsNum}>4</span>
                  <span className={styles.stepsText}>
                    Дочекайся підтвердження від менеджера перед відправкою
                    товару назад.
                  </span>
                </li>
              </ol>
            </div>
          </section>

          <section className={styles.sectionCard}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionIcon} aria-hidden="true">
                04
              </span>
              <h2 className={styles.sectionTitle}>
                Доставка при поверненні
              </h2>
            </div>

            <div className={styles.sectionBody}>
              <p>
                Якщо повернення пов’язане з нашою помилкою або пошкодженням
                товару до отримання, ми окремо узгодимо компенсацію або оплату
                доставки. В інших випадках витрати на зворотну доставку оплачує покупець,
                якщо інше не узгоджено з менеджером.
              </p>
            </div>
          </section>

          <section className={styles.sectionCard}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionIcon} aria-hidden="true">
                05
              </span>
              <h2 className={styles.sectionTitle}>Повернення коштів</h2>
            </div>

            <div className={styles.sectionBody}>
              <p>
                Повернення коштів здійснюється після отримання та перевірки
                товару. Спосіб повернення узгоджується індивідуально через
                контактний канал, яким було оформлено звернення.
              </p>
            </div>
          </section>

          <section className={styles.sectionCard}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionIcon} aria-hidden="true">
                06
              </span>
              <h2 className={styles.sectionTitle}>Контакти для звернення</h2>
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

        <aside className={styles.sidebar} aria-label="Додаткова інформація">
          <section className={styles.contactCard}>
            <p className={styles.contactCardLabel}>Допомога</p>

            <h2 className={styles.contactCardTitle}>
              Напиши нам, якщо потрібна <em>допомога</em>
            </h2>

            <p className={styles.contactCardDesc}>
              Ми підкажемо, як правильно оформити звернення, які фото додати
              та що робити далі.
            </p>

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

          <section className={styles.timelineCard} aria-label="Процес повернення">
            <p className={styles.timelineCardLabel}>Процес</p>

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
                  <p className={styles.timelineStep}>Звернення</p>
                  <p className={styles.timelineDesc}>
                    Напиши нам і коротко опиши ситуацію.
                  </p>
                </div>
              </div>

              <div className={styles.timelineItem}>
                <div className={styles.timelineTrack}>
                  <span className={styles.timelineDot}>2</span>
                </div>
                <div className={styles.timelineContent}>
                  <p className={styles.timelineStep}>Перевірка</p>
                  <p className={styles.timelineDesc}>
                    Менеджер уточнить деталі та підтвердить наступні кроки.
                  </p>
                </div>
              </div>

              <div className={styles.timelineItem}>
                <div className={styles.timelineTrack}>
                  <span className={styles.timelineDot}>3</span>
                </div>
                <div className={styles.timelineContent}>
                  <p className={styles.timelineStep}>Рішення</p>
                  <p className={styles.timelineDesc}>
                    Узгодимо обмін, повернення або інший коректний варіант.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className={styles.policyNote} aria-label="Примітка до умов повернення">
            <span className={styles.policyNoteIcon} aria-hidden="true">
              ※
            </span>
            <p className={styles.policyNoteText}>
              <strong>Останнє оновлення:</strong> травень 2026 року.
              Умови можуть уточнюватися відповідно до законодавства України.
            </p>
          </section>
        </aside>
      </main>

      <footer className={styles.pageFooter}>
        <div className={styles.pageFooterInner}>
          <p className={styles.pageFooterText}>
            <strong>SKUFNYA</strong> — повернення та обмін товарів
          </p>

          <nav className={styles.pageFooterNav} aria-label="Нижня навігація">
            <Link className={styles.pageFooterLink} href="/">
              На головну
            </Link>
            <a className={styles.pageFooterLink} href="mailto:skufnya@gmail.com">
              Написати нам
            </a>
          </nav>
        </div>
      </footer>
    </div>
  );
}