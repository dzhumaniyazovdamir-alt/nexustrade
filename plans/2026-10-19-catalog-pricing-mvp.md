---
name: Catalog and Pricing MVP
status: completed
completedAt: 2026-10-19
---

# Этап 3: Catalog & Pricing MVP

## Итоговый scope

1. Добавлены ADR-0005, transport contracts и migration `CatalogPricing` для валюты организации,
   иерархических категорий, товаров, вариантов SKU и текущих цен.
2. Реализованы отдельные NestJS modules Catalog и Pricing с application ports, TypeORM adapters,
   tenant RBAC, category cycle protection, normalized tenant-unique SKU и optimistic versions.
3. Цена хранится как `numeric(19,4)` и передаётся decimal-строкой. Организация использует одну
   ISO 4217 валюту, которую нельзя изменить после создания первой цены.
4. Добавлен общий Angular organization context и lazy Catalog UI: категории, товары, варианты,
   поиск/фильтры/пагинация, archive flows, current price и currency settings.
5. `member` имеет read-only доступ, `owner | admin` могут изменять Catalog/Pricing.

## Проверки

- Migration lifecycle `run → revert → run` на чистом PostgreSQL — пройден.
- `pnpm lint` — пройден для четырёх Nx-проектов.
- `pnpm typecheck` — пройден для четырёх Nx-проектов.
- `pnpm test` — 21 API unit-тест и 13 Angular unit-тестов пройдены.
- `pnpm test:integration` — 11 API/PostgreSQL тестов пройдены, включая Catalog/Pricing tenant
  boundary и RBAC.
- `pnpm build` — production builds всех проектов пройдены.
- `pnpm format:check` — пройден.
- Playwright smoke — пройдены owner flow category → product → variant → price, currency lock и
  read-only Catalog UI отдельного member.

## Отклонения

- Currency command реализован в Pricing application service и adapter, а не через зависимость
  Organizations → Pricing. Это сохраняет ацикличный module graph; Organizations остаётся
  владельцем базового DTO, Pricing — владельцем правила блокировки валюты после первой цены.
- Attributes в MVP редактируются как валидируемый JSON object вместо динамического key/value
  form array. Persistence и API уже используют `Record<string, string>`, поэтому UI можно
  улучшить без изменения контракта.
- Docker Desktop в окружении отсутствовал; migration и integration suites проверены на
  изолированном локальном PostgreSQL 18 на том же порту и с той же схемой подключения.
