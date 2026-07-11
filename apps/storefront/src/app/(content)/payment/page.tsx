import Link from 'next/link';
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

const paymentOptions = [
  {
    icon: IconChatHeart,
    title: 'Передплата 60%',
    text: '60% від вартості потрібні для закупівлі матеріалів. Решта суми оплачується при отриманні після виготовлення.',
    tag: 'Зручно для першого замовлення',
  },
  {
    icon: IconCard,
    title: 'Повна передплата',
    text: '100% вартості можна внести після узгодження деталей замовлення. Це зручно, якщо хочеться одразу закрити оплату.',
    tag: 'Після погодження',
  },
];

const steps = [
  {
    icon: IconCart,
    title: 'Оформи заявку на сайті',
    text: 'Додай фігурку в кошик, заповни контакти, доставку та обери спосіб передплати.',
  },
  {
    icon: IconChatHeart,
    title: 'Напиши в OLX або Telegram',
    text: 'Ми підтвердимо модель, комплектацію, строки, доставку та суму передплати.',
  },
  {
    icon: IconReceipt,
    title: 'Внеси передплату після узгодження',
    text: 'Оплата не проходить автоматично на сайті. Реквізити надаються тільки після підтвердження замовлення.',
  },
  {
    icon: IconBox,
    title: 'Отримай замовлення',
    text: 'Після виготовлення та пакування ми надсилаємо посилку і передаємо номер для відстеження.',
  },
];

export default function PaymentPage() {
  return (
    <div className={s.page}>
      <div className={s.inner}>
        <nav className={s.breadcrumb} aria-label="Хлібні крихти">
          <Link href="/" className={s.breadcrumbItem}>Головна</Link>
          <span className={s.breadcrumbSep}>›</span>
          <span className={s.breadcrumbCurrent}>Оплата</span>
        </nav>

        <div className={s.pageHead}>
          <div className={s.pageEyebrow}>Оплата без онлайн-еквайрингу</div>
          <h1 className={s.pageTitle}>
            Передплата <span className={s.pageTitleAccent}>після узгодження</span>
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
                    <div className={s.cardTitle}>Як працює оплата</div>
                    <div className={s.cardSubtitle}>Без автоматичного списання коштів на сайті</div>
                  </div>
                </div>
              </div>

              <div className={s.cardBody}>
                <p className={s.checkLabel}>
                  Зараз SKUFnya працює у форматі ручного погодження замовлень.
                  Сайт приймає заявку, але не проводить оплату автоматично.
                  Після оформлення заявки ми звʼязуємося через OLX або Telegram,
                  уточнюємо деталі фігурки, строки виготовлення та спосіб передплати.
                </p>
              </div>
            </section>

            <section className={s.card}>
              <div className={s.cardHeader}>
                <div className={s.cardHeaderLeft}>
                  <div className={s.cardIcon}>
                    <IconCard size={17} strokeWidth={1.4} />
                  </div>
                  <div>
                    <div className={s.cardTitle}>Варіанти передплати</div>
                    <div className={s.cardSubtitle}>Обираються під час оформлення заявки</div>
                  </div>
                </div>
              </div>

              <div className={s.cardBody}>
                <div className={s.shippingOptions}>
                  {paymentOptions.map((item) => (
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
                    <div className={s.cardTitle}>Порядок оформлення</div>
                    <div className={s.cardSubtitle}>Від заявки до отримання</div>
                  </div>
                </div>
              </div>

              <div className={s.cardBody}>
                <div className={s.trustCard}>
                  {steps.map((step) => (
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
                <span className={s.summaryTitle}>Звʼязок перед оплатою</span>
                <span className={s.summaryCount}>Рекомендовано</span>
              </div>

              <div className={s.orderTotals}>
                <p className={s.checkLabel}>
                  Для першої покупки краще написати через OLX або Telegram.
                  Так можна поставити питання, уточнити модель і спокійно погодити оплату.
                </p>
              </div>

              <div className={s.submitWrap}>
                <a
                  href={OLX_PROFILE_URL}
                  className={s.submitBtn}
                  target="_blank"
                  rel="noreferrer"
                >
                  Написати в OLX
                </a>
              </div>

              <div className={s.submitWrap}>
                <a
                  href={TELEGRAM_URL}
                  className={s.confirmBtnSecondary}
                  target="_blank"
                  rel="noreferrer"
                >
                  Написати в Telegram →
                </a>
              </div>

              <p className={s.submitSubtext}>
                Оплата тільки після узгодження деталей
              </p>
            </div>

            <div className={s.trustCard}>
              <div className={s.trustItem}>
                <div className={s.trustIcon}>
                  <IconShieldCheck size={15} strokeWidth={1.4} />
                </div>
                <div className={s.trustInfo}>
                  <div className={s.trustTitle}>Без прихованої онлайн-оплати</div>
                  <div className={s.trustText}>
                    Сайт не просить дані банківської картки і не списує кошти автоматично.
                  </div>
                </div>
              </div>

              <div className={s.trustItem}>
                <div className={s.trustIcon}>
                  <IconChatHeart size={15} strokeWidth={1.4} />
                </div>
                <div className={s.trustInfo}>
                  <div className={s.trustTitle}>Підтвердження перед оплатою</div>
                  <div className={s.trustText}>
                    Передплата вноситься тільки після розмови та погодження замовлення.
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}