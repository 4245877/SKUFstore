import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  getCatalogProductBySlug,
  type CatalogProductsResponse,
} from '../../../../lib/api';
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

    return (
      <main className={styles.page}>
        <nav className={styles.breadcrumb} aria-label="Навигация">
          <Link href="/" className={styles.breadcrumbLink}>
            Главная
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