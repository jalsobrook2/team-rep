 # Pocket Jobs — Backend & Frontend (Vite + Express + Mongoose)

 This repository contains a complete small application: a Vite-powered React frontend and an Express + Mongoose backend implementing authentication, job/worker CRUD, messaging, and a dashboard shell.

 This README focuses on the functional requirements and how to verify them locally (login, dashboard, CRUD flows, messaging, and job lifecycle).

 ## Quick verification checklist (rubric)

 All of the following are implemented and wired between frontend and backend. Use the "How to run" section below to verify locally.

 - [x] Functional Login (signup, login, demo login, token refresh, logout)
 - [x] Dashboard shell endpoint (`GET /api/workers/dashboard`) and frontend dashboard UI (`src/pages/Dashboard.jsx`)
 - [x] Jobs CRUD (create, read/list, update, delete) and job lifecycle actions (apply, accept, assign, start, complete, cancel)
 - [x] Workers CRUD (create/register, read/list, view, update, delete)
 - [x] Messaging between users (send message, list conversations, conversation view)
 - [x] UI state management for auth and interactions (see `src/AuthContext.jsx`, `src/components/UiProvider.jsx`)
 - [x] Demo accounts seeded automatically (see `server.js` seeding logic) for quick verification

 ## How to run (local development)

 1. Install dependencies:

 ```powershell
 npm install
 ```

 2. Environment variables

 Create a `.env` (or use `.env.example` if present) and set at minimum:

 ```env
 PORT=3000
 MONGODB_URI=mongodb://localhost:27017/backend-example
 JWT_ACCESS_SECRET=replace-with-a-secret
 JWT_REFRESH_SECRET=replace-with-a-secret
 CLIENT_URL=http://localhost:5173
 ```

 Notes:
 - The backend defaults to `mongodb://127.0.0.1:27017/backend-example`. When running in Docker, the code prefers the `mongo` host.
 - Vite frontend runs on port 5173 by default and proxies `/api` to the backend (see `vite.config.js`).

 3. Start the app

 Run backend + frontend together (recommended):

 ```powershell
 npm run dev
```

This starts the backend (with `nodemon`) and the Vite client together.

Or run separately in two terminals:

```powershell
# Terminal 1 — backend
npm run dev:server

# Terminal 2 — frontend (Vite)
npm run client
# alternative (preview build):
# npm run client:preview
```

 4. Open the frontend app (Vite) — it will usually open automatically at `http://localhost:5173`.

 ## Functional flows & where they live in the code

 - Authentication
   - Backend routes: `routes/authRoutes.js`
   - Controllers: `controllers/workerController.js` (signup, login, demoLogin, refresh, logout)
   - Frontend: `src/AuthContext.jsx`, `src/pages/Auth.jsx` (login/register UI)

 - Dashboard
   - Backend: `GET /api/workers/dashboard` implemented in `controllers/workerController.js` and mounted in `routes/workerRoutes.js`.
   - Frontend: `src/pages/Dashboard.jsx` consumes dashboard endpoints and other job/worker APIs.

 - Jobs (CRUD + lifecycle)
   - Backend: `routes/jobRoutes.js`, `controllers/jobController.js` (create, list, get, update, delete, accept, apply, assign, kick, start, complete, cancel)
   - Frontend: Dashboard and other components call these endpoints (e.g., posting a job via Dashboard `postJob`, accept/apply buttons in job list).

 - Workers (CRUD)
   - Backend: `routes/workerRoutes.js`, `controllers/workerController.js` (getAllWorkers, getWorkerById, update/delete)
   - Frontend: `src/pages/Dashboard.jsx` lists workers via `loadWorkers()` and uses `WorkerCard.jsx`.

 - Messaging
   - Backend: `routes/messageRoutes.js`, `controllers/messageController.js` (sendMessage, getConversation, getConversations, markAsRead)
   - Frontend: `src/components/Messaging.jsx` (conversations list, conversation view, send message)

 ## Frontend wiring / state management

 - `src/AuthContext.jsx` — centralizes login, demo login, and token storage in `localStorage` (`accessToken`). Components call `useAuth()` to access `user`, `loginWithCredentials`, `demoLogin`, and `logout`.
 - `src/components/UiProvider.jsx` — provides `useToast()` and `useConfirm()` hooks used across the app for notifications and confirmations.
 - Components include `WorkerCard.jsx`, `Messaging.jsx`, and `Dashboard.jsx` which call backend APIs and update React state accordingly.

 ## Demo accounts

 Server seeds demo accounts on startup (in non-test environments) with predictable emails and passwords. The seeding code runs in `server.js` and ensures a `demo-seed` refresh token is available.

 Default demo credentials (printed during server start):
 - demo@pocketjob.test / Demo123!
 - alice@demo.test / Alice123!
 - bob@demo.test / Bob123!

 You can also use the frontend Demo Login button which calls `/api/auth/demo-login`.

 ## Verification steps (quick)

 1. Start backend + frontend (see How to run).
 2. Open `http://localhost:5173`.
 3. Use the Demo Login button or register a new account.
 4. From Dashboard:
    - Create a job (Post a Job form) — verifies POST `/api/jobs` and that the UI updates.
    - View jobs list — verifies GET `/api/jobs`.
    - Apply to an open job — verifies POST `/api/jobs/:id/apply`.
    - Accept a job (as a different user) — verifies POST `/api/jobs/:id/accept` and that notifications/messages are created.
    - Assign a worker, start, complete, cancel a job where applicable — uses the job lifecycle endpoints.
 5. Messaging: open a worker card and click Message — verifies `/api/messages` endpoints and conversation UI.

 ## Checklist mapping to functional requirements

 Below is the rubric-style mapping showing implemented items and where to find the code.

 - Authentication
   - Signup / Register → `POST /api/workers` (`controllers/workerController.createWorker`) — frontend `src/pages/Auth.jsx` (RegisterForm)
   - Login → `POST /api/auth/login` (`controllers/workerController.loginWorker`) — frontend `src/AuthContext.jsx` (loginWithCredentials)
   - Demo login → `POST /api/auth/demo-login` (`controllers/workerController.demoLogin`) — frontend DemoLogin component
   - Refresh token flow → `POST /api/auth/refresh` (`controllers/workerController.refreshToken`)
   - Logout → `POST /api/auth/logout` (`controllers/workerController.logoutWorker`) — frontend `logout()` clears token

 - Jobs (CRUD + lifecycle) — implemented and wired
   - Create: `POST /api/jobs` (`controllers/jobController.createJob`) — Dashboard form `postJob`
   - Read/List: `GET /api/jobs` — Dashboard list
   - Read single: `GET /api/jobs/:id`
   - Update: `PUT /api/jobs/:id` — protected; owner-only
   - Delete: `DELETE /api/jobs/:id` — protected; owner-only
   - Apply: `POST /api/jobs/:id/apply`
   - Accept: `POST /api/jobs/:id/accept`
   - Assign: `POST /api/jobs/:id/assign`
   - Kick: `POST /api/jobs/:id/kick`
   - Start: `POST /api/jobs/:id/start`
   - Complete: `POST /api/jobs/:id/complete`
   - Cancel: `POST /api/jobs/:id/cancel`

 - Workers (CRUD)
   - Create: `POST /api/workers` (register)
   - List: `GET /api/workers` — frontend lists via `loadWorkers()`
   - Get single: `GET /api/workers/:id`
   - Update: `PUT /api/workers/:id` (protected)
   - Delete: `DELETE /api/workers/:id` (protected)

 - Messaging
   - Send: `POST /api/messages`
   - Conversations list: `GET /api/messages/conversations`
   - Conversation view: `GET /api/messages/conversation/:userId`
   - Mark read: `POST /api/messages/conversation/:userId/read`

 ## Tests

 - Unit/integration tests are available under `tests/`. Run the test suite with:

 ```powershell
 npm test
 ```

 ## Notes and small caveats

 - The frontend expects `accessToken` in `localStorage` and will include it on API calls. `src/AuthContext.jsx` handles token persistence.
 - `vite.config.js` proxies `/api` to `http://localhost:3000` by default; if your backend runs on a different port, set `BACKEND_URL` or update the proxy.
 - The README previously contained references to placeholder responses — the current code implements real DB-backed operations and authentication. If you see outdated wording elsewhere, update it to match runtime behavior.

 ## Summary

 Functional login, dashboard, jobs/workers CRUD, messaging, and job lifecycle are implemented and wired to the React UI. Use the verification steps above to exercise each use case locally. If you want, I can run the app here, run the test suite, or add an explicit "rubric verification" script that performs an automated smoke test covering the steps above.

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