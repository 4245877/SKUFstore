import styles from './Footer.module.css';

const footerLinks = {
  shop: {
    label: 'Магазин',
    labelJp: 'お買い物',
    links: [
      { href: '/catalog', label: 'Каталог' },
      { href: '/new-arrivals', label: 'Новинки' },
      { href: '/sale', label: 'Знижки' },
      { href: '/pre-order', label: 'Передзамовлення' },
      { href: '/brands', label: 'Бренди' },
    ],
  },
  categories: {
    label: 'Категорії',
    labelJp: 'カテゴリー',
    links: [
      { href: '/category/scale', label: 'Scale-фігурки' },
      { href: '/category/nendoroid', label: 'Nendoroid' },
      { href: '/category/figma', label: 'Figma' },
      { href: '/category/prize', label: 'Prize-фігурки' },
      { href: '/category/garage-kits', label: 'Гаражні кіти' },
    ],
  },
  info: {
    label: 'Інформація',
    labelJp: 'お知らせ',
    links: [
      { href: '/about', label: 'Про нас' },
      { href: '/shipping', label: 'Доставка й оплата' },
      { href: '/returns', label: 'Повернення' },
      { href: '/authenticity', label: 'Оригінальність' },
      { href: '/blog', label: 'Блог' },
    ],
  },
  support: {
    label: 'Підтримка',
    labelJp: 'サポート',
    links: [
      { href: '/faq', label: 'FAQ' },
      { href: '/contact', label: 'Контакти' },
      { href: '/track', label: 'Відстежити замовлення' },
      { href: '/size-guide', label: 'Гід по масштабах' },
      { href: '/care', label: 'Догляд за фігурками' },
    ],
  },
};

const socials = [
  { href: 'https://t.me/SKUFnya_ua', label: 'Telegram', icon: '✈' },
  { href: 'https://t.me/+l3_CI64EkuxlZmYy', label: 'Telegram канал', icon: '◉' },
  { href: 'viber://chat?number=%2B380938213102', label: 'Viber', icon: '◈' },
  { href: 'mailto:skufnya@gmail.com', label: 'Email', icon: '✉' },
];

const payments = ['Visa', 'Mastercard', 'Apple Pay', 'Google Pay', 'LiqPay'];

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      <div className={styles.laceBorder} aria-hidden="true" />

      <div className={styles.inner}>
        <div className={styles.brand}>
          <a href="/" className={styles.logo} aria-label="SKUFNYA — на головну">
            <span className={styles.logoMark}>✿</span>
            <span className={styles.logoText}>SKUFNYA</span>
          </a>
          <p className={styles.logoJp}>スクーフニャ</p>

          <p className={styles.brandDesc}>
            Магазин оригінальних аніме-фігурок — від компактних Nendoroid
            до масштабних колекційних релізів для справжніх фанатів.
          </p>

          <div className={styles.contacts}>
            <a href="mailto:skufnya@gmail.com" className={styles.contactItem}>
              <span className={styles.contactIcon}>✉</span>
              skufnya@gmail.com
            </a>

            <a href="tel:+380938213102" className={styles.contactItem}>
              <span className={styles.contactIcon}>☎</span>
              +380 93 821 31 02
            </a>

            <a
              href="viber://chat?number=%2B380938213102"
              className={styles.contactItem}
              aria-label="Viber"
            >
              <span className={styles.contactIcon}>◈</span>
              Viber: +380 93 821 31 02
            </a>

            <a
              href="https://t.me/SKUFnya_ua"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.contactItem}
            >
              <span className={styles.contactIcon}>✈</span>
              Telegram
            </a>

            <a
              href="https://t.me/+l3_CI64EkuxlZmYy"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.contactItem}
            >
              <span className={styles.contactIcon}>◉</span>
              Telegram-канал
            </a>
          </div>

          <div className={styles.socials}>
            {socials.map((s) => (
              <a
                key={s.label}
                href={s.href}
                target={s.href.startsWith('http') ? '_blank' : undefined}
                rel={s.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                aria-label={s.label}
                className={styles.socialBtn}
              >
                {s.icon}
              </a>
            ))}
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
                  <a href={link.href} className={styles.navLink}>
                    <span className={styles.navDot} aria-hidden="true" />
                    {link.label}
                  </a>
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
            <span className={styles.divider} aria-hidden="true">·</span>
            <a href="/privacy" className={styles.legalLink}>Конфіденційність</a>
            <span className={styles.divider} aria-hidden="true">·</span>
            <a href="/terms" className={styles.legalLink}>Умови</a>
          </div>

          <div className={styles.payments}>
            {payments.map((p) => (
              <span key={p} className={styles.paymentBadge}>{p}</span>
            ))}
          </div>
        </div>
      </div>

      <div className={styles.petalRow} aria-hidden="true">
        {['🌸', '✿', '❀', '✾', '🌸'].map((p, i) => (
          <span key={i} className={styles.petalItem} style={{ animationDelay: `${i * 0.4}s` }}>
            {p}
          </span>
        ))}
      </div>
    </footer>
  );
}