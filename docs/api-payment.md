# Payment API

## Route Summary

Customer:

- `POST /payments`
- `GET /payments/my`
- `GET /payments/:id`
- `POST /payments/:id/receipt`
- `POST /payments/:id/proof`
- `PATCH /payments/:id/proof`
- `GET /payments/:id/proof`
- `GET /payments/reservation/:id/owner-payment-accounts`

Owner:

- `GET /owner/payments`
- `GET /owner/payments/:id`
- `GET /owner/payments/pending-verification`
- `GET /owner/payments/:id/proof`
- `PATCH /owner/payments/:id/verify`
- `PATCH /owner/payments/:id/reject`
- `PATCH /owner/payments/:id/refund`
- `GET /owner/payment-accounts`
- `POST /owner/payment-accounts`
- `PATCH /owner/payment-accounts/:id`
- `PATCH /owner/payment-accounts/:id/deactivate`
- `DELETE /owner/payment-accounts/:id`
- `PATCH /owner/payment-accounts/:id/activate`

Customer checkout:

- `GET /properties/:propertyId/payment-accounts`

Admin:

- `GET /admin/payments`
- `GET /admin/payments/:id`
- `GET /admin/payments/:id/proof`
- `GET /admin/payments/pending-verification`
- `GET /admin/payment-accounts`
- `GET /admin/payment-accounts/:id`

---

## Customer Endpoints

### Create Payment

```text
POST /payments
```

Requires authentication and `customer` role.

Request body:

```json
{
  "reservation_id": 1,
  "payment_method_id": 2,
  "owner_payment_account_id": 1,
  "transaction_reference": "TXN-ABC123"
}
```

Notes:

- `reservation_id` must belong to the authenticated customer.
- `payment_method_id` must be an active payment method.
- `transaction_reference` is optional.
- Payment amount is loaded from `reservations.total_amount`.
- New payments are created with status `pending`.

Success response:

```json
{
  "success": true,
  "message": "Payment created successfully",
  "data": {
    "id": 10,
    "reservation_id": 1,
    "payment_method_id": 2,
    "owner_payment_account_id": 1,
    "payment_status": "pending",
    "amount": 500.0,
    "receipt_image_url": null,
    "rejection_reason": null,
    "verified_by": null,
    "paid_at": null,
    "created_at": "2026-05-20T12:00:00.000Z"
  }
}
```

### Get My Payments

```text
GET /payments/my
```

Requires authentication and `customer` role.

Query parameters:

- `status` — filter by payment status (`pending`, `submitted`, `paid`, `failed`, `refunded`).

Returns the authenticated customer’s payments.

Success response:

```json
{
  "success": true,
  "message": "Payments retrieved successfully",
  "data": [
    {
      "id": 10,
      "reservation_id": 1,
      "payment_method_id": 2,
      "payment_status": "submitted",
      "amount": 500.0,
      "receipt_image_url": "/uploads/receipts/receipt-123.jpg",
      "created_at": "2026-05-20T12:00:00.000Z"
    }
  ]
}
```

### Get Payment by ID

```text
GET /payments/:id
```

Requires authentication.

Access rules:

- `customer`: can only view their own payments.
- `owner`: can only view payments for their properties.
- `admin`: can view any payment.

Returns the payment detail object.

Success response:

```json
{
  "success": true,
  "message": "Payment retrieved successfully",
  "data": {
    "id": 10,
    "reservation_id": 1,
    "payment_method_id": 2,
    "owner_payment_account_id": 3,
    "payment_status": "submitted",
    "amount": 500.0,
    "receipt_image_url": "/uploads/receipts/receipt-123.jpg",
    "rejection_reason": null,
    "verified_by": null,
    "verified_at": null,
    "paid_at": null,
    "created_at": "2026-05-20T12:00:00.000Z"
  }
}
```

### Upload Receipt

```text
POST /payments/:id/receipt
```

Requires authentication and `customer` role.

Content-Type: `multipart/form-data`

Form field:

- `receipt` — receipt image file.

