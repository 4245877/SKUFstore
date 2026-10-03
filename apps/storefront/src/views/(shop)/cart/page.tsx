'use client';

import { countNoun, presentCartItemSubtitle } from '../../../i18n/presentation';
import { useI18n } from '../../../i18n/client';
import type { Translator } from '../../../i18n/translate';
import Link from '../../../i18n/navigation';
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  getHomeProducts,
  resolveMediaUrl,
  type HomeProductItem,
  type OrderQuote,
} from "../../../lib/api";
import { buildAgeVerifyPath, isAgeVerifiedClient } from "../../../lib/age-gate";
import {
  clearCart,
  formatPrice,
  getCartItemsCount,
  getCartSubtotal,
  readCart,
  removeCartItem,
  subscribeToCartChange,
  type CartItem,
  updateCartItemQuantity,
} from "../../../lib/demo-store";

import { useCartQuote } from "../../../lib/use-cart-quote";
import { IconCart } from "../../../components/icons";
import styles from "./CartPage.module.css";

type RecommendedItem = {
  id: string;
  slug: string;
  name: string;
  price: number;
  currency: string;
  imageUrl: string | null;
  imageAlt: string | null;
};

type CartItemRowProps = {
  item: CartItem;
  onQtyChange: (id: string, qty: number) => void;
  onRemove: (id: string) => void;
};

type OrderSummaryProps = {
  quote: OrderQuote | null;
  message: string | null;
  retry: () => void;
  items: CartItem[];
  subtotal: number;
  currency: string;
  checkoutHref: string;
  checkoutLabel: string;
};

const PAGE_COPY = (t: Translator) => ({
  breadcrumb: {
    ariaLabel: t('shop.pageNavigation'),
    home: t('account.home'),
    catalog: t('account.catalog'),
    current: t('shop.cart'),
  },
  header: {
    eyebrow: t('shop.cart'),
    title: t('shop.yourCart'),
    clear: t('shop.clearCart'),
    loading: t('shop.loadingCart'),
  },
  empty: {
    title: t('shop.yourCartIsEmpty'),
    text: t('shop.thereSNothingInYourCartYet'),
    cta: t('shop.browseCatalog'),
  },
  cart: {
    productLink: t('shop.viewProduct'),
    continueShopping: t('shop.continueShopping'),
    quantityDecrease: t('shop.decrease'),
    quantityIncrease: t('shop.increase'),
    remove: t('shop.removeFromCart'),
    columns: {
      product: t('shop.product'),
      price: t('shop.price'),
      quantity: t('shop.quantity'),
      subtotal: t('shop.amount'),
    },
  },
  actions: {
    checkout: t('shop.checkout'),
    paymentMethods: t('shop.paymentMethods'),
  },
  recommendations: {
    title: t('shop.youMayAlsoLike'),
  },
  placeholders: {
    image: t('shop.noImage'),
  },
});

const SUMMARY_COPY = (t: Translator) => ({
  title: t('shop.cartSummary'),
  itemsInCartSuffix: t('shop.inYourCart'),
  labels: {
    subtotal: t('shop.subtotal'),
    shipping: t('account.delivery'),
    total: t('shop.total'),
  },
  shipping: {
    free: t('shop.free'),
    tooltip:
      t('shop.estimatedDeliveryCostTheFinalAmountIs'),
    freeReached: t('shop.yourOrderQualifiesForFreeDelivery'),
    remainingPrefix: t('shop.addAnother'),
    remainingSuffix: t('shop.forFreeDelivery'),
  },
  notes: {
    savedTitle: t('shop.yourItemsAreSavedInYourCart'),
    savedText:
      t('shop.nextYouLlEnterYourContactDetails'),
    reviewTitle: t('shop.reviewBeforePayment'),
    reviewText: t('shop.youCanChangeQuantitiesOrContinueBrowsing'),
    shippingTitle: t('shop.estimatedDelivery'),
    shippingText: t('shop.theFinalAmountIsShownAtCheckout'),
  },
});

const TRUST_BADGES = (t: Translator) => ([
  { icon: "✓", label: t('shop.checkedByHand') },
  { icon: "✓", label: t('shop.carefulPackaging') },
  { icon: "✓", label: t('shop.securePayment') },
] as const);

