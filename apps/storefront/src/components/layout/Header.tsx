'use client';

import Link from 'next/link';
import { getTranslator } from '../../i18n/translate';
import { DEFAULT_LOCALE, type Locale } from '../../i18n/locales';
import { buildLocalizedPath } from '../../i18n/paths';
import { useRouter } from 'next/navigation';
import {
  Fragment,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
  type KeyboardEvent,
} from 'react';
import { getAccountProfile, getShippingPolicy, type ShippingPolicy } from '../../lib/api';
import {
  formatPrice,
  getCartItemsCount,
  readCart,
  readFavorites,
  subscribeToCartChange,
  subscribeToFavoritesChange,
} from '../../lib/demo-store';
import { IconBag, IconBow } from '../icons';
import styles from './Header.module.css';

type MegaLink = {
  label: string;
  href: string;
  accent?: boolean;
};

type NavItem = {
  label: string;
  labelJp: string;
  href: string;
  badge?: string;
  badgeVariant?: 'sale' | 'hot';
  mega?: Array<{
    heading: string;
    links: MegaLink[];
  }>;
};

export default function Header({ locale = DEFAULT_LOCALE }: { locale?: Locale }) {
  const t = getTranslator(locale);
  const href = (path: string) => buildLocalizedPath({ locale, path });

  const NAV_ITEMS: NavItem[] = [
    {
      label: t('nav.catalog'),
      labelJp: 'カタログ',
      href: '/catalog',
      mega: [
        {
          heading: t('nav.catalog'),
          links: [
            { label: t('nav.allProducts'), href: '/catalog' },
            { label: t('nav.favorites'), href: '/favorites' },
            { label: t('nav.cart'), href: '/cart' },
            { label: t('nav.checkout'), href: '/checkout' },
          ],
        },
        {
          heading: t('nav.purchase'),
          links: [
            { label: t('nav.delivery'), href: '/delivery' },
            { label: t('nav.payment'), href: '/payment' },
            { label: t('nav.returns'), href: '/returns' },
            { label: t('nav.serviceTerms'), href: '/terms', accent: true },
          ],
        },
        {
          heading: t('nav.account'),
          links: [
            { label: t('nav.profile'), href: '/profile' },
            { label: t('nav.orders'), href: '/profile/orders' },
            { label: t('nav.settings'), href: '/profile/settings' },
            { label: t('nav.contacts'), href: '/contacts', accent: true },
          ],
        },
      ],
    },
    {
      label: t('nav.favorites'),
      labelJp: 'お気に入り',
      href: '/favorites',
    },
    {
      label: t('nav.cart'),
      labelJp: 'カート',
      href: '/cart',
    },
    {
      label: t('nav.delivery'),
      labelJp: '配送',
      href: '/delivery',
    },
    {
      label: t('nav.contacts'),
      labelJp: '連絡先',
      href: '/contacts',
    },
  ];

  const SEARCH_PARAM_KEY = 'q';
  const CATALOG_PATH = href('/catalog');

  // Швидкі підбірки каталогу для мобільного меню
  const MOBILE_QUICK_LINKS = [
    { label: t('nav.allProducts'), href: '/catalog' },
    { label: t('nav.newest'), href: '/catalog?sort=newest' },
  ];

  const ANNOUNCEMENTS = [
    t('header.catalogAnnouncement'),
    t('header.promoAnnouncement'),
    t('header.newestAnnouncement'),
  ];


  const router = useRouter();
  const [shippingPolicy, setShippingPolicy] = useState<ShippingPolicy | null>(null);
  useEffect(() => {
    let active = true;
    getShippingPolicy().then((policy) => { if (active) setShippingPolicy(policy); }).catch(() => {});
    return () => { active = false; };
  }, []);
  const announcements = shippingPolicy
    ? [t('header.freeDelivery', { amount: formatPrice(shippingPolicy.freeDeliveryThreshold, shippingPolicy.currency) }), ...ANNOUNCEMENTS]
    : ANNOUNCEMENTS;

  const [scrolled, setScrolled] = useState(false);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [cartCount, setCartCount] = useState(0);
  const [wishCount, setWishCount] = useState(0);
  const [accountHref, setAccountHref] = useState('/login');

  const searchRef = useRef<HTMLInputElement>(null);
  const megaTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener('scroll', onScroll, { passive: true });

    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function syncAuth() {
      try {
        await getAccountProfile();
        if (!cancelled) setAccountHref('/profile');
      } catch {
        if (!cancelled) setAccountHref('/login');
      }
    }

    syncAuth();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (searchOpen) {
      const timer = window.setTimeout(() => searchRef.current?.focus(), 120);
      return () => window.clearTimeout(timer);
    }
  }, [searchOpen]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  useEffect(() => {
    const syncCounters = () => {
      setCartCount(getCartItemsCount(readCart()));
      setWishCount(readFavorites().length);
    };

    syncCounters();

    const unsubscribeCart = subscribeToCartChange(syncCounters);
    const unsubscribeFavorites = subscribeToFavoritesChange(syncCounters);

    return () => {
      unsubscribeCart();
      unsubscribeFavorites();
    };
  }, []);

  const handleNavEnter = (label: string) => {
    if (megaTimeout.current) clearTimeout(megaTimeout.current);
    setActiveMenu(label);
  };

  const handleNavLeave = () => {
    megaTimeout.current = setTimeout(() => setActiveMenu(null), 120);
  };

  const handleMegaEnter = () => {
    if (megaTimeout.current) clearTimeout(megaTimeout.current);
  };

  const closeMobileMenu = () => {
    setMobileOpen(false);
  };

  const buildSearchHref = (rawValue: string) => {
    const value = rawValue.trim();

    if (!value) return CATALOG_PATH;

    const params = new URLSearchParams({
      [SEARCH_PARAM_KEY]: value,
    });

    return `${CATALOG_PATH}?${params.toString()}`;
  };

  const submitSearch = (rawValue?: string) => {
    const nextHref = buildSearchHref(rawValue ?? searchValue);

    setSearchOpen(false);
    setMobileOpen(false);
    setActiveMenu(null);

    router.push(nextHref);
  };

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    submitSearch();
  };

  const handleSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      setSearchOpen(false);
      event.currentTarget.blur();
    }
  };

  return (
    <>
      <header
        className={`${styles.header} ${scrolled ? styles.scrolled : ''} ${
          mobileOpen ? styles.mobileExpanded : ''
        }`}
        role="banner"
      >
        <div className={styles.ribbon} aria-label={t('header.announcements')}>
          <div className={styles.ribbonTrack}>
            {[0, 1].map((copy) => (
              <div className={styles.ribbonInner} key={copy} aria-hidden={copy === 1}>
                {announcements.map((text, i) => (
                  <Fragment key={`${copy}-${i}`}>
                    {i > 0 && <span className={styles.ribbonSep}>✦</span>}
                    <span>{text}</span>
                  </Fragment>
                ))}
              </div>
            ))}
          </div>
        </div>

        <div className={styles.inner}>
          <Link href={href('/')} className={styles.logo} aria-label={t('header.home')}>
            <span className={styles.logoIcon} aria-hidden="true">
              <IconBow size={24} />
            </span>
            <span className={styles.logoTextWrap}>
              <span className={styles.logoMain}>SKUFNYA</span>
              <span className={styles.logoSub}>スクフニャ</span>
            </span>
          </Link>

          <nav className={styles.nav} aria-label={t('header.navigation')}>
            <ul className={styles.navList} role="list">
              {NAV_ITEMS.map((item) => (
                <li
                  key={item.label}
                  className={`${styles.navItem} ${
                    activeMenu === item.label ? styles.navItemActive : ''
                  }`}
                  onMouseEnter={() => (item.mega ? handleNavEnter(item.label) : undefined)}
                  onMouseLeave={item.mega ? handleNavLeave : undefined}
                >
                  <Link
                    href={href(item.href)}
                    className={styles.navLink}
                    aria-expanded={item.mega ? activeMenu === item.label : undefined}
                    aria-haspopup={item.mega ? 'true' : undefined}
                  >
                    <span className={styles.navLinkJp}>{item.labelJp}</span>
                    <span className={styles.navLinkLabel}>{item.label}</span>

                    {item.badge && (
                      <span
                        className={`${styles.navBadge} ${
                          item.badgeVariant === 'sale'
                            ? styles.navBadgeSale
                            : styles.navBadgeHot
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}

                    {item.mega && (
                      <svg
                        className={styles.navChevron}
                        width="10"
                        height="6"
                        viewBox="0 0 10 6"
                        fill="none"
                        aria-hidden="true"
                      >
                        <path
                          d="M1 1L5 5L9 1"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </Link>

                  {item.mega && (
                    <div
                      className={`${styles.mega} ${
                        activeMenu === item.label ? styles.megaVisible : ''
                      }`}
                      onMouseEnter={handleMegaEnter}
                      onMouseLeave={handleNavLeave}
                      role="region"
                      aria-label={t('header.submenu', { label: item.label })}
                    >
                      <div className={styles.megaInner}>
                        {item.mega.map((col) => (
                          <div key={col.heading} className={styles.megaCol}>
                            <p className={styles.megaColHeading}>{col.heading}</p>
                            <ul role="list" className={styles.megaColList}>
                              {col.links.map((link) => (
                                <li key={link.label}>
                                  <Link
                                    href={href(link.href)}
                                    className={`${styles.megaLink} ${
                                      link.accent ? styles.megaLinkAccent : ''
                                    }`}
                                  >
                                    {link.label}
                                  </Link>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}

                        <div className={styles.megaFeatured}>
                          <p className={styles.megaFeaturedLabel}>{t('header.quickAccess')}</p>
                          <div className={styles.megaFeaturedCard}>
                            <div className={styles.megaFeaturedImage} aria-hidden="true">
                              <IconBag size={44} strokeWidth={1.2} />
                            </div>
                            <div className={styles.megaFeaturedBody}>
                              <p className={styles.megaFeaturedSeries}>{t('nav.personalAccount')}</p>
                              <p className={styles.megaFeaturedName}>
                                {t('header.accountDescription')}
                              </p>
                              <p className={styles.megaFeaturedPrice}>{t('header.accountSummary')}</p>
                              <Link href={href('/profile')} className={styles.megaFeaturedCta}>
                                {t('header.open')}
                                <svg
                                  width="12"
                                  height="12"
                                  viewBox="0 0 12 12"
                                  fill="none"
                                  aria-hidden="true"
                                >
                                  <path
                                    d="M2 6H10M10 6L6.5 2.5M10 6L6.5 9.5"
                                    stroke="currentColor"
                                    strokeWidth="1.3"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                </svg>
                              </Link>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </nav>

          <div className={styles.actions}>
            <button
              type="button"
              className={`${styles.iconBtn} ${styles.searchToggle} ${
                searchOpen ? styles.iconBtnActive : ''
              }`}
              onClick={() => {
                setMobileOpen(false);
                setSearchOpen((v) => !v);
              }}
              aria-label={t('header.search')}
              aria-expanded={searchOpen}
              aria-controls="search-bar"
            >
              {searchOpen ? (
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                  <path
                    d="M2 2L16 16M16 2L2 16"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                  <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.6" />
                  <path
                    d="M12.5 12.5L16 16"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                </svg>
              )}
            </button>

            <Link
              href={href('/favorites')}
              className={styles.iconBtn}
              aria-label={t('header.wishlistCount', { count: wishCount })}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                <path
                  d="M9 15C9 15 2 10.5 2 6a3.5 3.5 0 0 1 7-0.35A3.5 3.5 0 0 1 16 6c0 4.5-7 9-7 9z"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinejoin="round"
                />
              </svg>
              {wishCount > 0 && (
                <span className={styles.badge} aria-hidden="true">
                  {wishCount}
                </span>
              )}
            </Link>

            <Link
              href={href('/cart')}
              className={`${styles.iconBtn} ${styles.cartBtn}`}
              aria-label={t('header.cartCount', { count: cartCount })}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                <path
                  d="M1.5 1.5H3.5L5.5 12H13.5L15.5 5H4.5"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle cx="7" cy="15" r="1" fill="currentColor" />
                <circle cx="12" cy="15" r="1" fill="currentColor" />
              </svg>
              {cartCount > 0 && (
                <span className={`${styles.badge} ${styles.badgeCart}`} aria-hidden="true">
                  {cartCount}
                </span>
              )}
            </Link>

            <Link href={href(accountHref)} className={styles.iconBtn} aria-label={t('nav.personalAccount')}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                <circle cx="9" cy="6.5" r="3" stroke="currentColor" strokeWidth="1.6" />
                <path
                  d="M2.5 15.5c0-3.31 2.91-6 6.5-6s6.5 2.69 6.5 6"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
            </Link>

            <button
              type="button"
              className={`${styles.burger} ${mobileOpen ? styles.burgerOpen : ''}`}
              onClick={() => {
                // Закриваємо пошук, щоб шапка не ставала вищою за top меню
                setSearchOpen(false);
                setMobileOpen((v) => !v);
              }}
              aria-label={mobileOpen ? t('header.closeMenu') : t('header.openMenu')}
              aria-expanded={mobileOpen}
              aria-controls="mobile-nav"
            >
              <span className={styles.burgerLine} />
              <span className={styles.burgerLine} />
              <span className={styles.burgerLine} />
            </button>
          </div>
        </div>

        <div
          className={`${styles.searchBar} ${searchOpen ? styles.searchBarOpen : ''}`}
          id="search-bar"
          aria-hidden={!searchOpen}
        >
          <form className={styles.searchBarInner} onSubmit={handleSearchSubmit} role="search">
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              className={styles.searchBarIcon}
              aria-hidden="true"
            >
              <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" />
              <path
                d="M11 11L14 14"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>

            <input
              ref={searchRef}
              type="search"
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder={t('header.searchPlaceholder')}
              className={styles.searchInput}
              aria-label={t('header.searchSite')}
              tabIndex={searchOpen ? 0 : -1}
            />

            <button
              type="submit"
              className={styles.searchSubmit}
              tabIndex={searchOpen ? 0 : -1}
            >
              {t('header.searchSubmit')}
            </button>

            <span className={styles.searchHint}>{t('header.searchHint')}</span>
          </form>
        </div>
      </header>

      <div
        id="mobile-nav"
        className={`${styles.mobileNav} ${mobileOpen ? styles.mobileNavOpen : ''}`}
        aria-hidden={!mobileOpen}
        role="dialog"
        aria-modal="true"
        aria-label={t('header.mobileNavigation')}
      >
        <div className={styles.mobileNavInner}>
          <form className={styles.mobileSearch} onSubmit={handleSearchSubmit} role="search">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" />
              <path
                d="M11 11L14 14"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>

            <input
              type="search"
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder={t('header.mobileSearchPlaceholder')}
              className={styles.mobileSearchInput}
              aria-label={t('header.search')}
              tabIndex={mobileOpen ? 0 : -1}
            />

            <button
              type="submit"
              className={styles.mobileSearchSubmit}
              tabIndex={mobileOpen ? 0 : -1}
            >
              {t('header.searchSubmit')}
            </button>
          </form>

          <ul className={styles.mobileNavList} role="list">
            {NAV_ITEMS.map((item, i) => (
              <li
                key={item.label}
                className={styles.mobileNavItem}
                style={{ '--i': i } as CSSProperties}
              >
                <Link
                  href={href(item.href)}
                  className={styles.mobileNavLink}
                  onClick={closeMobileMenu}
                  tabIndex={mobileOpen ? 0 : -1}
                >
                  <span className={styles.mobileNavLinkText}>
                    <span className={styles.mobileNavLinkJp}>{item.labelJp}</span>
                    <span className={styles.mobileNavLinkLabel}>
                      {item.label}
                      {item.badge && (
                        <span
                          className={`${styles.navBadge} ${
                            item.badgeVariant === 'sale'
                              ? styles.navBadgeSale
                              : styles.navBadgeHot
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </span>
                  </span>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <path
                      d="M4 8H12M12 8L8 4M12 8L8 12"
                      stroke="currentColor"
                      strokeWidth="1.3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </Link>
              </li>
            ))}
          </ul>

          <div className={styles.mobileQuick}>
            <p className={styles.mobileQuickTitle}>{t('header.collections')}</p>
            <div className={styles.mobileQuickGrid}>
              {MOBILE_QUICK_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={href(link.href)}
                  className={styles.mobileQuickLink}
                  onClick={closeMobileMenu}
                  tabIndex={mobileOpen ? 0 : -1}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          <div className={styles.mobileNavFooter}>
            <div className={styles.mobileNavLinks}>
              <Link href={href(accountHref)} tabIndex={mobileOpen ? 0 : -1} onClick={closeMobileMenu}>
                {t('nav.personalAccount')}
              </Link>
              <Link href={href('/favorites')} tabIndex={mobileOpen ? 0 : -1} onClick={closeMobileMenu}>
                {t('nav.wishlist')}
              </Link>
              <Link href={href('/cart')} tabIndex={mobileOpen ? 0 : -1} onClick={closeMobileMenu}>
                {t('nav.cart')}
              </Link>
            </div>
            <p className={styles.mobileNavBrand}>
              <IconBow size={14} /> SKUFNYA · スクフニャ
            </p>
          </div>
        </div>
      </div>

      <div
        className={`${styles.overlay} ${mobileOpen ? styles.overlayVisible : ''}`}
        onClick={() => setMobileOpen(false)}
        aria-hidden="true"
      />
    </>
  );
}
