# Исправление minimatch — 4 ноября 2026

Отдельная ветка `security/glob-minimatch-20261104`. Изменение необходимо для
снятия красного dependency audit перед выпуском карточки; Pages здесь не публикуется.

ESLint 9.39.5 → 10.14.0 удаляет legacy callable minimatch v3. Современные
consumers minimatch@10 переведены узким override на 11.0.4; TypeScript parser
8.72.1 поддерживает ESLint 10. Конфигурация и набор recommended-правил сохранены:
`@eslint/js` остаётся 9.39.5. Node 22 и host 20.20.2 совместимы.
Next 15, React 19 и все runtime-зависимости storefront не меняются.

Первичный frozen install без lifecycle scripts и полный lint: PASS.
`pnpm audit --json`: **0 vulnerabilities**. Две постоянные регрессии проверяют
лимит компиляции patterns реальным parser dependency и сохранение correctness
lint-правил/TS/JSX/CommonJS. Ни один audit exception/ignore не добавлен.

Полный неизменённый isolated CI на
`6471ba861198c369b02dadc7d6972c6b198eadcd`: **SUCCESS**. Frozen install,
обязательный audit 0, lint, TypeScript, **198 passed, 0 failed/skipped**,
Next build и статический export/SEO/XML на синтетическом каталоге прошли.
cleanupErrors=[], remainingCiContainers={}, productionContainerStateUnchanged=true.
Source fingerprint: `2aeece6ccb5561e28b819c16ac1d38d82c4686dd1e7901c5aea836674f35ee02`.
Отдельно нужен live-catalog Pages build после обновления API перед публикацией.
Production и ручной workflow не меняются этим коммитом.

Источники: [advisory](https://github.com/advisories/GHSA-g3hv-75wg-m249),
[ESLint 10 migration](https://eslint.org/docs/latest/use/migrate-to-10.0.0),
официальные npm manifests. Backend-часть glob/static описана отдельно в
SKUFnya/docs/security/2026-11-04-glob-minimatch.md.
