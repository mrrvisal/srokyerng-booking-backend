# SrokYerng Booking Backend

Backend API for an accommodation booking platform (customers, owners, admins).

## Current Scope

- Implemented: `auth` module (`register`, `login`, auth middleware, role middleware), `users` self-profile endpoints
- Scaffolded or partial: `properties`, `rooms`, `reservations`, `payments`, `reviews`, `amenities`, `admin`

## Tech Stack

- Node.js + Express
- MySQL (`mysql2`)
- JWT (`jsonwebtoken`)
- Password hashing (`bcrypt`)

## Project Structure

```text
src/
  app.js
  server.js
  config/
  constants/
  middleware/
  modules/
  routes/
  utils/
  database/
```

## Prerequisites

- Node.js 18+ (Node 20+ recommended)
- MySQL 8+

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create environment file:

```bash
cp .env.example .env
```

3. Update `.env` values:

- `PORT`
- `DB_HOST`
- `DB_PORT`
- `DB_USER`
- `DB_PASSWORD`
- `DB_NAME`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `REFRESH_TOKEN_EXPIRES_DAYS`
- `REFRESH_TOKEN_COOKIE_SECURE`
- `REFRESH_TOKEN_COOKIE_SAME_SITE`
- `FRONTEND_URL`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASSWORD`
- `SMTP_FROM`
- `SMTP_SECURE`
- `ADMIN_FULL_NAME`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`

4. Create database schema and seed base data:

- Run SQL in `src/database/schema.sql`
- Run SQL in `src/database/seeders/001-roles.seed.sql`
- Run SQL in `src/database/seeders/002-account-statuses.seed.sql`
- Run SQL in `src/database/seeders/003-categories.seed.sql`
- Run SQL in `src/database/seeders/004-property-statuses.seed.sql`
- Run SQL in `src/database/seeders/005-room-types.seed.sql`
- Run SQL in `src/database/seeders/006-payment-methods.seed.sql`
- Run SQL in `src/database/seeders/007-payment-statuses.seed.sql`
- Run SQL in `src/database/seeders/008-amenities.seed.sql`

5. Create the first admin account:

```bash
npm run seed:admin
```

## Run

- Development:

```bash
npm run dev
```

- Production mode:

```bash
npm start
```

## API Base URL

- Local: `http://localhost:<PORT>/api`

## Implemented Endpoints

- `GET /health` (under `/api`)
- `POST /auth/register`
- `POST /auth/login` (rate limited)
- `POST /auth/refresh-token`
- `POST /auth/forgot-password` (rate limited)
- `POST /auth/reset-password` (rate limited)
- `POST /auth/verify-email`
- `POST /auth/resend-verification-email` (requires `Authorization: Bearer <token>`, rate limited)
- `GET /auth/me` (requires `Authorization: Bearer <token>`)
- `GET /auth/sessions` (requires `Authorization: Bearer <token>`)
- `DELETE /auth/sessions/:id` (requires `Authorization: Bearer <token>`)
- `POST /auth/logout` (requires `Authorization: Bearer <token>`)
- `POST /auth/logout-all` (requires `Authorization: Bearer <token>`)
- `GET /users` (requires `admin`)
- `GET /users/:id` (requires `admin`)
- `PATCH /users/:id/status` (requires `admin`)
- `GET /users/me` (requires `Authorization: Bearer <token>`)
- `PATCH /users/me` (requires `Authorization: Bearer <token>`)
- `PATCH /users/me/profile-image` (requires `Authorization: Bearer <token>`)
- `PATCH /users/me/password` (requires `Authorization: Bearer <token>`)

## Response Shape

Success:

```json
{
  "success": true,
  "message": "Success",
  "data": {}
}
```

Error:

```json
{
  "success": false,
  "message": "Something went wrong",
  "errors": []
}
```

## Quality Commands

- Run tests:

```bash
npm test
```

- Lint:

```bash
npm run lint
```

- Format:

```bash
npm run format
```

- Check formatting:

```bash
npm run format:check
```

## Smoke Tests

`test/auth.smoke.test.js` currently verifies:

- register validation failure path (`400`)
- login validation failure path (`400`)
- protected route without token (`401`)
- auth service register/login/current-user behavior
- forgot/reset password validation and service behavior

`test/users.smoke.test.js` currently verifies:

- profile update validation failure path (`400`)
- password change validation failure path (`400`)
- user service profile update behavior
- user service password change behavior

## Team Notes

- `docs/setup-guide.md`
- `docs/api-contract.md`
- `docs/backend-rules.md`
- `docs/module-ownership.md`
