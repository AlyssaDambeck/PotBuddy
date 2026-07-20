
# PotBuddy API Contract

## 1. Purpose

The PotBuddy API supports user authentication, personal plant collections, a curated database of 25 popular plant species, care schedules, watering reminders, health journals, plant photos, common disease information, and weather-based care alerts.

This document defines the proposed request and response contract. It does not prescribe the internal Express, Mongoose, or MongoDB implementation.

## 2. Base URLs

- Development: `http://localhost:5000/api`
- Production: `https://DOMAIN/api`

All request and response bodies use JSON unless otherwise specified.

## 3. General Conventions

### Authentication

Protected endpoints require a bearer token:

```http
Authorization: Bearer <token>
```

### Successful response

```json
{
  "success": true,
  "data": {}
}
```

### Error response

```json
{
  "success": false,
  "message": "Description of the error"
}
```

### Common status codes

| Status | Meaning |
| --- | --- |
| `200 OK` | Request completed successfully |
| `201 Created` | Resource created successfully |
| `204 No Content` | Resource deleted successfully |
| `400 Bad Request` | Invalid request data |
| `401 Unauthorized` | Authentication is required or invalid |
| `403 Forbidden` | Authenticated user does not own the resource |
| `404 Not Found` | Resource does not exist |
| `409 Conflict` | Email, username, or another unique value already exists |
| `422 Unprocessable Content` | Request format is valid but field validation failed |
| `500 Internal Server Error` | Unexpected server error |
| `502 Bad Gateway` | Third-party service failed |

### Proposed enum values

```text
healthStatus: healthy | needs_attention | declining | critical | unknown
sunlightLevel: low | indirect | partial_sun | full_sun
humidityLevel: low | moderate | high
notificationType: watering | weather | health | system
```

## 4. Health

### `GET /api/health`

Checks whether the API is available.

- Authentication: Not required
- Success: `200 OK`

```json
{
  "success": true,
  "message": "PotBuddy API is running"
}
```

## 5. Authentication

### `POST /api/auth/register`

Registers a user with an email address and password. The account remains unverified until the verification link is used.

- Authentication: Not required
- Success: `201 Created`

Request:

```json
{
  "username": "plantfriend",
  "email": "user@example.com",
  "password": "ExamplePassword123!"
}
```

Response:

```json
{
  "success": true,
  "message": "Registration successful. Check your email to verify your account.",
  "data": {
    "user": {
      "id": "USER_OBJECT_ID",
      "username": "plantfriend",
      "email": "user@example.com",
      "emailVerified": false
    }
  }
}
```

Possible errors: `400`, `409`, `422`.

### `POST /api/auth/login`

Authenticates a local account.

- Authentication: Not required
- Success: `200 OK`

Request:

```json
{
  "email": "user@example.com",
  "password": "ExamplePassword123!"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "token": "JWT_OR_SESSION_TOKEN",
    "user": {
      "id": "USER_OBJECT_ID",
      "username": "plantfriend",
      "email": "user@example.com",
      "emailVerified": true,
      "featuredPlantId": null
    }
  }
}
```

Possible errors: `401` for invalid credentials or an unverified account.

### `POST /api/auth/google`

Authenticates a user using the credential returned by Google OAuth. The server must validate the Google credential before creating or returning a PotBuddy user.

- Authentication: Not required
- Success: `200 OK` or `201 Created`

Request:

```json
{
  "credential": "GOOGLE_ID_CREDENTIAL"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "token": "JWT_OR_SESSION_TOKEN",
    "user": {
      "id": "USER_OBJECT_ID",
      "username": "plantfriend",
      "email": "user@example.com",
      "emailVerified": true
    }
  }
}
```

### `GET /api/auth/verify-email?token=TOKEN`

Verifies the email address associated with a registration token.

- Authentication: Not required
- Success: `200 OK`

```json
{
  "success": true,
  "message": "Email address verified successfully"
}
```

Possible errors: `400` for an invalid or expired token.

### `POST /api/auth/resend-verification`

Sends a replacement verification email.

- Authentication: Not required
- Success: `200 OK`

Request:

```json
{
  "email": "user@example.com"
}
```

### `GET /api/auth/me`

Returns the authenticated user's account information.

