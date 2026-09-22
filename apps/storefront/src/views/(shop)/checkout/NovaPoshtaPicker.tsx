'use client';

import { useI18n } from '../../../i18n/client';
import type { Translator } from '../../../i18n/translate';
import { useEffect, useRef, useState } from "react";

import { buildApiUrl } from "../../../lib/api";
import styles from "./CheckoutPage.module.css";

type CitySuggestion = {
  ref: string;
  name: string;
  present: string;
  area: string | null;
  region: string | null;
  warehouseCount: number | null;
};

type WarehouseSuggestion = {
  ref: string;
  type: "branch" | "postomat";
  number: string | null;
  description: string;
  shortAddress: string;
  cityDescription: string;
  label: string;
};

type NovaPoshtaResponse = {
  cities: CitySuggestion[];
  warehouses: WarehouseSuggestion[];
  warnings?: string[];
};

type CachedResponse = {
  expiresAt: number;
  data: NovaPoshtaResponse;
};

type NovaPoshtaPickerProps = {
  city: string;
  address: string;
  onCityChange: (value: string) => void;
  onAddressChange: (value: string) => void;
};

const CLIENT_CACHE_TTL_MS = 5 * 60 * 1000;
const MAX_CLIENT_CACHE_ENTRIES = 60;
const clientCache = new Map<string, CachedResponse>();

function pruneClientCache() {
  if (clientCache.size < MAX_CLIENT_CACHE_ENTRIES) return;

  const oldestKey = clientCache.keys().next().value;

  if (oldestKey) {
    clientCache.delete(oldestKey);
  }
}

function normalizeResponse(payload: unknown): NovaPoshtaResponse {
  if (!payload || typeof payload !== "object") {
    return { cities: [], warehouses: [] };
  }

  const record = payload as Partial<NovaPoshtaResponse>;

  return {
    cities: Array.isArray(record.cities) ? record.cities : [],
    warehouses: Array.isArray(record.warehouses) ? record.warehouses : [],
    warnings: Array.isArray(record.warnings) ? record.warnings : [],
  };
}

async function fetchNovaPoshtaSuggestions(
  params: {
    city: string;
    address: string;
    cityRef: string;
  },
  signal: AbortSignal,
) {
  const search = new URLSearchParams();
  search.set("city", params.city);
  search.set("limit", "24");

  if (params.address) {
    search.set("query", params.address);
  }

  if (params.cityRef) {
    search.set("cityRef", params.cityRef);
  }

  const cacheKey = search.toString().toLocaleLowerCase("uk-UA");
  const cached = clientCache.get(cacheKey);

  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  const apiUrl = buildApiUrl(
    `/api/nova-poshta/warehouses?${search.toString()}`,
  );

  const response = await fetch(apiUrl, {
    cache: "no-store",
    headers: {
      Accept: "application/json",
    },
    signal,
  });

  if (!response.ok) {
    throw new Error("Nova Poshta lookup failed");
  }

  const data = normalizeResponse(await response.json());

  pruneClientCache();
  clientCache.set(cacheKey, {
    data,
    expiresAt: Date.now() + CLIENT_CACHE_TTL_MS,
  });

  return data;
}

function getWarehouseTypeLabel(t: Translator, type: WarehouseSuggestion["type"]) {
  return type === "postomat" ? t('shop.parcelLocker') : t('shop.branch');
}

function getCityMeta(city: CitySuggestion) {
  return [city.area, city.region].filter(Boolean).join(", ");
}

