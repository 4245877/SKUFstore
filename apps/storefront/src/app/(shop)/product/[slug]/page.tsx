import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCatalogProductBySlug } from '../../../../lib/api';
import ProductDetailsClient from './ProductDetailsClient';
import styles from './ProductDetails.module.css';

type PageProps = {
  params: {
    slug: string;
  };
};

export default async function ProductPage({ params }: PageProps) {
  let product;

  try {
    product = await getCatalogProductBySlug(params.slug);
  } catch (error) {
    const status = (error as Error & { status?: number }).status;
    if (status === 404) notFound();
    throw error;
  }

  if (!product) notFound();

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
}