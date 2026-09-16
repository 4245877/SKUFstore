# Stage 1 — Locale / i18n foundation

Дата аудита: 2026-09-16 UTC. Production не изменялся. Область реализации — storefront и документация. Полный перевод страниц, locale routes, переводы каталога, доставка/валюта/платежи других стран не входят в этот этап.

## A. Baseline

Изучены backend `docs/STAGE0_CORRECTNESS.md`, `docs/VARIANT_PRICING.md`, `docs/releases/STAGE0_PRODUCTION_20260910.md`, source и CI обоих репозиториев.

Фактический baseline отличается от отчёта 10 сентября:

- Backend HEAD `7ce9719b255ab2539e2cb0f12899f2e5241551c6`, рабочее дерево чистое. Более поздний commit централизовал variant pricing и добавил pricing summary.
- Storefront HEAD `dea63ae22942b7a0af9d6e7213917b47cd4adc06`. Уже были незакоммиченные изменения: `CatalogProductCard.tsx`, `catalog.utils.ts`, `favorites/page.tsx`, `HomePageClient.tsx`, `lib/api.ts`, `lib/demo-store.ts`, новый `lib/product-price.ts`. Это работа по отображению «від»; Stage 1 её не редактирует и не включает в свой commit.
- Фактический API image id `sha256:6ee5008417591383ded85ac34037d3533c94f7a24d4e568d2bd89a45fe9c19d5`, admin `sha256:98fa3f3c5e16386fbd87024cab6906fadfb6f08aaedbbe5ec4d41398b00d0984`; контейнеры созданы 13 сентября 2026, healthy, используют base `ops/docker-compose.yml`. Это уже не pinned Stage 0 images из отчёта 10 сентября. Старый overlay нельзя считать актуальным способом восстановления нынешнего backend без отдельной сверки.
- Read-only SQL подтвердил применённую `20260907120000_order_item_configuration`. Историческая отсутствующая в repo `20260402122323_add_home_quality_fields` остаётся в истории. Историческая rolled-back запись не является новым failed migration.
- Публичная shipping policy: UAH / 1500 / 120; pickup в коде server pricing = 0. Публичный sitemap теперь 173 URL; оба build snapshot содержат 165 products, а не 164.
- Baseline: 56/56 frontend tests, TypeScript, production static export. Начальный sandbox запуск ошибочно показывал только 6 test files из-за stream-fd ограничений; зачтён полноценный запуск Node 22 вне этого ограничения.

## B. Findings

### Storefront

AST inventory нашёл **1313 occurrences кириллических literals в 41 source file**, без комментариев. Полная карта файлов и строк: [STAGE1_STRING_INVENTORY.md](STAGE1_STRING_INVENTORY.md). Это occurrence count, не число уникальных переводов; сюда также входят значения fallback-данных и смешанные русские тексты.

| Область | Найденные assumptions / граница миграции |
| --- | --- |
| Header/Footer/navigation | Labels, объявления, search placeholders, mobile controls, aria-label, copyright и сервисные badges встроены в UI. Stage 1 переносит их в dictionary; японские декоративные подписи, бренды, контакты и URL остаются данными дизайна. |
| Home/catalog | Hero/promos, loading/empty/error states, сортировка, filters, pagination, карточки, категории и currency presentation. UI смешан с API-driven контентом. Page bodies пока не переносились. |
| Product | Variant/color/quantity labels, tabs, breadcrumbs, toast, aria, availability и fallback resin names встроены в client. Настоящие title/description/variant/color names — контент API, не dictionary keys. |
| Favorites/cart/checkout | Buttons, empty/error/loading/validation, delivery/payment labels, Nova Poshta search, подтверждение и ошибки quote. Серверные enum и поля request не переводятся. Stage 0 финансовые модули оставлены побайтово прежними. |
| Profile/orders/auth/age gate | Account guards, формы, ошибки, статусы, order details, loading и badges. Есть русский текст, включая профиль и login guard; автоматическая смена языка была бы изменением baseline. |
| Content pages | Delivery/payment/returns/FAQ/privacy/terms/contacts/data deletion — преимущественно длинный текст и локальные metadata; остаются отдельной задачей переводов. |
| Formatting | `uk-UA`, `uk`, `uk_UA` в Intl, сортировке избранного и поиске Nova Poshta; UAH narrowSymbol защищает SSR hydration. Не заменяем эти вызовы вместе с i18n foundation. |
| SEO | Root metadata + home overrides (частично русские); только product `generateMetadata` задаёт explicit canonical. Не добавляем root canonical всем страницам: это могло бы ошибочно канонизировать весь сайт на `/`. Product JSON-LD берёт валюту/цену из API. |

