import fs from 'node:fs';
import http from 'node:http';
import https from 'node:https';
import path from 'node:path';

import {
  buildApiUrl,
  normalizeCatalogProductDetail,
  normalizeResinColors,
  type CatalogProductDetail,
  type CatalogResinColor,
} from './api';
import { validateCatalogSnapshot } from './snapshot-integrity';

/**
 * Снимок каталога для статической сборки витрины.
 *
 * Раньше каждая из полутора сотен страниц товара ходила за своими данными сама.
 * Это упиралось в лимит API (60 req/min) изнутри 60-секундного окна генерации
 * страницы, и сборка падала то на одном товаре, то на другом. Теперь каталог
 * целиком собирается один раз в `generateStaticParams`, проверяется на
 * целостность и кладётся на диск, а рендер страниц в сеть не ходит вовсе.
 *
 * Собирается он из тех эндпоинтов, которые у публичного API действительно есть:
 * `GET /api/catalog/products?page&limit` даёт список опубликованных товаров
 * (страницами по 100), `GET /api/catalog/products/{slug}` — карточку с
 * описанием, изображениями и вариантами. Массовой выгрузки каталога у API нет,
 * поэтому запросов ровно столько же, сколько страниц, — но все они теперь
 * сделаны до экспорта, последовательно и с оглядкой на лимит, а не изнутри
 * 60-секундного окна рендера.
 *
 * Главное правило этого модуля: **частичный каталог — не результат**. Если
 * снимок не приехал или в нём чего-то не хватает, сборка обязана упасть. Магазин,
 * из которого молча пропал товар, хуже, чем деплой, который не состоялся: на
 * GitHub Pages в этом случае просто остаётся предыдущая рабочая версия.
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

// Больше API не принимает: `limit=200` отвечает 400 VALIDATION_ERROR.
const LIST_PAGE_SIZE = 100;

/**
 * Публичный API отдаёт 60 запросов в минуту на IP (`x-ratelimit-limit: 60`,
 * окно фиксированное — `x-ratelimit-reset` считает секунды до его сброса).
 * Карточек полторы сотни, так что ровный шаг чуть больше секунды — это ~54
 * запроса в минуту, с запасом под диагностический шаг workflow, который тратит
 * пару запросов из того же окна. Догонять лимит вплотную смысла нет: 429 стоит
 * дороже, чем эти лишние секунды.
 */
const MIN_REQUEST_INTERVAL_MS = 1_100;

// Ниже этого остатка ждём сброса окна, а не пытаемся угадать шаг.
const RATE_LIMIT_FLOOR = 2;

