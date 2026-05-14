import Image from 'next/image';
import Link from 'next/link';

import {
  resolveMediaUrl,
  type CatalogProductListItem,
} from '../../../../lib/api';
import { formatMoney } from '../catalog.utils';
import styles from '../Catalog.module.css';

type CatalogProductCardProps = {
  product: CatalogProductListItem;
};

function getEyebrow(product: CatalogProductListItem) {
  return (
    product.category?.name ?? product.franchise?.name ?? product.brand?.name ?? null
  );
}

function getDisplayPrice(price: CatalogProductListItem['priceFrom']) {
  if (typeof price !== 'number' || Number.isNaN(price)) {
    return price;
  }

  return price;
}

export function CatalogProductCard({ product }: CatalogProductCardProps) {
  const imageUrl = resolveMediaUrl(product.coverImage?.url);
  const eyebrow = getEyebrow(product);

  const secondaryMeta = [
    product.character?.name,
    eyebrow === product.brand?.name ? null : product.brand?.name,
  ]
    .filter((value): value is string => Boolean(value))
    .join(' • ');

  const priceLabel = formatMoney(
    getDisplayPrice(product.priceFrom),
    product.currency,
  );

  return (
    <Link href={`/product/${product.slug}`} className={styles.card}>
      <div className={styles.cardImageWrap}>
        {imageUrl ? (
          <>
            <Image
              src={imageUrl}
              alt=""
              aria-hidden="true"
              fill
              sizes="(max-width: 767px) 50vw, (max-width: 1199px) 33vw, 25vw"
              className={`${styles.cardImageBackdrop} ${
                product.isAdult ? styles.cardImageBlur : ''
              }`}
            />

            <Image
              src={imageUrl}
              alt={product.coverImage?.alt ?? product.title}
              fill
              sizes="(max-width: 767px) 50vw, (max-width: 1199px) 33vw, 25vw"
              className={`${styles.cardImage} ${
                product.isAdult ? styles.cardImageBlur : ''
              }`}
            />

            {product.isAdult ? (
              <div aria-hidden="true" className={styles.cardAdultOverlay} />
            ) : null}
          </>
        ) : (
          <div className={styles.cardImagePlaceholder}>
            <span className={styles.cardImageHint}>Немає фото</span>
          </div>
        )}

        <div className={styles.cardBadges}>
          {product.isAdult ? (
            <span
              className={`${styles.badge} ${styles.badgeAdult}`}
              aria-label="Тільки для повнолітніх"
            >
              18+
            </span>
          ) : null}
        </div>
      </div>

      <div className={styles.cardBody}>
        {eyebrow ? <div className={styles.cardEyebrow}>{eyebrow}</div> : null}

        <h3 className={styles.cardName}>{product.title}</h3>

        {secondaryMeta ? (
          <div className={styles.cardSecondaryMeta}>{secondaryMeta}</div>
        ) : null}

        <div className={styles.cardMeta}>
          <div className={styles.cardPrice}>
            <span>{priceLabel}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}