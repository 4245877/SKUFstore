# SKUFnya → Google Merchant Center: результат реализации, 19 октября 2026

Код подготовлен и проверен локально. **Публикация и настройка Merchant Center не выполнены.** Push, production deploy, изменения рабочей базы и аккаунта Google не выполнялись. Исходные незавершённые изменения SKUFstore сохранены и продолжены. До начала работ SKUFnya имел чистое рабочее дерево.

## Что реализовано

Существующий XML-генератор продолжен. Единственный основной источник — `https://www.skufnya.com/google-merchant.xml`; HTML, JSON-LD, sitemap, XML и `google-merchant-state.json` используют один проверенный снимок сборки.

- Общий первоначальный вариант: `isDefault`, иначе первый вариант в экспортированном порядке. Цена — сохранённая API цена этого варианта плюс доплата выбранного активного цвета. Формула производства остаётся на API. Окрашенное исполнение сейчас недоступно для заказа и не экспортируется.
- Цвет можно зафиксировать через админку. Обновление склада в браузере не меняет выбранный цвет и цену. Скрытый цвет блокирует заказ до явного нового выбора, сохраняя показанную цену. Подтверждённый пустой список цветов не заменяется вымышленным запасным набором.
- Изображение для Merchant подтверждается явно: существующий storageKey, ID первоначального варианта, монохромное исполнение и выбранный цвет. Подтверждённое изображение становится первым в галерее и JSON-LD. Имена файлов и alt не являются доказательством соответствия. Изменение варианта/цвета/удаление изображения требует повторного подтверждения.
- Старые эвристики сортировки обычной галереи сохранены; они не дают разрешения экспортировать изображение в Merchant.
- Повреждённые типы Merchant-настроек в API (включая enabled, content, идентификаторы и списки изображений) отклоняются до нормализации и не могут привести к публикации пустого фида.
- Массовый экспорт прочитывается дважды; сравниваются публикация, локализация и полный fingerprint коммерческих данных. Сверяются count/items, независимый total, уникальность товаров/вариантов, типы цен, флагов и изображений. Ошибка API останавливает сборку.
- API экспорт дополнен активными resinColors и publishedCount, полученными с товарами в PostgreSQL-транзакции RepeatableRead. Старые поля и точечный endpoint сохранены. Фронтенд совместим и со старым экспортом: отдельно читает цвета и подтверждает стабильность двух полных чтений.
- Fingerprint версии 2 включает все публичные поля: размеры, материал, лица/исполнения, цвета/доплаты, изображения, описания, статусы, локализацию, Merchant-настройки и будущие добавочные поля. Ключи объектов нормализуются; порядок вариантов и изображений сохраняется. Служебные timestamps не вызывают лишнюю сборку.
- Scheduled workflow проверяет не только state JSON, но и фактическое содержимое опубликованного XML. Отсутствие/подмена/устаревание XML требует пересборки. Неизменные данные не требуют сборки.
- В workflow добавлена независимая XML-проверка Python: XML parser, обязательные поля, уникальность ID, цена/изображение/URL против итогового HTML/JSON-LD; перед публикацией — HTTP, формат и размеры реальных изображений.
- Пустой пригодный набор разрешён. Полностью пустой публичный каталог принимается только после успешных согласованных API-чтений с нулевыми totals. Для ограничения Next 15.0 добавлен внутренний параметр, который рендерит 404 и удаляется из deploy artifact после сборки. В XML и sitemap его нет.
- Ошибка любого обязательного шага блокирует загрузку артефакта и deployment: предыдущая опубликованная версия сохраняется. Ежечасное расписание обновляет каталог целиком, не публикует XML отдельно от страниц.

## Бэкенд и админка

Новые настройки хранятся в уже существующем `Product.attributes.merchant`. Prisma-модель не менялась, **новых миграций нет**. Обычные attributes товара и вариантов сохраняются при редактировании.

В существующей форме товара появился редактор Merchant: включение/исключение, проверка контента, типовой цвет, подтверждение изображения, дата отправления PREORDER/BACKORDER, категория Google, бренд производителя, MPN, GTIN и подтверждение отсутствия присвоенных идентификаторов. Существующие manufacturerCode и releaseDate автоматически не переименовываются в MPN/дату отправления.

