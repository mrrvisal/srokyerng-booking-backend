# Admin Endpoints

Authorization: required (all endpoint)

## Get all report

```text
GET /api/admin/reports
```

success response:

```json
{
  "result": true,
  "status": 200,
  "data": [
    {
      "id": 1,
      "reporter_id": 16,
      "assigned_admin_id": null,
      "property_id": null,
      "reservation_id": null,
      "payment_id": 1,
      "report_type": "payment_issue",
      "subject": "Payment not verified",
      "description": "I already uploaded receipt but payment still pending.",
      "status": "open",
      "resolution_note": null,
      "resolved_by": null,
      "resolved_at": null,
      "created_at": "2026-06-03T08:17:28.000Z",
      "updated_at": "2026-06-03T08:17:28.000Z",
      "reporter_name": "User16"
    }
  ]
}
```

## Get report detail

```text
GET /api/admin/reports/:id
```

success response:

```json
{
  "success": true,
  "message": "Report fetched successfully",
  "data": {
    "id": 1,
    "reporter_id": 16,
    "assigned_admin_id": null,
    "property_id": null,
    "reservation_id": null,
    "payment_id": 1,
    "report_type": "payment_issue",
    "subject": "Payment not verified",
    "description": "I already uploaded receipt but payment still pending.",
    "status": "resolved",
    "resolution_note": "Customer received refund and issue is resolved.",
    "resolved_by": 9,
    "resolved_at": "2026-06-03T08:46:05.000Z",
    "created_at": "2026-06-03T08:17:28.000Z",
    "updated_at": "2026-06-03T08:46:05.000Z",
    "reporter_name": "User16",
    "assigned_admin_name": null
  }
}
```

## Update report status

```text
PATCH /api/admin/reports/:id/status
```

body:

status=open/ in_review/ resolved/ rejected/closed

```json
{
  "status": "resolved"
}
```

success response:

```json
{
  "result": true,
  "status": 200,
  "message": "Status updated"
}
```

## Resolve report

```text
PATCH /api/admin/reports/:id/resolve
```

body:

```json
{
  "resolution_note": "Customer received refund and issue is resolved."
}
```

success response:

```json
{
  "result": true,
  "status": 200,
  "message": "Report resolved"
}
```

# Customer Endpoints

Authorization: required (all endpoints)

## Create reports

```text
POST /api/reports
```

body:

report_type=reservation_issue/payment_issue/property_issue/owner_issue/customer_issue/review_issue/other

```json
{
  "report_type": "payment_issue",
  "subject": "Payment not verified",
  "description": "I already uploaded receipt but payment still pending.",
  "payment_id": 1
}
```

success response:

```json
{
  "result": true,
  "status": 201,
  "message": "Report submitted successfully",
  "data": {
    "id": 2,
    "reporter_id": 16,
    "assigned_admin_id": null,
    "property_id": null,
    "reservation_id": null,
    "payment_id": 2,
    "report_type": "payment_issue",
    "subject": "Payment2 not verified",
    "description": "I already uploaded receipt but payment still pending.",
    "status": "open",
    "resolution_note": null,
    "resolved_by": null,
    "resolved_at": null,
    "created_at": "2026-06-03T09:15:42.000Z",
    "updated_at": "2026-06-03T09:15:42.000Z"
  }
}
```

## Get my reports

```text
GET /api/reports/my
```

success response:

```json
{
  "result": true,
  "status": 200,
  "data": [
    {
      "id": 2,
      "reporter_id": 16,
      "assigned_admin_id": null,
      "property_id": null,
      "reservation_id": null,
      "payment_id": 2,
      "report_type": "payment_issue",
      "subject": "Payment2 not verified",
      "description": "I already uploaded receipt but payment still pending.",
      "status": "open",
      "resolution_note": null,
      "resolved_by": null,
      "resolved_at": null,
      "created_at": "2026-06-03T09:15:42.000Z",
      "updated_at": "2026-06-03T09:15:42.000Z"
    }
  ]
}
```

## Get report detail

```text
GET /api/reports/:id
```

success response:

```json
{
  "result": true,
  "status": 200,
  "data": {
    "id": 1,
    "reporter_id": 16,
    "assigned_admin_id": null,
    "property_id": null,
    "reservation_id": null,
    "payment_id": 1,
    "report_type": "payment_issue",
    "subject": "Payment not verified",
    "description": "I already uploaded receipt but payment still pending.",
    "status": "resolved",
    "resolution_note": "Customer received refund and issue is resolved.",
    "resolved_by": 9,
    "resolved_at": "2026-06-03T08:46:05.000Z",
    "created_at": "2026-06-03T08:17:28.000Z",
    "updated_at": "2026-06-03T08:46:05.000Z"
  }
}
```
