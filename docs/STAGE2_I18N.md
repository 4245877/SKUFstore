# Stage 2 — English interface and static locale routes

Work in progress. This document is not production acceptance evidence.

## Baseline (2026-09-19 UTC)

- Storefront HEAD: `855b77c37522892084b0989771b9e15a0a62e1ef`; clean tree.
- Backend/admin HEAD: `01f1e757a6513cbb72e66159c224c671ebc5cd5b`; clean tree.
- Production: same storefront SHA, Pages deployment `6531069035`, workflow
  `35383177254`, artifact `10562989675`. Production home bytes match the downloaded
  final Stage 1 artifact. Latest scheduled freshness run `35435017240` succeeded.
- Baseline unit regression: **83 passed / 0 failed / 0 skipped**, 17 suites,
  Node 22. The sandbox stream restriction produces misleading file-level totals;
  the recorded full run is outside that restriction.
- Public export API: 166 products. Every description, short description and SEO
  description contains Cyrillic; 163 SEO titles do too. Most product names and
  franchise/character/brand names are already Latin script, which does not prove
  English editorial readiness. Categories are Ukrainian. See the field audit.
- Local `out/` and snapshot were stale (8 September, 164 products), so neither
  is treated as the production baseline.
- `/checkout/failed`, `/forgot-password`, `/profile/addresses` were placeholders,
  not implemented customer flows. They need honest localized availability copy;
  this stage must not invent password recovery, address persistence or payments.

## Foundation and architecture

Keep Stage 1 strict dictionaries, interpolation validation, publication gate and
path helper. `uk` stays default; `en` becomes published; `de` stays draft. No
browser language, request header, cookie, middleware or market detection.

Two route groups own separate root documents: unprefixed Ukrainian and literal
`en` English. Both use the same document and shared views, with an explicit locale.
Small route wrappers own metadata and static parameters; business logic is shared.
Client context only carries the server-selected locale. Language switches cross
root layouts and perform document navigation, preserving existing shared storage.

Product generation and sitemap use the same validated build snapshot. No schema
change, translation endpoint, separate pricing fetch or second catalog snapshot.

## Catalog policy proposal

Separate route availability from content readiness (Stage 2A / Stage 2B).
Publish an English interface for every public product so browsing, favorites and
checkout remain coherent. Display API content unchanged with an explicit notice.
Until reviewed English catalog content exists, English product pages have a self
canonical and `noindex,follow`, and are omitted from indexable EN sitemap/hreflang.
Translated general pages have reciprocal UK/EN alternates. Do not infer readiness
from ASCII names or automatically translate catalog fields.

This avoids claiming untranslated descriptions are English translations or
competing in search with the existing Ukrainian product pages. Source content,
historical order snapshots and ResinColor names remain data, not UI dictionaries.
Stage 2B should define reviewed translation records and publication requirements
before any migration; no backend contract or DB migration is necessary for 2A.

## Invariants

Locale != ShippingCountry != Currency != Payment. Preserve storage keys, cart
deduplication, real variant IDs, structured finish/color, authoritative quote,
quoteToken review/retry, UAH, shipping 1500/120 and pickup 0. Do not send locale
in registration/order/quote payloads. Registration emails and operational Telegram
messages remain under their existing backend contracts.

## Sources

- [Next.js route groups and multiple root layouts](https://nextjs.org/docs/app/api-reference/file-conventions/route-groups)
- [Next.js static export](https://nextjs.org/docs/app/guides/static-exports)
- [Google localized page alternatives](https://developers.google.com/search/docs/specialty/international/localized-versions)

Implementation, test results and deployment evidence will be recorded after checks.
