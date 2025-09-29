# API Test Collection (Postman)

This README describes the test requests for the Team-Rep backend. The API currently exposes a User model (workers and agents) on the /api/messages route.

## Base URL
Set an environment variable `baseUrl` in Postman or Thunder Client (example):
http://localhost:3000

## Model: User
Fields:
- role: "worker" or "agent" (required)
- username: string (required)
- legalName: string (required)
- email: string (required)
- description: string (optional)
- appliedJobs: array of Job IDs (worker only)
- openJobs: array of Job IDs (agent only)
- timestamps: createdAt, updatedAt

## Endpoints / Requests in collection

1. Create Worker (POST)
- URL: {{baseUrl}}/api/messages
- Body (application/json):
```json
{
  "role": "worker",
  "username": "worker1",
  "legalName": "Worker One",
  "email": "worker1@example.com",
  "description": "Experienced worker",
  "appliedJobs": ["608d..."]
}
```
- Expected: 201 Created → created user object with _id

2. Create Agent (POST)
- URL: {{baseUrl}}/api/messages
- Body (application/json):
```json
{
  "role": "agent",
  "username": "agent1",
  "legalName": "Agent One",
  "email": "agent1@example.com",
  "description": "Recruiting agent",
  "openJobs": ["608d..."]
}
```

3. List Users (GET)
- URL: {{baseUrl}}/api/messages
- Query params: page (default 1), limit (default 50)
- Expected: 200 OK → array of users

4. Get User by ID (GET)
- URL: {{baseUrl}}/api/messages/{{createdId}}
- Expected: 200 OK → single user object (appliedJobs / openJobs populated)

5. Update User (PUT)
- URL: {{baseUrl}}/api/messages/{{createdId}}
- Body example (partial):
```json
{
  "description": "Updated description",
  "appliedJobs": ["608d..."] 
}
```

6. Delete User (DELETE)
- URL: {{baseUrl}}/api/messages/{{createdId}}

7. Health Check (GET)
- URL: {{baseUrl}}/api/health
- Expected: 200 OK → { "status": "ok" }

## Test collection
- File: tests/Backend_Postman_collection.json
- Import into Postman / Thunder Client.
- Set environment variable `baseUrl`.
- The collection sets an environment variable `createdId` after Create; run requests in order:
  Create → List → Get → Update → Delete.

## Sample curl (create worker)
```bash
curl -X POST "{{baseUrl}}/api/messages" \
  -H "Content-Type: application/json" \
  -d '{"role":"worker","username":"alice","legalName":"Alice Example","email":"alice@example.com","description":"Worker"}'
```

## Run server locally
1. cd backend
2. npm install
3. Copy `.env.example` → `.env` and set `MONGODB_URI`
4. npm start (or node server.js)

Notes:
- The route path remains /api/messages for compatibility with existing tests/controllers.
- Ensure MongoDB is accessible and any referenced Job IDs exist if you use population in tests.