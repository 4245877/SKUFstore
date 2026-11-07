# Storefront improvements — 7 November 2026

Prepared locally from production `325910caed1ef15d4ba3c64653856eed548f7235`.
No push or deployment was performed. The November 4 product purchase information,
variant/color selection, contextual Telegram inquiry and API contracts are retained.

- `shop-contacts.ts` separates the official news channel `https://t.me/skufnya_shop`
  from customer support `https://t.me/SKUFnya_ua`. Existing home/footer/contact
  placements are reused, with UK/EN copy and existing icons.
- Catalog/home failures and cart/checkout quote errors offer manual retry and
  manager/contact links. Failed submission retains cart and checkout draft and
  never navigates to success. A confirmation URL alone no longer claims an order
  was accepted. Existing server quote/idempotency handling is preserved.
- Mobile filters use a native modal dialog, inert background, initial/returned
  focus, explicit Tab boundaries, Escape/backdrop closing and desktop dismissal.
  Catalog and cart have main landmarks. The closed navigation drawer is inert.
- Success overflow was caused by decorative pseudo-elements extending 150 px
  beyond the page, including when navigation was hidden. Their dimensions and
  positions are bounded; global overflow hiding was not introduced.
- Category choices omit explicit `productCount=0`, while the full category tree
  still resolves existing deep links. Database categories are untouched.
- Viber links use the existing encoded phone URI; calls and copy-number fallback
  are separate actions. Technical Default names are replaced only in presentation,
  including inquiry, cart/order subtitles and image alternative text. Stored IDs
  and order configurations are unchanged.

No new dependencies, backend features, migration, offline catalog, service worker
or Telegram widgets/imports are required. These changes can be released against
the current production backend. Admin publication reminders and improved legacy
shipping logs are separate changes in the backend release branch.

## Verification

The isolated CI passed 200 tests, TypeScript, ESLint, frozen dependency audit and
synthetic static export/SEO/XML guards. A full live public catalog build passed
170 UK + 170 EN products, 390 HTML pages. EN indexable=0 and Merchant items=0
reflect current editorial readiness. The synthetic CI separately validates a
nonempty Merchant feed.

Chromium and Firefox passed UK/EN regression at 320/390/430/768/1440 px for
catalog/cart/checkout/contacts/success, keyboard focus, network/timeout/5xx errors,
manual retry/recovery, saved cart/draft and idempotent retry after reload.
The existing product regression passed both browsers, including real public
images, variants, size, color, price, Telegram UTF-8 context, clipboard failure,
persistence and unavailable colors. Actual NovaPoshtaPicker city/branch selection,
Ukrposhta manual input and provider outage fallback also passed local browser tests.
All order/quote requests in browser QA were synthetic; no real order or message
was sent. Physical devices, native Telegram/Viber and Safari require manual QA.

For repeatable local regression against a built Pages export:

```bash
SMOKE_BASE=http://127.0.0.1:54347 \
SMOKE_SNAPSHOT="$PWD/.next/cache/skufnya-build/catalog-snapshot.json" \
SMOKE_OUTPUT=/tmp/skufnya-browser-qa \
SMOKE_BROWSER=chromium \
node --experimental-strip-types test/browser-remaining-improvements.mjs
```

Run from `apps/storefront`. The preview must be on loopback. For Firefox set
`SMOKE_BROWSER=firefox`; an already installed compatible executable can be selected
with `SMOKE_EXECUTABLE`. The script intercepts every API write and never submits
a real order. The separate `browser-product-purchase.mjs` uses the same variables.

## Release and rollback

After owner approval, integrate the prepared commits without rewriting history,
then use the existing manual “Deploy Storefront to GitHub Pages” workflow on main.
Build a fresh snapshot and require export/SEO/XML and production catalog/merchant
freshness checks. No automatic publish trigger or new GitHub secret was added.
Product/price/variant/public color changes still require this manual publication;
the live catalog and quote do not update static HTML on their own.

Smoke UK/EN links, filters, product selection and quote without creating an order.
For rollback, revert only this release's commits, retain the November 4 product and
security fixes, and run the same manual workflow with fresh data. No database
restore or reverse migration is needed. Full owner decisions, category proposals,
backend checks and component-specific release steps are recorded in the backend
`docs/improvements/2026-11-07/REPORT.md` and `RELEASE-PLAN.md`.
