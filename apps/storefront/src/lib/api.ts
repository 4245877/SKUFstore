// apps/storefront/src/lib/api.ts

function normalizeBaseUrl(value?: string) {
  return value?.trim().replace(/\/+$/, '') ?? '';
}

const IS_PAGES_BUILD = process.env.DEPLOY_TARGET === 'pages';

const INTERNAL_API_URL = normalizeBaseUrl(process.env.API_INTERNAL_URL);
const PUBLIC_API_URL = normalizeBaseUrl(process.env.NEXT_PUBLIC_API_URL);
const PUBLIC_MEDIA_URL =
  normalizeBaseUrl(process.env.NEXT_PUBLIC_MEDIA_URL) || PUBLIC_API_URL;

function getApiBase() {
  if (typeof window === 'undefined') {
    if (IS_PAGES_BUILD) {
      return PUBLIC_API_URL || INTERNAL_API_URL;
    }

    return INTERNAL_API_URL || PUBLIC_API_URL;
  }

  return PUBLIC_API_URL;
}

export function buildApiUrl(path: string) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const base = getApiBase();
  return base ? `${base}${normalizedPath}` : normalizedPath;
}

function normalizeStorageKey(value?: string | null) {
  const trimmed = value?.trim().replace(/^\/+/, '') ?? '';

  if (!trimmed) return '';

  return trimmed
    .replace(/^uploads\/media\/+/i, '')
    .replace(/^uploads\/+/i, '')
    .replace(/^media\/+/i, '');
}

function normalizeUploadsPath(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return '';

  const normalized = normalizeStorageKey(trimmed);

  return normalized ? `/uploads/${normalized}` : '';
}

function toUploadsPath(value: string) {
  const trimmed = value.trim();

  if (!trimmed) return '';

  if (/^(data|blob):/i.test(trimmed)) return trimmed;

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const url = new URL(trimmed);
      return normalizeUploadsPath(`${url.pathname}${url.search}${url.hash}`);
    } catch {
      return normalizeUploadsPath(trimmed);
    }
  }

  if (trimmed.startsWith('/uploads/')) {
    return normalizeUploadsPath(trimmed);
  }

  return normalizeUploadsPath(trimmed);
}

type ApiErrorPayload = {
  error?: string;
  message?: string;
  details?: unknown;
};

type ApiFetchInit = RequestInit & {
  next?: { revalidate?: number; tags?: string[] };
  retry?: boolean;
  maxAttempts?: number;
  timeoutMs?: number;
};

type AnyRecord = Record<string, any>;

const RETRY_STATUSES = new Set([408, 429, 500, 502, 503, 504]);
const MAX_API_FETCH_ATTEMPTS = IS_PAGES_BUILD ? 3 : 5;
const DEFAULT_API_FETCH_TIMEOUT_MS = IS_PAGES_BUILD ? 12_000 : 20_000;
const MAX_RETRY_DELAY_MS = IS_PAGES_BUILD ? 5_000 : 15_000;
const MAX_RETRY_AFTER_MS = IS_PAGES_BUILD ? 5_000 : 60_000;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseRetryAfterMs(value: string | null) {
  if (!value) return null;

  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return seconds * 1000;
  }

  const dateMs = Date.parse(value);
  if (Number.isFinite(dateMs)) {
    return Math.max(0, dateMs - Date.now());
  }

  return null;
}

function getRetryDelayMs(response: Response, bodyText: string, attempt: number) {
  const retryAfterMs = parseRetryAfterMs(response.headers.get('retry-after'));

  if (retryAfterMs !== null) {
    return Math.min(retryAfterMs, MAX_RETRY_AFTER_MS);
  }

  const bodyMatch = bodyText.match(/retry in\s+(\d+)\s+seconds?/i);

  if (bodyMatch?.[1]) {
    return Math.min(Number(bodyMatch[1]) * 1000, MAX_RETRY_AFTER_MS);
  }

  return Math.min(1000 * 2 ** attempt, MAX_RETRY_DELAY_MS);
}

