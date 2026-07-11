export type CartItem = {
  id: string;
  productId?: string;
  slug: string;
  name: string;
  price: number;
  quantity: number;
  currency?: string;
  subtitle?: string;
  series?: string | null;
  imageUrl?: string | null;
  imageAlt?: string | null;
  isAdult?: boolean;
};

export type DeliveryMethod =
  | 'nova-poshta-branch'
  | 'ukrposhta-branch'
  | 'courier'
  | 'pickup';
export type PaymentMethod = 'partial-prepayment' | 'full-prepayment';

export type CheckoutFormValues = {
  fullName: string;
  email: string;
  phone: string;
  city: string;
  address: string;
  deliveryMethod: DeliveryMethod;
  paymentMethod: PaymentMethod;
  comment: string;
};

export type OrderStatus =
  | 'pending'
  | 'paid'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled';

export type StoreOrder = {
  id: string;
  number: string;
  createdAt: string;
  status: OrderStatus;
  items: CartItem[];
  customer: CheckoutFormValues;
  subtotal: number;
  deliveryPrice: number;
  total: number;
};

export type FavoriteSnapshot = {
  productId: string;
  slug: string;
  title: string;
  series?: string | null;
  priceFrom: number;
  currency: string;
  isAdult?: boolean;
  coverImage?: {
    url: string;
    alt: string | null;
  } | null;
  addedAt: string;
};

const CART_KEY = 'skufnya:cart';
const ORDERS_KEY = 'skufnya:orders';
const LAST_ORDER_KEY = 'skufnya:last-order';
const FAVORITES_KEY = 'skufnya:favorites';
const FAVORITES_CHANGED_EVENT = 'skufnya:favorites:changed';
const CART_CHANGED_EVENT = 'skufnya:cart:changed';
export const FREE_DELIVERY_THRESHOLD = 5000;

const dateFormatter = new Intl.DateTimeFormat('uk-UA', {
  day: '2-digit',
  month: 'long',
  year: 'numeric',
});

function hasWindow() {
  return typeof window !== 'undefined';
}

function safeParse<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function generateId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function buildOrderNumber() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const random = Math.floor(1000 + Math.random() * 9000);

  return `SKF-${yyyy}${mm}${dd}-${random}`;
}

const DEFAULT_CUSTOMER: CheckoutFormValues = {
  fullName: 'Михайло П.',
  email: 'demo@skufnya.local',
  phone: '+380 99 123 45 67',
  city: 'Київ',
  address: 'Відділення №12',
  deliveryMethod: 'nova-poshta-branch',
  paymentMethod: 'partial-prepayment',
  comment: '',
};

const DEMO_ORDERS: StoreOrder[] = [
  {
    id: 'demo-order-1',
    number: 'SKF-20260325-4812',
    createdAt: '2026-03-25T14:20:00.000Z',
    status: 'processing',
    items: [
      {
        id: 'demo-item-1',
        slug: 'miku-sakura-ver',
        name: 'Hatsune Miku Sakura Ver.',
        subtitle: 'PVC figure • 1/7 scale',
        price: 2890,
        quantity: 1,
      },
      {
        id: 'demo-item-2',
        slug: 'gojo-mini-stand',
        name: 'Gojo Acrylic Stand',
        subtitle: 'Acrylic merch',
        price: 420,
        quantity: 2,
      },
    ],
    customer: {
      ...DEFAULT_CUSTOMER,
      fullName: 'Михайло Пларов',
      address: 'Нова пошта, відділення №18',
      paymentMethod: 'full-prepayment',
    },
    subtotal: 3730,
    deliveryPrice: 120,
    total: 3850,
  },
  {
    id: 'demo-order-2',
    number: 'SKF-20260318-1504',
    createdAt: '2026-03-18T09:05:00.000Z',
    status: 'delivered',
    items: [
      {
        id: 'demo-item-3',
        slug: 'marin-kitagawa-bunny',
        name: 'Marin Kitagawa Bunny Style',
        subtitle: 'Resin statue',
        price: 4990,
        quantity: 1,
      },
    ],
    customer: {
      ...DEFAULT_CUSTOMER,
      fullName: 'Михайло Пларов',
      address: 'Курʼєрська доставка',
      deliveryMethod: 'courier',
      paymentMethod: 'partial-prepayment',
    },
    subtotal: 4990,
    deliveryPrice: 120,
    total: 5110,
  },
];

