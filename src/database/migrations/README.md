# Migrations

Use migrations for incremental database changes after teammates already have local databases.

For the initial project setup, use:

- `src/database/schema.sql`
- `src/database/seeders/*.seed.sql`

## Naming

Use timestamp-based names:

```text
YYYYMMDDHHmm-short-description.sql
```

Example:

```text
202605051030-add-slug-to-properties.sql
```

## Rules

- Add one migration file per schema change.
- Do not edit old migrations after they are shared.
- Keep `schema.sql` updated for fresh setup.
- Ask the team lead to review schema changes before merging.

## Run

```bash
mysql -h 127.0.0.1 -P 3306 -u root -p srokyerng_booking_db < src/database/migrations/<file>.sql
```
