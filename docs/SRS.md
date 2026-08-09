# Propify Pro — Software Requirements Specification (SRS)

## 1. Overview

**Propify Pro** is a property management platform. It connects property owners
with tenants and service providers, enabling listing, search, messaging,
appointments, and analytics.

The platform is built as a monorepo with a Next.js web client, a modular
NestJS API, and shared packages.

## 2. Users and Roles

| Role    | Description                                                              |
| ------- | ------------------------------------------------------------------------ |
| USER    | Default role for registered members (tenants, owners, service providers). |
| ADMIN   | Platform administrators with management and moderation permissions.      |

## 3. Functional Requirements

### FR-1 Authentication
- Users can register with email + password (argon2-hashed).
- Users can log in and receive a short-lived access token and a rotating
  refresh token.
- Refresh tokens are stored as hashes and rotated on every use.
- Users can reset forgotten passwords and verify their email address.

### FR-2 User Management
- Users can view and update their own profile.
- Admins can list users and suspend accounts.

### FR-3 Properties
- Users can create, read, update, and delete property listings.

### FR-4 Search
- Users can search and filter properties.

### FR-5 Favorites
- Users can save and remove favorite properties.

### FR-6 Messaging
- Users can exchange messages about properties.

### FR-7 Appointments
- Users can schedule and manage property viewing appointments.

### FR-8 Notifications
- Users receive notifications for platform events.

### FR-9 AI
- AI-powered assistance for property insights and listing help.

### FR-10 Analytics
- Aggregate platform usage and listing metrics.

### FR-11 Admin
- Administrative management endpoints.

## 4. Non-Functional Requirements

- **Security**: passwords argon2-hashed, tokens short-lived, RBAC enforced
  from the JWT payload, all inputs validated, sensitive fields never returned.
- **Performance**: horizontal scaling via a stateless API.
- **Reliability**: rate limiting on auth endpoints.
- **Maintainability**: modular monorepo with shared, typed packages.

## 5. Out of Scope

- OAuth providers and 2FA (schema fields reserved for later).
- Payments.
