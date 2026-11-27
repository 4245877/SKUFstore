# Проверки SKUFstore

Node.js 22, pnpm 10.6.3; Python 3 — для независимого XML validator.
Из корня репозитория:

```bash
pnpm typecheck
pnpm test
pnpm lint
```

`pnpm test` выполняет все `apps/storefront/test/*.test.ts` встроенным Node
runner с `--experimental-strip-types`. Это 17 постоянных файлов: cart/checkout,
цены, локализация/представление, статусы, цвета, SEO/sitemap, Merchant,
snapshot/freshness, доступность каталога и security client. Они не требуют
production credentials. Node 20 не поддерживает нужный режим этих тестов.

## Сборка и export guards

Для ограниченного изолированного offline-профиля из соседнего SKUFnya:

```bash
python3 ops/ci/local-ci.py --frontend --ref HEAD --run
```

Команда выполняется из корня SKUFnya, выбирает HEAD SKUFstore. Проверяет
закоммиченный код, синтетический каталог и mocked Google Fonts; artifact
не предназначен для публикации. Подробности и ресурсные ограничения:
[локальный CI](../../SKUFnya/ops/ci/README.md).

Обычная Pages-сборка требует доступности API и Google Fonts:

```bash
DEPLOY_TARGET=pages NEXT_PUBLIC_API_URL=https://api.skufnya.com pnpm build
cd apps/storefront
node --experimental-strip-types test/verify-stage1-export.mjs
python3 scripts/validate-merchant-export.py out
```

`--check-images` дополнительно обращается к внешним изображениям; для offline
fixture-export его не добавляют. `finalize-export.mjs` вызывается `build`
автоматически. Проверяются UK/EN маршруты, SEO, согласованность каталога и XML;
пустой официальный каталог и урезанный/несогласованный snapshot различаются.

## Browser и синтетические интеграционные сценарии

Browser scripts используют Playwright; нужен установленный Chromium и его
системные библиотеки. Наличие npm-пакета playwright само не устанавливает браузер.
`test/build-stage2b-fixture.mjs` создаёт отдельный temp checkout, fake API,
Pages export, XML/freshness проверки и запускает `browser-stage2b.mjs`:

```bash
cd apps/storefront
node --experimental-strip-types test/build-stage2b-fixture.mjs
MERCHANT_FIXTURE_EMPTY=1 node --experimental-strip-types test/build-stage2b-fixture.mjs
```

Эта расширенная проверка также получает шрифты, если не настроены тестовые
ответы `NEXT_FONT_GOOGLE_MOCKED_RESPONSES`. Настоящие env/production uploads
в fixture checkout не копируются.

Сохранены browser-stage1/stage2/stage2b, browser-catalog-availability,
browser-catalog-hydration, browser-price-display и browser-merchant. Их настройки
`SMOKE_BASE`, `SMOKE_OUTPUT`, locale и пути экспорта задаются в каждом script;
некоторые имеют production URL по умолчанию. До запуска укажите локальный
artifact/сервер и fake API. Не запускать write-сценарии против магазина.
Fixtures с внутренними manufacturing-полями нужны для проверки их исключения
из публичных HTML/RSC/JS и не являются утечкой настоящих данных.

`catalog-freshness.mjs` и `merchant-freshness.mjs` выполняют read-only сверку
живого API с опубликованным сайтом. Это отдельные сетевые проверки, а не
подтверждение успешного offline-теста. Deployment workflow запускает export
guards и freshness; unit/typecheck/lint и все browser scripts отдельно не
выполняет. Автоматический CI/publish этой ревизией не включается.
