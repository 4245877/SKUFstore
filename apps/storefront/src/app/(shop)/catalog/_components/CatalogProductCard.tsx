'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState, type MouseEvent } from 'react';

import { IconHeart } from '../../../../components/icons';
import {
  resolveMediaUrl,
  type CatalogProductListItem,
} from '../../../../lib/api';
import {
  addFavorite,
  isFavorite,
  removeFavorite,
  subscribeToFavoritesChange,
} from '../../../../lib/demo-store';
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

/* Категорія і персонаж в одному рядку: одна службова стрічка замість двох. */
function getMetaLine(product: CatalogProductListItem) {
  const parts = [getEyebrow(product), product.character?.name ?? null].filter(
    (value): value is string => Boolean(value),
  );

  return Array.from(new Set(parts)).join(' · ');
}

export function CatalogProductCard({ product }: CatalogProductCardProps) {
  const imageUrl = resolveMediaUrl(product.coverImage?.url);
  const metaLine = getMetaLine(product);

  const [wished, setWished] = useState(false);

  useEffect(() => {
    setWished(isFavorite(product.id));

    return subscribeToFavoritesChange(() => {
      setWished(isFavorite(product.id));
    });
  }, [product.id]);

  const priceLabel = formatMoney(product.priceFrom, product.currency);

  function handleWishToggle(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();

    if (wished) {
      removeFavorite(product.id);
      return;
    }

    addFavorite({
      productId: product.id,
      slug: product.slug,
      title: product.title,
      series:
        product.series ??
        product.franchise?.name ??
        product.brand?.name ??
        null,
      priceFrom: product.priceFrom,
      currency: product.currency,
      isAdult: product.isAdult,
      coverImage: product.coverImage,
    });
  }

  return (
    <article className={styles.card}>
      <Link href={`/product/${product.slug}`} className={styles.cardLink}>
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

          {product.isAdult ? (
            <div className={styles.cardBadges}>
              <span
                className={`${styles.badge} ${styles.badgeAdult}`}
                aria-label="Тільки для повнолітніх"
              >
                18+
              </span>
            </div>
          ) : null}
        </div>

        <div className={styles.cardBody}>
          <div className={styles.cardEyebrow}>{metaLine}</div>

          <h3 className={styles.cardName}>{product.title}</h3>

          <div className={styles.cardFooter}>
            <span className={styles.cardPrice}>{priceLabel}</span>
          </div>
        </div>
      </Link>

      <button
        type="button"
        className={`${styles.cardWishBtn} ${
          wished ? styles.cardWishBtnActive : ''
        }`}
        onClick={handleWishToggle}
        aria-label={wished ? 'Прибрати з обраного' : 'Додати до обраного'}
        aria-pressed={wished}
      >
        <IconHeart size={16} filled={wished} />
      </button>
    </article>
  );
}
