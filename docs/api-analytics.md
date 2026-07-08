# Analytics API

## Overview

The analytics API provides two separate groups of endpoints:

1. **Admin Analytics** — platform-wide statistics for administrators
2. **Owner Analytics** — property-level statistics for property owners

---

# Admin Analytics

## Route Summary

Admin:

- `GET /api/admin/analytics/summary`
- `GET /api/admin/analytics/users`
- `GET /api/admin/analytics/properties`
- `GET /api/admin/analytics/reservations`
- `GET /api/admin/analytics/payments`
- `GET /api/admin/analytics/reviews`
- `GET /api/admin/analytics/activity`

All admin analytics endpoints require authentication and `admin` role.

Common query parameters:

- `start_date` — optional start date in `YYYY-MM-DD` format.
- `end_date` — optional end date in `YYYY-MM-DD` format.

Date filter notes:

- `start_date` and `end_date` must be provided together.
- `start_date` must be before or equal to `end_date`.
- When omitted, analytics are returned for all records.

Common validation response:

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": ["Both start_date and end_date must be provided together"]
}
```

---

### Get Platform Summary

```text
GET /api/admin/analytics/summary
```

Returns platform-wide totals for customers, owners, properties, reservations, paid payments, reviews, and paid revenue.

Query parameters:

- `start_date`
- `end_date`

Success response:

```json
{
  "success": true,
  "message": "Platform summary retrieved successfully",
  "data": {
    "platform_summary": {
      "total_customers": 120,
      "total_owners": 18,
      "total_properties": 42,
      "total_reservations": 260,
      "paid_payments": 210,
      "total_reviews": 96,
      "total_revenue": 24500.5
    },
    "period": {
      "start_date": "2026-05-01",
      "end_date": "2026-05-31"
    }
  }
}
```

---

### Get User Analytics

```text
GET /api/admin/analytics/users
```

Returns user counts grouped by role and account status.

Query parameters:

- `start_date`
- `end_date`

Success response:

```json
{
  "success": true,
  "message": "User analytics retrieved successfully",
  "data": {
    "users_by_role_and_status": {
      "customer": {
        "active": 115,
        "inactive": 5
      },
      "owner": {
        "active": 16,
        "inactive": 2
      }
    },
    "total_users": 138,
    "period": {
      "start_date": "2026-05-01",
      "end_date": "2026-05-31"
    }
  }
}
```

---

### Get Property Analytics

```text
GET /api/admin/analytics/properties
```

Returns property counts grouped by property status.

Query parameters:

- `start_date`
- `end_date`

Success response:

```json
{
  "success": true,
  "message": "Property analytics retrieved successfully",
  "data": {
    "properties_by_status": {
      "approved": 36,
      "pending": 4,
      "rejected": 2
    },
    "total_properties": 42,
    "period": {
      "start_date": "2026-05-01",
      "end_date": "2026-05-31"
    }
  }
}
```

---

### Get Reservation Analytics

```text
GET /api/admin/analytics/reservations
```

Returns reservation counts grouped by reservation status.

Query parameters:

- `start_date`
- `end_date`

Success response:

```json
{
  "success": true,
  "message": "Reservation analytics retrieved successfully",
  "data": {
    "reservations_by_status": {
      "pending": 20,
      "confirmed": 155,
      "cancelled": 18,
      "completed": 67
    },
    "total_reservations": 260,
    "period": {
      "start_date": "2026-05-01",
      "end_date": "2026-05-31"
    }
  }
}
```

---

### Get Payment Analytics

```text
GET /api/admin/analytics/payments
```

Returns payment counts and total amounts grouped by payment status. `total_revenue` only includes payments with `paid` status.

Query parameters:

- `start_date`
- `end_date`

Success response:

```json
{
  "success": true,
  "message": "Payment analytics retrieved successfully",
  "data": {
    "payments_by_status": {
      "pending": {
        "count": 12,
        "total_amount": 1400
      },
      "submitted": {
        "count": 8,
        "total_amount": 950
      },
      "paid": {
        "count": 210,
        "total_amount": 24500.5
      },
      "refunded": {
        "count": 3,
        "total_amount": 320
      }
    },
    "total_payments": 233,
    "total_revenue": 24500.5,
    "period": {
      "start_date": "2026-05-01",
      "end_date": "2026-05-31"
    }
  }
}
```

---

### Get Review Analytics

```text
GET /api/admin/analytics/reviews
```

Returns review totals, rating summary, and owner reply rate.

Query parameters:

- `start_date`
- `end_date`

Success response:

```json
{
  "success": true,
  "message": "Review analytics retrieved successfully",
  "data": {
    "review_summary": {
      "total_reviews": 96,
      "average_rating": "4.35",
      "min_rating": 1,
      "max_rating": 5,
      "owner_replied_count": 72,
      "owner_reply_rate": "75.00%"
    },
    "period": {
      "start_date": "2026-05-01",
      "end_date": "2026-05-31"
    }
  }
}
```

---

### Get Recent Activity

```text
GET /api/admin/analytics/activity
```

Returns recent platform activity across users, properties, reservations, payments, and reviews.

Query parameters:

- `start_date`
- `end_date`
- `limit` — optional number of activity records to return. Must be between `1` and `100`. Defaults to `20`.

Success response:

```json
{
  "success": true,
  "message": "Recent activity retrieved successfully",
  "data": {
    "recent_activity": [
      {
        "activity_type": "reservation_created",
        "resource_id": 25,
        "resource_name": "Reservation #25",
        "created_at": "2026-05-31T12:30:00.000Z",
        "resource_type": "reservation"
      },
      {
        "activity_type": "property_created",
        "resource_id": 8,
        "resource_name": "Ocean View Hotel",
        "created_at": "2026-05-30T09:10:00.000Z",
        "resource_type": "property"
      }
    ],
    "count": 2,
    "period": {
      "start_date": "2026-05-01",
      "end_date": "2026-05-31"
    }
  }
}
```

Limit validation response:

```json
{
  "success": false,
  "message": "Limit must be a number between 1 and 100",
  "errors": ["Invalid limit parameter"]
}
```

---

# Owner Analytics

## Route Summary

Owner:

- `GET /api/owner/analytics/summary`
- `GET /api/owner/analytics/reservations`
- `GET /api/owner/analytics/revenue`
- `GET /api/owner/analytics/properties`
- `GET /api/owner/analytics/rooms`

All owner analytics endpoints require authentication and `owner` role.

Common query parameters:

- `start_date` — optional start date in `YYYY-MM-DD` format.
- `end_date` — optional end date in `YYYY-MM-DD` format.
- `property_id` — optional property ID filter (must belong to the authenticated owner).

Date filter notes:

- `start_date` and `end_date` must be provided together.
- `start_date` must be before or equal to `end_date`.
- When omitted, analytics are returned for all records.

Common validation response:

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": ["Both start_date and end_date must be provided together"]
}
```

