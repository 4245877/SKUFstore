# SKUFstore

Публичная витрина SKUFnya: Next.js 15.5.28, React 19, TypeScript.
Production — статический экспорт GitHub Pages, API — отдельный
`4245877/SKUFnya` по `https://api.skufnya.com`.
Актуальность описания: 04.11.2026; серверный checkout —
`/home/hpelitdesk/apps/SKUFstore`.

## Архитектура и структура

| Каталог | Назначение |
| --- | --- |
| `apps/storefront/src/app` | Маршруты Next, `(uk)` без префикса, `(en)/en`, sitemap/robots |
| `apps/storefront/src/views` | Общие страницы каталога, карточки, корзины, checkout, auth и профиля |
| `apps/storefront/src/components` | Header/Footer, доступность каталога, аналитика и общие UI-блоки |
| `apps/storefront/src/i18n` | UI-словари UK/EN, локализованные ссылки и правила редакционных переводов; DE не опубликован |
| `apps/storefront/src/lib` | API, согласованный snapshot сборки, SEO/Merchant, хранение выбора/черновика и серверные котировки |
| `apps/storefront/test` | Постоянные unit-, export- и browser-регрессии, синтетические fixtures |
| `apps/storefront/scripts` | Finalize export, XML validator, catalog/Merchant freshness и отчёты |
| `.github/workflows/deploy-storefront.yml` | Только ручная сборка и публикация Pages из main |
| `docs` | Действующие пояснения, тестирование и датированная история |

При сборке bulk export, контрольные листинги и цвета проверяются на
согласованность, затем страницы товаров, sitemap, SEO и Merchant читают
единый build snapshot. Ошибка/изменение API прерывают экспорт; подтверждённый
пустой каталог допускается. В браузере каталог/quote зависят от API;
build snapshot не является полноценным offline-каталогом.

`demo-store.ts` используется действующими корзиной, избранным и подтверждением.
Он сохраняется как рабочий код. Заказы и финальные цены определяет API;
локальный cart/draft не является подтверждённым заказом. POST заказа не
повторяется автоматически; idempotency key помогает безопасному повтору.

UK/EN меняют представление, а не UAH, идентичность вариации или правила
доставки. Публикуется только одобренный полный EN-перевод; source fallback
не меняет slug/SKU. Для Новой почты checkout использует
`/api/nova-poshta/warehouses`, для Укрпочты возможен ручной ввод.
Manufacturing/private attributes исключаются из публичного artifact.

## Разработка

Нужны Node.js 22 и pnpm 10.6.3. Из корня checkout:

```bash
corepack enable
pnpm install --frozen-lockfile
NEXT_PUBLIC_API_URL=http://127.0.0.1:3001 NEXT_PUBLIC_MEDIA_URL=http://127.0.0.1:3001 pnpm dev
```

Локальный API запускается отдельно из SKUFnya, с собственными тестовыми
данными и CORS для `http://localhost:3000`. Dev server слушает loopback:3000.
Реальные `.env.local` не коммитятся. Публичные env встраиваются в JS,
секреты туда передавать нельзя.

| Переменная | Назначение |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | URL API для браузера и Pages-сборки |
| `NEXT_PUBLIC_MEDIA_URL` | Публичный media origin; иначе используется API URL |
| `API_INTERNAL_URL` | Необязательный server-side API URL для standalone; браузеру не передаётся |
| `DEPLOY_TARGET=pages` | `output: export`, результат `apps/storefront/out` |
| `DEPLOY_TARGET=server` | Standalone-вариант по умолчанию; Dockerfile сохранён, в production сейчас не используется |
| `USE_BASE_PATH`, `NEXT_PUBLIC_BASE_PATH` | Необязательный Pages basePath для размещения под подкаталогом |
| `NEXT_TELEMETRY_DISABLED=1` | Отключение telemetry при проверках |

Next/font получает Google Fonts при обычной сборке. Для проверки без
production/API-сети используется отдельный синтетический профиль CI.
`SKUF_CATALOG_BUILD_ID` создаётся конфигурацией Next для каждого процесса
сборки; вручную переносить его между сборками не нужно.

## Команды и публикация

```bash
pnpm typecheck
pnpm test
pnpm lint
DEPLOY_TARGET=pages NEXT_PUBLIC_API_URL=https://api.skufnya.com pnpm build
```

Последняя команда читает живой API и создаёт локальный artifact; не публикует
его. Для тестовой сборки используйте [docs/TESTING.md](docs/TESTING.md).
`pnpm start` относится к server-режиму и не обслуживает статический Pages export.

Workflow запускается только `workflow_dispatch` на main, без push-trigger и
cron. Он собирает живой каталог, проверяет export/SEO/XML, публикует Pages,
затем проверяет catalog/Merchant freshness. Он не запускает все unit/browser
тесты: их выполняют отдельно до публикации. Обновление товара/перевода в
админке само не публикует Pages; статические карточки требуют новой ручной
сборки. Сначала разворачивается согласованный API, затем витрина.

Публикация и переключение production требуют отдельного разрешения.
Откат Pages — к известному совместимому артефакту/коммиту с повторной проверкой
экспорта и API; нельзя вслепую возвращать security-исправления и прежние secrets.

Серверный backend и backup: [SKUFnya/RUNBOOK](../SKUFnya/ops/RUNBOOK.md).
Главная точка входа: [docs/README.md](docs/README.md).
