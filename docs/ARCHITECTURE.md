# Propify Pro — Architecture

## 1. Monorepo Layout

```
propify-pro/
├── apps/
│   ├── web/          # Next.js web application
│   └── api/          # NestJS API (modular microservice)
├── packages/
│   ├── types/        # Shared TypeScript types (roles, users, tokens)
│   ├── config/       # Shared runtime configuration
│   └── eslint-config # Shared ESLint configuration
├── infrastructure/   # Docker Compose for local services
├── docs/             # SRS, architecture, database, API docs
└── .github/          # CI workflows
```

## 2. Technology Stack

| Layer            | Technology                              |
| ---------------- | --------------------------------------- |
| Web client       | Next.js, React, TanStack Query          |
| API              | NestJS, Prisma, Passport.js, argon2     |
| Database         | PostgreSQL                              |
| Docs             | Swagger (@nestjs/swagger)               |
| Monorepo tooling | npm workspaces + Turbo                  |

## 3. API Architecture

The `apps/api` service is organized by domain modules:

```
src/
├── main.ts                  # bootstrap, global prefix, validation, Swagger
├── app.module.ts            # root module wiring
├── prisma/                  # singleton PrismaService (PrismaPg driver)
├── common/                  # guards, decorators, filters, serializers, mail
├── auth/                    # register/login/refresh/logout/forgot/reset/verify
├── users/                   # profile, admin list/suspend
├── properties/              # property listings
├── search/                  # search & filters
├── favorites/               # saved listings
├── messaging/               # conversations
├── appointments/            # viewings
├── notifications/           # user notifications
├── ai/                      # AI assistance
├── analytics/               # metrics
└── admin/                   # administration
```

### Cross-cutting concerns

- **Global prefix** `/api`
- **ValidationPipe**: `whitelist: true`, `forbidNonWhitelisted: true`
- **Global exception filter** returns `{ statusCode, message, error }`
- **Throttler**: global guard + tighter limits on auth endpoints
- **RBAC**: `RolesGuard` + `@Roles()` read `role` from the JWT payload

### Auth flow

1. `POST /api/auth/login` → access token (15 min) + refresh token (7 days).
2. Refresh token stored as an HMAC-SHA256 hash in `RefreshToken`.
3. `POST /api/auth/refresh` rotates the refresh token (revokes the old one).
4. `POST /api/auth/logout` revokes the supplied refresh token.

## 4. Frontend Architecture

```
src/
├── app/          # Next.js App Router pages & layouts
├── components/   # UI components (ui primitives, shared components)
├── features/     # Feature-scoped modules (auth, properties, ...)
├── hooks/        # Reusable React hooks
├── lib/          # Utilities
├── services/     # API client functions
├── types/        # Frontend type definitions
└── providers/    # Context providers (Auth, QueryClient, ...)
```

## 5. Deployment

- API and web are deployable independently.
- Database is provided via Docker Compose in development.
