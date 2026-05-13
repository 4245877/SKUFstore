import Link from 'next/link';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';

import {
  getCatalogProductBySlug,
  type CatalogProductsResponse,
} from '../../../../lib/api';

import { AGE_GATE_COOKIE } from '../../../../lib/age-gate';
import ProductDetailsClient from './ProductDetailsClient';
import styles from './ProductDetails.module.css';

const isPagesBuild = process.env.DEPLOY_TARGET === 'pages';

const BUILD_API_BASE =
  (process.env.API_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_URL ?? '').replace(/\/+$/, '');

function buildBuildApiUrl(path: string) {
  if (!BUILD_API_BASE) {
    throw new Error('Set API_INTERNAL_URL or NEXT_PUBLIC_API_URL for pages static export builds');
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  return `${BUILD_API_BASE}${normalizedPath}`;
}

async function fetchBuildJson<T>(path: string): Promise<T> {
  const response = await fetch(buildBuildApiUrl(path), {
    cache: 'force-cache',
  });

  if (!response.ok) {
    const error = new Error(`Build fetch failed for ${path}: ${response.status}`) as Error & {
      status?: number;
    };

    error.status = response.status;

    throw error;
  }

  return (await response.json()) as T;
}

function hasAdultMarker(value: unknown) {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    return value >= 18;
  }

  if (typeof value !== 'string') {
    return false;
  }

  const normalized = value.trim().toLowerCase();

  return (
    normalized === '18+' ||
    normalized === '18' ||
    normalized === 'adult' ||
    normalized === 'adults_only' ||
    normalized === 'adult_only' ||
    normalized === 'nsfw' ||
    normalized.includes('18+') ||
    normalized.includes('для дорослих') ||
    normalized.includes('для взрослых')
  );
}

function isAdultProduct(product: unknown) {
  if (!product || typeof product !== 'object') {
    return false;
  }

  const item = product as Record<string, unknown>;

  const directFields = [
    item.ageRating,
    item.age_rating,
    item.contentRating,
    item.content_rating,
    item.rating,
    item.isAdult,
    item.is_adult,
    item.isAdultOnly,
    item.is_adult_only,
    item.adultOnly,
    item.adult_only,
    item.isNsfw,
    item.is_nsfw,
    item.nsfw,
  ];

  if (directFields.some(hasAdultMarker)) {
    return true;
  }

  if (item.category && typeof item.category === 'object') {
    const category = item.category as Record<string, unknown>;

    if (
      hasAdultMarker(category.slug) ||
      hasAdultMarker(category.name) ||
      hasAdultMarker(category.title)
    ) {
      return true;
    }
  }

  if (Array.isArray(item.tags)) {
    return item.tags.some((tag) => {
      if (typeof tag === 'string') {
        return hasAdultMarker(tag);
      }

      if (tag && typeof tag === 'object') {
        const tagObject = tag as Record<string, unknown>;

        return (
          hasAdultMarker(tagObject.slug) ||
          hasAdultMarker(tagObject.name) ||
          hasAdultMarker(tagObject.title)
        );
      }

      return false;
    });
  }

  if (Array.isArray(item.variants)) {
    return item.variants.some(isAdultProduct);
  }

  return false;
}

export async function generateStaticParams(): Promise<Array<{ slug: string }>> {
  if (!isPagesBuild) {
    return [];
  }

  const result: Array<{ slug: string }> = [];
  let page = 1;

  while (true) {
    const response = await fetchBuildJson<CatalogProductsResponse>(
      `/api/catalog/products?page=${page}&limit=100`,
    );

    result.push(
      ...response.items
        .filter((item) => item.slug)
        .map((item) => ({ slug: item.slug })),
    );

    if (page >= response.meta.pageCount) break;

    page += 1;
  }

  return result;
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

    const productHasAdultContent = isAdultProduct(product);

    /*
      Важно:
      - для обычного Next.js/Docker деплоя здесь работает серверная проверка cookie;
      - для DEPLOY_TARGET=pages серверная cookie-проверка невозможна на статической странице,
        поэтому в pages-сборке этот redirect пропускается.
    */
    if (!isPagesBuild && productHasAdultContent) {
      const cookieStore = await cookies();
      const ageVerified = cookieStore.get(AGE_GATE_COOKIE)?.value === 'true';

      if (!ageVerified) {
        redirect(`/verify?returnTo=${encodeURIComponent(`/product/${product.slug}`)}`);
      }
    }

    return (
      <main className={styles.page}>
        <nav className={styles.breadcrumb} aria-label="Навігація">
          <Link href="/" className={styles.breadcrumbLink}>
            Головна
          </Link>

          <span className={styles.breadcrumbSep}>›</span>

          <Link href="/catalog" className={styles.breadcrumbLink}>
            Каталог
          </Link>

          {product.category ? (
            <>
              <span className={styles.breadcrumbSep}>›</span>

              <Link
                href={`/catalog?categorySlug=${encodeURIComponent(product.category.slug)}`}
                className={styles.breadcrumbLink}
              >
                {product.category.name}
              </Link>
            </>
          ) : null}

          <span className={styles.breadcrumbSep}>›</span>
          <span className={styles.breadcrumbCurrent}>{product.title}</span>
        </nav>

        <ProductDetailsClient product={product} />
      </main>
    );
  } catch (error) {
    const status = (error as Error & { status?: number }).status;

    if (status === 404) {
      notFound();
    }

    throw error;
  }
}