'use client';
import { presentApiError } from '../../../i18n/api-errors';

import { presentCartItemSubtitle } from '../../../i18n/presentation';
import { useI18n } from '../../../i18n/client';
import type { Translator } from '../../../i18n/translate';
import Link from '../../../i18n/navigation';

import { IconCart } from "../../../components/icons";

import { useRouter } from '../../../i18n/navigation';

import { type FormEvent, useEffect, useState } from "react";

import {

  createOrder,

  resolveMediaUrl,

  type OrderRecord,

} from "../../../lib/api";

import {

  clearCart,

  formatPrice,

  getCartItemsCount,

  readCart,

  subscribeToCartChange,

  writeLastOrder,

  type CartItem,

  type CheckoutFormValues,

  type DeliveryMethod,

  type PaymentMethod,

  type StoreOrder,

} from "../../../lib/demo-store";

import { useCartQuote } from "../../../lib/use-cart-quote";

import { cartOrderItems, orderCartItems } from "../../../lib/cart-lines";
import { readCheckoutDraft, saveCheckoutDraft, clearCheckoutDraft } from "../../../lib/checkout-draft";

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

const DELIVERY_OPTIONS = (t: Translator): Array<{

  value: DeliveryMethod;

  label: string;

  hint: string;

}> => ([

  {

    value: "nova-poshta-branch",

    label: t('shop.novaPoshtaBranchOrParcelLocker'),

    hint: t('shop.startTypingACityBranchNumberOr'),

  },

  {

    value: "ukrposhta-branch",

    label: t('shop.ukrposhtaBranch'),

    hint: t('shop.enterThePostcodeOrBranchAddress'),

  },

  {

    value: "courier",

    label: t('shop.courierDelivery'),

    hint: t('shop.enterTheStreetBuildingNumberAndApartment'),

  },

  {

    value: "pickup",

    label: t('shop.pickup'),

    hint: t('shop.weLlAgreeOnThePickupLocation'),

  },

]);

const PAYMENT_OPTIONS = (t: Translator): Array<{

  value: PaymentMethod;

  label: string;

  hint: string;

}> => ([

  {

    value: "partial-prepayment",

    label: t('content.60AdvancePayment'),

    hint: t('shop.weLlSendPaymentDetailsAfterConfirming'),

  },

  {

    value: "full-prepayment",

    label: t('content.fullAdvancePayment'),

    hint: t('shop.paymentIsMadeAfterTheDetailsAre'),

  },

]);

function toStoredOrder(

  order: OrderRecord,

  customer: CheckoutFormValues,

): StoreOrder {

  return {

    id: order.id,

    number: order.number,

    createdAt: order.createdAt,

    status: order.status,

    items: orderCartItems(order),

    customer,

    subtotal: order.subtotal,

    deliveryPrice: order.deliveryPrice,

    total: order.total,

  };

}

function getErrorMessage(t: Translator, error: unknown) {
  return presentApiError(t, error);
}

function validateForm(t: Translator, values: CheckoutFormValues, items: CartItem[]) {

  if (items.length === 0) {

    return t('shop.yourCartIsEmpty_885');

  }

  if (!values.fullName.trim()) {

    return t('shop.enterYourFirstAndLastName');

  }

  if (!values.email.trim()) {

    return t('shop.enterYourEmail');

  }

  if (!/^\S+@\S+\.\S+$/.test(values.email.trim())) {

    return t('shop.checkYourEmailAddress');

  }

  if (values.phone.replace(/\D/g, "").length < 10) {

    return t('shop.checkYourPhoneNumber');

  }

  if (!values.city.trim()) {

    return t('shop.enterYourCityOrTown');

  }

  if (!values.address.trim()) {

    return t('shop.enterAnAddressOrBranch');

  }

  const missingVariant = items.some((item) => !item.variantId?.trim() || item.configurationIssue);

  if (missingVariant) {

    return t('shop.anItemInYourCartHasNo');

  }

  return null;

}