В реальном каталоге manufacturerCode заполнен у 10 товаров, releaseDate — у 53. У шести PREORDER/BACKORDER releaseDate отсутствует. Поэтому это поле не решало проблему дат и не было использовано вместо обещанной даты отправления.

## Атрибуты XML

| Атрибут | Источник и правило |
| --- | --- |
| id | Стабильный Product.id; уникальность проверяется, не меняется при правке названия/slug/цены |
| title, description | Текст товара без HTML + уточнение первоначального варианта, размера, исполнения и цвета |
| link | HTTPS canonical украинской страницы с trailing slash |
| image_link | Только явно подтверждённое изображение этой конфигурации |
| additional_image_link | До 10 явно связанных подтверждённых дополнительных изображений, если заданы |
| price | Цена первоначального варианта + доплата цвета; две десятичные цифры, UAH |
| availability | IN_STOCK → in_stock; PREORDER → preorder; BACKORDER → backorder |
| availability_date | Явно заданная ISO 8601 дата с часовым поясом, не в прошлом и не далее года; без неё preorder/backorder исключается |
| condition | new |
| brand | Явный бренд изготовителя, например SKUFnya для собственных изделий; бренд франшизы из каталога не подставляется |
| mpn | Только явно присвоенный производителем код. SKU магазина не преобразуется автоматически |
| gtin | Только реально заданный штрихкод; длина и контрольная цифра проверяются |
| identifier_exists | yes при достоверном GTIN или brand+MPN; no — только после явного подтверждения отсутствия присвоенных кодов |
| google_product_category | Необязательный явный числовой ID из админки; произвольная категория магазина не объявляется категорией Google |
| product_type | Фактическая категория каталога |
| item_group_id | Не передаётся: пока одна конфигурация на товар, группы вариантов не создаются |

