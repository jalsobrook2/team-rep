const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');
require('dotenv').config();

// Add error handling for uncaught exceptions and rejections
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
  console.error('Error name:', err.name);
  console.error('Error message:', err.message);
  console.error('Stack trace:', err.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('UNHANDLED REJECTION! 💥 Shutting down...');
  console.error('Promise:', promise);
  console.error('Reason:', reason && reason.stack ? reason.stack : reason);
  process.exit(1);
});

const app = express();
const HOST = process.env.HOST || '0.0.0.0';
const PORT = Number(process.env.PORT) || 3000;

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
const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URL || `mongodb://${defaultMongoHost}:27017/backend-example`;

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

async function ensureDatabaseIndexes() {
  const Worker = require('./models/Worker');
  const Job = require('./models/Job');
  const Gig = require('./models/Gig');
  const Order = require('./models/Order');

  await Promise.all([
    Worker.collection.createIndex({ email: 1 }, { unique: true }),
    Worker.collection.createIndex({ refreshTokens: 1 }),
    Job.collection.createIndex({ owner: 1 }),
    Job.collection.createIndex({ assignedTo: 1 }),
    Job.collection.createIndex({ status: 1 }),
    Job.collection.createIndex({ createdAt: -1 }),
    Gig.collection.createIndex({ user_id: 1 }),
    Gig.collection.createIndex({ category: 1 }),
    Gig.collection.createIndex({ status: 1 }),
    Gig.collection.createIndex({ price: 1 }),
    Gig.collection.createIndex({ createdAt: -1 }),
    Gig.collection.createIndex({ rating: -1 }),
    Order.collection.createIndex({ gig_id: 1 }),
    Order.collection.createIndex({ buyer_id: 1 }),
    Order.collection.createIndex({ seller_id: 1 }),
    Order.collection.createIndex({ status: 1 }),
    Order.collection.createIndex({ createdAt: -1 }),
    Order.collection.createIndex({ expectedDeliveryDate: 1 })
  ]);
}

async function connectToDatabase() {
  console.log(`Connecting to MongoDB using URI: ${maskedUri}`);
  const connection = await mongoose.connect(MONGODB_URI, mongooseOptions);
  console.log('MongoDB connected successfully');

  mongoose.connection.on('error', (err) => {
    console.error('MongoDB connection error:', err);
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('MongoDB disconnected. Attempting to reconnect...');
  });

  mongoose.connection.on('reconnected', () => {
    console.log('MongoDB reconnected successfully');
  });

  try {
    await ensureDatabaseIndexes();
    console.log('Database indexes verified');
  } catch (err) {
    console.warn('Warning: failed to build one or more indexes', err);
  }

  return connection;
}

// Routes
const jobRoutes = require('./routes/jobRoutes');
const workerRoutes = require('./routes/workerRoutes');
const authRoutes = require('./routes/authRoutes');
const messageRoutes = require('./routes/messageRoutes');
const gigRoutes = require('./routes/gigRoutes');
const orderRoutes = require('./routes/orderRoutes');

// Mount auth routes first (before protected routes)
app.use('/api/auth', authRoutes);

// Add debug route
app.get('/api/test-public', (req, res) => {
  res.json({ success: true, message: 'Public route works!' });
});

// Mount specific routes BEFORE general /api routes
app.use('/api/gigs', gigRoutes);
app.use('/api/orders', orderRoutes);

// Mount general routes that have global middleware AFTER specific routes
app.use('/api', jobRoutes);
app.use('/api', workerRoutes);
app.use('/api', messageRoutes);

// Default route
app.get('/', (req, res) => {
  res.json({
    success: true,
    data: {
      message: 'Freelance Platform API is running!',
      endpoints: {
        authentication: [
          'POST /api/auth/register - Register a new user',
          'POST /api/auth/login - User login',
          'POST /api/auth/logout - User logout'
        ],
        jobs: [
          'POST /api/jobs - Create a new job',
          'GET /api/jobs - Get all jobs',
          'GET /api/jobs/:id - Get a specific job by ID',
          'PUT /api/jobs/:id - Update a job by ID',
          'DELETE /api/jobs/:id - Delete a job by ID'
        ],
        gigs: [
          'GET /api/gigs - Browse all gigs',
          'GET /api/gigs/categories - Get gig categories',
          'POST /api/gigs - Create a new gig (auth required)',
          'GET /api/gigs/user/me - Get my gigs (auth required)',
          'PUT /api/gigs/:id - Update a gig (auth required)',
          'DELETE /api/gigs/:id - Delete a gig (auth required)'
        ],
        orders: [
          'POST /api/orders - Create a new order (auth required)',
          'GET /api/orders - Get my orders (auth required)',
          'GET /api/orders/:id - Get order details (auth required)',
          'PUT /api/orders/:id/accept - Accept an order (seller)',
          'PUT /api/orders/:id/start - Start work (seller)',
          'PUT /api/orders/:id/deliver - Deliver order (seller)',
          'PUT /api/orders/:id/complete - Complete order (buyer)'
        ],
        workers: [
          'POST /api/workers - Create a new worker',
          'GET /api/workers - Get all workers',
          'GET /api/workers/:id - Get a specific worker by ID',
          'PUT /api/workers/:id - Update a worker by ID',
          'DELETE /api/workers/:id - Delete a worker by ID'
        ]
      }
    }
  });
});

// Health check endpoint for CI/monitoring
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
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

async function startServer() {
  try {
    await connectToDatabase();

    const server = app.listen(PORT, HOST, () => {
      console.log(`✅ Server listening at http://${HOST}:${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });

    server.on('error', (err) => {
      console.error('❌ Server error:', err);
      if (err.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use`);
      }
      process.exit(1);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exitCode = 1;
    setTimeout(() => process.exit(1), 2000);
  }
}

// Only start server if not in a pure unit test environment
if (process.env.NODE_ENV !== 'test' || process.env.CYPRESS_E2E_TEST === 'true') {
  void startServer();
}

// Export app for testing
module.exports = app;