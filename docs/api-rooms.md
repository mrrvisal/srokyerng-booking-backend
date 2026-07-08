## Get room images (public)

```text
GET /api/rooms/:roomId/images
```

Authorization: not required

success response:

```json
{
  "success": true,
  "message": "Room images fetched successfully",
  "data": [
    {
      "id": 15,
      "room_id": 8,
      "image_url": "/uploads/rooms/1779785180569-634811745.png",
      "is_cover": 0,
      "sort_order": 1,
      "created_at": "2026-05-26T08:46:20.000Z"
    }
  ]
}
```

## Upload room images (owner)

```text
POST /api/rooms/:roomId/images
```

Authorization: required
body:form data(key:images),max =10
success response:

```json
{
  "success": true,
  "message": "Room images uploaded successfully",
  "data": [
    {
      "room_id": "8",
      "image_url": "/uploads/rooms/1779785180569-634811745.png",
      "sort_order": 1
    }
  ]
}
```

## Set room cover-image(owner)

```text
PATCH /api/rooms/:roomId/images/:imageId/cover
```

Authorization: required

success response:

```json
{
  "success": true,
  "message": "Room cover image updated successfully",
  "data": null
}
```

## Sort room images (owner)

```text
PATCH /api/rooms/:roomId/images/sort
```

Authorization: required

body:

```json
[
  {
    "image_id": 15,
    "sort_order": 2
  }
]
```

success response:

```json
{
  "success": true,
  "message": "Room image sort updated successfully",
  "data": null
}
```

## Delete room image (owner)

```text
DELETE /api/rooms/:roomId/images/:imageId
```

Authorization: required
success response:

```json
{
  "success": true,
  "message": "Room image deleted successfully",
  "data": null
}
```

## Check room availability (public)

```text
GET /api/rooms/:roomId/availability?check_in_date=2026-06-01&check_out_date=2026-06-03&guests=2
```

check_in_date >= Now

Authorization: not required

success response:

```json
{
  "success": true,
  "message": "Room availability checked successfully",
  "data": {
    "room_id": 1,
    "room_name": "Deluxe Room",
    "total_rooms": 10,
    "booked_rooms": 1,
    "available_rooms": 9,
    "is_available": true,
    "check_in_date": "2026-05-27",
    "check_out_date": "2026-05-30",
    "guests": 2
  }
}
```

## Check property availability(public)

```text
GET /api/properties/8/availability?check_in_date=2026-06-01&check_out_date=2026-06-03&guests=2
```

Authorization: not required

success response:

```json
{
  "success": true,
  "message": "Property availability checked successfully",
  "data": [
    {
      "room_id": 4,
      "room_name": "VIP Room",
      "room_type": "Standard",
      "price_per_night": "50.00",
      "max_guests": 2,
      "available_rooms": 5,
      "cover_image": null
    }
  ]
}
```

## Create room (owner)

```text
POST /api/properties/:propertyId/rooms
```

Authorization: required

body:

```json
{
  "room_type_id": 1,
  "room_name": "VIP Room",
  "floor_number": 2,
  "description": "Nice room",
  "price_per_night": 100,
  "max_guests": 2,
  "total_rooms": 5
}
```

success response:

```json
{
  "success": true,
  "message": "Room created successfully",
  "data": {
    "id": 10,
    "property_id": 12,
    "room_type_id": 1,
    "room_name": "VIP Room",
    "floor_number": 2,
    "price_per_night": "100.00",
    "max_guests": 2,
    "total_rooms": 5
  }
}
```

## Delete Room(owner)

```text
DELETE /api/rooms/:id
```

Authorization : required

success response:

```json
{
  "success": true,
  "message": "Room deleted successfully",
  "data": null
}
```

## Get all approved rooms (public)

```text
GET /api/properties/:propertyId/rooms
```

success response:

```json
{
  "success": true,
  "message": "Rooms fetched successfully",
  "data": [
    {
      "id": 9,
      "property_id": 12,
      "room_type_id": 1,
      "room_name": "user17 Room",
      "description": "Nice room",
      "price_per_night": "50.00",
      "max_guests": 2,
      "total_rooms": 5,
      "created_at": "2026-06-04T09:30:45.000Z",
      "updated_at": "2026-06-04T09:30:45.000Z",
      "deleted_at": null,
      "type_name": "Standard",
      "cover_image": null
    }
  ]
}
```

## Get all my rooms(owner)

```text
GET /api/properties/:propertyId/rooms/my
```

Authorization: required

params:

room_type_id,min_price,max_price,search,page,limit

success response:

```json
{
  "success": true,
  "message": "My rooms fetched successfully",
  "data": [
    {
      "id": 1,
      "property_id": 4,
      "room_type_id": 1,
      "room_name": "VIP Roompropro4",
      "floor_number": 3,
      "description": "NiceVIP room",
      "price_per_night": "100.00",
      "max_guests": 2,
      "total_rooms": 2,
      "created_at": "2026-06-18T08:06:45.000Z",
      "updated_at": "2026-06-18T08:06:45.000Z",
      "deleted_at": null,
      "type_name": "Standard",
      "cover_image": null
    }
  ]
}
```

## Get room detail(public)

```text
GET /api/rooms/:id
```

success response:

```json
{
  "success": true,
  "message": "Room detail fetched successfully",
  "data": {
    "id": 1,
    "property_id": 4,
    "room_type_id": 1,
    "room_name": "VIP Roompropro4",
    "floor_number": 3,
    "description": "NiceVIP room",
    "price_per_night": "100.00",
    "max_guests": 2,
    "total_rooms": 2,
    "created_at": "2026-06-18T08:06:45.000Z",
    "updated_at": "2026-06-18T08:06:45.000Z",
    "deleted_at": null
  }
}
```

## Get room type(public)

```text
GET /api/rooms/room-types
```

success response:

```json
{
  "success": true,
  "message": "Room types fetched successfully",
  "data": [
    {
      "id": 1,
      "type_name": "Standard",
      "description": "Standard room",
      "created_at": "2026-05-06T15:18:46.000Z",
      "updated_at": "2026-05-06T15:18:46.000Z"
    }
  ]
}
```

## Update room (owner)

```text
PATCH /api/rooms/:id
```

Authorization: required

body:

```json
{
  "room_type_id": 1,
  "room_name": "updateVIP Room",
  "description": "Nice room",
  "price_per_night": 100,
  "max_guests": 2,
  "total_rooms": 5
}
```

success response:

```json
{
  "success": true,
  "message": "Room updated successfully",
  "data": {
    "id": 9,
    "property_id": 12,
    "room_type_id": 1,
    "room_name": "updateVIP Room",
    "description": "Nice room",
    "price_per_night": "100.00",
    "max_guests": 2,
    "total_rooms": 5,
    "created_at": "2026-06-04T09:30:45.000Z",
    "updated_at": "2026-06-05T08:11:03.000Z",
    "deleted_at": null
  }
}
```

## Get room detail (owner)

```text
GET properties/:propertyId/rooms/:roomId
```

Authorization: required

success response:

```json
{
  "success": true,
  "message": "Room detail fetched successfully",
  "data": {
    "id": 1,
    "property_id": 4,
    "room_type_id": 1,
    "room_name": "VIP Roompropro4",
    "floor_number": 3,
    "description": "NiceVIP room",
    "price_per_night": "100.00",
    "max_guests": 2,
    "total_rooms": 2,
    "created_at": "2026-06-18T08:06:45.000Z",
    "updated_at": "2026-06-18T08:06:45.000Z",
    "deleted_at": null,
    "type_name": "Standard",
    "property_name": "Sok Hotel Updated",
    "cover_image": null
  }
}
```

## Get properties update requests(admin)

```text
GET admin/property-update-requests
```

Authorization: required

success response:

```json
{
  "success": true,
  "message": "Update requests fetched successfully",
  "data": [
    {
      "id": 1,
      "property_id": 16,
      "owner_id": 18,
      "update_data": {
        "city": "Sihanoukville",
        "address": "Street 123, Sangkat 4, Group 5",
        "country": "Cambodia",
        "latitude": 10.6345678,
        "province": "Phnom Penh",
        "longitude": 103.4972345,
        "category_id": 1,
        "description": "A luxurious beachfront resort with infinity pool, spa, and fine dining. Perfect for family vacations and romantic getaways.",
        "contact_email": "reservations@sunsetbeach.com",
        "contact_phone": "+855 12 345 678",
        "property_name": "updatedUpdate12"
      },
      "status": "rejected",
      "rejection_reason": "Property name is too generic. Please provide a more descriptive name.",
      "reviewed_by": 9,
      "reviewed_at": "2026-06-09T09:44:08.000Z",
      "created_at": "2026-06-09T07:58:39.000Z",
      "property_name": "updatedUpdate12",
      "owner_name": "User17"
    }
  ]
}
```

## Get properties update request by id(admin)

```text
GET admin/property-update-requests/:requestId"
```

Authorization: required

success response:

```json
{
  "success": true,
  "message": "Request detail fetched successfully",
  "data": {
    "id": 1,
    "property_id": 16,
    "owner_id": 18,
    "update_data": {
      "city": "Sihanoukville",
      "address": "Street 123, Sangkat 4, Group 5",
      "country": "Cambodia",
      "latitude": 10.6345678,
      "province": "Phnom Penh",
      "longitude": 103.4972345,
      "category_id": 1,
      "description": "A luxurious beachfront resort with infinity pool, spa, and fine dining. Perfect for family vacations and romantic getaways.",
      "contact_email": "reservations@sunsetbeach.com",
      "contact_phone": "+855 12 345 678",
      "property_name": "updatedUpdate12"
    },
    "status": "rejected",
    "rejection_reason": "Property name is too generic. Please provide a more descriptive name.",
    "reviewed_by": 9,
    "reviewed_at": "2026-06-09T09:44:08.000Z",
    "created_at": "2026-06-09T07:58:39.000Z"
  }
}
```

## Approve property uppdate-request(admin)

```text
PATCH admin/property-update-requests/:requestId/approve
```

Authorization: required

success response:

```json
{
  "success": true,
  "message": "Request approved successfully",
  "data": null
}
```

## Reject property uppdate-request(admin)

```text
PATCH admin/property-update-requests/:requestId/reject
```

Authorization: required

body:

```json
{
  "rejection_reason": "Property name is too generic. Please provide a more descriptive name."
}
```

success response:

```json
{
  "success": true,
  "message": "Request rejected successfully",
  "data": null
}
```
