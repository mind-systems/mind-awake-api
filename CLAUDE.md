# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npm run start:dev          # Watch mode (local)
npm run build              # Compile TypeScript
npm run start:prod         # Run compiled output

# Testing
npm test                   # Run all unit tests
npm run test:cov           # With coverage
npm run test:e2e           # End-to-end tests
# Run a single test file:
npx jest src/users/service/auth.service.spec.ts

# Linting & formatting
npm run lint               # ESLint --fix
npm run format             # Prettier

# Migrations
npm run migration:run      # Apply pending migrations
npm run migration:revert   # Revert last migration
npm run migration:create src/migrations/<Name>  # Scaffold new migration

# Docker (dev)
make up                    # Start (API on :3002, DB on :5432)
make down                  # Stop
make logs                  # Tail nestjs logs
make health                # curl localhost:3002/health

# Docker (prod)
make build-prod && make up-prod
```

## Architecture

**Pattern:** Modular Monolith. Each domain (auth, breath-sessions, firebase) is a self-contained NestJS feature module. Modules communicate only through their exported providers — never by importing internals from another module's files.

### Module dependency graph

```
AppModule
  ├── FirebaseModule (@Global)      ← no dependencies
  ├── AuthModule                    ← FirebaseModule (implicit via global)
  └── BreathSessionsModule          ← AuthModule (for JwtAuthGuard + @CurrentUser)
```

`ConfigModule` is also global (`isGlobal: true`), available everywhere without explicit import.

### Two-guard auth system

The login endpoint (`POST /auth/login`) is protected by **`FirebaseAuthGuard`** — it verifies the Firebase ID Token from the request body, then attaches the decoded Firebase user to `req.user`.

All other protected routes use **`JwtAuthGuard`** (passport-jwt), which also checks the **JWT blacklist** table before granting access. The blacklist is a PostgreSQL table (`jwt_blacklist`) — revoked tokens are inserted on logout and purged nightly via `@Cron`.

The auth flow: client sends Firebase ID Token → `POST /auth/login` → server upserts User, issues JWT → JWT returned in `Authorization` header → client uses `Bearer <jwt>` for all subsequent requests.

### Entities belong to their module

`@InjectRepository` is only used within the module that owns the entity. If `BreathSessionsModule` needs user data, it calls `AuthService` (exported by `AuthModule`) — it does not inject `UserRepository` directly.

### Database migrations

`synchronize` is always `false`. All schema changes require an explicit migration file under `src/migrations/`. Migrations run automatically on startup (`migrationsRun: true` in `database.config.ts`) but should also be run manually during development with `npm run migration:run`.

There are two TypeORM config files:
- `database.config.ts` — factory used by `AppModule` at runtime
- `src/config/typeorm.config.ts` — `DataSource` instance used by the TypeORM CLI for migration commands

### Controllers are thin

Controllers handle HTTP concerns only (status codes, response shape, Swagger decorators) and extract `req.user.sub` for the user ID. All logic lives in services.

### Environment

| File | Used for |
|------|----------|
| `.env` | Local development (base) |
| `.env.dev` | Docker dev (`make up`) |
| `.env.prod` | Docker prod (`make up-prod`) |

Swagger UI is available at `/api/docs` and is disabled in production (`NODE_ENV === 'production'`).
