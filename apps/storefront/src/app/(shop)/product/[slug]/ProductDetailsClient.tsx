'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState, type KeyboardEvent } from 'react';
import {
  addAccountFavorite,
  getAccountFavorites,
  getCatalogProductBySlug,
  removeAccountFavorite,
  resolveMediaUrl,
} from '../../../../lib/api';
import {
  addCartItem,
  addFavorite,
  isFavorite,
  removeFavorite,
} from '../../../../lib/demo-store';
import { buildAgeVerifyPath, isAgeVerifiedClient } from '../../../../lib/age-gate';
import { IconBag, IconBow, IconHeart, IconShare } from '../../../../components/icons';
import styles from './ProductDetails.module.css';

type Product = Awaited<ReturnType<typeof getCatalogProductBySlug>>;
type Variant = Product['variants'][number];
type ProductImage = Product['images'][number];
type Tab = 'description' | 'specs' | 'delivery';
type FinishType = 'MONO' | 'PAINTED';
type ColorType = 'IVORY' | 'GRAPHITE' | 'BLACK' | 'PEARL';

const FINISHES: {
  code: FinishType;
  label: string;
  priceDelta: number;
  leadTimeDays: number;
  isDisabled?: boolean;
  disabledNote?: string;
}[] = [
  { code: 'MONO', label: 'Монохромна версія', priceDelta: 0, leadTimeDays: 3 },
  {
    code: 'PAINTED',
    label: 'Художній розпис',
    priceDelta: 1200,
    leadTimeDays: 10,
    isDisabled: true,
    disabledNote: 'Тимчасово недоступно',
  },
];

const COLORS: {
  code: ColorType;
  label: string;
  priceDelta: number;
  swatchHex: string;
}[] = [
  { code: 'IVORY', label: 'Айворі', priceDelta: 0, swatchHex: '#F4EBDD' },
  { code: 'GRAPHITE', label: 'Графіт', priceDelta: 100, swatchHex: '#55585F' },
  { code: 'BLACK', label: 'Чорний', priceDelta: 100, swatchHex: '#171717' },
  { code: 'PEARL', label: 'Перламутровий', priceDelta: 200, swatchHex: '#E8E4EF' },
];

const FINISH_IMAGE_KEYWORDS: Record<FinishType, string[]> = {
  MONO: ['mono', 'monochrome', 'моно', 'monochrom'],
  PAINTED: ['painted', 'painting', 'paint', 'art', 'розпис', 'худож'],
};

const COLOR_IMAGE_KEYWORDS: Record<ColorType, string[]> = {
  IVORY: ['ivory', 'айворі', 'ivori', 'cream', 'creme', 'молоч'],
  GRAPHITE: ['graphite', 'графіт', 'grafit', 'charcoal'],
  BLACK: ['black', 'чорний', 'chorniy', 'chornyi'],
  PEARL: ['pearl', 'перламутр', 'перламутров', 'perl'],
};

