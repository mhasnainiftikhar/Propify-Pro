# Propify Pro — API (Auth Service)

Standalone authentication and user-management microservice for **Propify Pro**.

This service is **self-contained**: it owns its own PostgreSQL database (via
`AUTH_DATABASE_URL`) and its own Prisma schema. It does **not** assume access
to any other service's database.

## Tech stack

- NestJS (TypeScript)
- Prisma Client (PostgreSQL)
- Passport.js (`passport-jwt`) for bearer-token auth
- `argon2` for password hashing
- `class-validator` + `class-transformer` for DTO validation
- `@nestjs/swagger` for API docs (served at `/docs`)
- `@nestjs/throttler` for rate limiting

## Cross-service contract

### Authentication model

- **Access token** — short-lived JWT (`15m`). Carries `sub`, `email`, `role`,
  `status`. Sent as `Authorization: Bearer <token>`.
- **Refresh token** — opaque random string, **7 day** expiry. Only its **SHA-256
  HMAC hash** is persisted in the `RefreshToken` table; the raw token is never
  stored. Rotated on every `/refresh` (old token revoked, new pair issued).
- **Passwords** — hashed with `argon2`. Never logged, never returned by any DTO.
  Every response that includes a user goes through `toSafeUser()` which strips
  `passwordHash`, `twoFactorSecret`, and token hashes.

### JWT payload (shared with other services)

```json
{
  "sub": "<user-id>",
  "email": "user@example.com",
  "role": "USER",
  "status": "ACTIVE",
  "iat": 1700000000,
  "exp": 1700000900
}
```

`role` is read from the JWT payload by the `RolesGuard` (no DB lookup per
request). Roles: `USER`, `ADMIN`.

### Base URL

All routes are served under `/api`. Service defaults to port **3002**.

### Swagger

Interactive docs: `GET http://localhost:3002/docs`

## Endpoints

### Auth — `/api/auth`

| Method | Path                 | Description                            |
| ------ | -------------------- | -------------------------------------- |
| POST   | `/api/auth/register`        | Create account (returns safe user)     |
| POST   | `/api/auth/login`           | Login → `{ accessToken, refreshToken, user }` |
| POST   | `/api/auth/refresh`         | Rotate refresh token → new token pair  |
| POST   | `/api/auth/logout`          | Revoke refresh token                   |
| POST   | `/api/auth/forgot-password` | Request password reset link            |
| POST   | `/api/auth/reset-password`  | Set new password with reset token      |
| GET    | `/api/auth/verify-email/:token` | Verify email address               |

Rate limited: `/register` (10/min), `/login` (5/min), `/forgot-password` (5/min).

### Users — `/api/users` (Bearer token required)

| Method | Path                      | Description                       |
| ------ | ------------------------- | --------------------------------- |
| GET    | `/api/users/me`           | Current user profile              |
| PATCH  | `/api/users/me`           | Update first/last name            |
| GET    | `/api/users`              | List users (**ADMIN only**)       |
| PATCH  | `/api/users/:id/suspend`  | Suspend user (**ADMIN only**)     |

## Error shape

All errors use a consistent envelope:

```json
{ "statusCode": 400, "message": "some message", "error": "BadRequest" }
```

`message` may be an array of validation messages for class-validator failures.

## Env vars

| Variable                | Default                     | Description                              |
| ----------------------- | --------------------------- | ---------------------------------------- |
| `AUTH_DATABASE_URL`     | —                           | Postgres DSN for this service's database |
| `JWT_ACCESS_SECRET`     | `change-me-access-secret`   | Secret used to sign access tokens        |
| `JWT_ACCESS_EXPIRES_IN` | `15m`                       | Access token lifetime                    |
| `JWT_REFRESH_SECRET`    | `change-me-refresh-secret`  | Pepper used to HMAC refresh tokens       |
| `REFRESH_TOKEN_TTL_DAYS`| `7`                         | Refresh token lifetime                   |
| `FRONTEND_URL`          | `http://localhost:3001`     | Base URL used for verification/reset links |
| `AUTH_SERVICE_PORT`     | `3002`                      | HTTP port                                |

## Local development

```bash
cp .env.example .env
npm install
npx prisma generate          # generates client into ./generated/prisma
npx prisma migrate dev       # creates schema in the AUTH_DATABASE_URL database
npm run start:dev            # http://localhost:3002, docs at /docs
```

## Testing

```bash
npm run test                 # unit tests (src/auth/*.spec.ts)
npm run test:e2e             # e2e (requires a reachable database)
```

## Not implemented (schema fields reserved for later)

- OAuth providers
- 2FA (`twoFactorSecret`, `twoFactorEnabled` exist in the schema but no logic
  is wired up yet)
