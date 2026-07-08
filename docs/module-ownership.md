# Backend Module Ownership

This backend uses intentional module scaffolding. Empty module files mean the module path is reserved and ready for the assigned owner.

## Ownership

- **Sambath(M):** database schema, seed data, auth module, users module, auth/role contract, shared middleware, API structure review, final merge review
- **MengHour:** `properties`, `rooms`, property images, room images, owner payment accounts APIs
- **Visal:** `reservations`, availability checks, booking calculation, cancellation/update rules, `payments`, payment proof flow, payment verification APIs
- **Leakhena:** `reviews`, `amenities`, property approval APIs, user moderation support
- **Phase 2 Owners:** `wishlists`, `notifications`, `analytics`, `chats`, `reports` should be assigned before implementation starts
- **Frontend-aligned Support:** confirm API response structure, endpoint contracts, request/response format, and integration requirements with frontend members before implementation

## Reserved Phase 2 Modules

- `src/modules/wishlists` for customer saved properties
- `src/modules/notifications` for in-app notifications and optional email notification helpers
- `src/modules/analytics` for owner/admin analytics logic
- `src/modules/chats` for customer-owner messaging
- `src/modules/reports` for report and dispute handling

## Module Rules

- Put feature-specific backend code inside `src/modules/<module>`.
- Keep shared middleware in `src/middleware`.
- Keep shared utilities in `src/utils`.
- Keep shared constants in `src/constants`.
- Keep database schema and seed changes under `src/database`.
- Keep module README files updated when a module has special route ownership or integration rules.

## Scaffold Policy

- Scaffolded modules are not production-ready.
- Empty scaffold routers may be registered in `src/routes/index.js` so module owners have stable files to work in.
- Before enabling real endpoint handlers, complete the route, controller, service, model, validation, and tests.
- Do not delete scaffold files unless the module is removed from product scope.
- Schema, seed, auth, and role changes must be reviewed by the team lead.

## API Contract Rule

Before frontend integration, each active module should document:

- endpoint path
- HTTP method
- required role
- request body/query params
- success response shape
- expected error cases