const SUMMARY_NOTES = (t: Translator) => ([
  {
    icon: "✓",
    title: SUMMARY_COPY(t).notes.savedTitle,
    text: SUMMARY_COPY(t).notes.savedText,
  },
  {
    icon: "✓",
    title: SUMMARY_COPY(t).notes.reviewTitle,
    text: SUMMARY_COPY(t).notes.reviewText,
  },
  {
    icon: "✓",
    title: SUMMARY_COPY(t).notes.shippingTitle,
    text: SUMMARY_COPY(t).notes.shippingText,
  },
] as const);

const DEFAULT_SERIES_LABEL = (t: Translator) => (t('shop.figureFromTheCatalog'));

function CartItemRow({ item, onQtyChange, onRemove }: CartItemRowProps) {
  const { locale, t, path } = useI18n();

  const currency = item.currency ?? "UAH";
  const subtotal = item.price * item.quantity;
  const subtitle = presentCartItemSubtitle(t, item);
  const seriesLabel = item.series || subtitle || DEFAULT_SERIES_LABEL(t);
  const imageSrc = item.imageUrl ? resolveMediaUrl(item.imageUrl) : null;
  const productHref = `/product/${item.slug}`;

  return (
    <div className={styles.cartItem}>
      <div className={styles.cartItemInfo}>
        <div className={styles.cartItemThumb}>
          {imageSrc ? (
            <img
              src={imageSrc}
              alt={item.imageAlt || item.name}
              loading="lazy"
              decoding="async"
              className={styles.cartItemThumbImg}
            />
          ) : (
            <div
              className={styles.cartItemThumbPlaceholder}
              aria-label={PAGE_COPY(t).placeholders.image}
            >
              {PAGE_COPY(t).placeholders.image}
            </div>
          )}
        </div>

        <div className={styles.cartItemDetails}>
          <p className={styles.cartItemSeries}>{seriesLabel}</p>

          <Link href={productHref} className={styles.cartItemName}>
            {item.name === 'Товар кошика' ? t('shop.product') : item.name}
          </Link>

          <div className={styles.cartItemMeta}>
            {item.configurationIssue ? <p role="alert">{t('errors.cartSelection')}</p> : null}
            {subtitle && subtitle !== item.series ? (
              <span className={styles.cartItemTag}>{subtitle}</span>
            ) : null}

            <Link href={productHref} className={styles.cartItemLink}>
              {PAGE_COPY(t).cart.productLink}
            </Link>
          </div>
        </div>
      </div>

      <div className={styles.cartItemPrice}>
        <span className={styles.cartItemPriceVal}>
          {formatPrice(item.price, currency)}
        </span>
      </div>

      <div className={styles.cartItemQtyWrap}>
        <div className={styles.cartItemQty}>
          <button
            type="button"
            className={styles.qtyBtn}
            aria-label={PAGE_COPY(t).cart.quantityDecrease}
            disabled={item.quantity <= 1}
            onClick={() => onQtyChange(item.id, item.quantity - 1)}
          >
            −
          </button>
          <span className={styles.qtyValue}>{item.quantity}</span>
          <button
            type="button"
            className={styles.qtyBtn}
            aria-label={PAGE_COPY(t).cart.quantityIncrease}
            onClick={() => onQtyChange(item.id, item.quantity + 1)}
          >
            +
          </button>
        </div>
      </div>

      <div className={styles.cartItemSubtotal}>
        <span className={styles.cartItemSubtotalVal}>
          {formatPrice(subtotal, currency)}
        </span>
      </div>

      <div className={styles.cartItemRemove}>
        <button
          type="button"
          className={styles.removeBtn}
          aria-label={PAGE_COPY(t).cart.remove}
          onClick={() => onRemove(item.id)}
        >
          ×
        </button>
      </div>
    </div>
  );
}

