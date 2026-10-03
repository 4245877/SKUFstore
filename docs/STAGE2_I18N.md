# Stage 2 — English interface and static locale routes

Implementation and acceptance are tracked separately. This document describes the Stage 2A policy and implementation; deployment evidence belongs in the dated acceptance report.

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

## Catalog policy — Stage 2A

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


## Recovery and completion review (2026-10-03)

The previous chat initially found Stage 2 already committed and pushed in eight
storefront commits after Stage 1. Storefront and remote main
were `8c6a0164421b9b8a595221844f067f71d774fe08`; backend/admin and remote main were
`01f1e757a6513cbb72e66159c224c671ebc5cd5b`. At that initial recovery both trees were
clean. This final continuation recovered 40 unstaged tracked changes and four
untracked implementation/test files in storefront, with nothing staged, no stashes
and no branch divergence; backend/admin remained clean. All continuation changes
were preserved and reviewed before further edits. Existing production already served both locale trees: workflow
`36922843299`, Pages deployment `6794758479`, artifact `11193210023` (no longer
available for download at recovery). Live catalog contained 170 public products.

### Build snapshot coordination

The primary Next CLI process creates one process-stamped catalog build ID, ignoring
an inherited ID from an older invocation. Subsequent config evaluations inside that
process retain it; webpack workers inherit it and static workers use the compiled ID.
Every new CLI build has a new ID. This matters because Next 15 evaluates its config
more than once: generating a UUID on every evaluation can give required-server-files,
server bundles and the snapshot different IDs even when next build succeeds.

Workers use a build-specific directory and an exclusive filesystem writer lock.
Snapshot and completion writes are atomic. Readers validate the snapshot, its build
ID, and completion result; failures never reuse an older snapshot. Different builds
cannot overwrite worker inputs. The fixed catalog-snapshot.json remains an atomic
completed-build mirror for CI only. The export guard additionally ties it to the
compiled config and compares the mirror with the isolated payload/result.
Completed/failed unlocked cache runs older than a day are pruned. A crashed writer's
lock fails its run with a bounded timeout; a fresh build uses a fresh ID and recovers.
Active and ambiguous cache directories are preserved rather than deleted underneath
another process. No coordination file becomes a browser/runtime dependency.

One collection uses the existing validated listing/detail pipeline: two listing
requests for 170 products, one detail request per product, and one resin-color
request. UK, EN, metadata and sitemap reuse its result. This is one collection,
not a claim that the existing pipeline uses one HTTP request.

Freshness now checks physical UK and EN product routes, document language,
canonical, Product JSON-LD, UK index/EN noindex and untranslated SEO exclusion.
It distinguishes 170 available EN buying routes from zero EN indexable translations.
Scheduled reconciliation and postdeployment acceptance use the same policy.

### Customer presentation

Strict UK/EN dictionaries cover 1119 matching messages. Catalog content and historical
order snapshots remain source data. Structured finish labels are translated only at
display; original snapshots, color names, variant names and stored financial data stay
unchanged. Customer dates, counts, statuses, payment labels and ambiguous-cart guidance
are localized. Before a quote is available, current structured cart selections
translate only their generated finish/stock suffix at display, including quote failures
after UK/EN switching. Cart storage and source/historical text remain intact. Known
backend error codes have actionable copy; unknown/prototype codes
have safe generic copy without displaying transport messages.

Compact switcher labels are UK/EN. The global static 404 explicitly links to the
target language's published home before and after hydration, including unknown and
reserved-prefix paths. Service/internal routes are rejected by the switcher. Ordinary
published pages preserve their semantic path, query and fragment. The root metadata
base is the production origin, including Next's generated 404 OpenGraph image.
The global static-host 404 remains the Ukrainian document; EN existing routes carry
the English document. Browser language does not choose either locale.

Ukrainian content corrections: delivery promises now describe the actual Ukrainian
1500/120/pickup policy; unsupported coupon/15% promises were replaced with available
support actions; the unused newsletter checkbox became an actual Telegram link;
English technical page eyebrows and internal customer-facing notes were removed or
localized. These changes add no discount, delivery, payment or subscription backend.

Stage 2 checks include unit/presentation/coordinator/freshness regression, typecheck,
Pages export validation, both browser-language configurations, direct catalog queries,
shared cart/favorites, read-only live quotes and fixture checkout/review/retry. DB-writing
integration tests and real orders/payments are not part of production smoke. There is
no configured standalone ESLint check; the inherited lint command opens an interactive
setup prompt. Exact results and final deployment IDs must be recorded after acceptance.
