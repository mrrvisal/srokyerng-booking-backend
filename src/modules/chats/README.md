# Chats Module

Reserved for customer-owner in-app chat.

Expected backend files when implementation starts:

- `chat.routes.js`
- `chat.controller.js`
- `chat.service.js`
- `chat.model.js`
- `chat.validation.js`

Route ownership:

- General chat endpoints should be mounted under `/api/chats`.
- Property-specific chat entry points may be mounted from property routes if needed.
- Reservation-specific chat entry points may be mounted from reservation routes if needed.
- The empty scaffold router is registered in `src/routes/index.js`.
- Do not add real endpoint handlers until controller, service, model, validation, and tests are ready.