function readStoredUserOrders(): StoreOrder[] {
  if (!hasWindow()) return [];

  return safeParse<StoreOrder[]>(window.localStorage.getItem(ORDERS_KEY), []);
}

function writeStoredUserOrders(orders: StoreOrder[]) {
  if (!hasWindow()) return;

  window.localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
}

export function formatPrice(value: number, currency = 'UAH') {
  return new Intl.NumberFormat('uk-UA', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDate(value: string) {
  return dateFormatter.format(new Date(value));
}

export function getStatusLabel(status: OrderStatus) {
  switch (status) {
    case 'pending':
      return 'Очікує підтвердження';
    case 'paid':
      return 'Оплачено';
    case 'processing':
      return 'В роботі';
    case 'shipped':
      return 'Відправлено';
    case 'delivered':
      return 'Доставлено';
    case 'cancelled':
      return 'Скасовано';
    default:
      return 'Невідомо';
  }
}

export function readCart(): CartItem[] {
  if (!hasWindow()) return [];

  return safeParse<CartItem[]>(window.localStorage.getItem(CART_KEY), []);
}

export function writeCart(items: CartItem[]) {
  if (!hasWindow()) return;

  window.localStorage.setItem(CART_KEY, JSON.stringify(items));
  emitCartChanged();
}

export function clearCart() {
  if (!hasWindow()) return;

  window.localStorage.removeItem(CART_KEY);
  emitCartChanged();
}

export function addCartItem(item: CartItem) {
  const nextItems = [...readCart()];
  const normalizedQuantity = Math.max(1, Math.min(99, item.quantity));

  const existingIndex = nextItems.findIndex((entry) => entry.id === item.id);

  if (existingIndex >= 0) {
    const existing = nextItems[existingIndex];
    nextItems[existingIndex] = {
      ...existing,
      ...item,
      quantity: Math.min(99, existing.quantity + normalizedQuantity),
    };
  } else {
    nextItems.unshift({
      ...item,
      quantity: normalizedQuantity,
    });
  }

  writeCart(nextItems);
  return nextItems;
}

export function getCartSubtotal(items: CartItem[]) {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

export function getDeliveryPrice(deliveryMethod: DeliveryMethod, items: CartItem[]) {
  if (items.length === 0) return 0;
  if (deliveryMethod === 'pickup') return 0;

  const subtotal = getCartSubtotal(items);
  if (subtotal >= FREE_DELIVERY_THRESHOLD) return 0;

  return 120;
}

export function updateCartItemQuantity(id: string, quantity: number) {
  const nextItems = readCart()
    .map((item) =>
      item.id === id
        ? {
            ...item,
            quantity: Math.max(1, Math.min(99, quantity)),
          }
        : item,
    )
    .filter((item) => item.quantity > 0);

  writeCart(nextItems);
  return nextItems;
}

export function removeCartItem(id: string) {
  const nextItems = readCart().filter((item) => item.id !== id);
  writeCart(nextItems);
  return nextItems;
}

export function readOrders(): StoreOrder[] {
  const stored = readStoredUserOrders();
  const demoFallback = DEMO_ORDERS.filter(
    (demo) => !stored.some((item) => item.id === demo.id),
  );

  return [...stored, ...demoFallback].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export function readOrderById(id: string) {
  return readOrders().find((order) => order.id === id || order.number === id) ?? null;
}

export function readLastOrder(): StoreOrder | null {
  if (!hasWindow()) return null;

  return safeParse<StoreOrder | null>(
    window.localStorage.getItem(LAST_ORDER_KEY),
    null,
  );
}

export function writeLastOrder(order: StoreOrder | null) {
  if (!hasWindow()) return;

  if (order) {
    window.localStorage.setItem(LAST_ORDER_KEY, JSON.stringify(order));
    return;
  }

  window.localStorage.removeItem(LAST_ORDER_KEY);
}

export function createOrderFromCart(
  items: CartItem[],
  customer: CheckoutFormValues,
): StoreOrder {
  const subtotal = getCartSubtotal(items);
  const deliveryPrice = getDeliveryPrice(customer.deliveryMethod, items);

  const order: StoreOrder = {
    id: generateId(),
    number: buildOrderNumber(),
    createdAt: new Date().toISOString(),
    status: 'pending',
    items,
    customer,
    subtotal,
    deliveryPrice,
    total: subtotal + deliveryPrice,
  };

  const currentOrders = readStoredUserOrders();
  writeStoredUserOrders([order, ...currentOrders]);

  if (hasWindow()) {
    window.localStorage.setItem(LAST_ORDER_KEY, JSON.stringify(order));
    clearCart();
  }

  return order;
}

function emitFavoritesChanged() {
  if (!hasWindow()) return;
  window.dispatchEvent(new CustomEvent(FAVORITES_CHANGED_EVENT));
}

function emitCartChanged() {
  if (!hasWindow()) return;
  window.dispatchEvent(new CustomEvent(CART_CHANGED_EVENT));
}

export function readFavorites(): FavoriteSnapshot[] {
  if (!hasWindow()) return [];
  return safeParse<FavoriteSnapshot[]>(window.localStorage.getItem(FAVORITES_KEY), []);
}

export function writeFavorites(items: FavoriteSnapshot[]) {
  if (!hasWindow()) return;
  window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(items));
  emitFavoritesChanged();
}

export function isFavorite(productId: string) {
  return readFavorites().some((item) => item.productId === productId);
}

export function addFavorite(
  item: Omit<FavoriteSnapshot, 'addedAt'> & { addedAt?: string },
) {
  const current = readFavorites();
  const existing = current.find((entry) => entry.productId === item.productId);

  if (existing) {
    return current;
  }

  const nextItem: FavoriteSnapshot = {
    ...item,
    addedAt: item.addedAt ?? new Date().toISOString(),
  };

  const next = [nextItem, ...current];
  writeFavorites(next);
  return next;
}

export function removeFavorite(productId: string) {
  const next = readFavorites().filter((item) => item.productId !== productId);
  writeFavorites(next);
  return next;
}

export function clearFavorites() {
  if (!hasWindow()) return;
  window.localStorage.removeItem(FAVORITES_KEY);
  emitFavoritesChanged();
}

export function toggleFavorite(item: Omit<FavoriteSnapshot, 'addedAt'>) {
  if (isFavorite(item.productId)) {
    const items = removeFavorite(item.productId);
    return { wished: false, items };
  }

  const items = addFavorite(item);
  return { wished: true, items };
}

export function subscribeToFavoritesChange(listener: () => void) {
  if (!hasWindow()) {
    return () => {};
  }

  const handleChange = () => listener();

  window.addEventListener(FAVORITES_CHANGED_EVENT, handleChange);
  window.addEventListener('storage', handleChange);

  return () => {
    window.removeEventListener(FAVORITES_CHANGED_EVENT, handleChange);
    window.removeEventListener('storage', handleChange);
  };
}

export function getCartItemsCount(items: CartItem[] = readCart()) {
  return items.reduce((sum, item) => sum + item.quantity, 0);
}

export function subscribeToCartChange(listener: () => void) {
  if (!hasWindow()) {
    return () => {};
  }

  const handleChange = () => listener();

  window.addEventListener(CART_CHANGED_EVENT, handleChange);
  window.addEventListener('storage', handleChange);

  return () => {
    window.removeEventListener(CART_CHANGED_EVENT, handleChange);
    window.removeEventListener('storage', handleChange);
  };
}
