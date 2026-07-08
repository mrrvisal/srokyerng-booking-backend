## Reservation Endpoints

### Reservation Route Summary

- `POST /reservations` — Create reservation (auth + customer)
- `GET /reservations/my` — Get current customer reservations (auth + customer)
- `GET /reservations/:id` — Get reservation by ID (auth required)
- `GET /reservations/:id/cancellation-policy` — Get cancellation policy for a reservation (auth required)
- `PATCH /reservations/:id/cancel` — Cancel reservation (auth + customer)
- `POST /reservations/:id/refund-request` — Request refund by reservation (auth + customer)
- `GET /owner/reservations` — List owner reservations (auth + owner)
- `PATCH /owner/reservations/:id/status` — Update reservation status (auth + owner)
- `GET /owner/dashboard` — Owner dashboard counts (auth + owner)
- `GET /admin/reservations` — List all reservations (auth + admin)

### Create Reservation

```text
POST /reservations
```

Requires authentication and `customer` role.

Body:

```json
{
  "room_id": 1,
  "check_in_date": "2026-05-20",
  "check_out_date": "2026-05-25",
  "total_guests": 2,
  "special_request": "High floor preferred"
}
```

Returns:

```json
{
  "success": true,
  "message": "Reservation created successfully",
  "data": {
    "id": 1,
    "customer_id": 5,
    "room_id": 1,
    "check_in_date": "2026-05-20",
    "check_out_date": "2026-05-25",
    "total_guests": 2,
    "total_nights": 5,
    "total_amount": 500.0,
    "reservation_status": "pending",
    "special_request": "High floor preferred",
    "created_at": "2026-05-14T10:00:00.000Z"
  }
}
```

### Get My Reservations

```text
GET /reservations/my
```

Requires authentication and `customer` role.

Query parameters:

- `status`: Filter by status (`pending`, `confirmed`, `cancelled`, `completed`)

Returns:

```json
{
  "success": true,
  "message": "Your reservations retrieved successfully",
  "data": [
    {
      "id": 1,
      "room_id": 1,
      "check_in_date": "2026-05-20",
      "check_out_date": "2026-05-25",
      "total_guests": 2,
      "total_nights": 5,
      "total_amount": 500.0,
      "reservation_status": "confirmed",
      "room_name": "Deluxe Suite",
      "property_name": "Ocean View Hotel",
      "property_id": 1
    }
  ]
}
```

### Get Reservation by ID

```text
GET /reservations/:id
```

Requires authentication.

Returns:

```json
{
  "success": true,
  "message": "Reservation retrieved successfully",
  "data": {
    "id": 1,
    "customer_id": 5,
    "room_id": 1,
    "check_in_date": "2026-05-20",
    "check_out_date": "2026-05-25",
    "total_guests": 2,
    "total_nights": 5,
    "total_amount": 500.0,
    "reservation_status": "confirmed",
    "special_request": "High floor preferred",
    "customer_name": "John Doe",
    "customer_email": "john@example.com",
    "customer_phone": "0123456789",
    "room_name": "Deluxe Suite",
    "price_per_night": 100.0,
    "max_guests": 4,
    "property_id": 1,
    "property_name": "Ocean View Hotel",
    "owner_id": 2,
    "owner_name": "Property Owner"
  }
}
```

### Cancel Reservation

```text
PATCH /reservations/:id/cancel
```

Requires authentication and `customer` role.

Body:

```json
{
  "cancellation_reason": "Personal reasons"
}
```

Restrictions:

- Cannot cancel after the check-in date has passed
- Cannot cancel already cancelled or completed reservations
- Only cancellable statuses: `pending`, `confirmed`

Returns:

```json
{
  "success": true,
  "message": "Reservation cancelled successfully",
  "data": {
    "id": 1,
    "customer_id": 5,
    "room_id": 1,
    "check_in_date": "2026-05-20",
    "check_out_date": "2026-05-25",
    "total_guests": 2,
    "total_nights": 5,
    "total_amount": 500.0,
    "reservation_status": "cancelled",
    "special_request": "High floor preferred",
    "refund_info": {
      "refund_request_id": 5,
      "payment_id": 100,
      "refund_amount": 400.0,
      "refund_percentage": 100,
      "refund_reason": "Full refund eligible - cancelled before deadline",
      "refund_status": "requested"
    }
  }
}
```

> `refund_info` is `null` unless the cancellation triggers an eligible refund (i.e. the reservation had a `paid` payment), in which case it is an object with `refund_request_id, payment_id, refund_amount, refund_percentage, refund_reason, refund_status`.

### Request Refund by Reservation

```text
POST /reservations/:id/refund-request
```

Requires authentication and `customer` role.

Request body:

```json
{
  "reason": "I cancelled my reservation and would like a full refund"
}
```

> The refund amount is calculated automatically server-side based on the cancellation policy — do not send `amount`.

Notes:

- `reason` is required, must be between 10 and 500 characters.
- Looks up the payment associated with the reservation automatically.
- Only `paid` payments are eligible for refund request.
- Customer can only request refunds for their own reservations.
- Duplicate pending refund requests are rejected.

Success response (201):

```json
{
  "success": true,
  "message": "Refund request created successfully",
  "data": {
    "id": 1,
    "payment_id": 100,
    "requested_by": 10,
    "amount": 400.00,
    "reason": "I cancelled my reservation and would like a full refund",
    "refund_status": "requested",
    "refund_percentage": 100,
    "refund_reason": "Full refund eligible - cancelled before deadline",
    "requested_at": "2026-06-04T05:00:00.000Z"
  }
}
```

