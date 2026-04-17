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
    title: 'Гарантія справжності',
    text: 'Тільки ліцензійні фігурки від офіційних дистриб’юторів.',
  },
  {
    icon: '📦',
    title: 'Бережне пакування',
    text: 'Надійний захист кожної позиції під час доставки.',
  },
  {
    icon: '✈️',
    title: 'Доставка по Україні',
    text: 'Самовивіз, кур’єр і перевізники з відстеженням замовлення.',
  },
  {
    icon: '♻️',
    title: 'Зручний сервіс',
    text: 'Підтримка по замовленню та допомога з вибором фігурок.',
  },
] as const

const TESTIMONIALS = [
  {
    text: 'Заказ пришёл быстро, упаковка очень аккуратная. Фигурка полностью соответствует фото.',
    name: 'Анастасія К.',
    role: 'Постійний покупець',
    avatar: '🌸',
    stars: 5,
  },
  {
    text: 'Хороший каталог и понятная карточка товара. Удобно, что сразу видно бренд и серию.',
    name: 'Дмитро П.',
    role: 'Колекціонер',
    avatar: '⚔️',
    stars: 5,
  },
  {
    text: 'Понравилось, что на главной сразу видно актуальные позиции, а не просто случайные заглушки.',
    name: 'Єва Р.',
    role: 'Покупець',
    avatar: '🥜',
    stars: 5,
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

const DEFAULT_BRANDS = [
  'Good Smile Company',
  'ALTER',
  'Max Factory',
  'Kotobukiya',
  'Banpresto',
  'Aniplex',
  'FREEing',
  'Revolve',
]

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

  const source = unique.length > 0 ? unique : DEFAULT_BRANDS
  return [...source, ...source]
}

function formatQualityScore(score: number) {
  if (!Number.isFinite(score)) return null

  const normalized = Math.max(0, Math.min(10, score))
  const rounded = Math.round(normalized * 10) / 10

  return Number.isInteger(rounded) ? `${rounded}/10` : `${rounded.toFixed(1)}/10`
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
            На головній тепер показуються реальні товари та реальні категорії з каталогу.
            Тільки активні позиції, які ти позначиш для вітрини.
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

                <div className={s.heroBadge}>
                  {formatQualityScore(showcaseProduct.qualityScore) ?? '9+/10'}
                </div>

                <div className={s.heroMetaPanel}>
                  <div className={s.heroMetaKicker}>
                    {showcaseProduct.franchise?.name ||
                      showcaseProduct.category?.name ||
                      showcaseProduct.brand?.name ||
                      'Skufnya showcase'}
                  </div>

                  <div className={s.heroMetaTitle}>{showcaseProduct.title}</div>
                </div>
              </>
            ) : (
              <>
                <div className={s.heroImageMedia}>
                  <div className={s.heroImagePlaceholder}>
                    <span className={s.heroImageIcon}>🌸</span>
                    <span className={s.heroImageLabel}>Skufnya showcase</span>
                  </div>
                </div>
                <div className={s.heroBadge}>Live catalog</div>
              </>
            )}
          </Link>
        </div>
      </section>

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
                        <span className={s.cardBtn}>Відкрити</span>
                        <span
                          className={s.cardBtnWish}
                          aria-label="Додати до бажаного"
                          role="img"
                        >
                          🤍
                        </span>
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
                          {p.defaultVariant?.sizeLabel || p.saleType || '—'}
                        </span>
                      </div>
                    </div>
                  </Link>
                </article>
              ))}
            </div>
          ) : (
            <div className={s.sectionNotice}>
              На головній поки немає товарів. Перевір, щоб у товару були:
              <strong> status=ACTIVE</strong>, активний варіант, зображення та прапорець
              <strong> showOnHome=true</strong>.
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

      <section className={`${s.section} ${s.testimonials}`} aria-labelledby="reviews-title">
        <div className={s.sectionInner}>
          <div className={s.sectionHead}>
            <div>
              <p className={s.sectionLabel}>Відгуки покупців</p>
              <h2 className={s.sectionTitle} id="reviews-title">
                Що кажуть <span className={s.sectionTitleAccent}>колекціонери</span>
              </h2>
            </div>
          </div>

          <div className={s.testimonialGrid}>
            {TESTIMONIALS.map((t) => (
              <blockquote className={s.testimonialCard} key={t.name}>
                <div className={s.testimonialStars} aria-label={`Оцінка ${t.stars} з 5`}>
                  {Array.from({ length: t.stars }).map((_, i) => (
                    <span className={s.star} key={i} aria-hidden="true">
                      ★
                    </span>
                  ))}
                </div>
                <p className={s.testimonialText}>{t.text}</p>
                <footer className={s.testimonialAuthor}>
                  <div className={s.testimonialAvatar} aria-hidden="true">
                    {t.avatar}
                  </div>
                  <div>
                    <p className={s.testimonialName}>{t.name}</p>
                    <p className={s.testimonialRole}>{t.role}</p>
                  </div>
                </footer>
              </blockquote>
            ))}
          </div>
        </div>
      </section>

      <section className={`${s.section} ${s.newsletter}`} aria-labelledby="newsletter-title">
        <div className={s.newsletterInner}>
          <span className={s.newsletterIcon} aria-hidden="true">
            💌
          </span>
          <h2 className={s.newsletterTitle} id="newsletter-title">
            Будьте першими
          </h2>
          <p className={s.newsletterText}>
            Підпишіться на розсилку і дізнавайтеся про нові надходження та спеціальні
            пропозиції першими.
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
              placeholder="ваш@email.com"
              autoComplete="email"
            />
            <button type="button" className={s.newsletterBtn}>
              Підписатися
            </button>
          </div>
          <p className={s.newsletterDisclaimer}>
            Без спаму. Тільки важливі новини магазину.
          </p>
        </div>
      </section>
    </main>
  )
}