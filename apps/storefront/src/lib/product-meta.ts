/**
 * Метаданные страницы товара для поисковиков и превью ссылок.
 *
 * Витрина уезжает на Pages статикой, поэтому единственный момент, когда эти
 * теги вообще можно посчитать, — сборка. Краулеры Telegram, Facebook и Twitter
 * JavaScript не выполняют: что попало в HTML на экспорте, то они и покажут.
 * Отсюда правило модуля — ни одной ветки, зависящей от рантайма: только чистые
 * функции над карточкой товара, которую страница и так читает из снимка
 * каталога. Тогда превью не может разойтись с тем, что видит покупатель.
 */

import type { CatalogProductDetail } from './api';

/**
 * Адрес медиа-хранилища приходит параметром, а не импортом из `api.ts`.
 *
 * Там он лежит рядом с сетевым клиентом и читается из окружения на импорте
 * модуля — то есть правила метаданных нельзя было бы проверить в отрыве от
 * него. А проверять их надо: ошибку в превью не видно ни на витрине, ни в
 * сборке, она всплывает уже отправленной ссылкой в чужом чате.
 */
export type MediaUrlResolver = (path?: string | null) => string | null;

const SITE_URL = 'https://www.skufnya.com';

/**
 * Заставка сайта — та же, что в корневом layout. Достаётся в двух случаях: у
 * товара нет пригодной картинки и товар взрослый. Второй случай важнее: его
 * фотографии витрина прячет за возрастным гейтом, и отправлять их в чужой чат
 * мимо гейта нельзя.
 */
const FALLBACK_IMAGE_URL = `${SITE_URL}/opengraph-image.png`;
const FALLBACK_IMAGE_ALT = 'SKUFnya — магазин колекційних фігурок';

/**
 * Telegram показывает в карточке две-три строки, Google обрезает сниппет
 * примерно там же. Всё, что длиннее, читатель превью не увидит нигде.
 */
const DESCRIPTION_LIMIT = 200;

const NAMED_HTML_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
};

/**
 * Описание товара админка хранит как текст, но исторически в нём попадаются
 * куски разметки и сущности. В meta-теге они окажутся видимым мусором, поэтому
 * до атрибута доезжает только плоский текст.
 */
export function toPlainText(value: string | null | undefined): string {
  if (!value) return '';

  return value
    .replace(/<[^>]*>/g, ' ')
    .replace(/&#(\d+);/g, (match, code: string) => {
      const codePoint = Number(code);

      return codePoint > 0 && codePoint <= 0x10ffff
        ? String.fromCodePoint(codePoint)
        : match;
    })
    .replace(
      /&(amp|lt|gt|quot|apos|nbsp);/gi,
      (match, entity: string) => NAMED_HTML_ENTITIES[entity.toLowerCase()] ?? match,
    )
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Обрезка по последнему пробелу, а не по символу: обрубок посреди слова в
 * превью выглядит как ошибка, а посреди суррогатной пары — как сломанный текст.
 * Если пробела в разумной близости нет (длинное слово, ссылка), режем жёстко —
 * это всё равно лучше, чем отдать краулеру абзац целиком.
 */
export function truncateText(value: string, limit: number): string {
  if (value.length <= limit) return value;

  const head = value.slice(0, limit - 1);
  const lastSpace = head.lastIndexOf(' ');
  const body = lastSpace > limit * 0.6 ? head.slice(0, lastSpace) : head;

  return `${body.replace(/[\s.,;:!?…«»"'\-–—]+$/u, '')}…`;
}

function firstNonEmpty(...values: Array<string | null | undefined>): string {
  for (const value of values) {
    const text = toPlainText(value);

    if (text) return text;
  }

  return '';
}

export function buildProductUrl(slug: string): string {
  // `trailingSlash: true` в next.config — канонический адрес обязан совпадать с
  // тем, по которому страница реально лежит, иначе поисковик увидит редирект.
  return `${SITE_URL}/product/${encodeURIComponent(slug)}/`;
}

type PreviewImage = {
  url: string;
  alt: string;
};

/**
 * Картинка превью.
 *
 * Порядок кандидатов не случаен: `ogImage` — JPEG, который API собирает
 * специально для краулеров, а `coverImage` и `images[0]` — тот самый WebP, что
 * показывает витрина. WebP часть мессенджеров молча не отображает (карточка
 * приходит без картинки), поэтому он именно запасной вариант, а не первый.
 */
