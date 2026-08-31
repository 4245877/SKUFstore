import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildProductJsonLd,
  buildProductPageMeta,
  serializeJsonLd,
  toPlainText,
  truncateText,
} from '../src/lib/product-meta.ts';

/**
 * Превью ссылки не видно ниоткуда, кроме чужого чата: ни витрина, ни сборка о
 * сломанных метаданных не сообщат. Поэтому правила проверяются здесь.
 */

const MEDIA_BASE = 'https://api.skufnya.com';

// Тот же контракт, что у `resolveMediaUrl` из api.ts: путь к загрузке —
// в абсолютный адрес, пустое значение — в null.
const resolveImageUrl = (path?: string | null) =>
  path ? (/^https?:\/\//i.test(path) ? path : `${MEDIA_BASE}${path}`) : null;

function product(overrides: Record<string, any> = {}): any {
  return {
    id: 'p1',
    title: 'AOI TODO - JUJUTSU KAISEN',
    slug: 'aoi-todo-jujutsu-kaisen',
    sku: 'AOT-JJK-RYD-001',
    status: 'ACTIVE',
    description: null,
    shortDescription: null,
    metaTitle: null,
    metaDescription: null,
    isAdult: false,
    saleType: 'IN_STOCK',
    ageRating: 'ALL',
    priceFrom: 3130,
    currency: 'UAH',
    series: 'JUJUTSU KAISEN',
    productType: 'FIGURE',
    coverImage: null,
    ogImage: null,
    images: [],
    variants: [],
    attributes: null,
    ...overrides,
  };
}

function image(overrides: Record<string, any> = {}): any {
  return {
    id: 'i1',
    url: '/uploads/catalog/large/cover.webp',
    alt: null,
    isCover: false,
    storageKey: null,
    ...overrides,
  };
}

describe('заголовок превью', () => {
  it('в чат уходит имя фигурки, а не SEO-заголовок из админки', () => {
    const meta = buildProductPageMeta(
      product({ metaTitle: 'Фігурка Aoi Todo із Jujutsu Kaisen' }),
      resolveImageUrl,
    );

    assert.equal(meta.socialTitle, 'AOI TODO - JUJUTSU KAISEN');
    assert.equal(meta.documentTitle, 'Фігурка Aoi Todo із Jujutsu Kaisen');
  });

  it('без metaTitle заголовок вкладки совпадает с именем фигурки', () => {
    const meta = buildProductPageMeta(product(), resolveImageUrl);

    assert.equal(meta.documentTitle, 'AOI TODO - JUJUTSU KAISEN');
  });
});

describe('описание превью', () => {
  it('metaDescription важнее короткого описания, а оно — важнее полного', () => {
    const full = product({
      metaDescription: 'Мета-опис',
      shortDescription: 'Короткий опис',
      description: 'Повний опис',
    });

    assert.equal(buildProductPageMeta(full, resolveImageUrl).description, 'Мета-опис');

    const withoutMeta = product({
      shortDescription: 'Короткий опис',
      description: 'Повний опис',
    });

    assert.equal(
      buildProductPageMeta(withoutMeta, resolveImageUrl).description,
      'Короткий опис',
    );

    const onlyFull = product({ description: 'Повний опис' });

    assert.equal(
      buildProductPageMeta(onlyFull, resolveImageUrl).description,
      'Повний опис',
    );
  });

  it('пустое описание не оставляет карточку без текста', () => {
    const meta = buildProductPageMeta(product(), resolveImageUrl);

    assert.equal(
      meta.description,
      'AOI TODO - JUJUTSU KAISEN — колекційна фігурка із JUJUTSU KAISEN у каталозі SKUFnya.',
    );
  });

  it('разметка и сущности из описания не доезжают до meta-тега', () => {
    const meta = buildProductPageMeta(
      product({ description: '<p>Фігурка&nbsp;Aoi   &amp; Todo</p>' }),
      resolveImageUrl,
    );

    assert.equal(meta.description, 'Фігурка Aoi & Todo');
  });

  it('длинное описание обрезается по слову и укладывается в лимит', () => {
    const meta = buildProductPageMeta(
      product({ description: 'слово '.repeat(80) }),
      resolveImageUrl,
    );

    assert.ok(meta.description.length <= 200, `довжина ${meta.description.length}`);
    assert.ok(meta.description.endsWith('…'));
    assert.ok(!meta.description.includes('сло…'));
  });
});

describe('картинка превью', () => {
  it('первым берётся og-вариант от API, а не WebP витрины', () => {
    const meta = buildProductPageMeta(
      product({
        ogImage: { url: '/uploads/catalog/og/cover.jpg', alt: null },
        coverImage: { url: '/uploads/catalog/large/cover.webp', alt: null },
        images: [image({ isCover: true })],
      }),
      resolveImageUrl,
    );

    assert.equal(meta.image.url, `${MEDIA_BASE}/uploads/catalog/og/cover.jpg`);
    assert.equal(meta.usesProductPhoto, true);
  });

  it('без og-варианта в ход идёт обложка витрины', () => {
    const meta = buildProductPageMeta(
      product({ images: [image({ isCover: false }), image({ id: 'i2', isCover: true, url: '/uploads/catalog/large/second.webp' })] }),
      resolveImageUrl,
    );

    assert.equal(meta.image.url, `${MEDIA_BASE}/uploads/catalog/large/second.webp`);
  });

  it('alt берётся у картинки, а без него — у товара', () => {
    const withAlt = buildProductPageMeta(
      product({ ogImage: { url: '/uploads/catalog/og/cover.jpg', alt: 'Aoi Todo зблизька' } }),
      resolveImageUrl,
    );

    assert.equal(withAlt.image.alt, 'Aoi Todo зблизька');

    const withoutAlt = buildProductPageMeta(
      product({ ogImage: { url: '/uploads/catalog/og/cover.jpg', alt: null } }),
      resolveImageUrl,
    );

    assert.equal(withoutAlt.image.alt, 'AOI TODO - JUJUTSU KAISEN');
  });

  it('товар без картинок получает заставку сайта', () => {
    const meta = buildProductPageMeta(product(), resolveImageUrl);

    assert.equal(meta.image.url, 'https://www.skufnya.com/opengraph-image.png');
    assert.equal(meta.usesProductPhoto, false);
  });

  it('относительный адрес не уходит краулеру: он читает голый HTML', () => {
    const meta = buildProductPageMeta(
      product({ ogImage: { url: '/uploads/catalog/og/cover.jpg', alt: null } }),
      () => '/uploads/catalog/og/cover.jpg',
    );

    assert.equal(meta.image.url, 'https://www.skufnya.com/opengraph-image.png');
  });

  it('фотография взрослого товара не разворачивается в чужом чате мимо гейта', () => {
    const meta = buildProductPageMeta(
      product({
        isAdult: true,
        ogImage: { url: '/uploads/catalog/og/cover.jpg', alt: null },
        images: [image({ isCover: true })],
      }),
      resolveImageUrl,
    );

    assert.equal(meta.image.url, 'https://www.skufnya.com/opengraph-image.png');
    assert.equal(meta.usesProductPhoto, false);
  });
});

describe('канонический адрес', () => {
  it('совпадает с адресом страницы, включая завершающий слэш', () => {
    const meta = buildProductPageMeta(product(), resolveImageUrl);

    assert.equal(
      meta.canonicalUrl,
      'https://www.skufnya.com/product/aoi-todo-jujutsu-kaisen/',
    );
  });
});

describe('Product-разметка', () => {
  it('несёт цену, наличие и все фотографии товара', () => {
    const jsonLd = buildProductJsonLd(
      product({
        images: [image({ isCover: true }), image({ id: 'i2', url: '/uploads/catalog/large/2.webp' })],
      }),
      resolveImageUrl,
    ) as any;

    assert.equal(jsonLd['@type'], 'Product');
    assert.equal(jsonLd.name, 'AOI TODO - JUJUTSU KAISEN');
    assert.equal(jsonLd.sku, 'AOT-JJK-RYD-001');
    assert.deepEqual(jsonLd.image, [
      `${MEDIA_BASE}/uploads/catalog/large/cover.webp`,
      `${MEDIA_BASE}/uploads/catalog/large/2.webp`,
    ]);
    assert.deepEqual(jsonLd.offers, {
      '@type': 'Offer',
      price: 3130,
      priceCurrency: 'UAH',
      availability: 'https://schema.org/InStock',
      url: 'https://www.skufnya.com/product/aoi-todo-jujutsu-kaisen/',
    });
  });

  it('предзаказ размечается предзаказом, а не наличием', () => {
    const jsonLd = buildProductJsonLd(
      product({ saleType: 'PREORDER' }),
      resolveImageUrl,
    ) as any;

    assert.equal(jsonLd.offers.availability, 'https://schema.org/PreOrder');
  });

  it('товар без цены остаётся без предложения, а не с нулевым', () => {
    const jsonLd = buildProductJsonLd(
      product({ priceFrom: 0 }),
      resolveImageUrl,
    ) as any;

    assert.equal(jsonLd.offers, undefined);
  });

  it('закрывающий тег в данных не может выйти из script', () => {
    const serialized = serializeJsonLd({ name: '</script><img onerror=alert(1)>' });

    assert.ok(!serialized.includes('</script>'));
    assert.equal(JSON.parse(serialized).name, '</script><img onerror=alert(1)>');
  });
});

describe('вспомогательные преобразования текста', () => {
  it('числовые сущности разворачиваются, неизвестные остаются как есть', () => {
    assert.equal(toPlainText('&#1040;&#1073;&unknown;'), 'Аб&unknown;');
  });

  it('короткий текст не трогается', () => {
    assert.equal(truncateText('коротко', 20), 'коротко');
  });

  it('слово длиннее лимита режется жёстко, а не отдаётся целиком', () => {
    const result = truncateText('а'.repeat(50), 10);

    assert.equal(result.length, 10);
    assert.ok(result.endsWith('…'));
  });
});
