import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cache } from 'react';

import {
  getCatalogProductBySlug,
  getCatalogResinColors,
  resolveMediaUrl,
  type CatalogProductDetail,
  type CatalogResinColor,
} from '../../../../lib/api';
import {
  getSnapshotProduct,
  getSnapshotResinColors,
  loadCatalogSnapshot,
} from '../../../../lib/build-snapshot';
import {
  buildProductJsonLd,
  buildProductPageMeta,
  serializeJsonLd,
} from '../../../../lib/product-meta';

import ProductDetailsClient from './ProductDetailsClient';

const isPagesBuild = process.env.DEPLOY_TARGET === 'pages';

export const dynamicParams = false;

/**
 * Здесь собирается структура статического экспорта — и здесь же происходит
 * единственный поход в API за каталогом.
 *
 * Фаза `generateStaticParams` не ограничена `staticPageGenerationTimeout`, а
 * рендер каждой страницы товара обязан уложиться в 60 секунд. Пока страницы
 * ходили за товаром сами, полторы сотни запросов упирались в лимит API прямо
 * внутри этих окон, и экспорт падал на случайном товаре. Теперь каталог
 * приезжает одним снимком, а страницам остаётся чтение из него.
 *
 * Заявленные здесь slug — это обязательство: страница будет собрана для
 * каждого из них или сборка упадёт. Тихо потерять товар нельзя.
 */
export async function generateStaticParams(): Promise<Array<{ slug: string }>> {
  if (!isPagesBuild) {
    return [];
  }

  const snapshot = await loadCatalogSnapshot();

  return snapshot.slugs.map((slug) => ({ slug }));
}

/**
 * Товар читают двое: рендер страницы и `generateMetadata`. На Pages это чтение
 * из снимка и стоит оно ничего, а на сервере — сетевой запрос, повторять
 * который на один просмотр незачем.
 */
const loadProduct = cache(
  async (slug: string): Promise<CatalogProductDetail> =>
    // Вне Pages-сборки (`output: standalone`) страница рендерится сервером на
    // запрос, и снимка каталога не существует — там работает обычный API-клиент.
    (isPagesBuild ? getSnapshotProduct(slug) : getCatalogProductBySlug(slug)),
);

/**
 * Склад смолы кладём в статический HTML, чтобы первый кадр уже был верным.
 * Его отсутствие — не ошибка сборки: наличие всё равно перезапрашивается
 * браузером на уже задеплоенной странице, и витрина переживёт это на своём
 * запасном наборе цветов.
 */
async function loadResinColors(): Promise<CatalogResinColor[] | null> {
  if (isPagesBuild) {
    return getSnapshotResinColors();
  }

  try {
    return await getCatalogResinColors({ mode: 'build' });
  } catch (error) {
    console.warn('Failed to load resin colors during build:', error);
    return null;
  }
}

/**
 * Превью ссылки на фигурку.
 *
 * Мессенджеры и поисковики читают именно эти теги, и читают их из готового
 * HTML: JavaScript их краулеры не выполняют, а витрина к тому же экспортируется
 * статикой — рантайма, который мог бы дописать теги позже, у неё просто нет.
 * Поэтому метаданные считаются здесь, на экспорте, из той же карточки товара,
 * что рендерит страницу: разойтись с тем, что видит покупатель, они не могут.
 *
 * Раньше этой функции не было, и на каждый товар уходили теги корневого
 * layout — одна и та же заставка и название магазина на сто с лишним разных
 * ссылок.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;

  let product: CatalogProductDetail;

  try {
    product = await loadProduct(slug);
  } catch (error) {
    // На статическом экспорте промах по снимку — сломанная сборка, и молчать о
    // ней нельзя: молча уехавшая на витрину страница без превью хуже упавшего
    // деплоя. На сервере же 404 — обычный ответ, там страница отдаст not-found
    // с общесайтовыми тегами.
    if (isPagesBuild) throw error;

    if ((error as Error & { status?: number }).status === 404) return {};

    throw error;
  }

  const meta = buildProductPageMeta(product, resolveMediaUrl);

  return {
    title: meta.documentTitle,
    description: meta.description,
    alternates: { canonical: meta.canonicalUrl },
    // Метаданные Next сливает поверхностно: объект `openGraph` со страницы
    // заменяет объект из layout целиком, поэтому siteName и locale приходится
    // повторить — иначе они просто исчезнут со страниц товаров.
    openGraph: {
      type: 'website',
      url: meta.canonicalUrl,
      siteName: 'SKUFnya',
      locale: 'uk_UA',
      title: meta.socialTitle,
      description: meta.description,
      images: [{ url: meta.image.url, alt: meta.image.alt }],
    },
    twitter: {
      card: 'summary_large_image',
      title: meta.socialTitle,
      description: meta.description,
      images: [meta.image.url],
    },
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  try {
    const product = await loadProduct(slug);

    if (!product) {
      notFound();
    }

    return (
      <>
        {/* Product-разметка для расширенного сниппета в выдаче. JSON-LD — это
            данные, а не вёрстка, поэтому React отдаёт их как есть. */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: serializeJsonLd(buildProductJsonLd(product, resolveMediaUrl)),
          }}
        />
        <ProductDetailsClient
          product={product}
          initialResinColors={await loadResinColors()}
        />
      </>
    );
  } catch (error) {
    const status = (error as Error & { status?: number }).status;

    if (status === 404) {
      notFound();
    }

    throw error;
  }
}