Route groups `(shop)`, `(account)`, `(content)`, `(auth)` не участвуют в URL. `product/[slug]` — единственный каталоговый dynamic route: `dynamicParams=false`, `generateStaticParams` читает snapshot. `/catalog` использует query filters, отдельного category route tree нет. Детали заказа экспортируются как `/profile/orders/details/?id=…`.

Next.js **15.0.0**, React 19, App Router. `DEPLOY_TARGET=pages` включает `output: export`, `trailingSlash: true`, unoptimized images; GitHub Pages получает `out/`. RSC/root metadata выполняются при сборке; Client Components тоже prerendered, а после hydration работают с API/localStorage. Перевод не должен зависеть от navigator, cookies, pathname side effects или middleware.

`build-snapshot.ts` собирает paginated listing и product details с rate-limit pacing; sitemap читает те же проверенные slugs. В нынешнем backend уже есть `/api/catalog/products/export`, но storefront его не использует. Комментарий snapshot «массовой выгрузки у API нет» и соответствующее старое объяснение в Stage 0 устарели; pipeline на этом этапе не меняется.

### Backend / notifications / admin

- Catalog DTO: product/category/franchise/brand/character names, descriptions, SEO fields, media alt, variant names, size/outfit/face labels и ResinColor.name — управляемый контент. Переводы каталога впоследствии потребуют отдельного контракта и политики отсутствующих переводов, а не поиска строк в UI dictionary.
- Enum/code: order status, finish `MONO`, delivery/payment method, product/sale type и API error code остаются стабильными машинными значениями. Frontend сможет переводить подписи к кодам. Backend message сейчас иногда показывается покупателю напрямую и бывает uk/en; его массовая замена вне scope.
- `ServiceError` содержит code/status/message/details. Будущий EN rollout должен включить явное отображение известных error codes в UI и безопасную политику неизвестных ошибок. Stage 1 не переопределяет сообщения сервера.
- Order snapshot — исторический факт: variant identity/SKU/name, finish code+label, color id/slug/name/hex/priceDelta, currency и applied amounts. Не переводить сохранённые labels задним числом, не включать UI locale в quoteToken и не переписывать snapshot.
- Registration mailer отправляет украинский customer-facing email. Telegram worker формирует украинские operational order notifications из snapshot. Их язык/контракт позже рассматривается отдельно; storefront locale ещё не передаётся в заказ или регистрацию.
- Admin DTO содержит status label и snapshot; admin использует свои подписи. Vite admin и schema не нуждаются в изменении ради storefront foundation. Admin не локализован этим этапом.

## C. Design

