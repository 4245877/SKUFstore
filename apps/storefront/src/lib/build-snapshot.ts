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
 * приезжает одним запросом `GET /api/catalog/products/export`, проверяется на
 * целостность и кладётся на диск, а рендер страниц в сеть не ходит вовсе.
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

async function fetchJson<T>(apiPath: string): Promise<T> {
  const url = buildApiUrl(apiPath);
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const startedAt = Date.now();

    try {
      const response = await requestJson(url, REQUEST_TIMEOUT_MS);
      const durationMs = Date.now() - startedAt;
      const sizeKb = (Buffer.byteLength(response.body) / 1024).toFixed(1);

      log(
        `GET ${apiPath} attempt=${attempt}/${MAX_ATTEMPTS} status=${response.status} durationMs=${durationMs} sizeKiB=${sizeKb} rateLimitRemaining=${response.headers['x-ratelimit-remaining'] ?? '-'}`,
      );

      if (response.status >= 200 && response.status < 300) {
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
/* Загрузка и чтение                                                          */
/* -------------------------------------------------------------------------- */

/**
 * Забирает каталог, проверяет его и кладёт на диск.
 *
 * На диск — потому что `generateStaticParams` и рендер страниц выполняются в
 * разных процессах: сбор данных в build-воркере, экспорт в отдельных
 * export-воркерах, общей памяти у них нет.
 */
export async function loadCatalogSnapshot(): Promise<{ slugs: string[]; count: number }> {
  const startedAt = Date.now();

  const payload = await fetchJson<SnapshotFile>('/api/catalog/products/export');
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

  const file: SnapshotFile = {
    generatedAt: payload.generatedAt,
    count: payload.items.length,
    items: payload.items,
    resinColors,
  };

  fs.mkdirSync(path.dirname(SNAPSHOT_PATH), { recursive: true });
  fs.writeFileSync(SNAPSHOT_PATH, JSON.stringify(file));

  const slugs = payload.items.map((item) => String(item.slug));

  log(
    `loaded products=${slugs.length} resinColors=${resinColors?.length ?? 'fallback'} generatedAt=${payload.generatedAt} durationMs=${Date.now() - startedAt}`,
  );

  return { slugs, count: slugs.length };
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
