# korner-support-service

Support and compliance service. Handles KYC verification, support tickets, and user reports.

## Commands

```bash
npm run build         # tsc
npm run dev           # tsc --watch
npm run start         # node dist/main.js
npm run lint          # eslint 'src/**/*.ts' --fix
npm run migrate       # knex migrate:latest
npm run migrate:dev   # knex migrate:latest --env development
npm run migrate:prod  # knex migrate:latest --env production
npm run migrate:rollback  # knex migrate:rollback
```

Note: uses `tsc --watch` for dev (no hot reload, requires restart for changes).

## Port

**3004** (default)

## Modules

| Module | Description |
|--------|-------------|
| `kyc` | KYC (Know Your Customer) identity verification flow, document uploads |
| `support` | Support tickets creation and management |
| `reports` | User reports on content/profiles |

## Background Services

- Telegram retry job via `setInterval` (30 min interval) — retries failed Telegram notifications

## Middleware

- `authMiddleware` / `optionalAuthMiddleware` — JWT Bearer auth
- `validate(schema)` — Zod validation middleware
- `kycErrorHandler.middleware.ts` — Maps KYC error strings to structured `{ error: { code, message } }` responses

## Key Utilities

- `src/utils/errorCodes.ts` — Centralized error codes (20+ KYC-specific codes)
- `src/utils/internalAuth.ts` — Internal service-to-service auth
- `src/utils/telegramNotifications.service.ts` — Team Telegram notifications
- `src/utils/transformers.ts` — Data transformation helpers

## Models

Located in `src/models/`: `kyc`, `payout-requests`, `reports`, `support-tickets`

## Database

Has its own Knex migrations in `src/migrations/`. Run migrations with `npm run migrate:dev`.

## Environment Variables

```
PORT=3004
NODE_ENV=development
PGHOST, PGPORT, PGDB=korner_db, PGUSER, PGPASSWORD
REDIS_URL
ACCESS_TOKEN_SECRET
KORNER_MAIN_URL=http://localhost:3001
TEAM_TELEGRAM_BOT_TOKEN, TEAM_TELEGRAM_CHAT_ID, PAYOUTS_REQUESTS_TELEGRAM_CHATID
AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION
ACTIVE_ENV=dev
```

## Dependencies on Other Services

- **korner-main-service** — user data lookups