function pickPreviewImage(
  product: CatalogProductDetail,
  resolveImageUrl: MediaUrlResolver,
): PreviewImage | null {
  const candidates = [
    product.ogImage,
    product.coverImage,
    product.images.find((image) => image.isCover),
    product.images[0],
  ];

  for (const candidate of candidates) {
    const url = resolveImageUrl(candidate?.url);

    // Относительный адрес краулеру бесполезен: он читает HTML, а не браузерный
    // контекст страницы. Такой кандидат пропускаем — заставка сайта честнее.
    if (!url || !/^https?:\/\//i.test(url)) continue;

    return {
      url,
      alt: toPlainText(candidate?.alt) || product.title,
    };
  }

  return null;
}

export type ProductPageMeta = {
  canonicalUrl: string;
  /** Заголовок вкладки и поисковой выдачи; шаблон layout добавит «| SKUFnya». */
  documentTitle: string;
  /** og:title и twitter:title — имя фигурки без хвостов. */
  socialTitle: string;
  description: string;
  image: PreviewImage;
  /** false, когда в превью ушла заставка сайта, а не фотография товара. */
  usesProductPhoto: boolean;
};

export function buildProductPageMeta(
  product: CatalogProductDetail,
  resolveImageUrl: MediaUrlResolver,
): ProductPageMeta {
  const title = toPlainText(product.title);
  const metaTitle = toPlainText(product.metaTitle);
  const series = firstNonEmpty(
    product.series,
    product.franchise?.name,
    product.brand?.name,
  );

  // Заголовок превью — это имя фигурки: «AOI TODO - JUJUTSU KAISEN». Именно его
  // человек ждёт увидеть в чате, а не SEO-формулировку из админки. Она остаётся
  // заголовком вкладки и сниппета, где и должна работать.
  const socialTitle = title || metaTitle || 'Колекційна фігурка';
  const documentTitle = metaTitle || socialTitle;

  const description = firstNonEmpty(
    product.metaDescription,
    product.shortDescription,
    product.description,
  );

  const fallbackDescription = series
    ? `${socialTitle} — колекційна фігурка із ${series} у каталозі SKUFnya.`
    : `${socialTitle} — колекційна фігурка у каталозі SKUFnya.`;

  // Фотографии взрослых товаров витрина закрывает возрастным гейтом. Превью
  // ссылки гейта не знает и разворачивается у всех, кто есть в чате, поэтому
  // сюда такая картинка не попадает ни при каких условиях.
  const previewImage = product.isAdult
    ? null
    : pickPreviewImage(product, resolveImageUrl);

  return {
    canonicalUrl: buildProductUrl(product.slug),
    documentTitle,
    socialTitle,
    description: truncateText(description || fallbackDescription, DESCRIPTION_LIMIT),
    image: previewImage ?? { url: FALLBACK_IMAGE_URL, alt: FALLBACK_IMAGE_ALT },
    usesProductPhoto: previewImage !== null,
  };
}

function getSchemaAvailability(product: CatalogProductDetail): string {
  // Витрина принимает заказ независимо от остатка — фигурки печатаются под
  // заказ, и кнопка «в кошик» активна всегда. Поэтому здесь говорит `saleType`,
  // а не `stockQty`: расходиться со страницей разметка не должна.
  switch (product.saleType) {
    case 'PREORDER':
      return 'https://schema.org/PreOrder';
    case 'BACKORDER':
      return 'https://schema.org/BackOrder';
    default:
      return 'https://schema.org/InStock';
  }
}

/**
 * Product-разметка для поисковиков: цена, наличие и картинка в виде данных, а
 * не вёрстки. Open Graph её не заменяет — он про превью ссылки, эта про
 * расширенный сниппет в выдаче.
 */
export function buildProductJsonLd(
  product: CatalogProductDetail,
  resolveImageUrl: MediaUrlResolver,
): Record<string, unknown> {
  const meta = buildProductPageMeta(product, resolveImageUrl);

  const images = product.isAdult
    ? [meta.image.url]
    : product.images
        .map((image) => resolveImageUrl(image.url))
        .filter((url): url is string => Boolean(url) && /^https?:\/\//i.test(url as string));

  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: meta.socialTitle,
    description: meta.description,
    url: meta.canonicalUrl,
    image: images.length > 0 ? images : [meta.image.url],
  };

  if (product.sku) jsonLd.sku = product.sku;

  const brandName = firstNonEmpty(product.brand?.name, product.franchise?.name);

  if (brandName) {
    jsonLd.brand = { '@type': 'Brand', name: brandName };
  }

  if (product.category?.name) {
    jsonLd.category = product.category.name;
  }

  if (product.priceFrom > 0 && product.currency) {
    jsonLd.offers = {
      '@type': 'Offer',
      price: product.priceFrom,
      priceCurrency: product.currency,
      availability: getSchemaAvailability(product),
      url: meta.canonicalUrl,
    };
  }

  return jsonLd;
}

/**
 * JSON-LD уезжает внутрь `<script>`, где `</script>` в любой строке закрыл бы
 * тег и вывалил остаток разметки в документ. Экранирование `<` закрывает эту
 * дыру и не меняет разбор JSON.
 */
export function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}
