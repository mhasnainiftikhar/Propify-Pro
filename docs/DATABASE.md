# Propify Pro — Database

## 1. Service Databases

Each microservice owns its own database. `apps/api` connects to PostgreSQL via
`AUTH_DATABASE_URL`.

## 2. Prisma Schema (`apps/api/prisma/schema.prisma`)

### Enums

| Enum        | Values                |
| ----------- | --------------------- |
| `Role`      | `USER`, `ADMIN`       |
| `UserStatus`| `ACTIVE`, `SUSPENDED` |

### `User`

| Field             | Type       | Notes                              |
| ----------------- | ---------- | ---------------------------------- |
| `id`              | `String`   | cuid, PK                           |
| `email`           | `String`   | unique                             |
| `passwordHash`    | `String`   | argon2 hash, never exposed         |
| `firstName`       | `String?`  |                                    |
| `lastName`        | `String?`  |                                    |
| `role`            | `Role`     | default `USER`                     |
| `status`          | `UserStatus` | default `ACTIVE`                 |
| `isEmailVerified` | `Boolean`  | default `false`                    |
| `emailVerifiedAt` | `DateTime?`|                                    |
| `twoFactorSecret` | `String?`  | reserved (2FA not yet implemented) |
| `twoFactorEnabled`| `Boolean`  | reserved                           |

### `RefreshToken`

| Field       | Type       | Notes                                    |
| ----------- | ---------- | ---------------------------------------- |
| `id`        | `String`   | cuid, PK                                 |
| `tokenHash` | `String`   | HMAC-SHA256 of the raw token, unique     |
| `userId`    | `String`   | FK → `User.id`, cascade delete           |
| `expiresAt` | `DateTime` | 7 days by default                        |
| `revokedAt` | `DateTime?`| set on rotation/logout                   |

### `PasswordResetToken`

One-time reset tokens. `tokenHash` unique; `usedAt` set after use.

### `EmailVerificationToken`

One-time email verification tokens. `tokenHash` unique; `usedAt` set after use.

## 3. Migrations

Migrations live in `apps/api/prisma/migrations`. Run:

```bash
npx prisma migrate dev
```

## 4. Security Notes

- Passwords: argon2, never logged or returned.
- Token hashes: only hashes stored; raw refresh tokens never persisted.
- Suspending a user revokes all of their refresh tokens.