Обычные изделия под заказ остаются доступными: нулевой stockQty не означает, что изделие невозможно изготовить. API checkout принимает такие активные варианты и активные цвета. Срок изготовления должен соответствовать реально обещаемому покупателю сроку. PREORDER/BACKORDER не переименовываются в in_stock ради прохождения проверки. Дата нужна по [требованиям Google к наличию](https://support.google.com/merchants/answer/12157545?hl=en).

MPN и GTIN не генерируются. Google допускает собственный бренд и присвоенный изготовителем MPN для собственных изделий; отсутствие кодов нужно подтвердить, а не предполагать по пустым полям. См. [уникальные идентификаторы](https://support.google.com/merchants/answer/160161?hl=en) и [identifier_exists](https://support.google.com/merchants/answer/6324478?hl=en).

## Результат на реальном каталоге

**170 товаров, 233 активных варианта. XML валиден, включено 0, исключено 170.** Это означает готовность механизма, но каталог ещё не подготовлен к фактической загрузке предложений.

| Первая причина исключения | Количество |
| --- | ---: |
| unverified_configuration_image | 148 |
| adult_content_review_required | 18 |
| missing_availability_date | 4 |

Полный список товаров с причинами, выбранными вариантами и ценами: [merchant-review-2026-10-19.json](merchant-review-2026-10-19.json). Причины последовательные: например, ещё два товара из adult-review также имеют PREORDER/BACKORDER без даты. После подтверждения изображений потребуется проверить идентификаторы: у существующих товаров Merchant-настройки ещё не заполнены.

Четыре товара с первой причиной missing_availability_date: Castorice, Hornet Cosplay Yor Forger, Mikasa Ackerman, Pulchra Fellini (`pulchra-fellini-zenless-zone-zero`). Ещё два пересечения с adult-review: Misato (`pikky-prints-misato-evangelion`, BACKORDER) и другая Pulchra (`pulchra-fellini-zenless-zone-zero-zzz-figure`, PREORDER).

Проверенные первоначальные цены:

| Товар | Минимум каталога | Первоначальная конфигурация = JSON-LD = браузер = реальный API quote |
| --- | ---: | ---: |
| Johnny Joestar | 1530 | 5200 UAH |
| Cha Hae-In | 520 | 9250 UAH |
| Goblin Slayer | 2970 | 26240 UAH |
| Hornet | 1690 | 9370 UAH |
| Yennefer | 920 | 7390 UAH |

Реальный /orders/quote вызывался только для расчёта, заказы не создавались. Браузерная проверка перехватывала запросы API и аналитики, не отправляла записи в production. Проверено сохранение цены даже при изменении доплаты/наличия в фоновом ответе цветов.

Albedo (`great-tomb-overseer-224mm`) и Maid Kronii (`maid-kronii-hololive`): визуально проверены изображения вариантов — цветные рендеры, не доказательство соответствия монохромной конфигурации. Нужны подходящие изображения и подтверждение через админку. У всех 170 основных кандидатов изображений подтверждены HTTP 200, JPEG/WebP, размеры не меньше 500×500. Проверка доступности изображения не равна проверке соответствия товара.

Обычная загрузка изображения в админке создаёт новый URL с timestamp и UUID; это меняет fingerprint и позволяет Google загрузить новую картинку. Перезапись файла вручную по тому же storageKey не поддерживается механизмом обнаружения изменений. Используйте повторную загрузку через админку.

## Политики и публичный сайт

На опубликованном сайте проверены доступность главной, контактов, доставки, возвратов, checkout и robots. XML и state JSON пока отвечают **404**, поскольку изменения не опубликованы.

- Контактные способы доступны: email, телефон и мессенджеры. Доставка и возвраты описаны. Юридическая корректность текста не объявляется подтверждённой и тексты не менялись.
- В коде после сохранения заказа следующий шаг — OLX/Telegram; автоматического приёма оплаты нет. Отсутствие карточного эквайринга само по себе не означает отказ: Google допускает, например, счёт или оплату при получении. Но обязательное завершение покупки/согласование окончательной цены на другом сайте создаёт риск. Нужно бизнес-решение: покупка с фиксированной конфигурацией, полной ценой, способом оплаты и ожидаемой доставкой должна завершаться на SKUFnya; общение может оставаться поддержкой. См. [требования к домену магазина](https://support.google.com/merchants/answer/12160471?hl=en) и [checkout](https://support.google.com/merchants/answer/9158778?hl=en). Checkout и юридические страницы здесь не менялись.
- Внутренняя ADULT-классификация отделена от Merchant-контента. Это список на ручную проверку, а не решение по имени персонажа. Подтверждённый взрослый контент исключается для Украины; GENERAL не обходит возрастной экран — isAdult-страницы исключаются отдельно. См. [политику взрослого контента](https://support.google.com/merchants/answer/12076987?hl=en) и [adult](https://support.google.com/merchants/answer/6324508?hl=en). Проверять нужно всю страницу, включая галерею.
- Источник двух отклонений «Алкогольные напитки» без доступа к карточкам в Merchant Center установить нельзя. Наш XML ещё не публиковался. Публичные категории каталога: персонажи из аниме, видеоигр, оригинальные персонажи; алкогольная категория кодом не назначается. Проверьте конкретные ID, источник, обработанные Google атрибуты и правила преобразования в аккаунте.
- В админке можно задать фактическую Google-категорию. Например, 5609 — Figurines, 11 — Sculptures & Statues, 4175 — Scale Model Kits, в зависимости от реально продаваемого изделия; выбирать нужно по товару. [Официальная таксономия](https://www.google.com/basepages/producttype/taxonomy-with-ids.en-US.txt).
- У Sameko Saba (`sameko-saba-vtuber-fan-art-stl`) в названии есть STL. Для физического изделия стоит уточнить название в админке, чтобы покупатель и Google не воспринимали предложение как цифровой файл. Данные автоматически не переименовывались.
- Минимум изображения 500×500 начинает действовать 31 января 2027; до этого для не-одежды действует 100×100 и предупреждение о 500px. Проверенные изображения уже соответствуют 500px. [Официальное требование](https://support.google.com/merchants/answer/12159030?hl=en).

## Проверки и команды

Использовался Node **22.23.3**, pnpm из существующего окружения. Новых npm-зависимостей нет.

| Команда/проверка | Результат |
| --- | --- |
| `pnpm --filter storefront test` | 181/181 |
| `pnpm --filter storefront exec tsc --noEmit --incremental false` | успешно |
| `DEPLOY_TARGET=pages NEXT_PUBLIC_API_URL=https://api.skufnya.com pnpm build` | production build успешно |
| `node --experimental-strip-types test/verify-stage1-export.mjs` | 170 UK страниц + 170 EN маршрутов, sitemap/SEO/снимок/XML/state согласованы |
| `python3 scripts/validate-merchant-export.py out --check-images` | XML валиден; реальный фид 0 предложений |
| `node --experimental-strip-types test/build-stage2b-fixture.mjs` | полный синтетический export: 3 предложения, 3 уникальных ID, цена/изображения XML = HTML/JSON-LD; браузеры uk-UA/en-US |
| `MERCHANT_FIXTURE_EMPTY=1 node --experimental-strip-types test/build-stage2b-fixture.mjs` | полный export: 0 товаров, 0 предложений, валидные sitemap и XML, внутренних страниц нет |
| `node test/browser-catalog-hydration.mjs` | 40/40 браузерных сценариев |
| `SMOKE_LOCALE=uk-UA SMOKE_ROUTE_LOCALE=uk node test/browser-stage2.mjs` | 1/1, 15 групп проверок: каталог, варианты/цвета, корзина, котировка, checkout/retry, аккаунт; API-ответы тестовые |
| Независимый разбор начального HTML всех 164 страниц с Offer | цены HTML = JSON-LD, расхождений 0 |
| `node test/browser-merchant.mjs` с путями финального экспорта | 5/5 реальных проблемных страниц, цены после hydration согласованы |
| `pnpm --filter @skufnya/api test` | 189/189; отдельные одноразовые PostgreSQL и Redis |
| `pnpm test:unit` в SKUFnya | 49/49, включая новую схему Merchant |
| `pnpm --filter @skufnya/api typecheck` и `build` | успешно |
| `pnpm --filter @skufnya/admin-panel build` | успешно |
| `git diff --check` обоих репозиториев | успешно |

`pnpm --filter storefront lint` не прошёл: существующий проект не имеет конфигурации ESLint, Next предлагает интерактивную инициализацию. Конфигурация и зависимости линтера не добавлялись. Производственная сборка и TypeScript-проверка прошли.

Существующие `.next` и `out` в исходном рабочем каталоге принадлежат nobody и недоступны для перезаписи; они сохранены. Проверенный production export сохранён в `node_modules/.cache/skuf-merchant-verification/production/out` репозитория SKUFstore, снимок — рядом в `catalog-snapshot.json`. Все его исходники — копия текущей витрины. В CI свежий checkout не имеет этой локальной проблемы прав. При локальном повторении используйте чистый рабочий каталог или исправьте права на старые сгенерированные каталоги.

Сводка результатов: [merchant-verification-2026-10-19.json](merchant-verification-2026-10-19.json).

Логи и артефакты последнего прогона сохранены в `node_modules/.cache/skuf-merchant-verification/` репозитория SKUFstore: `production-build.log`, `store-tests.log`, `store-typecheck.log`, `export-verification.log`, `synthetic-build.log`, `synthetic-report.json`, `empty-build.log`, `empty-report.json`, `browser-merchant.json`, `browser-catalog.log`, `browser-stage2.log`, `api-tests.log`, `api-unit.log`, `api-build.log`, `api-typecheck.log`, `admin-build.log`, `image-audit.json`, `real-quote-report.json`, `live-freshness.json`, `initial-html-prices.json`. Сборки и HTTP-серверы локальные; production-записей нет. Временные материалы первого прогона были удалены окружением из `/tmp`, поэтому заключительные доказательства сохранены в кэше рабочего проекта. При промежуточных прогонах найдены и исправлены двойная очистка текста, дублирование изображений в EN и пустой экспорт. Единичный браузерный `ERR_NETWORK_CHANGED` совпал с созданием/удалением Docker-сети; повторный прогон выполнялся после удаления тестовых контейнеров.

## Публикация и подключение Merchant Center

1. Отдельно разрешить публикацию изменений API/админки SKUFnya и витрины SKUFstore. SKUFstore публикуется Actions после push в main; SKUFnya использует локальные закреплённые Docker-образы и требует отдельного обновления образов API/админки — push сам по себе их не заменит. Миграции рабочей базы не нужны. Ничего не отправлено в remote Git.
2. После публикации админки подготовить хотя бы несколько товаров: корректное фото монохромного варианта/цвета, бренд изготовителя и присвоенные идентификаторы либо подтверждение их отсутствия. Взрослый контент проверить отдельно, PREORDER/BACKORDER снабдить реальной датой.
3. После обновления витрины открыть без авторизации `https://www.skufnya.com/google-merchant.xml` и `https://www.skufnya.com/google-merchant-state.json`. Проверить, что XML уже содержит нужные предложения. GitHub Actions проверяет данные ежечасно и пересобирает весь сайт при изменениях; задержки расписания возможны.
4. В Merchant Center: **Настройки → Источники данных → Источники товаров**. Зафиксировать существующие источники, правила и вкладку «Найдено Google». У проблемных 7–8 товаров открыть карточку и посмотреть ID/источник/реальные ошибки; не удалять источник до проверки нового.
5. Если существующий файловый источник предназначен для этого же каталога, предпочтительно заменить его URL. Иначе добавить **один** новый основной источник: «Добавить товары из файла» → «Указать ссылку на файл» → `https://www.skufnya.com/google-merchant.xml`. Страна Украина, язык украинский, валюта UAH, методы маркетинга — бесплатные предложения. Google Ads не требуется.
6. Включить получение по расписанию, например ежедневно. Выполнить первое «Получить сейчас» и проверить время успешной загрузки, количество обработанных товаров и ошибки файла. [Инструкция Google](https://support.google.com/merchants/answer/12158380?hl=en).
7. Для дублей сравнить source/ID/link существующих и новых предложений. У автоматически найденных Google обычно отдаёт приоритет загруженной версии; старый ручной/Sheets/API-источник с другими ID может продолжать давать дубли. После проверки нового XML отключить перекрывающий старый источник или его соответствующие товары. Для одного управляемого источника при необходимости отключить автоматическое добавление «Найдено Google» в настройках источника; это действие в аккаунте выполняет владелец. [Автоматические источники](https://support.google.com/merchants/answer/12158480?hl=en).
8. В «Товары → Требуют внимания» открыть причины отклонений; отдельно проверить проблемы аккаунта/сайта, подтверждение домена, сведения о продавце, доставку и возвраты. Значения должны соответствовать фактическим условиям; XML не исправляет блокировку аккаунта.
9. Контроль обновления: поменять цену/массу реального тестируемого варианта через админку → дождаться Actions → проверить одинаковую цену страницы/JSON-LD/XML → после получения Google открыть этот же ID и сверить цену и дату обработки. При отсутствии обновления смотреть workflow freshness outputs, status/check logs, опубликованный XML и расписание получения Google.
10. Успех загрузки означает, что источник прочитан. Успех обработки означает, что предложение появилось с корректными атрибутами. Допуск к бесплатным предложениям подтверждает только статус этого метода маркетинга в аккаунте; ни локальная проверка, ни валидный XML не означают одобрение Google.

## Файлы исходников и проверок

Ключевые модули и назначение (пути относительно SKUFstore, кроме строк SKUFnya):

| Файл | Назначение |
| --- | --- |
| `apps/storefront/src/lib/product-offer.ts`, `merchant-settings.ts` | Первоначальный вариант/цвет, цена, дата доступности, подтверждённые изображения |
| `apps/storefront/src/lib/merchant-feed.ts` | RSS/XML, идентификаторы, включение/исключение, fingerprint |
| `apps/storefront/src/lib/catalog-source.ts`, `build-snapshot.ts`, `snapshot-integrity.ts` | Валидация API, массовый экспорт, стабильный снимок и подтверждённый пустой каталог |
| `apps/storefront/src/lib/product-meta.ts`, `resin-colors.ts` | Согласованные JSON-LD и обновление только складского статуса цветов |
| `apps/storefront/src/views/(shop)/product/[slug]/ProductDetailsClient.tsx`, `page.tsx` | Первоначальная конфигурация, галерея, цена и пустой static export |
| `apps/storefront/src/app/google-merchant.xml/route.ts`, `google-merchant-state.json/route.ts` | Публичные статические Merchant-файлы |
| `apps/storefront/scripts/merchant-freshness.mjs`, `merchant-report.mjs` | Обнаружение обновлений по API и реальному XML, диагностика товаров |
| `apps/storefront/scripts/validate-merchant-export.py`, `finalize-export.mjs` | Независимая проверка XML/страниц/изображений и очистка внутреннего пустого маршрута |
| `.github/workflows/deploy-storefront.yml` | Scheduled reconciliation и обязательные проверки перед публикацией |
| SKUFnya: `apps/api/src/modules/catalog/catalog.service.ts` | Каталог и цвета из одной транзакции в существующем export |
| SKUFnya: `apps/api/src/schemas/product.ts` | Валидация Merchant-настроек в существующем attributes JSON |
| SKUFnya: `apps/admin-panel/src/components/MerchantSettingsEditor.jsx`, `apps/admin-panel/src/views/ProductsView.jsx` | Настройки Merchant в существующей форме товара, сохранение attributes |


Пути ниже относительно указанного репозитория; включены также сохранённые незавершённые Merchant/SEO-правки предыдущей сессии.

### SKUFstore

- `.github/workflows/deploy-storefront.yml`
- `apps/storefront/package.json`
- `apps/storefront/scripts/finalize-export.mjs`
- `apps/storefront/scripts/merchant-freshness.mjs`
- `apps/storefront/scripts/merchant-report.mjs`
- `apps/storefront/scripts/validate-merchant-export.py`
- `apps/storefront/src/app/google-merchant-state.json/route.ts`
- `apps/storefront/src/app/google-merchant.xml/route.ts`
- `apps/storefront/src/lib/build-snapshot.ts`
- `apps/storefront/src/lib/catalog-source.ts`
- `apps/storefront/src/lib/merchant-feed.ts`
- `apps/storefront/src/lib/merchant-settings.ts`
- `apps/storefront/src/lib/product-meta.ts`
- `apps/storefront/src/lib/product-offer.ts`
- `apps/storefront/src/lib/resin-colors.ts`
- `apps/storefront/src/lib/snapshot-integrity.ts`
- `apps/storefront/src/views/(shop)/product/[slug]/ProductDetailsClient.tsx`
- `apps/storefront/src/views/(shop)/product/[slug]/page.tsx`
- `apps/storefront/test/browser-merchant.mjs`
- `apps/storefront/test/browser-stage2b.mjs`
- `apps/storefront/test/build-stage2b-fixture.mjs`
- `apps/storefront/test/localized-catalog.test.ts`
- `apps/storefront/test/merchant-feed.test.ts`
- `apps/storefront/test/merchant-freshness.test.ts`
- `apps/storefront/test/product-meta.test.ts`
- `apps/storefront/test/resin-colors.test.ts`
- `apps/storefront/test/snapshot-integrity.test.ts`
- `apps/storefront/test/stage2b-fixtures.mjs`
- `apps/storefront/test/verify-stage1-export.mjs`
- `docs/GOOGLE_MERCHANT_IMPLEMENTATION_2026-10-19.md`
- `docs/merchant-review-2026-10-19.json`
- `docs/merchant-verification-2026-10-19.json`

### SKUFnya

- `apps/admin-panel/src/components/MerchantSettingsEditor.jsx`
- `apps/admin-panel/src/views/ProductsView.jsx`
- `apps/api/package.json`
- `apps/api/src/modules/catalog/catalog.service.ts`
- `apps/api/src/schemas/product.ts`
- `apps/api/test/README.md`
- `apps/api/test/admin-product-variants.test.ts`
- `apps/api/test/catalog-export.test.ts`
- `apps/api/test/merchant-settings.test.ts`
