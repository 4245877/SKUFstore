import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type AnyRecord = Record<string, unknown>;

type NovaPoshtaEnvelope<T> = {
  success?: boolean;
  data?: T;
  errors?: string[];
  warnings?: string[];
  info?: string[];
};

type CitySuggestion = {
  ref: string;
  settlementRef: string;
  name: string;
  present: string;
  area: string | null;
  region: string | null;
  warehouseCount: number | null;
};

type WarehouseSuggestion = {
  ref: string;
  type: 'branch' | 'postomat';
  number: string | null;
  description: string;
  shortAddress: string;
  cityDescription: string;
  label: string;
};

type CacheEntry<T> = {
  expiresAt: number;
  value: T;
};

const NOVA_POSHTA_ENDPOINT = 'https://api.novaposhta.ua/v2.0/json/';
const NOVA_POSHTA_API_KEY =
  process.env.NOVA_POSHTA_API_KEY ??
  process.env.NOVAPOSHTA_API_KEY ??
  process.env.NP_API_KEY ??
  '';

const REQUEST_TIMEOUT_MS = 4_500;
const MAX_ATTEMPTS = 2;
const CITY_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const WAREHOUSE_CACHE_TTL_MS = 15 * 60 * 1000;
const MAX_CACHE_ENTRIES = 240;

const cache = new Map<string, CacheEntry<unknown>>();
const pendingRequests = new Map<string, Promise<unknown>>();

function normalizeParam(value: string | null, maxLength: number) {
  return (value ?? '').replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

function normalizeCacheKey(value: string) {
  return value.trim().toLocaleLowerCase('uk-UA');
}

function toRecord(value: unknown): AnyRecord {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as AnyRecord)
    : {};
}

function readString(record: AnyRecord, keys: string[]) {
  for (const key of keys) {
    const value = record[key];

    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }

    if (typeof value === 'number' && Number.isFinite(value)) {
      return String(value);
    }
  }

  return '';
}

function readNumber(record: AnyRecord, keys: string[]) {
  const raw = readString(record, keys);
  const value = Number(raw);

  return Number.isFinite(value) ? value : null;
}

function getCached<T>(key: string) {
  const entry = cache.get(key) as CacheEntry<T> | undefined;

  if (!entry) return null;

  if (entry.expiresAt <= Date.now()) {
    cache.delete(key);
    return null;
  }

  return entry.value;
}

function setCached<T>(key: string, value: T, ttlMs: number) {
  if (cache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = cache.keys().next().value;

    if (oldestKey) {
      cache.delete(oldestKey);
    }
  }

  cache.set(key, {
    expiresAt: Date.now() + ttlMs,
    value,
  });
}

