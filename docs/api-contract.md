# API Contract

## Other Modules

This file covers only the shared Auth and User endpoints and the response envelope conventions used across the API. Module-specific endpoints live in their own doc files:

- `api-properties.md`
- `api-rooms.md`
- `api-reservation.md`
- `api-cancellation-refund.md`
- `api-payment.md`
- `api-amenity.md`
- `api-review.md`
- `api-wishlist.md`
- `api-notification.md`
- `api-chat.md`
- `api-report.md`
- `api-analytics.md`
- `api-calendar.md`

Base URL:

```text
http://localhost:<PORT>/api
```

## Response Shape

Success:

```json
{
  "success": true,
  "message": "Success",
  "data": {}
}
```

Error:

```json
{
  "success": false,
  "message": "Something went wrong",
  "errors": null
}
```

## Auth Header

Protected routes require:

```text
Authorization: Bearer <token>
```

## Roles

Final role values:

- `customer`: books accommodations
- `owner`: manages properties and rooms
- `admin`: manages system approvals and verification

`admin` users are created with `npm run seed:admin`, not public registration.

## Auth Endpoints

Sensitive auth endpoints are rate-limited:

- `POST /auth/login`: 10 requests per 15 minutes
- `POST /auth/register`: 10 requests per 15 minutes
- `POST /auth/refresh-token`: 30 requests per 15 minutes
- `POST /auth/forgot-password`: 3 requests per 15 minutes
- `POST /auth/reset-password`: 5 requests per 15 minutes
- `POST /auth/resend-verification-email`: 3 requests per 15 minutes

`POST /auth/google` and `POST /auth/facebook` share the same rate limit as `POST /auth/login`.

### Register

```text
POST /auth/register
```

Allowed roles:

- `customer`
- `owner`

Body:

```json
{
  "full_name": "Customer User",
  "email": "customer@example.com",
  "password": "password123",
  "phone": "012345678",
  "role": "customer"
}
```

### Login

```text
POST /auth/login
```

Body:

```json
{
  "email": "customer@example.com",
  "password": "password123"
}
```

