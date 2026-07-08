# Owner Module

The owner module groups owner-facing API routes under `/api/owner`.

Use this module for owner dashboard URLs and role protection only. Keep feature business logic in the real feature modules:

- Properties logic: `src/modules/properties`
- Reservations logic: `src/modules/reservations`
- Payments logic: `src/modules/payments`
- Reviews logic: `src/modules/reviews`

Example:

`GET /api/owner/reservations` should be routed here, but it should call `reservationService` when the reservation module is implemented.