export function NovaPoshtaPicker({
  city,
  address,
  onCityChange,
  onAddressChange,
}: NovaPoshtaPickerProps) {
  const { locale, t, path } = useI18n();

  const [cityRef, setCityRef] = useState("");
  const [cities, setCities] = useState<CitySuggestion[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);
  const selectedWarehouseValue = useRef("");

  const trimmedCity = city.trim();
  const trimmedAddress = address.trim();
  const canSearch = trimmedCity.length >= 2;

  useEffect(() => {
    if (!canSearch) {
      setCities([]);
      setWarehouses([]);
      setIsLoading(false);
      setHasLoaded(false);
      setError(null);
      return;
    }

    if (
      selectedWarehouseValue.current &&
      selectedWarehouseValue.current === trimmedAddress
    ) {
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();
    const activeRequestId = requestId.current + 1;
    requestId.current = activeRequestId;

    const timeout = window.setTimeout(
      async () => {
        setIsLoading(true);
        setError(null);

        try {
          const data = await fetchNovaPoshtaSuggestions(
            {
              city: trimmedCity,
              address: trimmedAddress,
              cityRef,
            },
            controller.signal,
          );

          if (requestId.current !== activeRequestId) return;

          setCities(data.cities);
          setWarehouses(data.warehouses);
          setHasLoaded(true);

          if (
            data.warnings?.some((warning) =>
              warning.startsWith("WAREHOUSE_"),
            ) &&
            data.warehouses.length === 0
          ) {
            setError(
              t('shop.weCouldnTLoadTheNovaPoshta'),
            );
          }
        } catch {
          if (controller.signal.aborted) return;
          if (requestId.current !== activeRequestId) return;

          setWarehouses([]);
          setHasLoaded(true);
          setError(
            t('shop.weCouldnTLoadTheNovaPoshta'),
          );
        } finally {
          if (requestId.current === activeRequestId) {
            setIsLoading(false);
          }
        }
      },
      trimmedAddress ? 260 : 360,
    );

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [canSearch, cityRef, trimmedAddress, trimmedCity]);

  function handleCityInput(value: string) {
    setCityRef("");
    selectedWarehouseValue.current = "";
    onCityChange(value);
  }

  function handleAddressInput(value: string) {
    selectedWarehouseValue.current = "";
    onAddressChange(value);
  }

  function handleCitySelect(suggestion: CitySuggestion) {
    setCityRef(suggestion.ref);
    onCityChange(suggestion.name);
    setError(null);
  }

  function handleWarehouseSelect(suggestion: WarehouseSuggestion) {
    selectedWarehouseValue.current = suggestion.label;
    onAddressChange(suggestion.label);
    setError(null);
  }

  return (
    <>
      <label>
        <span>{t('shop.cityOrTown')}</span>

        <input
          type="text"
          value={city}
          onChange={(event) => handleCityInput(event.target.value)}
          autoComplete="address-level2"
          required
          maxLength={120}
          placeholder={t('shop.kyiv')}
          aria-describedby="nova-poshta-status"
        />
      </label>

      <label>
        <span>{t('shop.branchOrParcelLocker')}</span>

        <input
          type="text"
          value={address}
          onChange={(event) => handleAddressInput(event.target.value)}
          autoComplete="street-address"
          required
          maxLength={240}
          placeholder={t('shop.startTypingANumberOrAddress')}
          aria-describedby="nova-poshta-status"
        />
      </label>

      {!cityRef && cities.length > 1 ? (
        <div className={`${styles.fieldFull} ${styles.citySuggestions}`}>
          <span className={styles.suggestionTitle}>{t('shop.selectACityOrTown')}</span>

          <div className={styles.citySuggestionList}>
            {cities.map((suggestion) => {
              const meta = getCityMeta(suggestion);

              return (
                <button
                  type="button"
                  key={suggestion.ref}
                  className={styles.citySuggestionButton}
                  onClick={() => handleCitySelect(suggestion)}
                >
                  <strong>{suggestion.present}</strong>
                  {meta ? <small>{meta}</small> : null}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      <div
        id="nova-poshta-status"
        className={`${styles.fieldFull} ${styles.novaPoshtaStatus}`}
        aria-live="polite"
      >
        {isLoading ? <p>{t('shop.searchingNovaPoshtaLocations')}</p> : null}
        {error ? <p className={styles.warningText}>{error}</p> : null}
        {!canSearch ? (
          <p>{t('shop.enterACityOrTownToSee')}</p>
        ) : null}
        {canSearch && hasLoaded && !isLoading && !error && warehouses.length === 0 ? (
          <p>{t('shop.noResultsTryADifferentNumberOr')}</p>
        ) : null}
      </div>

      {warehouses.length > 0 ? (
        <div className={`${styles.fieldFull} ${styles.warehouseSuggestions}`}>
          {warehouses.map((suggestion) => (
            <button
              type="button"
              key={suggestion.ref}
              className={styles.warehouseSuggestionButton}
              onClick={() => handleWarehouseSelect(suggestion)}
            >
              <span className={styles.warehouseSuggestionMain}>
                <span className={styles.warehouseTypeBadge}>
                  {getWarehouseTypeLabel(t, suggestion.type)}
                </span>
                <strong>{suggestion.description}</strong>
              </span>

              <small>
                {[suggestion.cityDescription, suggestion.shortAddress]
                  .filter(Boolean)
                  .join(", ")}
              </small>
            </button>
          ))}
        </div>
      ) : null}
    </>
  );
}