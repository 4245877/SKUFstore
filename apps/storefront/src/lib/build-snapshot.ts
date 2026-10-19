import { readLiveMerchantData } from './catalog-source';
import { buildMerchantSourceState } from './merchant-feed';
import fs from 'node:fs';
import http from 'node:http';
import https from 'node:https';
import path from 'node:path';

import {
  buildApiUrl,
  normalizeCatalogProductDetail,
  type CatalogProductDetail,
  type CatalogResinColor,
} from './api';
import { assertCatalogPublicationStable, validateCatalogSnapshot } from './snapshot-integrity';
import { collectSnapshotOnce, snapshotCollectionPaths, writeJsonAtomically } from './snapshot-collection';

/** One validated bulk export + colors, confirmed by a second read before atomic publication.
 * Product pages, JSON-LD, sitemap and Merchant XML read this exact build-scoped file.
 * A failed or changing API stops the build; verified zero totals allow intentional removal.
 */

const SNAPSHOT_PATH = path.join(
  process.cwd(),
  '.next',
  'cache',
  'skufnya-build',
  'catalog-snapshot.json',
);

// Фаза `generateStaticParams` не ограничена `staticPageGenerationTimeout`, но
// висеть в ней бесконечно тоже нельзя: минутных ожиданий быть не должно.
const REQUEST_TIMEOUT_MS = 15_000;
const MAX_ATTEMPTS = 3;
const MAX_BACKOFF_MS = 5_000;

// Six bulk/check requests share the public rate-limit budget with other build reads.
const MIN_REQUEST_INTERVAL_MS = 1_100;

// Ниже этого остатка ждём сброса окна, а не пытаемся угадать шаг.
const RATE_LIMIT_FLOOR = 2;

type SnapshotFile = {
  buildId: string;
  generatedAt: string;
  count: number;
  emptyConfirmed?: boolean;
  items: Array<Record<string, any>>;
  resinColors: CatalogResinColor[] | null;
};