function getNetworkRetryDelayMs(attempt: number) {
  return Math.min(1000 * 2 ** attempt, MAX_RETRY_DELAY_MS);
}

function parsePayload<T>(bodyText: string): T | ApiErrorPayload | null {
  if (!bodyText) return null;

  try {
    return JSON.parse(bodyText) as T | ApiErrorPayload;
  } catch {
    return null;
  }
}

export async function apiFetch<T>(path: string, init: ApiFetchInit = {}): Promise<T> {
  const {
    retry = true,
    maxAttempts,
    timeoutMs = DEFAULT_API_FETCH_TIMEOUT_MS,
    ...fetchInit
  } = init;

  const headers = new Headers(fetchInit.headers ?? {});

  // Автоматически ставим application/json, если это не FormData (файлы)
  if (!(fetchInit.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const url = buildApiUrl(path);
  const attempts =
    retry === false ? 1 : Math.max(1, maxAttempts ?? MAX_API_FETCH_ATTEMPTS);

  let lastError: unknown;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    const externalSignal = fetchInit.signal;
    const abortFromExternalSignal = () => controller.abort();

    if (externalSignal?.aborted) {
      controller.abort();
    } else {
      externalSignal?.addEventListener('abort', abortFromExternalSignal, {
        once: true,
      });
    }

    let response: Response;
    let bodyText = '';

    try {
      response = await fetch(url, {
        ...fetchInit,
        headers,
        signal: controller.signal,
      });

      bodyText = await response.text();
    } catch (error) {
      lastError = error;

      if (attempt < attempts - 1) {
        const delayMs = getNetworkRetryDelayMs(attempt);
        await sleep(delayMs);
        continue;
      }

      throw error;
    } finally {
      clearTimeout(timeout);
      externalSignal?.removeEventListener('abort', abortFromExternalSignal);
    }

    const payload = parsePayload<T>(bodyText);

    if (response.ok) {
      return payload as T;
    }

    if (attempt < attempts - 1 && RETRY_STATUSES.has(response.status)) {
      const delayMs = getRetryDelayMs(response, bodyText, attempt);
      await sleep(delayMs);
      continue;
    }

    const errorPayload = payload as ApiErrorPayload | null;

    const error = new Error(
      errorPayload?.message ||
        errorPayload?.error ||
        bodyText ||
        `Request failed with status ${response.status}`,
    ) as Error & { status?: number; payload?: ApiErrorPayload | null };

    error.status = response.status;
    error.payload = errorPayload;

    throw error;
  }

  throw lastError instanceof Error ? lastError : new Error(`Request failed for ${path}`);
}

async function apiFetchWithSession<T>(path: string, init: ApiFetchInit = {}): Promise<T> {
  return apiFetch<T>(path, {
    ...init,
    credentials: 'include',
    cache: 'no-store',
  });
}

export function resolveMediaUrl(path?: string | null) {
  if (!path) return null;
  if (/^(data|blob):/i.test(path)) return path;

  const mediaPath = toUploadsPath(path);
  if (!mediaPath) return null;

  return PUBLIC_MEDIA_URL ? `${PUBLIC_MEDIA_URL}${mediaPath}` : mediaPath;
}

export type CatalogCategoryTreeItem = {
  id: string;
  slug: string;
  name: string;
  children: CatalogCategoryTreeItem[];
  productCount?: number;
};

type RawCatalogCategoryTreeItem = {
  id?: string | null;
  slug?: string | null;
  name?: string | null;
  productCount?: number | null;
  children?: RawCatalogCategoryTreeItem[] | null;
};

function normalizeCategoryTree(
  items: RawCatalogCategoryTreeItem[] | null | undefined,
): CatalogCategoryTreeItem[] {
  if (!Array.isArray(items)) return [];

  return items
    .filter((item): item is RawCatalogCategoryTreeItem => Boolean(item?.slug && item?.name))
    .map((item) => ({
      id: item.id ?? item.slug ?? '',
      slug: item.slug ?? '',
      name: item.name ?? '',
      productCount: typeof item.productCount === 'number' ? item.productCount : undefined,
      children: normalizeCategoryTree(item.children),
    }));
}

export type CatalogEntityRef = {
  id?: string;
  slug?: string;
  name?: string;
  [key: string]: any;
} | null;

function normalizeEntityRef(value: unknown): CatalogEntityRef {
  if (!value || typeof value !== 'object') return null;

  const record = value as AnyRecord;

  return {
    ...record,
    id: typeof record.id === 'string' ? record.id : undefined,
    slug: typeof record.slug === 'string' ? record.slug : undefined,
    name: typeof record.name === 'string' ? record.name : undefined,
  };
}

export type HomeProductItem = {
  id: string;
  title: string;
  slug: string;
  saleType: string;
  isAdult: boolean;
  priceFrom: number;
  currency: string;
  qualityScore: number;
  showOnHome: boolean;
  shortDescription: string | null;
  stockQty: number;
  coverImage: {
    url: string;
    alt: string | null;
  } | null;
  category?: CatalogEntityRef;
  franchise?: CatalogEntityRef;
  brand?: CatalogEntityRef;
  character?: CatalogEntityRef;
  defaultVariant?: {
    id: string;
    name: string;
    price: number;
    currency: string;
    sizeLabel: string | null;
    stockQty: number;
    reservedQty: number;
  } | null;
};

export type CatalogProductImage = {
  id: string;
  url: string;
  alt: string | null;
  isCover: boolean;
  storageKey: string | null;
  [key: string]: any;
};

function normalizeImage(value: unknown): CatalogProductImage | null {
  if (!value || typeof value !== 'object') return null;

  const image = value as AnyRecord;
  const id = typeof image.id === 'string' ? image.id : '';
  const storageKey = normalizeStorageKey(
    typeof image.storageKey === 'string' ? image.storageKey : '',
  );

  let url = typeof image.url === 'string' ? image.url.trim() : '';

  if (storageKey) {
    url = `/uploads/${storageKey.replace(/^\/+/, '')}`;
  } else if (url) {
    url = toUploadsPath(url);
  }

  if (!id && !url) return null;

  return {
    ...image,
    id,
    url,
    alt: typeof image.alt === 'string' ? image.alt : image.alt ?? null,
    isCover: Boolean(image.isCover),
    storageKey: storageKey || null,
  };
}

function normalizeCoverImage(value: unknown) {
  const image = normalizeImage(value);
  if (!image) return null;

  return {
    url: image.url,
    alt: image.alt,
  };
}

function normalizeImages(value: unknown): CatalogProductImage[] {
  if (!Array.isArray(value)) return [];
  return value.map(normalizeImage).filter((item): item is CatalogProductImage => Boolean(item));
}

export type CatalogProductListItem = {
  id: string;
  title: string;
  slug: string;
  sku: string;
  status: string;
  isAdult: boolean;
  saleType: string;
  priceFrom: number;
  currency: string;
  stockQty: number;
  series?: string | null;
  productType?: string;
  coverImage: {
    url: string;
    alt: string | null;
  } | null;
  category?: CatalogEntityRef;
  franchise?: CatalogEntityRef;
  brand?: CatalogEntityRef;
  character?: CatalogEntityRef;
  [key: string]: any;
};

function normalizeCatalogProductListItem(value: unknown): CatalogProductListItem | null {
  if (!value || typeof value !== 'object') return null;

  const item = value as AnyRecord;

  return {
    ...item,
    id: typeof item.id === 'string' ? item.id : '',
    title: typeof item.title === 'string' ? item.title : '',
    slug: typeof item.slug === 'string' ? item.slug : '',
    sku: typeof item.sku === 'string' ? item.sku : '',
    status: typeof item.status === 'string' ? item.status : '',
    isAdult: Boolean(item.isAdult),
    saleType: typeof item.saleType === 'string' ? item.saleType : '',
    priceFrom:
      typeof item.priceFrom === 'number'
        ? item.priceFrom
        : Number(item.priceFrom ?? 0) || 0,
    currency: typeof item.currency === 'string' ? item.currency : '',
    stockQty:
      typeof item.stockQty === 'number'
        ? item.stockQty
        : Number(item.stockQty ?? 0) || 0,
    series: typeof item.series === 'string' ? item.series : item.series ?? null,
    productType:
      typeof item.productType === 'string' ? item.productType : item.productType ?? undefined,
    coverImage: normalizeCoverImage(item.coverImage),
    category: normalizeEntityRef(item.category),
    franchise: normalizeEntityRef(item.franchise),
    brand: normalizeEntityRef(item.brand),
    character: normalizeEntityRef(item.character),
  };
}

export type CatalogProductsResponse = {
  items: CatalogProductListItem[];
  meta: {
    page: number;
    limit: number;
    total: number;
    pageCount: number;
  };
};

type CatalogCategoriesResponse = {
  items?: RawCatalogCategoryTreeItem[];
};

function normalizeHomeProductItem(value: unknown): HomeProductItem | null {
  if (!value || typeof value !== 'object') return null;

  const item = value as AnyRecord;

  const defaultVariant =
    item.defaultVariant && typeof item.defaultVariant === 'object'
      ? {
          id: typeof item.defaultVariant.id === 'string' ? item.defaultVariant.id : '',
          name: typeof item.defaultVariant.name === 'string' ? item.defaultVariant.name : '',
          price:
            typeof item.defaultVariant.price === 'number'
              ? item.defaultVariant.price
              : Number(item.defaultVariant.price ?? 0) || 0,
          currency:
            typeof item.defaultVariant.currency === 'string' ? item.defaultVariant.currency : '',
          sizeLabel:
            typeof item.defaultVariant.sizeLabel === 'string'
              ? item.defaultVariant.sizeLabel
              : item.defaultVariant.sizeLabel ?? null,
          stockQty:
            typeof item.defaultVariant.stockQty === 'number'
              ? item.defaultVariant.stockQty
              : Number(item.defaultVariant.stockQty ?? 0) || 0,
          reservedQty:
            typeof item.defaultVariant.reservedQty === 'number'
              ? item.defaultVariant.reservedQty
              : Number(item.defaultVariant.reservedQty ?? 0) || 0,
        }
      : null;

  return {
    ...item,
    id: typeof item.id === 'string' ? item.id : '',
    title: typeof item.title === 'string' ? item.title : '',
    slug: typeof item.slug === 'string' ? item.slug : '',
    saleType: typeof item.saleType === 'string' ? item.saleType : '',
    isAdult: Boolean(item.isAdult),
    priceFrom:
      typeof item.priceFrom === 'number'
        ? item.priceFrom
        : Number(item.priceFrom ?? 0) || 0,
    currency: typeof item.currency === 'string' ? item.currency : '',
    qualityScore:
      typeof item.qualityScore === 'number'
        ? item.qualityScore
        : Number(item.qualityScore ?? 0) || 0,
    showOnHome: Boolean(item.showOnHome),
    shortDescription:
      typeof item.shortDescription === 'string'
        ? item.shortDescription
        : item.shortDescription ?? null,
    stockQty:
      typeof item.stockQty === 'number'
        ? item.stockQty
        : Number(item.stockQty ?? 0) || 0,
    coverImage: normalizeCoverImage(item.coverImage),
    category: normalizeEntityRef(item.category),
    franchise: normalizeEntityRef(item.franchise),
    brand: normalizeEntityRef(item.brand),
    character: normalizeEntityRef(item.character),
    defaultVariant,
  };
}

export async function getCatalogCategories(): Promise<CatalogCategoryTreeItem[]> {
  const response = await apiFetch<CatalogCategoriesResponse>('/api/catalog/categories', {
    cache: 'force-cache',
  });
  return normalizeCategoryTree(response.items);
}

export async function getCatalogProducts(
  params: Record<string, string | number | boolean | undefined> = {},
): Promise<CatalogProductsResponse> {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    search.set(key, String(value));
  }

  const suffix = search.toString() ? `?${search.toString()}` : '';
  const response = await apiFetch<AnyRecord>(`/api/catalog/products${suffix}`, {
    cache: 'force-cache',
  });

  return {
    items: Array.isArray(response.items)
      ? response.items
          .map(normalizeCatalogProductListItem)
          .filter((item): item is CatalogProductListItem => Boolean(item))
      : [],
    meta: {
      page: Number(response.meta?.page ?? 1) || 1,
      limit: Number(response.meta?.limit ?? 1) || 1,
      total: Number(response.meta?.total ?? 0) || 0,
      pageCount: Number(response.meta?.pageCount ?? 0) || 0,
    },
  };
}

