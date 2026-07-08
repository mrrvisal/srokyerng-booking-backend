# Notifications Module

Reserved for in-app notifications and email notification helpers.

Expected backend files when implementation starts:

- `notification.routes.js`
- `notification.controller.js`
- `notification.service.js`
- `notification.model.js`
- `notification.validation.js`
- `email.service.js` if SMTP email sending is implemented here

Route ownership:

- User notification endpoints should be mounted under `/api/notifications`.
- Notification creation should be triggered from feature services such as reservations, payments, properties, and reviews.
- The empty scaffold router is registered in `src/routes/index.js`.
- Do not add real endpoint handlers until controller, service, model, validation, and tests are ready.
