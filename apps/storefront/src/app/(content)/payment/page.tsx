'use client';

import { useState } from 'react';
import Link from 'next/link';
import s from './PaymentPage.module.css';

/* ─── Types ─────────────────────────────── */
interface OrderItem {
  id: string;
  series: string;
  name: string;
  scale: string;
  emoji: string;
  qty: number;
  price: number;
}

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  country: string;
  city: string;
  address: string;
  apartment: string;
  postalCode: string;
  saveAddress: boolean;
  cardNumber: string;
  cardName: string;
  cardExpiry: string;
  cardCvv: string;
  saveCard: boolean;
  agreeTerms: boolean;
}

/* ─── Mock data ──────────────────────────── */
const MOCK_ITEMS: OrderItem[] = [
  {
    id: '1',
    series: 'Sword Art Online',
    name: 'Asuna Yuuki — Wedding Ver.',
    scale: '1/7',
    emoji: '🗡️',
    qty: 1,
    price: 148.99,
  },
  {
    id: '2',
    series: 'Re:Zero',
    name: 'Rem — Maid Ver. Limited',
    scale: '1/6',
    emoji: '🎀',
    qty: 1,
    price: 169.00,
  },
  {
    id: '3',
    series: 'Spy × Family',
    name: 'Anya Forger — Heh Face Ver.',
    scale: '1/8',
    emoji: '🥜',
    qty: 2,
    price: 89.50,
  },
];

const SAVED_CARDS = [
  { id: 'c1', net: '💳', num: '**** **** **** 4242', exp: '09/27', isDefault: true },
  { id: 'c2', net: '💳', num: '**** **** **** 1337', exp: '12/25', isDefault: false },
];

type ShippingId = 'standard' | 'express' | 'overnight';
const SHIPPING: { id: ShippingId; name: string; desc: string; price: number; badge?: string }[] = [
  { id: 'standard', name: 'Standard Shipping', desc: '7–14 business days', price: 0, badge: 'Free' },
  { id: 'express', name: 'Express Shipping',  desc: '3–5 business days',  price: 14.99 },
  { id: 'overnight', name: 'Overnight',        desc: 'Next business day',  price: 29.99, badge: 'Fastest' },
];

type PayMethod = 'card' | 'paypal' | 'crypto';

/* ─── Helpers ────────────────────────────── */
function generateOrderId(): string {
  return 'SKF-' + Math.random().toString(36).toUpperCase().slice(2, 8);
}

