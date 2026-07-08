# Admin EndPoints (For Admin only)

Note: See "Get all properties (admin)" further below for the current `GET /api/admin/properties` documentation.

## Update Property Status

```text
PATCH /admin/properties/8/status
```

Authorization: Required

body:

```json
{
  "status_id": 2,
  "rejection_reason": ""
}
```

Business rules:

- Approving (`status_id: 2`) requires the property to have at least 1 image, at least 1 room, and every room must have at least 1 image — otherwise the request fails with `400`.
- Rejecting (`status_id: 3`) requires a non-empty `rejection_reason`.

Success Response:

```json
{
  "success": true,
  "message": "Updated status successfully",
  "data": {
    "id": 5,
    "property_name": "testuser10",
    "status_name": "approved",
    "rejection_reason": null,
    "approved_at": "2026-05-16T13:27:59.000Z",
    "approved_by_name": "System Admin"
  }
}
```

# Properties EndPoints

## Get All Approved Properties (Public)

```text
GET /api/properties
```

Authentication: Not required.

params:
search,city_id,province_id,category_id,page,limit

success response:

```json
{
  "success": true,
  "message": "Get All properties successfully",
  "data": [
    {
      "id": 1,
      "property_name": "Sokha Hotel",
      "description": "Luxury hotel in Phnom Penh",
      "number_of_floors": 10,
      "city": {
        "city_id": 1,
        "city_name": "Phnom Penh"
      },
      "province": {
        "province_id": 1,
        "province_name": "Phnom Penh"
      },
      "country": {
        "country_id": 1,
        "country_name": "Cambodia"
      },
      "category": {
        "category_id": 1,
        "category_name": "Hotel"
      },
      "price_per_night": "50.00",
      "average_rating": 4.5,
      "image_url": null
    }
  ]
}
```

Note: See "Get property detail(public)" further below for the current property-detail-by-id documentation.

## Register Property (owner)

```text
POST /properties
```

Authentication: Required.

body

```json
{
  "category_id": 1,
  "property_name": "Sokdara Hotel",
  "description": "Luxury hotel in Phnom Penh with river view and modern facilities.",
  "address": "No. 22, Street 123, Phnom Penh",
  "city_id": 1,
  "province_id": 1,
  "country_id": 1,
  "latitude": 11.5564,
  "longitude": 104.9282,
  "contact_phone": "+855 12 345 678",
  "contact_email": "contact@sokhahotel.com",
  "number_of_floors": 10
}
```

Required fields: `category_id, property_name, address, city_id, province_id, country_id`. All other fields (`description, latitude, longitude, contact_phone, contact_email, number_of_floors`) are optional.

success response:

```json
{
  "success": true,
  "message": "Property created successfully",
  "data": {
    "id": 5,
    "property_name": "Sokdara Hotel",
    "slug": null,
    "description": "Luxury hotel in Phnom Penh with river view and modern facilities.",
    "address": "No. 22, Street 123, Phnom Penh",
    "latitude": "11.55640000",
    "longitude": "104.92820000",
    "contact_phone": "+855 12 345 678",
    "contact_email": "contact@sokhahotel.com",
    "number_of_floors": 10,
    "created_at": "2026-06-18T09:00:33.000Z",
    "owner_id": 18,
    "owner_name": "User17",
    "owner_email": "menghour42220+2@gmail.com",
    "category_id": 1,
    "category_name": "Hotel",
    "city_id": 1,
    "city_name": "Phnom Penh",
    "province_id": 1,
    "province_name": "Phnom Penh",
    "country_id": 1,
    "country_name": "Cambodia"
  }
}
```

## Update Property (Owner only)

```text
PATCH /properties/:id
```

Authentication: Required.

body

```json
{
  "category_id": 1,
  "property_name": "Sokdara Hotel Updated",
  "description": "Luxury hotel updated description",

  "address": "Street 60, Phnom Penh",
  "city_id": 2,

  "latitude": 11.5564,
  "longitude": 104.9282,

  "contact_phone": "098111222",
  "contact_email": "hotel@sokha.com",

  "number_of_floors": 12
}
```