---

### Get Dashboard Summary

```text
GET /api/owner/analytics/summary
```

Returns owner dashboard summary with reservation counts.

Query parameters:

- `start_date`
- `end_date`

Success response:

```json
{
  "success": true,
  "message": "Owner dashboard summary retrieved successfully",
  "data": {
    "dashboard_summary": {
      "total_reservations": 50,
      "confirmed_reservations": 30,
      "completed_reservations": 20,
      "upcoming_reservations": 10
    },
    "period": {
      "start_date": "2026-05-01",
      "end_date": "2026-05-31"
    }
  }
}
```

---

### Get Reservation Analytics

```text
GET /api/owner/analytics/reservations
```

Returns reservation counts and amounts grouped by reservation status for the owner's properties.

Query parameters:

- `start_date`
- `end_date`
- `property_id` — optional, filter by property (must belong to owner).

Success response:

```json
{
  "success": true,
  "message": "Reservation analytics retrieved successfully",
  "data": {
    "reservations_by_status": {
      "confirmed": {
        "count": 20,
        "avg_nights": "2.50",
        "total_amount": 2000
      },
      "pending": {
        "count": 5,
        "avg_nights": "3.00",
        "total_amount": 500
      },
      "completed": {
        "count": 25,
        "avg_nights": "2.00",
        "total_amount": 2500
      }
    },
    "total_reservations": 50,
    "total_reservation_revenue": 5000,
    "period": {
      "start_date": "2026-05-01",
      "end_date": "2026-05-31",
      "property_id": null
    }
  }
}
```