- Authentication: Required
- Success: `200 OK`

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "USER_OBJECT_ID",
      "username": "plantfriend",
      "email": "user@example.com",
      "emailVerified": true,
      "featuredPlantId": "USER_PLANT_OBJECT_ID",
      "createdAt": "2026-07-19T20:00:00.000Z"
    }
  }
}
```

### `POST /api/auth/logout`

Ends the current session. If the project uses stateless JWTs, the client may instead delete its locally stored token.

- Authentication: Required
- Success: `200 OK`

## 6. User Profile

### `PATCH /api/users/me`

Updates editable profile information.

- Authentication: Required
- Success: `200 OK`

Request:

```json
{
  "username": "newplantfriend"
}GET    /api/health
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/google
GET    /api/auth/verify-email
GET    /api/auth/me
GET    /api/species
GET    /api/species/:speciesId
GET    /api/plants
POST   /api/plants
GET    /api/plants/:plantId
PATCH  /api/plants/:plantId
DELETE /api/plants/:plantId
POST   /api/plants/:plantId/water
GET    /api/plants/:plantId/journal
POST   /api/plants/:plantId/journal
GET    /api/weather
```
```

### `PATCH /api/users/me/featured-plant`

Selects one owned plant as the user's featured plant/profile picture. The supplied plant must belong to the authenticated user.

- Authentication: Required
- Success: `200 OK`

Request:

```json
{
  "userPlantId": "USER_PLANT_OBJECT_ID"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "featuredPlantId": "USER_PLANT_OBJECT_ID",
    "profileImageUrl": "/api/photos/PHOTO_OBJECT_ID/content"
  }
}
```

To clear the featured plant, send `null`:

```json
{
  "userPlantId": null
}
```

## 7. Plant Species Database

The species database contains the curated care information shared by all users. Users select a species from this collection when adding a personal plant.

### `GET /api/species`

Returns the supported plant species.

- Authentication: Not required
- Success: `200 OK`

Optional query parameters:

| Parameter | Example | Purpose |
| --- | --- | --- |
| `search` | `milkweed` | Searches common name, scientific name, and aliases |
| `page` | `1` | Requested results page |
| `limit` | `25` | Results per page |

Example: `GET /api/species?search=snake`

Response:

```json
{
  "success": true,
  "data": {
    "species": [
      {
        "id": "SPECIES_OBJECT_ID",
        "commonName": "Snake Plant",
        "scientificName": "Dracaena trifasciata",
        "aliases": ["Mother-in-law's Tongue"],
        "defaultImageUrl": "/api/photos/PHOTO_OBJECT_ID/content",
        "sunlight": {
          "level": "indirect",
          "instructions": "Bright indirect light is preferred, but low light is tolerated."
        },
        "watering": {
          "intervalDays": 14,
          "instructions": "Allow the soil to dry before watering again."
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 25,
      "total": 25
    }
  }
}
```

### `GET /api/species/:speciesId`

Returns the complete care guide for one species.

- Authentication: Not required
- Success: `200 OK`

```json
{
  "success": true,
  "data": {
    "species": {
      "id": "SPECIES_OBJECT_ID",
      "commonName": "Snake Plant",
      "scientificName": "Dracaena trifasciata",
      "aliases": ["Mother-in-law's Tongue"],
      "description": "A hardy indoor plant with upright leaves.",
      "defaultImageUrl": "/api/photos/PHOTO_OBJECT_ID/content",
      "sunlight": {
        "level": "indirect",
        "instructions": "Bright indirect light is preferred."
      },
      "watering": {
        "intervalDays": 14,
        "instructions": "Allow the soil to dry between waterings.",
        "warningSigns": ["Soft leaves", "Yellow leaves", "Persistently wet soil"]
      },
      "humidity": {
        "level": "low",
        "instructions": "Normal indoor humidity is sufficient."
      },
      "temperature": {
        "minimum": 65,
        "maximum": 85,
        "unit": "F"
      },
      "soil": "Use a well-draining indoor potting mix.",
      "fertilizing": {
        "intervalDays": 30,
        "instructions": "Fertilize lightly during active growth."
      },
      "toxicity": {
        "toxicToPets": true,
        "notes": "Keep away from cats and dogs."
      },
      "commonDiseases": [
        {
          "id": "DISEASE_ID",
          "name": "Brown spots",
          "symptoms": ["Brown or dark lesions on leaves"],
          "cause": "Overwatering, fungal infection, or leaf damage",
          "treatment": [
            "Reduce watering",
            "Remove heavily affected leaves",
            "Improve air circulation"
          ],
          "imageUrl": "/api/photos/PHOTO_OBJECT_ID/content"
        }
      ],
      "additionalCareNotes": ["Avoid standing water around the roots."]
    }
  }
}
```

Possible error: `404` when the species does not exist.

## 8. User Plants