/* ─── Component ──────────────────────────── */
export default function PaymentPage() {
  /* State */
  const [shipping, setShipping] = useState<ShippingId>('standard');
  const [payMethod, setPayMethod] = useState<PayMethod>('card');
  const [savedCardId, setSavedCardId] = useState<string>('c1');
  const [showNewCard, setShowNewCard] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [promoApplied, setPromoApplied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [orderId] = useState(generateOrderId);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});

  const [form, setForm] = useState<FormData>({
    firstName: '', lastName: '', email: '', phone: '',
    country: 'JP', city: '', address: '', apartment: '', postalCode: '',
    saveAddress: true,
    cardNumber: '', cardName: '', cardExpiry: '', cardCvv: '',
    saveCard: false,
    agreeTerms: false,
  });

  /* Derived totals */
  const subtotal = MOCK_ITEMS.reduce((sum, i) => sum + i.price * i.qty, 0);
  const shippingCost = SHIPPING.find(s => s.id === shipping)?.price ?? 0;
  const discount = promoApplied ? subtotal * 0.1 : 0;
  const total = subtotal + shippingCost - discount;

  /* Handlers */
  const setField = <K extends keyof FormData>(key: K, val: FormData[K]) => {
    setForm(prev => ({ ...prev, [key]: val }));
    if (errors[key]) setErrors(prev => ({ ...prev, [key]: undefined }));
  };

  const applyPromo = () => {
    if (promoCode.trim().toUpperCase() === 'MAID10') setPromoApplied(true);
  };

  const validate = (): boolean => {
    const e: Partial<Record<keyof FormData, string>> = {};
    if (!form.firstName.trim()) e.firstName = 'Required';
    if (!form.lastName.trim()) e.lastName = 'Required';
    if (!form.email.trim() || !form.email.includes('@')) e.email = 'Valid email required';
    if (!form.address.trim()) e.address = 'Required';
    if (!form.city.trim()) e.city = 'Required';
    if (!form.postalCode.trim()) e.postalCode = 'Required';
    if (!form.agreeTerms) e.agreeTerms = 'Please accept to continue';
    if (showNewCard || payMethod === 'card') {
      if (!form.cardNumber.trim()) e.cardNumber = 'Required';
      if (!form.cardExpiry.trim()) e.cardExpiry = 'Required';
      if (!form.cardCvv.trim()) e.cardCvv = 'Required';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    await new Promise(r => setTimeout(r, 1800));
    setLoading(false);
    setConfirmed(true);
  };

  const fmtPrice = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

  /* ── Render ─────────────────────────────── */
  return (
    <div className={s.page}>
      <div className={s.inner}>

        {/* Breadcrumb */}
        <nav className={s.breadcrumb}>
          <Link href="/" className={s.breadcrumbItem}>Home</Link>
          <span className={s.breadcrumbSep}>›</span>
          <Link href="/cart" className={s.breadcrumbItem}>Cart</Link>
          <span className={s.breadcrumbSep}>›</span>
          <span className={s.breadcrumbCurrent}>Checkout</span>
        </nav>

        {/* Page heading */}
        <div className={s.pageHead}>
          <div className={s.pageEyebrow}>お支払い</div>
          <h1 className={s.pageTitle}>
            Secure <span className={s.pageTitleAccent}>Checkout</span>
          </h1>
        </div>

        {/* Progress */}
        <div className={s.steps}>
          <div className={`${s.step} ${s.stepDone}`}>
            <div className={s.stepNum}>✓</div>
            <span className={s.stepLabel}>Cart</span>
          </div>
          <div className={s.stepLine} />
          <div className={`${s.step} ${s.stepActive}`}>
            <div className={s.stepNum}>2</div>
            <span className={s.stepLabel}>Checkout</span>
          </div>
          <div className={s.stepLine} />
          <div className={s.step}>
            <div className={s.stepNum}>3</div>
            <span className={s.stepLabel}>Confirm</span>
          </div>
        </div>

        {/* Main grid */}
        <div className={s.grid}>

          {/* ── Form column ── */}
          <div className={s.formCol}>

            {/* Shipping address */}
            <div className={s.card}>
              <div className={s.cardHeader}>
                <div className={s.cardHeaderLeft}>
                  <div className={s.cardIcon}>📦</div>
                  <div>
                    <div className={s.cardTitle}>Shipping Address</div>
                    <div className={s.cardSubtitle}>Where should we send your figures?</div>
                  </div>
                </div>
              </div>
              <div className={s.cardBody}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div className={s.fieldRow}>
                    <div className={s.field}>
                      <label className={`${s.label} ${s.labelRequired}`}>First Name</label>
                      <input
                        className={`${s.input} ${errors.firstName ? s.inputError : ''}`}
                        placeholder="Sakura"
                        value={form.firstName}
                        onChange={e => setField('firstName', e.target.value)}
                      />
                      {errors.firstName && <span className={s.fieldError}>⚠ {errors.firstName}</span>}
                    </div>
                    <div className={s.field}>
                      <label className={`${s.label} ${s.labelRequired}`}>Last Name</label>
                      <input
                        className={`${s.input} ${errors.lastName ? s.inputError : ''}`}
                        placeholder="Kinomoto"
                        value={form.lastName}
                        onChange={e => setField('lastName', e.target.value)}
                      />
                      {errors.lastName && <span className={s.fieldError}>⚠ {errors.lastName}</span>}
                    </div>
                  </div>

                  <div className={s.fieldRow}>
                    <div className={s.field}>
                      <label className={`${s.label} ${s.labelRequired}`}>Email</label>
                      <input
                        className={`${s.input} ${errors.email ? s.inputError : ''}`}
                        type="email"
                        placeholder="sakura@cardcaptor.jp"
                        value={form.email}
                        onChange={e => setField('email', e.target.value)}
                      />
                      {errors.email && <span className={s.fieldError}>⚠ {errors.email}</span>}
                    </div>
                    <div className={s.field}>
                      <label className={s.label}>Phone</label>
                      <input
                        className={s.input}
                        type="tel"
                        placeholder="+81 90-xxxx-xxxx"
                        value={form.phone}
                        onChange={e => setField('phone', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className={s.field}>
                    <label className={`${s.label} ${s.labelRequired}`}>Country / Region</label>
                    <select
                      className={s.select}
                      value={form.country}
                      onChange={e => setField('country', e.target.value)}
                    >
                      <option value="JP">🇯🇵 Japan</option>
                      <option value="US">🇺🇸 United States</option>
                      <option value="DE">🇩🇪 Germany</option>
                      <option value="FR">🇫🇷 France</option>
                      <option value="GB">🇬🇧 United Kingdom</option>
                      <option value="UA">🇺🇦 Ukraine</option>
                      <option value="CA">🇨🇦 Canada</option>
                      <option value="AU">🇦🇺 Australia</option>
                      <option value="SG">🇸🇬 Singapore</option>
                    </select>
                  </div>

                  <div className={s.field}>
                    <label className={`${s.label} ${s.labelRequired}`}>Street Address</label>
                    <input
                      className={`${s.input} ${errors.address ? s.inputError : ''}`}
                      placeholder="1-2-3 Akihabara, Chiyoda-ku"
                      value={form.address}
                      onChange={e => setField('address', e.target.value)}
                    />
                    {errors.address && <span className={s.fieldError}>⚠ {errors.address}</span>}
                  </div>

                  <div className={s.field}>
                    <label className={s.label}>Apartment, Suite, etc.</label>
                    <input
                      className={s.input}
                      placeholder="Floor 3, Unit 301"
                      value={form.apartment}
                      onChange={e => setField('apartment', e.target.value)}
                    />
                  </div>

                  <div className={s.fieldRow}>
                    <div className={s.field}>
                      <label className={`${s.label} ${s.labelRequired}`}>City</label>
                      <input
                        className={`${s.input} ${errors.city ? s.inputError : ''}`}
                        placeholder="Tokyo"
                        value={form.city}
                        onChange={e => setField('city', e.target.value)}
                      />
                      {errors.city && <span className={s.fieldError}>⚠ {errors.city}</span>}
                    </div>
                    <div className={s.field}>
                      <label className={`${s.label} ${s.labelRequired}`}>Postal Code</label>
                      <input
                        className={`${s.input} ${errors.postalCode ? s.inputError : ''}`}
                        placeholder="101-0021"
                        value={form.postalCode}
                        onChange={e => setField('postalCode', e.target.value)}
                      />
                      {errors.postalCode && <span className={s.fieldError}>⚠ {errors.postalCode}</span>}
                    </div>
                  </div>

                  <label className={s.checkRow}>
                    <input
                      type="checkbox"
                      className={s.checkbox}
                      checked={form.saveAddress}
                      onChange={e => setField('saveAddress', e.target.checked)}
                    />
                    <span className={s.checkLabel}>Save this address for future orders</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Shipping method */}
            <div className={s.card}>
              <div className={s.cardHeader}>
                <div className={s.cardHeaderLeft}>
                  <div className={s.cardIcon}>🚚</div>
                  <div>
                    <div className={s.cardTitle}>Shipping Method</div>
                    <div className={s.cardSubtitle}>All figures ship with protective packaging</div>
                  </div>
                </div>
              </div>
              <div className={s.cardBody}>
                <div className={s.shippingOptions}>
                  {SHIPPING.map(opt => (
                    <label
                      key={opt.id}
                      className={`${s.shippingOption} ${shipping === opt.id ? s.shippingOptionActive : ''}`}
                    >
                      <input
                        type="radio"
                        name="shipping"
                        checked={shipping === opt.id}
                        onChange={() => setShipping(opt.id)}
                      />
                      <div className={s.shippingOptionInfo}>
                        <div className={s.shippingOptionName}>
                          {opt.name}
                          {opt.badge && (
                            <span className={s.shippingOptionBadge}>{opt.badge}</span>
                          )}
                        </div>
                        <div className={s.shippingOptionDesc}>{opt.desc}</div>
                      </div>
                      <div className={`${s.shippingOptionPrice} ${opt.price === 0 ? s.shippingOptionPriceFree : ''}`}>
                        {opt.price === 0 ? 'Free' : fmtPrice(opt.price)}
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Payment */}
            <div className={s.card}>
              <div className={s.cardHeader}>
                <div className={s.cardHeaderLeft}>
                  <div className={s.cardIcon}>💳</div>
                  <div>
                    <div className={s.cardTitle}>Payment</div>
                    <div className={s.cardSubtitle}>SSL encrypted · PCI DSS compliant</div>
                  </div>
                </div>
              </div>
              <div className={s.cardBody}>

                {/* Method tabs */}
                <div className={s.payTabs}>
                  {([
                    { id: 'card' as PayMethod, icon: '💳', label: 'Card' },
                    { id: 'paypal' as PayMethod, icon: '🅿️', label: 'PayPal' },
                    { id: 'crypto' as PayMethod, icon: '₿', label: 'Crypto' },
                  ]).map(tab => (
                    <button
                      key={tab.id}
                      className={`${s.payTab} ${payMethod === tab.id ? s.payTabActive : ''}`}
                      onClick={() => setPayMethod(tab.id)}
                    >
                      <span className={s.payTabIcon}>{tab.icon}</span>
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Card payment */}
                {payMethod === 'card' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {/* Saved cards */}
                    <div className={s.savedCards}>
                      {SAVED_CARDS.map(card => (
                        <label
                          key={card.id}
                          className={`${s.savedCard} ${savedCardId === card.id && !showNewCard ? s.savedCardActive : ''}`}
                          onClick={() => setShowNewCard(false)}
                        >
                          <input
                            type="radio"
                            name="savedCard"
                            checked={savedCardId === card.id && !showNewCard}
                            onChange={() => { setSavedCardId(card.id); setShowNewCard(false); }}
                          />
                          <span className={s.savedCardNet}>{card.net}</span>
                          <div className={s.savedCardInfo}>
                            <div className={s.savedCardNum}>{card.num}</div>
                            <div className={s.savedCardExp}>Expires {card.exp}</div>
                          </div>
                          {card.isDefault && <span className={s.savedCardDefault}>Default</span>}
                        </label>
                      ))}
                    </div>

                    <button className={s.newCardToggle} onClick={() => setShowNewCard(v => !v)}>
                      {showNewCard ? '↩ Use saved card' : '+ Add new card'}
                    </button>

                    {/* New card fields */}
                    {showNewCard && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        <div className={s.field}>
                          <label className={`${s.label} ${s.labelRequired}`}>Card Number</label>
                          <div className={s.cardInputWrap}>
                            <input
                              className={`${s.input} ${errors.cardNumber ? s.inputError : ''}`}
                              placeholder="1234 5678 9012 3456"
                              value={form.cardNumber}
                              maxLength={19}
                              onChange={e => {
                                const raw = e.target.value.replace(/\D/g, '');
                                const fmt = raw.match(/.{1,4}/g)?.join(' ') ?? raw;
                                setField('cardNumber', fmt);
                              }}
                            />
                            <div className={s.cardInputIcon}>
                              <span className={s.cardNetworkBadge}>💳</span>
                            </div>
                          </div>
                          {errors.cardNumber && <span className={s.fieldError}>⚠ {errors.cardNumber}</span>}
                        </div>

                        <div className={s.field}>
                          <label className={`${s.label} ${s.labelRequired}`}>Cardholder Name</label>
                          <input
                            className={`${s.input} ${errors.cardName ? s.inputError : ''}`}
                            placeholder="SAKURA KINOMOTO"
                            value={form.cardName}
                            onChange={e => setField('cardName', e.target.value.toUpperCase())}
                          />
                        </div>

                        <div className={s.fieldRow}>
                          <div className={s.field}>
                            <label className={`${s.label} ${s.labelRequired}`}>Expiry</label>
                            <input
                              className={`${s.input} ${errors.cardExpiry ? s.inputError : ''}`}
                              placeholder="MM / YY"
                              value={form.cardExpiry}
                              maxLength={7}
                              onChange={e => {
                                const raw = e.target.value.replace(/\D/g, '');
                                const fmt = raw.length > 2
                                  ? raw.slice(0, 2) + ' / ' + raw.slice(2, 4)
                                  : raw;
                                setField('cardExpiry', fmt);
                              }}
                            />
                            {errors.cardExpiry && <span className={s.fieldError}>⚠ {errors.cardExpiry}</span>}
                          </div>
                          <div className={s.field}>
                            <label className={`${s.label} ${s.labelRequired}`}>CVV</label>
                            <input
                              className={`${s.input} ${errors.cardCvv ? s.inputError : ''}`}
                              placeholder="123"
                              type="password"
                              maxLength={4}
                              value={form.cardCvv}
                              onChange={e => setField('cardCvv', e.target.value.replace(/\D/g, ''))}
                            />
                            {errors.cardCvv && <span className={s.fieldError}>⚠ {errors.cardCvv}</span>}
                          </div>
                        </div>

                        <label className={s.checkRow}>
                          <input
                            type="checkbox"
                            className={s.checkbox}
                            checked={form.saveCard}
                            onChange={e => setField('saveCard', e.target.checked)}
                          />
                          <span className={s.checkLabel}>Save card for future purchases</span>
                        </label>
                      </div>
                    )}
                  </div>
                )}

                {/* PayPal */}
                {payMethod === 'paypal' && (
                  <div style={{ textAlign: 'center', padding: '24px 0' }}>
                    <div style={{ fontSize: 48, marginBottom: 12 }}>🅿️</div>
                    <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                      You&apos;ll be redirected to PayPal to complete your purchase securely.
                    </p>
                  </div>
                )}

                {/* Crypto */}
                {payMethod === 'crypto' && (
                  <div style={{ textAlign: 'center', padding: '24px 0' }}>
                    <div style={{ fontSize: 48, marginBottom: 12 }}>₿</div>
                    <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                      Pay with BTC, ETH, or USDC. A wallet QR code will be generated after review.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Terms */}
            <div className={s.card}>
              <div className={s.cardBody}>
                <label className={s.checkRow}>
                  <input
                    type="checkbox"
                    className={s.checkbox}
                    checked={form.agreeTerms}
                    onChange={e => setField('agreeTerms', e.target.checked)}
                  />
                  <span className={s.checkLabel}>
                    I agree to the{' '}
                    <a href="/terms" className={s.checkLink}>Terms of Service</a>
                    {' '}and{' '}
                    <a href="/privacy" className={s.checkLink}>Privacy Policy</a>.
                    I understand that all figures are authentic and ship from Japan.
                  </span>
                </label>
                {errors.agreeTerms && (
                  <p style={{ fontSize: 11, color: 'var(--deep-rose)', marginTop: 8 }}>
                    ⚠ {errors.agreeTerms}
                  </p>
                )}
              </div>
            </div>

          </div>

          {/* ── Sidebar ── */}
          <div className={s.sidebar}>

            <div className={s.summaryCard}>
              {/* Header */}
              <div className={s.summaryHeader}>
                <span className={s.summaryTitle}>Your Order</span>
                <span className={s.summaryCount}>
                  {MOCK_ITEMS.reduce((s, i) => s + i.qty, 0)} items
                </span>
              </div>

              {/* Lace decoration */}
              <div className={s.laceBar} />

              {/* Items */}
              <div className={s.orderItems}>
                {MOCK_ITEMS.map(item => (
                  <div key={item.id} className={s.orderItem}>
                    <div className={s.orderItemImg}>
                      {item.emoji}
                      {item.qty > 1 && (
                        <span className={s.orderItemQty}>{item.qty}</span>
                      )}
                    </div>
                    <div className={s.orderItemInfo}>
                      <div className={s.orderItemSeries}>{item.series}</div>
                      <div className={s.orderItemName}>{item.name}</div>
                      <div className={s.orderItemMeta}>Scale {item.scale} · Qty {item.qty}</div>
                    </div>
                    <div className={s.orderItemPrice}>
                      {fmtPrice(item.price * item.qty)}
                    </div>
                  </div>
                ))}
              </div>

              {/* Promo code */}
              <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border-soft)' }}>
                {promoApplied ? (
                  <div className={s.promoApplied}>
                    <span className={s.promoAppliedIcon}>✅</span>
                    <span>Code <strong>MAID10</strong> — 10% off applied!</span>
                    <button
                      className={s.promoRemove}
                      onClick={() => { setPromoApplied(false); setPromoCode(''); }}
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div className={s.promoRow}>
                    <input
                      className={s.promoInput}
                      placeholder="Promo code (try MAID10)"
                      value={promoCode}
                      onChange={e => setPromoCode(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && applyPromo()}
                    />
                    <button className={s.promoBtn} onClick={applyPromo}>Apply</button>
                  </div>
                )}
              </div>

              {/* Totals */}
              <div className={s.orderTotals}>
                <div className={s.totalRow}>
                  <span className={s.totalLabel}>Subtotal</span>
                  <span>{fmtPrice(subtotal)}</span>
                </div>
                <div className={s.totalRow}>
                  <span className={s.totalLabel}>Shipping</span>
                  <span>{shippingCost === 0 ? 'Free' : fmtPrice(shippingCost)}</span>
                </div>
                {promoApplied && (
                  <div className={`${s.totalRow} ${s.totalRowDiscount}`}>
                    <span className={s.totalLabel}>
                      Discount
                      <span className={s.totalBadge}>MAID10</span>
                    </span>
                    <span>−{fmtPrice(discount)}</span>
                  </div>
                )}
                <div className={`${s.totalRow} ${s.totalRowBold}`}>
                  <span>Total</span>
                  <span>{fmtPrice(total)}</span>
                </div>
              </div>

              {/* Security badges */}
              <div className={s.securityRow}>
                <div className={s.securityBadge}><span>🔒</span> SSL</div>
                <div className={s.securityBadge}><span>✅</span> PCI DSS</div>
                <div className={s.securityBadge}><span>🛡️</span> Buyer Protection</div>
              </div>

              {/* Submit */}
              <div className={s.submitWrap}>
                <button
                  className={`${s.submitBtn} ${loading ? s.submitBtnLoading : ''}`}
                  onClick={handleSubmit}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className={s.submitSpinner} />
                      Processing…
                    </>
                  ) : (
                    <>
                      🎀 Place Order · {fmtPrice(total)}
                    </>
                  )}
                </button>
              </div>
              <p className={s.submitSubtext}>
                🔒 Your payment is encrypted and secure
              </p>
            </div>

            {/* Trust */}
            <div className={s.trustCard}>
              {[
                {
                  icon: '📦',
                  title: 'Safe Packaging',
                  text: 'Every figure ships in custom foam-lined boxes to prevent damage.',
                },
                {
                  icon: '✅',
                  title: '100% Authentic',
                  text: 'All items are officially licensed and sourced directly from Japan.',
                },
                {
                  icon: '↩',
                  title: 'Easy Returns',
                  text: '14-day returns on sealed items. No questions asked.',
                },
                {
                  icon: '🎌',
                  title: 'Ships from Japan',
                  text: 'Orders dispatched within 1–2 business days from Akihabara.',
                },
              ].map((item, i) => (
                <div key={i} className={s.trustItem}>
                  <div className={s.trustIcon}>{item.icon}</div>
                  <div className={s.trustInfo}>
                    <div className={s.trustTitle}>{item.title}</div>
                    <div className={s.trustText}>{item.text}</div>
                  </div>
                </div>
              ))}
            </div>

          </div>
        </div>
      </div>

      {/* ── Confirmation modal ── */}
      {confirmed && (
        <div className={s.confirmOverlay}>
          <div className={s.confirmModal}>
            <span className={s.confirmEmoji}>🎀</span>
            <h2 className={s.confirmTitle}>
              Arigatou, <span className={s.confirmTitleAccent}>Master!</span>
            </h2>
            <p className={s.confirmText}>
              Your order has been placed successfully. We&apos;ll send a confirmation
              to <strong>{form.email || 'your email'}</strong> shortly.
            </p>
            <div className={s.confirmOrderNum}>Order {orderId}</div>
            <div className={s.confirmBtns}>
              <Link href="/orders" className={s.confirmBtnPrimary}>
                📋 View Order
              </Link>
              <Link href="/" className={s.confirmBtnSecondary}>
                Continue shopping →
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}