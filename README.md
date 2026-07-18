# Social Media Backend

A Node.js/Express microservice backend for a basic social-media application. The repository separates authentication, posts, media, and search into independent services behind a single API gateway.

> The public client entry point is the API gateway. Routes shown as **public** should be called through the gateway; the matching `/api/...` routes are the internal service endpoints.

## Contents

- [Architecture](#architecture)
- [Technology](#technology)
- [Services and ports](#services-and-ports)
- [Prerequisites](#prerequisites)
- [Installation and configuration](#installation-and-configuration)
- [Running locally](#running-locally)
- [Authentication](#authentication)
- [API reference](#api-reference)
- [Data models](#data-models)
- [Event-driven workflows](#event-driven-workflows)
- [Caching and rate limiting](#caching-and-rate-limiting)
- [Known implementation notes](#known-implementation-notes)

## Architecture

```text
Client
  |
  v
API Gateway (:3000)
  |-- /v1/auth   --> Identity service (:3001) --> MongoDB
  |-- /v1/post   --> Post service     (:3002) --> MongoDB + Redis
  |-- /v1/media  --> Media service    (:3003) --> MongoDB + Cloudinary
  `-- /v1/search --> Search service   (:3004) --> MongoDB

Post service -- post.created / post.deleted --> RabbitMQ topic exchange (asaipr23)
                                                   |                 |
                                                   v                 v
                                            Search service      Media service
```

The gateway validates access tokens for all non-auth requests, then adds the authenticated user ID as `x-auth-id` for internal services. The post service publishes lifecycle events to RabbitMQ. Search indexes newly-created posts, while media removes Cloudinary assets when a post is deleted.

## Technology

| Area | Implementation |
| --- | --- |
| Runtime | Node.js with ES modules |
| HTTP | Express 5 |
| Database | MongoDB / Mongoose |
| Authentication | JWT access tokens, Argon2 password hashes, MongoDB refresh-token store |
| Cache and distributed rate limiting | Redis / ioredis |
| Messaging | RabbitMQ / amqplib topic exchange |
| File storage | Cloudinary |
| Request protection | Helmet, CORS, express-rate-limit, rate-limiter-flexible |
| Logging | Winston |

## Services and ports

| Service | Default port | Responsibility | Public gateway prefix |
| --- | ---: | --- | --- |
| `api-gateway` | `3000` | Validates JWTs and proxies requests to services | `/v1` |
| `identity-service` | `3001` | Registration, login, refresh-token rotation, logout | `/v1/auth` |
| `post-service` | `3002` | Create, list, read, and delete posts | `/v1/post` |
| `media-service` | `3003` | Upload media to Cloudinary and list media records | `/v1/media` |
| `search-service` | `3004` | Full-text post search using an event-maintained index | `/v1/search` |

## Prerequisites

- Node.js 18+ and npm
- MongoDB instance(s)
- Redis instance
- RabbitMQ instance
- Cloudinary account (media service only)

Each service has its own `package.json` and lockfile. There is no root workspace package or container orchestration file, so services are installed and started separately.

## Installation and configuration

Install dependencies once in each service directory:

```powershell
cd api-gateway; npm install
cd ../identity-service; npm install
cd ../post-service; npm install
cd ../media-service; npm install
cd ../search-service; npm install
```

Create a `.env` file in every service directory. `.env` files are ignored by Git, so credentials are not committed.

### API gateway — `api-gateway/.env`

```env
PORT=3000
NODE_ENV=development
LOG_LEVEL=info
JWT_SCRECT=replace-with-a-long-random-secret
REDIS_URL=redis://localhost:6379
IDENTITY_SERVICE_URL=http://localhost:3001
POST_SERVICE_URL=http://localhost:3002
MEDIA_SERVICE_URL=http://localhost:3003
SEARCH_SERVICE_URL=http://localhost:3004
```

### Identity service — `identity-service/.env`

```env
PORT=3001
NODE_ENV=development
LOG_LEVEL=info
JWT_SCRECT=use-the-exact-same-secret-as-the-gateway
MONDODB_URL=mongodb://localhost:27017/social_identity
REDIS_URL=redis://localhost:6379
```

### Post service — `post-service/.env`

```env
PORT=3002
NODE_ENV=development
LOG_LEVEL=info
MONDODB_URL=mongodb://localhost:27017/social_posts
REDIS_URL=redis://localhost:6379
RABBITMQ_URL=amqp://localhost:5672
```

### Media service — `media-service/.env`

```env
PORT=3003
NODE_ENV=development
LOG_LEVEL=info
MONDODB_URL=mongodb://localhost:27017/social_media
REDIS_URL=redis://localhost:6379
RABBITMQ_URL=amqp://localhost:5672
my_cloud_name=your-cloudinary-cloud-name
my_key=your-cloudinary-api-key
my_secret=your-cloudinary-api-secret
```

### Search service — `search-service/.env`

```env
PORT=3004
NODE_ENV=development
LOG_LEVEL=info
MONDODB_URL=mongodb://localhost:27017/social_search
REDIS_URL=redis://localhost:6379
RABBITMQ_URL=amqp://localhost:5672
```

`MONDODB_URL` and `JWT_SCRECT` intentionally use the spellings present in the current source code. They must be named exactly this way unless the code is changed.

## Running locally

Start Redis, RabbitMQ, and MongoDB first. Then open five terminals and run:

```powershell
cd identity-service; npm run dev
cd post-service; npm run dev
cd media-service; npm run dev
cd search-service; npm run dev
cd api-gateway; npm run dev
```

Use `npm start` instead of `npm run dev` for a normal Node process. Note: the gateway's current `dev` script is `nodemon/index.js`; use `npm start` or correct it to `nodemon src/index.js` before relying on gateway watch mode.

Identity exposes a direct service health check:

```http
GET http://localhost:3001/health
```

Response:

```json
{ "status": 200, "message": "Healthy" }
```

## Authentication

1. Register or log in through `/v1/auth`.
2. Save the returned `accessToken` and `refreshToken`.
3. Send the access token to all protected gateway routes:

```http
Authorization: Bearer <accessToken>
```

Access tokens contain the user's MongoDB ID and username and expire after **15 minutes**. Refresh tokens are random 80-character hexadecimal values stored in MongoDB and are created with a **7-day** expiry.

The gateway strips no client headers, but sets `x-auth-id` from the verified JWT before proxying to post, media, and search services. Internal service authentication trusts that header, so do not expose the individual services directly to untrusted clients in production.

## API reference

Base URL: `http://localhost:3000`

### Identity routes

These are public and do not require an access token.

| Method | Public route | Internal route | Body | Success response |
| --- | --- | --- | --- | --- |
| POST | `/v1/auth/register` | `/api/auth/register` | `username`, `email`, `password` | `201` with access and refresh tokens |
| POST | `/v1/auth/login` | `/api/auth/login` | `email`, `password` | `201` with user ID, access and refresh tokens |
| POST | `/v1/auth/refresh-token` | `/api/auth/refresh-token` | `refreshToken` | `200` with a rotated access and refresh token |
| POST | `/v1/auth/logout` | `/api/auth/logout` | `refreshToken` | intended `200` logout response |

#### Register

```http
POST /v1/auth/register
Content-Type: application/json

{
  "username": "jane_doe",
  "email": "jane@example.com",
  "password": "a-secure-password"
}
```

Validation: username must be alphanumeric and 3–30 characters; email must be valid; password is required.

```json
{
  "success": true,
  "message": "User registered successfully",
  "accessToken": "<jwt>",
  "refreshToken": "<token>"
}
```

#### Login

```http
POST /v1/auth/login
Content-Type: application/json

{
  "email": "jane@example.com",
  "password": "a-secure-password"
}
```

```json
{
  "success": true,
  "message": "User Login successfully",
  "userId": "<mongodb-object-id>",
  "accessToken": "<jwt>",
  "refreshToken": "<token>"
}
```

#### Refresh access token

```http
POST /v1/auth/refresh-token
Content-Type: application/json

{ "refreshToken": "<current-refresh-token>" }
```

On success, the old refresh-token record is removed and a new pair is issued.

#### Logout

```http
POST /v1/auth/logout
Content-Type: application/json

{ "refreshToken": "<current-refresh-token>" }
```

### Post routes

All post routes require `Authorization: Bearer <accessToken>`.

| Method | Public route | Internal route | Input | Success |
| --- | --- | --- | --- | --- |
| POST | `/v1/post/create-post` | `/api/post/create-post` | JSON post content and optional media IDs | `201` |
| GET | `/v1/post/getAllPosts?page=1&limit=10` | `/api/post/getAllPosts` | Optional pagination query | `200` |
| GET | `/v1/post/getPost/:id` | `/api/post/getPost/:id` | Post MongoDB ID | `200` |
| DELETE | `/v1/post/deletePost/:id` | `/api/post/deletePost/:id` | Post MongoDB ID | `200` if owned by caller |

#### Create post

```http
POST /v1/post/create-post
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "content": "Hello, social media!",
  "mediaIds": ["cloudinary-public-id-1"]
}
```

`content` is required. `mediaIds` is optional and must be an array. The user ID is always taken from the JWT, not from the request body. Creating a post publishes `post.created` for search indexing.

#### List posts

```http
GET /v1/post/getAllPosts?page=1&limit=10
Authorization: Bearer <accessToken>
```

```json
{
  "posts": ["...post documents..."],
  "currentPage": 1,
  "totalPages": 3,
  "totalPosts": 24
}
```

Results are newest first. Defaults are `page=1` and `limit=10`.

#### Get one post

```http
GET /v1/post/getPost/<post-id>
Authorization: Bearer <accessToken>
```

#### Delete post

```http
DELETE /v1/post/deletePost/<post-id>
Authorization: Bearer <accessToken>
```

Deletion is ownership-protected: the post must match both the supplied ID and the authenticated user ID. A successful delete publishes `post.deleted`, which removes its search record and attempts cleanup of linked Cloudinary media.

### Media routes

All media routes require `Authorization: Bearer <accessToken>`.

| Method | Public route | Internal route | Input | Success |
| --- | --- | --- | --- | --- |
| POST | `/v1/media/upload` | `/api/media/upload` | `multipart/form-data`, field name `file` | `200` with media record and Cloudinary URL |
| GET | `/v1/media/getAll` | `/api/media/getAll` | none | `200` with media document array |

#### Upload media

```http
POST /v1/media/upload
Authorization: Bearer <accessToken>
Content-Type: multipart/form-data

file: <binary file>
```

The multipart field name must be exactly `file`. Uploads use in-memory Multer storage with a 5 MB maximum file size and Cloudinary `resource_type: auto`.

Example response:

```json
{
  "success": true,
  "message": "Successfully uploaded successfully",
  "mediaId": {
    "_id": "<media-id>",
    "publicId": "<cloudinary-public-id>",
    "originalName": "photo.jpg",
    "mimetype": "image/jpeg",
    "url": "https://res.cloudinary.com/..."
  },
  "url": "https://res.cloudinary.com/..."
}
```

The post service currently expects the Cloudinary `publicId` values—not MongoDB media document IDs—in `mediaIds` for automatic deletion to find associated assets.

### Search routes

Search requires `Authorization: Bearer <accessToken>`.

| Method | Public route | Internal route | Body | Success |
| --- | --- | --- | --- | --- |
| POST | `/v1/search/posts` | `/api/search/posts` | `query` | `200` with up to 10 matches |

```http
POST /v1/search/posts
Authorization: Bearer <accessToken>
Content-Type: application/json

{ "query": "social media" }
```

```json
{
  "success": true,
  "results": [
    {
      "postId": "<post-id>",
      "userId": "<user-id>",
      "content": "Hello, social media!",
      "createdAt": "2026-07-18T00:00:00.000Z"
    }
  ]
}
```

The search database is a denormalized read model. It stores post data received from RabbitMQ, searches the MongoDB text index on `content`, ranks by text score, and limits the response to ten records.

## Data models

| Collection / model | Fields |
| --- | --- |
| `User` | `username` (unique), `email` (unique/lowercase), Argon2-hashed `password`, timestamps |
| `RefreshToken` | `token` (unique), `user` reference, `expiresAt`, timestamps |
| `Post` | `user` reference, `content`, `mediaIds[]`, timestamps |
| `Media` | Cloudinary `publicId`, original filename, MIME type, secure URL, `userId`, timestamps |
| `search` | source `postId` (unique), `userId`, `content`, created date, timestamps |

MongoDB text indexes exist for `User.username`, `Post.content`, and `search.content`. Search has a descending `createdAt` index as well.

## Event-driven workflows

### Post created

```text
POST /v1/post/create-post
  -> Post saved in post database
  -> post.created published to RabbitMQ
  -> Search service consumes event
  -> Search document saved and becomes searchable
```

Payload:

```json
{
  "postId": "<post-id>",
  "userId": "<user-id>",
  "content": "post text",
  "createdAt": "<date>"
}
```

### Post deleted

```text
DELETE /v1/post/deletePost/:id
  -> owned post removed from post database
  -> post.deleted published to RabbitMQ
  -> Search service removes the search document
  -> Media service destroys matching Cloudinary assets and deletes media records
```

Payload:

```json
{
  "postId": "<post-id>",
  "userId": "<user-id>",
  "mediaIds": ["<cloudinary-public-id>"]
}
```

All services use the RabbitMQ topic exchange named `asaipr23`. Consumer queues are exclusive, non-durable server-named queues, so the event integration is designed for currently connected consumers rather than durable replay.

## Caching and rate limiting

- Gateway and services use Redis-backed `RateLimiterRedis` protection of 10 requests per IP per second.
- The post service caches paginated lists under `posts:<page>:<limit>` for 300 seconds.
- Individual posts are intended to be cached under `posts:<post-id>` for 3300 seconds.
- Creating or deleting a post clears the specific cache key and all `posts:*` pagination keys.
- Express rate-limit middleware is also present; its current configuration differs by service.

## Error behaviour

Common responses include:

| Status | Typical meaning |
| ---: | --- |
| `400` | Failed validation, duplicate user, missing refresh token, invalid credentials, invalid upload |
| `401` | Missing/invalid access token, missing internal authenticated header, expired/invalid refresh token |
| `404` | Requested post was not found or is not owned by the caller |
| `429` | Per-IP rate limit exceeded |
| `500` | Proxy, database, external-service, or unexpected application error |

## Known implementation notes

This README documents the current code. Before production use, address the following issues discovered during the review:

1. **Logout is currently broken.** `logoutUser` refers to `storedToken`, which is not defined, so a logout request returns a server error instead of deleting the provided refresh token.
2. **The single-post GET route has a serialization bug.** `getPost` calls `JSON.parse(PostDetailsbyId)` on a Mongoose document, which throws. Return the document directly or serialize it first.
3. **Gateway JWT middleware must return after error responses.** On a missing or invalid token it sends `401` but then continues to `jwt.verify`/`next`, which can cause duplicate-response errors or let invalid request handling continue.
4. **Refresh-token TTL index uses the wrong field name.** The schema field is `expiresAt`, but the TTL index is configured on `expireAt`; expired records will not be automatically removed by MongoDB.
5. **`GET /v1/media/getAll` returns every user's media.** Filter the query by `req.user.userId` if the endpoint should be private per account.
6. **Search and media lack CORS middleware.** They work through the gateway, but direct browser access will not be consistently configured.
7. **Rate-limit settings need review.** Several service rate limiters use `max: 16 * 60 * 1000` and `windowMs: 50`, which is an extremely high allowance over a 50 ms window and likely has the values reversed or unintended.
8. **RabbitMQ handling is not durable.** The exchange is non-durable and consumers use exclusive transient queues; a service that is offline misses events. Durable exchange/queues and retry/dead-letter handling are needed for reliable production synchronization.
9. **Sensitive request data is logged.** Generic request-body logging will log passwords, refresh tokens, and possibly raw media data. Redact secrets and remove buffer logging before deployment.
10. **The gateway development script has a path typo.** It is `nodemon/index.js`, while the actual entry file is `src/index.js`.
11. **No automated tests are configured.** Every service's test script currently exits with an error. Add unit tests for controllers and integration tests covering gateway-to-service calls and RabbitMQ workflows.

## Repository hygiene

The `.gitignore` excludes dependencies, logs, environment files, IDE metadata, generated build artifacts, and local upload files. Keep all runtime secrets in untracked `.env` files. The configured Git remote is `git@github.com:saipran23/socialMedis.git`.

## Useful curl examples

```bash
# Register
curl -X POST http://localhost:3000/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"jane_doe","email":"jane@example.com","password":"a-secure-password"}'

# Create a post
curl -X POST http://localhost:3000/v1/post/create-post \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d '{"content":"Hello, social media!","mediaIds":[]}'

# Search posts
curl -X POST http://localhost:3000/v1/search/posts \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d '{"query":"social"}'

# Upload media
curl -X POST http://localhost:3000/v1/media/upload \
  -H "Authorization: Bearer <accessToken>" \
  -F "file=@./photo.jpg"
```