export default function CheckoutPage() {
  const { locale, t, path } = useI18n();

  const router = useRouter();

  const [cartItems, setItems] = useState<CartItem[]>([]);

  const [form, setForm] = useState<CheckoutFormValues>(INITIAL_FORM);

  const [isReady, setIsReady] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {

    const draft = readCheckoutDraft();
    if (draft) setForm(draft);

    const sync = () => { setItems(readCart()); setIsReady(true); };

    sync();

    return subscribeToCartChange(sync);

  }, []);

  useEffect(() => {
    if (isReady) saveCheckoutDraft(form);
  }, [form, isReady]);

  const pricing = useCartQuote(cartItems, form.deliveryMethod);

  const { items, quote } = pricing;

  const currency = quote?.currency || items[0]?.currency || "UAH";

  const subtotal = quote?.subtotal;

  const deliveryPrice = quote?.deliveryPrice;

  const total = quote?.total;

  const itemsCount = getCartItemsCount(items);

  const selectedDelivery = DELIVERY_OPTIONS(t).find(

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

    if (!quote || isSubmitting) return;

    const validationError = validateForm(t, form, items);

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

        items: cartOrderItems(items),

        quoteToken: quote.quoteToken,

      });

      const storedOrder = toStoredOrder(

        response.order,

        normalizedCustomer,

      );

      clearCheckoutDraft();

      writeLastOrder(storedOrder);

      clearCart();

      const search = new URLSearchParams({

        id: response.order.id,

        order: response.order.number,

      });

      router.push(`/checkout/success/?${search.toString()}`);

    } catch (error) {

      setErrorMessage(getErrorMessage(t, error));

      if ((error as { status?: number }).status === 409) pricing.refresh();

      setIsSubmitting(false);

    }

  }

  if (!isReady) {

    return (

      <main className={styles.page}>

        <div className={styles.container}>

          <p className={styles.loading}>{t('shop.loadingCheckout')}</p>

        </div>

      </main>

    );

  }

  if (items.length === 0) {

    return (

      <main className={styles.page}>

        <div className={styles.container}>

          <nav className={styles.breadcrumb} aria-label={t('shop.pageNavigation')}>

            <Link href="/">{t('account.home')}</Link>

            <span>/</span>

            <Link href="/cart">{t('shop.cart')}</Link>

            <span>/</span>

            <span>{t('shop.checkout_897')}</span>

          </nav>

          <section className={styles.emptyCard}>

            <span className={styles.emptyIcon} aria-hidden="true">

              <IconCart size={40} strokeWidth={1.2} />

            </span>

            <h1>{t('shop.yourCartIsEmpty')}</h1>

            <p>{t('shop.addAProductToYourCartTo')}</p>

            <Link href="/catalog" className={styles.primaryLink}>

              {t('shop.browseCatalog_900')} </Link>

          </section>

        </div>

      </main>

    );

  }

  return (

    <main className={styles.page}>

      <div className={styles.container}>

        <nav className={styles.breadcrumb} aria-label={t('shop.pageNavigation')}>

          <Link href="/">{t('account.home')}</Link>

          <span>/</span>

          <Link href="/cart">{t('shop.cart')}</Link>

          <span>/</span>

          <span>{t('shop.checkout_897')}</span>

        </nav>

        <header className={styles.header}>

          <p className={styles.eyebrow}>{t('shop.checkout_905')}</p>

          <h1>{t('shop.contactDetailsAndDelivery')}</h1>

          <p>

            {t('shop.enterYourDetailsAfterYouSubmitYour')} </p>

        </header>

        <form className={styles.layout} onSubmit={handleSubmit}>

          <div className={styles.formColumn}>

            <section className={styles.card}>

              <div className={styles.cardHeader}>

                <span className={styles.step}>1</span>

                <div>

                  <h2>{t('shop.contactDetails')}</h2>

                  <p>{t('shop.weLlOnlyUseTheseToContact')}</p>

                </div>

              </div>

              <div className={styles.fieldsGrid}>

                <label className={styles.fieldFull}>

                  <span>{t('shop.fullName')}</span>

                  <input

                    type="text"

                    value={form.fullName}

                    onChange={(event) =>

                      setField("fullName", event.target.value)

                    }

                    autoComplete="name"

                    required

                    maxLength={120}

                    placeholder={t('shop.forExampleMykhailoPetrenko')}

                  />

                </label>

                <label>

                  <span>{t('shop.phone')}</span>

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

                  <h2>{t('shop.deliveryMethod')}</h2>

                  <p>{t('shop.finalDetailsCanBeConfirmedAfterYou')}</p>

                </div>

              </div>

              <div className={styles.optionList}>

                {DELIVERY_OPTIONS(t).map((option) => (

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

                      <span>{t('shop.cityOrTown')}</span>

                      <input

                        type="text"

                        value={form.city}

                        onChange={(event) =>

                          setField("city", event.target.value)

                        }

                        autoComplete="address-level2"

                        required

                        maxLength={120}

                        placeholder={t('shop.kyiv')}

                      />

                    </label>

                    <label>

                      <span>{t('shop.addressOrBranch')}</span>

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

                            ? t('shop.forExampleArrangeWithTheStore')

                            : t('shop.forExampleBranchNo12')

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

                  <h2>{t('shop.paymentMethod')}</h2>

                  <p>{t('shop.theWebsiteDoesNotChargeYouAutomatically')}</p>

                </div>

              </div>

              <div className={styles.optionList}>

                {PAYMENT_OPTIONS(t).map((option) => (

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

                <span>{t('shop.orderComment')}</span>

                <textarea

                  value={form.comment}

                  onChange={(event) =>

                    setField("comment", event.target.value)

                  }

                  rows={4}

                  maxLength={1000}

                  placeholder={t('shop.deliveryPackagingOrContactPreferences')}

                />

              </label>

            </section>

          </div>

          <aside className={styles.summaryColumn}>

            <div className={styles.summaryCard}>

              <div className={styles.summaryHeader}>

                <div>

                  <h2>{t('shop.yourOrder')}</h2>

                  <p>{itemsCount} {t('shop.productsInYourCart')}</p>

                </div>

                <Link href="/cart">{t('shop.edit')}</Link>

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

                            loading="lazy"

                            decoding="async"

                          />

                        ) : (

                          <span>{t('shop.photo')}</span>

                        )}

                      </div>

                      <div className={styles.itemInfo}>

                        <Link href={`/product/${item.slug}`}>

                          {item.name === 'Товар кошика' ? t('shop.product') : item.name}

                        </Link>

                        {item.subtitle ? (

                          <small>{presentCartItemSubtitle(t, item)}</small>

                        ) : null}

                        <span>{t('shop.quantity_928')} {item.quantity}</span>

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

                  <span>{t('shop.products_929')}</span>

                  <strong>{subtotal == null ? t('shop.toBeConfirmed') : formatPrice(subtotal, currency)}</strong>

                </div>

                <div>

                  <span>{t('account.delivery')}</span>

                  <strong>

                    {deliveryPrice === 0

                      ? t('shop.free')

                      : deliveryPrice == null ? t('shop.toBeConfirmed') : formatPrice(deliveryPrice, currency)}

                  </strong>

                </div>

                <div className={styles.grandTotal}>

                  <span>{t('shop.total')}</span>

                  <strong>{total == null ? t('shop.toBeConfirmed') : formatPrice(total, currency)}</strong>

                </div>

              </div>

              {pricing.message ? <p role="status">{pricing.message}</p> : null}

              {pricing.error ? <button type="button" onClick={pricing.refresh}>{t('shop.checkAgain')}</button> : null}

              {errorMessage ? (

                <div className={styles.errorBox} role="alert">

                  {errorMessage}

                </div>

              ) : null}

              <button

                type="submit"

                className={styles.submitButton}

                disabled={isSubmitting || !quote}

              >

                {isSubmitting

                  ? t('shop.creatingOrder')

                  : t('shop.confirmOrder')}

              </button>

              <p className={styles.legalNote}>

                {t('shop.byClickingThisButtonYouConfirmThat')} </p>

              {/* Подтверждение до оформления: ст. 13 ч. 2 п. 9 и ч. 3 ЗУ «Про

                  захист прав споживачів» требуют, чтобы порядок расторжения

                  договора был доведён до покупателя и подтверждён. Нажатие

                  кнопки выше и есть это подтверждение, поэтому текст стоит

                  рядом с ней, а не отдельным баннером. */}

              <p className={styles.legalNote}>

                {t('shop.madeToOrderNotice')} {t('shop.returnsNotAvailableShort')}{' '}

                <Link href="/returns">{t('shop.returnTermsLink')}</Link>.

              </p>

              <Link href="/cart" className={styles.backLink}>

                {t('shop.backToCart')} </Link>

            </div>

          </aside>

        </form>

      </div>

    </main>

  );

}