export async function getHomeProducts(): Promise<{ items: HomeProductItem[] }> {
  const response = await apiFetch<AnyRecord>('/api/catalog/products/home', {
    cache: 'force-cache',
  });

  return {
    items: Array.isArray(response.items)
      ? response.items
          .map(normalizeHomeProductItem)
          .filter((item): item is HomeProductItem => Boolean(item))
      : [],
  };
}

export type CatalogProductVariant = {
  id: string;
  name: string;
  sku: string;
  sizeLabel: string | null;
  outfitLabel: string | null;
  faceLabel: string | null;
  resinGrams: number;
  price: number;
  currency: string;
  stockQty: number;
  reservedQty: number;
  isDefault: boolean;
  isActive: boolean;
  images: CatalogProductImage[];
  [key: string]: any;
};

function normalizeVariant(value: unknown): CatalogProductVariant | null {
  if (!value || typeof value !== 'object') return null;

  const variant = value as AnyRecord;

  return {
    ...variant,
    id: typeof variant.id === 'string' ? variant.id : '',
    name: typeof variant.name === 'string' ? variant.name : '',
    sku: typeof variant.sku === 'string' ? variant.sku : '',
    sizeLabel:
      typeof variant.sizeLabel === 'string' ? variant.sizeLabel : variant.sizeLabel ?? null,
    outfitLabel:
      typeof variant.outfitLabel === 'string' ? variant.outfitLabel : variant.outfitLabel ?? null,
    faceLabel:
      typeof variant.faceLabel === 'string' ? variant.faceLabel : variant.faceLabel ?? null,
    resinGrams:
      typeof variant.resinGrams === 'number'
        ? variant.resinGrams
        : Number(variant.resinGrams ?? 0) || 0,
    price: typeof variant.price === 'number' ? variant.price : Number(variant.price ?? 0) || 0,
    currency: typeof variant.currency === 'string' ? variant.currency : '',
    stockQty:
      typeof variant.stockQty === 'number' ? variant.stockQty : Number(variant.stockQty ?? 0) || 0,
    reservedQty:
      typeof variant.reservedQty === 'number'
        ? variant.reservedQty
        : Number(variant.reservedQty ?? 0) || 0,
    isDefault: Boolean(variant.isDefault),
    isActive: variant.isActive !== false,
    images: normalizeImages(variant.images),
  };
}