Без новой библиотеки: foundation — синхронные чистые TypeScript modules, пригодные для RSC, client и Node tests. Никаких middleware, request headers, cookie negotiation, redirects, provider state или клиентского определения языка. Это соответствует ограничениям [Next static export](https://nextjs.org/docs/app/guides/static-exports); паттерн dictionaries согласуется с [Next internationalization guide](https://nextjs.org/docs/app/guides/internationalization), но не переносит текущие пути в `[lang]`.

- `SUPPORTED_LOCALES = ['uk','en','de']`, canonical `Locale`, `DEFAULT_LOCALE='uk'`; `PUBLISHED_LOCALES=['uk']` отдельно. `parseLocale` принимает только точное значение, остальные отклоняет.
- `LOCALE_PRESENTATION` хранит только language tag/OG locale. Регион в BCP47/OG — convention отображения, не ShippingCountry и не Market.
- `uk.ts` — полный dictionary **для мигрированного scope**, dotted semantic keys, текст дословно сохранён. `Dictionary` требует все keys; `Translator` типизирует keys и параметры `{amount}`, `{count}`, `{title}`, `{series}`.
- Каждый опубликованный dictionary проверяется на missing/blank/extra keys и совпадение interpolation placeholders, затем замораживается. Runtime lookup также бросает ошибку при неизвестном key или некорректных params. Нет fallback на uk/en, возврата key как текста, пустой строки или машинного перевода.
- `en.ts` / `de.ts` — пустые типизированные authoring spaces, не импортируются production registry. Их нельзя показать пользователю вызовом `getTranslator('en')`: он бросит `Locale is not published`.
- Server: `getTranslator(locale)` непосредственно в render/metadata helper; Header получает сериализуемый locale prop. Client: тот же pure getter с тем же locale. Нет asynchronous language flash, разных server/client defaults или новых storage keys.
- `buildLocalizedPath({locale,path})` принимает внутренний **непрефиксный** href и сохраняет slash/query/hash дословно. Canonical callers передают trailing slash; обычные существующие Link href сохраняются как были. External/API/media URLs не пропускаются через него; Next Link по-прежнему отвечает за deployment basePath.
- Непубликованные locale отклоняются route helper: Stage 1 не создаёт даже случайных ссылок на `/en` или `/de`. Non-default prefix branch подготовлен, но станет доступен только при отдельном разрешении публикации и создании реальных страниц Stage 2.

Пример постепенной миграции:

```tsx
const t = getTranslator(locale);
return <button aria-label={t('header.cartCount', { count })}>{t('nav.cart')}</button>;
```

При добавлении page namespace сначала сохранить исходную uk-строку в `uk.ts`, затем заменить только presentation. Не передавать translator в pricing, payload, storage keys или enum identifiers. Не использовать dictionary для title/description товара. На Stage 2 можно передавать по дереву locale prop либо scoped messages; сейчас глобальный provider не нужен.

## D. Changes

- `src/i18n/locales.ts`, `paths.ts`, `translate.ts`, `dictionaries/{uk,en,de}.ts` — типы, publication gate, route helper, строгий translator и словари.
- `src/components/layout/{Header,Footer}.tsx` — текст, accessible labels и shared links через foundation; бизнес-логика counters/auth/search/policy сохранена.
- `src/app/{layout,page,not-found}.tsx` — language/OG defaults, metadata и 404 copy.
- `src/lib/product-meta.ts`, `src/app/(shop)/product/[slug]/page.tsx` — locale-aware SEO helper и OG convention; прежние product content, JSON-LD offers и canonical output.
- `src/lib/sitemap-urls.ts` — те же paths через единый helper, без добавления locale alternatives.
- `test/i18n.test.ts` — 12 tests плюс compile-time negative contracts.
- `test/verify-stage1-export.mjs` — реальный export/sitemap/canonical/lang guard; optional comparison metadata/JSON-LD с baseline.
- `test/browser-stage1.mjs` — browser fixture smoke; профиль, favorites, selection, quote, stale retry и checkout. Каждый API ответ локальный.
- `.github/workflows/deploy-storefront.yml` — unit tests перед build и export guard до публикации artifact. Сам workflow не запускался удалённо; push не выполнялся.
- Этот отчёт, inventory и обезличенные verification evidence. Lockfile/dependencies не менялись.

## E. URL compatibility

Сохранены `/`, `/catalog`, `/product/{slug}/` и все остальные существующие пути, query strings и fragments. Никакого `/uk` prefix. Header/Footer links после hydration совпали с baseline. Полные наборы экспортированных HTML и sitemap совпали. Product canonical совпали для всех 165 товаров, включая прежнее percent encoding. Route tree и `generateStaticParams` не изменялись.

## F. Locale independence

Нет Market, currency selector, country selector, GeoIP и locale redirects. Locale не передаётся в API DTO, cart serialization, quote request, checkout payload, quoteToken, shipping policy или payment method. В browser с `de-DE` и `en-US` язык сайта остался `uk`, payload остался UAH, pickup = 0, policy 1500/120. Проверены реальные request bodies из browser; они полностью совпали с baseline.

## G. SEO

Baseline и Stage 1: 165 product pages, 8 static sitemap paths = **173 URL**, **191 HTML-файл**. Все URLs имеют экспортированный HTML. Sitemap byte-identical; metadata, canonical, OG, Twitter, JSON-LD по всем HTML совпадают. Rendered text, internal/external links, aria labels, placeholders и alt также совпали. Нет hreflang или несуществующих alternate-language URLs. Robots, build snapshot validation, image policy, Next config и sitemap route не изменены.

## H. Verification

Результаты и команды — [evidence](stage1-20260916/verification.json). Node 22 использован как в CI.

- Baseline **56/56** tests, после foundation **68/68**, **16 suites**. Добавлены default/published locales, invalid locale rejection, URL/query/fragment compatibility, canonical encoding, sitemap, Ukrainian output, unavailable dictionaries, key/placeholder validation, missing-key failure, raw interpolation и immutability.
- Чистый HEAD + только Stage 1 (без исходных price-display changes): также **68/68** и typecheck.
- TypeScript проверяет также `@ts-expect-error` contracts: unknown key, missing/wrong/extra interpolation и incomplete dictionary. Обычный `next build` повторяет type validation.
- Production `DEPLOY_TARGET=pages next build` и static export успешны. Изолированные сборки получили live public snapshot read-only; существующие незакоммиченные price-display changes включены в рабочий baseline и candidate одинаково, но не в Stage 1 commit.
- Chromium: home, desktop search, catalog, mobile menu, product, non-default variant, two colors, guest favorites persistence, cart, checkout pickup, synthetic 409, reviewed retry, confirmation, authenticated profile/orders/details.
- Точные cart lines, 4 quote request bodies, 2 checkout request bodies (stale и retry), saved confirmation и shared UI совпали с baseline. Нет locale/country/market в финансовых payload. Реальных заказов, внешних уведомлений и оплат не было.
- Page/hydration errors: 0. Expected HTTP: guest 401, fixture stale quote 409. **Прежний** profile link prefetch 404 воспроизводится в обоих build и сохранён как remaining risk; утверждать «вообще нет console errors» было бы неверно.
- Backend/admin source побайтово не менялся; их tests/build не перезапускались. Production SELECT не изменяет БД.
- Отдельного настроенного ESLint suite в проекте по-прежнему нет. Browserslist database warning не блокирует сборку; зависимости не обновлялись.

Повторение unit/export проверки:

```bash
pnpm --filter storefront test
pnpm --filter storefront typecheck
DEPLOY_TARGET=pages NEXT_PUBLIC_API_URL=https://api.skufnya.com pnpm --filter storefront build
cd apps/storefront
node --experimental-strip-types test/verify-stage1-export.mjs
# Optional: EXPORT_BASELINE=/path/to/baseline/out node --experimental-strip-types test/verify-stage1-export.mjs
```

Browser script запускается против локального static server (`SMOKE_BASE`) и `.next/cache/skufnya-build/catalog-snapshot.json` (`SMOKE_SNAPSHOT`). Playwright — опциональная test-environment dependency: `PLAYWRIGHT_MODULE` принимает путь к установленному модулю, `CHROMIUM_EXECUTABLE` — существующий browser, `SMOKE_OUTPUT` — output JSON. В этой сессии использована уже установленная test tooling, без изменения package/lockfile.

## I. Database/backend/admin impact

DB/schema/migrations, backend API, admin, notification worker, shared catalog DTO и pricing не изменены. Новых migrations нет, `migrate deploy/reset/resolve` не выполнялись. Никакого production restart/recreate/deployment. Locale живёт в storefront, так как сейчас только он имеет эту ответственность; дублировать новый тип в неиспользуемых backend DTO не требуется.

## J. Remaining risks / deployment / rollback

1. Изолированная проверка подтверждает foundation, а не качество EN/DE перевода: они намеренно не опубликованы. Большинство page bodies остаётся hardcoded; inventory — последовательный backlog Stage 2. Декоративные японские подписи сохранены.
2. Профиль содержит прежний href `/profile/orders/{id}` вместо экспортированного `/profile/orders/details/?id=…`; browser фиксирует его RSC prefetch 404. Исправить отдельно до расширения маршрутов. Правильная details page прошла smoke.
3. Смешанные uk/ru тексты, прямое отображение backend messages, email language и catalog translation contract требуют отдельного решения перед EN rollout. Stage 1 сохраняет их ради backward compatibility.
4. Read-only аудит migrations подтвердил историческое расхождение `20260402122323_add_home_quality_fields`; его не исправляли. Offsite backup failures 10 сентября не исправлялись и свежесть внешних копий не переоценивалась: Stage 1 не требует DB операций.
5. Фактические production images новее отчёта Stage 0. Этот этап не подтверждает их provenance до commit и не разрешает старый backend rollback overlay как универсальное восстановление.
6. GitHub Pages deployment автоматически запускается push в main. Поэтому локальные commits не pushed; deployment требует отдельного явного разрешения пользователя. Другие незакоммиченные изменения frontend требуют самостоятельного review и не должны случайно попасть в release.

Deployment plan после отдельного разрешения:

1. Зафиксировать предыдущий реально опубликованный Pages commit/artifact; не считать старый `bd75a73` или локальный HEAD доказательством текущего Pages deployment. Проверить актуальный remote/deployment при rollout.
2. Выбрать reviewed storefront commit, отдельно разобрать уже существовавшие price-display changes. Выполнить CI tests/typecheck/export guard и проверить полный catalog snapshot.
3. Опубликовать только Pages artifact. API/admin/DB/compose не трогать.
4. Read-only public smoke: `/`, catalog, product variant/color, favorites/cart, quote, checkout без submit; проверить lang, metadata/sitemap/hydration и UAH shipping policy.

Rollback: повторно опубликовать сохранённый предыдущий Pages artifact либо revert только Stage 1 storefront commit и собрать/опубликовать его. Это сохраняет остальные изменения и не требует DB restore, migration rollback, очистки localStorage/cart/favorites или замены backend images. Existing backend/admin продолжают обслуживать прежние contracts.

## K. Next stage

Отдельный **Stage 2 — locale routes + EN translation rollout**. Сначала закончить EN dictionaries и code-to-message presentation, определить поведение непереведённых catalog/SEO данных. Затем добавить реальные `/en/...` wrappers над shared page bodies; `/...` для uk оставить. Root `html lang` и metadata должны определяться при сборке route, без client mutation. Расширить generateStaticParams/build snapshot verification только на публикуемые языки; добавить hreflang/sitemap alternatives лишь после существования страниц и согласованной canonical policy. Новые wrappers передают явный locale; не нужно переписывать Header/Footer/translator или financial contracts.

Не включать в Stage 2 автоматически EUR, ShippingCountry, international shipping/payment или Market. Немецкий rollout и международные продажи — отдельные решения.
