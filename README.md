# Propify Pro

Property management platform monorepo — Next.js web client, NestJS API, and
shared packages.

## Structure

```
propify-pro/
├── apps/
│   ├── web/          # Next.js web application
│   └── api/          # NestJS API (auth, users, properties, search, ...)
├── packages/
│   ├── types/        # Shared TypeScript types
│   ├── config/       # Shared configuration
│   └── eslint-config # Shared ESLint config
├── infrastructure/
│   └── docker/       # Docker Compose (PostgreSQL, Redis)
├── docs/             # SRS, architecture, database, and API docs
└── .github/          # CI workflows
```

## Prerequisites

- Node.js >= 20.19
- Docker (for PostgreSQL / Redis)

## Getting started

```bash
# 1. Install dependencies (npm workspaces)
npm install

# 2. Start infrastructure (PostgreSQL, Redis)
npm run infra:up

# 3. Set up env vars
cp .env.example .env
cp apps/api/.env.example apps/api/.env

# 4. Run database migrations and generate the Prisma client
npm run dev:api &   # first run `npx prisma migrate dev` inside apps/api

# 5. Start the apps
npm run dev
```

- Web: http://localhost:3001
- API: http://localhost:3002/api
- Swagger docs: http://localhost:3002/docs

## Scripts

| Command            | Description                              |
| ------------------ | ---------------------------------------- |
| `npm run dev`      | Run all workspaces in dev mode (turbo)   |
| `npm run build`    | Build all workspaces                     |
| `npm run lint`     | Lint all workspaces                      |
| `npm run test`     | Test all workspaces                      |
| `npm run dev:web`  | Run the web app                          |
| `npm run dev:api`  | Run the API                              |
| `npm run infra:up` | Start Docker services                    |

## Documentation

- [Software Requirements (SRS)](docs/SRS.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Database](docs/DATABASE.md)
- [API](docs/API.md)

## Security

- Passwords hashed with argon2, never logged or returned.
- Refresh tokens stored as hashes, rotated on every refresh.
- RBAC enforced from the JWT payload.
- All inputs validated; rate limiting on auth endpoints.
