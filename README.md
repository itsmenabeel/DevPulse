# DevPulse API

An internal issue tracker REST API for software teams, built with Node.js, TypeScript, and PostgreSQL.

## Tech Stack

- **Runtime:** Node.js 24 + TypeScript (strict mode)
- **Framework:** Express 5
- **Database:** PostgreSQL via `pg` (raw SQL, no ORM)
- **Auth:** JWT (`jsonwebtoken`) + `bcrypt` password hashing
- **Hosting:** Railway + NeonDB

## Local Setup

```bash
npm install
cp .env.example .env   # fill in your values
npm run dev            # ts-node-dev with hot reload
```

## Environment Variables

| Variable | Description |
|---|---|
| `PORT` | Server port (default: 3000) |
| `NODE_ENV` | `development` or `production` |
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret key for signing JWTs |
| `JWT_EXPIRES_IN` | Token lifetime (e.g. `7d`) |

## Database

Run `schema.sql` against your PostgreSQL instance to create the `users` and `issues` tables (with `updated_at` auto-refresh triggers):

```bash
psql $DATABASE_URL -f schema.sql
```

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start dev server with hot reload |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run compiled server |

## API Reference

All endpoints return JSON in this shape:

```json
{ "success": true, "message": "...", "data": {} }
{ "success": false, "message": "...", "errors": [] }
```

Authentication uses a raw token in the `Authorization` header (no Bearer prefix):

```
Authorization: <token>
```

### Auth

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/signup` | None | Register a new user |
| POST | `/api/auth/login` | None | Login and receive a JWT |

**POST /api/auth/signup**

```json
// Request
{ "name": "Alice", "email": "alice@example.com", "password": "secret123", "role": "contributor" }

// Response 201
{ "success": true, "message": "User registered successfully", "data": { "id": 1, "name": "Alice", "email": "alice@example.com", "role": "contributor", "created_at": "...", "updated_at": "..." } }
```

`role` is optional and defaults to `contributor`. Accepted values: `contributor`, `maintainer`.

**POST /api/auth/login**

```json
// Request
{ "email": "alice@example.com", "password": "secret123" }

// Response 200
{ "success": true, "message": "Login successful", "data": { "token": "<jwt>", "user": { "id": 1, "name": "Alice", "email": "alice@example.com", "role": "contributor", "created_at": "...", "updated_at": "..." } } }
```

### Issues

All issue endpoints require a valid JWT in the `Authorization` header.

| Method | Path | Roles | Description |
|---|---|---|---|
| POST | `/api/issues` | contributor, maintainer | Create an issue |
| GET | `/api/issues` | contributor, maintainer | List all issues |
| GET | `/api/issues/:id` | contributor, maintainer | Get a single issue |
| PATCH | `/api/issues/:id` | contributor, maintainer | Update an issue |
| DELETE | `/api/issues/:id` | maintainer only | Delete an issue |

**POST /api/issues**

```json
// Request
{ "title": "Login button broken", "description": "Clicking login does nothing on Safari 17.", "type": "bug" }

// Response 201
{ "success": true, "message": "Issue created successfully", "data": { "id": 1, "title": "Login button broken", ... } }
```

`type` must be `bug` or `feature_request`. `title` max 150 chars. `description` min 20 chars.

**GET /api/issues**

Optional query params:

| Param | Values |
|---|---|
| `type` | `bug`, `feature_request` |
| `status` | `open`, `in_progress`, `resolved` |
| `sort` | `asc`, `desc` (sorts by `created_at`, default `desc`) |

```
GET /api/issues?type=bug&status=open&sort=asc
```

Each issue in the response includes a `reporter` object (id, name, role) instead of a raw `reporter_id`.

**PATCH /api/issues/:id**

Contributor rules:
- Can only update their own issues
- Can only update issues with status `open`
- Cannot change the `status` field

Maintainer rules:
- Can update any issue, any field including `status`

```json
// Request
{ "title": "Updated title", "status": "in_progress" }

// Response 200
{ "success": true, "message": "Issue updated successfully", "data": { "id": 1, ... } }
```

**DELETE /api/issues/:id** (maintainer only)

```json
// Response 200
{ "success": true, "message": "Issue deleted successfully" }
```

## Role Permissions Summary

| Action | contributor | maintainer |
|---|---|---|
| Signup / Login | Yes | Yes |
| Create issue | Yes | Yes |
| View issues | Yes | Yes |
| Update own open issue (no status) | Yes | Yes |
| Update any issue (all fields) | No | Yes |
| Delete issue | No | Yes |
