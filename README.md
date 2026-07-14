# CoTEBek — Universal Business Backend

<p align="center">
  <a href="https://nestjs.com/" target="_blank"><img src="https://img.shields.io/badge/NestJS-11.0-E0234E?logo=nestjs&logoColor=white" alt="NestJS" /></a>
  <a href="https://orm.drizzle.team/" target="_blank"><img src="https://img.shields.io/badge/Drizzle-ORM-0.45-C5F74F?logo=drizzle&logoColor=black" alt="Drizzle ORM" /></a>
  <a href="https://www.postgresql.org/" target="_blank"><img src="https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white" alt="PostgreSQL" /></a>
  <a href="https://www.typescriptlang.org/" target="_blank"><img src="https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript&logoColor=white" alt="TypeScript" /></a>
  <a href="https://www.docker.com/" target="_blank"><img src="https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker&logoColor=white" alt="Docker" /></a>
  <a href="https://opensource.org/licenses/MIT" target="_blank"><img src="https://img.shields.io/badge/License-MIT-green.svg" alt="MIT License" /></a>
  <a href="https://github.com/airizf11/cotebek/actions" target="_blank"><img src="https://img.shields.io/github/actions/workflow/status/airizf11/cotebek/ci.yml?branch=main&logo=github" alt="CI Status" /></a>
</p>

> **CoTEBek** (short for _Core Transaction Engine Backend_) is a production-ready, multi-tenant NestJS backend boilerplate for building SaaS applications — laundry, F&B, arisan, retail, services, you name it. Built with **Drizzle ORM**, **PostgreSQL**, **JWT + API Key dual auth**, and **comprehensive audit logging**.

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        API Gateway (NestJS)                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │  Dual Auth  │  │  Throttler  │  │   Helmet    │              │
│  │  (JWT +     │  │  (Rate      │  │  (Security │              │
│  │   API Key)  │  │   Limit)    │  │   Headers)  │              │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘              │
└─────────┼────────────────┼────────────────┼─────────────────────┘
          │                │                │
    ┌─────▼─────┐    ┌─────▼─────┐    ┌─────▼─────┐
    │  Auth     │    │  Apps     │    │  Common   │
    │  Module   │    │  Module   │    │  Module   │
    └─────┬─────┘    └─────┬─────┘    └─────┬─────┘
          │                │                │
    ┌─────▼────────────────▼────────────────▼─────┐
    │           Feature Modules (13+)             │
    │  Orders │ Items │ Customers │ Promos       │
    │  Transactions │ Reports │ Team Members     │
    │  Users │ App Settings │ Audit Logs         │
    └─────┬────────────────┬─────────────────────┘
          │                │
    ┌─────▼────────────────▼─────┐
    │      Database Layer         │
    │  Drizzle ORM + PostgreSQL   │
    │  (Multi-tenant via appId)   │
    └─────────────────────────────┘
