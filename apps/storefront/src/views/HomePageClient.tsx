'use client';

import { useI18n } from '../i18n/client';
import type { Translator } from '../i18n/translate';
import Link from '../i18n/navigation'
import Image from 'next/image'
import { Fragment, useEffect, useMemo, useState } from 'react'
import {
  getCatalogCategories,
  getHomeProducts,
  resolveMediaUrl,
  type CatalogCategoryTreeItem,
  type HomeProductItem,
} from '../lib/api'
import {
  IconArrowUpRight,
  IconBow,
  IconBox,
  IconChatHeart,
  IconCrown,
  IconFlower,
  IconGrid,
  IconLightning,
  IconMailHeart,
  IconShieldCheck,
  IconSword,
  IconTelegram,
  IconTruck,
  IconWand,
  IconWrench,
} from '../components/icons'
import threeDPrintingArt from './_media/three-d-drukarnya.png'
import s from './Home.module.css'

const THREE_D_PRINTING_URL =
  'https://4245877.github.io/3D-Drukarnya/?utm_source=skufnya&utm_medium=referral&utm_campaign=3d_drukarnya&utm_content=homepage_promo'

const FEATURES = (t: Translator) => ([
  {
    icon: IconShieldCheck,
    title: t('home.carefullySelectedModels'),
    text: t('home.weSelectFiguresAndVariantsWithA'),
  },
  {
    icon: IconBox,
    title: t('home.carefulPackaging'),
    text: t('home.reliableProtectionForEveryItemDuringDelivery'),
  },
  {
    icon: IconTruck,
    title: t('home.deliveryWithinUkraine'),
    text: t('home.pickupAndCarrierDeliveryWithOrderTracking'),
  },
  {
    icon: IconChatHeart,
    title: t('home.helpChoosingYourFigure'),
    text: t('home.weLlHelpYouExploreTheCatalog'),
  },
] as const)

const THREE_D_PRINTING_DIRECTIONS = (t: Translator) => ([
  {
    icon: IconBox,
    label: t('home.enclosuresForNasAndElectronics'),
  },
  {
    icon: IconGrid,
    label: t('home.miniRacksAndRackComponents'),
  },
  {
    icon: IconWrench,
    label: t('home.mountsAndAdaptersForYourSetup'),
  },
] as const)

const THREE_D_PRINTING_MATERIALS = ['PETG', 'PLA', 'ABS'] as const

const CATEGORY_DECOR = [
  { icon: IconSword, color: '#e8d5aa' },
  { icon: IconFlower, color: '#f2c9c9' },
  { icon: IconLightning, color: '#c8bfc4' },
  { icon: IconCrown, color: '#d4e8c9' },
  { icon: IconBow, color: '#e7d9f6' },
  { icon: IconWand, color: '#cfe7f1' },
] as const

function flattenCategoryTree(items: CatalogCategoryTreeItem[]): CatalogCategoryTreeItem[] {
  return items.flatMap((item) => [item, ...flattenCategoryTree(item.children ?? [])])
}

function pluralizeProducts(t: Translator, count: number) {
  const mod10 = count % 10
  const mod100 = count % 100

  if (mod10 === 1 && mod100 !== 11) return t('shop.product_757')
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return t('shop.products')
  return t('shop.products_759')
}

function pluralizeCategories(t: Translator, count: number) {
  const mod10 = count % 10
  const mod100 = count % 100

  if (mod10 === 1 && mod100 !== 11) return t('home.category')
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return t('home.categories')
  return t('home.categories_1130')
}

function formatProductCount(t: Translator, count?: number) {
  const value = Math.max(0, count ?? 0)
  return `${value.toLocaleString('uk-UA')} ${pluralizeProducts(t, value)}`
}

function buildHomeCategories(t: Translator, items: CatalogCategoryTreeItem[]) {
  const selected: CatalogCategoryTreeItem[] = []
  const seen = new Set<string>()

  const roots = items.filter((item) => (item.productCount ?? 0) > 0)
  const fallback = flattenCategoryTree(items)
    .filter((item) => (item.productCount ?? 0) > 0)
    .sort((a, b) => (b.productCount ?? 0) - (a.productCount ?? 0))

  for (const item of [...roots, ...fallback]) {
    if (seen.has(item.slug)) continue
    seen.add(item.slug)
    selected.push(item)
    if (selected.length === 4) break
  }

  return selected.map((item, index) => {
    const decor = CATEGORY_DECOR[index % CATEGORY_DECOR.length]

    return {
      slug: item.slug,
      title: item.name,
      countLabel: formatProductCount(t, item.productCount),
      icon: decor.icon,
      color: decor.color,
    }
  })
}