function normalizeVariants(value: unknown): CatalogProductVariant[] {
  if (!Array.isArray(value)) return [];
  return value
    .map(normalizeVariant)
    .filter((item): item is CatalogProductVariant => Boolean(item));
}

export type CatalogProductDetail = {
  id: string;
  title: string;
  slug: string;
  sku: string;
  status: string;
  description: string | null;
  shortDescription: string | null;
  isAdult: boolean;
  saleType: string;
  ageRating: string;
  priceFrom: number;
  currency: string;
  series?: string | null;
  productType?: string;
  images: CatalogProductImage[];
  variants: CatalogProductVariant[];
  attributes: Record<string, any> | null;
  category?: CatalogEntityRef;
  franchise?: CatalogEntityRef;
  brand?: CatalogEntityRef;
  character?: CatalogEntityRef;
  [key: string]: any;
};

export async function getCatalogProductBySlug(slug: string): Promise<CatalogProductDetail> {
  const response = await apiFetch<AnyRecord>(`/api/catalog/products/${encodeURIComponent(slug)}`, {
    cache: 'force-cache',
    maxAttempts: IS_PAGES_BUILD ? 3 : undefined,
    timeoutMs: IS_PAGES_BUILD ? 12_000 : undefined,
  });

  return {
    ...response,
    id: typeof response.id === 'string' ? response.id : '',
    title: typeof response.title === 'string' ? response.title : '',
    slug: typeof response.slug === 'string' ? response.slug : '',
    sku: typeof response.sku === 'string' ? response.sku : '',
    status: typeof response.status === 'string' ? response.status : '',
    description:
      typeof response.description === 'string' ? response.description : response.description ?? null,
    shortDescription:
      typeof response.shortDescription === 'string'
        ? response.shortDescription
        : response.shortDescription ?? null,
    isAdult: Boolean(response.isAdult),
    saleType: typeof response.saleType === 'string' ? response.saleType : '',
    ageRating: typeof response.ageRating === 'string' ? response.ageRating : '',
    priceFrom:
      typeof response.priceFrom === 'number'
        ? response.priceFrom
        : Number(response.priceFrom ?? 0) || 0,
    currency: typeof response.currency === 'string' ? response.currency : '',
    series: typeof response.series === 'string' ? response.series : response.series ?? null,
    productType: typeof response.productType === 'string' ? response.productType : '',
    images: normalizeImages(response.images),
    variants: normalizeVariants(response.variants),
    attributes:
      response.attributes &&
      typeof response.attributes === 'object' &&
      !Array.isArray(response.attributes)
        ? (response.attributes as Record<string, any>)
        : null,
    category: normalizeEntityRef(response.category),
    franchise: normalizeEntityRef(response.franchise),
    brand: normalizeEntityRef(response.brand),
    character: normalizeEntityRef(response.character),
  };
}

