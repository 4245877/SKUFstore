"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getHomeProducts,
  resolveMediaUrl,
  type HomeProductItem,
} from "../../../lib/api";
import {
  FREE_DELIVERY_THRESHOLD,
  clearCart,
  formatPrice,
  getCartItemsCount,
  getCartSubtotal,
  getDeliveryPrice,
  readCart,
  removeCartItem,
  subscribeToCartChange,
  type CartItem,
  updateCartItemQuantity,
} from "../../../lib/demo-store";
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
  items: CartItem[];
  subtotal: number;
  currency: string;
};

const PAGE_COPY = {
  breadcrumb: {
    ariaLabel: "Хлібні крихти",
    home: "Головна",
    catalog: "Каталог",
    current: "Кошик",
  },
  header: {
    eyebrow: "Кошик",
    title: "Ваш кошик",
    clear: "Очистити кошик",
    loading: "Завантаження кошика…",
  },
  empty: {
    icon: "🛒",
    title: "Кошик порожній",
    text: "Схоже, у кошику поки нічого немає. Загляньте до каталогу.",
    cta: "Перейти до каталогу →",
  },
  cart: {
    productLink: "До товару",
    continueShopping: "Продовжити покупки",
    quantityDecrease: "Зменшити",
    quantityIncrease: "Збільшити",
    remove: "Видалити з кошика",
    columns: {
      product: "Товар",
      price: "Ціна",
      quantity: "К-сть",
      subtotal: "Сума",
    },
  },
  actions: {
    checkout: "Оформити замовлення",
    paymentMethods: "Способи оплати",
  },
  recommendations: {
    title: "Разом із цим товаром часто купують",
  },
  placeholders: {
    image: "Фото",
  },
};

const SUMMARY_COPY = {
  title: "Підсумок кошика",
  itemsInCartSuffix: "у кошику",
  labels: {
    subtotal: "Сума товарів",
    shipping: "Доставка",
    total: "Разом",
  },
  shipping: {
    free: "Безкоштовно",
    tooltip:
      "Попередня вартість доставки. Точну суму буде показано під час оформлення.",
    freeReached: "Безкоштовна доставка вже доступна",
    remainingPrefix: "Додайте ще",
    remainingSuffix: "для безкоштовної доставки",
  },
  notes: {
    savedTitle: "Товари вже збережені у кошику",
    savedText:
      "на наступному кроці залишиться лише вказати контакти та спосіб доставки",
    reviewTitle: "Перевірка перед оплатою",
    reviewText: "кількість можна змінити, а каталог залишається доступним",
    shippingTitle: "Попередній розрахунок доставки",
    shippingText: "точну суму буде показано під час оформлення",
  },
};

const TRUST_BADGES = [
  { icon: "✓", label: "Ручна перевірка" },
  { icon: "✓", label: "Надійне пакування" },
  { icon: "✓", label: "Безпечна оплата" },
] as const;

const SUMMARY_NOTES = [
  {
    icon: "✓",
    title: SUMMARY_COPY.notes.savedTitle,
    text: SUMMARY_COPY.notes.savedText,
  },
  {
    icon: "✓",
    title: SUMMARY_COPY.notes.reviewTitle,
    text: SUMMARY_COPY.notes.reviewText,
  },
  {
    icon: "✓",
    title: SUMMARY_COPY.notes.shippingTitle,
    text: SUMMARY_COPY.notes.shippingText,
  },
] as const;

const DEFAULT_SERIES_LABEL = "Фігурка з каталогу";

function pluralizeProducts(count: number) {
  const mod10 = count % 10;
  const mod100 = count % 100;

  if (mod10 === 1 && mod100 !== 11) return "товар";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return "товари";
  }

  return "товарів";
}

function CartItemRow({ item, onQtyChange, onRemove }: CartItemRowProps) {
  const currency = item.currency ?? "UAH";
  const subtotal = item.price * item.quantity;
  const seriesLabel = item.series || item.subtitle || DEFAULT_SERIES_LABEL;
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
              className={styles.cartItemThumbImg}
            />
          ) : (
            <div
              className={styles.cartItemThumbPlaceholder}
              aria-label={PAGE_COPY.placeholders.image}
            >
              {PAGE_COPY.placeholders.image}
            </div>
          )}
        </div>

        <div className={styles.cartItemDetails}>
          <p className={styles.cartItemSeries}>{seriesLabel}</p>

          <Link href={productHref} className={styles.cartItemName}>
            {item.name}
          </Link>

          <div className={styles.cartItemMeta}>
            {item.subtitle && item.subtitle !== item.series ? (
              <span className={styles.cartItemTag}>{item.subtitle}</span>
            ) : null}

            <Link href={productHref} className={styles.cartItemLink}>
              {PAGE_COPY.cart.productLink}
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
            aria-label={PAGE_COPY.cart.quantityDecrease}
            disabled={item.quantity <= 1}
            onClick={() => onQtyChange(item.id, item.quantity - 1)}
          >
            −
          </button>
          <span className={styles.qtyValue}>{item.quantity}</span>
          <button
            type="button"
            className={styles.qtyBtn}
            aria-label={PAGE_COPY.cart.quantityIncrease}
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
          aria-label={PAGE_COPY.cart.remove}
          onClick={() => onRemove(item.id)}
        >
          ×
        </button>
      </div>
    </div>
  );
}

