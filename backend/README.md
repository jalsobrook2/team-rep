# Backend API Reference

This backend exposes a User model (workers and agents) on the /api/messages route.

## Base URL
Set the env variable `baseUrl` for Postman or use:
http://localhost:3000

## Environment variables
Copy `.env.example` → `.env` and set:
- MONGODB_URI — MongoDB connection string
- PORT — optional server port (default 3000)

## Model: User (models/Message.js)
Fields:
- _id: ObjectId
- role: "worker" | "agent" (required)
- username: String (required, max 100)
- legalName: String (required, max 200)
- email: String (required, unique)
- description: String (optional)
- appliedJobs: [ObjectId] (worker-only, ref: Job)
- openJobs: [ObjectId] (agent-only, ref: Job)
- createdAt, updatedAt: Date (timestamps)

Notes:
- Role-specific arrays should be used according to role (workers → appliedJobs, agents → openJobs).
- Controllers validate role and prevent cross-role arrays.

## Endpoints

- POST /api/messages
  - Description: Create a new user (worker or agent)
  - Body (application/json): 
    - required: { "role": "worker"|"agent", "username": "...", "legalName": "...", "email": "..." }
    - optional: description, appliedJobs (worker), openJobs (agent)
  - Success: 201 Created → created user object

- GET /api/messages
  - Description: List users
  - Query params: page (default 1), limit (default 50)
  - Success: 200 OK → array of users

- GET /api/messages/:id
  - Description: Get a single user by id (appliedJobs/openJobs are populated)
  - Success: 200 OK → user object
  - Errors: 404 if not found

- PUT /api/messages/:id
  - Description: Update a user (partial updates allowed). Role changes are validated and role-specific arrays are enforced.
  - Body: any writable fields (e.g. { "description": "...", "appliedJobs": [...] })
  - Success: 200 OK → updated user

- DELETE /api/messages/:id
  - Description: Delete a user
  - Success: 200 OK → { "message": "Deleted" }

- GET /api/health
  - Description: Health check
  - Success: 200 OK → { "status": "ok" }

## Examples

Create worker (curl):
```bash
curl -X POST "{{baseUrl}}/api/messages" \
  -H "Content-Type: application/json" \
  -d '{"role":"worker","username":"alice","legalName":"Alice Example","email":"alice@example.com","description":"Worker","appliedJobs":["608d..."]}'
```

Create agent (curl):
```bash
curl -X POST "{{baseUrl}}/api/messages" \
  -H "Content-Type: application/json" \
  -d '{"role":"agent","username":"agent1","legalName":"Agent One","email":"agent1@example.com","description":"Agent","openJobs":["608d..."]}'
```

List:
```bash
curl "{{baseUrl}}/api/messages?page=1&limit=20"
```

Get / Update / Delete (replace <id>):
```bash
curl "{{baseUrl}}/api/messages/<id>"
curl -X PUT "{{baseUrl}}/api/messages/<id>" -H "Content-Type: application/json" -d '{"description":"Updated"}'
curl -X DELETE "{{baseUrl}}/api/messages/<id>"
```

## Tests / Postman collection
- File: tests/Backend_Postman_collection.json
- Import into Postman, set an environment variable `baseUrl` (e.g. http://localhost:3000).
- The collection sets an environment variable `createdId` after Create; run requests in order:
  Create → List → Get → Update → Delete.

## Run locally
1. cd backend
2. npm install
3. copy `.env.example` → `.env` and set `MONGODB_URI`
4. npm start (or node server.js)

