'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';

import styles from './CheckoutPage.module.css';
import { createOrder, resolveMediaUrl } from '../../../lib/api';
import {
  clearCart,
  formatPrice,
  getCartSubtotal,
  getDeliveryPrice,
  readCart,
  writeLastOrder,
} from '../../../lib/demo-store';
import type { CheckoutFormValues, CartItem } from '../../../lib/demo-store';

const initialForm: CheckoutFormValues = {
  fullName: '',
  email: '',
  phone: '',
  city: '',
  address: '',
  deliveryMethod: 'nova-poshta-branch',
  paymentMethod: 'card',
  comment: '',
};

type DeliveryMethod = CheckoutFormValues['deliveryMethod'];
type PaymentMethod = CheckoutFormValues['paymentMethod'];

type CheckoutCartItem = CartItem & {
  imageUrl?: string | null;
  image?: string | null;
  imageAlt?: string | null;
};

const DELIVERY_LABELS: Record<
  DeliveryMethod,
  { label: string; sub: string; badge?: string; badgeFree?: boolean }
> = {
  'nova-poshta-branch': {
    label: 'Нова пошта, відділення',
    sub: 'Стандартна доставка по Україні',
  },
  courier: {
    label: "Кур'єр",
    sub: 'Доставка за адресою',
    badge: 'Швидко',
  },
  pickup: {
    label: 'Самовивіз',
    sub: 'Без доплати за доставку',
    badge: 'Безкоштовно',
    badgeFree: true,
  },
};

const PAYMENT_LABELS: Record<PaymentMethod, { label: string; sub: string }> = {
  card: { label: 'Оплата карткою', sub: 'Онлайн під час оформлення' },
  'cash-on-delivery': { label: 'Післяплата', sub: 'Оплата при отриманні' },
};

// Placeholder emoji for items without images
const FIGURE_EMOJI = ['🎎', '⛩️', '🌸', '🎀', '✨', '🗡️', '🌙', '🎐'];

function getEmoji(id: string) {
  let n = 0;
  for (let i = 0; i < id.length; i++) n += id.charCodeAt(i);
  return FIGURE_EMOJI[n % FIGURE_EMOJI.length];
}

function formatItemCount(count: number) {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return `${count} позиція`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return `${count} позиції`;
  }
  return `${count} позицій`;
}

