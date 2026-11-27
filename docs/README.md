# Документация витрины

Актуальная точка входа — [README проекта](../README.md), команды и зависимости
проверок — [TESTING.md](TESTING.md). Сверено с кодом и workflow 04.11.2026.
Production API, admin, миграции и backup описаны в
[SKUFnya/docs](../../SKUFnya/docs/README.md).

## Контракты и реализация

- [STAGE2B_I18N.md](STAGE2B_I18N.md) — редакционные переводы и build snapshot.
- [CATALOG_AVAILABILITY_DESIGN.md](CATALOG_AVAILABILITY_DESIGN.md) — реализованный
  UK/EN-интерфейс временной недоступности каталога, связанные screenshots.
- Исходники контрактов: [api.ts](../apps/storefront/src/lib/api.ts),
  [build-snapshot.ts](../apps/storefront/src/lib/build-snapshot.ts),
  [next.config.ts](../apps/storefront/next.config.ts).

## История

Следующие документы сохраняют результаты и ограничения на свои даты.
Упоминания старого расписания, CI и публикации не заменяют текущий README:
Pages теперь публикуется вручную из main.

| Материал | Контекст |
| --- | --- |
| [STAGE1_I18N.md](STAGE1_I18N.md), [STAGE1_STRING_INVENTORY.md](STAGE1_STRING_INVENTORY.md), [STAGE1_ACCEPTANCE_FOLLOWUP.md](STAGE1_ACCEPTANCE_FOLLOWUP.md), [stage1-20260916/](stage1-20260916/) | Основа локализации и свидетельства проверок |
| [STAGE2_I18N.md](STAGE2_I18N.md), [stage2-20260919/](stage2-20260919/) | Покупательские подписи и аудит исходных данных |
| [CATALOG_AVAILABILITY.md](CATALOG_AVAILABILITY.md), [media/catalog-availability/](media/catalog-availability/) | Предыдущий этап error UI и визуальная приёмка |
| [GOOGLE_SHOPPING_AUDIT_2026-10-19.md](GOOGLE_SHOPPING_AUDIT_2026-10-19.md), [GOOGLE_MERCHANT_IMPLEMENTATION_2026-10-19.md](GOOGLE_MERCHANT_IMPLEMENTATION_2026-10-19.md) | Merchant-политики, приёмка, JSON отчёты от 19 октября |
| [security/2026-10-29-finalization.md](security/2026-10-29-finalization.md) | Security candidate на 29 октября; дальнейшие production-переключения записаны в backend `docs/security/` |
| [archive/](archive/) | Прежняя карта проекта с историческим описанием расписаний |

Тестовые fixtures и browser scripts — постоянные регрессии, включая stage1,
stage2, stage2b. Изображения в `src/views/_media` используются приложением,
а screenshots в docs подтверждают прежнюю приёмку; их не удаляли.

Ревизия и общий diff обоих репозиториев:
[SKUFnya, 04.11.2026](../../SKUFnya/docs/maintenance/2026-11-04/REPORT.md).
Межрепозиторные ссылки рассчитаны на соседние checkout.
