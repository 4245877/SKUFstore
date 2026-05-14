import { notFound } from 'next/navigation';

import {
  getCatalogProductBySlug,
  type CatalogProductsResponse,
} from '../../../../lib/api';

import ProductDetailsClient from './ProductDetailsClient';

const isPagesBuild = process.env.DEPLOY_TARGET === 'pages';

export const dynamicParams = false;

const BUILD_API_BASE =
  (process.env.API_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_URL ?? '').replace(/\/+$/, '');

const BUILD_PRODUCTS_PAGE_SIZE = 100;

function buildBuildApiUrl(path: string) {
  if (!BUILD_API_BASE) {
    throw new Error('Set API_INTERNAL_URL or NEXT_PUBLIC_API_URL for pages static export builds');
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  return `${BUILD_API_BASE}${normalizedPath}`;
}

async function fetchBuildJson<T>(path: string): Promise<T> {
  const url = buildBuildApiUrl(path);
  let lastError: unknown;

  for (let attempt = 1; attempt <= 8; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8_000);

    try {
      const response = await fetch(url, {
        cache: 'force-cache',
        signal: controller.signal,
      });

      if (!response.ok) {
        const error = new Error(`Build fetch failed for ${path}: ${response.status}`) as Error & {
          status?: number;
        };

        error.status = response.status;

        throw error;
      }

      return (await response.json()) as T;
    } catch (error) {
      lastError = error;

      if (attempt < 8) {
        const status = (error as Error & { status?: number }).status;
        const delayMs =
          status === 429
            ? Math.min(5_000 * attempt, 30_000)
            : Math.min(1_500 * attempt, 10_000);

        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  throw lastError;
}

export async function generateStaticParams(): Promise<Array<{ slug: string }>> {
  if (!isPagesBuild) {
    return [];
  }

  const slugs = new Set<string>();
  let page = 1;
  let pageCount = 1;

  try {
    do {
      const response = await fetchBuildJson<CatalogProductsResponse>(
        `/api/catalog/products?page=${page}&limit=${BUILD_PRODUCTS_PAGE_SIZE}`,
      );

      for (const item of response.items) {
        const slug = item.slug?.trim();

        if (slug) {
          slugs.add(slug);
        }
      }

      pageCount = Math.max(1, response.meta.pageCount ?? 1);
      page += 1;

      if (page <= pageCount) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    } while (page <= pageCount);
  } catch (error) {
    console.warn(
      'Failed to generate product static params during pages build:',
      error,
    );

    throw error;
  }

  return Array.from(slugs)
    .sort()
    .map((slug) => ({ slug }));
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  try {
    const product = await getCatalogProductBySlug(slug);

    if (!product) {
      notFound();
    }

    return <ProductDetailsClient product={product} />;
  } catch (error) {
    const status = (error as Error & { status?: number }).status;

    if (status === 404) {
      notFound();
    }

    throw error;
  }
}