export default function CheckoutPage() {
  const router = useRouter();
  const [items, setItems] = useState<CheckoutCartItem[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [brokenImages, setBrokenImages] = useState<Record<string, boolean>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [form, setForm] = useState<CheckoutFormValues>(initialForm);

  const deliveryMethods = Object.keys(DELIVERY_LABELS) as DeliveryMethod[];
  const paymentMethods = Object.keys(PAYMENT_LABELS) as PaymentMethod[];

  useEffect(() => {
    setItems(readCart());
    setIsReady(true);
  }, []);

  const subtotal = getCartSubtotal(items);
  const deliveryPrice = getDeliveryPrice(form.deliveryMethod, items);
  const total = subtotal + deliveryPrice;

  function handleChange<K extends keyof CheckoutFormValues>(
    field: K,
    value: CheckoutFormValues[K],
  ) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (items.length === 0 || isSubmitting) return;

    setSubmitError(null);
    setIsSubmitting(true);

    try {
      const response = await createOrder({
        email: form.email,
        fullName: form.fullName,
        phone: form.phone,
        city: form.city,
        address: form.address,
        deliveryMethod: form.deliveryMethod,
        paymentMethod: form.paymentMethod,
        currency: 'UAH',
        comment: form.comment || undefined,
        items: items.map((item) => ({
          variantId: item.id,
          qty: item.quantity,
        })),
      });

      writeLastOrder(response.order as any);
      clearCart();

      router.push(
        `/checkout/success?order=${encodeURIComponent(response.order.number)}&id=${encodeURIComponent(response.order.id)}`,
      );
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : 'Не вдалося створити замовлення.',
      );
      setIsSubmitting(false);
    }
  }

  /* ── Loading ── */
  if (!isReady) {
    return (
      <main className={styles.page}>
        <div className={styles.container}>
          <p className={styles.loading}>Завантаження оформлення…</p>
        </div>
      </main>
    );
  }

  /* ── Empty cart ── */
  if (items.length === 0) {
    return (
      <main className={styles.page}>
        <div className={styles.container}>
          <section className={styles.emptyState}>
            <span className={styles.emptyIcon}>🛍️</span>
            <h1 className={styles.title}>Оформлювати поки що нічого</h1>
            <p className={styles.emptyText}>
              Кошик порожній. Спочатку додай фігурки, будь ласка.
            </p>
            <Link href="/catalog" className={styles.primaryButton}>
              Перейти до каталогу
            </Link>
          </section>
        </div>
      </main>
    );
  }

  /* ── Main ── */
  return (
    <main className={styles.page}>
      <div className={styles.container}>
        {/* Heading */}
        <div className={styles.heading}>
          <p className={styles.eyebrow}>SKUFnya</p>
          <h1 className={styles.title}>Оформлення замовлення</h1>
          <p className={styles.subtitle}>
            Заповни контактні дані та перевір вміст замовлення.
          </p>
        </div>

        {/* Progress steps */}
        <div className={styles.steps} role="list" aria-label="Кроки оформлення">
          <div className={`${styles.step} ${styles.stepDone}`} role="listitem">
            <div className={styles.stepDot}>✓</div>
            <span className={styles.stepLabel}>Кошик</span>
          </div>
          <div className={`${styles.stepLine} ${styles.stepLineFilled}`} />
          <div className={`${styles.step} ${styles.stepActive}`} role="listitem">
            <div className={styles.stepDot}>2</div>
            <span className={styles.stepLabel}>Оформлення</span>
          </div>
          <div className={styles.stepLine} />
          <div className={styles.step} role="listitem">
            <div className={styles.stepDot}>3</div>
            <span className={styles.stepLabel}>Підтвердження</span>
          </div>
        </div>

        {/* Two-column layout */}
        <div className={styles.layout}>
          {/* ── Left: form ── */}
          <form className={styles.formCard} onSubmit={handleSubmit} noValidate>
            {/* 1. Contact */}
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>
                <span className={styles.sectionIcon}>👤</span>
                Контактні дані
              </h2>
              <div className={styles.grid}>
                <label className={styles.field}>
                  <span className={`${styles.label} ${styles.labelRequired}`}>
                    Ім'я та прізвище
                  </span>
                  <input
                    className={styles.input}
                    value={form.fullName}
                    onChange={(e) => handleChange('fullName', e.target.value)}
                    placeholder="Наприклад, Михайло Пларов"
                    required
                    autoComplete="name"
                  />
                </label>
                <label className={styles.field}>
                  <span className={`${styles.label} ${styles.labelRequired}`}>Телефон</span>
                  <input
                    className={styles.input}
                    type="tel"
                    value={form.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    placeholder="+380 XX XXX XX XX"
                    required
                    autoComplete="tel"
                  />
                </label>
                <label className={styles.field}>
                  <span className={`${styles.label} ${styles.labelRequired}`}>Email</span>
                  <input
                    type="email"
                    className={styles.input}
                    value={form.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    placeholder="name@example.com"
                    required
                    autoComplete="email"
                  />
                </label>
                <label className={styles.field}>
                  <span className={`${styles.label} ${styles.labelRequired}`}>Місто</span>
                  <input
                    className={styles.input}
                    value={form.city}
                    onChange={(e) => handleChange('city', e.target.value)}
                    placeholder="Київ"
                    required
                    autoComplete="address-level2"
                  />
                </label>
              </div>
            </section>

            {/* 2. Delivery */}
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>
                <span className={styles.sectionIcon}>📦</span>
                Доставка
              </h2>
              <div className={styles.options}>
                {deliveryMethods.map((value) => {
                  const { label, sub, badge, badgeFree } = DELIVERY_LABELS[value];
                  return (
                    <label key={value} className={styles.option}>
                      <input
                        type="radio"
                        name="deliveryMethod"
                        checked={form.deliveryMethod === value}
                        onChange={() => handleChange('deliveryMethod', value)}
                      />
                      <span className={styles.optionContent}>
                        <strong className={styles.optionLabel}>{label}</strong>
                        <small className={styles.optionSub}>{sub}</small>
                      </span>
                      {badge && (
                        <span
                          className={`${styles.optionBadge} ${badgeFree ? styles.optionBadgeFree : ''}`}
                        >
                          {badge}
                        </span>
                      )}
                    </label>
                  );
                })}
              </div>

              <label className={`${styles.field} ${styles.gridFull}`}>
                <span className={`${styles.label} ${styles.labelRequired}`}>
                  Адреса&nbsp;/&nbsp;відділення
                </span>
                <input
                  className={styles.input}
                  value={form.address}
                  onChange={(e) => handleChange('address', e.target.value)}
                  placeholder="Вулиця, будинок або номер відділення"
                  required
                  autoComplete="street-address"
                />
              </label>
            </section>

            {/* 3. Payment */}
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>
                <span className={styles.sectionIcon}>💳</span>
                Оплата
              </h2>
              <div className={styles.options}>
                {paymentMethods.map((value) => {
                  const { label, sub } = PAYMENT_LABELS[value];
                  return (
                    <label key={value} className={styles.option}>
                      <input
                        type="radio"
                        name="paymentMethod"
                        checked={form.paymentMethod === value}
                        onChange={() => handleChange('paymentMethod', value)}
                      />
                      <span className={styles.optionContent}>
                        <strong className={styles.optionLabel}>{label}</strong>
                        <small className={styles.optionSub}>{sub}</small>
                      </span>
                    </label>
                  );
                })}
              </div>
            </section>

            {/* 4. Comment */}
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>
                <span className={styles.sectionIcon}>💬</span>
                Коментар
              </h2>
              <label className={styles.field}>
                <span className={styles.label}>Побажання до замовлення</span>
                <textarea
                  className={styles.textarea}
                  value={form.comment}
                  onChange={(e) => handleChange('comment', e.target.value)}
                  placeholder="Наприклад, зателефонувати перед відправленням"
                  rows={4}
                />
              </label>
            </section>

            {/* Actions */}
            <div className={styles.actions}>
              <Link href="/cart" className={styles.secondaryButton}>
                ← Назад до кошика
              </Link>
              <button type="submit" className={styles.primaryButton} disabled={isSubmitting}>
                {isSubmitting ? 'Створюємо замовлення…' : 'Підтвердити замовлення →'}
              </button>
            </div>

            {submitError ? (
              <p role="alert" className={styles.emptyText}>
                {submitError}
              </p>
            ) : null}
          </form>

          {/* ── Right: order summary ── */}
          <aside className={styles.summaryCard} aria-label="Зміст замовлення">
            <div className={styles.summaryHeader}>
              <h2 className={styles.summaryTitle}>Твоє замовлення</h2>
              <p className={styles.summarySubtitle}>{formatItemCount(items.length)}</p>
            </div>

            {/* Items */}
            <div className={styles.summaryItems}>
              {items.map((item) => {
                const rawImage = item.imageUrl ?? item.image ?? null;
                const imageSrc =
                  rawImage && !brokenImages[item.id] ? resolveMediaUrl(rawImage) : null;

                return (
                  <div key={item.id} className={styles.summaryItem}>
                    <div className={styles.summaryItemThumb}>
                      {imageSrc ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={imageSrc}
                          alt={item.imageAlt ?? item.name}
                          onError={() =>
                            setBrokenImages((prev) => ({ ...prev, [item.id]: true }))
                          }
                        />
                      ) : (
                        getEmoji(item.id)
                      )}
                    </div>
                    <div className={styles.summaryItemInfo}>
                      <p className={styles.summaryItemName}>{item.name}</p>
                      <p className={styles.summaryItemMeta}>
                        {item.quantity} × {formatPrice(item.price)}
                      </p>
                    </div>
                    <p className={styles.summaryItemPrice}>
                      {formatPrice(item.price * item.quantity)}
                    </p>
                  </div>
                );
              })}
            </div>

            <div className={styles.laceDivider} />

            {/* Totals */}
            <div className={styles.summaryTotals}>
              <div className={styles.summaryRow}>
                <span>Підсумок</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              <div className={styles.summaryRow}>
                <span>Доставка</span>
                <span>
                  {deliveryPrice === 0 ? (
                    <span className={styles.freePrice}>Безкоштовно</span>
                  ) : (
                    formatPrice(deliveryPrice)
                  )}
                </span>
              </div>
              <div className={`${styles.summaryRow} ${styles.summaryTotal}`}>
                <span>Разом</span>
                <span>{formatPrice(total)}</span>
              </div>
            </div>

            {/* Trust badges */}
            <div className={styles.trustRow}>
              <div className={styles.trustBadge}>
                <span>🔒</span>
                <span>Захищена оплата</span>
              </div>
              <div className={styles.trustBadge}>
                <span>↩️</span>
                <span>Повернення протягом 14 днів</span>
              </div>
              <div className={styles.trustBadge}>
                <span>📦</span>
                <span>Акуратне пакування фігурок</span>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}