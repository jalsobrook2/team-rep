
# Backend Example - Express.js & Mongoose

A RESTful API backend built with Express.js and Mongoose for managing jobs, workers, and message requests, including a dashboard shell for users.


## Features

- ✅ Complete CRUD operations for jobs, workers, and message requests
- ✅ Dashboard shell endpoint for users to view jobs posted, jobs accepted, jobs by others, and message requests
- ✅ Standardized JSON response format
- ✅ MongoDB integration with Mongoose
- ✅ Error handling middleware
- ✅ Environment configuration
- ✅ Postman/Thunder Client collection for testing
- ✅ Controller-based architecture


## Project Structure

```
Backend Example/
├── controllers/
│   ├── jobController.js        # Business logic for job operations
│   ├── workerController.js     # Business logic for worker operations & dashboard shell
├── models/
│   ├── Job.js                 # Mongoose schema for jobs
│   ├── Worker.js              # Mongoose schema for workers
│   └── MessageRequest.js      # Mongoose schema for message requests
├── routes/
│   ├── jobRoutes.js           # API route definition for jobs
│   ├── workerRoutes.js        # API route definition for workers & dashboard
├── tests/
│   ├── Backend_Example_API.postman_collection.json # NOT USED
│   └── THUNDERCLIENTREADME.md # Testing instructions for ThunderClient
├── .env                       # Environment variables
├── package.json               # Dependencies and scripts
└── server.js                  # Main server file
```

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Up Environment

**Option A: Local MongoDB with Docker (Recommended for Development)**
```bash
# Copy example environment file
cp .env.example .env

# Start MongoDB and the application
docker compose up -d
```

**Option B: MongoDB Atlas (Cloud Database)**

1. Follow the setup guide in [MONGODB_ATLAS_SETUP.md](./MONGODB_ATLAS_SETUP.md)
2. Copy and configure your `.env` file:
   ```bash
   cp .env.example .env
   ```
3. Update `MONGODB_URI` in `.env` with your Atlas connection string:
   ```env
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/backend-example?retryWrites=true&w=majority
   ```
4. Update JWT secrets with strong random values

### 3. Verify MongoDB Connection

Test your MongoDB connection and data persistence:
```bash
node test-mongodb-persistence.js
```

You should see:
```
✓ Successfully connected to MongoDB
✓ User created with email: test-xxx@example.com
✓ Password is properly hashed
✓ Password comparison works correctly
✓ User successfully retrieved from database
All tests passed! ✓
```

### 4. Start the Server
```bash
# Development mode with auto-restart
npm run dev

# Production mode
npm start
```

The server will start on `http://localhost:3000`

## Authentication Flow

This project uses JWT-based authentication with short-lived access tokens and long-lived refresh tokens.

High-level steps:
1. Signup or login to receive an `accessToken` and a `refreshToken` in the response body.
2. Include the access token in the `Authorization: Bearer <accessToken>` header for protected endpoints.
3. When the access token expires, call the refresh endpoint with your `refreshToken` to get a new access token.
4. Logout revokes the refresh token server-side and clears the client-side token storage.

Sequence diagram (Mermaid):
```mermaid
sequenceDiagram
  participant C as Client
  participant API as API Server
  participant DB as MongoDB

  C->>API: POST /api/auth/signup (name, email, password, skills)
  API->>DB: Create Worker, store hashed password
  API-->>C: 201 { worker, accessToken, refreshToken }

  C->>API: GET /api/workers (Authorization: Bearer accessToken)
  API->>DB: Validate and fetch data
  API-->>C: 200 { ...data }

  C->>API: POST /api/auth/refresh ({ refreshToken } or cookie)
  API->>DB: Validate refresh token exists for worker
  API-->>C: 200 { accessToken }

  C->>API: POST /api/auth/logout (Authorization: Bearer accessToken, { refreshToken })
  API->>DB: Remove refresh token from worker
  API-->>C: 200 { message }
```

Headers and payloads:
- Authorization header for protected routes: `Authorization: Bearer <accessToken>`
- Refresh endpoint accepts the refresh token in the request body `{ refreshToken }` or from a `refreshToken` cookie.

Environment variables (optional but recommended):
```
JWT_ACCESS_SECRET=your-access-secret
JWT_REFRESH_SECRET=your-refresh-secret
```

### Auth cURL Examples

Signup
```bash
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Jane Doe",
    "email": "jane@example.com",
    "password": "password123",
    "skills": "Node.js, MongoDB"
  }'
```

Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "jane@example.com",
    "password": "password123"
  }'
```

Use access token (example protected route)
```bash
curl http://localhost:3000/api/workers \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

Refresh access token
```bash
curl -X POST http://localhost:3000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{ "refreshToken": "<REFRESH_TOKEN>" }'
```

