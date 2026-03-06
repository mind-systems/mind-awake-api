# AGENTS.md

> Project map for AI agents. Keep this file up-to-date as the project evolves.

## Project Overview
Mind Awake API is a NestJS 11 REST backend for a mindfulness breathing app. It handles passwordless email-code authentication, JWT session management with blacklist, and CRUD operations for breath sessions.

## Tech Stack
- **Language:** TypeScript 5.7
- **Framework:** NestJS 11
- **Database:** PostgreSQL (TypeORM 0.3, migration-based)
- **Auth:** Passwordless email OTP + JWT (passport-jwt)
- **Mail:** Resend (transactional email)
- **Infrastructure:** Docker (multi-stage), Makefile, Jenkins CI

## Project Structure
```
mind_api/
├── src/
│   ├── app.module.ts              # Root module — wires all feature modules
│   ├── main.ts                    # Bootstrap: Helmet, Swagger, Winston logger
│   ├── health.controller.ts       # GET /health — liveness probe
│   ├── users/                     # Auth feature module
│   │   ├── auth.module.ts         # Module definition
│   │   ├── auth.controller.ts     # POST /auth/send-code, /verify-code, /logout
│   │   ├── service/
│   │   │   ├── auth.service.ts         # JWT generation + logout
│   │   │   ├── auth-code.service.ts    # OTP send/verify + cron cleanup
│   │   │   ├── auth.service.spec.ts
│   │   │   └── jwt-blacklist.service.ts  # Token revocation + cron cleanup
│   │   ├── guards/
│   │   │   └── jwt-auth.guard.ts  # Bearer JWT guard (checks blacklist)
│   │   ├── strategies/
│   │   │   └── jwt.strategy.ts    # Passport JWT strategy
│   │   ├── decorators/
│   │   │   └── current-user.decorator.ts
│   │   ├── dto/
│   │   │   ├── send-code.dto.ts        # { email }
│   │   │   ├── verify-code.dto.ts      # { email, code }
│   │   │   └── auth-response.dto.ts
│   │   ├── entities/
│   │   │   ├── user.entity.ts          # User table (UUID PK)
│   │   │   ├── auth-code.entity.ts     # OTP codes table (15-min TTL)
│   │   │   └── jwt-blacklist.entity.ts
│   │   └── interfaces/
│   │       ├── auth.interface.ts
│   │       └── user-role.enum.ts
│   ├── mail/                      # Mail feature module (global)
│   │   ├── mail.module.ts
│   │   ├── mail.service.ts        # Resend integration
│   │   └── templates/
│   │       └── auth-code.html     # OTP email template (magic link + manual code)
│   ├── breath-sessions/           # Breath sessions feature module
│   │   ├── breath-sessions.module.ts
│   │   ├── breath-sessions.controller.ts  # CRUD + shared endpoint
│   │   ├── breath-sessions.service.ts
│   │   ├── dto/
│   │   │   └── breath-session.dto.ts
│   │   └── entities/
│   │       └── breath-session.entity.ts
│   ├── config/
│   │   └── typeorm.config.ts      # TypeORM DataSource (for CLI migrations)
│   └── migrations/                # TypeORM migration files (explicit, no sync)
├── database.config.ts             # TypeORM config factory (used by AppModule)
├── .ai-factory/
│   ├── DESCRIPTION.md             # Project specification and tech stack
│   └── ARCHITECTURE.md            # Architecture decisions
├── docker-compose.dev.yml         # Dev: nestjs + postgres services
├── docker-compose.prod.yml        # Prod: hardened compose
├── Dockerfile                     # Multi-stage: dev + prod targets
├── Makefile                       # Shortcuts: make up/down/logs/health
├── Jenkinsfile                    # CI pipeline (prod)
├── Jenkinsfile.dev                # CI pipeline (dev)
├── .env                           # Base environment variables (gitignored)
├── .env.dev                       # Dev environment overrides
├── .env.prod                      # Prod environment overrides
├── nest-cli.json                  # NestJS CLI config
└── package.json                   # Dependencies + npm scripts
```

## Key Entry Points
| File | Purpose |
|------|---------|
| [src/main.ts](src/main.ts) | App bootstrap — Helmet, Swagger, Winston, port binding |
| [src/app.module.ts](src/app.module.ts) | Root module — imports all feature modules |
| [database.config.ts](database.config.ts) | TypeORM factory config used by AppModule |
| [src/config/typeorm.config.ts](src/config/typeorm.config.ts) | DataSource for TypeORM CLI (migrations) |
| [src/users/auth.controller.ts](src/users/auth.controller.ts) | Auth endpoints |
| [src/breath-sessions/breath-sessions.controller.ts](src/breath-sessions/breath-sessions.controller.ts) | Breath session CRUD |

## Documentation
| Document | Path | Description |
|----------|------|-------------|
| README | [README.md](README.md) | Project landing page |
| Email Auth | [docs/email-auth.md](docs/email-auth.md) | Passwordless OTP flow — endpoints, DB, mail, token lifecycle |

## AI Context Files
| File | Purpose |
|------|---------|
| AGENTS.md | This file — project structure map |
| [.ai-factory/DESCRIPTION.md](.ai-factory/DESCRIPTION.md) | Project specification and tech stack |
| [.ai-factory/ARCHITECTURE.md](.ai-factory/ARCHITECTURE.md) | Architecture decisions and guidelines |

## Key Conventions
- **Migrations:** Always use explicit migrations (`npm run migration:run`). Never enable `synchronize: true`.
- **Auth flow:** Client calls `POST /auth/send-code` → receives OTP by email → calls `POST /auth/verify-code` → gets JWT
- **Env vars:** Dev uses `.env.dev`, prod uses `.env.prod`; base `.env` for local development
- **Ports:** Dev Docker API=3002, DB=5432; local API=3000
- **Tests:** `src/**/*.spec.ts` pattern; run with `npm test`
- **Swagger:** Available at `/api/docs` (disabled in production)
