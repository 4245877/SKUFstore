"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useMemo, useState } from "react";

import {
  createOrder,
  resolveMediaUrl,
  type OrderRecord,
} from "../../../lib/api";

import {
  clearCart,
  formatPrice,
  getCartItemsCount,
  getCartSubtotal,
  getDeliveryPrice,
  readCart,
  writeLastOrder,
  type CartItem,
  type CheckoutFormValues,
  type DeliveryMethod,
  type PaymentMethod,
  type StoreOrder,
} from "../../../lib/demo-store";

import { NovaPoshtaPicker } from "./NovaPoshtaPicker";
import styles from "./CheckoutPage.module.css";

const INITIAL_FORM: CheckoutFormValues = {
  fullName: "",
  email: "",
  phone: "",
  city: "",
  address: "",
  deliveryMethod: "nova-poshta-branch",
  paymentMethod: "partial-prepayment",
  comment: "",
};

const DELIVERY_OPTIONS: Array<{
  value: DeliveryMethod;
  label: string;
  hint: string;
}> = [
  {
    value: "nova-poshta-branch",
    label: "Нова Пошта — відділення або поштомат",
    hint: "Почніть вводити місто, номер або адресу та оберіть варіант зі списку.",
  },
  {
    value: "ukrposhta-branch",
    label: "Укрпошта — відділення",
    hint: "Вкажіть індекс або адресу відділення.",
  },
  {
    value: "courier",
    label: "Кур'єрська доставка",
    hint: "Вкажіть вулицю, будинок і квартиру, якщо вона є.",
  },
  {
    value: "pickup",
    label: "Самовивіз",
    hint: "Місце й час самовивозу узгодимо після заявки.",
  },
];

const PAYMENT_OPTIONS: Array<{
  value: PaymentMethod;
  label: string;
  hint: string;
}> = [
  {
    value: "partial-prepayment",
    label: "Передплата 60%",
    hint: "Реквізити надішлемо після підтвердження замовлення.",
  },
  {
    value: "full-prepayment",
    label: "Повна передплата",
    hint: "Оплата проводиться після узгодження деталей із магазином.",
  },
];

function toStoredOrder(
  order: OrderRecord,
  cartItems: CartItem[],
  customer: CheckoutFormValues,
): StoreOrder {
  return {
    id: order.id,
    number: order.number,
    createdAt: order.createdAt,
    status: order.status,
    items: cartItems,
    customer,
    subtotal: order.subtotal,
    deliveryPrice: order.deliveryPrice,
    total: order.total,
  };
}

function getErrorMessage(error: unknown) {
  if (!(error instanceof Error)) {
    return "Не вдалося створити замовлення. Спробуйте ще раз.";
  }

  if (
    error.message.includes("INVALID_ORDER_ITEMS") ||
    error.message.includes("could not be resolved")
  ) {
    return "Один із товарів більше недоступний. Поверніться до кошика та додайте його знову.";
  }

  if (error.message.includes("Invalid order payload")) {
    return "Перевірте заповнені дані та повторіть спробу.";
  }

  if (error.message.includes("Failed to fetch")) {
    return "Немає зв'язку із сервером. Перевірте інтернет і повторіть спробу.";
  }

  return error.message || "Не вдалося створити замовлення. Спробуйте ще раз.";
}

function validateForm(values: CheckoutFormValues, items: CartItem[]) {
  if (items.length === 0) {
    return "Кошик порожній.";
  }

  if (!values.fullName.trim()) {
    return "Вкажіть ім'я та прізвище.";
  }

  if (!values.email.trim()) {
    return "Вкажіть email.";
  }

  if (!/^\S+@\S+\.\S+$/.test(values.email.trim())) {
    return "Перевірте правильність email.";
  }

  if (values.phone.replace(/\D/g, "").length < 10) {
    return "Перевірте номер телефону.";
  }

  if (!values.city.trim()) {
    return "Вкажіть населений пункт.";
  }

  if (!values.address.trim()) {
    return "Вкажіть адресу або відділення.";
  }

  const missingVariant = items.some((item) => !item.id?.trim());

  if (missingVariant) {
    return "У кошику є товар без варіанта. Видаліть його та додайте знову.";
  }

  return null;
}

