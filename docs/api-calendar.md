# Availability calendar endpoints

## Route Summary

- `GET /api/rooms/:roomId/availability-calendar` — Get room availability calendar (public)
- `GET /api/properties/:propertyId/availability-calendar` — Get property availability calendar (public)
- `GET /api/owner/properties/:propertyId/availability-calendar` — Get owner property availability calendar (auth + owner)
- `GET /api/owner/rooms/:roomId/availability-calendar` — Get owner room availability calendar (auth + owner)
- `POST /api/owner/rooms/:roomId/availability-blocks` — Create room availability block (auth + owner)
- `DELETE /api/owner/rooms/:roomId/availability-blocks/:date` — Delete room availability block (auth + owner)

## public endpoint (No Authorization)

### Get room availability calendar

```text
GET /api/rooms/:roomId/availability-calendar?start_date=&end_date=
```

params:
start_date (>=Now())
end_date

success response:

```json
{
  "result": true,
  "status": 200,
  "data": {
    "room_id": "9",
    "available_dates": [
      "2026-06-20",
      "2026-06-21",
      "2026-06-22",
      "2026-06-23",
      "2026-06-24",
      "2026-06-25",
      "2026-06-26",
      "2026-06-27",
      "2026-06-28",
      "2026-06-29"
    ],
    "unavailable_dates": [
      "2026-06-05",
      "2026-06-06",
      "2026-06-07",
      "2026-06-08",
      "2026-06-09",
      "2026-06-10",
      "2026-06-11",
      "2026-06-12",
      "2026-06-13",
      "2026-06-14",
      "2026-06-15",
      "2026-06-16",
      "2026-06-17",
      "2026-06-18",
      "2026-06-19"
    ],
    "blocked_dates": [
      "2026-06-10"
    ]
  }
}
```

> `blocked_dates` are dates the owner manually blocked (e.g. for maintenance) via the availability-block endpoints below — see [Create Room Availability Block](#create-room-availability-block).

### Get property availability calendar

```text
GET /api/properties/:propertyId/availability-calendar?start_date=&end_date=
```

params:
start_date (>=Now())
end_date

success response:

```json
{
  "result": true,
  "status": 200,
  "data": {
    "available_dates": [
      "2026-06-01",
      "2026-06-02"
    ],
    "unavailable_dates": [
      "2026-06-05",
      "2026-06-06"
    ],
    "blocked_dates": [
      "2026-06-10"
    ],
    "reservations": [
      {
        "room_id": 9,
        "check_in_date": "2026-06-05",
        "check_out_date": "2026-06-08"
      }
    ]
  }
}
```

## Owner endpoints(Authorization: required)

### Get Owner property availability calendar

```text
GET /api/owner/properties/:propertyId/availability-calendar?start_date=&end_date=
```

params:
start_date (>=Now())
end_date

success response:

```json
{
  "result": true,
  "status": 200,
  "data": {
    "available_dates": [
      "2026-06-01",
      "2026-06-02"
    ],
    "unavailable_dates": [
      "2026-06-05",
      "2026-06-06"
    ],
    "blocked_dates": [
      "2026-06-10"
    ],
    "reservations": [
      {
        "room_id": 9,
        "check_in_date": "2026-06-05",
        "check_out_date": "2026-06-08"
      }
    ]
  }
}
```

### Get owneer room availability calendar

```text
GET /api/owner/rooms/:roomId/availability-calendar?start_date=&end_date=
```

params:
start_date (>=Now())
end_date

success response:

```json
{
  "result": true,
  "status": 200,
  "data": {
    "room_id": "9",
    "available_dates": [
      "2026-06-20",
      "2026-06-21",
      "2026-06-22",
      "2026-06-23",
      "2026-06-24",
      "2026-06-25",
      "2026-06-26",
      "2026-06-27",
      "2026-06-28",
      "2026-06-29"
    ],
    "unavailable_dates": [
      "2026-06-05",
      "2026-06-06",
      "2026-06-07",
      "2026-06-08",
      "2026-06-09",
      "2026-06-10",
      "2026-06-11",
      "2026-06-12",
      "2026-06-13",
      "2026-06-14",
      "2026-06-15",
      "2026-06-16",
      "2026-06-17",
      "2026-06-18",
      "2026-06-19"
    ],
    "blocked_dates": [
      "2026-06-10"
    ]
  }
}
```

> `blocked_dates` are dates the owner manually blocked (e.g. for maintenance) via the availability-block endpoints below — see [Create Room Availability Block](#create-room-availability-block).

---

## Room Availability Block Endpoints (Owner only)

### Create Room Availability Block

```text
POST /api/owner/rooms/:roomId/availability-blocks
```

Requires authentication and `owner` role. Only the owner of the property associated with the room can create a block.

Request body:

```json
{
  "date": "2026-06-10",
  "reason": "Maintenance"
}
```

Creates a manual block for the given date on the given room. Blocked dates appear in `blocked_dates` in the room and property availability-calendar responses above.

Success response:

```json
{
  "result": true,
  "status": 201,
  "data": {
    "id": 1,
    "room_id": 9,
    "date": "2026-06-10",
    "reason": "Maintenance"
  }
}
```

### Delete Room Availability Block

```text
DELETE /api/owner/rooms/:roomId/availability-blocks/:date
```

Requires authentication and `owner` role. Only the owner of the property associated with the room can remove a block.

Removes a previously created block for the given date on the given room.

Success response:

```json
{
  "result": true,
  "status": 200,
  "data": {
    "message": "Availability block removed successfully"
  }
}
```