function formatMoney(value: number, currency: string) {
  return new Intl.NumberFormat('uk-UA', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: string | null) {
  if (!value) return '—';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat('uk-UA', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

function formatLeadTime(days: number) {
  return `протягом ${formatDaysLabel(days)}`;
}

function formatDaysLabel(days: number) {
  const mod10 = days % 10;
  const mod100 = days % 100;

  if (mod10 === 1 && mod100 !== 11) return `${days} день`;

  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return `${days} дні`;
  }

  return `${days} днів`;
}

function isAuthError(error: unknown) {
  const status = (error as { status?: number } | null)?.status;
  return status === 401 || status === 403;
}

function buildGuestFavoritePayload(product: Product) {
  const coverImage = product.images.find((image) => image.isCover) ?? product.images[0] ?? null;

  return {
    productId: product.id,
    slug: product.slug,
    title: product.title,
    series: product.series ?? product.franchise?.name ?? product.brand?.name ?? null,
    priceFrom: product.priceFrom,
    currency: product.currency,
    isAdult: product.isAdult,
    coverImage: coverImage
      ? {
          url: coverImage.url,
          alt: coverImage.alt ?? product.title,
        }
      : null,
  };
}

function ageRatingLabel(value: string) {
  switch (value) {
    case 'ALL':
      return 'Без обмежень';
    case 'TEEN':
      return '13+';
    case 'MATURE':
      return '16+';
    case 'ADULT':
      return '18+';
    default:
      return value || '—';
  }
}

function productTypeLabel(value: string | null | undefined) {
  switch (value) {
    case 'FIGURE':
      return 'Фігурка';
    case 'BUST':
      return 'Бюст';
    case 'DIORAMA':
      return 'Діорама';
    case 'ACCESSORY':
      return 'Аксесуар';
    case 'KIT':
      return 'Кіт';
    default:
      return value || '—';
  }
}

function prettifyAttributeKey(key: string) {
  return key
    .replace(/[_-]+/g, ' ')
    .replace(/([a-zа-я])([A-ZА-Я])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^./, (char) => char.toUpperCase());
}

function formatAttributeValue(value: unknown): string | null {
  if (value == null) return null;

  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return typeof value === 'boolean' ? (value ? 'Так' : 'Ні') : String(value);
  }

  if (Array.isArray(value)) {
    const items = value
      .map((item) => formatAttributeValue(item))
      .filter((item): item is string => Boolean(item && item.trim()));

    return items.length ? items.join(', ') : null;
  }

  return null;
}

function getVariantCoverImage(variant: Variant): ProductImage | null {
  return variant.images.find((img) => img.isCover) ?? variant.images[0] ?? null;
}

function getImageMatchText(image: ProductImage) {
  return `${image.alt ?? ''} ${image.storageKey ?? ''} ${image.url ?? ''}`.toLowerCase();
}

function includesAny(text: string, keywords: string[]) {
  return keywords.some((keyword) => text.includes(keyword));
}

function isFinishDisabled(value: FinishType) {
  return Boolean(FINISHES.find((item) => item.code === value)?.isDisabled);
}

function buildGalleryImages(
  productImages: ProductImage[],
  variant: Variant | null,
  finish: FinishType,
  color: ColorType,
): ProductImage[] {
  const merged = [...(variant?.images ?? []), ...productImages];
  const seen = new Set<string>();

  const deduped = merged.filter((image) => {
    const key = image.storageKey || image.url || image.id;

    if (seen.has(key)) return false;

    seen.add(key);
    return true;
  });

  const ranked = deduped.map((image, index) => {
    const searchText = getImageMatchText(image);
    const finishMatched = includesAny(searchText, FINISH_IMAGE_KEYWORDS[finish]);
    const colorMatched =
      finish === 'MONO' && includesAny(searchText, COLOR_IMAGE_KEYWORDS[color]);

    return {
      image,
      index,
      finishMatched,
      colorMatched,
      isCover: Boolean(image.isCover),
    };
  });

  const hasFinishMatches = ranked.some((item) => item.finishMatched);
  const hasColorMatches = finish === 'MONO' && ranked.some((item) => item.colorMatched);

  if (!hasFinishMatches && !hasColorMatches) {
    return deduped;
  }

  return ranked
    .sort((a, b) => {
      if (hasColorMatches && a.colorMatched !== b.colorMatched) {
        return Number(b.colorMatched) - Number(a.colorMatched);
      }

      if (hasFinishMatches && a.finishMatched !== b.finishMatched) {
        return Number(b.finishMatched) - Number(a.finishMatched);
      }

      if (a.isCover !== b.isCover) {
        return Number(b.isCover) - Number(a.isCover);
      }

      return a.index - b.index;
    })
    .map((item) => item.image);
}

function Gallery({
  images,
  title,
  isAdult,
  isAgeVerified,
  verifyHref,
}: {
  images: ProductImage[];
  title: string;
  isAdult: boolean;
  isAgeVerified: boolean;
  verifyHref: string;
}) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    setActive(0);
  }, [images]);

  const main = images[active] ?? images[0];
  const shouldHideAdultImage = isAdult && !isAgeVerified;
  const mainImageSrc = main ? resolveMediaUrl(main.url) || '' : '';

  return (
    <div className={styles.gallery}>
      <div className={styles.mainImageWrap}>
        {isAdult && (
          <div className={styles.imageBadges}>
            <span className={`${styles.imageBadge} ${styles.badgeAdult}`}>18+</span>
          </div>
        )}

        {main ? (
          <>
            <img
              src={mainImageSrc}
              alt=""
              aria-hidden="true"
              className={`${styles.mainImageBackdrop} ${
                shouldHideAdultImage ? styles.mainImageBackdropBlurred : ''
              }`}
            />

            <img
              src={mainImageSrc}
              alt={main.alt || title}
              loading="eager"
              decoding="async"
              className={`${styles.mainImage} ${
                shouldHideAdultImage ? styles.blurred : ''
              }`}
            />

            {shouldHideAdultImage ? (
              <Link href={verifyHref} className={styles.adultHintButton}>
                Підтвердити 18+
              </Link>
            ) : null}
          </>
        ) : (
          <div className={styles.mainImagePlaceholder}>
            <span className={styles.mainImagePlaceholderIcon}>
              <IconBow size={72} strokeWidth={1.1} />
            </span>
            <span className={styles.mainImagePlaceholderLabel}>Фото скоро буде</span>
          </div>
        )}
      </div>

      {images.length > 1 && (
        <div className={styles.thumbGrid}>
          {images.map((img, i) => (
            <button
              key={img.id}
              type="button"
              className={`${styles.thumb} ${active === i ? styles.thumbActive : ''}`}
              onClick={() => setActive(i)}
              aria-label={`Показати фото ${i + 1}`}
            >
              <img
                src={resolveMediaUrl(img.url) || ''}
                alt={img.alt || title}
                loading="lazy"
                decoding="async"
                className={`${styles.thumbImg} ${
                  shouldHideAdultImage ? styles.thumbBlurred : ''
                }`}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function VariantSelector({
  variants,
  selected,
  onSelect,
}: {
  variants: Variant[];
  selected: Variant | null;
  onSelect: (v: Variant) => void;
}) {
  if (!variants.length) return null;

  return (
    <div className={styles.variantsSection}>
      <h2 className={styles.variantsTitle}>Варіант фігурки</h2>

      <div className={styles.variantsList}>
        {variants.map((v) => {
          const isSelected = selected?.id === v.id;
          const variantMeta = [v.sizeLabel, v.outfitLabel, v.faceLabel]
            .filter(Boolean)
            .join(' · ');
          const cover = getVariantCoverImage(v);

          return (
            <button
              key={v.id}
              type="button"
              className={`${styles.variantCard} ${isSelected ? styles.variantCardSelected : ''}`}
              onClick={() => onSelect(v)}
              aria-pressed={isSelected}
            >
              <div className={styles.variantSelector}>
                <div className={styles.variantSelectorDot} />
              </div>

              <div className={styles.variantMedia}>
                {cover ? (
                  <img
                    src={resolveMediaUrl(cover.url) || ''}
                    alt={cover.alt || v.name}
                    loading="lazy"
                    decoding="async"
                    className={styles.variantThumbImg}
                  />
                ) : (
                  <div className={styles.variantThumbPlaceholder}>Фото</div>
                )}
              </div>

              <div className={styles.variantLeft}>
                <span className={styles.variantName}>{v.name}</span>

                {variantMeta ? (
                  <span className={styles.variantMeta}>{variantMeta}</span>
                ) : null}
              </div>

              <div className={styles.variantRight}>
                <span className={styles.variantPrice}>
                  {formatMoney(v.price, v.currency)}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function FinishSelector({
  value,
  onChange,
  currency,
}: {
  value: FinishType;
  onChange: (value: FinishType) => void;
  currency: string;
}) {
  return (
    <div className={styles.variantsSection}>
      <h2 className={styles.variantsTitle}>Виконання</h2>

      <div className={styles.variantsList}>
        {FINISHES.map((item) => {
          const isSelected = value === item.code;
          const isDisabled = Boolean(item.isDisabled);

          return (
            <button
              key={item.code}
              type="button"
              className={`${styles.variantCard} ${isSelected ? styles.variantCardSelected : ''}`}
              onClick={() => onChange(item.code)}
              disabled={isDisabled}
              aria-pressed={isSelected}
            >
              <div className={styles.variantSelector}>
                <div className={styles.variantSelectorDot} />
              </div>

              <div className={styles.variantLeft}>
                <span className={styles.variantName}>{item.label}</span>
                <span className={styles.variantMeta}>
                  {isDisabled
                    ? item.disabledNote ?? 'Тимчасово недоступно'
                    : `Термін відправлення: ${formatDaysLabel(item.leadTimeDays)}`}
                </span>
              </div>

              <div className={styles.variantRight}>
                <span className={styles.variantPrice}>
                  {isDisabled
                    ? 'Недоступно'
                    : item.priceDelta > 0
                      ? `+${formatMoney(item.priceDelta, currency)}`
                      : 'Без доплати'}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ColorSelector({
  value,
  onChange,
  currency,
}: {
  value: ColorType;
  onChange: (value: ColorType) => void;
  currency: string;
}) {
  return (
    <div className={styles.variantsSection}>
      <h2 className={styles.variantsTitle}>Колір</h2>

      <div className={styles.variantsList}>
        {COLORS.map((item) => {
          const isSelected = value === item.code;

          return (
            <button
              key={item.code}
              type="button"
              className={`${styles.variantCard} ${isSelected ? styles.variantCardSelected : ''}`}
              onClick={() => onChange(item.code)}
              aria-pressed={isSelected}
            >
              <div
                className={`${styles.colorSwatch} ${isSelected ? styles.colorSwatchSelected : ''}`}
                style={{
                  background: item.swatchHex,
                  borderColor:
                    item.swatchHex.toLowerCase() === '#f4ebdd'
                      ? 'rgba(0, 0, 0, 0.12)'
                      : undefined,
                }}
                aria-hidden="true"
              />

              <div className={styles.variantLeft}>
                <span className={styles.variantName}>{item.label}</span>
              </div>

              <div className={styles.variantRight}>
                <span className={styles.variantPrice}>
                  {item.priceDelta > 0
                    ? `+${formatMoney(item.priceDelta, currency)}`
                    : 'Без доплати'}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function QuantitySelector({
  value,
  onChange,
  max,
}: {
  value: number;
  onChange: (n: number) => void;
  max: number;
}) {
  return (
    <div className={styles.quantitySection}>
      <span className={styles.quantityLabel}>Кількість</span>

      <div className={styles.quantityControl}>
        <button
          type="button"
          className={styles.quantityBtn}
          onClick={() => onChange(Math.max(1, value - 1))}
          disabled={value <= 1}
          aria-label="Зменшити кількість"
        >
          −
        </button>

        <span className={styles.quantityValue}>{value}</span>

        <button
          type="button"
          className={styles.quantityBtn}
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          aria-label="Збільшити кількість"
        >
          +
        </button>
      </div>
    </div>
  );
}

function TabPanel({
  product,
  selectedVariant,
  selectedFinish,
  selectedColor,
  estimatedShippingLabel,
}: {
  product: Product;
  selectedVariant: Variant | null;
  selectedFinish: FinishType;
  selectedColor: ColorType;
  estimatedShippingLabel: string;
}) {
  const [active, setActive] = useState<Tab>('description');

  const tabs: { id: Tab; label: string }[] = [
    { id: 'description', label: 'Опис' },
    { id: 'specs', label: 'Характеристики' },
    { id: 'delivery', label: 'Доставка і оплата' },
  ];

  function handleTabKeyDown(
    event: KeyboardEvent<HTMLButtonElement>,
    currentIndex: number,
  ) {
    if (
      event.key !== 'ArrowRight' &&
      event.key !== 'ArrowLeft' &&
      event.key !== 'Home' &&
      event.key !== 'End'
    ) {
      return;
    }

    event.preventDefault();

    let nextIndex = currentIndex;

    if (event.key === 'Home') {
      nextIndex = 0;
    } else if (event.key === 'End') {
      nextIndex = tabs.length - 1;
    } else {
      const direction = event.key === 'ArrowRight' ? 1 : -1;
      nextIndex = (currentIndex + direction + tabs.length) % tabs.length;
    }

    const nextTab = tabs[nextIndex];

    setActive(nextTab.id);

    window.requestAnimationFrame(() => {
      document
        .getElementById(`tab-${product.id}-${nextTab.id}`)
        ?.focus();
    });
  }

  const variantMeta = [
    selectedVariant?.sizeLabel,
    selectedVariant?.outfitLabel,
    selectedVariant?.faceLabel,
  ]
    .filter(Boolean)
    .join(' · ');

  const finishOption = FINISHES.find((item) => item.code === selectedFinish) ?? FINISHES[0];
  const colorOption = COLORS.find((item) => item.code === selectedColor) ?? COLORS[0];

  const excludedAttributeKeys = new Set([
    'material',
    'heightMm',
    'countryOfOrigin',
    'manufacturerCode',
    'releaseDate',
    'ageRating',
  ]);

  const extraSpecs = Object.entries(product.attributes ?? {})
    .filter(([key]) => !excludedAttributeKeys.has(key))
    .map(([key, value]) => ({
      key: prettifyAttributeKey(key),
      value: formatAttributeValue(value),
    }))
    .filter((item): item is { key: string; value: string } => Boolean(item.value));

  const specs = [
    product.sku ? { key: 'SKU товару', value: product.sku } : null,
    selectedVariant?.sku ? { key: 'SKU варіанту', value: selectedVariant.sku } : null,
    product.category?.name ? { key: 'Категорія', value: product.category.name } : null,
    product.brand?.name ? { key: 'Бренд', value: product.brand.name } : null,
    product.franchise?.name ? { key: 'Франшиза', value: product.franchise.name } : null,
    product.series ? { key: 'Серія', value: product.series } : null,
    product.productType
      ? { key: 'Тип фігурки', value: productTypeLabel(product.productType) }
      : null,
    product.character?.name ? { key: 'Персонаж', value: product.character.name } : null,
    variantMeta ? { key: 'Варіант', value: variantMeta } : null,
    { key: 'Виконання', value: finishOption.label },
    selectedFinish === 'MONO' ? { key: 'Колір', value: colorOption.label } : null,
    product.material ? { key: 'Матеріал', value: product.material } : null,
    product.heightMm != null ? { key: 'Висота', value: `${product.heightMm} мм` } : null,
    product.countryOfOrigin
      ? { key: 'Країна походження', value: product.countryOfOrigin }
      : null,
    product.manufacturerCode
      ? { key: 'Код виробника', value: product.manufacturerCode }
      : null,
    product.releaseDate
      ? { key: 'Дата релізу', value: formatDate(product.releaseDate) }
      : null,
    product.ageRating
      ? { key: 'Віковий рейтинг', value: ageRatingLabel(product.ageRating) }
      : null,
    ...extraSpecs,
  ].filter((item): item is { key: string; value: string } => Boolean(item?.value));

  return (
    <div className={styles.tabs}>
      <nav className={styles.tabNav} role="tablist" aria-label="Інформація про товар">
        {tabs.map((t, index) => (
          <button
            key={t.id}
            type="button"
            id={`tab-${product.id}-${t.id}`}
            role="tab"
            aria-selected={active === t.id}
            aria-controls={`panel-${product.id}-${t.id}`}
            tabIndex={active === t.id ? 0 : -1}
            className={`${styles.tabBtn} ${active === t.id ? styles.tabBtnActive : ''}`}
            onClick={() => setActive(t.id)}
            onKeyDown={(event) => handleTabKeyDown(event, index)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <div className={styles.tabContent}>
        <div
          id={`panel-${product.id}-description`}
          role="tabpanel"
          aria-labelledby={`tab-${product.id}-description`}
          hidden={active !== 'description'}
        >
          <p className={styles.descriptionText}>
            {product.description ||
              product.shortDescription ||
              'Опис товару поки що не заповнений.'}
          </p>
        </div>

        <div
          id={`panel-${product.id}-specs`}
          role="tabpanel"
          aria-labelledby={`tab-${product.id}-specs`}
          hidden={active !== 'specs'}
        >
          <div className={styles.specsTable}>
            {specs.length ? (
              specs.map((s) => (
                <div key={s.key} className={styles.specsRow}>
                  <span className={styles.specsKey}>{s.key}</span>
                  <span className={styles.specsValue}>{s.value}</span>
                </div>
              ))
            ) : (
              <p className={styles.descriptionText}>Характеристики поки що не заповнені.</p>
            )}
          </div>
        </div>

        <div
          id={`panel-${product.id}-delivery`}
          role="tabpanel"
          aria-labelledby={`tab-${product.id}-delivery`}
          hidden={active !== 'delivery'}
        >
          <div>
            <div className={styles.specsTable}>
              <div className={styles.specsRow}>
                <span className={styles.specsKey}>Формат замовлення</span>
                <span className={styles.specsValue}>Виготовляється під замовлення</span>
              </div>

              <div className={styles.specsRow}>
                <span className={styles.specsKey}>Виконання</span>
                <span className={styles.specsValue}>{finishOption.label}</span>
              </div>

              {selectedFinish === 'MONO' && (
                <div className={styles.specsRow}>
                  <span className={styles.specsKey}>Колір</span>
                  <span className={styles.specsValue}>{colorOption.label}</span>
                </div>
              )}

              <div className={styles.specsRow}>
                <span className={styles.specsKey}>Орієнтовне відправлення</span>
                <span className={styles.specsValue}>{estimatedShippingLabel}</span>
              </div>

              <div className={styles.specsRow}>
                <span className={styles.specsKey}>Віковий рейтинг</span>
                <span className={styles.specsValue}>{ageRatingLabel(product.ageRating)}</span>
              </div>
            </div>

            <p className={styles.descriptionText}>
              Детальні умови дивись на сторінках{' '}
              <Link href="/delivery" className={styles.breadcrumbLink}>
                Доставка
              </Link>{' '}
              та{' '}
              <Link href="/payment" className={styles.breadcrumbLink}>
                Оплата
              </Link>
              .
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProductInfo({
  product,
  selectedVariant,
  onSelectVariant,
  selectedFinish,
  onSelectFinish,
  selectedColor,
  onSelectColor,
  isAgeVerified,
  verifyHref,
}: {
  product: Product;
  selectedVariant: Variant | null;
  onSelectVariant: (variant: Variant) => void;
  selectedFinish: FinishType;
  onSelectFinish: (value: FinishType) => void;
  selectedColor: ColorType;
  onSelectColor: (value: ColorType) => void;
  isAgeVerified: boolean;
  verifyHref: string;
}) {
  const router = useRouter();

  const [quantity, setQuantity] = useState(1);
  const [wishAdded, setWishAdded] = useState(false);
  const [wishPending, setWishPending] = useState(false);
  const [cartAdded, setCartAdded] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  const basePrice = selectedVariant?.price ?? product.priceFrom;
  const displayCurrency = selectedVariant?.currency ?? product.currency;

  const finishOption = FINISHES.find((item) => item.code === selectedFinish) ?? FINISHES[0];
  const colorOption = COLORS.find((item) => item.code === selectedColor) ?? COLORS[0];

  const finalPrice =
    basePrice +
    finishOption.priceDelta +
    (selectedFinish === 'MONO' ? colorOption.priceDelta : 0);

  const estimatedShippingLabel = formatLeadTime(finishOption.leadTimeDays);
  const maxQty = 99;

  useEffect(() => {
    let active = true;

    async function syncWishlistState() {
      const guestState = isFavorite(product.id);

      if (active) {
        setWishAdded(guestState);
      }

      try {
        const response = await getAccountFavorites();

        if (!active) return;

        setWishAdded(response.items.some((item) => item.productId === product.id));
      } catch (error) {
        if (!isAuthError(error)) {
          console.error(error);
        }
      }
    }

    void syncWishlistState();

    return () => {
      active = false;
    };
  }, [product.id]);

  const subtitle = useMemo(() => {
    return (
      [product.series, product.franchise?.name, product.brand?.name, product.category?.name]
        .filter(Boolean)
        .join(' · ') || 'Товар каталогу'
    );
  }, [product.series, product.franchise?.name, product.brand?.name, product.category?.name]);

  const selectedMeta = [
    selectedVariant?.sizeLabel,
    selectedVariant?.outfitLabel,
    selectedVariant?.faceLabel,
  ]
    .filter(Boolean)
    .join(' · ');

  const topMeta = [
    selectedVariant?.sku ? `SKU: ${selectedVariant.sku}` : product.sku ? `SKU: ${product.sku}` : null,
    product.character?.name ? `Персонаж: ${product.character.name}` : null,
    product.ageRating ? `Вік: ${ageRatingLabel(product.ageRating)}` : null,
  ]
    .filter(Boolean)
    .join(' • ');

  function handleAddToCart() {
    if (product.isAdult && !isAgeVerified) {
      router.push(verifyHref);
      return;
    }

    const safeQuantity = Math.max(1, Math.min(quantity, maxQty));
    const cartTitle = selectedVariant
      ? `${product.title} — ${selectedVariant.name}`
      : product.title;

    const coverImage =
      (selectedVariant ? getVariantCoverImage(selectedVariant) : null) ??
      product.images.find((image) => image.isCover) ??
      product.images[0] ??
      null;

    const cartLineId = [
      selectedVariant?.id ?? product.id,
      selectedFinish,
      selectedFinish === 'MONO' ? selectedColor : 'AUTO',
    ].join(':');

    addCartItem({
      id: cartLineId,
      productId: product.id,
      slug: product.slug,
      name: cartTitle,
      price: finalPrice,
      quantity: safeQuantity,
      currency: displayCurrency,
      subtitle: [
        selectedMeta || subtitle,
        finishOption.label,
        selectedFinish === 'MONO' ? colorOption.label : null,
      ]
        .filter(Boolean)
        .join(' · '),
      series: product.series ?? product.franchise?.name ?? product.brand?.name ?? null,
      imageUrl: coverImage?.url ?? null,
      imageAlt: coverImage?.alt ?? cartTitle,
      isAdult: product.isAdult,
    });

    setCartAdded(true);
    window.setTimeout(() => setCartAdded(false), 1800);
  }

  async function handleShare() {
    const shareUrl = window.location.href;

    try {
      if (navigator.share) {
        await navigator.share({
          title: product.title,
          text: product.shortDescription || product.title,
          url: shareUrl,
        });

        return;
      }

      await navigator.clipboard.writeText(shareUrl);
      setShareCopied(true);
      window.setTimeout(() => setShareCopied(false), 1800);
    } catch (error) {
      console.error(error);
    }
  }

  async function handleWishlist() {
    if (wishPending) return;

    const nextValue = !wishAdded;
    setWishAdded(nextValue);
    setWishPending(true);

    try {
      if (nextValue) {
        try {
          await addAccountFavorite(product.id);
        } catch (error) {
          if (!isAuthError(error)) throw error;

          addFavorite(buildGuestFavoritePayload(product));
        }
      } else {
        try {
          await removeAccountFavorite(product.id);
        } catch (error) {
          if (!isAuthError(error)) throw error;

          removeFavorite(product.id);
        }
      }
    } catch (error) {
      console.error(error);
      setWishAdded(!nextValue);
    } finally {
      setWishPending(false);
    }
  }

  return (
    <div className={styles.info}>
      <p className={styles.seriesLabel}>{subtitle}</p>
      <h1 className={styles.productTitle}>{product.title}</h1>

      {topMeta ? (
        <div className={styles.ratingRow}>
          <span className={styles.ratingCount}>{topMeta}</span>
        </div>
      ) : null}

      <div className={styles.priceBlock}>
        <span className={styles.priceMain}>{formatMoney(finalPrice, displayCurrency)}</span>
      </div>

      <p className={styles.shippingNote}>
        Орієнтовне відправлення: {estimatedShippingLabel}
      </p>

      {selectedMeta ? (
        <p className={styles.selectedMetaNote}>{selectedMeta}</p>
      ) : null}

      {product.shortDescription ? (
        <p className={styles.shortDesc}>{product.shortDescription}</p>
      ) : null}

      <VariantSelector
        variants={product.variants}
        selected={selectedVariant}
        onSelect={onSelectVariant}
      />

      <FinishSelector
        value={selectedFinish}
        onChange={onSelectFinish}
        currency={displayCurrency}
      />

      {selectedFinish === 'MONO' && (
        <ColorSelector
          value={selectedColor}
          onChange={onSelectColor}
          currency={displayCurrency}
        />
      )}

      <QuantitySelector value={quantity} onChange={setQuantity} max={maxQty} />

      {/* Вкладки винесено на рівень сторінки (на всю ширину під гридом) */}
      <div className={styles.actions}>
        <button
          type="button"
          className={styles.btnPrimary}
          onClick={handleAddToCart}
        >
          {product.isAdult && !isAgeVerified ? (
            'Підтвердити 18+ для покупки'
          ) : cartAdded ? (
            '✓ Додано до кошика'
          ) : (
            <>
              <IconBag size={16} />
              Додати до кошика
            </>
          )}
        </button>

        <div className={styles.btnRow}>
          <button
            type="button"
            className={styles.btnSecondary}
            onClick={() => void handleWishlist()}
            disabled={wishPending}
          >
            <IconHeart size={15} filled={wishAdded} />
            {wishAdded ? 'В обраному' : 'Додати до обраного'}
          </button>

          <button
            type="button"
            className={styles.btnSecondary}
            onClick={() => void handleShare()}
          >
            {shareCopied ? (
              '✓ Посилання скопійовано'
            ) : (
              <>
                <IconShare size={15} />
                Поділитися
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ProductDetailsClient({ product }: { product: Product }) {
  const defaultVariant =
    product.variants.find((v) => v.isDefault) ?? product.variants[0] ?? null;

  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(defaultVariant);
  const [selectedFinish, setSelectedFinish] = useState<FinishType>('MONO');
  const [selectedColor, setSelectedColor] = useState<ColorType>('IVORY');

  const router = useRouter();

  const verifyHref = useMemo(
    () => buildAgeVerifyPath(`/product/${product.slug}`),
    [product.slug],
  );

  const [isAgeVerified, setIsAgeVerified] = useState(!product.isAdult);

  useEffect(() => {
    if (!product.isAdult) {
      setIsAgeVerified(true);
      return;
    }

    const verified = isAgeVerifiedClient();

    setIsAgeVerified(verified);

    if (!verified) {
      router.replace(verifyHref);
    }
  }, [product.isAdult, router, verifyHref]);

  const galleryImages = useMemo(() => {
    return buildGalleryImages(
      product.images,
      selectedVariant,
      selectedFinish,
      selectedColor,
    );
  }, [product.images, selectedVariant, selectedFinish, selectedColor]);

  const finishOption =
    FINISHES.find((item) => item.code === selectedFinish) ?? FINISHES[0];
  const estimatedShippingLabel = formatLeadTime(finishOption.leadTimeDays);

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <div className={styles.productGrid}>
          <Gallery
            images={galleryImages}
            title={selectedVariant?.name || product.title}
            isAdult={product.isAdult}
            isAgeVerified={isAgeVerified}
            verifyHref={verifyHref}
          />

          <ProductInfo
            product={product}
            selectedVariant={selectedVariant}
            onSelectVariant={setSelectedVariant}
            selectedFinish={selectedFinish}
            onSelectFinish={(value) => {
              if (!isFinishDisabled(value)) setSelectedFinish(value);
            }}
            selectedColor={selectedColor}
            onSelectColor={setSelectedColor}
            isAgeVerified={isAgeVerified}
            verifyHref={verifyHref}
          />
        </div>

        {/* Вкладки на всю ширину контейнера: під галереєю більше немає
            порожньої лівої половини екрана */}
        <TabPanel
          product={product}
          selectedVariant={selectedVariant}
          selectedFinish={selectedFinish}
          selectedColor={selectedColor}
          estimatedShippingLabel={estimatedShippingLabel}
        />
      </div>
    </main>
  );
}