export function buildOAuthStartUrl(
  provider: 'google' | 'facebook',
  options: { returnTo?: string; remember?: boolean } = {},
) {
  const search = new URLSearchParams();

  if (options.returnTo) search.set('returnTo', options.returnTo);
  if (options.remember !== undefined) {
    search.set('remember', options.remember ? '1' : '0');
  }

  const suffix = search.toString() ? `?${search.toString()}` : '';
  return buildApiUrl(`/api/auth/oauth/${provider}/start${suffix}`);
}

export type AccountFavoriteItem = {
  id: string;
  createdAt: string;
  productId: string;
  title: string;
  slug: string;
  series: string | null;
  saleType: string;
  isAdult: boolean;
  priceFrom: number;
  currency: string;
  stockQty: number;
  productType: string | null;
  coverImage: {
    id?: string;
    url: string;
    alt: string | null;
    isCover?: boolean;
    storageKey?: string | null;
  } | null;
  category?: CatalogEntityRef;
  brand?: CatalogEntityRef;
  franchise?: CatalogEntityRef;
  character?: CatalogEntityRef;
  defaultVariant?: {
    id: string;
    name: string;
    price: number;
    currency: string;
    sizeLabel: string | null;
    stockQty: number;
    reservedQty: number;
  } | null;
};