```

### Multi-Tenancy Model

- **Single database, shared schema** — isolated by `appId` (UUID) on every table
- **API Key per app** — issued at app creation, passed via `x-api-key` header
- **Row-level isolation** — all queries automatically scoped to `appId` from authenticated context

---

## 🛠 Tech Stack

| Category             | Technology               | Version   |
| -------------------- | ------------------------ | --------- |
| **Framework**        | NestJS                   | 11.x      |
| **Language**         | TypeScript               | 5.7       |
| **Database**         | PostgreSQL               | 16+       |
| **ORM**              | Drizzle ORM              | 0.45      |
| **Auth**             | Passport (JWT) + API Key | —         |
| **Validation**       | class-validator + Joi    | —         |
| **Documentation**    | Swagger/OpenAPI          | 11.x      |
| **Rate Limiting**    | @nestjs/throttler        | 6.x       |
| **Scheduling**       | @nestjs/schedule         | 6.x       |
| **Testing**          | Jest + Supertest         | 30.x      |
| **Containerization** | Docker + docker-compose  | —         |
| **Linting**          | ESLint + Prettier        | 9.x / 3.x |

---

## ✨ Features

| Module            | Description                                                                                                                                                                                      |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Auth**          | JWT (15m access + 7d refresh rotation), Google OAuth 2.0, API Key auth, dual-guard (`DualAuthGuard`)                                                                                             |
| **Apps**          | Multi-tenant app registry, API key generation/rotation, invite members via email                                                                                                                 |
| **Users & Roles** | Role hierarchy: `DEV` > `OWNER` > `ADMIN` > `STAFF` > `USER`                                                                                                                                     |
| **Team Members**  | Staff/karyawan management per app, linked to orders                                                                                                                                              |
| **Customers**     | CRUD, loyalty points, tags, address hierarchy (village → province), search/filter                                                                                                                |
| **Items**         | Products/services with SKU, price, COGS, category, soft delete                                                                                                                                   |
| **Orders**        | Full lifecycle: `RECEIVED → IN_PROCESS → READY → DONE` / `CANCELLED`, due date, COGS tracking, **team member assignment with role-based authorization**                                          |
| **Promos**        | Percentage/nominal, scope (all/specific items/customers), usage limits, min order, date range                                                                                                    |
| **Transactions**  | Cash flow ledger: `IN` (SALES, FUND_IN) / `OUT` (EXPENSE, FUND_OUT, ADJUSTMENT, CAPEX), auto-linked to orders, **fee handling, custom transaction date, payment status (PAID/UNPAID), due date** |
| **Reports**       | Summary, top items, sales trend, payment methods, overview dashboard, promo budget                                                                                                               |
| **App Settings**  | Key-value store per app (business name, address, receipt footer, prefixes, etc.)                                                                                                                 |
| **Audit Logs**    | Immutable trail: actor (human/system), action, entity, before/after state, IP                                                                                                                    |
| **Doc Numbering** | Sequential per day per prefix: `ORD-20260712-0001`, `TRX-20260712-0001`                                                                                                                          |

---

## 🗄 Database Schema (ERD)

```mermaid
erDiagram
    APPS ||--o{ USERS : "members"
    APPS ||--o{ ITEMS : "has"
    APPS ||--o{ CUSTOMERS : "has"
    APPS ||--o{ ORDERS : "has"
    APPS ||--o{ TRANSACTIONS : "has"
    APPS ||--o{ PROMOS : "has"
    APPS ||--o{ TEAM_MEMBERS : "has"
    APPS ||--o{ APP_SETTINGS : "config"
    APPS ||--o{ AUDIT_LOGS : "logs"
    APPS ||--o{ DOC_COUNTERS : "sequences"

    USERS ||--o{ ACCOUNTS : "oauth"
    USERS ||--o{ SESSIONS : "has"
    USERS ||--o{ REFRESH_TOKENS : "has"

    ORDERS ||--o{ ORDER_ITEMS : "contains"
    ORDERS }|--|| CUSTOMERS : "belongs to"
    ORDERS }|--|| USERS : "handled by"
    ORDERS }|--|| TEAM_MEMBERS : "assigned to"
    ORDERS }|--|| PROMOS : "uses"
    ORDERS ||--o{ TRANSACTIONS : "generates"
    ORDERS ||--o{ PROMO_USAGES : "tracks"

    TRANSACTIONS ||--o{ TRANSACTION_ITEMS : "details"
```

### Key Tables

| Table               | Purpose                                     |
| ------------------- | ------------------------------------------- |
| `apps`              | Tenant registry, API keys                   |
| `users`             | Global users (auth)                         |
| `user_apps`         | Many-to-many: user ↔ app with role + status |
| `app_invites`       | Pending email invitations                   |
| `team_members`      | Staff/karyawan per app (linked to orders)   |
| `items`             | Products/services catalog                   |
| `customers`         | Customer profiles + loyalty                 |
| `orders`            | Order header + status machine               |
| `order_items`       | Line items with snapshot pricing            |
| `promos`            | Promo definitions                           |
| `promo_usages`      | Redemption tracking                         |
| `transactions`      | General ledger (IN/OUT)                     |
| `transaction_items` | Transaction line details                    |
| `audit_logs`        | Immutable audit trail                       |
| `doc_counters`      | Daily sequence per prefix per app           |
| `app_settings`      | Key-value config per app                    |

---

## 📚 API Documentation

### Swagger UI

```
GET  /api/docs
```

Protected by basic auth (set `SWAGGER_USER` / `SWAGGER_PASS` in env).

### Authentication

| Method                | Header                                 | Description                                    |
| --------------------- | -------------------------------------- | ---------------------------------------------- |
| **JWT (User)**        | `Authorization: Bearer <access_token>` | Short-lived (15m), refresh via `/auth/refresh` |
| **API Key (Machine)** | `x-api-key: <app_api_key>`             | Long-lived, identifies `appId` automatically   |

Both can be used simultaneously — `DualAuthGuard` accepts either.

### Base URL

```
http://localhost:3000/api/v1   (dev)
https://your-domain.com/api/v1 (prod)
```

### Core Endpoints

| Module           | Endpoints                                                                                                                                                                                                                                |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Auth**         | `POST /auth/login`, `POST /auth/google`, `POST /auth/refresh`, `POST /auth/logout`                                                                                                                                                       |
| **Apps**         | `POST /apps`, `GET /apps`, `GET /apps/:id`, `POST /apps/:id/rotate-key`, `POST /apps/:id/invite`                                                                                                                                         |
| **Users**        | `GET /users/me`, `PATCH /users/me`, `GET /users/:id`                                                                                                                                                                                     |
| **Team Members** | `POST /team-members`, `GET /team-members`                                                                                                                                                                                                |
| **Customers**    | `POST /customers`, `GET /customers`, `GET /customers/:id`, `PATCH /customers/:id`, `DELETE /customers/:id`                                                                                                                               |
| **Items**        | `POST /items`, `GET /items`, `GET /items/:id`, `PATCH /items/:id`, `DELETE /items/:id`                                                                                                                                                   |
| **Orders**       | `POST /orders`, `GET /orders`, `GET /orders/:id`, `PATCH /orders/:id/status`, `POST /orders/:id/pay`, `GET /orders/active`, `GET /orders/track/:orderNumber`, `GET /orders/:id/receipt`                                                  |
| **Promos**       | `POST /promos`, `GET /promos`, `GET /promos/:id`, `PATCH /promos/:id`, `DELETE /promos/:id`, `POST /promos/check`                                                                                                                        |
| **Transactions** | `POST /transactions`, `GET /transactions`, `PATCH /transactions/:id/pay`                                                                                                                                                                 |
| **Reports**      | `GET /reports/summary`, `GET /reports/top-items`, `GET /reports/sales-trend`, `GET /reports/payment-methods`, `GET /reports/overview`, `GET /reports/promo-budget`, `GET /reports/expenses/summary`, `GET /reports/expenses/by-category` |
| **App Settings** | `GET /app-settings`, `PATCH /app-settings`                                                                                                                                                                                               |

---

## ⚙️ Environment Variables

Create `.env` from `.env.example`:

```bash
# Required
DATABASE_URL=postgresql://user:pass@localhost:5432/cotebek?schema=public
JWT_SECRET=your-super-secret-min-32-chars
GOOGLE_CLIENT_ID=your-google-oauth-client-id

# Optional
PORT=3000
ALLOWED_ORIGINS=http://localhost:3000,https://your-frontend.com
SWAGGER_USER=admin
SWAGGER_PASS=secret
```

| Variable           | Required | Description                                  |
| ------------------ | -------- | -------------------------------------------- |
| `DATABASE_URL`     | ✅       | PostgreSQL connection string                 |
| `JWT_SECRET`       | ✅       | Min 32 chars, used for access/refresh tokens |
| `GOOGLE_CLIENT_ID` | ✅       | For Google OAuth login                       |
| `PORT`             | ❌       | Default: 3000                                |
| `ALLOWED_ORIGINS`  | ❌       | CORS origins (comma-separated), default: `*` |
| `SWAGGER_USER`     | ❌       | Basic auth for `/api/docs`                   |
| `SWAGGER_PASS`     | ❌       | Basic auth for `/api/docs`                   |

---

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- PostgreSQL 16+
- pnpm (recommended) or npm/yarn

### Local Development

```bash
# 1. Clone & install
git clone https://github.com/airizf11/cotebek.git
cd cotebek
pnpm install

# 2. Setup environment
cp .env.example .env
# Edit .env with your DATABASE_URL, JWT_SECRET, GOOGLE_CLIENT_ID

# 3. Run migrations
pnpm drizzle:migrate

# 4. Start dev server (watch mode)
pnpm start:dev

# 5. Open Swagger
open http://localhost:3000/api/docs
```

### Docker (Recommended for Consistency)

```bash
# Build & run all services (app + postgres)
docker-compose up -d --build

# View logs
docker-compose logs -f app

# Run migrations inside container
docker-compose exec app pnpm drizzle:migrate
```

### Production Build

```bash
pnpm build
pnpm start:prod
```

---

## 🗃 Database Migrations

Using **Drizzle Kit** for type-safe migrations.

```bash
# Generate new migration after schema changes
pnpm drizzle:generate

# Apply pending migrations
pnpm drizzle:migrate

# Push schema directly (dev only, no migration file)
pnpm drizzle:push

# Open Drizzle Studio (GUI)
pnpm drizzle:studio
```

### Migration Files

Located in `drizzle/` — 22 migrations and counting. Each is a timestamped `.sql` file.

---

## 🧪 Testing

```bash
# Unit tests
pnpm test

# Watch mode
pnpm test:watch

# Coverage report
pnpm test:cov

# E2E tests (requires running DB)
pnpm test:e2e

# Debug e2e
pnpm test:debug
```

### Test Structure

```
test/
├── app.e2e-spec.ts          # Basic health check
├── jest-e2e.json            # E2E config
└── http-tests/              # HTTP test scenarios (optional)
```

---

## 📁 Project Structure

```
src/
├── app.module.ts                 # Root module
├── main.ts                       # Bootstrap, Swagger, Helmet, CORS
├── app.controller.ts             # Health check
├── app.service.ts
│
├── auth/                         # Authentication & authorization
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   ├── auth.module.ts
│   ├── jwt.strategy.ts
│   ├── jwt-auth.guard.ts
│   ├── dual-auth/                # JWT + API Key guard
│   ├── api-key/                  # API key validation
│   ├── token-cleanup.service.ts  # Cron: purge expired refresh tokens
│   └── dto/
│
├── apps/                         # Multi-tenant app registry
│   ├── apps.controller.ts
│   ├── apps.service.ts
│   └── dto/
│
├── users/                        # Global user management
│
├── team-members/                 # Staff/karyawan per app
│
├── customers/                    # Customer CRM
│
├── items/                        # Product/service catalog
│
├── orders/                       # Order lifecycle + state machine
│   ├── orders.service.ts
│   ├── dto/
│   └── entities/
│
├── promos/                       # Promo engine
│
├── transactions/                 # General ledger (cash flow)
│
├── reports/                      # Analytics & reporting
│   ├── orders-reports.service.ts
│   ├── transactions-reports.service.ts
│   └── net-profit.service.ts
│
├── app-settings/                 # Key-value config per app
│
├── database/                     # Drizzle connection & schema
│   ├── database.module.ts
│   └── schema.ts                 # ← Single source of truth
│
└── common/                       # Shared utilities
    ├── config/                   # Env validation (Joi)
    ├── constants/                # Enums: roles, actions, statuses
    ├── decorators/               # @Roles, @CurrentUser, @AppInfo
    ├── guards/                   # RolesGuard, ThrottlerGuard
    ├── interceptors/             # Transform, Logging
    ├── filters/                  # Global exception filter
    ├── services/                 # AuditService
    ├── utils/                    # paginate, doc-number generator
    └── dto/                      # PaginationDto, etc.
```

---

## 💡 Key Design Patterns

### 1. Transactional Outbox (Orders → Transactions)

```typescript
// Inside OrdersService.create()
await this.db.transaction(async (tx) => {
  const order = await tx.insert(orders).values({...}).returning();
  await tx.insert(orderItems).values(items);
  if (paid) await tx.insert(transactions).values({ type: 'IN', category: 'SALES', ... });
  if (promo) await tx.insert(promoUsages).values({...});
});
```

Atomic: order + items + transaction + promo usage all succeed or rollback.

### 2. Audit Logging (Every Mutation)

```typescript
await this.auditService.log({
  appId,
  userId,
  action: AUDIT_ACTIONS.CREATE_ORDER,
  entity: 'orders',
  entityId: order.id,
  before: null,
  after: { orderNumber, totalAmount },
  ipAddress,
});
```

Stored in `audit_logs` with `actorType: 'HUMAN' | 'SYSTEM'`.

### 3. Document Numbering (Per Day, Per App, Per Prefix)

```typescript
// generateDocNumber(tx, appId, 'order') → "ORD-20260712-0001"
```

Uses `doc_counters` table with `ON CONFLICT DO UPDATE seq = seq + 1`.

### 4. Order State Machine

```typescript
const ALLOWED_TRANSITIONS = {
  RECEIVED: ['IN_PROCESS', 'CANCELLED'],
  IN_PROCESS: ['READY', 'CANCELLED'],
  READY: ['DONE', 'CANCELLED'],
  DONE: [],
  CANCELLED: [],
};
```

Enforced in `OrdersService.updateStatus()`.

### 5. Soft Delete Pattern

- `items`, `promos`, `team_members` → `isActive: boolean`
- `customers` → hard delete (FK protected), returns 409 if orders exist

### 6. Multi-Tenant Query Scoping

Every service method receives `appId` from guard → all queries include `.where(eq(schema.table.appId, appId))`.

### 7. Fee & Net Amount Calculation (Transactions)

```typescript
// Inside TransactionsService.create()
const fee = dto.fee ?? 0;
const netAmount = dto.type === 'IN' ? dto.amount - fee : dto.amount + fee;

await tx.insert(schema.transactions).values({
  amount: netAmount.toString(),
  fee: dto.fee ? dto.fee.toString() : undefined,
  // ...
});
```

- **IN** (income): `netAmount = amount - fee` (e.g., payment gateway fee deducted)
- **OUT** (expense): `netAmount = amount + fee` (e.g., bank transfer fee added)
- Stored separately: `amount` (net), `fee` (original fee)

### 8. Team Member Authorization (Orders)

```typescript
// Inside OrdersService.create() — STAFF restriction
const callerRole = await this.db
  .select({ role: schema.userApps.role })
  .from(schema.userApps)
  .where(
    and(
      eq(schema.userApps.userId, handledBy),
      eq(schema.userApps.appId, appId),
    ),
  )
  .limit(1);

const isSelf = member[0].userId === handledBy;
const isUnlinked = member[0].userId === null;

if (role === 'STAFF' && !isSelf && !isUnlinked) {
  throw new ForbiddenException(
    'Staff can only log entries under their own name or a team member without a linked account.',
  );
}
```

- **OWNER/ADMIN**: Can assign any team member
- **STAFF**: Can only create orders for themselves or unlinked team members (no account)
- Prevents staff from impersonating other staff

## 🐳 Deployment

### Docker Compose (Production)

```yaml
# docker-compose.prod.yml
services:
  app:
    build: .
    environment:
      - DATABASE_URL=postgresql://user:pass@db:5432/cotebek
      - JWT_SECRET=${JWT_SECRET}
      - GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID}
    depends_on:
      - db
    restart: unless-stopped

  db:
    image: postgres:16-alpine
    environment:
      - POSTGRES_DB=cotebek
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=pass
    volumes:
      - pgdata:/var/lib/postgresql/data
    restart: unless-stopped

volumes:
  pgdata:
```

### Health Check

```bash
curl http://localhost:3000/api/v1/health
# {"status":"ok","timestamp":"2026-07-12T..."}
```

### Environment Checklist for Production

- [ ] Strong `JWT_SECRET` (64+ chars)
- [ ] `ALLOWED_ORIGINS` restricted to your frontend domain
- [ ] `SWAGGER_USER`/`SWAGGER_PASS` set (or disable Swagger in prod)
- [ ] PostgreSQL: `max_connections`, `shared_buffers` tuned
- [ ] Reverse proxy (nginx/Traefik) with TLS termination
- [ ] Log aggregation (Loki, Datadog, etc.)
- [ ] Backup strategy for PostgreSQL (pg_dump + WAL-G)

---

## ❓ FAQ

### Q: Can I use this for a single-tenant app?

**A:** Yes. Create one `App` record, use its API key everywhere. The multi-tenant layer adds negligible overhead.

### Q: How do I add a new feature module?

1. `nest g module features/xyz`
2. `nest g service features/xyz`
3. `nest g controller features/xyz`
4. Add tables to `drizzle/schema.ts`
5. `pnpm drizzle:generate && pnpm drizzle:migrate`
6. Register in `AppModule.imports`

### Q: How does API Key rotation work?

`POST /apps/:id/rotate-key` → generates new key, invalidates old one immediately. Update your clients.

### Q: Can I extend the role hierarchy?

Yes. Edit `appRoleEnum` in `drizzle/schema.ts` and `APP_ROLES` in `common/constants/enums.constant.ts`. Update `RolesGuard` logic if needed.

### Q: Where are refresh tokens stored?

In `refresh_tokens` table (hashed? no, plaintext — rotate frequently). Cleanup via `TokenCleanupService` cron (daily at 3 AM).

### Q: How to customize document prefixes?

`PATCH /app-settings` with keys: `order_prefix`, `tx_prefix`. Default: `ORD`, `TRX`.

### Q: Does it support webhooks?

Not yet. Add a `webhooks` table + `WebhookService` + queue (BullMQ) for async delivery.

---

## 🤝 Contributing

```bash
# 1. Fork & clone
# 2. Create feature branch
git checkout -b feat/amazing-feature

# 3. Make changes, ensure lint & tests pass
pnpm lint
pnpm test
pnpm test:e2e

# 4. Commit (conventional commits)
git commit -m "feat(xyz): add amazing feature"

# 5. Push & open PR
```

### Code Style

- **ESLint** + **Prettier** (run `pnpm format` before commit)
- **Conventional Commits**: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`
- **TypeScript strict mode** enabled

---

## 📄 License

**MIT License** — see [LICENSE](LICENSE) for details.

```
MIT License

Copyright (c) 2024-present CoTEBek Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## 🙏 Acknowledgments

- [NestJS](https://nestjs.com/) — The progressive Node.js framework
- [Drizzle ORM](https://orm.drizzle.team/) — Type-safe SQL for TypeScript
- [PostgreSQL](https://www.postgresql.org/) — The world's most advanced open source database
- All contributors ❤️

---

<p align="center">
  Made with ☕ in Indonesia — <a href="https://github.com/airizf11/cotebek">github.com/airizf11/cotebek</a>
</p>
