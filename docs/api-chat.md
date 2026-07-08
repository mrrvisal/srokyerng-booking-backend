# Chat API

## Overview

The chat API enables customer-owner messaging for communication about reservations and property questions.

All chat endpoints require authentication. Both `customer` and `owner` roles can access chat endpoints.

## Route Summary

General chat endpoints:

- `GET /api/chats` — List conversations for current user
- `POST /api/chats` — Create a new conversation with initial message
- `GET /api/chats/:conversationId/messages` — Get message history
- `POST /api/chats/:conversationId/messages` — Send a message (text, image, or both)
- `DELETE /api/chats/:conversationId/messages/:messageId` — Unsend own message
- `PATCH /api/chats/:conversationId/read` — Mark messages as read

Property-scoped chat endpoints:

- `POST /api/properties/:propertyId/chats` — Start conversation from a property (customer only)

Reservation-scoped chat endpoints:

- `POST /api/reservations/:reservationId/chats` — Start conversation from a reservation (customer or owner)

---

## List Conversations

```text
GET /api/chats
```

Requires authentication. Role: `customer` or `owner`.

Returns all conversations the authenticated user participates in (as customer or owner), ordered by most recent activity.

Success response:

```json
{
  "success": true,
  "message": "Conversations retrieved successfully",
  "data": [
    {
      "id": 1,
      "property_id": 1,
      "reservation_id": null,
      "customer_id": 5,
      "owner_id": 3,
      "status": "open",
      "last_message_at": "2026-06-23T12:00:00.000Z",
      "created_at": "2026-06-23T10:00:00.000Z",
      "updated_at": "2026-06-23T12:00:00.000Z",
      "property_name": "Ocean View Hotel",
      "last_message": "Thank you for your inquiry!",
      "unread_count": 0
    }
  ]
}
```

---

## Create Conversation

```text
POST /api/chats
```

Requires authentication. Role: `customer` or `owner`.

Request body:

```json
{
  "property_id": 1,
  "reservation_id": null,
  "initial_message": "Hello, I have a question about this property"
}
```

At least one of `property_id` or `reservation_id` is required.

Rules:

- When `property_id` is provided, only customers can start the conversation.
- When `reservation_id` is provided, both the customer and the owner of the reservation can start the conversation.
- Duplicate conversations for the same property/customer pair or reservation are rejected.

Success response (201):

```json
{
  "success": true,
  "message": "Conversation created successfully",
  "data": {
    "id": 1,
    "property_id": 1,
    "reservation_id": null,
    "customer_id": 5,
    "owner_id": 3,
    "status": "open",
    "last_message_at": "2026-06-23T12:00:00.000Z",
    "created_at": "2026-06-23T12:00:00.000Z",
    "updated_at": "2026-06-23T12:00:00.000Z"
  }
}
```

