import Link from 'next/link';
import { getTranslator } from '../../i18n/translate';
import { DEFAULT_LOCALE, type Locale } from '../../i18n/locales';
import { buildLocalizedPath } from '../../i18n/paths';

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

export default function Footer({ locale = DEFAULT_LOCALE }: { locale?: Locale }) {
  const t = getTranslator(locale);
  const href = (path: string) => buildLocalizedPath({ locale, path });

  const footerLinks = {
    shop: {
      label: t('footer.shop'),
      labelJp: 'お買い物',
      links: [
        { href: '/catalog', label: t('nav.catalog') },
        { href: '/cart', label: t('nav.cart') },
        { href: '/favorites', label: t('nav.favorites') },
      ],
    },
    purchase: {
      label: t('footer.buyers'),
      labelJp: 'ご案内',
      links: [
        { href: '/delivery', label: t('nav.delivery') },
        { href: '/payment', label: t('nav.payment') },
        { href: '/faq', label: t('nav.faq') },
        { href: '/contacts', label: t('nav.contacts') },
      ],
    },
    legal: {
      label: t('footer.documents'),
      labelJp: '書類',
      links: [
        { href: '/privacy', label: t('nav.privacy') },
        { href: '/terms', label: t('nav.terms') },
        { href: '/user-data-deletion', label: t('nav.dataDeletion') },
      ],
    },
  };

  const socials = [
    { href: 'https://t.me/SKUFnya_ua', label: 'Telegram', icon: IconTelegram },
    { href: 'https://t.me/+l3_CI64EkuxlZmYy', label: t('footer.telegramLabel'), icon: IconTelegram },
    { href: 'viber://chat?number=%2B380938213102', label: 'Viber', icon: IconViber },
    { href: 'https://www.instagram.com/skufnya_ua', label: 'Instagram', icon: IconInstagram },
    { href: 'https://www.tiktok.com/@skuf_nya', label: 'TikTok', icon: IconTiktok },
    { href: 'mailto:skufnya@gmail.com', label: 'Email', icon: IconMail },
  ];

  const serviceBadges = [t('footer.paymentAgreement'), t('footer.novaPoshta'), t('footer.ukrposhta')];


  const year = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      <div className={styles.laceBorder} aria-hidden="true" />

      <div className={styles.inner}>
        <div className={styles.brand}>
          <Link href={href('/')} className={styles.logo} aria-label={t('footer.home')}>
            <span className={styles.logoMark}>
              <IconBow size={22} />
            </span>
            <span className={styles.logoText}>SKUFNYA</span>
          </Link>

          <p className={styles.logoJp}>スクフニャ</p>

          <p className={styles.brandDesc}>
            {t('footer.description')}
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
              aria-label={t('footer.viber')}
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
              {t('footer.telegramChannel')}
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
                  <Link href={href(link.href)} className={styles.navLink}>
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
              © {year} {t('footer.copyright')}
            </span>

            <span className={styles.divider} aria-hidden="true">
              ·
            </span>

            <Link href={href('/privacy')} className={styles.legalLink}>
              {t('nav.privacy')}
            </Link>

            <span className={styles.divider} aria-hidden="true">
              ·
            </span>

            <Link href={href('/terms')} className={styles.legalLink}>
              {t('nav.shortTerms')}
            </Link>
          </div>

          <div className={styles.payments} aria-label={t('footer.services')}>
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
