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

export function CatalogProductCard({ product }: CatalogProductCardProps) {
  const imageUrl = resolveMediaUrl(product.coverImage?.url);
  const eyebrow = getEyebrow(product);

  const [wished, setWished] = useState(false);

  useEffect(() => {
    setWished(isFavorite(product.id));

    return subscribeToFavoritesChange(() => {
      setWished(isFavorite(product.id));
    });
  }, [product.id]);

  const secondaryMeta = [
    product.character?.name,
    eyebrow === product.brand?.name ? null : product.brand?.name,
  ]
    .filter((value): value is string => Boolean(value))
    .join(' • ');

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

          <div className={styles.cardActions} aria-hidden="true">
            <span className={styles.cardAddBtn}>Докладніше</span>
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

      <button
        type="button"
        className={`${styles.cardWishBtn} ${
          wished ? styles.cardWishBtnActive : ''
        }`}
        onClick={handleWishToggle}
        aria-label={wished ? 'Прибрати з обраного' : 'Додати до обраного'}
        aria-pressed={wished}
      >
        <IconHeart size={15} filled={wished} />
      </button>
    </article>
  );
}
