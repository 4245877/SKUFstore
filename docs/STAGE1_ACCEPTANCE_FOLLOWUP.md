# Stage 1 acceptance follow-up: catalog queries and Pages freshness

This change stays within Stage 1. Ukrainian URLs remain unprefixed; no EN/DE routes,
translations, currency, shipping, payment or backend pricing changes are included.

## Catalog hydration

GitHub Pages returns the same `catalog/index.html` for every query. With
`dynamic = 'force-static'`, the prerendered `useSearchParams()` is empty. Previously
`CatalogPageClient` used the browser query on its first render, including in its
loading sidebar. `HiddenQueryInputs` inserted `sort`, `q`, `minPrice` or `maxPrice`
inputs where the HTML had none. React 19 reported #418 and regenerated the boundary.
The heading initially remained `Каталог товарів`; sorting and pagination controls
appear only after loading, so they were not the first mismatch.

The first client render now uses the prerender's empty query. A mount effect then
applies `useSearchParams()` and enables the existing API loading effect. This keeps
static heading/sidebar/loading HTML, avoids an unnecessary unfiltered API request,
and preserves deep links, filters, sorting, history and query normalization. It
uses neither `suppressHydrationWarning` nor a client-only page.

`next dev` does not reproduce the actual Pages behavior: it sees each request's
query. The browser regression must run against `out/`. It rejects every page error,
hydration/#418 message, console error and failed HTTP response. Eight scenarios
cover the five mandatory direct loads, combined-query pagination/reload/history,
sort/filter GET submission and search GET submission. Fixture responses assert
exact displayed products and backend-provided prices; live mode uses the public API.

## Build consistency versus production freshness

A product is public when `status=ACTIVE` and at least one variant is active.
Admin create/update (or activating a variant / changing an existing slug) can change
this set without a storefront commit. Admin defaults a new product to ACTIVE.
The backend has no catalog-to-GitHub dispatch/webhook. The previous Pages workflow
ran only on matching main pushes or manual workflow dispatch. Every new public slug
could therefore be visible in live cards while its product page was absent until
the next build; a successful snapshot/export guard did not prevent this drift.

The build guard continues to check every snapshot product against the export.
The new read-only freshness script separately reads the current paginated API,
compares slug identities with the deployed sitemap (not just counts), and checks
HTTP 200, product canonical and Product JSON-LD for every live product. It reads
the catalog again after page checks and refuses a green result if the set changed.
Missing, renamed and removed slugs, duplicate/truncated listings and soft 404s are
covered by regression tests. API/network failure fails the check instead of being
interpreted as an empty catalog. Product field edits under an unchanged slug are
outside this URL-availability check; it is not a content-version audit.

The existing workflow now:

- checks freshness after Pages publication; failure means the deployment happened
  but production acceptance failed;
- runs reconciliation at minute 17 each hour; healthy production ends after the
  read-only check, while URL drift invokes the existing build/export/deploy path;
- runs the browser regression on the export before uploading the Pages artifact.

No backend changes, secrets, new token grants or external service are needed.
Scheduled Actions can be delayed or unavailable, and API downtime/build failure
leaves the last successful artifact. This is eventual reconciliation, not atomic
publication and not a hard one-hour SLA. A product can still have a temporary 404
between becoming public and the next successful build.

For immediate publication, run the existing `Deploy Storefront to GitHub Pages`
workflow on main after the admin change and wait for its production freshness step.
A backend repository/workflow dispatch would shorten the interval but requires a
scoped credential, reliable delivery/retries and operational ownership; recommend
it as a separate follow-up. A strict guarantee that a public card can *never*
precede its page additionally requires coordinated publication or serving only
artifact-backed product links. Dispatch alone cannot make publication atomic.

Manual read-only check (Node 22, no dependency install needed):

```sh
node apps/storefront/scripts/catalog-freshness.mjs
```

Browser check after a Pages build and serving `out` at port 54332:

```sh
cd apps/storefront
pnpm exec playwright install chromium
node test/browser-catalog-hydration.mjs
```

Production read-only catalog browser check:

```sh
SMOKE_BASE=https://www.skufnya.com CATALOG_API_MODE=live node test/browser-catalog-hydration.mjs
```

The live catalog check blocks writes and stubs only analytics and guest auth. Final
order submission and payments are never part of production acceptance. Existing
Stage 0 stale-quote/retry/order-confirmation coverage uses an isolated fixture API.