function log(message: string) {
  console.log(`[catalog-snapshot] ${message}`);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/* -------------------------------------------------------------------------- */
/* HTTP                                                                       */
/* -------------------------------------------------------------------------- */

type RawResponse = {
  status: number;
  headers: http.IncomingHttpHeaders;
  body: string;
};

/* -------------------------------------------------------------------------- */
/* Бюджет запросов                                                            */
/* -------------------------------------------------------------------------- */

// Момент, раньше которого следующий запрос уходить не должен.
let nextRequestAt = 0;

async function waitForRequestSlot() {
  const waitMs = nextRequestAt - Date.now();

  if (waitMs > 0) await sleep(waitMs);

  nextRequestAt = Date.now() + MIN_REQUEST_INTERVAL_MS;
}

/**
 * Окно лимита фиксированное, а не скользящее, поэтому ровного шага мало: если
 * бюджет всё-таки подошёл к концу (диагностика workflow, повторы, соседний
 * job с того же IP), дешевле переждать до сброса окна, чем получить 429.
 */
function observeRateLimit(headers: http.IncomingHttpHeaders) {
  const remaining = Number(headers['x-ratelimit-remaining']);

  if (!Number.isFinite(remaining) || remaining > RATE_LIMIT_FLOOR) return;

  const reset = Number(headers['x-ratelimit-reset']);
  const pauseMs = (Number.isFinite(reset) && reset > 0 ? reset : 60) * 1000 + 500;

  nextRequestAt = Math.max(nextRequestAt, Date.now() + pauseMs);

  log(`rate limit budget is down to ${remaining}, waiting ${pauseMs}ms for the window to reset`);
}

/**
 * Запрос идёт мимо глобального `fetch` намеренно.
 *
 * Next на сборке подменяет `fetch` обёрткой с Data Cache, и в 15.0.0 она берёт
 * блокировку по ключу кеша, а снимает её только на успешных ветках. Оборванный
 * по таймауту запрос оставляет блокировку навсегда, и повтор того же URL висит
 * вечно — то есть ретраи, ради которых всё и затевалось, переставали работать.
 * Здесь кеш Next не нужен, поэтому берём голый `node:http`, где таймаут рвёт
 * сокет и ничего за собой не держит.
 */
function requestJson(url: string, timeoutMs: number): Promise<RawResponse> {
  return new Promise((resolve, reject) => {
    const target = new URL(url);
    const client = target.protocol === 'https:' ? https : http;

    const request = client.request(
      target,
      {
        method: 'GET',
        headers: { accept: 'application/json', 'accept-encoding': 'identity' },
      },
      (response) => {
        const chunks: Buffer[] = [];

        response.on('data', (chunk: Buffer) => chunks.push(chunk));
        response.on('error', (error) => {
          settle();
          reject(error);
        });
        response.on('end', () => {
          settle();
          resolve({
            status: response.statusCode ?? 0,
            headers: response.headers,
            body: Buffer.concat(chunks).toString('utf8'),
          });
        });
      },
    );

    // Дедлайн на весь ответ, а не только на простой сокета: каталог весит
    // сотни килобайт, и сервер, отдающий их по байту, не должен пережить бюджет.
    const deadline = setTimeout(() => {
      const error = new Error(`Timed out after ${timeoutMs}ms`) as Error & {
        timedOut?: boolean;
      };

      error.timedOut = true;
      request.destroy(error);
    }, timeoutMs);

    const settle = () => clearTimeout(deadline);

    request.on('error', (error) => {
      settle();
      reject(error);
    });

    request.end();
  });
}

function parseRetryAfterMs(value: string | undefined) {
  if (!value) return null;

  const seconds = Number(value);

  if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1000;

  const dateMs = Date.parse(value);

  return Number.isFinite(dateMs) ? Math.max(0, dateMs - Date.now()) : null;
}

/**
 * Без базового URL `buildApiUrl` вернёт относительный путь, а `new URL` на нём
 * упадёт невнятным `Invalid URL`. Незаданная переменная окружения должна
 * называть себя сама — иначе в логе Actions её не найти.
 */
function resolveApiUrl(apiPath: string) {
  const url = buildApiUrl(apiPath);

  if (!/^https?:\/\//i.test(url)) {
    throw new Error(
      `Catalog API base URL is not configured: "${apiPath}" resolved to "${url}". ` +
        `Set NEXT_PUBLIC_API_URL (or API_INTERNAL_URL) for the static export build.`,
    );
  }

  return url;
}

async function fetchJson<T>(apiPath: string, options: { quiet?: boolean } = {}): Promise<T> {
  const url = resolveApiUrl(apiPath);
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    await waitForRequestSlot();

    const startedAt = Date.now();

    try {
      const response = await requestJson(url, REQUEST_TIMEOUT_MS);
      const durationMs = Date.now() - startedAt;
      const sizeKb = (Buffer.byteLength(response.body) / 1024).toFixed(1);
      const ok = response.status >= 200 && response.status < 300;

      observeRateLimit(response.headers);

      // Полторы сотни одинаковых успешных строк в логе Actions только прячут
      // интересное, поэтому карточки товаров отчитываются пачками. Всё, что
      // пошло не так, логируется всегда.
      if (!options.quiet || !ok || attempt > 1) {
        log(
          `GET ${apiPath} attempt=${attempt}/${MAX_ATTEMPTS} status=${response.status} durationMs=${durationMs} sizeKiB=${sizeKb} rateLimitRemaining=${response.headers['x-ratelimit-remaining'] ?? '-'}`,
        );
      }

      if (ok) {
        return JSON.parse(response.body) as T;
      }

      const error = new Error(
        `${apiPath} responded ${response.status}`,
      ) as Error & { status?: number };

      error.status = response.status;
      lastError = error;

      // 4xx (кроме 408/429) — это ответ, а не сбой: повторять бессмысленно.
      const retryable =
        response.status >= 500 ||
        response.status === 408 ||
        response.status === 429;

      if (!retryable || attempt === MAX_ATTEMPTS) throw error;

      const retryAfterMs = parseRetryAfterMs(
        response.headers['retry-after'] as string | undefined,
      );

      await sleep(Math.min(retryAfterMs ?? 1_000 * 2 ** attempt, MAX_BACKOFF_MS));
    } catch (error) {
      lastError = error;

      if ((error as Error & { status?: number }).status !== undefined) throw error;

      const timedOut = (error as Error & { timedOut?: boolean }).timedOut === true;

      log(
        `GET ${apiPath} attempt=${attempt}/${MAX_ATTEMPTS} outcome=${timedOut ? 'timeout' : 'network-error'} durationMs=${Date.now() - startedAt} timeoutMs=${REQUEST_TIMEOUT_MS} message=${(error as Error).message}`,
      );

      if (attempt === MAX_ATTEMPTS) throw error;

      await sleep(Math.min(1_000 * 2 ** attempt, MAX_BACKOFF_MS));
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error(`Failed to fetch ${apiPath}`);
}

/* -------------------------------------------------------------------------- */
/* Сбор каталога                                                              */
/* -------------------------------------------------------------------------- */

/* -------------------------------------------------------------------------- */
/* Загрузка и чтение                                                          */
/* -------------------------------------------------------------------------- */

/**
 * Забирает каталог, проверяет его и кладёт на диск.
 *
 * На диск — потому что `generateStaticParams` и рендер страниц выполняются в
 * разных процессах: сбор данных в build-воркере, экспорт в отдельных
 * export-воркерах, общей памяти у них нет.
 */
async function collectCatalogSnapshot(): Promise<{ slugs: string[]; count: number }> {
  const startedAt = Date.now();

  const api = new URL(resolveApiUrl('/api/catalog/products/export')).origin;
  const fetchResponse = async (url: string) => Response.json(await fetchJson<Record<string, any>>(
    new URL(url).pathname + new URL(url).search,
  ));
  const first = await readLiveMerchantData(api, fetchResponse);
  const after = await readLiveMerchantData(api, fetchResponse);
  assertCatalogPublicationStable(first.rawProducts, after.rawProducts);
  if (buildMerchantSourceState(first.products, first.colors).fingerprint !==
      buildMerchantSourceState(after.products, after.colors).fingerprint) {
    throw new Error('Catalog prices, options, images or colors changed during collection; retry the build');
  }
  const resinColors = first.colors;
  const payload: SnapshotFile = {
    buildId: process.env.SKUF_CATALOG_BUILD_ID ?? '', generatedAt: new Date().toISOString(),
    count: first.rawProducts.length, items: first.rawProducts, resinColors,
    emptyConfirmed: first.rawProducts.length === 0,
  };
  const issues = validateCatalogSnapshot(payload);
  if (issues.length) throw new Error(`Catalog snapshot failed validation: ${issues.join('; ')}`);
  const file = payload;

  fs.mkdirSync(path.dirname(SNAPSHOT_PATH), { recursive: true });
  const paths = snapshotCollectionPaths(path.dirname(SNAPSHOT_PATH), file.buildId);
  writeJsonAtomically(paths.snapshot, file);
  // The export/CI verifier consumes this completed-build mirror. Render workers
  // always read the isolated file above, so another build cannot replace theirs.
  writeJsonAtomically(SNAPSHOT_PATH, file);

  const slugs = payload.items.map((item) => String(item.slug));

  log(
    `loaded products=${slugs.length} resinColors=${resinColors?.length ?? 'fallback'} generatedAt=${payload.generatedAt} durationMs=${Date.now() - startedAt}`,
  );

  return { slugs, count: slugs.length };
}

// Next may call generateStaticParams more than once; collect exactly once per build.
let collecting: Promise<{ slugs: string[]; count: number }> | null = null;

export function loadCatalogSnapshot(): Promise<{ slugs: string[]; count: number }> {
  collecting ??= collectSnapshotOnce({
    directory: path.dirname(SNAPSHOT_PATH),
    buildId: process.env.SKUF_CATALOG_BUILD_ID ?? '',
    collect: collectCatalogSnapshot,
    validate: validateCollectedSnapshot,
  });

  return collecting;
}

// Снимок читается один раз на процесс: 157 страниц, каждая заново разбирающая
// сотни килобайт JSON, — лишняя работа на ровном месте.
let cached: { file: SnapshotFile; bySlug: Map<string, Record<string, any>> } | null = null;

function validateCollectedSnapshot(result: { slugs: string[]; count: number }) {
  const buildId = process.env.SKUF_CATALOG_BUILD_ID ?? '';
  const { snapshot } = snapshotCollectionPaths(path.dirname(SNAPSHOT_PATH), buildId);
  const file = JSON.parse(fs.readFileSync(snapshot, 'utf8')) as SnapshotFile;
  const issues = validateCatalogSnapshot(file, buildId);
  if (!result || !Array.isArray(result.slugs) || result.count !== file.count ||
      JSON.stringify(result.slugs) !== JSON.stringify(file.items.map(item => item.slug))) {
    issues.push('collection result does not match its catalog snapshot');
  }
  if (issues.length) throw new Error(`Invalid completed catalog snapshot: ${issues.join('; ')}`);
}

function readSnapshot() {
  if (cached) return cached;

  let file: SnapshotFile;

  try {
    const buildId = process.env.SKUF_CATALOG_BUILD_ID ?? '';
    const paths = snapshotCollectionPaths(path.dirname(SNAPSHOT_PATH), buildId);
    if (fs.existsSync(paths.failed) || !fs.existsSync(paths.done)) throw new Error('Current catalog collection is not complete');
    file = JSON.parse(fs.readFileSync(paths.snapshot, 'utf8')) as SnapshotFile;
    const issues = validateCatalogSnapshot(file, buildId);
    if (issues.length) throw new Error(issues.join('; '));
  } catch (error) {
    throw new Error(
      `Catalog snapshot is missing or unreadable at ${SNAPSHOT_PATH}: ` +
        `${(error as Error).message}. generateStaticParams must run before page export.`,
    );
  }

  const bySlug = new Map<string, Record<string, any>>();

  for (const item of file.items) {
    bySlug.set(String(item.slug), item);
  }

  cached = { file, bySlug };

  return cached;
}

/**
 * Данные товара для страницы. Промах здесь — не повод идти в сеть и не повод
 * пропустить страницу: снимок объявил этот товар опубликованным, значит он
 * обязан в нём быть, и расхождение означает сломанную сборку.
 */
export function getSnapshotProduct(slug: string): CatalogProductDetail {
  const item = readSnapshot().bySlug.get(slug);

  if (!item) {
    throw new Error(
      `Product "${slug}" is missing from the catalog snapshot. ` +
        `The static export would silently drop this page, so the build stops here.`,
    );
  }

  return normalizeCatalogProductDetail(item);
}

export function getSnapshotResinColors(): CatalogResinColor[] | null {
  return readSnapshot().file.resinColors;
}

export function getSnapshotProductSlugs(): string[] {
  const { file, bySlug } = readSnapshot();
  const issues = validateCatalogSnapshot(file);
  if (issues.length) throw new Error(`Invalid sitemap snapshot: ${issues.join('; ')}`);
  return [...bySlug.keys()];
}

/** Sitemap and product SEO consume the same completed collection. */
export function getSnapshotProducts(): CatalogProductDetail[] {
  return getSnapshotProductSlugs().map(getSnapshotProduct);
}
