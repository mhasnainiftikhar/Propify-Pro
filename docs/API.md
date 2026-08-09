# Propify Pro — API

Base URL: `http://localhost:3002/api`
Interactive docs (Swagger): `http://localhost:3002/docs`

All errors share the envelope:

```json
{ "statusCode": 400, "message": "string or string[]", "error": "ErrorType" }
```

## Auth — `/api/auth`

| Method | Path                 | Auth | Description                          |
| ------ | -------------------- | ---- | ------------------------------------ |
| POST   | `/api/auth/register`        | —    | Create account                       |
| POST   | `/api/auth/login`           | —    | Login → `{ accessToken, refreshToken, user }` |
| POST   | `/api/auth/refresh`         | —    | Rotate refresh token → new pair      |
| POST   | `/api/auth/logout`          | —    | Revoke refresh token                 |
| POST   | `/api/auth/forgot-password` | —    | Request password reset               |
| POST   | `/api/auth/reset-password`  | —    | Set new password                     |
| GET    | `/api/auth/verify-email/:token` | — | Verify email                       |

### `POST /api/auth/register`

```json
{ "email": "user@example.com", "password": "StrongPass!123", "firstName": "John", "lastName": "Doe" }
```

Returns the created user (201).

### `POST /api/auth/login`

```json
{ "email": "user@example.com", "password": "StrongPass!123" }
```

Returns:

```json
{
  "accessToken": "<jwt>",
  "refreshToken": "<opaque>",
  "user": { "id": "...", "email": "...", "firstName": "...", "lastName": "...", "role": "USER", "status": "ACTIVE" }
}
```

### `POST /api/auth/refresh`

```json
{ "refreshToken": "<current-refresh-token>" }
```

Returns a new `{ accessToken, refreshToken }`. The old refresh token is revoked.

## Users — `/api/users` (Bearer token required)

| Method | Path                     | Role  | Description                 |
| ------ | ------------------------ | ----- | --------------------------- |
| GET    | `/api/users/me`          | USER  | Current profile             |
| PATCH  | `/api/users/me`          | USER  | Update first/last name      |
| GET    | `/api/users`             | ADMIN | List users                  |
| PATCH  | `/api/users/:id/suspend` | ADMIN | Suspend a user              |

## Rate Limits

| Endpoint           | Limit        |
| ------------------ | ------------ |
| `/register`        | 10 / minute  |
| `/login`           | 5 / minute   |
| `/forgot-password` | 5 / minute   |
| default global     | 100 / minute |

## JWT Payload

```json
{ "sub": "<user-id>", "email": "user@example.com", "role": "USER", "status": "ACTIVE", "iat": 1700000000, "exp": 1700000900 }
```

Role is read from the JWT for RBAC — no DB lookup per request.
