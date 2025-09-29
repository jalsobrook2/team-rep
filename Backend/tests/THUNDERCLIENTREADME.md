# Thunder Client Collection for VS Code

This folder contains Thunder Client test requests for the Backend Example API.

## Available Requests:

### 1. Create Job (POST)
- **URL**: `http://localhost:3000/api/jobs`
- **Method**: POST
- **Body**: 
```json
{
  "owner": "John Doherty",
  "title": "Sweeping",
  "description": "Sweep my stairs",
  "timestamp": "12-06-2024",
  "timedue": "12-07-2024",
  "location": "Suite 19 at Hartfelt Rd.",
  "offer": 3.50
}
```

### 2. Create Worker (POST)
- **URL**: `http://localhost:3000/api/workers`
- **Method**: POST
- **Body**: 
```json
{
  "name": "Johnny Sweeper",
  "skills": "Sweeping",
  "timeJoined": "12-06-2024"
}
```

### 3. Get All Jobs (GET)
- **URL**: `http://localhost:3000/api/jobs`
- **Method**: GET

### 4. Get All Workers (GET)
- **URL**: `http://localhost:3000/api/workers`
- **Method**: GET

### 5. Get Job by ID (GET)
- **URL**: `http://localhost:3000/api/jobs/job-1`
- **Method**: GET

### 5. Get Worker by ID (GET)
- **URL**: `http://localhost:3000/api/workers/worker-1`
- **Method**: GET

### 6. Update Job (PUT)
- **URL**: `http://localhost:3000/api/jobs/job-1`
- **Method**: PUT
- **Body**:
```json
{
  "owner": "John Doherty",
  "title": "Sweeping",
  "description": "Sweep my stairs AND my porch",
  "timestamp": "12-06-2024",
  "timedue": "12-07-2024",
  "location": "Suite 19 at Hartfelt Rd.",
  "offer": 4.50
}
```

### 7. Update Worker (PUT)
- **URL**: `http://localhost:3000/api/workers/worker-1`
- **Method**: PUT
- **Body**:
```json
{
  "name": "Johnny Sweeper",
  "skills": "Sweeping, Dusting",
  "timeJoined": "12-06-2024"
}
```

### 8. Delete Job (DELETE)
- **URL**: `http://localhost:3000/api/jobs/job-1`
- **Method**: DELETE

### 9. Delete Worker (DELETE)
- **URL**: `http://localhost:3000/api/workers/worker-1`
- **Method**: DELETE

### 10. Health Check (GET)
- **URL**: `http://localhost:3000/`
- **Method**: GET

## Expected Response Format:

### Success Response:
```json
{
  "success": true,
  "data": {
    // Response data here
  }
}
```

### Error Response:
```json
{
  "success": false,
  "error": "Descriptive error message"
}
```

## How to Use:

1. Install Thunder Client extension in VS Code
2. Start the server: `npm run dev`
3. Import the collection or create requests manually using the URLs above
4. Test each endpoint and verify the response format