### Owner Reservation Endpoints

#### List Owner Reservations

```text
GET /owner/reservations
```

Requires authentication and `owner` role.

Query parameters:

- `status`: Filter by status (`pending`, `confirmed`, `cancelled`, `completed`)
- `property_id`: Filter by property ID

Returns:

```json
{
  "success": true,
  "message": "Owner reservations retrieved successfully",
  "data": [
    {
      "id": 1,
      "customer_id": 5,
      "room_id": 1,
      "check_in_date": "2026-05-20",
      "check_out_date": "2026-05-25",
      "total_guests": 2,
      "total_nights": 5,
      "total_amount": 500.0,
      "reservation_status": "confirmed",
      "room_name": "Deluxe Suite",
      "property_name": "Ocean View Hotel",
      "property_id": 1,
      "customer_name": "John Doe",
      "customer_email": "john@example.com"
    }
  ]
}
```

#### Dashboard Owner Reservation

```text
GET /owner/dashboard
```

Requires authentication and `owner` role.

Returns:

```json
{
  "success": true,
  "message": "Owner dashboard data retrieved",
  "data": {
    "total_reservations": 12,
    "pending_reservations": 11,
    "confirmed_reservations": 1,
    "completed_reservations": 0,
    "cancelled_reservations": 0
  }
}
```

#### Owner Update Reservation Status

```text
PATCH /owner/reservations/:id/status
```

Requires authentication and `owner` role. Only the owner of the property associated with the reservation can update its status.

Body:

```json
{
  "status": "confirmed",
  "reason": "Payment verified and reservation confirmed"
}
```

Allowed status values: `pending`, `confirmed`, `completed`, `cancelled`

Restrictions:

- Owner must own the property associated with the reservation
- Cannot change status of `cancelled` reservations
- Cannot change status of `completed` reservations
- `reason` is optional (used for cancellation reasons)

Returns:

```json
{
  "success": true,
  "message": "Reservation status updated successfully",
  "data": {
    "id": 1,
    "customer_id": 5,
    "room_id": 1,
    "check_in_date": "2026-05-20",
    "check_out_date": "2026-05-25",
    "total_guests": 2,
    "total_nights": 5,
    "total_amount": 500.00,
    "reservation_status": "confirmed",
    "customer_name": "John Doe",
    "customer_email": "john@example.com",
    "room_name": "Deluxe Suite",
    "property_name": "Ocean View Hotel",
    "owner_id": 2,
    "owner_name": "Property Owner",
    "refund_info": null
  }
}
```

> `refund_info` is `null` unless this status update cancels a reservation that had an eligible paid payment, in which case it is an object with `refund_request_id, payment_id, refund_amount, refund_percentage, refund_reason, refund_status`.

Notifications:

- When status is changed to `confirmed`, a notification is sent to the customer
- When status is changed to `cancelled`, a notification is sent to the customer

### Admin Reservation Endpoints

#### List All Reservations

```text
GET /admin/reservations
```

Requires authentication and `admin` role.

Query parameters:

- `status`: Filter by status (`pending`, `confirmed`, `cancelled`, `completed`)
- `property_id`: Filter by property ID
- `owner_id`: Filter by owner ID

Returns:

```json
{
  "success": true,
  "message": "All reservations retrieved successfully",
  "data": [
    {
      "id": 1,
      "customer_id": 5,
      "room_id": 1,
      "check_in_date": "2026-05-20",
      "check_out_date": "2026-05-25",
      "total_guests": 2,
      "total_nights": 5,
      "total_amount": 500.0,
      "reservation_status": "confirmed",
      "room_name": "Deluxe Suite",
      "property_name": "Ocean View Hotel",
      "property_id": 1,
      "owner_id": 2,
      "owner_name": "Property Owner"
    }
  ]
}
```

### Get Cancellation Policy

```text
GET /reservations/:id/cancellation-policy
```

Requires authentication.

Access control:

- The customer who owns the reservation
- The property owner
- Admin users

Returns detailed information about the cancellation policy and eligibility for a specific reservation.

**Note:** No request body is required.

Returns:

```json
{
  "success": true,
  "message": "Cancellation policy retrieved successfully",
  "data": {
    "reservation_id": 1,
    "reservation_status": "confirmed",
    "check_in_date": "2026-05-20",
    "cancellation_deadline_hours": 24,
    "cancellation_eligibility": {
      "can_cancel": true,
      "reasons": [],
      "deadline": "2026-05-19T00:00:00.000Z",
      "hours_until_deadline": 9,
      "status": "confirmed",
      "refund_percentage": 100,
      "is_late_cancellation": false
    },
    "policy_summary": {
      "description": "Cancellation is allowed up to 24 hours before check-in",
      "full_refund_deadline": "2026-05-19T00:00:00.000Z",
      "late_cancellation_refund_percentage": 50,
      "non_refundable_after": "check-in date"
    }
  }
}
```

If the reservation cannot be cancelled (e.g., already cancelled, past check-in, or passed deadline), the `cancellation_eligibility.can_cancel` field will be `false` with a list of `reasons` explaining why.

### Reservation Status Values

- `pending`
- `confirmed`
- `cancelled`
- `completed`