export async function getAccountFavorites(): Promise<{ items: AccountFavoriteItem[] }> {
  return apiFetchWithSession<{ items: AccountFavoriteItem[] }>('/api/account/favorites');
}

export async function addAccountFavorite(productId: string) {
  return apiFetchWithSession<{ wished: true; item: AccountFavoriteItem }>(
    `/api/account/favorites/${encodeURIComponent(productId)}`,
    {
      method: 'POST',
    },
  );
}

export async function removeAccountFavorite(productId: string) {
  return apiFetchWithSession<{ wished: false; productId: string }>(
    `/api/account/favorites/${encodeURIComponent(productId)}`,
    {
      method: 'DELETE',
    },
  );
}

export type AccountUser = {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  role: 'USER' | 'ADMIN';
  createdAt: string;
};

export type UpdateAccountProfileInput = {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
};

export async function getAccountProfile(): Promise<AccountUser> {
  const response = await apiFetchWithSession<{ user: AccountUser }>('/api/auth/me');
  return response.user;
}

export type RegisterInput = {
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  password: string;
  code: string;
  remember?: boolean;
};

export type LoginInput = {
  email: string;
  password: string;
  remember?: boolean;
};

export async function requestRegisterCode(
  email: string,
): Promise<{ ok: true; message?: string }> {
  return apiFetch<{ ok: true; message?: string }>('/api/auth/register/request-code', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export async function registerAccount(payload: RegisterInput): Promise<{ user: AccountUser }> {
  return apiFetchWithSession<{ user: AccountUser }>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function loginAccount(payload: LoginInput): Promise<{ user: AccountUser }> {
  return apiFetchWithSession<{ user: AccountUser }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function logoutAccount(): Promise<{ ok: true }> {
  return apiFetchWithSession<{ ok: true }>('/api/auth/logout', {
    method: 'POST',
  });
}

export async function updateAccountProfile(
  payload: UpdateAccountProfileInput,
): Promise<AccountUser> {
  const response = await apiFetchWithSession<{ user: AccountUser }>('/api/account/profile', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });

  return response.user;
}

export type OrderDeliveryMethod =
  | 'nova-poshta-branch'
  | 'ukrposhta-branch'
  | 'courier'
  | 'pickup';

export type OrderPaymentMethod =
  | 'card'
  | 'cash-on-delivery'
  | 'agreement'
  | 'partial-prepayment'
  | 'full-prepayment';

export type OrderStatus =
  | 'pending'
  | 'paid'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled';

export type OrderRecordItem = {
  id: string;
  productId: string;
  variantId: string;
  slug: string;
  name: string;
  subtitle?: string | null;
  series?: string | null;
  price: number;
  quantity: number;
  currency: string;
};

export type OrderRecord = {
  id: string;
  number: string;
  createdAt: string;
  status: OrderStatus;
  currency: string;
  subtotal: number;
  deliveryPrice: number;
  total: number;
  customer: {
    fullName: string;
    email: string;
    phone: string;
    city: string;
    address: string;
    deliveryMethod: OrderDeliveryMethod;
    paymentMethod: OrderPaymentMethod;
    comment: string;
  };
  items: OrderRecordItem[];
};

export type CreateOrderInput = {
  email: string;
  fullName: string;
  phone: string;
  city: string;
  address: string;
  deliveryMethod: OrderDeliveryMethod;
  paymentMethod: OrderPaymentMethod;
  currency: string;
  comment?: string;
  items: Array<{
    variantId: string;
    productId?: string;
    qty: number;
  }>;
};

export async function createOrder(payload: CreateOrderInput): Promise<{ order: OrderRecord }> {
  return apiFetchWithSession<{ order: OrderRecord }>('/api/orders', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getAccountOrders(): Promise<{ items: OrderRecord[] }> {
  return apiFetchWithSession<{ items: OrderRecord[] }>('/api/orders/my');
}

export async function getAccountOrder(id: string): Promise<{ order: OrderRecord }> {
  return apiFetchWithSession<{ order: OrderRecord }>(
    `/api/orders/my/${encodeURIComponent(id)}`,
  );
}