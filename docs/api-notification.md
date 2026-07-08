# Notification API

Base URL:

```text
http://localhost:<PORT>/api
```

All notification endpoints require authentication.

Users can only read and update their own notifications.

## List My Notifications

```text
GET /notifications
```

Query parameters:

- `page`: defaults to `1`
- `limit`: defaults to `20`, max `100`
- `status`: `all`, `read`, `unread`, or `archived`, defaults to `all`
- `type`: optional notification type filter

Supported notification types:

- `reservation_created`
- `reservation_confirmed`
- `reservation_cancelled`
- `payment_submitted`
- `payment_verified`
- `payment_rejected`
- `payment_refunded`
- `property_approved`
- `property_rejected`
- `password_changed`
- `system`

Success response:

```json
{
  "success": true,
  "message": "Notifications fetched successfully",
  "data": {
    "notifications": [
      {
        "id": 1,
        "user_id": 1,
        "type": "reservation_confirmed",
        "channel": "in_app",
        "title": "Reservation confirmed",
        "message": "Your reservation has been confirmed.",
        "data": {
          "reservation_id": 12
        },
        "delivery_status": "delivered",
        "is_read": false,
        "read_at": null,
        "archived_at": null,
        "sent_at": null,
        "created_at": "2026-06-01T10:00:00.000Z",
        "updated_at": "2026-06-01T10:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 1,
      "total_pages": 1
    }
  }
}
```

Archived notifications are hidden from this list.

## Unread Notification Count

```text
GET /notifications/unread-count
```

Success response:

```json
{
  "success": true,
  "message": "Unread notification count fetched successfully",
  "data": {
    "unread_count": 3
  }
}
```

## Get One Notification

```text
GET /notifications/:id
```

The notification must belong to the current user and must not be archived.

Success response:

```json
{
  "success": true,
  "message": "Notification fetched successfully",
  "data": {
    "id": 1,
    "user_id": 1,
    "type": "reservation_confirmed",
    "channel": "in_app",
    "title": "Reservation confirmed",
    "message": "Your reservation has been confirmed.",
    "data": {
      "reservation_id": 12
    },
    "delivery_status": "delivered",
    "is_read": false,
    "read_at": null,
    "archived_at": null,
    "sent_at": null,
    "created_at": "2026-06-01T10:00:00.000Z",
    "updated_at": "2026-06-01T10:00:00.000Z"
  }
}
```

## Mark One Notification As Read

```text
PATCH /notifications/:id/read
```

The notification must belong to the current user.

Success response:

```json
{
  "success": true,
  "message": "Notification marked as read",
  "data": {
    "id": 1,
    "user_id": 1,
    "type": "reservation_confirmed",
    "channel": "in_app",
    "title": "Reservation confirmed",
    "message": "Your reservation has been confirmed.",
    "data": {
      "reservation_id": 12
    },
    "delivery_status": "delivered",
    "is_read": true,
    "read_at": "2026-06-01T10:05:00.000Z",
    "archived_at": null,
    "sent_at": null,
    "created_at": "2026-06-01T10:00:00.000Z",
    "updated_at": "2026-06-01T10:05:00.000Z"
  }
}
```

## Mark All Notifications As Read

```text
PATCH /notifications/mark-all-read
```

Success response:

```json
{
  "success": true,
  "message": "All notifications marked as read",
  "data": {
    "updated_count": 5
  }
}
```

Backward-compatible route:

```text
PATCH /notifications/read-all
```

## Archive One Notification

```text
PATCH /notifications/:id/archive
```

The notification must belong to the current user.

Archived notifications are marked as read and hidden from list, unread count, and detail endpoints.

Success response:

```json
{
  "success": true,
  "message": "Notification archived successfully",
  "data": {
    "archived": true
  }
}
```

## Backend Notification Helper

Other backend modules should create notifications through the notification service:

```js
const notificationService = require("../notifications/notification.service");

await notificationService.notifyUser({
  userId: 1,
  type: notificationService.NOTIFICATION_TYPES.RESERVATION_CONFIRMED,
  title: "Reservation confirmed",
  message: "Your reservation has been confirmed.",
  data: {
    reservation_id: 12,
  },
  critical: true,
  email: {
    subject: "Reservation confirmed",
    title: "Reservation confirmed",
    message: "Your reservation has been confirmed.",
    actionUrl: "http://localhost:5173/customer/reservations/12",
  },
});
```

Notifications are always saved in-app. Critical email notifications are sent only when SMTP is configured; email failures are logged and do not block the main action.

## Currently Wired Events

Auth/user module events:

- email verified: creates an in-app `system` notification
- password reset completed: creates `password_changed` notification and sends critical email when SMTP is configured
- password changed from profile: creates `password_changed` notification and sends critical email when SMTP is configured

Reservation module:

- reservation created: creates `reservation_created` notification
- reservation confirmed: creates `reservation_confirmed` notification
- reservation cancelled: creates `reservation_cancelled` notification

Payment module:

- receipt submitted: creates `payment_submitted` notification
- payment verified: creates `payment_verified` notification
- payment rejected: creates `payment_rejected` notification
- payment refunded: creates `payment_refunded` notification

Property module:

- property approved: creates `property_approved` notification
- property rejected: creates `property_rejected` notification

The reservation, payment, and property modules are fully wired today and fire these notifications directly from their own services.