---

### Get Revenue Analytics

```text
GET /api/owner/analytics/revenue
```

Returns revenue totals grouped by payment status. Revenue breakdown includes paid, cancelled, refunded, and net revenue.

Query parameters:

- `start_date`
- `end_date`
- `property_id` — optional, filter by property (must belong to owner).

Success response:

```json
{
  "success": true,
  "message": "Revenue analytics retrieved successfully",
  "data": {
    "revenue_by_status": {
      "paid": {
        "count": 30,
        "total_amount": 3000
      },
      "pending": {
        "count": 5,
        "total_amount": 500
      },
      "failed": {
        "count": 2,
        "total_amount": 200
      },
      "refunded": {
        "count": 3,
        "total_amount": 300
      }
    },
    "total_revenue": 4000,
    "paid_revenue": 3000,
    "cancelled_revenue": 0,
    "refunded_revenue": 300,
    "net_revenue": 2700,
    "period": {
      "start_date": "2026-05-01",
      "end_date": "2026-05-31",
      "property_id": null
    }
  }
}
```

---

### Get Top Properties

```text
GET /api/owner/analytics/properties
```

Returns top performing properties for the owner, sorted by total revenue descending.

Query parameters:

- `start_date`
- `end_date`
- `property_id` — optional, filter by property (must belong to owner).
  Note: due to a current backend limitation, this parameter is validated but not actually applied as a filter — the response includes all of the owner's properties/rooms regardless of this value.
- `limit` — optional, max records to return (1–50). Defaults to `10`.

Success response:

```json
{
  "success": true,
  "message": "Top properties retrieved successfully",
  "data": {
    "top_properties": [
      {
        "property_id": 1,
        "property_name": "Beach Resort",
        "reservation_count": 50,
        "total_revenue": 5000,
        "avg_rating": "4.80",
        "unique_customers": 40
      },
      {
        "property_id": 2,
        "property_name": "Mountain Villa",
        "reservation_count": 30,
        "total_revenue": 3000,
        "avg_rating": "4.50",
        "unique_customers": 25
      }
    ],
    "count": 2,
    "period": {
      "start_date": "2026-05-01",
      "end_date": "2026-05-31"
    }
  }
}
```

Limit validation response:

```json
{
  "success": false,
  "message": "Limit must be a number between 1 and 50",
  "errors": ["Invalid limit parameter"]
}
```

---

### Get Top Rooms

```text
GET /api/owner/analytics/rooms
```

Returns top performing rooms for the owner, sorted by total revenue descending.

Query parameters:

- `start_date`
- `end_date`
- `property_id` — optional, filter by property (must belong to owner).
  Note: due to a current backend limitation, this parameter is validated but not actually applied as a filter — the response includes all of the owner's properties/rooms regardless of this value.
- `limit` — optional, max records to return (1–50). Defaults to `10`.

Success response:

```json
{
  "success": true,
  "message": "Top rooms retrieved successfully",
  "data": {
    "top_rooms": [
      {
        "room_id": 1,
        "room_name": "Deluxe Suite",
        "property_name": "Beach Resort",
        "price_per_night": 100,
        "reservation_count": 30,
        "total_revenue": 3000,
        "avg_rating": "4.90"
      },
      {
        "room_id": 2,
        "room_name": "Standard Room",
        "property_name": "Beach Resort",
        "price_per_night": 50,
        "reservation_count": 20,
        "total_revenue": 1000,
        "avg_rating": "4.30"
      }
    ],
    "count": 2,
    "period": {
      "start_date": "2026-05-01",
      "end_date": "2026-05-31",
      "property_id": null
    }
  }
}
```

---

## Error Responses (Owner Analytics)

Invalid property ID:

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": ["property_id must be a positive integer"]
}
```

Property does not belong to owner:

```json
{
  "success": false,
  "message": "Property does not belong to this owner",
  "errors": null
}
```

Wrong role (non-owner):

```json
{
  "success": false,
  "message": "Forbidden access",
  "errors": null
}