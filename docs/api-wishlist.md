# Customer Endpoints

## Get my wishlists

```text
GET /api/wishlists/my
```

Authorization: required

success response:

```json
{
  "result": true,
  "status": 200,
  "message": "Wishlist fetched successfully",
  "data": [
    {
      "id": 1,
      "created_at": "2026-06-03T07:37:38.000Z",
      "property_id": 11,
      "property_name": "testamh",
      "city": "Phnom Penh",
      "province": "Phnom Penh",
      "cover_image": null,
      "price_per_night": 45.0,
      "average_rating": 4.8
    }
  ]
}
```

## Add to wishlist

```text
POST /api/wishlists/properties/:propertyId
```

Authorization: required

success response:

```json
{
  "result": true,
  "status": 201,
  "message": "Property saved successfully"
}
```

## Delete from wishlist

```text
DELETE /api/wishlists/properties/:propertyId
```

Authorization: required

success response:

```json
{
  "result": true,
  "status": 200,
  "message": "Wishlist removed successfully"
}
```

## Check wishlist status

```text
GET /api/wishlists/properties/:propertyId/status
```

Authorization: required

success response:

```json
{
  "result": true,
  "status": 200,
  "message": "Wishlist status fetched",
  "data": {
    "is_saved": false
  }
}
```
