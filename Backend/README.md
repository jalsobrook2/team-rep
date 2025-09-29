# Backend Example - Express.js & Mongoose

A RESTful API backend built with Express.js and Mongoose for managing jobs/workers with full CRUD operations.

## Features

- ✅ Complete CRUD operations for jobs/workers
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
│   └── jobController.js    # Business logic for job operations
|   --- workerController.js # Business logic for worker operations
├── models/
│   └── Job.js             # Mongoose schema for jobs
|   --- Worker.js          # Mongoose schema for workers 
├── routes/
│   └── jobRoutes.js       # API route definition for jobs
|   --- workerRoutes.js    # def. for workers
├── tests/ 
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
Make sure MongoDB is running locally, or update the `.env` file with your MongoDB connection string.

### 3. Start the Server
```bash
# Development mode with auto-restart
npm run dev

# Production mode
npm start
```

The server will start on `http://localhost:3000`

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

### Job/Worker Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/jobs` | Create a new job |
| GET | `/api/jobs` | Get all jobs |
| GET | `/api/jobs/:id` | Get a specific job by ID |
| PUT | `/api/jobs/:id` | Update a job by ID |
| DELETE | `/api/jobs/:id` | Delete a job by ID |

| POST | `/api/workers` | Create a new worker |
| GET | `/api/workers` | Get all workers |
| GET | `/api/workers/:id` | Get a specific worker by ID |
| PUT | `/api/workers/:id` | Update a worker by ID |
| DELETE | `/api/workers/:id` | Delete a worker by ID |

### Job Schema

```json
{
  "owner": "string (required max 50 chars)",
  "title": "string (required max 100 chars)",
  "description": "string (required max 1000 chars)",
  "timestamp": "date format required",
  "timedue": "date format required",
  "location": "string (required max 1000 chars)",
  "offer": "number (required, two decimal places)"
}
```

### Worker Schema

```json
{
  "name": "string (required, max 50 chars)",
  "skills": "string (required, max 1000 chars)",
  "timeJoined": "Date (auto-generated)"
}
```

## Testing

### Thunder Client (VS Code)
1. Install Thunder Client extension
2. Follow the instructions in `tests/THUNDERCLIENTREADME.md`

### Option 3: cURL Examples

**Create a job/worker:**
```bash
curl -X POST http://localhost:3000/api/jobs \
  -H "Content-Type: application/json" \
  -d '{
    "owner": "John Doe",
    "title": "Clean window",
    "description": "Window is dirty from tomato soup, please clean",
    "timestamp": "12-05-2025",
    "timedue": "12-12-2025",
    "location": "400 Super Circle",
    "offer": "$400"
  }'

curl -X POST http://localhost:3000/api/workers \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "skils": "Window cleaning skills",
    "timeJoined": "12-09-2024"
  }'
```

**Get all jobs/workers:**
```bash
curl http://localhost:3000/api/jobs
curl http://localhost:3000/api/workers
```

**Get job/worker by ID:**
```bash
curl http://localhost:3000/api/jobs/job-1
curl http://localhost:3000/api/workers/workers-1
```

**Update a job/worker:**
```bash
curl -X PUT http://localhost:3000/api/jobs/jobs-1 \
  -H "Content-Type: application/json" \
  -d '{
    "owner": "John Doe",
    "title": "Clean window",
    "description": "Window is dirty from failure to complete last job, please clean better",
    "timestamp": "12-05-2025",
    "timedue": "12-12-2025",
    "location": "400 Super Circle",
    "offer": "$400"
  }'
curl -X PUT http://localhost:3000/api/workers/workers-1 \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Peter Gainskills",
    "skils": "Window cleaning, mowing",
    "timeJoined": "12-09-2024"
  }'
```

**Delete a job/worker:**
```bash
curl -X DELETE http://localhost:3000/api/jobs/jobs-1
curl -X DELETE http://localhost:3000/api/workers/workers-1
```

## Current Status

**Phase 1: ✅ Complete**
- [x] Routes & Endpoints (all 5 CRUD operations)
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

1. Uncomment the database logic in `controllers/jobController.js`, `controllers/workerController.js`
2. Replace placeholder responses with actual Mongoose operations
3. Test with real data

## Environment Variables

```bash
PORT=3000
MONGODB_URI=mongodb+srv://jalsobrook2_admin:<dbpassword>@gigcluster.rbkapkk.mongodb.net/?retryWrites=true&w=majority&appName=GigCluster
```

For production, replace `MONGODB_URI` with your actual MongoDB connection string.

## Dependencies

- **express**: Web framework
- **mongoose**: MongoDB object modeling
- **cors**: Cross-origin resource sharing
- **dotenv**: Environment variable management
- **nodemon**: Development auto-restart (dev dependency)