type SnapshotFile = {
  generatedAt: string;
  count: number;
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

type CatalogListResponse = {
  items?: Array<Record<string, any>>;
  meta?: { page?: number; total?: number; pageCount?: number };
};

/**
 * Список опубликованных товаров — источник истины о том, что вообще должно
 * оказаться на витрине. Страницами по 100, то есть на текущий каталог это два
 * запроса.
 */
async function fetchPublishedSlugs(): Promise<string[]> {
  const slugs: string[] = [];
  let page = 1;
  let pageCount = 1;
  let total: number | null = null;

  do {
    const response = await fetchJson<CatalogListResponse>(
      `/api/catalog/products?page=${page}&limit=${LIST_PAGE_SIZE}`,
    );
    const items = Array.isArray(response.items) ? response.items : [];

    for (const item of items) {
      const slug = typeof item?.slug === 'string' ? item.slug.trim() : '';

      if (!slug) {
        throw new Error(
          `Catalog page ${page} contains a product without a slug (id=${item?.id ?? 'unknown'}). ` +
            `Its page could not be exported, so the build stops here.`,
        );
      }

      slugs.push(slug);
    }

    const reportedPageCount = Number(response.meta?.pageCount);
    const reportedTotal = Number(response.meta?.total);

    pageCount = Number.isFinite(reportedPageCount) ? Math.max(1, reportedPageCount) : 1;
    total = Number.isFinite(reportedTotal) ? reportedTotal : total;

    // Пустая страница внутри объявленного диапазона — признак того, что каталог
    // поехал под нами (или API соврал про pageCount). Тихо обрезать список
    // товаров по такому поводу нельзя.
    if (items.length === 0 && page <= pageCount) {
      throw new Error(
        `Catalog page ${page} of ${pageCount} came back empty after ${slugs.length} product(s). ` +
          `Refusing to build the storefront from a truncated catalog.`,
      );
    }

    page += 1;
  } while (page <= pageCount);

  if (total !== null && slugs.length !== total) {
    throw new Error(
      `Catalog listing announced ${total} published product(s) but only ${slugs.length} were listed. ` +
        `Refusing to build the storefront from a truncated catalog.`,
    );
  }

  return slugs;
}

/**
 * Карточки товаров. Массовой выгрузки у API нет, поэтому берём их по одной —
 * зато здесь, до экспорта, где спешить некуда: шаг задан бюджетом запросов, а
 * не таймаутом рендера страницы.
 */
async function fetchProductDetails(slugs: string[]): Promise<Array<Record<string, any>>> {
  const items: Array<Record<string, any>> = [];

  for (const [index, slug] of slugs.entries()) {
    const item = await fetchJson<Record<string, any>>(
      `/api/catalog/products/${encodeURIComponent(slug)}`,
      { quiet: true },
    );

    // Расхождение здесь означает, что список и карточка говорят о разных
    // товарах, — страница ушла бы на витрину под чужим адресом.
    if (String(item?.slug ?? '') !== slug) {
      throw new Error(
        `Requested product "${slug}" but the API answered with "${item?.slug ?? 'nothing'}".`,
      );
    }

    items.push(item);

    if ((index + 1) % 25 === 0 || index + 1 === slugs.length) {
      log(`products ${index + 1}/${slugs.length}`);
    }
  }

  return items;
}

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

  const listedSlugs = await fetchPublishedSlugs();

  log(`catalog listing: ${listedSlugs.length} published product(s)`);

  const payload: SnapshotFile = {
    generatedAt: new Date().toISOString(),
    count: listedSlugs.length,
    items: await fetchProductDetails(listedSlugs),
    resinColors: null,
  };

  const issues = validateCatalogSnapshot(payload);

  if (issues.length > 0) {
    throw new Error(
      `Catalog snapshot failed validation (${issues.length} issue(s)): ` +
        `${issues.slice(0, 10).join('; ')}. Refusing to build the storefront from it.`,
    );
  }

  // Склад смолы — единственные данные, которые витрина имеет право получить
  // позже: страница всё равно перезапрашивает наличие из браузера. Поэтому его
  // отсутствие не повод останавливать сборку.
  let resinColors: CatalogResinColor[] | null = null;

  try {
    resinColors = normalizeResinColors(
      await fetchJson<Record<string, any>>('/api/catalog/resin-colors'),
    );
  } catch (error) {
    log(`resin colors unavailable at build time: ${(error as Error).message}`);
  }

  const file: SnapshotFile = { ...payload, resinColors };

  fs.mkdirSync(path.dirname(SNAPSHOT_PATH), { recursive: true });
  fs.writeFileSync(SNAPSHOT_PATH, JSON.stringify(file));

  const slugs = payload.items.map((item) => String(item.slug));

  log(
    `loaded products=${slugs.length} resinColors=${resinColors?.length ?? 'fallback'} generatedAt=${payload.generatedAt} durationMs=${Date.now() - startedAt}`,
  );

  return { slugs, count: slugs.length };
}

// Сбор каталога стоит полутора сотен запросов, размазанных по бюджету API, —
// повторить его внутри одного процесса значит удвоить время сборки на ровном
// месте. Next вправе вызвать `generateStaticParams` не единожды, поэтому первый
// вызов запоминаем и отдаём всем последующим.
let collecting: Promise<{ slugs: string[]; count: number }> | null = null;

export function loadCatalogSnapshot(): Promise<{ slugs: string[]; count: number }> {
  collecting ??= collectCatalogSnapshot();

  return collecting;
}

// Снимок читается один раз на процесс: 157 страниц, каждая заново разбирающая
// сотни килобайт JSON, — лишняя работа на ровном месте.
let cached: { file: SnapshotFile; bySlug: Map<string, Record<string, any>> } | null = null;

function readSnapshot() {
  if (cached) return cached;

  let file: SnapshotFile;

  try {
    file = JSON.parse(fs.readFileSync(SNAPSHOT_PATH, 'utf8')) as SnapshotFile;
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
