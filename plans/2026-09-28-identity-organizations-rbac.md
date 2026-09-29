---
name: Identity, Organizations and RBAC
status: completed
completedAt: 2026-09-28
---

# Этап 2: Identity, Organizations и RBAC

## Итоговый scope

1. Добавлены typed transport contracts, security configuration, ADR-0004 и migration для users, organizations, memberships, refresh token families и invitations.
2. Реализованы register/login/session/refresh/logout с Argon2id, `httpOnly` cookies, refresh rotation, reuse detection и origin validation.
3. Реализованы Organizations API, роли `owner | admin | member`, tenant guards, защита последнего owner и одноразовые invitation links.
4. Добавлены Angular login/register, session hydration, route guards, authenticated shell, tenant selector, members/roles и invitation create/accept UI.
5. CI применяет migration перед integration-тестами.

## Проверки

- Migration lifecycle `run → revert → run` — пройден.
- `pnpm lint` — пройден для четырёх Nx-проектов.
- `pnpm typecheck` — пройден для четырёх Nx-проектов.
- `pnpm test` — 6 API unit-тестов и 7 Angular component/service/guard тестов пройдены.
- `pnpm test:integration` — 8 API/PostgreSQL тестов пройдены.
- `pnpm build` — production builds всех проектов пройдены.
- `pnpm format:check` — пройден.
- Playwright smoke — пройдены register, authenticated shell, owner invitation, регистрация второго пользователя, accept invitation и member-only UI.

## Отклонения

- Вместо `@nestjs/jwt` используется небольшой `TokenService` поверх `jsonwebtoken`: текущая ESM-сборка `@nestjs/jwt` несовместима с Jest CommonJS configuration проекта.
- SMTP, Redis sessions и fine-grained permissions отложены согласно плану.
- Completed-план сохранён с фактической датой завершения `2026-09-28`, а не с предварительной датой из исходного плана.