function OrderSummary({
  quote, message, retry,
  items,
  subtotal,
  currency,
  checkoutHref,
  checkoutLabel,
}: OrderSummaryProps) {
  const { locale, t, path } = useI18n();

  const shipping = quote?.deliveryPrice;
  const total = quote?.total;
  const FREE_DELIVERY_THRESHOLD = quote?.shippingPolicy.freeDeliveryThreshold;
  const progressPct = Math.min((subtotal / FREE_DELIVERY_THRESHOLD) * 100, 100);
  const remaining = Math.max(0, FREE_DELIVERY_THRESHOLD - subtotal);
  const itemsCount = getCartItemsCount(items);

  return (
    <div className={styles.orderSummary}>
      <div className={styles.summaryCard}>
        <div className={styles.summaryHead}>
          <div>
            <h2 className={styles.summaryTitle}>{SUMMARY_COPY(t).title}</h2>
            <p className={styles.summaryHint}>
              {itemsCount} {countNoun(t, locale, itemsCount, 'products')}{" "}
              {SUMMARY_COPY(t).itemsInCartSuffix}
            </p>
          </div>
        </div>

        <div className={styles.summaryBody}>
          <div className={styles.summaryLines}>
            <div className={styles.summaryLine}>
              <span className={styles.summaryLineLabel}>
                {SUMMARY_COPY(t).labels.subtotal}
              </span>
              <span className={styles.summaryLineVal}>
                {formatPrice(subtotal, currency)}
              </span>
            </div>

            <div className={styles.summaryLine}>
              <span className={styles.summaryLineLabel}>
                {SUMMARY_COPY(t).labels.shipping}
                <span
                  className={styles.summaryInfoTip}
                  title={SUMMARY_COPY(t).shipping.tooltip}
                  aria-label={SUMMARY_COPY(t).shipping.tooltip}
                  tabIndex={0}
                >
                  ?
                </span>
              </span>

              {shipping === 0 ? (
                <span
                  className={`${styles.summaryLineVal} ${styles.summaryLineFree}`}
                >
                  {SUMMARY_COPY(t).shipping.free}
                </span>
              ) : (
                <span className={styles.summaryLineVal}>
                  {shipping == null ? t('shop.toBeConfirmed') : formatPrice(shipping, currency)}
                </span>
              )}
            </div>
          </div>

          <div className={styles.summaryTotal}>
            <span className={styles.summaryTotalLabel}>
              {SUMMARY_COPY(t).labels.total}
            </span>
            <span className={styles.summaryTotalVal}>
              {total == null ? t('shop.toBeConfirmed') : formatPrice(total, currency)}
            </span>
          </div>

          {message ? <p role="status">{message}</p> : null}
          {!quote ? <button type="button" onClick={retry}>{t('shop.checkAgain')}</button> : null}
          <Link href={checkoutHref} className={styles.checkoutBtn} aria-disabled={!quote}
            onClick={(event) => { if (!quote) event.preventDefault(); }}>
            {checkoutLabel}
          </Link>

          <Link href="/payment" className={styles.checkoutBtnAlt}>
            {PAGE_COPY(t).actions.paymentMethods}
          </Link>

          <div className={styles.secureBadges}>
            {TRUST_BADGES(t).map((badge) => (
              <span key={badge.label} className={styles.secureBadge}>
                <span className={styles.secureBadgeIcon}>{badge.icon}</span>
                {badge.label}
              </span>
            ))}
          </div>
        </div>

        {quote ? <div className={styles.shippingProgress}>
          <p className={styles.shippingProgressText}>
            {shipping === 0 ? (
              <strong>{SUMMARY_COPY(t).shipping.freeReached}</strong>
            ) : (
              <>
                {SUMMARY_COPY(t).shipping.remainingPrefix}{" "}
                <strong>{formatPrice(remaining, currency)}</strong>{" "}
                {SUMMARY_COPY(t).shipping.remainingSuffix}
              </>
            )}
          </p>

          <div className={styles.progressBar}>
            <div
              className={styles.progressFill}
              style={{ width: `${progressPct}%` }}
            />
          </div>

          <div className={styles.shippingProgressCap}>
            <span>{formatPrice(0, currency)}</span>
            <span>{formatPrice(FREE_DELIVERY_THRESHOLD, currency)}</span>
          </div>
        </div> : null}

        <div className={styles.trustBlock}>
          {SUMMARY_NOTES(t).map((note) => (
            <div key={note.title} className={styles.trustItem}>
              <span className={styles.trustIcon}>{note.icon}</span>
              <p className={styles.trustText}>
                <strong>{note.title}.</strong> {note.text}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function CartPage() {
  const { locale, t, path } = useI18n();

  const [cartItems, setItems] = useState<CartItem[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [catalogItems, setCatalogItems] = useState<HomeProductItem[]>([]);
  const [isAgeVerified, setIsAgeVerified] = useState<boolean | null>(null);

  useEffect(() => {
    const syncCart = () => {
      setItems(readCart());
      setIsReady(true);
    };

    syncCart();
    const unsubscribe = subscribeToCartChange(syncCart);

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    async function loadRecommendations() {
      try {
        const response = await getHomeProducts();

        if (controller.signal.aborted) {
          return;
        }

        setCatalogItems(response.items);
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        console.error(t('shop.weCouldnTLoadCartRecommendations'), error);
        setCatalogItems([]);
      }
    }

    void loadRecommendations();

    return () => {
      controller.abort();
    };
  }, []);

  const pricing = useCartQuote(cartItems, "nova-poshta-branch");
  const { items, quote } = pricing;
  const subtotal = quote?.subtotal ?? getCartSubtotal(items);
  const itemCount = useMemo(() => getCartItemsCount(items), [items]);

  const hasAdultItems = useMemo(
    () => items.some((item) => item.isAdult),
    [items],
  );

  const checkoutHref =
    hasAdultItems && isAgeVerified !== true
      ? buildAgeVerifyPath("/checkout")
      : "/checkout";

  const checkoutLabel =
    hasAdultItems && isAgeVerified !== true
      ? t('shop.confirmYouAre18ToCheckOut')
      : PAGE_COPY(t).actions.checkout;

  const currency = items[0]?.currency ?? "UAH";

  useEffect(() => {
    if (!hasAdultItems) {
      setIsAgeVerified(true);
      return;
    }

    setIsAgeVerified(isAgeVerifiedClient());
  }, [hasAdultItems]);

  const recommended = useMemo(() => {
    const cartProductIds = new Set(
      items.map((item) => item.productId ?? item.id),
    );
    const cartSlugs = new Set(items.map((item) => item.slug));

    return catalogItems
      .filter(
        (item) => !cartProductIds.has(item.id) && !cartSlugs.has(item.slug),
      )
      .slice(0, 3)
      .map((item): RecommendedItem => ({
        id: item.id,
        slug: item.slug,
        name: item.title,
        price: item.defaultVariant?.price ?? item.priceFrom,
        currency: item.defaultVariant?.currency ?? item.currency ?? "UAH",
        imageUrl: item.coverImage?.url ?? null,
        imageAlt: item.coverImage?.alt ?? item.title,
      }));
  }, [catalogItems, items]);

  const handleQuantityChange = useCallback((id: string, qty: number) => {
    setItems(updateCartItemQuantity(id, qty));
  }, []);

  const handleRemove = useCallback((id: string) => {
    setItems(removeCartItem(id));
  }, []);

  const handleClear = useCallback(() => {
    clearCart();
    setItems([]);
  }, []);

  const isEmpty = isReady && items.length === 0;

  return (
    <div className={styles.cartPage}>
      <nav
        className={styles.breadcrumb}
        aria-label={PAGE_COPY(t).breadcrumb.ariaLabel}
      >
        <div className={styles.breadcrumbInner}>
          <Link href="/" className={styles.breadcrumbLink}>
            {PAGE_COPY(t).breadcrumb.home}
          </Link>
          <span className={styles.breadcrumbSep}>›</span>
          <Link href="/catalog" className={styles.breadcrumbLink}>
            {PAGE_COPY(t).breadcrumb.catalog}
          </Link>
          <span className={styles.breadcrumbSep}>›</span>
          <span className={styles.breadcrumbCurrent}>
            {PAGE_COPY(t).breadcrumb.current}
          </span>
        </div>
      </nav>

      <div className={styles.pageHeader}>
        <div className={styles.pageHeaderInner}>
          <div className={styles.pageTitleWrap}>
            <p className={styles.pageEyebrow}>{PAGE_COPY(t).header.eyebrow}</p>
            <h1 className={styles.pageTitle}>{PAGE_COPY(t).header.title}</h1>
          </div>

          {isReady && !isEmpty ? (
            <div className={styles.pageHeaderMeta}>
              <span className={styles.itemCount}>
                {itemCount} {countNoun(t, locale, itemCount, 'products')}
              </span>
              <button
                type="button"
                className={styles.clearBtn}
                onClick={handleClear}
              >
                {PAGE_COPY(t).header.clear}
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {!isReady ? (
        <div className={styles.loadingState}>{PAGE_COPY(t).header.loading}</div>
      ) : (
        <div
          className={`${styles.cartMain} ${isEmpty ? styles.cartMainEmpty : ""}`}
        >
          <div>
            {isEmpty ? (
              <div className={styles.emptyCart}>
                <span className={styles.emptyCartIcon} aria-hidden="true">
                  <IconCart size={48} strokeWidth={1.2} />
                </span>
                <h2 className={styles.emptyCartTitle}>
                  {PAGE_COPY(t).empty.title}
                </h2>
                <p className={styles.emptyCartText}>{PAGE_COPY(t).empty.text}</p>
                <Link href="/catalog" className={styles.emptyCartCta}>
                  {PAGE_COPY(t).empty.cta}
                </Link>
              </div>
            ) : (
              <div className={styles.cartItems}>
                <div className={styles.cartItemsHeader}>
                  <span className={styles.cartItemsHeaderCol}>
                    {PAGE_COPY(t).cart.columns.product}
                  </span>
                  <span className={styles.cartItemsHeaderCol}>
                    {PAGE_COPY(t).cart.columns.price}
                  </span>
                  <span className={styles.cartItemsHeaderCol}>
                    {PAGE_COPY(t).cart.columns.quantity}
                  </span>
                  <span className={styles.cartItemsHeaderCol}>
                    {PAGE_COPY(t).cart.columns.subtotal}
                  </span>
                  <span className={styles.cartItemsHeaderCol}></span>
                </div>

                {items.map((item) => (
                  <CartItemRow
                    key={item.id}
                    item={item}
                    onQtyChange={handleQuantityChange}
                    onRemove={handleRemove}
                  />
                ))}

                <div className={styles.continueShoppingWrap}>
                  <Link href="/catalog" className={styles.continueShopping}>
                    <span className={styles.continueArrow}>←</span>
                    {PAGE_COPY(t).cart.continueShopping}
                  </Link>
                </div>
              </div>
            )}

            {!isEmpty && recommended.length > 0 ? (
              <div className={styles.recommendations}>
                <p className={styles.recommendLabel}>
                  {PAGE_COPY(t).recommendations.title}
                </p>

                <div className={styles.recommendGrid}>
                  {recommended.map((item) => {
                    const imageSrc = item.imageUrl
                      ? resolveMediaUrl(item.imageUrl)
                      : null;

                    return (
                      <Link
                        key={item.id}
                        href={`/product/${item.slug}`}
                        className={styles.recommendCard}
                      >
                        <div className={styles.recommendThumb}>
                          {imageSrc ? (
                            <img
                              src={imageSrc}
                              alt={item.imageAlt || item.name}
                              loading="lazy"
                              decoding="async"
                              className={styles.recommendThumbImg}
                            />
                          ) : (
                            <div
                              className={styles.recommendThumbPlaceholder}
                              aria-label={PAGE_COPY(t).placeholders.image}
                            >
                              {PAGE_COPY(t).placeholders.image}
                            </div>
                          )}
                        </div>

                        <div className={styles.recommendBody}>
                          <p className={styles.recommendName}>{item.name}</p>
                          <p className={styles.recommendPrice}>
                            {formatPrice(item.price, item.currency)}
                          </p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>

          {!isEmpty ? (
            <OrderSummary
              quote={quote}
              message={pricing.message}
              retry={pricing.refresh}
              items={items}
              subtotal={subtotal}
              currency={currency}
              checkoutHref={checkoutHref}
              checkoutLabel={checkoutLabel}
            />
          ) : null}
        </div>
      )}
    </div>
  );
}
