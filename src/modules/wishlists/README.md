# Wishlists Module

Reserved for the customer wishlist feature.

Expected backend files when implementation starts:

- `wishlist.routes.js`
- `wishlist.controller.js`
- `wishlist.service.js`
- `wishlist.model.js`
- `wishlist.validation.js`

Route ownership:

- Customer wishlist endpoints should be mounted under `/api/wishlists`.
- Use `authMiddleware` and `roleMiddleware(ROLES.CUSTOMER)` for customer-only actions.
- The empty scaffold router is registered in `src/routes/index.js`.
- Do not add real endpoint handlers until controller, service, model, validation, and tests are ready.