async function cached<T>(key: string, ttlMs: number, loader: () => Promise<T>) {
  const cachedValue = getCached<T>(key);

  if (cachedValue) return cachedValue;

  const pending = pendingRequests.get(key) as Promise<T> | undefined;

  if (pending) return pending;

  const request = loader()
    .then((value) => {
      setCached(key, value, ttlMs);
      return value;
    })
    .finally(() => {
      pendingRequests.delete(key);
    });

  pendingRequests.set(key, request);
  return request;
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callNovaPoshta<T>(
  calledMethod: 'searchSettlements' | 'getWarehouses',
  methodProperties: AnyRecord,
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(NOVA_POSHTA_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          apiKey: NOVA_POSHTA_API_KEY,
          modelName: 'AddressGeneral',
          calledMethod,
          methodProperties,
        }),
        cache: 'no-store',
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Nova Poshta request failed with status ${response.status}`);
      }

      const payload = (await response.json()) as NovaPoshtaEnvelope<T>;

      if (payload.success) {
        return (payload.data ?? []) as T;
      }

      const message = [
        ...(payload.errors ?? []),
        ...(payload.warnings ?? []),
        ...(payload.info ?? []),
      ]
        .filter(Boolean)
        .join('; ');

      throw new Error(message || 'Nova Poshta API returned an unsuccessful response');
    } catch (error) {
      lastError = error;

      if (attempt < MAX_ATTEMPTS - 1) {
        await delay(250 * (attempt + 1));
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error('Nova Poshta request failed');
}

function normalizeCities(data: unknown): CitySuggestion[] {
  const groups = Array.isArray(data) ? data : [];
  const seen = new Set<string>();

  return groups.flatMap((group) => {
    const addresses = toRecord(group).Addresses;

    if (!Array.isArray(addresses)) return [];

    return addresses
      .map((item) => {
        const record = toRecord(item);
        const ref = readString(record, ['DeliveryCity', 'Ref']);
        const settlementRef = readString(record, ['Ref']);
        const name = readString(record, ['MainDescription', 'Description']);
        const present =
          readString(record, ['Present']) ||
          [readString(record, ['SettlementTypeCode']), name]
            .filter(Boolean)
            .join(' ');

        if (!ref || !name || seen.has(ref)) return null;

        seen.add(ref);

        return {
          ref,
          settlementRef,
          name,
          present,
          area: readString(record, ['Area']) || null,
          region: readString(record, ['Region']) || null,
          warehouseCount: readNumber(record, ['Warehouses']),
        };
      })
      .filter((item): item is CitySuggestion => Boolean(item));
  });
}

function detectWarehouseType(record: AnyRecord): WarehouseSuggestion['type'] {
  const haystack = [
    readString(record, ['CategoryOfWarehouse']),
    readString(record, ['TypeOfWarehouse']),
    readString(record, ['Description']),
    readString(record, ['DescriptionRu']),
  ]
    .join(' ')
    .toLocaleLowerCase('uk-UA');

  return /поштомат|postomat|parcel\s*locker/.test(haystack)
    ? 'postomat'
    : 'branch';
}

function normalizeWarehouses(data: unknown): WarehouseSuggestion[] {
  const items = Array.isArray(data) ? data : [];
  const seen = new Set<string>();

  return items
    .map((item) => {
      const record = toRecord(item);
      const ref = readString(record, ['Ref']);
      const description = readString(record, ['Description', 'DescriptionRu']);
      const shortAddress =
        readString(record, ['ShortAddress', 'ShortAddressRu']) || description;
      const cityDescription = readString(record, [
        'CityDescription',
        'CityDescriptionRu',
        'SettlementDescription',
      ]);

      if (!ref || !description || seen.has(ref)) return null;

      seen.add(ref);

      const number = readString(record, ['Number']) || null;
      const type = detectWarehouseType(record);

      return {
        ref,
        type,
        number,
        description,
        shortAddress,
        cityDescription,
        label: description,
      };
    })
    .filter((item): item is WarehouseSuggestion => Boolean(item));
}

async function searchCities(city: string) {
  const key = `cities:${normalizeCacheKey(city)}`;

  return cached(key, CITY_CACHE_TTL_MS, async () => {
    const data = await callNovaPoshta<unknown[]>('searchSettlements', {
      CityName: city,
      Limit: '8',
      Page: '1',
      Language: 'UA',
    });

    return normalizeCities(data);
  });
}

async function searchWarehouses(options: {
  city: string;
  cityRef: string;
  query: string;
  limit: number;
}) {
  const cacheKey = [
    'warehouses',
    normalizeCacheKey(options.city),
    options.cityRef,
    normalizeCacheKey(options.query),
    options.limit,
  ].join(':');

  return cached(cacheKey, WAREHOUSE_CACHE_TTL_MS, async () => {
    const methodProperties: AnyRecord = {
      Page: '1',
      Limit: String(options.limit),
      Language: 'UA',
    };

    if (options.cityRef) {
      methodProperties.CityRef = options.cityRef;
    } else {
      methodProperties.CityName = options.city;
    }

    if (options.query) {
      methodProperties.FindByString = options.query;
    }

    const data = await callNovaPoshta<unknown[]>(
      'getWarehouses',
      methodProperties,
    );

    return normalizeWarehouses(data);
  });
}

function jsonResponse(payload: unknown, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: {
      'Cache-Control': 'private, max-age=60, stale-while-revalidate=600',
    },
  });
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const city = normalizeParam(searchParams.get('city'), 80);
  const query = normalizeParam(searchParams.get('query'), 120);
  const cityRef = normalizeParam(searchParams.get('cityRef'), 80);
  const rawLimit = Number(searchParams.get('limit') ?? 24);
  const limit = Math.min(50, Math.max(5, Number.isFinite(rawLimit) ? rawLimit : 24));

  if (!cityRef && city.length < 2) {
    return jsonResponse({
      cities: [],
      warehouses: [],
      warnings: [],
    });
  }

  const warnings: string[] = [];
  let cities: CitySuggestion[] = [];

  if (city.length >= 2) {
    try {
      cities = await searchCities(city);
    } catch {
      warnings.push('CITY_LOOKUP_FAILED');
    }
  }

  const resolvedCityRef = cityRef || cities[0]?.ref || '';
  let warehouses: WarehouseSuggestion[] = [];

  try {
    warehouses = await searchWarehouses({
      city,
      cityRef: resolvedCityRef,
      query,
      limit,
    });
  } catch {
    warnings.push('WAREHOUSE_LOOKUP_FAILED');

    if (resolvedCityRef && city.length >= 2) {
      try {
        warehouses = await searchWarehouses({
          city,
          cityRef: '',
          query,
          limit,
        });
      } catch {
        warnings.push('WAREHOUSE_CITY_NAME_FALLBACK_FAILED');
      }
    }
  }

  return jsonResponse({
    cities,
    matchedCity: cities[0] ?? null,
    warehouses,
    warnings,
  });
}
