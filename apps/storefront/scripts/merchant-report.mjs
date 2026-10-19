// Read-only diagnostics from a completed build.
import fs from 'node:fs';
import { normalizeCatalogProductDetail, resolveMediaUrl } from '../src/lib/api.ts';
import { buildMerchantFeed, buildMerchantSourceState } from '../src/lib/merchant-feed.ts';
import { resolveDefaultProductOffer } from '../src/lib/product-offer.ts';
const snapshot = JSON.parse(fs.readFileSync(process.argv[2] || '.next/cache/skufnya-build/catalog-snapshot.json'));
const products = snapshot.items.map(normalizeCatalogProductDetail);
const feed = buildMerchantFeed(products, snapshot.resinColors, resolveMediaUrl);
const reasons = {};
for (const exclusion of feed.diagnostics.excluded) reasons[exclusion.reason] = (reasons[exclusion.reason] || 0) + 1;
const report = {
  generatedAt: new Date().toISOString(), sourceGeneratedAt: snapshot.generatedAt,
  productCount: products.length, activeVariantCount: products.reduce((sum, product) => sum + product.variants.length, 0),
  includedCount: feed.diagnostics.includedCount, excludedCount: feed.diagnostics.excluded.length,
  reasons, state: buildMerchantSourceState(products, snapshot.resinColors),
  products: products.map(product => {
    const { offer, reason } = resolveDefaultProductOffer(product, snapshot.resinColors);
    return { id: product.id, slug: product.slug, title: product.title,
      feedExclusion: feed.diagnostics.excluded.find(item => item.id === product.id)?.reason ?? null,
      defaultVariantId: offer?.variant.id ?? null, initialPrice: offer?.price ?? null,
      color: offer?.color.slug ?? null, offerIssue: reason,
      imageReviewRequired: !product.attributes?.merchant?.imageStorageKey,
      identifierReviewRequired: !product.attributes?.merchant?.identifierPolicy || product.attributes.merchant.identifierPolicy === 'UNREVIEWED' };
  }),
};
const output = JSON.stringify(report, null, 2) + '\n';
if (process.argv[3]) fs.writeFileSync(process.argv[3], output); else console.log(output);