function buildBrands(products: HomeProductItem[]) {
  const unique = Array.from(
    new Set(
      products
        .flatMap((product) => [product.brand?.name, product.franchise?.name])
        .filter((value): value is string => Boolean(value))
    )
  )

  return [...unique, ...unique]
}

function formatShowcaseBadge(t: Translator, product: HomeProductItem) {
  if (Number.isFinite(product.qualityScore) && product.qualityScore >= 9) {
    return t('content.recommended')
  }

  return t('home.storeShowcase')
}

export default function HomePageClient() {
  const { locale, t, path } = useI18n();

  const [products, setProducts] = useState<HomeProductItem[]>([])
  const [categoryTree, setCategoryTree] = useState<CatalogCategoryTreeItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let isCancelled = false

    async function loadHomeData() {
      setIsLoading(true)

      const [productsResult, categoriesResult] = await Promise.allSettled([
        getHomeProducts(),
        getCatalogCategories(),
      ])

      if (isCancelled) return

      setProducts(productsResult.status === 'fulfilled' ? productsResult.value.items : [])
      setCategoryTree(categoriesResult.status === 'fulfilled' ? categoriesResult.value : [])
      setIsLoading(false)
    }

    void loadHomeData()

    return () => {
      isCancelled = true
    }
  }, [])

  const homeCategories = useMemo(() => buildHomeCategories(t, categoryTree), [categoryTree])

  const flatCategories = useMemo(() => flattenCategoryTree(categoryTree), [categoryTree])

  const brandItems = useMemo(() => buildBrands(products), [products])

  const showcaseProduct = useMemo(() => {
    const eligible = products.filter(
      (product) => product.qualityScore >= 9 && Boolean(product.coverImage?.url)
    )

    if (eligible.length === 0) return null

    return eligible[Math.floor(Math.random() * eligible.length)]
  }, [products])

  const totalProducts = useMemo(
    () => categoryTree.reduce((sum, item) => sum + (item.productCount ?? 0), 0),
    [categoryTree]
  )

  const totalCategories = useMemo(
    () =>
      flatCategories.filter((item) => (item.productCount ?? 0) > 0).length ||
      flatCategories.length,
    [flatCategories]
  )

  return (
    <main>
      <section className={s.hero} aria-labelledby="hero-title">
        <div className={s.heroBg} aria-hidden="true">
          <div className={s.heroBgCircle} />
          <div className={s.heroBgCircle} />
          <div className={s.heroBgCircle} />
        </div>

        <div className={s.heroContent}>
          <p className={s.heroEyebrow}>フィギュアコレクション</p>

          <h1 className={s.heroTitle} id="hero-title">
            {t('home.everyFigure')} <br />
            <span className={s.heroTitleItalic}>{t('home.aLittleMasterpiece')}</span>
            <span className={s.heroTitleJp}>あなたのコレクションを飾る</span>
          </h1>

          <p className={s.heroDesc}>
            {t('home.exploreFiguresAndCategoriesFromOurCurrent')} </p>

          <div className={s.heroActions}>
            <Link href="/catalog" className={s.heroCta}>
              {t('home.browseCatalog')} <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path
                  d="M2 7h10M8 3l4 4-4 4"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>

            <Link href="/catalog?sort=newest" className={s.heroCtaSecondary}>
              {t('home.newArrivals')} <svg
                className={s.heroCtaArrow}
                width="12"
                height="12"
                viewBox="0 0 12 12"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M2 6h8M7 3l3 3-3 3"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>
          </div>

          <div className={s.heroStats}>
            <div className={s.heroStat}>
              <span className={s.heroStatNum}>
                {isLoading ? '—' : totalProducts.toLocaleString('uk-UA')}
              </span>
              <span className={s.heroStatLabel}>
                {isLoading ? t('home.products') : pluralizeProducts(t, totalProducts)} {t('home.inTheCatalog')} </span>
            </div>

            <div className={s.heroStat}>
              <span className={s.heroStatNum}>
                {isLoading ? '—' : totalCategories.toLocaleString('uk-UA')}
              </span>
              <span className={s.heroStatLabel}>
                {isLoading ? t('home.categories_1140') : pluralizeCategories(t, totalCategories)}
              </span>
            </div>

            <div className={s.heroStat}>
              <span className={s.heroStatNum}>{isLoading ? '—' : products.length}</span>
              <span className={s.heroStatLabel}>{t('home.featuredNow')}</span>
            </div>
          </div>
        </div>

        <div className={s.heroVisual}>
          <Link
            href={showcaseProduct ? `/product/${showcaseProduct.slug}` : '/catalog'}
            className={s.heroImageFrame}
            aria-label={
              showcaseProduct
                ? t('home.viewProductValue', { value1: showcaseProduct.title })
                : t('shop.browseCatalog_900')
            }
          >
            {showcaseProduct?.coverImage?.url ? (
              <>
                <div className={s.heroImageMedia}>
                  <img
                    src={resolveMediaUrl(showcaseProduct.coverImage.url) || ''}
                    alt={showcaseProduct.coverImage.alt || showcaseProduct.title}
                    className={s.heroShowcaseImage}
                    loading="eager"
                    decoding="async"
                  />
                  <div className={s.heroImageVeil} aria-hidden="true" />
                </div>

                <div className={s.heroBadge}>{formatShowcaseBadge(t, showcaseProduct)}</div>

                <div className={s.heroMetaPanel}>
                  <div className={s.heroMetaKicker}>
                    {showcaseProduct.franchise?.name ||
                      showcaseProduct.category?.name ||
                      showcaseProduct.brand?.name ||
                      t('home.storeShowcase')}
                  </div>

                  <div className={s.heroMetaTitle}>{showcaseProduct.title}</div>
                </div>
              </>
            ) : (
              <>
                <div className={s.heroImageMedia}>
                  <div className={s.heroImagePlaceholder}>
                    <span className={s.heroImageIcon}>
                      <IconFlower size={56} />
                    </span>
                    <span className={s.heroImageLabel}>{t('home.storeShowcase')}</span>
                  </div>
                </div>
                <div className={s.heroBadge}>{t('home.onlineCatalog')}</div>
              </>
            )}
          </Link>
        </div>
      </section>

      {brandItems.length > 0 && (
        <div className={s.brands} aria-label={t('home.brandsAndFranchises')}>
          <div className={s.brandsInner} aria-hidden="true">
            {brandItems.map((brand, index) => (
              <Fragment key={`${brand}-${index}`}>
                <span className={s.brandItem}>{brand}</span>
                <span className={s.brandDot} />
              </Fragment>
            ))}
          </div>
        </div>
      )}

      <section className={`${s.section} ${s.featured}`} aria-labelledby="featured-title">
        <div className={s.sectionInner}>
          <div className={s.sectionHead}>
            <div>
              <p className={s.sectionLabel}>{t('home.storeShowcase')}</p>
              <h2 className={s.sectionTitle} id="featured-title">
                {t('home.featured')} <span className={s.sectionTitleAccent}>{t('shop.products')}</span>
              </h2>
            </div>

            <Link href="/catalog" className={s.sectionLink}>
              {t('home.browseCatalog_1151')} <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                <path
                  d="M2 6h8M7 3l3 3-3 3"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>
          </div>

          {isLoading ? (
            <div className={s.sectionNotice}>{t('shop.loadingProducts')}</div>
          ) : products.length > 0 ? (
            <div className={s.productGrid} role="list">
              {products.map((p) => (
                <article className={s.card} key={p.id} role="listitem">
                  <Link href={`/product/${p.slug}`} aria-label={p.title}>
                    <div className={s.cardImageWrap}>
                      {p.coverImage?.url ? (
                        <img
                          src={resolveMediaUrl(p.coverImage.url) || ''}
                          alt={p.coverImage.alt || p.title}
                          className={s.cardImage}
                          loading="lazy"
                          decoding="async"
                        />
                      ) : (
                        <div className={s.cardImagePlaceholder}>
                          <IconBow size={44} />
                        </div>
                      )}

                      {p.qualityScore >= 9 && (
                        <div className={`${s.cardBadge} ${s.cardBadgeNew}`}>TOP</div>
                      )}

                      <div className={s.cardActions}>
                        <span className={s.cardBtn}>{t('home.viewDetails')}</span>
                      </div>
                    </div>

                    <div className={s.cardBody}>
                      <p className={s.cardSeries}>
                        {p.franchise?.name || p.category?.name || p.brand?.name || 'Skufnya'}
                      </p>

                      <h3 className={s.cardName}>{p.title}</h3>

                      <div className={s.cardMeta}>
                        <span className={s.cardPrice}>
                          {p.pricing?.hasPriceRange ? t('shop.from') : ''}
                          {p.priceFrom.toLocaleString('uk-UA')} ₴
                        </span>

                        <span className={s.cardScale}>
                          {p.defaultVariant?.sizeLabel || t('shop.figure_975')}
                        </span>
                      </div>
                    </div>
                  </Link>
                </article>
              ))}
            </div>
          ) : (
            <div className={s.sectionNotice}>
              {t('home.thereAreNoFeaturedProductsYetCheck')} </div>
          )}
        </div>
      </section>

      <section className={`${s.section} ${s.categories}`} aria-labelledby="categories-title">
        <div className={s.sectionInner}>
          <div className={s.sectionHead}>
            <div>
              <p className={s.sectionLabel}>{t('home.fromTheCatalog')}</p>
              <h2 className={s.sectionTitle} id="categories-title">
                {t('shop.categories')} <span className={s.sectionTitleAccent}>{t('home.toExplore')}</span>
              </h2>
            </div>

            <Link href="/catalog" className={s.sectionLink}>
              {t('home.fullCatalog')} <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                <path
                  d="M2 6h8M7 3l3 3-3 3"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>
          </div>

          {isLoading ? (
            <div className={s.sectionNotice}>{t('home.loadingCategories')}</div>
          ) : homeCategories.length > 0 ? (
            <div className={s.catGrid}>
              {homeCategories.map((cat) => {
                const CatIcon = cat.icon

                return (
                  <Link
                    key={cat.slug}
                    href={`/catalog?categorySlug=${encodeURIComponent(cat.slug)}`}
                    className={s.catCard}
                    aria-label={`${cat.title} — ${cat.countLabel}`}
                  >
                    <div
                      className={s.catBg}
                      aria-hidden="true"
                      style={{
                        background: `linear-gradient(160deg, ${cat.color}66, ${cat.color}1f)`,
                      }}
                    >
                      <span className={s.catIcon}>
                        <CatIcon size={40} strokeWidth={1.2} />
                      </span>
                    </div>
                    <div className={s.catContent}>
                      <p className={s.catTitle}>{cat.title}</p>
                      <p className={s.catCount}>{cat.countLabel}</p>
                      <span className={s.catArrow} aria-hidden="true">
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                          <path
                            d="M2 7h10M8 3l4 4-4 4"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </span>
                    </div>
                  </Link>
                )
              })}
            </div>
          ) : (
            <div className={s.sectionNotice}>
              {t('home.categoriesCouldNotBeLoadedOrThere')} </div>
          )}
        </div>
      </section>

      <section className={s.features} aria-labelledby="features-title">
        <h2 id="features-title" className="sr-only">
          {t('home.whyShopWithUs')} </h2>

        <div className={s.featuresGrid}>
          {FEATURES(t).map((f) => {
            const FeatureIcon = f.icon

            return (
              <div className={s.featureItem} key={f.title}>
                <div className={s.featureIcon} aria-hidden="true">
                  <FeatureIcon size={20} />
                </div>
                <p className={s.featureTitle}>{f.title}</p>
                <p className={s.featureText}>{f.text}</p>
              </div>
            )
          })}
        </div>
      </section>

      <section className={`${s.section} ${s.promo}`} aria-labelledby="promo-title">
        <div className={s.promoBanner}>
          <div>
            <p className={s.promoLabel}>
              <span>✦</span> {t('home.specialOffer')} </p>
            <h2 className={s.promoTitle} id="promo-title">
              {t('home.yourFirstOrder')} <br />
              <span className={s.promoTitleAccent}>{t('home.15Off')}</span>
            </h2>
            <p className={s.promoText}>
              {t('home.useCode')} <strong style={{ color: '#e8d5aa' }}>SKUFNYA</strong> {t('home.whenPlacingYourOrderToGetA')} </p>
          </div>

          <Link href="/catalog" className={s.promoCta}>
            {t('shop.browseCatalog_900')} <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path
                d="M2 7h10M8 3l4 4-4 4"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Link>
        </div>
      </section>

      <section className={`${s.section} ${s.newsletter}`} aria-labelledby="newsletter-title">
        <div className={s.newsletterInner}>
          <span className={s.newsletterIcon} aria-hidden="true">
            <IconMailHeart size={36} strokeWidth={1.2} />
          </span>
          <h2 className={s.newsletterTitle} id="newsletter-title">
            {t('home.beFirstToHear')} </h2>
          <p className={s.newsletterText}>
            {t('home.weShareReleasesPreordersAndDiscountsOn')} </p>

          <Link
            href="https://t.me/+l3_CI64EkuxlZmYy"
            target="_blank"
            rel="noopener noreferrer"
            className={s.newsletterCta}
          >
            <IconTelegram size={16} />
            {t('home.followOnTelegram')} </Link>

          <p className={s.newsletterDisclaimer}>{t('home.noSpamJustStoreNews')}</p>
        </div>
      </section>

      <section
        className={`${s.section} ${s.threeDPrinting}`}
        aria-labelledby="three-d-printing-title"
      >
        <div className={s.threeDPrintingInner}>
          <div className={s.threeDPrintingContent}>
            <p className={s.sectionLabel}>{t('home.anotherProjectFromOurTeam')}</p>

            <h2 className={s.threeDPrintingTitle} id="three-d-printing-title">
              {t('home.lookingForAnEnclosure')}{' '}
              <span className={s.threeDPrintingTitleTerm}>mini-rack</span> {t('home.orACustomMount')} </h2>

            <p className={s.threeDPrintingText}>
              {t('home.3dDrukarnyaIsOurTeamSSeparate')} </p>

            <ul className={s.threeDPrintingDirections}>
              {THREE_D_PRINTING_DIRECTIONS(t).map((direction) => {
                const DirectionIcon = direction.icon

                return (
                  <li className={s.threeDPrintingDirection} key={direction.label}>
                    <span className={s.threeDPrintingDirectionIcon} aria-hidden="true">
                      <DirectionIcon size={18} strokeWidth={1.5} />
                    </span>
                    <span>{direction.label}</span>
                  </li>
                )
              })}
            </ul>

            <div className={s.threeDPrintingActions}>
              <a
                href={THREE_D_PRINTING_URL}
                target="_blank"
                rel="noopener noreferrer"
                className={s.threeDPrintingCta}
                aria-describedby="three-d-printing-note"
              >
                {t('home.visit3dDrukarnya')} <span className={s.threeDPrintingExternalIcon} aria-hidden="true">
                  <IconArrowUpRight size={16} strokeWidth={1.6} />
                </span>
                <span className="sr-only"> {t('home.opensInANewTab')}</span>
              </a>

              <p className={s.threeDPrintingNote} id="three-d-printing-note">
                {t('home.browseAndPlaceOrdersOnASeparate')} </p>
            </div>
          </div>

          <div className={s.threeDPrintingVisual}>
            <div className={s.threeDPrintingScene}>
              <div className={s.threeDPrintingBackdrop} aria-hidden="true">
                <Image
                  src={threeDPrintingArt}
                  alt=""
                  className={s.threeDPrintingBackdropImage}
                  sizes="(max-width: 500px) 92vw, (max-width: 900px) 460px, (max-width: 1440px) 46vw, 600px"
                  loading="lazy"
                />
              </div>

              <div className={s.threeDPrintingStage} aria-hidden="true">
                <span className={s.threeDPrintingHalo} />

                <div className={s.threeDPrintingRack}>
                  <span className={s.threeDPrintingRackTop} />

                  <p className={s.threeDPrintingRackPlate}>mini-rack</p>

                  <div className={s.threeDPrintingRackUnit}>
                    <span className={s.threeDPrintingRackLed} />
                    <span className={s.threeDPrintingRackBays}>
                      <span className={s.threeDPrintingRackBay} />
                      <span className={s.threeDPrintingRackBay} />
                      <span className={s.threeDPrintingRackBay} />
                    </span>
                  </div>

                  <div className={s.threeDPrintingRackUnit}>
                    <span className={s.threeDPrintingRackLed} />
                    <span className={s.threeDPrintingRackPorts} />
                  </div>

                  <div className={s.threeDPrintingRackUnit}>
                    <span className={s.threeDPrintingRackLed} />
                    <span className={s.threeDPrintingRackVents} />
                  </div>

                  <span className={s.threeDPrintingRackFoot} />
                </div>
              </div>
            </div>

            <aside
              className={s.threeDPrintingCard}
              aria-label={t('home.3dDrukarnyaServicesAndMaterials')}
            >
              <p className={s.threeDPrintingCardHead}>
                <span>{t('home.3dDrukarnya')}</span>
                <span className={s.threeDPrintingBadge}>FDM</span>
              </p>

              <p className={s.threeDPrintingCardText}>
                {t('home.printedToYourDimensionsEvenASingle')} </p>

              <ul className={s.threeDPrintingCardTags}>
                {THREE_D_PRINTING_MATERIALS.map((material) => (
                  <li className={s.threeDPrintingTag} key={material}>
                    {material}
                  </li>
                ))}
              </ul>
            </aside>
          </div>
        </div>
      </section>
    </main>
  )
}