User plants represent plants owned by a particular user. Each user plant references one species record and inherits its default care information.

### `GET /api/plants`

Returns the authenticated user's plants.

- Authentication: Required
- Success: `200 OK`

Optional query parameters:

| Parameter | Example | Purpose |
| --- | --- | --- |
| `healthStatus` | `healthy` | Filters by health |
| `wateringDue` | `true` | Returns plants currently due for watering |
| `sort` | `nextWateringAt` | Sorts the results |

```json
{
  "success": true,
  "data": {
    "plants": [
      {
        "id": "USER_PLANT_OBJECT_ID",
        "nickname": "Sally",
        "species": {
          "id": "SPECIES_OBJECT_ID",
          "commonName": "Snake Plant"
        },
        "healthStatus": "healthy",
        "location": "Bedroom window",
        "pictureUrl": "/api/photos/PHOTO_OBJECT_ID/content",
        "lastWateredAt": "2026-07-08T14:00:00.000Z",
        "nextWateringAt": "2026-07-22T14:00:00.000Z",
        "wateringDueInDays": 3
      }
    ]
  }
}
```

### `POST /api/plants`

Adds a plant to the authenticated user's collection. The selected `speciesId` must reference the species database.

- Authentication: Required
- Success: `201 Created`

Request:

```json
{
  "speciesId": "SPECIES_OBJECT_ID",
  "nickname": "Sally",
  "healthStatus": "healthy",
  "healthNotes": "Recently repotted",
  "location": "Bedroom window",
  "indoorOutdoor": "indoor",
  "acquiredAt": "2026-07-01T00:00:00.000Z",
  "lastWateredAt": "2026-07-19T14:00:00.000Z",
  "wateringIntervalDaysOverride": null,
  "wateringRemindersEnabled": true,
  "notificationSettings": {
    "enabled": true,
    "reminderTime": "09:00",
    "reminderDaysBefore": 1
  },
  "weatherLocation": {
    "zipCode": "32817",
    "latitude": 28.5978,
    "longitude": -81.2033
  }
}
```

Response:

```json
{
  "success": true,
  "data": {
    "plant": {
      "id": "USER_PLANT_OBJECT_ID",
      "nickname": "Sally",
      "speciesId": "SPECIES_OBJECT_ID",
      "lastWateredAt": "2026-07-19T14:00:00.000Z",
      "nextWateringAt": "2026-08-02T14:00:00.000Z"
    }
  }
}
```

The server calculates `nextWateringAt` as:

```text
lastWateredAt + effective watering interval
```

The effective interval is `wateringIntervalDaysOverride` when provided; otherwise it is the selected species' default `watering.intervalDays`.

### `GET /api/plants/:plantId`

Returns one owned plant, its species summary, watering schedule, and recent journal entries.

- Authentication: Required
- Success: `200 OK`

```json
{
  "success": true,
  "data": {
    "plant": {
      "id": "USER_PLANT_OBJECT_ID",
      "nickname": "Sally",
      "pictureUrl": "/api/photos/PHOTO_OBJECT_ID/content",
      "healthStatus": "healthy",
      "healthNotes": "Recently repotted",
      "location": "Bedroom window",
      "lastWateredAt": "2026-07-19T14:00:00.000Z",
      "nextWateringAt": "2026-08-02T14:00:00.000Z",
      "species": {
        "id": "SPECIES_OBJECT_ID",
        "commonName": "Snake Plant",
        "sunlight": {
          "level": "indirect",
          "instructions": "Bright indirect light is preferred."
        },
        "watering": {
          "intervalDays": 14,
          "instructions": "Allow the soil to dry between waterings."
        }
      },
      "recentJournalEntries": []
    }
  }
}
```

### `PATCH /api/plants/:plantId`

Updates editable information for an owned plant. `ownerId` and `speciesId` cannot be changed through this endpoint.

- Authentication: Required
- Success: `200 OK`

Request example:

```json
{
  "nickname": "Sally Jr.",
  "healthStatus": "needs_attention",
  "healthNotes": "Several leaves have brown spots",
  "location": "Living room",
  "wateringIntervalDaysOverride": 12,
  "wateringRemindersEnabled": true
}
```

### `DELETE /api/plants/:plantId`

Deletes an owned plant. The implementation should also define whether its journal entries and photos are permanently deleted or archived.

- Authentication: Required
- Success: `204 No Content`

### `POST /api/plants/:plantId/water`

Records a watering event and recalculates the next watering date.

- Authentication: Required
- Success: `200 OK`

Request:

