# AGENTS.md

## Проект

NexusTrade — учебная multi-tenant B2B-платформа управления каталогами, закупками, заказами, складами и доставкой.

Проект развивается поэтапно: от модульного монолита NestJS и Angular-приложения к обоснованному выделению асинхронных сервисов.

## Базовые соглашения

- Общение с пользователем ведётся на русском языке; код и технические идентификаторы — на английском.
- Реализация следует правилам из `.cursor/rules/`.
- Каждый этап должен давать законченный, проверяемый результат и сохранять проект в рабочем состоянии.
- Архитектурные решения принимаются соразмерно задаче и документируются, если влияют на границы модулей или контракты.
- После завершения принятого плана этот файл обновляется фактической структурой, командами и ограничениями проекта.
- Завершённые планы сохраняются в `plans/`.

## Технологический стек

- Workspace: Node.js 22, pnpm 12, Nx 22.
- Backend: NestJS 11, TypeScript, TypeORM 0.3, PostgreSQL 17.
- Frontend: Angular 21, RxJS, zoneless, Signals, Angular Material, SCSS.
- Security: Argon2id passwords, short-lived access JWT and rotating refresh JWT in `httpOnly` cookies.
- Infrastructure: Redis 8 и RabbitMQ 4 подготовлены в Compose; интеграция появится на профильных этапах.
- Наблюдаемость и тестовые инструменты будут фиксироваться после их фактического подключения.

## Структура

- `apps/api` — NestJS API; transport, common infrastructure, database и health-модули.
- `apps/api/src/identity` — регистрация, cookie sessions и refresh token families.
- `apps/api/src/organizations` — tenants, memberships, RBAC и одноразовые invitations.
- `apps/web` — standalone zoneless Angular-приложение с auth guards и Organizations UI.
- `libs/shared/contracts` — transport-контракты без runtime-зависимостей от приложений.
- `libs/shared/config` — типизированная валидация общей конфигурации.
- `docs/adr` — принятые архитектурные решения.
- `plans` — архив полностью выполненных планов.

Направление зависимостей внутри backend: `transport → application → domain`; infrastructure реализует порты. Приложения могут зависеть от `scope:shared`, shared-библиотеки не зависят от приложений.

Application services получают persistence через DI-токены `IDENTITY_REPOSITORY` и `ORGANIZATIONS_REPOSITORY`. `DataSource`, TypeORM entities, queries, locks и транзакции разрешены только в `infrastructure/*` adapters.

## Команды

На машине без глобального pnpm используйте `npx pnpm@12.6.0` вместо `pnpm`.

```bash
pnpm install --frozen-lockfile
pnpm infra:up
pnpm dev
pnpm lint
pnpm typecheck
pnpm test
pnpm test:integration
pnpm build
pnpm format:check
pnpm infra:down
```

TypeORM:

```bash
pnpm db:migration:create -- apps/api/src/database/migrations/MigrationName
pnpm db:migration:generate
pnpm db:migration:run
pnpm db:migration:revert
```

`synchronize` запрещён. Первая migration `IdentityOrganizations` создаёт схему Identity/Organizations.

Перед integration-тестами на чистой БД выполните `pnpm db:migration:run`.

## Identity и tenant boundary

- Регистрация атомарно создаёт user, organization и membership `owner`.
- Роли membership: `owner`, `admin`, `member`; сервер проверяет membership для каждого URL с `organizationId`.
- Последнего owner нельзя удалить или понизить.
- Refresh token ротируется при каждом использовании; хранится только SHA-256 hash, reuse отзывает token family.
- Angular interceptor дедуплицирует параллельный refresh после `401` и один раз повторяет исходные non-auth запросы.
- Invitation token одноразовый, ограничен по времени и хранится только как hash; owner/admin видят и могут отзывать активные invitations. SMTP пока не подключён.
- State-changing запросы с auth cookies принимаются только с `WEB_ORIGIN`.

## Локальная инфраструктура

- PostgreSQL: `localhost:55432`.
- Redis: `localhost:6380`.
- RabbitMQ AMQP: `localhost:35672`.
- RabbitMQ Management: `http://localhost:45672`.

Секреты хранятся только в локальном `.env`; безопасные development defaults описаны в `.env.example`.
