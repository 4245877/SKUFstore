'use client'

import Link from 'next/link'
import { Fragment, useEffect, useMemo, useState } from 'react'
import {
  getCatalogCategories,
  getHomeProducts,
  resolveMediaUrl,
  type CatalogCategoryTreeItem,
  type HomeProductItem,
} from '../lib/api'
import {
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
import s from './Home.module.css'

const THREE_D_PRINTING_URL =
  'https://4245877.github.io/3D-Drukarnya/?utm_source=skufnya&utm_medium=referral&utm_campaign=3d_drukarnya&utm_content=homepage_promo'

const FEATURES = [
  {
    icon: IconShieldCheck,
    title: 'Уважний відбір моделей',
    text: 'Добираємо фігурки та варіанти з акцентом на якість деталей і вдалу презентацію.',
  },
  {
    icon: IconBox,
    title: 'Дбайливе пакування',
    text: 'Надійний захист кожної позиції під час доставки.',
  },
  {
    icon: IconTruck,
    title: 'Доставка по Україні',
    text: 'Самовивіз і доставка перевізниками з відстеженням замовлення.',
  },
  {
    icon: IconChatHeart,
    title: 'Підтримка з вибором',
    text: 'Допоможемо зорієнтуватися в каталозі, матеріалах і доступних варіантах.',
  },
] as const

const THREE_D_PRINTING_DIRECTIONS = [
  {
    icon: IconBox,
    label: 'Корпуси для NAS та електроніки',
  },
  {
    icon: IconGrid,
    label: 'Mini-rack і деталі для стійок',
  },
  {
    icon: IconWrench,
    label: 'Кріплення й адаптери під конфігурацію',
  },
] as const

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

function pluralizeProducts(count: number) {
  const mod10 = count % 10
  const mod100 = count % 100

  if (mod10 === 1 && mod100 !== 11) return 'товар'
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'товари'
  return 'товарів'
}

function pluralizeCategories(count: number) {
  const mod10 = count % 10
  const mod100 = count % 100

  if (mod10 === 1 && mod100 !== 11) return 'категорія'
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'категорії'
  return 'категорій'
}

function formatProductCount(count?: number) {
  const value = Math.max(0, count ?? 0)
  return `${value.toLocaleString('uk-UA')} ${pluralizeProducts(value)}`
}

function buildHomeCategories(items: CatalogCategoryTreeItem[]) {
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
      countLabel: formatProductCount(item.productCount),
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

function formatShowcaseBadge(product: HomeProductItem) {
  if (Number.isFinite(product.qualityScore) && product.qualityScore >= 9) {
    return 'Рекомендовано'
  }

  return 'Вітрина магазину'
}

export default function HomePageClient() {
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

  const homeCategories = useMemo(() => buildHomeCategories(categoryTree), [categoryTree])

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
            Кожна фігурка&nbsp;—
            <br />
            <span className={s.heroTitleItalic}>маленький&nbsp;шедевр</span>
            <span className={s.heroTitleJp}>あなたのコレクションを飾る</span>
          </h1>

          <p className={s.heroDesc}>
            Добірка актуальних фігурок і категорій з каталогу, щоб було легше знайти цікаві
            позиції та перейти до покупки.
          </p>

          <div className={s.heroActions}>
            <Link href="/catalog" className={s.heroCta}>
              Переглянути каталог
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
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
              Новинки каталогу
              <svg
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
                {isLoading ? 'Товарів' : pluralizeProducts(totalProducts)} у каталозі
              </span>
            </div>

            <div className={s.heroStat}>
              <span className={s.heroStatNum}>
                {isLoading ? '—' : totalCategories.toLocaleString('uk-UA')}
              </span>
              <span className={s.heroStatLabel}>
                {isLoading ? 'Категорій' : pluralizeCategories(totalCategories)}
              </span>
            </div>

            <div className={s.heroStat}>
              <span className={s.heroStatNum}>{isLoading ? '—' : products.length}</span>
              <span className={s.heroStatLabel}>На головній зараз</span>
            </div>
          </div>
        </div>

        <div className={s.heroVisual}>
          <Link
            href={showcaseProduct ? `/product/${showcaseProduct.slug}` : '/catalog'}
            className={s.heroImageFrame}
            aria-label={
              showcaseProduct
                ? `Відкрити товар ${showcaseProduct.title}`
                : 'Перейти до каталогу'
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

                <div className={s.heroBadge}>{formatShowcaseBadge(showcaseProduct)}</div>

                <div className={s.heroMetaPanel}>
                  <div className={s.heroMetaKicker}>
                    {showcaseProduct.franchise?.name ||
                      showcaseProduct.category?.name ||
                      showcaseProduct.brand?.name ||
                      'Вітрина магазину'}
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
                    <span className={s.heroImageLabel}>Вітрина магазину</span>
                  </div>
                </div>
                <div className={s.heroBadge}>Каталог онлайн</div>
              </>
            )}
          </Link>
        </div>
      </section>

      {brandItems.length > 0 && (
        <div className={s.brands} aria-label="Бренди та франшизи">
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
              <p className={s.sectionLabel}>Вітрина магазину</p>
              <h2 className={s.sectionTitle} id="featured-title">
                Рекомендовані <span className={s.sectionTitleAccent}>товари</span>
              </h2>
            </div>

            <Link href="/catalog" className={s.sectionLink}>
              До каталогу
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
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
            <div className={s.sectionNotice}>Завантаження товарів…</div>
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
                        <span className={s.cardBtn}>Докладніше</span>
                      </div>
                    </div>

                    <div className={s.cardBody}>
                      <p className={s.cardSeries}>
                        {p.franchise?.name || p.category?.name || p.brand?.name || 'Skufnya'}
                      </p>

                      <h3 className={s.cardName}>{p.title}</h3>

                      <div className={s.cardMeta}>
                        <span className={s.cardPrice}>
                          {p.priceFrom.toLocaleString('uk-UA')} ₴
                        </span>

                        <span className={s.cardScale}>
                          {p.defaultVariant?.sizeLabel || 'Фігурка'}
                        </span>
                      </div>
                    </div>
                  </Link>
                </article>
              ))}
            </div>
          ) : (
            <div className={s.sectionNotice}>
              Поки що у вітрині немає товарів. Заглянь трохи пізніше або відкрий увесь каталог.
            </div>
          )}
        </div>
      </section>

      <section className={`${s.section} ${s.categories}`} aria-labelledby="categories-title">
        <div className={s.sectionInner}>
          <div className={s.sectionHead}>
            <div>
              <p className={s.sectionLabel}>З каталогу</p>
              <h2 className={s.sectionTitle} id="categories-title">
                Категорії <span className={s.sectionTitleAccent}>колекцій</span>
              </h2>
            </div>

            <Link href="/catalog" className={s.sectionLink}>
              Весь каталог
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
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
            <div className={s.sectionNotice}>Завантаження категорій…</div>
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
              Категорії поки не вдалося завантажити або в них ще немає активних товарів.
            </div>
          )}
        </div>
      </section>

      <section className={s.features} aria-labelledby="features-title">
        <h2 id="features-title" className="sr-only">
          Переваги магазину
        </h2>

        <div className={s.featuresGrid}>
          {FEATURES.map((f) => {
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
              <span>✦</span> Спеціальна пропозиція
            </p>
            <h2 className={s.promoTitle} id="promo-title">
              Перше замовлення —
              <br />
              <span className={s.promoTitleAccent}>15% знижки</span>
            </h2>
            <p className={s.promoText}>
              Використовуй промокод <strong style={{ color: '#e8d5aa' }}>SKUFNYA</strong> під
              час оформлення замовлення й отримай знижку на позиції з каталогу.
            </p>
          </div>

          <Link href="/catalog" className={s.promoCta}>
            Перейти до каталогу
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
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
            Новинки першими
          </h2>
          <p className={s.newsletterText}>
            Анонси релізів, передзамовлень і знижок ми публікуємо в Telegram-каналі — підпишись,
            щоб не пропустити.
          </p>

          <Link
            href="https://t.me/+l3_CI64EkuxlZmYy"
            target="_blank"
            rel="noopener noreferrer"
            className={s.newsletterCta}
          >
            <IconTelegram size={16} />
            Підписатися в Telegram
          </Link>

          <p className={s.newsletterDisclaimer}>Без спаму — лише новини магазину.</p>
        </div>
      </section>

      <section
        className={`${s.section} ${s.threeDPrinting}`}
        aria-labelledby="three-d-printing-title"
      >
        <div className={s.threeDPrintingInner}>
          <div className={s.threeDPrintingContent}>
            <p className={s.sectionLabel}>Інший наш проєкт</p>

            <h2 className={s.threeDPrintingTitle} id="three-d-printing-title">
              Потрібен корпус, mini-rack або нестандартне кріплення?
            </h2>

            <p className={s.threeDPrintingText}>
              3D Друкарня — окремий технічний проєкт нашої команди. Там можна замовити
              функціональні деталі для NAS, HomeLab, серверного й мережевого обладнання.
            </p>

            <ul className={s.threeDPrintingDirections}>
              {THREE_D_PRINTING_DIRECTIONS.map((direction) => {
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
                Перейти до 3D Друкарні
                <span className={s.threeDPrintingExternalIcon} aria-hidden="true">
                  ↗
                </span>
                <span className="sr-only"> (відкриється в новій вкладці)</span>
              </a>

              <p className={s.threeDPrintingNote} id="three-d-printing-note">
                Окремий каталог і окреме оформлення замовлення.
              </p>
            </div>
          </div>

          <div className={s.threeDPrintingVisual} aria-hidden="true">
            <div className={s.threeDPrintingCard}>
              <div className={s.threeDPrintingCardHead}>
                <span>3D ДРУКАРНЯ</span>
                <span className={s.threeDPrintingBadge}>FDM</span>
              </div>

              <div className={s.threeDPrintingScene}>
                <span className={`${s.threeDPrintingTag} ${s.threeDPrintingTagNas}`}>
                  NAS
                </span>
                <span className={`${s.threeDPrintingTag} ${s.threeDPrintingTagLab}`}>
                  HomeLab
                </span>

                <div className={s.threeDPrintingLayers} />

                <div className={s.threeDPrintingRack}>
                  <span className={s.threeDPrintingRackTop} />

                  <div className={s.threeDPrintingRackUnit}>
                    <span className={s.threeDPrintingRackLed} />
                    <span className={s.threeDPrintingRackSlots} />
                  </div>

                  <div className={s.threeDPrintingRackUnit}>
                    <span className={s.threeDPrintingRackLed} />
                    <span className={s.threeDPrintingRackSlots} />
                  </div>

                  <div className={s.threeDPrintingRackUnit}>
                    <span className={s.threeDPrintingRackLed} />
                    <span className={s.threeDPrintingRackSlots} />
                  </div>

                  <span className={s.threeDPrintingRackFoot} />
                </div>
              </div>

              <div className={s.threeDPrintingCardFoot}>
                <span>Корпуси</span>
                <span>Mini-rack</span>
                <span>Кріплення</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
