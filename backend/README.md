# Backend API Reference

## Base URL
Set the env variable `baseUrl` for Postman or use:
http://localhost:3000

## Environment variables
Copy `.env.example` → `.env` and set:
- MONGODB_URI — MongoDB connection string
- PORT — optional server port (default 3000)

## Message model (models/Message.js)
- _id: ObjectId
- username: String (required, max 100)
- text: String (required, max 1000)
- timestamp: Date (default Date.now)
- isRead: Boolean (default false)
- createdAt, updatedAt: Date (added by schema timestamps)

## Endpoints

- POST /api/messages
  - Description: Create a new message
  - Body (application/json): { "username": "string", "text": "string", "isRead": boolean? }
  - Success: 201 Created → created message object

- GET /api/messages
  - Description: List messages
  - Query params: page (default 1), limit (default 50)
  - Success: 200 OK → array of messages

- GET /api/messages/:id
  - Description: Get a single message by id
  - Success: 200 OK → message object
  - Errors: 404 if not found

- PUT /api/messages/:id
  - Description: Update a message (partial updates allowed)
  - Body: any writable fields (e.g. { "isRead": true })
  - Success: 200 OK → updated message

- DELETE /api/messages/:id
  - Description: Delete a message
  - Success: 200 OK → { "message": "Deleted" } or similar

## Sample curl requests

Create:
```bash
curl -X POST "{{baseUrl}}/api/messages" \
  -H "Content-Type: application/json" \
  -d '{"username":"Alice","text":"Hello world"}'
```

List:
```bash
curl "{{baseUrl}}/api/messages?page=1&limit=20"
```

Get, Update, Delete (replace <id>):
```bash
curl "{{baseUrl}}/api/messages/<id>"
curl -X PUT "{{baseUrl}}/api/messages/<id>" -H "Content-Type: application/json" -d '{"isRead":true}'
curl -X DELETE "{{baseUrl}}/api/messages/<id>"
```

## Postman collection / tests
- File: tests/Backend_Postman_collection.json
- Import into Postman, set an environment variable `baseUrl` (e.g. http://localhost:3000).
- The collection saves the created id in environment variable `createdId`. Run requests in order: Create → List → Get → Update → Delete.

## Run locally
1. cd backend
2. npm install
3. copy `.env.example` → `.env` and set `MONGODB_URI`
4. npm start (or node server.js)
