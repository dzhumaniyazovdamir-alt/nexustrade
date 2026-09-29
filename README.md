# NexusTrade

NexusTrade — учебная multi-tenant B2B-платформа для управления каталогами, закупками, заказами, складскими остатками и доставкой.

Реализованы фундамент и второй вертикальный этап: cookie-аутентификация, Organizations, membership RBAC и одноразовые invitation links.

## Быстрый старт

Требования:

- Node.js 22 LTS;
- pnpm 12 через Corepack или `npx pnpm@12`;
- Docker Desktop с Docker Compose.

```bash
cp .env.example .env
npx pnpm@12 install --frozen-lockfile
npx pnpm@12 infra:up
npx pnpm@12 dev
```

Web: `http://localhost:4200`  
API liveness: `http://localhost:3000/api/v1/health/live`  
API readiness: `http://localhost:3000/api/v1/health/ready`  
RabbitMQ Management: `http://localhost:45672`

## Основные команды

```bash
npx pnpm@12 dev
npx pnpm@12 lint
npx pnpm@12 typecheck
npx pnpm@12 test
npx pnpm@12 build
npx pnpm@12 format:check
npx pnpm@12 infra:up
npx pnpm@12 infra:down
```

Перед первым запуском API примените схему:

```bash
npx pnpm@12 db:migration:run
```

После регистрации пользователь становится `owner` новой организации. В разделе «Организации» доступны выбор tenant, управление участниками и создание invitation link в соответствии с ролью.

## Документация

- [Product scope](docs/product-scope.md)
- [Архитектура](docs/architecture.md)
- [Модель данных](docs/data-model.md)
- [Architecture Decision Records](docs/adr/)
