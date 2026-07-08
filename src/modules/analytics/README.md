# Analytics Module

Reserved for owner and admin analytics.

Expected backend files when implementation starts:

- `analytics.routes.js`
- `analytics.controller.js`
- `analytics.service.js`
- `analytics.model.js`
- `analytics.validation.js`

Route ownership:

- Owner analytics should be exposed under `/api/owner/analytics`.
- Admin analytics should be exposed under `/api/admin/analytics`.
- Keep analytics query logic in this module even when routes are mounted from owner/admin route files.
- Do not register routes until controller, service, model, validation, and tests exist.

