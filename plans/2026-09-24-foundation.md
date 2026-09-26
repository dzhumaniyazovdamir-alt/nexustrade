---
name: NexusTrade foundation stage
status: completed
completedAt: 2026-09-24
---

# Этап 1: фундамент NexusTrade

## Цель

Создать воспроизводимый Nx + pnpm monorepo, NestJS API, zoneless Angular 21 приложение, TypeORM/PostgreSQL и локальную инфраструктуру. Завершить этап вертикальным срезом `Web → API → PostgreSQL`.

## Выполненный scope

1. Описаны product scope, bounded contexts, концептуальная модель данных и три ADR: monorepo, TypeORM Data Mapper и эволюция модульного монолита.
2. Созданы `apps/api`, `apps/web`, `libs/shared/contracts` и `libs/shared/config`; настроены strict TypeScript, ESLint boundaries, Prettier и Nx targets.
3. Docker Compose поднимает PostgreSQL, Redis и RabbitMQ Management с healthcheck-ами и именованными volumes.
4. API использует типизированную environment validation, TypeORM с `synchronize: false`, versioned health endpoints, correlation ID, structured logs и единый error envelope.
5. Angular работает без Zone.js, использует standalone/lazy routes, Signals, RxJS, Material и SCSS-токены. Экран показывает loading, ready и error состояния.
6. Добавлены unit, Angular component и PostgreSQL integration tests, а также GitHub Actions workflow.

## Проверки

- `pnpm install --frozen-lockfile` — пройдено.
- `pnpm lint` — пройдено для четырёх Nx-проектов.
- `pnpm typecheck` — пройдено для четырёх Nx-проектов.
- `pnpm test` — 6 API unit-тестов и 3 Angular component-теста пройдены.
- `pnpm test:integration` — 2 API/PostgreSQL теста пройдены.
- `pnpm build` — production builds API, Web и shared libraries пройдены.
- TypeORM CLI загрузил DataSource без migrations.
- PostgreSQL, Redis и RabbitMQ достигли состояния `healthy`.
- Health failure test: `ready=200`, при остановленной БД `live=200` и `ready=503`, после восстановления `ready=200`.
- Именованный PostgreSQL volume сохранил тестовую запись после рестарта контейнера.
- Локальный `pnpm dev` поднял API и Web; браузер показал состояние «Система готова».

## Отклонения от исходного плана

- Из-за занятых портов выбраны PostgreSQL `55432`, Redis `6380`, RabbitMQ `35672/45672`; значения отражены в `.env.example` и документации.
- NgRx намеренно не установлен: разделяемого доменного состояния на фундаментальном этапе ещё нет.
- Бизнес-таблицы и пустая baseline migration не создавались; первая схема относится к Identity/Organizations.
- Приложения запускаются локально, а Compose содержит только инфраструктуру, как и было запланировано.
