'use client';

import { useI18n } from '../../../../i18n/client';
import type { Translator } from '../../../../i18n/translate';
import Link from '../../../../i18n/navigation';
import { useRouter } from '../../../../i18n/navigation';
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import {
  addAccountFavorite,
  getAccountFavorites,
  getCatalogProductBySlug,
  getCatalogResinColors,
  removeAccountFavorite,
  resolveMediaUrl,
  type CatalogResinColor,
} from '../../../../lib/api';
import {
  addCartItem,
  addFavorite,
  isFavorite,
  removeFavorite,
} from '../../../../lib/demo-store';
import {
  FALLBACK_RESIN_COLORS,
  colorLabelWithStock,
  isLightSwatch,
  pickDefaultColorSlug,
  reconcileSelectedColorSlug,
  resolveSelectedColor,
} from '../../../../lib/resin-colors';
import { cartLineKey } from '../../../../lib/cart-lines';
import { buildAgeVerifyPath, isAgeVerifiedClient } from '../../../../lib/age-gate';
import { IconBag, IconBow, IconHeart, IconShare } from '../../../../components/icons';
import styles from './ProductDetails.module.css';

type Product = Awaited<ReturnType<typeof getCatalogProductBySlug>>;
type Variant = Product['variants'][number];
type ProductImage = Product['images'][number];
type Tab = 'description' | 'specs' | 'delivery';
type FinishType = 'MONO' | 'PAINTED';

const FINISHES = (t: Translator): {
  code: FinishType;
  label: string;
  priceDelta: number;
  leadTimeDays: number;
  isDisabled?: boolean;
  disabledNote?: string;
}[] => ([
  { code: 'MONO', label: t('shop.monochromeVersion'), priceDelta: 0, leadTimeDays: 3 },
  {
    code: 'PAINTED',
    label: t('shop.artisticPainting'),
    priceDelta: 1200,
    leadTimeDays: 10,
    isDisabled: true,
    disabledNote: t('shop.temporarilyUnavailable'),
  },
]);

const FINISH_IMAGE_KEYWORDS: Record<FinishType, string[]> = {
  MONO: ['mono', 'monochrome', 'моно', 'monochrom'],
  PAINTED: ['painted', 'painting', 'paint', 'art', 'розпис', 'худож'],
};

// Slug и название цвета сами по себе — уже неплохие ключи для фото, но файлы
// вроде «cream_front.webp» ловятся только дополнительными написаниями.
const COLOR_IMAGE_KEYWORD_ALIASES: Record<string, string[]> = {
  ivory: ['ivori', 'cream', 'creme', 'молоч'],
  graphite: ['grafit', 'charcoal'],
  black: ['chorniy', 'chornyi'],
  pearl: ['перламутр', 'перламутров', 'perl'],
};

function getColorImageKeywords(color: CatalogResinColor | null) {
  if (!color) return [];

  const slug = color.slug.toLowerCase();

  return [slug, color.name.trim().toLowerCase(), ...(COLOR_IMAGE_KEYWORD_ALIASES[slug] ?? [])]
    .filter(Boolean);
}