Success Response:

```json
{
  "success": true,
  "message": "Property updated successfully",
  "data": {
    "id": 4,
    "property_name": "Sokdara Hotel Updated",
    "slug": null,
    "description": "Luxury hotel updated description",
    "address": "Street 60, Phnom Penh",
    "latitude": "11.55640000",
    "longitude": "104.92820000",
    "contact_phone": "098111222",
    "contact_email": "hotel@sokha.com",
    "number_of_floors": 12,
    "created_at": "2026-06-17T09:36:33.000Z",
    "rejection_reason": "Missing clear room images",
    "status_id": 3,
    "status_name": "rejected",
    "owner_id": 18,
    "owner_name": "User17",
    "owner_email": "menghour42220+2@gmail.com",
    "category_id": 1,
    "category_name": "Hotel",
    "city_id": 2,
    "city_name": "Siem Reap City",
    "province_id": 2,
    "province_name": "Siem Reap",
    "country_id": 1,
    "country_name": "Cambodia"
  }
}
```

## Delete Property (Owner only)

```text
DELETE /properties/:id
```

Authentication: Required.

Success Response:

```json
{
  "success": true,
  "message": "Property deleted successfully",
  "data": null
}
```

## Deactivate Property (Owner only)

```text
PATCH /owner/properties/:id/deactivate
```

Authentication: Required (owner role).

Takes an `approved` property offline temporarily (sets status to `suspended`).

Restrictions:

- Owner must own the property
- Only `approved` properties can be deactivated
- No admin approval required

Success Response:

```json
{
  "success": true,
  "message": "Property deactivated successfully",
  "data": {
    "id": 1,
    "property_name": "Sokha Hotel",
    "status_name": "suspended",
    "rejection_reason": null,
    "approved_at": "2026-05-20T10:00:00.000Z",
    "approved_by_name": "Admin User"
  }
}
```

## Activate Property (Owner only)

```text
PATCH /owner/properties/:id/activate
```

Authentication: Required (owner role).

Re-enables a `suspended` property (sets status back to `approved`).

Restrictions:

- Owner must own the property
- Only `suspended` properties can be reactivated
- No admin approval required (property was already approved before)

Success Response:

```json
{
  "success": true,
  "message": "Property activated successfully",
  "data": {
    "id": 1,
    "property_name": "Sokha Hotel",
    "status_name": "approved",
    "rejection_reason": null,
    "approved_at": "2026-05-20T10:00:00.000Z",
    "approved_by_name": "Admin User"
  }
}
```

## Get My Properties (Owner only)

```text
GET /properties/my
```

Authentication: Required.

params:
city_id,province_id,category_id,search,page,limit

Success Response

```json
{
  "success": true,
  "message": "My properties fetched successfully",
  "data": [
    {
      "id": 4,
      "property_name": "Sok Hotel Updated",
      "city_id": 2,
      "city_name": "Siem Reap City",
      "province_id": 2,
      "province_name": "Siem Reap",
      "country_id": 1,
      "country_name": "Cambodia",
      "category_id": 1,
      "category_name": "Hotel",
      "status_id": 1,
      "status_name": "pending",
      "cover_image": "/uploads/properties/1781769413969-394927412.png",
      "created_at": "2026-06-17T09:36:33.000Z"
    }
  ]
}
```

## Get My Property By Id (Owner only)

```text
GET /properties/my/:id
```

Authentication: Required.

Success Response:

```json
{
  "success": true,
  "message": "get my property successfully",
  "data": {
    "id": 4,
    "property_name": "Sok Hotel Updated",
    "slug": null,
    "description": "Luxury hotel updated description",
    "address": "Street 60, Phnom Penh",
    "city": {
      "city_id": 2,
      "city_name": "Siem Reap City"
    },
    "province": {
      "province_id": 2,
      "province_name": "Siem Reap"
    },
    "country": {
      "country_id": 1,
      "country_name": "Cambodia"
    },
    "latitude": "11.55640000",
    "longitude": "104.92820000",
    "contact_phone": "098111222",
    "contact_email": "hotel@sokha.com",
    "number_of_floors": 12,
    "category": {
      "category_id": 1,
      "category_name": "Hotel"
    },
    "status": {
      "status_id": 1,
      "status_name": "pending"
    },
    "owner": {
      "owner_id": 18,
      "full_name": "User17",
      "phone": "0123659870",
      "email": "menghour42220+2@gmail.com"
    },
    "images": [
      {
        "image_id": 1,
        "image_url": "/uploads/properties/1781769413969-394927412.png",
        "is_cover": true,
        "sort_order": 0
      },
      {
        "image_id": 2,
        "image_url": "/uploads/properties/1781769595279-833996104.png",
        "is_cover": false,
        "sort_order": 0
      }
    ]
  }
}
```

## Upload Property Images (Owner only)

```text
POST /api/properties/:id/images
```

```text
form data:
key: images(max=10)
```

Authentication: Required.

success Response:

```json
{
  "success": true,
  "message": "Property images uploaded successfully",
  "data": [
    {
      "property_id": "5",
      "image_url": "/uploads/properties/1778936694009-974522482.png",
      "sort_order": 0
    }
  ]
}
```

## Delete Property Image (Owner only)

```text
DELETE /properties/:id/images/:imageId
```

Authentication: Required.

```json
{
  "success": true,
  "message": "Property image deleted successfully",
  "data": null
}
```

## Set Cover Image Property (Owner only)

```text
PATCH /properties/:propertyId/images/:imageId/cover
```

Authentication: Required.

Success Response:

```json
{
  "success": true,
  "message": "Cover image updated successfully",
  "data": null
}
```

## Sort Images Property (Owner only)

```text
PATCH /properties/:propertyId/images/sort
```

Authentication: Required.

body:

```json
[
  {
    "image_id": 6,
    "sort_order": 1
  },

  {
    "image_id": 5,
    "sort_order": 2
  }
]
```

Success Response:

```json
{
  "success": true,
  "message": "Image sort updated successfully",
  "data": null
}
```

## Get All Images Property (public)

```text
GET /properties/:propertyId/images
```

Authentication: No required.

Success Response:

```json
{
  "success": true,
  "message": "Property images fetched successfully",
  "data": [
    {
      "id": 7,
      "image_url": "/uploads/properties/1778936694009-974522482.png",
      "is_cover": 0,
      "sort_order": 0
    }
  ]
}
```

## Get property detail(admin)

```text
GET /api/admin/properties/:propertyId
```

Authorization: required

success response:

```json
{
  "success": true,
  "message": "Property detail fetched successfully",
  "data": {
    "id": 13,
    "owner_id": 18,
    "category_id": 1,
    "status_id": 1,
    "property_name": "property100",
    "slug": null,
    "description": "A luxurious beachfront resort with infinity pool, spa, and fine dining. Perfect for family vacations and romantic getaways.",
    "address": "Street 123, Sangkat 4, Group 5",
    "city": "Sihanoukville",
    "province": "Phnom Penh",
    "country": "Cambodia",
    "latitude": "10.63456780",
    "longitude": "103.49723450",
    "contact_phone": "+855 12 345 678",
    "contact_email": "reservations@sunsetbeach.com",
    "rejection_reason": null,
    "approved_by": null,
    "approved_at": null,
    "created_at": "2026-06-05T07:47:43.000Z",
    "updated_at": "2026-06-05T07:47:43.000Z",
    "deleted_at": null,
    "category_name": "Hotel",
    "status_name": "pending",
    "owner_name": "User17",
    "owner_email": "menghour42220+2@gmail.com",
    "owner_phone": "0123659870",
    "images": [],
    "amenities": []
  }
}
```