```json
{
  "wateredAt": "2026-07-19T14:00:00.000Z",
  "createJournalEntry": true,
  "notes": "Soil was dry approximately two inches down."
}
```

Response:

```json
{
  "success": true,
  "data": {
    "plant": {
      "id": "USER_PLANT_OBJECT_ID",
      "lastWateredAt": "2026-07-19T14:00:00.000Z",
      "nextWateringAt": "2026-08-02T14:00:00.000Z"
    }
  }
}
```

### `GET /api/plants/due-for-watering`

Returns owned plants whose `nextWateringAt` is today or earlier.

- Authentication: Required
- Success: `200 OK`

## 9. Journal Entries

### `GET /api/plants/:plantId/journal`

Returns journal entries for one owned plant, newest first.

- Authentication: Required
- Success: `200 OK`

Optional query parameters: `page`, `limit`, `startDate`, and `endDate`.

```json
{
  "success": true,
  "data": {
    "entries": [
      {
        "id": "JOURNAL_ENTRY_OBJECT_ID",
        "plantId": "USER_PLANT_OBJECT_ID",
        "title": "New growth",
        "body": "Two new leaves appeared this week.",
        "healthStatus": "healthy",
        "watered": false,
        "entryDate": "2026-07-19T20:00:00.000Z",
        "photos": []
      }
    ]
  }
}
```

### `POST /api/plants/:plantId/journal`

Creates a journal entry for one owned plant.

- Authentication: Required
- Success: `201 Created`

Request:

```json
{
  "title": "New growth",
  "body": "Two new leaves appeared this week.",
  "healthStatus": "healthy",
  "watered": false,
  "entryDate": "2026-07-19T20:00:00.000Z"
}
```

If `healthStatus` is supplied, the backend may also update the user plant's current health status.

### `GET /api/journal/:entryId`

Returns one journal entry owned by the authenticated user.

- Authentication: Required
- Success: `200 OK`

### `PATCH /api/journal/:entryId`

Updates an owned journal entry.

- Authentication: Required
- Success: `200 OK`

Request example:

```json
{
  "title": "New growth and watering",
  "body": "Two new leaves appeared, and I watered the plant.",
  "healthStatus": "healthy",
  "watered": true,
  "entryDate": "2026-07-19T20:00:00.000Z"
}
```

### `DELETE /api/journal/:entryId`

Deletes an owned journal entry and any photos attached exclusively to it.

- Authentication: Required
- Success: `204 No Content`

## 10. Photos

Photo upload requests use `multipart/form-data`, not JSON. Proposed limits should be documented by the backend team, such as JPEG/PNG/WebP files up to 5 MB.

### `POST /api/plants/:plantId/photos`

Uploads or replaces the primary picture for an owned plant.

- Authentication: Required
- Content type: `multipart/form-data`
- Success: `201 Created`

Form fields:

| Field | Required | Description |
| --- | --- | --- |
| `photo` | Yes | Image file |
| `altText` | No | Accessible image description |
| `caption` | No | User-visible caption |

### `POST /api/journal/:entryId/photos`

Uploads a photo to an owned journal entry.

- Authentication: Required
- Content type: `multipart/form-data`
- Success: `201 Created`

### `GET /api/photos/:photoId/content`

Streams an image. Public species/disease images may be public; user-uploaded images should follow the application's privacy rules.

- Authentication: Depends on image ownership/type
- Success: `200 OK`
- Content type: Stored image type such as `image/jpeg`

### `DELETE /api/photos/:photoId`

Deletes an owned photo and removes its reference from the associated plant or journal entry.

- Authentication: Required
- Success: `204 No Content`

## 11. Weather Integration

Weather is the required relevant third-party API integration. PotBuddy can compare current outdoor conditions with the selected species' care range and generate advisory alerts. Weather must be presented as guidance rather than proof that a plant needs water.

### `GET /api/weather?zipCode=32817`

Returns normalized current weather for a location.

- Authentication: Required
- Success: `200 OK`

```json
{
  "success": true,
  "data": {
    "location": {
      "zipCode": "32817",
      "name": "Orlando, Florida"
    },
    "weather": {
      "temperature": 94,
      "temperatureUnit": "F",
      "humidityPercent": 68,
      "precipitationInches": 0,
      "condition": "Partly cloudy",
      "observedAt": "2026-07-19T20:00:00.000Z"
    },
    "source": "THIRD_PARTY_WEATHER_PROVIDER"
  }
}
```

Possible errors: `400` for an invalid location and `502` when the provider fails.
