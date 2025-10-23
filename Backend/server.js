const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Import database
const db = require('./config/database');

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Test database connection
const testConnection = async () => {
  try {
    await db.sequelize.authenticate();
    console.log('✅ Database connection established successfully');
    
    // Sync database (create tables if they don't exist)
    if (process.env.NODE_ENV !== 'production') {
      await db.sequelize.sync({ alter: true });
      console.log('✅ Database synchronized');
    }
  } catch (error) {
    console.error('❌ Unable to connect to database:', error);
  }
};

// Initialize database connection
testConnection();

// Routes
const authRoutes = require('./routes/authRoutes');
app.use('/api/auth', authRoutes);

const jobRoutes = require('./routes/jobRoutes');
app.use('/api', jobRoutes);

const workerRoutes = require('./routes/workerRoutes');
app.use('/api', workerRoutes);

// Health check route for Docker
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API info route
app.get('/', (req, res) => {
  res.json({
    success: true,
    data: {
      message: 'SafeGig API is running!',
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      endpoints: {
        auth: [
          'POST /api/auth/register - Register a new user',
          'POST /api/auth/login - Login user',
          'POST /api/auth/refresh - Refresh access token',
          'POST /api/auth/logout - Logout user (requires auth)',
          'GET /api/auth/me - Get current user profile (requires auth)',
          'PUT /api/auth/profile - Update user profile (requires auth)',
          'POST /api/auth/change-password - Change password (requires auth)'
        ],
        jobs: [
          'POST /api/jobs - Create a new job (requires auth)',
          'GET /api/jobs - Get all jobs',
          'GET /api/jobs/:id - Get a specific job by ID',
          'PUT /api/jobs/:id - Update a job by ID (requires auth)',
          'DELETE /api/jobs/:id - Delete a job by ID (requires auth)'
        ],
        workers: [
          'POST /api/workers - Create a new worker (requires auth)',
          'GET /api/workers - Get all workers',
          'GET /api/workers/:id - Get a specific worker by ID',
          'PUT /api/workers/:id - Update a worker by ID (requires auth)',
          'DELETE /api/workers/:id - Delete a worker by ID (requires auth)'
        ]
      }
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

// Global error handling middleware
app.use((error, req, res, next) => {
  console.error('Global error handler:', error.stack);
  
  // Handle specific error types
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: error.message
    });
  }
  
  if (error.name === 'UnauthorizedError') {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized access'
    });
  }

  // Default error response
  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : error.message
  });
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🔄 Gracefully shutting down...');
  try {
    await db.sequelize.close();
    console.log('✅ Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
});

app.listen(PORT, () => {
  console.log(`🚀 SafeGig API Server running on port ${PORT}`);
  console.log(`🌐 Visit http://localhost:${PORT} to see available endpoints`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;