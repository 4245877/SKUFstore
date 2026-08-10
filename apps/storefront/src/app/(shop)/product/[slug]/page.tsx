import { notFound } from 'next/navigation';

import {
  getCatalogProductBySlug,
  getCatalogResinColors,
  type CatalogResinColor,
} from '../../../../lib/api';
import {
  getSnapshotProduct,
  getSnapshotResinColors,
  loadCatalogSnapshot,
} from '../../../../lib/build-snapshot';

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

function loadProduct(slug: string) {
  // Вне Pages-сборки (`output: standalone`) страница рендерится сервером на
  // запрос, и снимка каталога не существует — там работает обычный API-клиент.
  return isPagesBuild ? getSnapshotProduct(slug) : getCatalogProductBySlug(slug);
}

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
      <ProductDetailsClient
        product={product}
        initialResinColors={await loadResinColors()}
      />
    );
  } catch (error) {
    const status = (error as Error & { status?: number }).status;

    if (status === 404) {
      notFound();
    }

    throw error;
  }
}
