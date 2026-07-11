import Link from 'next/link';

import {
  IconBow,
  IconInstagram,
  IconMail,
  IconPhone,
  IconTelegram,
  IconTiktok,
  IconViber,
} from '../icons';
import styles from './Footer.module.css';

const footerLinks = {
  shop: {
    label: 'Магазин',
    labelJp: 'お買い物',
    links: [
      { href: '/catalog', label: 'Каталог' },
      { href: '/cart', label: 'Кошик' },
      { href: '/favorites', label: 'Обране' },
    ],
  },
  purchase: {
    label: 'Покупцям',
    labelJp: 'ご案内',
    links: [
      { href: '/delivery', label: 'Доставка' },
      { href: '/payment', label: 'Оплата' },
      { href: '/faq', label: 'FAQ' },
      { href: '/contacts', label: 'Контакти' },
    ],
  },
  legal: {
    label: 'Документи',
    labelJp: '書類',
    links: [
      { href: '/privacy', label: 'Конфіденційність' },
      { href: '/terms', label: 'Умови користування' },
      { href: '/user-data-deletion', label: 'Видалення даних' },
    ],
  },
};

const socials = [
  { href: 'https://t.me/SKUFnya_ua', label: 'Telegram', icon: IconTelegram },
  { href: 'https://t.me/+l3_CI64EkuxlZmYy', label: 'Telegram канал', icon: IconTelegram },
  { href: 'viber://chat?number=%2B380938213102', label: 'Viber', icon: IconViber },
  { href: 'https://www.instagram.com/skufnya_ua', label: 'Instagram', icon: IconInstagram },
  { href: 'https://www.tiktok.com/@skuf_nya', label: 'TikTok', icon: IconTiktok },
  { href: 'mailto:skufnya@gmail.com', label: 'Email', icon: IconMail },
];

const serviceBadges = ['Оплата після узгодження', 'Нова пошта', 'Укрпошта'];

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      <div className={styles.laceBorder} aria-hidden="true" />

      <div className={styles.inner}>
        <div className={styles.brand}>
          <Link href="/" className={styles.logo} aria-label="SKUFNYA — на головну">
            <span className={styles.logoMark}>
              <IconBow size={22} />
            </span>
            <span className={styles.logoText}>SKUFNYA</span>
          </Link>

          <p className={styles.logoJp}>スクフニャ</p>

          <p className={styles.brandDesc}>
            Магазин аніме-фігурок і колекційних моделей з уважним відбором,
            дбайливим пакуванням та доставкою по Україні.
          </p>

          <div className={styles.contacts}>
            <a href="mailto:skufnya@gmail.com" className={styles.contactItem}>
              <span className={styles.contactIcon}>
                <IconMail size={14} />
              </span>
              skufnya@gmail.com
            </a>

            <a href="tel:+380938213102" className={styles.contactItem}>
              <span className={styles.contactIcon}>
                <IconPhone size={14} />
              </span>
              +380 93 821 31 02
            </a>

            <a
              href="viber://chat?number=%2B380938213102"
              className={styles.contactItem}
              aria-label="Написати у Viber"
            >
              <span className={styles.contactIcon}>
                <IconViber size={14} />
              </span>
              Viber: +380 93 821 31 02
            </a>

            <a
              href="https://t.me/SKUFnya_ua"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.contactItem}
            >
              <span className={styles.contactIcon}>
                <IconTelegram size={14} />
              </span>
              Telegram
            </a>

            <a
              href="https://t.me/+l3_CI64EkuxlZmYy"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.contactItem}
            >
              <span className={styles.contactIcon}>
                <IconTelegram size={14} />
              </span>
              Telegram-канал
            </a>

            <a
              href="https://www.instagram.com/skufnya_ua"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.contactItem}
            >
              <span className={styles.contactIcon}>
                <IconInstagram size={14} />
              </span>
              Instagram
            </a>

            <a
              href="https://www.tiktok.com/@skuf_nya"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.contactItem}
            >
              <span className={styles.contactIcon}>
                <IconTiktok size={14} />
              </span>
              TikTok
            </a>
          </div>

          <div className={styles.socials}>
            {socials.map((s) => {
              const SocialIcon = s.icon;

              return (
                <a
                  key={s.label}
                  href={s.href}
                  target={s.href.startsWith('http') ? '_blank' : undefined}
                  rel={s.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                  aria-label={s.label}
                  title={s.label}
                  className={styles.socialBtn}
                >
                  <SocialIcon size={16} />
                </a>
              );
            })}
          </div>
        </div>

        {Object.values(footerLinks).map((col) => (
          <nav key={col.label} className={styles.navCol} aria-label={col.label}>
            <div className={styles.colHead}>
              <span className={styles.colLabel}>{col.label}</span>
              <span className={styles.colLabelJp}>{col.labelJp}</span>
            </div>

            <ul className={styles.navList}>
              {col.links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className={styles.navLink}>
                    <span className={styles.navDot} aria-hidden="true" />
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>

      <div className={styles.bottom}>
        <div className={styles.bottomInner}>
          <div className={styles.bottomLeft}>
            <span className={styles.copyright}>
              © {year} SKUFNYA. Усі права захищені.
            </span>

            <span className={styles.divider} aria-hidden="true">
              ·
            </span>

            <Link href="/privacy" className={styles.legalLink}>
              Конфіденційність
            </Link>

            <span className={styles.divider} aria-hidden="true">
              ·
            </span>

            <Link href="/terms" className={styles.legalLink}>
              Умови
            </Link>
          </div>

          <div className={styles.payments} aria-label="Доступні способи обслуговування">
            {serviceBadges.map((p) => (
              <span key={p} className={styles.paymentBadge}>
                {p}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className={styles.petalRow} aria-hidden="true">
        {['✿', '❀', '✾', '❁', '✿'].map((p, i) => (
          <span
            key={i}
            className={styles.petalItem}
            style={{ animationDelay: `${i * 0.4}s` }}
          >
            {p}
          </span>
        ))}
      </div>
    </footer>
  );
}
