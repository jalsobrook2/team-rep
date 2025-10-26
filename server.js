const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true // Allow credentials (cookies)
}));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MongoDB connection configuration
// Priority: MONGODB_URI env var > Docker/local fallback
const isDockerEnv = process.env.DOCKER === 'true' || process.env.CONTAINER === 'true' || process.env.MONGO_HOST === 'mongo';
const defaultMongoHost = isDockerEnv ? 'mongo' : '127.0.0.1';
const MONGODB_URI = process.env.MONGODB_URI || `mongodb://${defaultMongoHost}:27017/backend-example`;

// MongoDB connection options for better reliability and performance
// Compatible with both local MongoDB and MongoDB Atlas
const mongooseOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  autoIndex: true, // Build indexes
  maxPoolSize: 10, // Maintain up to 10 socket connections
  serverSelectionTimeoutMS: 10000, // Increased for Atlas cloud connections
  socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
  family: 4 // Use IPv4, skip trying IPv6
};

// Log connection attempt (hide password in URI for security)
const maskedUri = MONGODB_URI.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@');
console.log(`Attempting to connect to MongoDB: ${maskedUri}`);

// Connect to MongoDB only if not in test environment
if (process.env.NODE_ENV !== 'test') {
  mongoose.connect(MONGODB_URI, mongooseOptions)
    .then(() => {
      console.log(`Connected to MongoDB successfully (${MONGODB_URI})`);
      
      // Create indexes for better query performance
      Promise.all([
        require('./models/Worker').collection.createIndex({ email: 1 }, { unique: true }),
        require('./models/Worker').collection.createIndex({ refreshTokens: 1 }),
        require('./models/Job').collection.createIndex({ owner: 1 }),
        require('./models/Job').collection.createIndex({ assignedTo: 1 }),
        require('./models/Job').collection.createIndex({ status: 1 }),
        require('./models/Job').collection.createIndex({ createdAt: -1 })
      ]).then(() => {
        console.log('Database indexes created successfully');
      }).catch(err => {
        console.warn('Error creating database indexes:', err);
      });
    })
    .catch((error) => {
      console.error('MongoDB connection error:', error);
      process.exit(1); // Exit if cannot connect to database
    });

  // Handle MongoDB connection errors
  mongoose.connection.on('error', (err) => {
    console.error('MongoDB connection error:', err);
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('MongoDB disconnected. Attempting to reconnect...');
  });

  mongoose.connection.on('reconnected', () => {
    console.log('MongoDB reconnected successfully');
  });
}

// Routes
const jobRoutes = require('./routes/jobRoutes');
const workerRoutes = require('./routes/workerRoutes');
const authRoutes = require('./routes/authRoutes');
const messageRoutes = require('./routes/messageRoutes');

// Mount auth routes first (before protected routes)
app.use('/api/auth', authRoutes);
app.use('/api', jobRoutes);
app.use('/api', workerRoutes);
app.use('/api', messageRoutes);

// Default route
app.get('/', (req, res) => {
  res.json({
    success: true,
    data: {
      job: 'Backend Example API is running!',
      jobEndpoints: [
        'POST /api/jobs - Create a new job',
        'GET /api/jobs - Get all jobs',
        'GET /api/jobs/:id - Get a specific job by ID',
        'PUT /api/jobs/:id - Update a job by ID',
        'DELETE /api/jobs/:id - Delete a job by ID'
      ],
      worker: 'Example API for workers',
      workerEndpoints: [
        'POST /api/workers - Create a new worker',
        'GET /api/workers - Get all workers',
        'GET /api/workers/:id - Get a specific worker by ID',
        'PUT /api/workers/:id - Update a worker by ID',
        'DELETE /api/workers/:id - Delete a worker by ID'
      ]
    }
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found'
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error(error.stack);
  res.status(500).json({
    success: false,
    error: 'Something went wrong!'
  });
});

// Only start server if not in test environment
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Visit http://localhost:${PORT} to see available endpoints`);
  });
}

// Export app for testing
module.exports = app;

module.exports = app;