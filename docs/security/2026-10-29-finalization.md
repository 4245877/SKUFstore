# Storefront security candidate — 29.10.2026

Changes from the previous local stage are retained: read-only email, safer OAuth linking messages, no automatic POST retries, persistent idempotency key without order PII, per-tab expiring order/draft data and legacy localStorage cleanup.

The catalog now explicitly projects customer fields from both old/new APIs. Manufacturing fields and arbitrary internal attributes are excluded from the static artifact. Existing line/scale/boxIncluded specifications and Merchant settings remain. Merchant configuration is excluded from visible specification rows. Product dispatch estimates use the API's leadTimeDays; missing estimates are confirmed before payment instead of claiming fixed 3/10 days. Existing made-to-order notices and confirmed preorder dates remain.

186 tests, TypeScript and noninteractive ESLint pass. A synthetic Pages export produces 56 HTML pages; UK/EN browser checks, independent XML validation, public artifact checks and empty catalog export pass without production API fetches/writes. Fixtures contain fake manufacturing fields to ensure that old API responses cannot leak them into HTML/RSC/JS.

`security-ci.yml` checks branches without publishing Pages or using credentials. The existing deployment workflow is additionally restricted to main, including manual dispatch. Do not merge/publish this candidate until the backend release prerequisites are satisfied. Production still serves the previous main. No real product descriptions, prices, stock or orders were rewritten.

Full A–G findings, backup verification, owner-only steps, image preparation, production gates and rollback are in the backend checkout's `docs/security/2026-10-29-finalization.md`. Actual commit/CI status is recorded in the backend release-status JSON. The backend continues to use its existing remote; historical secrets must be rotated before any history cleanup.
