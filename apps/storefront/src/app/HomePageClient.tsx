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
import s from './Home.module.css'

const FEATURES = [
  {
    icon: '🛡️',
    title: 'Уважний відбір моделей',
    text: 'Добираємо фігурки та варіанти з акцентом на якість деталей і вдалу презентацію.',
  },
  {
    icon: '📦',
    title: 'Дбайливе пакування',
    text: 'Надійний захист кожної позиції під час доставки.',
  },
  {
    icon: '✈️',
    title: 'Доставка по Україні',
    text: 'Самовивіз і доставка перевізниками з відстеженням замовлення.',
  },
  {
    icon: '♻️',
    title: 'Підтримка з вибором',
    text: 'Допоможемо зорієнтуватися в каталозі, матеріалах і доступних варіантах.',
  },
] as const

const CATEGORY_DECOR = [
  { emoji: '🗡️', color: '#e8d5aa' },
  { emoji: '🌸', color: '#f2c9c9' },
  { emoji: '⚡', color: '#c8bfc4' },
  { emoji: '👑', color: '#d4e8c9' },
  { emoji: '🎀', color: '#e7d9f6' },
  { emoji: '🪄', color: '#cfe7f1' },
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
      emoji: decor.emoji,
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

function formatSaleTypeLabel(saleType?: HomeProductItem['saleType'] | null) {
  switch (saleType) {
    case 'IN_STOCK':
      return 'В наявності'
    case 'PREORDER':
      return 'Передзамовлення'
    case 'BACKORDER':
      return 'Під замовлення'
    default:
      return '—'
  }
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
      <div className={s.ribbon} role="marquee" aria-label="Оголошення">
        <div className={s.ribbonTrack}>
          <div className={s.ribbonInner}>
            <span>Безкоштовна доставка від 1 500 ₴</span>
            <span className={s.ribbonSep}>✦</span>
            <span>Актуальні товари з каталогу на головній</span>
            <span className={s.ribbonSep}>✦</span>
            <span>-15% на перше замовлення за промокодом SKUFNYA</span>
            <span className={s.ribbonSep}>✦</span>
            <span>Вітрина оновлюється з адмін-панелі</span>
          </div>
        </div>
      </div>

      <section className={s.hero} aria-labelledby="hero-title">
        <div className={s.heroBg} aria-hidden="true">
          <div className={s.heroBgCircle} />
          <div className={s.heroBgCircle} />
          <div className={s.heroBgCircle} />
        </div>

        <div className={s.heroContent}>
          <p className={s.heroEyebrow}>フィギュアコレクション</p>

          <h1 className={s.heroTitle} id="hero-title">
            Кожна фігурка —
            <br />
            <span className={s.heroTitleItalic}>маленький шедевр</span>
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
              <span className={s.heroStatLabel}>Товарів у каталозі</span>
            </div>

            <div className={s.heroStat}>
              <span className={s.heroStatNum}>
                {isLoading ? '—' : totalCategories.toLocaleString('uk-UA')}
              </span>
              <span className={s.heroStatLabel}>Категорій</span>
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
                    <span className={s.heroImageIcon}>🌸</span>
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
                        />
                      ) : (
                        <div className={s.cardImagePlaceholder}>
                          <span>🎀</span>
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
                          {p.defaultVariant?.sizeLabel || formatSaleTypeLabel(p.saleType)}
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
              {homeCategories.map((cat) => (
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
                      background: `linear-gradient(160deg, ${cat.color}55, ${cat.color}22)`,
                    }}
                  >
                    <span>{cat.emoji}</span>
                  </div>
                  <div className={s.catOverlay} aria-hidden="true" />
                  <div className={s.catContent}>
                    <p className={s.catTitle}>{cat.title}</p>
                    <p className={s.catCount}>{cat.countLabel}</p>
                  </div>
                </Link>
              ))}
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
          {FEATURES.map((f) => (
            <div className={s.featureItem} key={f.title}>
              <div className={s.featureIcon} aria-hidden="true">
                {f.icon}
              </div>
              <p className={s.featureTitle}>{f.title}</p>
              <p className={s.featureText}>{f.text}</p>
            </div>
          ))}
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
            💌
          </span>
          <h2 className={s.newsletterTitle} id="newsletter-title">
            Розсилка скоро
          </h2>
          <p className={s.newsletterText}>
            Готуємо підписку на новинки та спеціальні пропозиції. Блок ще в розробці.
          </p>

          <div
            className={s.newsletterForm}
            role="group"
            aria-label="Форма підписки на розсилку"
          >
            <label htmlFor="email-input" className="sr-only">
              Email адреса
            </label>
            <input
              id="email-input"
              type="email"
              className={s.newsletterInput}
              placeholder="Форма скоро з’явиться"
              autoComplete="email"
              disabled
            />
            <button type="button" className={s.newsletterBtn} disabled>
              Скоро
            </button>
          </div>

          <p className={s.newsletterDisclaimer}>Поки що стеж за оновленнями через каталог.</p>
        </div>
      </section>
    </main>
  )
}