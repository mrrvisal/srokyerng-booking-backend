# Backend Setup Guide

Use this guide when setting up the backend locally.

## Requirements

- Node.js 18+ (`20+` recommended)
- MySQL 8+

## Install

```bash
npm install
```

## Environment

Create local `.env`:

```bash
cp .env.example .env
```

Required values:

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

`SMTP_*` values are required for `POST /auth/forgot-password` to send real password reset email.

## Database

Run fresh schema:

```bash
mysql -h 127.0.0.1 -P 3306 -u root -p srokyerng_booking_db < src/database/schema.sql
```

Run seed files in order:

```bash
mysql -h 127.0.0.1 -P 3306 -u root -p srokyerng_booking_db < src/database/seeders/001-roles.seed.sql
mysql -h 127.0.0.1 -P 3306 -u root -p srokyerng_booking_db < src/database/seeders/002-account-statuses.seed.sql
mysql -h 127.0.0.1 -P 3306 -u root -p srokyerng_booking_db < src/database/seeders/003-categories.seed.sql
mysql -h 127.0.0.1 -P 3306 -u root -p srokyerng_booking_db < src/database/seeders/004-property-statuses.seed.sql
mysql -h 127.0.0.1 -P 3306 -u root -p srokyerng_booking_db < src/database/seeders/005-room-types.seed.sql
mysql -h 127.0.0.1 -P 3306 -u root -p srokyerng_booking_db < src/database/seeders/006-payment-methods.seed.sql
mysql -h 127.0.0.1 -P 3306 -u root -p srokyerng_booking_db < src/database/seeders/007-payment-statuses.seed.sql
mysql -h 127.0.0.1 -P 3306 -u root -p srokyerng_booking_db < src/database/seeders/008-amenities.seed.sql
```

Create first admin account:

```bash
npm run seed:admin
```

## Run

Development:

```bash
npm run dev
```

Production:

```bash
npm start
```

## Quality Checks

```bash
npm run lint
npm test
npm run format:check
```
