### Amenities Endpoints

## Get All Amenities (Public)

````text
GET /amenities
````
Authentication: Not required.

success response:

```json
{
  "success": true,
  "message": "Amenities fetched successfully",
  "data": [
    {
      "id": 1,
      "amenity_name": "WiFi"
    },
    {
      "id": 2,
      "amenity_name": "Swimming Pool"
    }
  ]
}
```

## Get Property Amenities (Public)

```text
GET /properties/1/amenities
```
Authentication: Not required.

success response:

```json
{
  "success": true,
  "message": "Property amenities fetched successfully",
  "data": [
    {
      "id": 1,
      "amenity_name": "WiFi"
    }
  ]
}

```

## Update Property Amenities (Owner)

```text 
PUT /properties/1/amenities
```

Requires authentication.

Body :

```json
{
  "amenity_ids": [1, 2, 3]
}
```

success response:

```json
{
  "success": true,
  "message": "Property amenities updated successfully",
  "data": [
    {
      "id": 1,
      "amenity_name": "WiFi"
    },
    {
      "id": 2,
      "amenity_name": "Swimming Pool"
    },
    {
      "id": 3,
      "amenity_name": "Parking"
    }
  ]
}
```

Error responses:

Property not found:

```json
{
  "success": false,
  "message": "Property not found",
  "errors": null
}
```

Forbidden (property not owned by the requesting user):

```json
{
  "success": false,
  "message": "Forbidden",
  "errors": null
}
```

One or more amenity IDs are invalid:

```json
{
  "success": false,
  "message": "One or more amenity IDs are invalid",
  "errors": null
}
```