## Get all categories (public)

```text
GET /api/properties/categories
```

Authorization: not required

success response:

```json
{
  "success": true,
  "message": "Get All Categories successfully",
  "data": [
    {
      "id": 1,
      "category_name": "Hotel",
      "description": "Hotel accommodation",
      "created_at": "2026-05-06T15:18:02.000Z",
      "updated_at": "2026-05-06T15:18:02.000Z"
    }
  ]
}
```

## Get all cities (public)

```text
GET /api/properties/cities
```

```json
{
  "result": true,
  "message": "Get all cities successfully",
  "status": 200,
  "data": [
    {
      "id": 1,
      "province_id": 1,
      "name": "Phnom Penh"
    }
  ]
}
```

## Get all provinces (public)

```text
GET /api/properties/provinces
```

success response:

```json
{
  "result": true,
  "message": "Get all provinces successfully",
  "status": 200,
  "data": [
    {
      "id": 4,
      "country_id": 1,
      "name": "Battambang"
    }
  ]
}
```

## Get property detail(public)

```text
GET /api/properties/:id
```

Note: `slug` is currently always `null` (reserved for future use — every property query hard-codes `NULL AS slug`).

success response:

```json
{
  "success": true,
  "message": "Get owner detail successfully",
  "data": {
    "id": 1,
    "property_name": "Sokha Hotel",
    "slug": null,
    "description": "Luxury hotel in Phnom Penh",
    "address": "Street 60, Phnom Penh",
    "latitude": "11.55640000",
    "longitude": "104.92820000",
    "contact_phone": "098111222",
    "contact_email": "sokha@gmail.com",
    "number_of_floors": 10,
    "created_at": "2026-06-16T09:03:00.000Z",
    "updated_at": "2026-06-16T09:03:00.000Z",
    "status_id": 2,
    "status_name": "approved",
    "category_id": 1,
    "category_name": "Hotel",
    "owner_id": 2,
    "full_name": "Owner Sokha",
    "owner_phone": "098111222",
    "owner_email": "owner1@gmail.com",
    "city_id": 1,
    "city_name": "Phnom Penh",
    "province_id": 1,
    "province_name": "Phnom Penh",
    "country_id": 1,
    "country_name": "Cambodia",
    "images": [],
    "amenities": [
      {
        "id": 1,
        "amenity_name": "Wi-Fi"
      },
      {
        "id": 4,
        "amenity_name": "Air Conditioning"
      },
      {
        "id": 5,
        "amenity_name": "Swimming Pool"
      }
    ],
    "rooms": []
  }
}
```

## Get all properties (admin)

```text
GET /api/admin/properties
```

Authorization: required

params:
city_id,province_id,country_id,category_id,status_id,search,page,limit

success response:

```json
{
  "success": true,
  "message": "Get all properties successfully",
  "data": [
    {
      "id": 5,
      "property_name": "Sokdara Hotel",
      "description": "Luxury hotel in Phnom Penh with river view and modern facilities.",
      "address": "No. 22, Street 123, Phnom Penh",
      "number_of_floors": 10,
      "owner": {
        "owner_id": 18,
        "owner_name": "User17",
        "owner_email": "menghour42220+2@gmail.com",
        "owner_phone": "0123659870"
      },
      "category": {
        "category_id": 1,
        "category_name": "Hotel"
      },
      "status": {
        "status_id": 1,
        "status_name": "pending"
      },
      "city": {
        "city_id": 1,
        "city_name": "Phnom Penh"
      },
      "province": {
        "province_id": 1,
        "province_name": "Phnom Penh"
      },
      "country": {
        "country_id": 1,
        "country_name": "Cambodia"
      },
      "image_url": null,
      "rejection_reason": null,
      "approved_by": null,
      "approved_at": null,
      "created_at": "2026-06-18T09:00:33.000Z",
      "updated_at": "2026-06-18T09:04:17.000Z"
    }
  ]
}
```