Logout (revokes refresh token)
```bash
curl -X POST http://localhost:3000/api/auth/logout \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{ "refreshToken": "<REFRESH_TOKEN>" }'
```

## API Endpoints

All responses follow the standardized format:

**Success Response:**
```json
{
  "success": true,
  "data": { ... }
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Descriptive error message"
}
```


### Dashboard Endpoint

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET    | `/api/workers/dashboard` | Get dashboard shell for logged-in user |

**Dashboard Response Structure:**
```json
{
  "success": true,
  "data": {
    "dashboard": {
      "jobsPosted": [ ... ],
      "jobsOthersPosted": [ ... ],
      "jobsAccepted": [ ... ],
      "messageRequests": [ ... ]
    }
  }
}
```

### Job Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST   | `/api/jobs` | Create a new job |
| GET    | `/api/jobs` | Get all jobs |
| GET    | `/api/jobs/:id` | Get a specific job by ID |
| PUT    | `/api/jobs/:id` | Update a job by ID |
| DELETE | `/api/jobs/:id` | Delete a job by ID |

### Worker Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST   | `/api/workers` | Create a new worker |
| GET    | `/api/workers` | Get all workers |
| GET    | `/api/workers/:id` | Get a specific worker by ID |
| PUT    | `/api/workers/:id` | Update a worker by ID |
| DELETE | `/api/workers/:id` | Delete a worker by ID |

### Message Request Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST   | `/api/message-requests` | Create a new message request |
| GET    | `/api/message-requests` | Get all message requests |
| GET    | `/api/message-requests/:id` | Get a specific message request by ID |
| PUT    | `/api/message-requests/:id` | Update a message request by ID |
| DELETE | `/api/message-requests/:id` | Delete a message request by ID |

### Job Schema

```json
{
  "owner": "Worker ObjectId (required)",
  "assignedTo": "Worker ObjectId (optional)",
  "status": "open | assigned | in-progress | completed | cancelled",
  "title": "string (required, max 100 chars)",
  "description": "string (required, max 1000 chars)",
  "location": "string (required, max 200 chars)",
  "offer": "number (required)",
  "timeDue": "Date (required)",
  "createdAt": "Date (auto-generated)"
}
```

### Message Request Schema

```json
{
  "sender": "Worker ObjectId (required)",
  "receiver": "Worker ObjectId (required)",
  "message": "string (required, max 1000 chars)",
  "status": "pending | accepted | declined",
  "createdAt": "Date (auto-generated)"
}
```

## Testing

### Option 1: Postman
1. Import the collection: `tests/Backend_Example_API.postman_collection.json`
2. Test each endpoint with the provided sample data

### Option 2: Thunder Client (VS Code)
1. Install Thunder Client extension
2. Follow the instructions in `tests/README.md`

### Option 3: cURL Examples


**Get dashboard shell:**
```bash
curl http://localhost:3000/api/workers/dashboard
```

**Create a job:**
```bash
curl -X POST http://localhost:3000/api/jobs \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Sample Job",
    "description": "Job description here",
    "location": "Remote",
    "offer": 100,
    "timeDue": "2025-12-31T23:59:59Z"
  }'
```

**Get all jobs:**
```bash
curl http://localhost:3000/api/jobs
```

**Get job by ID:**
```bash
curl http://localhost:3000/api/jobs/job-001
```

**Create a message request:**
```bash
curl -X POST http://localhost:3000/api/message-requests \
  -H "Content-Type: application/json" \
  -d '{
    "sender": "workerObjectId",
    "receiver": "workerObjectId",
    "message": "Hello, I would like to connect!"
  }'
```


## Current Status

**Phase 1: ✅ Complete**
- [x] Routes & Endpoints (CRUD for jobs, workers, message requests)
- [x] Dashboard shell endpoint for users
- [x] Controller placeholders with standardized responses
- [x] Shared response format implementation
- [x] Testing setup (Postman & Thunder Client collections)

**Phase 2: 🔄 Ready for Implementation**
- [ ] Replace placeholder responses with actual database operations
- [ ] Add data validation
- [ ] Implement error handling for edge cases
- [ ] Add authentication (optional)

## Next Steps

The current implementation uses placeholder responses. To connect to the database:

1. Uncomment the database logic in `controllers/messageController.js`
2. Replace placeholder responses with actual Mongoose operations
3. Test with real data

## Environment Variables

```bash
PORT=3000
MONGODB_URI=mongodb://localhost:27017/backend-example
```

For production, replace `MONGODB_URI` with your actual MongoDB connection string.

## Dependencies

- **express**: Web framework
- **mongoose**: MongoDB object modeling
- **cors**: Cross-origin resource sharing
- **dotenv**: Environment variable management
- **nodemon**: Development auto-restart (dev dependency)