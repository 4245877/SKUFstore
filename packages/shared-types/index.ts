export const PRODUCT_STATUSES = ['DRAFT', 'ACTIVE', 'ARCHIVED'] as const;
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

export const SALE_TYPES = ['IN_STOCK', 'PREORDER', 'BACKORDER'] as const;
export type SaleType = (typeof SALE_TYPES)[number];

export const AGE_RATINGS = ['ALL', 'TEEN', 'MATURE', 'ADULT'] as const;
export type AgeRating = (typeof AGE_RATINGS)[number];

export const CURRENCY_CODES = ['UAH', 'USD', 'EUR'] as const;
export type CurrencyCode = (typeof CURRENCY_CODES)[number];

export type ReferenceDto = {
  id: string;
  name: string;
  slug: string;
};

export type ImageDto = {
  id: string;
  url: string;
  storageKey: string;
  alt: string | null;
  sortOrder: number;
  isCover: boolean;
};

export type CategoryDto = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  parentId: string | null;
  sortOrder: number;
  isActive: boolean;
  children?: CategoryDto[];
};

export type ProductVariantDto = {
  id: string;
  name: string;
  sku: string;
  sizeLabel: string | null;
  outfitLabel: string | null;
  faceLabel: string | null;
  resinGrams: number | null;
  price: number;
  currency: CurrencyCode | string;
  stockQty: number;
  reservedQty: number;
  isDefault: boolean;
  isActive: boolean;
  images: ImageDto[];
};

export type ProductCardDto = {
  id: string;
  title: string;
  slug: string;
  sku: string;
  status: ProductStatus;
  isAdult: boolean;
  saleType: SaleType;
  priceFrom: number;
  currency: CurrencyCode | string;
  stockQty: number;
  category: ReferenceDto | null;
  brand: ReferenceDto | null;
  franchise: ReferenceDto | null;
  character: ReferenceDto | null;
  coverImage: ImageDto | null;
};

export type ProductDetailsDto = ProductCardDto & {
  description: string | null;
  shortDescription: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  /** Обложка в формате, который понимают краулеры Open Graph (JPEG). */
  ogImage: ImageDto | null;
  releaseDate: string | null;
  ageRating: AgeRating;
  heightMm: number | null;
  material: string | null;
  countryOfOrigin: string | null;
  manufacturerCode: string | null;
  attributes: Record<string, unknown> | null;
  images: ImageDto[];
  variants: ProductVariantDto[];
};

export type CatalogFilters = {
  q?: string;
  categorySlug?: string;
  brandSlug?: string;
  franchiseSlug?: string;
  characterSlug?: string;
  isAdult?: boolean;
  minPrice?: number;
  maxPrice?: number;
  page?: number;
  limit?: number;
  sort?: 'newest' | 'price_asc' | 'price_desc' | 'title_asc';
};

export type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
  pageCount: number;
};

export type AdminProductListItemDto = ProductCardDto & {
  createdAt: string;
  updatedAt: string;
};