export default function CheckoutPage() {
  const router = useRouter();

  const [items, setItems] = useState<CartItem[]>([]);
  const [form, setForm] = useState<CheckoutFormValues>(INITIAL_FORM);
  const [isReady, setIsReady] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setItems(readCart());
    setIsReady(true);
  }, []);

  const currency = items[0]?.currency || "UAH";

  const subtotal = useMemo(() => getCartSubtotal(items), [items]);

  const deliveryPrice = useMemo(
    () => getDeliveryPrice(form.deliveryMethod, items),
    [form.deliveryMethod, items],
  );

  const total = subtotal + deliveryPrice;
  const itemsCount = getCartItemsCount(items);

  const selectedDelivery = DELIVERY_OPTIONS.find(
    (option) => option.value === form.deliveryMethod,
  );

  function setField<K extends keyof CheckoutFormValues>(
    field: K,
    value: CheckoutFormValues[K],
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));

    setErrorMessage(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const validationError = validateForm(form, items);

    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const normalizedCustomer: CheckoutFormValues = {
      fullName: form.fullName.trim(),
      email: form.email.trim().toLowerCase(),
      phone: form.phone.trim(),
      city: form.city.trim(),
      address: form.address.trim(),
      deliveryMethod: form.deliveryMethod,
      paymentMethod: form.paymentMethod,
      comment: form.comment.trim(),
    };

    try {
      const response = await createOrder({
        fullName: normalizedCustomer.fullName,
        email: normalizedCustomer.email,
        phone: normalizedCustomer.phone,
        city: normalizedCustomer.city,
        address: normalizedCustomer.address,
        deliveryMethod: normalizedCustomer.deliveryMethod,
        paymentMethod: normalizedCustomer.paymentMethod,
        currency,
        comment: normalizedCustomer.comment || undefined,

        items: items.map((item) => ({
          variantId: item.id,
          productId: item.productId,
          qty: item.quantity,
        })),
      });

      const storedOrder = toStoredOrder(
        response.order,
        items,
        normalizedCustomer,
      );

      writeLastOrder(storedOrder);
      clearCart();

      const search = new URLSearchParams({
        id: response.order.id,
        order: response.order.number,
      });

      router.push(`/checkout/success/?${search.toString()}`);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
      setIsSubmitting(false);
    }
  }

  if (!isReady) {
    return (
      <main className={styles.page}>
        <div className={styles.container}>
          <p className={styles.loading}>Завантаження оформлення…</p>
        </div>
      </main>
    );
  }

  if (items.length === 0) {
    return (
      <main className={styles.page}>
        <div className={styles.container}>
          <nav className={styles.breadcrumb} aria-label="Навігація по сторінці">
            <Link href="/">Головна</Link>
            <span>/</span>
            <Link href="/cart">Кошик</Link>
            <span>/</span>
            <span>Оформлення</span>
          </nav>

          <section className={styles.emptyCard}>
            <span className={styles.emptyIcon} aria-hidden="true">
              🛒
            </span>

            <h1>Кошик порожній</h1>

            <p>Додайте товар до кошика, щоб перейти до оформлення.</p>

            <Link href="/catalog" className={styles.primaryLink}>
              Перейти до каталогу
            </Link>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <nav className={styles.breadcrumb} aria-label="Навігація по сторінці">
          <Link href="/">Головна</Link>
          <span>/</span>
          <Link href="/cart">Кошик</Link>
          <span>/</span>
          <span>Оформлення</span>
        </nav>

        <header className={styles.header}>
          <p className={styles.eyebrow}>Оформлення замовлення</p>
          <h1>Контакти та доставка</h1>

          <p>
            Заповніть дані. Після створення заявки ми зв'яжемося з вами для
            підтвердження та оплати.
          </p>
        </header>

        <form className={styles.layout} onSubmit={handleSubmit}>
          <div className={styles.formColumn}>
            <section className={styles.card}>
              <div className={styles.cardHeader}>
                <span className={styles.step}>1</span>

                <div>
                  <h2>Контактні дані</h2>
                  <p>Використаємо їх лише для зв'язку щодо замовлення.</p>
                </div>
              </div>

              <div className={styles.fieldsGrid}>
                <label className={styles.fieldFull}>
                  <span>Ім'я та прізвище *</span>

                  <input
                    type="text"
                    value={form.fullName}
                    onChange={(event) =>
                      setField("fullName", event.target.value)
                    }
                    autoComplete="name"
                    required
                    maxLength={120}
                    placeholder="Наприклад, Михайло Петренко"
                  />
                </label>

                <label>
                  <span>Телефон *</span>

                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(event) => setField("phone", event.target.value)}
                    autoComplete="tel"
                    inputMode="tel"
                    required
                    maxLength={30}
                    placeholder="+380 00 000 00 00"
                  />
                </label>

                <label>
                  <span>Email *</span>

                  <input
                    type="email"
                    value={form.email}
                    onChange={(event) => setField("email", event.target.value)}
                    autoComplete="email"
                    required
                    maxLength={160}
                    placeholder="name@example.com"
                  />
                </label>
              </div>
            </section>

            <section className={styles.card}>
              <div className={styles.cardHeader}>
                <span className={styles.step}>2</span>

                <div>
                  <h2>Спосіб доставки</h2>
                  <p>Остаточні деталі можна уточнити після створення заявки.</p>
                </div>
              </div>

              <div className={styles.optionList}>
                {DELIVERY_OPTIONS.map((option) => (
                  <label
                    key={option.value}
                    className={`${styles.optionCard} ${
                      form.deliveryMethod === option.value
                        ? styles.optionCardActive
                        : ""
                    }`}
                  >
                    <input
                      type="radio"
                      name="deliveryMethod"
                      value={option.value}
                      checked={form.deliveryMethod === option.value}
                      onChange={() =>
                        setField("deliveryMethod", option.value)
                      }
                    />

                    <span>
                      <strong>{option.label}</strong>
                      <small>{option.hint}</small>
                    </span>
                  </label>
                ))}
              </div>
              <div className={styles.fieldsGrid}>
                {form.deliveryMethod === "nova-poshta-branch" ? (
                  <NovaPoshtaPicker
                    city={form.city}
                    address={form.address}
                    onCityChange={(value) => setField("city", value)}
                    onAddressChange={(value) => setField("address", value)}
                  />
                ) : (
                  <>
                    <label>
                      <span>Населений пункт *</span>
                      <input
                        type="text"
                        value={form.city}
                        onChange={(event) =>
                          setField("city", event.target.value)
                        }
                        autoComplete="address-level2"
                        required
                        maxLength={120}
                        placeholder="Київ"
                      />
                    </label>
                    <label>
                      <span>Адреса або відділення *</span>
                      <input
                        type="text"
                        value={form.address}
                        onChange={(event) =>
                          setField("address", event.target.value)
                        }
                        autoComplete="street-address"
                        required
                        maxLength={240}
                        placeholder={
                          form.deliveryMethod === "pickup"
                            ? "Наприклад, узгодити з менеджером"
                            : "Наприклад, відділення №12"
                        }
                      />
                    </label>
                  </>
                )}
              </div>

              {selectedDelivery ? (
                <p className={styles.fieldHint}>{selectedDelivery.hint}</p>
              ) : null}
            </section>

            <section className={styles.card}>
              <div className={styles.cardHeader}>
                <span className={styles.step}>3</span>

                <div>
                  <h2>Спосіб оплати</h2>
                  <p>Оплата на сайті зараз не списується автоматично.</p>
                </div>
              </div>

              <div className={styles.optionList}>
                {PAYMENT_OPTIONS.map((option) => (
                  <label
                    key={option.value}
                    className={`${styles.optionCard} ${
                      form.paymentMethod === option.value
                        ? styles.optionCardActive
                        : ""
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value={option.value}
                      checked={form.paymentMethod === option.value}
                      onChange={() =>
                        setField("paymentMethod", option.value)
                      }
                    />

                    <span>
                      <strong>{option.label}</strong>
                      <small>{option.hint}</small>
                    </span>
                  </label>
                ))}
              </div>

              <label className={styles.commentField}>
                <span>Коментар до замовлення</span>

                <textarea
                  value={form.comment}
                  onChange={(event) =>
                    setField("comment", event.target.value)
                  }
                  rows={4}
                  maxLength={1000}
                  placeholder="Побажання щодо доставки, пакування або зв'язку"
                />
              </label>
            </section>
          </div>

          <aside className={styles.summaryColumn}>
            <div className={styles.summaryCard}>
              <div className={styles.summaryHeader}>
                <div>
                  <h2>Ваше замовлення</h2>
                  <p>{itemsCount} товарів у кошику</p>
                </div>

                <Link href="/cart">Змінити</Link>
              </div>

              <div className={styles.itemsList}>
                {items.map((item) => {
                  const imageUrl = resolveMediaUrl(item.imageUrl);

                  return (
                    <div key={item.id} className={styles.orderItem}>
                      <div className={styles.itemImage}>
                        {imageUrl ? (
                          <img
                            src={imageUrl}
                            alt={item.imageAlt || item.name}
                          />
                        ) : (
                          <span>Фото</span>
                        )}
                      </div>

                      <div className={styles.itemInfo}>
                        <Link href={`/product/${item.slug}`}>
                          {item.name}
                        </Link>

                        {item.subtitle ? (
                          <small>{item.subtitle}</small>
                        ) : null}

                        <span>Кількість: {item.quantity}</span>
                      </div>

                      <strong>
                        {formatPrice(
                          item.price * item.quantity,
                          currency,
                        )}
                      </strong>
                    </div>
                  );
                })}
              </div>

              <div className={styles.totals}>
                <div>
                  <span>Товари</span>
                  <strong>{formatPrice(subtotal, currency)}</strong>
                </div>

                <div>
                  <span>Доставка</span>

                  <strong>
                    {deliveryPrice === 0
                      ? "Безкоштовно"
                      : formatPrice(deliveryPrice, currency)}
                  </strong>
                </div>

                <div className={styles.grandTotal}>
                  <span>Разом</span>
                  <strong>{formatPrice(total, currency)}</strong>
                </div>
              </div>

              {errorMessage ? (
                <div className={styles.errorBox} role="alert">
                  {errorMessage}
                </div>
              ) : null}

              <button
                type="submit"
                className={styles.submitButton}
                disabled={isSubmitting}
              >
                {isSubmitting
                  ? "Створюємо замовлення…"
                  : "Підтвердити замовлення"}
              </button>

              <p className={styles.legalNote}>
                Натискаючи кнопку, ви підтверджуєте правильність даних і
                погоджуєтеся з умовами магазину.
              </p>

              <Link href="/cart" className={styles.backLink}>
                ← Повернутися до кошика
              </Link>
            </div>
          </aside>
        </form>
      </div>
    </main>
  );
}