Allowed file types:

- `image/jpeg`
- `image/png`
- `image/webp`
- `image/gif`

Limits:

- Max file size: 5 MB.
- Stored in `uploads/receipts/`.

Behavior:

- Allowed when payment status is `pending` or `submitted`.
- First successful upload transitions status from `pending` → `submitted`.
- Re-upload is allowed while the payment is still `pending` or `submitted`.

Returns the updated payment with `receipt_image_url` and `payment_status: "submitted"`.

Success response:

```json
{
  "success": true,
  "message": "Receipt uploaded successfully",
  "data": {
    "id": 10,
    "payment_status": "submitted",
    "receipt_image_url": "/uploads/receipts/receipt-123.jpg",
    "updated_at": "2026-05-21T09:00:00.000Z"
  }
}
```

### Upload or Replace Proof

```text
POST /payments/:id/proof
PATCH /payments/:id/proof
```

Requires authentication and `customer` role.

Content-Type: `multipart/form-data`

Form field:

- `receipt` — receipt image file.

These endpoints are alternate receipt upload paths and behave like `/receipt`.

Success response:

```json
{
  "success": true,
  "message": "Receipt uploaded successfully",
  "data": {
    "id": 10,
    "payment_status": "submitted",
    "receipt_image_url": "/uploads/receipts/receipt-123.jpg",
    "updated_at": "2026-05-21T09:00:00.000Z"
  }
}
```

### View Proof Details

```text
GET /payments/:id/proof
```

Requires authentication.

Access rules:

- `customer`: own payment only.
- `owner`: payments for their properties.
- `admin`: any payment.

Returns proof metadata including:

- `receipt_image_url`
- `payment_status`
- `rejection_reason`
- `verified_by`
- `verified_at`
- `paid_at`

Success response:

```json
{
  "success": true,
  "message": "Payment proof retrieved successfully",
  "data": {
    "id": 10,
    "payment_status": "submitted",
    "receipt_image_url": "/uploads/receipts/receipt-123.jpg",
    "rejection_reason": null,
    "verified_by": null,
    "verified_at": null,
    "paid_at": null
  }
}
```

### Get Reservation Owner Payment Accounts

```text
GET /payments/reservation/:id/owner-payment-accounts
```

Requires authentication and `customer` role.

Returns a list of owner payment account options for the reservation’s owner.

Success response:

```json
{
  "success": true,
  "message": "Owner payment accounts retrieved successfully",
  "data": [
    {
      "id": 5,
      "owner_id": 2,
      "payment_method_id": 3,
      "account_name": "ABA Business",
      "account_number": "123456789",
      "qr_image_url": "/uploads/payment-account-qrs/qr-123.png",
      "is_active": true
    }
  ]
}
```

---

## Owner Endpoints

### Get Owner Payments

```text
GET /owner/payments
```

Requires authentication and `owner` role.

Query parameters:

- `status`
- `customer_id`
- `reservation_id`

Returns payments for properties owned by the authenticated owner.

Success response:

```json
{
  "success": true,
  "message": "Owner payments retrieved successfully",
  "data": [
    {
      "id": 10,
      "reservation_id": 1,
      "customer_id": 5,
      "payment_status": "submitted",
      "amount": 500.0,
      "receipt_image_url": "/uploads/receipts/receipt-123.jpg",
      "created_at": "2026-05-20T12:00:00.000Z"
    }
  ]
}
```

### Owner Payment Account Management

#### List Owner Payment Accounts

```text
GET /owner/payment-accounts
```

Requires authentication and `owner` role.

Returns the authenticated owner’s payment accounts, including active and inactive accounts.

Success response:

```json
{
  "success": true,
  "message": "Owner payment accounts retrieved successfully",
  "data": [
    {
      "id": 5,
      "payment_method_id": 3,
      "account_name": "ABA Business",
      "account_number": "123456789",
      "qr_image_url": "/uploads/payment-account-qrs/qr-123.png",
      "is_active": true,
      "created_at": "2026-05-20T12:00:00.000Z"
    }
  ]
}
```