function formatMoney(value: number, currency: string) {
  return new Intl.NumberFormat('uk-UA', {
    style: 'currency',
    currencyDisplay: 'narrowSymbol',
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: string | null, locale: string) {
  if (!value) return '—';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

function formatLeadTime(t: Translator, days: number) {
  return t('shop.withinValue', { value1: formatDaysLabel(t, days) });
}

function formatDaysLabel(t: Translator, days: number) {
  const mod10 = days % 10;
  const mod100 = days % 100;

  if (mod10 === 1 && mod100 !== 11) return t('shop.valueDay', { value1: days });

  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return t('shop.valueDays', { value1: days });
  }

  return t('shop.valueDays_1044', { value1: days });
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
    hasPriceRange: product.pricing?.hasPriceRange === true,
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

function ageRatingLabel(t: Translator, value: string) {
  switch (value) {
    case 'ALL':
      return t('shop.allAges');
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

function productTypeLabel(t: Translator, value: string | null | undefined) {
  switch (value) {
    case 'FIGURE':
      return t('shop.figure_975');
    case 'BUST':
      return t('shop.bust');
    case 'DIORAMA':
      return t('shop.diorama');
    case 'ACCESSORY':
      return t('shop.accessory');
    case 'KIT':
      return t('shop.kit');
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

function formatAttributeValue(t: Translator, value: unknown): string | null {
  if (value == null) return null;

  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return typeof value === 'boolean' ? (value ? t('shop.yes') : t('shop.no')) : String(value);
  }

  if (Array.isArray(value)) {
    const items = value
      .map((item) => formatAttributeValue(t, item))
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

function isFinishDisabled(t: Translator, value: FinishType) {
  return Boolean(FINISHES(t).find((item) => item.code === value)?.isDisabled);
}

function buildGalleryImages(
  productImages: ProductImage[],
  variant: Variant | null,
  finish: FinishType,
  color: CatalogResinColor | null,
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
      finish === 'MONO' && includesAny(searchText, getColorImageKeywords(color));

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
  const { locale, t, path } = useI18n();

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
                {t('shop.confirmYouAre18')} </Link>
            ) : null}
          </>
        ) : (
          <div className={styles.mainImagePlaceholder}>
            <span className={styles.mainImagePlaceholderIcon}>
              <IconBow size={72} strokeWidth={1.1} />
            </span>
            <span className={styles.mainImagePlaceholderLabel}>{t('shop.photoComingSoon')}</span>
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
              aria-label={t('shop.showPhotoValue', { value1: i + 1 })}
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
  const { locale, t, path } = useI18n();

  if (!variants.length) return null;

  return (
    <div className={styles.variantsSection}>
      <h2 className={styles.variantsTitle}>{t('shop.figureVariant')}</h2>

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
                  <div className={styles.variantThumbPlaceholder}>{t('shop.photo')}</div>
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
  const { locale, t, path } = useI18n();

  return (
    <div className={styles.variantsSection}>
      <h2 className={styles.variantsTitle}>{t('shop.finish')}</h2>

      <div className={styles.variantsList}>
        {FINISHES(t).map((item) => {
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
                    ? item.disabledNote ?? t('shop.temporarilyUnavailable')
                    : t('shop.dispatchTimeValue', { value1: formatDaysLabel(t, item.leadTimeDays) })}
                </span>
              </div>

              <div className={styles.variantRight}>
                <span className={styles.variantPrice}>
                  {isDisabled
                    ? t('shop.unavailable')
                    : item.priceDelta > 0
                      ? `+${formatMoney(item.priceDelta, currency)}`
                      : t('shop.noExtraCharge')}
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
  colors,
  value,
  onChange,
  currency,
}: {
  colors: CatalogResinColor[];
  value: CatalogResinColor | null;
  onChange: (slug: string) => void;
  currency: string;
}) {
  const { locale, t, path } = useI18n();

  if (!colors.length) return null;

  return (
    <div className={styles.variantsSection}>
      <h2 className={styles.variantsTitle}>{t('shop.color')}</h2>

      <div className={styles.variantsList}>
        {colors.map((item) => {
          const isSelected = value?.slug === item.slug;

          return (
            <button
              key={item.slug}
              type="button"
              className={`${styles.variantCard} ${isSelected ? styles.variantCardSelected : ''}`}
              onClick={() => onChange(item.slug)}
              aria-pressed={isSelected}
            >
              <div
                className={`${styles.colorSwatch} ${isSelected ? styles.colorSwatchSelected : ''}`}
                style={{
                  background: item.hexColor,
                  borderColor: isLightSwatch(item.hexColor)
                    ? 'rgba(0, 0, 0, 0.12)'
                    : undefined,
                }}
                aria-hidden="true"
              />

              <div className={styles.variantLeft}>
                <span className={styles.variantName}>{item.name}</span>

                {/* Смолу этого цвета не держим на складе — фигурку зальют
                    после подтверждения заказа, поэтому выбор остаётся
                    доступным, но помечен. */}
                {!item.isInStock ? (
                  <span className={styles.preorderBadge}>{t('color.madeToOrder')}</span>
                ) : null}
              </div>

              <div className={styles.variantRight}>
                <span className={styles.variantPrice}>
                  {item.priceDelta > 0
                    ? `+${formatMoney(item.priceDelta, currency)}`
                    : t('shop.noExtraCharge')}
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
  const { locale, t, path } = useI18n();

  return (
    <div className={styles.quantitySection}>
      <span className={styles.quantityLabel}>{t('shop.quantity')}</span>

      <div className={styles.quantityControl}>
        <button
          type="button"
          className={styles.quantityBtn}
          onClick={() => onChange(Math.max(1, value - 1))}
          disabled={value <= 1}
          aria-label={t('shop.decreaseQuantity')}
        >
          −
        </button>

        <span className={styles.quantityValue}>{value}</span>

        <button
          type="button"
          className={styles.quantityBtn}
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          aria-label={t('shop.increaseQuantity')}
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
  selectedColor: CatalogResinColor | null;
  estimatedShippingLabel: string;
}) {
  const { locale, t, path } = useI18n();

  const [active, setActive] = useState<Tab>('description');

  const tabs: { id: Tab; label: string }[] = [
    { id: 'description', label: t('shop.description') },
    { id: 'specs', label: t('shop.specifications') },
    { id: 'delivery', label: t('shop.deliveryAndPayment') },
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

  const finishOption = FINISHES(t).find((item) => item.code === selectedFinish) ?? FINISHES(t)[0];

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
      value: formatAttributeValue(t, value),
    }))
    .filter((item): item is { key: string; value: string } => Boolean(item.value));

  const specs = [
    product.sku ? { key: t('shop.productSku'), value: product.sku } : null,
    selectedVariant?.sku ? { key: t('shop.variantSku'), value: selectedVariant.sku } : null,
    product.category?.name ? { key: t('shop.category_1073'), value: product.category.name } : null,
    product.brand?.name ? { key: t('shop.brand'), value: product.brand.name } : null,
    product.franchise?.name ? { key: t('shop.franchise'), value: product.franchise.name } : null,
    product.series ? { key: t('shop.series'), value: product.series } : null,
    product.productType
      ? { key: t('shop.figureType'), value: productTypeLabel(t, product.productType) }
      : null,
    product.character?.name ? { key: t('shop.character'), value: product.character.name } : null,
    variantMeta ? { key: t('shop.variant'), value: variantMeta } : null,
    { key: t('shop.finish'), value: finishOption.label },
    selectedFinish === 'MONO' && selectedColor
      ? { key: t('shop.color'), value: colorLabelWithStock(selectedColor, t('color.madeToOrder')) }
      : null,
    product.material ? { key: t('shop.material'), value: product.material } : null,
    product.heightMm != null ? { key: t('shop.height'), value: t('shop.valueMm', { value1: product.heightMm }) } : null,
    product.countryOfOrigin
      ? { key: t('shop.countryOfOrigin'), value: product.countryOfOrigin }
      : null,
    product.manufacturerCode
      ? { key: t('shop.manufacturerCode'), value: product.manufacturerCode }
      : null,
    product.releaseDate
      ? { key: t('shop.releaseDate'), value: formatDate(product.releaseDate, locale) }
      : null,
    product.ageRating
      ? { key: t('shop.ageRating'), value: ageRatingLabel(t, product.ageRating) }
      : null,
    ...extraSpecs,
  ].filter((item): item is { key: string; value: string } => Boolean(item?.value));

  return (
    <div className={styles.tabs}>
      <nav className={styles.tabNav} role="tablist" aria-label={t('shop.productInformation')}>
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
              t('shop.aProductDescriptionIsNotAvailableYet')}
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
              <p className={styles.descriptionText}>{t('shop.specificationsAreNotAvailableYet')}</p>
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
                <span className={styles.specsKey}>{t('content.orderFormat')}</span>
                <span className={styles.specsValue}>{t('shop.madeToOrder')}</span>
              </div>

              <div className={styles.specsRow}>
                <span className={styles.specsKey}>{t('shop.finish')}</span>
                <span className={styles.specsValue}>{finishOption.label}</span>
              </div>

              {selectedFinish === 'MONO' && selectedColor && (
                <div className={styles.specsRow}>
                  <span className={styles.specsKey}>{t('shop.color')}</span>
                  <span className={styles.specsValue}>
                    {colorLabelWithStock(selectedColor, t('color.madeToOrder'))}
                  </span>
                </div>
              )}

              <div className={styles.specsRow}>
                <span className={styles.specsKey}>{t('shop.estimatedDispatch')}</span>
                <span className={styles.specsValue}>{estimatedShippingLabel}</span>
              </div>

              <div className={styles.specsRow}>
                <span className={styles.specsKey}>{t('shop.ageRating')}</span>
                <span className={styles.specsValue}>{ageRatingLabel(t, product.ageRating)}</span>
              </div>

              <div className={styles.specsRow}>
                <span className={styles.specsKey}>{t('shop.returnsSpecKey')}</span>
                <span className={styles.specsValue}>
                  <Link href="/returns" className={styles.breadcrumbLink}>
                    {t('shop.returnTermsLink')} </Link>
                </span>
              </div>
            </div>

            {/* Информирование до заказа — требование ст. 13 ч. 2 п. 9 ЗУ «Про
                захист прав споживачів»: порядок розірвання договору покупатель
                должен видеть до оформления, иначе срок отказа растягивается.
                Держим одной строкой, без баннеров: подробности — на /returns. */}
            <p className={styles.descriptionText}>
              {t('shop.madeToOrderNotice')} {t('shop.returnsNotAvailableShort')} </p>

            <p className={styles.descriptionText}>
              {t('shop.seeFullDetailsOnOur')}{' '}
              <Link href="/delivery" className={styles.breadcrumbLink}>
                {t('account.delivery')} </Link>{' '}
              {t('auth.and')}{' '}
              <Link href="/payment" className={styles.breadcrumbLink}>
                {t('account.payment')} </Link>
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
  resinColors,
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
  resinColors: CatalogResinColor[];
  selectedColor: CatalogResinColor | null;
  onSelectColor: (slug: string) => void;
  isAgeVerified: boolean;
  verifyHref: string;
}) {
  const { locale, t, path } = useI18n();

  const router = useRouter();

  const [quantity, setQuantity] = useState(1);
  const [wishAdded, setWishAdded] = useState(false);
  const [wishPending, setWishPending] = useState(false);
  const [cartAdded, setCartAdded] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  const basePrice = selectedVariant?.price ?? product.priceFrom;
  const displayCurrency = selectedVariant?.currency ?? product.currency;

  const finishOption = FINISHES(t).find((item) => item.code === selectedFinish) ?? FINISHES(t)[0];

  const finalPrice =
    basePrice +
    finishOption.priceDelta +
    (selectedFinish === 'MONO' ? selectedColor?.priceDelta ?? 0 : 0);

  const estimatedShippingLabel = formatLeadTime(t, finishOption.leadTimeDays);
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
        .join(' · ') || t('shop.catalogProduct')
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
    product.character?.name ? t('shop.characterValue', { value1: product.character.name }) : null,
    product.ageRating ? t('shop.ageValue', { value1: ageRatingLabel(t, product.ageRating) }) : null,
  ]
    .filter(Boolean)
    .join(' • ');

  function handleAddToCart() {
    if (product.isAdult && !isAgeVerified) {
      router.push(verifyHref);
      return;
    }

    if (!selectedVariant || selectedFinish !== 'MONO' || !selectedColor) return;

    const safeQuantity = Math.max(1, Math.min(quantity, maxQty));
    const cartTitle = selectedVariant
      ? `${product.title} — ${selectedVariant.name}`
      : product.title;

    const coverImage =
      (selectedVariant ? getVariantCoverImage(selectedVariant) : null) ??
      product.images.find((image) => image.isCover) ??
      product.images[0] ??
      null;

    const selection = { variantId: selectedVariant.id, finish: selectedFinish,
      colorSlug: selectedColor.slug };
    const cartLineId = cartLineKey(selection);

    addCartItem({
      id: cartLineId,
      ...selection,
      productId: product.id,
      slug: product.slug,
      name: cartTitle,
      price: finalPrice,
      quantity: safeQuantity,
      currency: displayCurrency,
      subtitle: [
        selectedMeta || subtitle,
        finishOption.label,
        selectedFinish === 'MONO' && selectedColor
          ? colorLabelWithStock(selectedColor, t('color.madeToOrder'))
          : null,
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
      {locale === 'en' && <p role="note">{t('catalog.sourceNotice')} {t('catalog.deliveryNotice')}</p>}

      {topMeta ? (
        <div className={styles.ratingRow}>
          <span className={styles.ratingCount}>{topMeta}</span>
        </div>
      ) : null}

      <div className={styles.priceBlock}>
        <span className={styles.priceMain}>{formatMoney(finalPrice, displayCurrency)}</span>
      </div>

      <p className={styles.shippingNote}>
        {t('shop.estimatedDispatch_1105')} {estimatedShippingLabel}
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
          colors={resinColors}
          value={selectedColor}
          onChange={onSelectColor}
          currency={displayCurrency}
        />
      )}

      {!selectedColor ? <p role="alert">{t('shop.chooseAnAvailableColorBeforeAddingTo')}</p> : null}
      <QuantitySelector value={quantity} onChange={setQuantity} max={maxQty} />

      {/* Вкладки винесено на рівень сторінки (на всю ширину під гридом) */}
      <div className={styles.actions}>
        <button
          type="button"
          className={styles.btnPrimary}
          disabled={!selectedVariant || selectedFinish !== 'MONO' || !selectedColor}
          onClick={handleAddToCart}
        >
          {product.isAdult && !isAgeVerified ? (
            t('shop.confirmYouAre18ToBuy')
          ) : cartAdded ? (
            t('shop.addedToCart')
          ) : (
            <>
              <IconBag size={16} />
              {t('shop.addToCart')} </>
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
            {wishAdded ? t('shop.savedToFavorites') : t('shop.addToFavorites')}
          </button>

          <button
            type="button"
            className={styles.btnSecondary}
            onClick={() => void handleShare()}
          >
            {shareCopied ? (
              t('shop.linkCopied')
            ) : (
              <>
                <IconShare size={15} />
                {t('shop.share')} </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ProductDetailsClient({
  product,
  initialResinColors,
}: {
  product: Product;
  initialResinColors?: CatalogResinColor[] | null;
}) {
  const { locale, t, path } = useI18n();

  const defaultVariant =
    product.variants.find((v) => v.isDefault) ?? product.variants[0] ?? null;

  const buildResinColors = initialResinColors?.length
    ? initialResinColors
    : FALLBACK_RESIN_COLORS;

  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(defaultVariant);
  const [selectedFinish, setSelectedFinish] = useState<FinishType>('MONO');
  const [resinColors, setResinColors] = useState<CatalogResinColor[]>(buildResinColors);
  const [selectedColorSlug, setSelectedColorSlug] = useState(() =>
    pickDefaultColorSlug(buildResinColors),
  );

  // Отличает выбор покупателя от значения, подставленного на сборке: только
  // первое переживает приезд свежего склада (см. reconcileSelectedColorSlug).
  const userPickedColorRef = useRef(false);

  function handleSelectColor(slug: string) {
    userPickedColorRef.current = true;
    setSelectedColorSlug(slug);
  }

  const router = useRouter();

  // Страница отдаётся статикой с GitHub Pages, поэтому склад смолы, вшитый в
  // HTML на сборке, устаревает при первом же переключении в админке. Забираем
  // актуальное наличие уже в браузере.
  useEffect(() => {
    const controller = new AbortController();

    async function loadResinColors() {
      try {
        const colors = await getCatalogResinColors({
          mode: 'runtime',
          signal: controller.signal,
        });

        if (controller.signal.aborted) return;

        // Ответ применяем целиком, даже пустой: пустой список означает, что в
        // админке скрыли все цвета, а не что запрос не удался. Иначе витрина
        // навсегда осталась бы на наборе со сборки.
        setResinColors(colors);
        setSelectedColorSlug((current) =>
          reconcileSelectedColorSlug(colors, current, {
            userPicked: userPickedColorRef.current,
          }),
        );
      } catch (error) {
        // Склад недоступен — остаёмся на наборе со сборки, витрина работает.
        if (!controller.signal.aborted) {
          console.error(error);
        }
      }
    }

    void loadResinColors();

    return () => controller.abort();
  }, []);

  const selectedColor = useMemo(
    () => resolveSelectedColor(resinColors, selectedColorSlug),
    [resinColors, selectedColorSlug],
  );

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
    FINISHES(t).find((item) => item.code === selectedFinish) ?? FINISHES(t)[0];
  const estimatedShippingLabel = formatLeadTime(t, finishOption.leadTimeDays);

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
              if (!isFinishDisabled(t, value)) setSelectedFinish(value);
            }}
            resinColors={resinColors}
            selectedColor={selectedColor}
            onSelectColor={handleSelectColor}
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