function OrderSummary({ items, subtotal, currency }: OrderSummaryProps) {
  const shipping = getDeliveryPrice("nova-poshta-branch", items);
  const total = subtotal + shipping;
  const progressPct = Math.min((subtotal / FREE_DELIVERY_THRESHOLD) * 100, 100);
  const remaining = Math.max(0, FREE_DELIVERY_THRESHOLD - subtotal);
  const itemsCount = getCartItemsCount(items);

  return (
    <div className={styles.orderSummary}>
      <div className={styles.summaryCard}>
        <div className={styles.summaryHead}>
          <div>
            <h2 className={styles.summaryTitle}>{SUMMARY_COPY.title}</h2>
            <p className={styles.summaryHint}>
              {itemsCount} {pluralizeProducts(itemsCount)}{" "}
              {SUMMARY_COPY.itemsInCartSuffix}
            </p>
          </div>
        </div>

        <div className={styles.summaryBody}>
          <div className={styles.summaryLines}>
            <div className={styles.summaryLine}>
              <span className={styles.summaryLineLabel}>
                {SUMMARY_COPY.labels.subtotal}
              </span>
              <span className={styles.summaryLineVal}>
                {formatPrice(subtotal, currency)}
              </span>
            </div>

            <div className={styles.summaryLine}>
              <span className={styles.summaryLineLabel}>
                {SUMMARY_COPY.labels.shipping}
                <span
                  className={styles.summaryInfoTip}
                  title={SUMMARY_COPY.shipping.tooltip}
                  aria-label={SUMMARY_COPY.shipping.tooltip}
                  tabIndex={0}
                >
                  ?
                </span>
              </span>

              {shipping === 0 ? (
                <span
                  className={`${styles.summaryLineVal} ${styles.summaryLineFree}`}
                >
                  {SUMMARY_COPY.shipping.free}
                </span>
              ) : (
                <span className={styles.summaryLineVal}>
                  {formatPrice(shipping, currency)}
                </span>
              )}
            </div>
          </div>

          <div className={styles.summaryTotal}>
            <span className={styles.summaryTotalLabel}>
              {SUMMARY_COPY.labels.total}
            </span>
            <span className={styles.summaryTotalVal}>
              {formatPrice(total, currency)}
            </span>
          </div>

          <Link href="/checkout" className={styles.checkoutBtn}>
            {PAGE_COPY.actions.checkout}
          </Link>

          <Link href="/payment" className={styles.checkoutBtnAlt}>
            {PAGE_COPY.actions.paymentMethods}
          </Link>

          <div className={styles.secureBadges}>
            {TRUST_BADGES.map((badge) => (
              <span key={badge.label} className={styles.secureBadge}>
                <span className={styles.secureBadgeIcon}>{badge.icon}</span>
                {badge.label}
              </span>
            ))}
          </div>
        </div>

        <div className={styles.shippingProgress}>
          <p className={styles.shippingProgressText}>
            {shipping === 0 ? (
              <strong>{SUMMARY_COPY.shipping.freeReached}</strong>
            ) : (
              <>
                {SUMMARY_COPY.shipping.remainingPrefix}{" "}
                <strong>{formatPrice(remaining, currency)}</strong>{" "}
                {SUMMARY_COPY.shipping.remainingSuffix}
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
        </div>

        <div className={styles.trustBlock}>
          {SUMMARY_NOTES.map((note) => (
            <div key={note.title} className={styles.trustItem}>
              <span className={styles.trustIcon}>{note.icon}</span>
              <p className={styles.trustText}>
                <strong>{note.title}</strong> — {note.text}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function CartPage() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [catalogItems, setCatalogItems] = useState<HomeProductItem[]>([]);

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

        console.error("Не вдалося завантажити рекомендації для кошика", error);
        setCatalogItems([]);
      }
    }

    void loadRecommendations();

    return () => {
      controller.abort();
    };
  }, []);

  const subtotal = useMemo(() => getCartSubtotal(items), [items]);
  const itemCount = useMemo(() => getCartItemsCount(items), [items]);
  const currency = items[0]?.currency ?? "UAH";

  const recommended = useMemo(() => {
    const cartProductIds = new Set(items.map((item) => item.productId ?? item.id));
    const cartSlugs = new Set(items.map((item) => item.slug));

    return catalogItems
      .filter((item) => !cartProductIds.has(item.id) && !cartSlugs.has(item.slug))
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

  const handleQty = useCallback((id: string, qty: number) => {
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
        aria-label={PAGE_COPY.breadcrumb.ariaLabel}
      >
        <div className={styles.breadcrumbInner}>
          <Link href="/" className={styles.breadcrumbLink}>
            {PAGE_COPY.breadcrumb.home}
          </Link>
          <span className={styles.breadcrumbSep}>›</span>
          <Link href="/catalog" className={styles.breadcrumbLink}>
            {PAGE_COPY.breadcrumb.catalog}
          </Link>
          <span className={styles.breadcrumbSep}>›</span>
          <span className={styles.breadcrumbCurrent}>
            {PAGE_COPY.breadcrumb.current}
          </span>
        </div>
      </nav>

      <div className={styles.pageHeader}>
        <div className={styles.pageHeaderInner}>
          <div className={styles.pageTitleWrap}>
            <p className={styles.pageEyebrow}>{PAGE_COPY.header.eyebrow}</p>
            <h1 className={styles.pageTitle}>{PAGE_COPY.header.title}</h1>
          </div>

          {isReady && !isEmpty ? (
            <div className={styles.pageHeaderMeta}>
              <span className={styles.itemCount}>
                {itemCount} {pluralizeProducts(itemCount)}
              </span>
              <button
                type="button"
                className={styles.clearBtn}
                onClick={handleClear}
              >
                {PAGE_COPY.header.clear}
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {!isReady ? (
        <div className={styles.loadingState}>{PAGE_COPY.header.loading}</div>
      ) : (
        <div
          className={`${styles.cartMain} ${isEmpty ? styles.cartMainEmpty : ""}`}
        >
          <div>
            {isEmpty ? (
              <div className={styles.emptyCart}>
                <span className={styles.emptyCartIcon}>{PAGE_COPY.empty.icon}</span>
                <h2 className={styles.emptyCartTitle}>{PAGE_COPY.empty.title}</h2>
                <p className={styles.emptyCartText}>{PAGE_COPY.empty.text}</p>
                <Link href="/catalog" className={styles.emptyCartCta}>
                  {PAGE_COPY.empty.cta}
                </Link>
              </div>
            ) : (
              <div className={styles.cartItems}>
                <div className={styles.cartItemsHeader}>
                  <span className={styles.cartItemsHeaderCol}>
                    {PAGE_COPY.cart.columns.product}
                  </span>
                  <span className={styles.cartItemsHeaderCol}>
                    {PAGE_COPY.cart.columns.price}
                  </span>
                  <span className={styles.cartItemsHeaderCol}>
                    {PAGE_COPY.cart.columns.quantity}
                  </span>
                  <span className={styles.cartItemsHeaderCol}>
                    {PAGE_COPY.cart.columns.subtotal}
                  </span>
                  <span className={styles.cartItemsHeaderCol}></span>
                </div>

                {items.map((item) => (
                  <CartItemRow
                    key={item.id}
                    item={item}
                    onQtyChange={handleQty}
                    onRemove={handleRemove}
                  />
                ))}

                <div className={styles.continueShoppingWrap}>
                  <Link href="/catalog" className={styles.continueShopping}>
                    <span className={styles.continueArrow}>←</span>
                    {PAGE_COPY.cart.continueShopping}
                  </Link>
                </div>
              </div>
            )}

            {!isEmpty && recommended.length > 0 ? (
              <div className={styles.recommendations}>
                <p className={styles.recommendLabel}>
                  {PAGE_COPY.recommendations.title}
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
                              className={styles.recommendThumbImg}
                            />
                          ) : (
                            <div
                              className={styles.recommendThumbPlaceholder}
                              aria-label={PAGE_COPY.placeholders.image}
                            >
                              {PAGE_COPY.placeholders.image}
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
              items={items}
              subtotal={subtotal}
              currency={currency}
            />
          ) : null}
        </div>
      )}
    </div>
  );
}