Returns:

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "access_token": "<jwt>",
    "user": {
      "id": 1,
      "full_name": "Customer User",
      "email": "customer@example.com",
      "phone": "012345678",
      "role": "customer",
      "status": "active",
      "profile_image_url": null
    }
  }
}
```

Also sets an HttpOnly refresh-token cookie:

```text
Set-Cookie: refresh_token=<opaque-refresh-token>; HttpOnly; SameSite=Lax; Path=/api/auth
```

Use `access_token` in the `Authorization: Bearer <token>` header. The refresh token is stored in the HttpOnly cookie and is not readable by frontend JavaScript.

Browser clients must include credentials when calling login, refresh, and logout:

```js
fetch(url, {
  credentials: "include",
});
```

### Social Login / Account Linking

- `POST /auth/google` — Log in (or auto-register) using a Google ID token credential. Returns the same wrapped `access_token`/`user` shape as Login, with a "Google login successful" message, and sets the refresh-token cookie the same way.
- `POST /auth/facebook` — Log in (or auto-register) using a Facebook access token. Same response shape as above, with a "Facebook login successful" message.
- `POST /auth/google/link` — Requires authentication. Links a Google account (credential) to the current user's account.
- `DELETE /auth/google/link` — Requires authentication. Unlinks the current user's Google account.

### Refresh Token

```text
POST /auth/refresh-token
```

Requires the `refresh_token` cookie. Frontend requests must include credentials.

On success, the old refresh token is revoked and a new HttpOnly refresh-token cookie is set.

Returns:

```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "data": {
    "access_token": "<new-jwt>",
    "user": {
      "id": 1,
      "full_name": "Customer User",
      "email": "customer@example.com",
      "phone": "012345678",
      "role": "customer",
      "status": "active",
      "profile_image_url": null
    }
  }
}
```

### Current User

```text
GET /auth/me
```

Requires authentication.

Returns the current active user from the database:

```json
{
  "success": true,
  "message": "Current user fetched successfully",
  "data": {
    "id": 1,
    "full_name": "Customer User",
    "email": "customer@example.com",
    "phone": "012345678",
    "role": "customer",
    "status": "active",
    "profile_image_url": null,
    "last_login": "2026-05-10T10:00:00.000Z",
    "email_verified_at": null
  }
}
```

### Verify Email

```text
POST /auth/verify-email
```

Body:

```json
{
  "token": "<token-from-email>"
}
```

Verification tokens expire after 24 hours and can be used once.

### Resend Verification Email

```text
POST /auth/resend-verification-email
```

Requires authentication.

Sends a new verification link if the current user's email is not already verified.

### Logout

```text
POST /auth/logout
```

Requires authentication.

Requires the `refresh_token` cookie. Frontend requests must include credentials.

Revokes the refresh token in the database and clears the refresh-token cookie. Clients should also remove the in-memory access token after a successful logout response.

### Logout All Devices

```text
POST /auth/logout-all
```

Requires authentication.

Revokes all refresh tokens for the current user and clears the current refresh-token cookie. Clients should also remove the in-memory access token after a successful response.

### List Sessions

```text
GET /auth/sessions
```

Requires authentication.

Returns active refresh sessions for the current user:

```json
{
  "success": true,
  "message": "Sessions fetched successfully",
  "data": [
    {
      "id": 1,
      "user_agent": "Mozilla/5.0",
      "ip_address": "127.0.0.1",
      "expires_at": "2026-06-18T01:00:00.000Z",
      "last_used_at": "2026-05-18T01:00:00.000Z",
      "created_at": "2026-05-18T01:00:00.000Z"
    }
  ]
}
```

### Revoke Session

```text
DELETE /auth/sessions/:id
```

Requires authentication.

Revokes one active refresh session owned by the current user.

### Forgot Password

```text
POST /auth/forgot-password
```

Body:

```json
{
  "email": "customer@example.com"
}
```

Always returns a generic success message so unknown emails are not exposed:

```json
{
  "success": true,
  "message": "If an account exists for this email, a password reset link has been sent",
  "data": null
}
```

Sends a real email using SMTP settings from `.env`. The reset link points to:

```text
<FRONTEND_URL>/reset-password?token=<token>
```

### Reset Password

```text
POST /auth/reset-password
```

Body:

```json
{
  "token": "<token-from-email>",
  "password": "newpassword123"
}
```

Reset tokens expire after 1 hour and can be used once.

## User Endpoints

All user endpoints require authentication.

### List Users

```text
GET /users
```

Requires `admin` role.

Query parameters:

- `role`: `customer`, `owner`, or `admin`
- `status`: `active` or `suspended`
- `search`: matches full name, email, or phone
- `page`: defaults to `1`
- `limit`: defaults to `20`, max `100`

Returns:

```json
{
  "success": true,
  "message": "Users fetched successfully",
  "data": {
    "users": [
      {
        "id": 1,
        "full_name": "Customer User",
        "email": "customer@example.com",
        "phone": "012345678",
        "role": "customer",
        "status": "active",
        "profile_image_url": null,
        "gender": null,
        "date_of_birth": null,
        "address": null,
        "last_login": "2026-05-10T10:00:00.000Z",
        "email_verified_at": null,
        "created_at": "2026-05-01T10:00:00.000Z",
        "updated_at": "2026-05-01T10:00:00.000Z"
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

### User Detail

```text
GET /users/:id
```

Requires `admin` role.

### Update User Status

```text
PATCH /users/:id/status
```

Requires `admin` role.

Body:

```json
{
  "status": "suspended"
}
```

Allowed status values:

- `active`
- `suspended`

### My Profile

```text
GET /users/me
```

Returns the current active user's account and profile data:

```json
{
  "success": true,
  "message": "Profile fetched successfully",
  "data": {
    "id": 1,
    "full_name": "Customer User",
    "email": "customer@example.com",
    "phone": "012345678",
    "role": "customer",
    "status": "active",
    "profile_image_url": null,
    "gender": null,
    "date_of_birth": null,
    "address": null,
    "last_login": "2026-05-10T10:00:00.000Z",
    "email_verified_at": null
  }
}
```

### Update My Profile

```text
PATCH /users/me
```

Body supports partial updates:

```json
{
  "full_name": "Updated User",
  "phone": "012345678",
  "profile_image_url": "https://example.com/profile.jpg",
  "gender": "female",
  "date_of_birth": "2000-01-31",
  "address": "Phnom Penh"
}
```

Optional nullable fields can be sent as `null` or an empty string to clear them.

### Update My Profile Image

```text
PATCH /users/me/profile-image
```

Requires authentication.

Content type:

```text
multipart/form-data
```

Form field:

```text
profile_image
```

Allowed file types:

- `image/jpeg`
- `image/png`
- `image/webp`

Maximum file size: `5MB`.

Stores the image under `/uploads/profiles/` and updates `profile_image_url`.

### Delete My Profile Image

```text
DELETE /users/me/profile-image
```

Requires authentication.

Removes the current user's profile image and clears `profile_image_url`.

### Change My Password

```text
PATCH /users/me/password
```

Body:

```json
{
  "current_password": "password123",
  "new_password": "newpassword123"
}
```
