# MongoDB Atlas Setup Guide

This guide will help you set up MongoDB Atlas and configure your application to use it.

## Step 1: Create a MongoDB Atlas Account

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Sign up for a free account or log in
3. Click "Build a Database"
4. Choose the **FREE** tier (M0 Sandbox)
5. Select your preferred cloud provider and region
6. Name your cluster (e.g., "backend-cluster")
7. Click "Create Cluster"

## Step 2: Create a Database User

1. In the left sidebar, click "Database Access"
2. Click "Add New Database User"
3. Choose "Password" authentication method
4. Enter a username (e.g., `backend-user`)
5. Generate or enter a secure password (save this!)
6. Set "Database User Privileges" to "Read and write to any database"
7. Click "Add User"

## Step 3: Configure Network Access

1. In the left sidebar, click "Network Access"
2. Click "Add IP Address"
3. For development, you can click "Allow Access from Anywhere" (0.0.0.0/0)
   - **Note**: For production, restrict to specific IPs
4. Click "Confirm"

## Step 4: Get Your Connection String

1. Go back to "Database" in the left sidebar
2. Click "Connect" on your cluster
3. Select "Connect your application"
4. Choose "Node.js" as the driver and select the latest version
5. Copy the connection string (it looks like):
   ```
   mongodb+srv://<username>:<password>@<cluster>.mongodb.net/?retryWrites=true&w=majority
   ```

## Step 5: Configure Your Application

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and update the `MONGODB_URI`:
   ```env
   MONGODB_URI=mongodb+srv://backend-user:YOUR_PASSWORD@backend-cluster.xxxxx.mongodb.net/backend-example?retryWrites=true&w=majority
   ```

   **Important replacements**:
   - Replace `<username>` with your database username
   - Replace `<password>` with your database user password
   - Replace `<cluster>` with your cluster name
   - Add `/backend-example` before the `?` to specify the database name

3. Update JWT secrets with strong random values:
   ```env
   JWT_ACCESS_SECRET=your-secure-random-string-here
   JWT_REFRESH_SECRET=your-different-secure-random-string-here
   ```

## Step 6: Test the Connection

### Option A: Run with Docker (local MongoDB)
```bash
docker compose up -d
```

### Option B: Run locally with MongoDB Atlas
```bash
npm install
npm start
```

You should see:
```
Connected to MongoDB successfully (mongodb+srv://...)
Database indexes created successfully
Server is running on port 3000
```

## Step 7: Verify Data Persistence

Test user registration:
```bash
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "password123",
    "skills": "Testing"
  }'
```

Check MongoDB Atlas:
1. Go to your cluster in Atlas
2. Click "Browse Collections"
3. You should see the `backend-example` database with a `workers` collection
4. Your test user should be listed with a hashed password

## Security Best Practices

1. **Never commit `.env` to version control** - it's already in `.gitignore`
2. **Use strong, unique passwords** for your database users
3. **Rotate your JWT secrets regularly** in production
4. **Restrict network access** to specific IPs in production
5. **Use environment-specific credentials** for dev/staging/production

## Troubleshooting

### Connection timeout
- Check your IP is whitelisted in Network Access
- Verify your cluster is running (not paused)

### Authentication failed
- Double-check username and password
- Ensure password is URL-encoded if it contains special characters

### Database not created
- The database is created automatically when you insert the first document
- Make sure you've added `/backend-example` to your connection string

## Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `PORT` | Server port | `3000` |
| `NODE_ENV` | Environment mode | `development`, `production`, `test` |
| `MONGODB_URI` | MongoDB connection string | See Step 5 |
| `JWT_ACCESS_SECRET` | Secret for access tokens | Random string (32+ chars) |
| `JWT_REFRESH_SECRET` | Secret for refresh tokens | Random string (32+ chars) |
| `CLIENT_URL` | Frontend URL for CORS | `http://localhost:3000` |
| `DOCKER` | Running in Docker? | `true` or `false` |