#### Create Owner Payment Account

```text
POST /owner/payment-accounts
```

Requires authentication and `owner` role.
Content-Type: `multipart/form-data`

Form fields:

- `payment_method_id` — required, must be a supported active payment method.
- `account_name` — required.
- `account_number` — optional.
- `qr_image` — optional file upload for QR code image.

Validation rules:

- `payment_method_id` must exist and be active.
- `account_name` is required.
- At least one of `account_number` or `qr_image` must be provided.
- Prevents duplicate active accounts for the same owner and payment method.

Success response:

```json
{
  "success": true,
  "message": "Payment account created successfully",
  "data": {
    "id": 6,
    "payment_method_id": 3,
    "account_name": "ABA Business",
    "account_number": "123456789",
    "qr_image_url": "/uploads/payment-account-qrs/qr-456.png",
    "is_active": true,
    "created_at": "2026-05-21T08:00:00.000Z"
  }
}
```

#### Update Owner Payment Account

```text
PATCH /owner/payment-accounts/:id
```

Requires authentication and `owner` role.
Content-Type: `multipart/form-data`

Form fields:

- `payment_method_id` — optional, if provided must be an active payment method.
- `account_name` — optional but cannot be empty.
- `account_number` — optional.
- `qr_image` — optional file upload to add or replace the QR image.

Rules:

- The account must belong to the authenticated owner.
- At least one payment detail must remain after update.
- Duplicate active account for the same owner/payment method is prevented.

Success response:

```json
{
  "success": true,
  "message": "Payment account updated successfully",
  "data": {
    "id": 5,
    "payment_method_id": 3,
    "account_name": "ABA Business Updated",
    "account_number": "123456789",
    "qr_image_url": "/uploads/payment-account-qrs/qr-123-updated.png",
    "is_active": true
  }
}
```

#### Deactivate Owner Payment Account

```text
PATCH /owner/payment-accounts/:id/deactivate
```

Requires authentication and `owner` role.

Marks the account as inactive. Inactive accounts are not returned in checkout flows.

Success response:

```json
{
  "success": true,
  "message": "Payment account deactivated successfully",
  "data": {
    "id": 5,
    "is_active": false
  }
}
```

#### Delete Owner Payment Account

```text
DELETE /owner/payment-accounts/:id
```

Requires authentication and `owner` role.

Permanently deletes the payment account row (and its QR code image file, if any). This is a hard delete — the record cannot be recovered afterward.

Success response:

```json
{
  "success": true,
  "message": "Payment account deleted successfully",
  "data": {
    "id": 5,
    "deleted": true
  }
}
```

#### Activate Owner Payment Account

```text
PATCH /owner/payment-accounts/:id/activate
```

Requires authentication and `owner` role.

Reactivates a previously deactivated account, provided it does not conflict with another active account for the same payment method.

Success response:

```json
{
  "success": true,
  "message": "Payment account activated successfully",
  "data": {
    "id": 5,
    "is_active": true
  }
}
```

### Customer Checkout Payment Accounts

#### List Payment Accounts for a Property

```text
GET /properties/:propertyId/payment-accounts
```

Requires authentication and `customer` role.

Returns active payment accounts for the owner of the specified property. Inactive accounts are excluded from this checkout flow.

Success response:

```json
{
  "success": true,
  "message": "Payment accounts retrieved successfully",
  "data": [
    {
      "id": 5,
      "payment_method_id": 3,
      "account_name": "ABA Business",
      "account_number": "123456789",
      "qr_image_url": "/uploads/payment-account-qrs/qr-123.png"
    }
  ]
}
```

### Get Owner Payment by ID

```text
GET /owner/payments/:id
```

Requires authentication and `owner` role.

Returns the payment detail when it belongs to the owner’s property.

Success response:

```json
{
  "success": true,
  "message": "Payment retrieved successfully",
  "data": {
    "id": 10,
    "reservation_id": 1,
    "customer_id": 5,
    "payment_status": "submitted",
    "amount": 500.0,
    "receipt_image_url": "/uploads/receipts/receipt-123.jpg",
    "created_at": "2026-05-20T12:00:00.000Z"
  }
}
```

### Get Owner Payments Pending Verification

```text
GET /owner/payments/pending-verification
```

Requires authentication and `owner` role.

Returns payments in `submitted` status that belong to the authenticated owner, suitable for review and verification.

Query parameters: none.

Success response:

```json
{
  "success": true,
  "message": "Owner pending verification payments retrieved successfully",
  "data": [
    /* array of payment objects with status "submitted" */
  ]
}
```

Errors:

- `401` — unauthenticated
- `403` — authenticated but not an owner

### Get Owner Payment Proof

```text
GET /owner/payments/:id/proof
```

Requires authentication and `owner` role.

Access rules:

- `owner`: can view proof for payments related to their own properties.

Returns proof metadata including:

- `receipt_image_url`
- `payment_status`
- `rejection_reason`
- `verified_by`
- `verified_at`
- `paid_at`

Success response:

```json
{
  "success": true,
  "message": "Payment proof retrieved successfully",
  "data": {
    "id": 10,
    "payment_status": "submitted",
    "receipt_image_url": "/uploads/receipts/receipt-123.jpg",
    "rejection_reason": null,
    "verified_by": null,
    "verified_at": null,
    "paid_at": null
  }
}
```

### Verify Payment

```text
PATCH /owner/payments/:id/verify
```

Requires authentication and `owner` role.

Allowed transition:

- `submitted` → `paid`

Request body (optional):

```json
{
  "notes": "Verified via ABA statement"
}
```

Behavior:

- Marks the payment as verified.
- Sets `paid_at` and `verified_by`.

Note: `notes` is accepted and validated but not currently stored or returned by the API.

Success response:

```json
{
  "success": true,
  "message": "Payment verified successfully",
  "data": {
    "id": 10,
    "payment_status": "paid",
    "verified_by": 2,
    "verified_at": "2026-05-21T10:00:00.000Z",
    "paid_at": "2026-05-21T10:00:00.000Z"
  }
}
```

### Reject Payment

```text
PATCH /owner/payments/:id/reject
```

Requires authentication and `owner` role.

Allowed transition:

- `submitted` → `failed`

Request body:

```json
{
  "rejection_reason": "Receipt image is unclear"
}
```

Success response:

```json
{
  "success": true,
  "message": "Payment rejected successfully",
  "data": {
    "id": 10,
    "payment_status": "failed",
    "rejection_reason": "Receipt image is unclear",
    "verified_by": 2,
    "verified_at": "2026-05-21T11:00:00.000Z"
  }
}
```

### Refund Payment

```text
PATCH /owner/payments/:id/refund
```

Requires authentication and `owner` role.

Allowed transition:

- `paid` → `refunded`

Precondition:

- The reservation must already be in `cancelled` status, otherwise the request fails with `400` and message "Can only refund payments for cancelled reservations."

Request body (optional):

```json
{
  "notes": "Customer cancelled before check-in"
}
```

Note: `notes` is accepted and validated but not currently stored or returned by the API.

Marks the payment as refunded.

Success response:

```json
{
  "success": true,
  "message": "Payment refunded successfully",
  "data": {
    "id": 10,
    "payment_status": "refunded",
    "paid_at": "2026-05-21T10:00:00.000Z"
  }
}
```

---

## Admin Payment Account Audit

### List Owner Payment Accounts

```text
GET /admin/payment-accounts
```

Requires authentication and `admin` role.

Query parameters:

- `owner_id` — optional filter by owner.
- `payment_method_id` — optional filter by payment method.
- `is_active` — optional filter by active status (`true` or `false`).

Returns owner payment account records for audit and review.

Success response:

```json
{
  "success": true,
  "message": "Payment accounts retrieved successfully",
  "data": [
    {
      "id": 5,
      "owner_id": 2,
      "payment_method_id": 3,
      "account_name": "ABA Business",
      "account_number": "123456789",
      "qr_image_url": "/uploads/payment-account-qrs/qr-123.png",
      "is_active": true,
      "created_at": "2026-05-20T12:00:00.000Z"
    }
  ]
}
```

### Get Owner Payment Account by ID

```text
GET /admin/payment-accounts/:id
```

Requires authentication and `admin` role.

Returns the owner payment account details including:

- `payment_method_name`
- `account_name`
- `account_number`
- `qr_image_url`
- `is_active`
- created and updated timestamps

Success response:

```json
{
  "success": true,
  "message": "Payment account retrieved successfully",
  "data": {
    "id": 5,
    "owner_id": 2,
    "payment_method_id": 3,
    "payment_method_name": "ABA",
    "account_name": "ABA Business",
    "account_number": "123456789",
    "qr_image_url": "/uploads/payment-account-qrs/qr-123.png",
    "is_active": true,
    "created_at": "2026-05-20T12:00:00.000Z",
    "updated_at": "2026-05-21T09:00:00.000Z"
  }
}
```

## Admin Endpoints

### Get All Payments

```text
GET /admin/payments
```

Requires authentication and `admin` role.

Query parameters:

- `status`
- `customer_id`
- `owner_id`

Returns all payments.

Success response:

```json
{
  "success": true,
  "message": "All payments retrieved successfully",
  "data": [
    {
      "id": 10,
      "reservation_id": 1,
      "customer_id": 5,
      "owner_id": 2,
      "payment_status": "submitted",
      "amount": 500.0,
      "receipt_image_url": "/uploads/receipts/receipt-123.jpg",
      "created_at": "2026-05-20T12:00:00.000Z"
    }
  ]
}
```

### Get Payment by ID

```text
GET /admin/payments/:id
```

Requires authentication and `admin` role.

Returns any payment by ID.

Success response:

```json
{
  "success": true,
  "message": "Payment retrieved successfully",
  "data": {
    "id": 10,
    "reservation_id": 1,
    "customer_id": 5,
    "owner_id": 2,
    "payment_status": "submitted",
    "amount": 500.0,
    "receipt_image_url": "/uploads/receipts/receipt-123.jpg",
    "rejection_reason": null,
    "verified_by": null,
    "paid_at": null,
    "created_at": "2026-05-20T12:00:00.000Z"
  }
}
```

### Get Payment Proof

```text
GET /admin/payments/:id/proof
```

Requires authentication and `admin` role.

Returns proof metadata for any payment, including:

- `receipt_image_url`
- `payment_status`
- `rejection_reason`
- `verified_by`
- `verified_at`
- `paid_at`

Success response:

```json
{
  "success": true,
  "message": "Payment proof retrieved successfully",
  "data": {
    "id": 10,
    "payment_status": "submitted",
    "receipt_image_url": "/uploads/receipts/receipt-123.jpg",
    "rejection_reason": null,
    "verified_by": null,
    "verified_at": null,
    "paid_at": null
  }
}
```

### Get Payments Pending Verification

```text
GET /admin/payments/pending-verification
```

Requires authentication and `admin` role.

Returns payments with status `submitted`.

Success response:

```json
{
  "success": true,
  "message": "Pending verification payments retrieved successfully",
  "data": [
    {
      "id": 10,
      "reservation_id": 1,
      "payment_status": "submitted",
      "amount": 500.0,
      "created_at": "2026-05-20T12:00:00.000Z"
    }
  ]
}
```

---

## Payment Status Workflow

```text
pending
  └─► submitted   (customer uploads receipt)
        ├─► paid       (owner verifies)
        └─► failed     (owner rejects)

paid
  └─► refunded   (owner refunds)
```

## Payment Status Values

- `pending`: Payment created, awaiting receipt upload.
- `submitted`: Receipt uploaded, awaiting owner review.
- `paid`: Payment verified.
- `failed`: Payment rejected.
- `refunded`: Payment refunded.