Error responses:

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": ["\"initial_message\" is required"]
}
```

```json
{
  "success": false,
  "message": "Either property_id or reservation_id is required"
}
```

```json
{
  "success": false,
  "message": "Only customers can start conversations from a property",
  "errors": ["Forbidden"]
}
```

```json
{
  "success": false,
  "message": "You are not a participant in this reservation",
  "errors": ["Forbidden"]
}
```

```json
{
  "success": false,
  "message": "A conversation for this property already exists",
  "errors": ["Conflict"]
}
```

```json
{
  "success": false,
  "message": "A conversation for this reservation already exists",
  "errors": ["Conflict"]
}
```

---

## Get Message History

```text
GET /api/chats/:conversationId/messages
```

Requires authentication. Role: `customer` or `owner`.

Access control: Only participants of the conversation can view messages.

Success response:

```json
{
  "success": true,
  "message": "Messages retrieved successfully",
  "data": [
    {
      "id": 1,
      "conversation_id": 1,
      "sender_id": 5,
      "message_body": "Hello, I have a question about this property",
      "attachment_url": null,
      "is_read": true,
      "read_at": "2026-06-23T12:05:00.000Z",
      "created_at": "2026-06-23T12:00:00.000Z",
      "sender_name": "John Doe"
    },
    {
      "id": 2,
      "conversation_id": 1,
      "sender_id": 3,
      "message_body": "Sure, how can I help?",
      "attachment_url": null,
      "is_read": false,
      "read_at": null,
      "created_at": "2026-06-23T12:10:00.000Z",
      "sender_name": "Property Owner"
    }
  ]
}
```

Error responses:

```json
{
  "success": false,
  "message": "Conversation not found",
  "errors": ["Not Found"]
}
```

```json
{
  "success": false,
  "message": "You do not have access to this conversation",
  "errors": ["Forbidden"]
}
```

---

## Send Message

```text
POST /api/chats/:conversationId/messages
```
Requires authentication. Role: `customer` or `owner`.

Content-Type: `multipart/form-data`

This endpoint supports **3 use cases** in a single request:

| Use Case | Form Fields | Description |
|----------|-------------|-------------|
| **Image only** | `image` (File) | Send just an image |
| **Text only** | `message_body` (Text) | Send just text |
| **Both** | `image` (File) + `message_body` (Text) | Send image with caption |

### Form Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `image` | File | No | Image or audio file (JPEG, PNG, WebP, or WebM/OGG/MP3/WAV/M4A audio, max 5MB) |
| `message_body` | Text | No | Message text (1-2000 characters) |

> **Note:** At least one of `image` or `message_body` must be provided.
>
> **Voice messages:** despite the field name `image`, this field also accepts audio files, so voice messages can be sent the same way as image attachments — upload the audio file as `image` with an optional `message_body` caption.

### Success Response (201)

**Image only:**
```json
{
  "success": true,
  "message": "Message sent successfully",
  "data": {
    "id": 4,
    "conversation_id": 1,
    "sender_id": 5,
    "message_body": "",
    "attachment_url": "/uploads/chats/chat-1712345678-123.jpg",
    "is_read": false,
    "read_at": null,
    "created_at": "2026-06-23T12:20:00.000Z",
    "sender_name": "John Doe"
  }
}
```

**Text only:**
```json
{
  "success": true,
  "message": "Message sent successfully",
  "data": {
    "id": 5,
    "conversation_id": 1,
    "sender_id": 5,
    "message_body": "Check out this room!",
    "attachment_url": null,
    "is_read": false,
    "read_at": null,
    "created_at": "2026-06-23T12:21:00.000Z",
    "sender_name": "John Doe"
  }
}
```

**Both image + text:**
```json
{
  "success": true,
  "message": "Message sent successfully",
  "data": {
    "id": 6,
    "conversation_id": 1,
    "sender_id": 5,
    "message_body": "Check out this room!",
    "attachment_url": "/uploads/chats/chat-1712345678-456.jpg",
    "is_read": false,
    "read_at": null,
    "created_at": "2026-06-23T12:22:00.000Z",
    "sender_name": "John Doe"
  }
}
```

### Error Responses

```json
{
  "success": false,
  "message": "Either image or message text is required"
}
```

```json
{
  "success": false,
  "message": "File too large. Maximum size is 5MB"
}
```

```json
{
  "success": false,
  "message": "Invalid file type or extension. Allowed: images and audio files."
}
```

---

## Unsend Message

```text
DELETE /api/chats/:conversationId/messages/:messageId
```

Requires authentication. Role: `customer` or `owner`.

Lets a participant unsend (delete) their own message.

Success response:

```json
{
  "success": true,
  "message": "Message unsent successfully",
  "data": {
    "messageId": 5
  }
}
```

Error responses:

```json
{
  "success": false,
  "message": "Conversation not found",
  "errors": ["Not Found"]
}
```

```json
{
  "success": false,
  "message": "You do not have access to this conversation",
  "errors": ["Forbidden"]
}
```

```json
{
  "success": false,
  "message": "Message not found",
  "errors": ["Not Found"]
}
```

```json
{
  "success": false,
  "message": "You can only unsend your own messages",
  "errors": ["Forbidden"]
}
```

---

## Mark Messages as Read

```text
PATCH /api/chats/:conversationId/read
```

Requires authentication. Role: `customer` or `owner`.

Marks all unread messages sent by the other participant as read. No request body required.

Access control: Only participants of the conversation can mark messages as read.

Success response:

```json
{
  "success": true,
  "message": "Messages marked as read",
  "data": {
    "marked_read": 3
  }
}
```

Error responses:

```json
{
  "success": false,
  "message": "Conversation not found",
  "errors": ["Not Found"]
}
```

```json
{
  "success": false,
  "message": "Invalid conversation ID"
}
```

---

## Start Conversation from Property

```text
POST /api/properties/:propertyId/chats
```

Requires authentication. Role: `customer` only.

Creates a new conversation with the property owner. No request body required. The conversation is created without an initial message; use `POST /api/chats/:conversationId/messages` to send the first message.

Rules:

- Only customers can start conversations from a property.
- The property must exist. (Note: the property's approval status is not currently checked — conversations can be started even against pending/rejected properties.)
- Duplicate conversations for the same customer-property pair are rejected.

Success response (201):

```json
{
  "success": true,
  "message": "Conversation created successfully",
  "data": {
    "id": 2,
    "property_id": 1,
    "reservation_id": null,
    "customer_id": 5,
    "owner_id": 3,
    "status": "open",
    "created_at": "2026-06-23T12:00:00.000Z",
    "updated_at": "2026-06-23T12:00:00.000Z"
  }
}
```

Error responses:

```json
{
  "success": false,
  "message": "Property not found",
  "errors": ["Not Found"]
}
```

```json
{
  "success": false,
  "message": "Only customers can start conversations from a property",
  "errors": ["Forbidden"]
}
```

```json
{
  "success": false,
  "message": "A conversation for this property already exists",
  "errors": ["Conflict"]
}
```

---

## Start Conversation from Reservation

```text
POST /api/reservations/:reservationId/chats
```

Requires authentication. Role: `customer` or `owner`.

Creates a new conversation linked to a reservation. No request body required.

Rules:

- Only the customer who owns the reservation or the property owner can start.
- The reservation must exist.
- Only one conversation per reservation is allowed.

Success response (201):

```json
{
  "success": true,
  "message": "Conversation created successfully",
  "data": {
    "id": 3,
    "property_id": null,
    "reservation_id": 5,
    "customer_id": 5,
    "owner_id": 3,
    "status": "open",
    "created_at": "2026-06-23T12:00:00.000Z",
    "updated_at": "2026-06-23T12:00:00.000Z"
  }
}
```

Error responses:

```json
{
  "success": false,
  "message": "Reservation not found",
  "errors": ["Not Found"]
}
```

```json
{
  "success": false,
  "message": "You are not a participant in this reservation",
  "errors": ["Forbidden"]
}
```

```json
{
  "success": false,
  "message": "A conversation for this reservation already exists",
  "errors": ["Conflict"]
}
```

---

## Database Schema

### chat_conversations

| Column | Type | Description |
|--------|------|-------------|
| id | INT (PK) | Auto-increment |
| property_id | INT (FK) | Optional property reference |
| reservation_id | INT (FK) | Optional reservation reference (unique) |
| customer_id | INT (FK) | Customer participant |
| owner_id | INT (FK) | Owner participant |
| status | VARCHAR(30) | Default: 'open' |
| last_message_at | TIMESTAMP | Last message timestamp |
| created_at | TIMESTAMP | Auto |
| updated_at | TIMESTAMP | Auto |

### chat_messages

| Column | Type | Description |
|--------|------|-------------|
| id | INT (PK) | Auto-increment |
| conversation_id | INT (FK) | Parent conversation |
| sender_id | INT (FK) | Message sender |
| message_body | TEXT | Message content |
| attachment_url | TEXT | Optional image/file URL |
| is_read | BOOLEAN | Default: FALSE |
| read_at | TIMESTAMP | When read |
| created_at | TIMESTAMP | Auto |

---

## Image/Attachment Upload Rules

| Rule | Value |
|------|-------|
| Allowed image MIME types | `image/jpeg`, `image/png`, `image/webp` |
| Allowed audio MIME types (voice messages) | `audio/webm`, `audio/ogg`, `audio/mp3`, `audio/mpeg`, `audio/wav`, `audio/x-m4a`, `audio/m4a` |
| Max file size | 5 MB |
| Form field name | `image` (accepts both image and audio files) |
| Storage directory | `uploads/chats/` |
| URL format | `/uploads/chats/chat-{timestamp}-{random}.{ext}` |

---

## Error Codes

| Status Code | Description |
|-------------|-------------|
| 400 | Validation failed, invalid ID, missing required fields, file too large, invalid file type |
| 401 | Unauthorized (missing or invalid token) |
| 403 | Forbidden (not a participant, wrong role, not the message sender) |
| 404 | Conversation, message, property, or reservation not found |
| 409 | Duplicate conversation |