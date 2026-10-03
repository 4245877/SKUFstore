# Stage 2B — reviewed product content

UK remains the unprefixed source presentation. English product routes retain the
same slug. The backend stores ProductTranslation separately, exposing approved
content and localization.en.ready/version additively on existing card/detail/export
and favorite responses. No machine translation or source-content backfill occurs.

Ready requires editor publication plus title, short description, full description
and category presentation. Optional SEO falls back only inside English content;
image alt falls back to English title. Optional prose/attributes without translation
are omitted. Proper noun reference labels can retain source names after review.
Variant/color labels are existing reference content; IDs/SKUs/prices never translate.

catalog-policy.ts resolves presentation centrally for static Product HTML and
runtime Home/Catalog/Favorites. UK and source-only EN use source data; unready EN
stays noindex/follow without EN product sitemap or false hreflang. Ready EN is
indexable, self-canonical, has reciprocal UK/EN alternates and localized metadata,
OG/Twitter/JSON-LD. Cart/favorite snapshots retain source presentation and existing
business identity; historical order/configuration snapshots remain unchanged.

One existing coordinated collection carries product data and translations through
the same build snapshot. Initial listing, each detail and final listing must agree
on public identities and English content fingerprints. Invalid publication envelopes
fail the build; workers/atomic writes/build IDs retain their Stage 2 protection.
Both static language documents carry the content-version marker. Hourly/live
reconciliation detects published/withdrawn/edited English content even at a stable
slug. A scheduled build is eventual reconciliation, not atomic publication or an SLA.

English search adds approved title/description to the existing backend query;
source/SKU matching and price/category/availability filters remain unchanged.
Global category-tree and variant/ResinColor reference labels remain source content.
Product-specific category presentation is included in the editorial record.

CI runs isolated synthetic API/build/browser checks before its normal live Pages
build. Synthetic artifacts live in a separate workspace and are never uploaded.
The export guard checks ready/fallback products, SEO, markers, content and commerce
semantics. Real production acceptance cannot claim a translated English product
when live readiness count is zero; editor-provided content is required for that branch.

Locale != ShippingCountry != Currency != Payment. UAH, shipping1500/120/pickup0,
real variant IDs, structured finish/color, server quote/quoteToken/review/retry and
immutable configurations are preserved. No German, EUR or Stage3 work is included.

Operator: edit a saved product's English content panel in the existing admin,
save a draft, fill required fields and explicitly confirm publication. Trigger
Deploy Storefront to GitHub Pages after content publication for immediate SEO
rollout, or wait for successful reconciliation/deployment. Source UK editing is
independent. Publication eligibility is not confirmation of a deployed artifact.

See backend docs/CATALOG_LOCALIZATION.md and the dated Stage2B acceptance report
for endpoints, migration/rollback, exact tests, deployment and remaining editorial work.
