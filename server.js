const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const cookieParser = require('cookie-parser');
require('dotenv').config();

// Initialize Sentry for error monitoring (must be done before app creation)
const Sentry = require('@sentry/node');

// Initialize Sentry with DSN from environment
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: 1.0, // Capture 100% of transactions for performance monitoring
    profilesSampleRate: 1.0,
    integrations: [
      // Enable HTTP request tracing
      Sentry.httpIntegration(),
      // Enable Express.js integration
      Sentry.expressIntegration(),
    ],
    // Filter out health check endpoints from error reporting
    beforeSend(event) {
      if (event.request?.url?.includes('/api/health')) {
        return null;
      }
      return event;
    },
  });
  console.log('Sentry initialized for error monitoring');
} else {
  console.log('Sentry DSN not configured - error monitoring disabled');
}

const app = express();
const path = require('path');
const PORT = process.env.PORT || 3000;

// Import middleware
const requestId = require('./middleware/requestId');
const { authLimiter, apiLimiter } = require('./middleware/rateLimiter');

// Middleware
// Add Sentry request handler first (must be before any other middleware)
if (process.env.SENTRY_DSN) {
  app.use(Sentry.expressIntegration().setupExpressErrorHandler(app));
}

// Request ID middleware for error correlation
app.use(requestId);

app.use(cors({
  // Vite dev server default is 5173; prefer that for local development unless overridden
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true // Allow credentials (cookies)
}));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Apply rate limiting to API routes
app.use('/api/', apiLimiter);

// Serve frontend static pages (optional). This will make files under ./Frontend/pages
// available at http://localhost:PORT/pages/<file>.html
app.use('/pages', express.static(path.join(__dirname, 'Frontend', 'pages')));

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
        // Seed stable demo accounts so the frontend Demo button can work reliably
        (async function seedDemoAccounts(){
          try {
            const Worker = require('./models/Worker');
            const demoList = [
              { email: (process.env.DEMO_EMAIL || 'demo@pocketjob.test').toLowerCase().trim(), password: process.env.DEMO_PASSWORD || 'Demo123!', name: process.env.DEMO_NAME || 'Demo User', skills: process.env.DEMO_SKILLS || 'Demo skills, sample worker' },
              { email: (process.env.DEMO_EMAIL_2 || 'alice@demo.test').toLowerCase().trim(), password: process.env.DEMO_PASSWORD_2 || 'Alice123!', name: process.env.DEMO_NAME_2 || 'Alice Demo', skills: process.env.DEMO_SKILLS_2 || 'Demo account Alice' },
              { email: (process.env.DEMO_EMAIL_3 || 'bob@demo.test').toLowerCase().trim(), password: process.env.DEMO_PASSWORD_3 || 'Bob123!!', name: process.env.DEMO_NAME_3 || 'Bob Demo', skills: process.env.DEMO_SKILLS_3 || 'Demo account Bob' }
            ];

            const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'your-access-secret-key';
            const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key';

            for(const acct of demoList){
              try{
                const existing = await Worker.findOne({ email: acct.email });
                if(existing){
                  // Update existing demo account to ensure known demo password and metadata
                  try {
                    existing.name = acct.name;
                    existing.skills = acct.skills;
                    // Overwrite password with demo password so DemoLogin works predictably
                    existing.password = acct.password;
                    // Clear previous demo-seed refresh tokens and add a fresh one
                    existing.refreshTokens = existing.refreshTokens?.filter(t => t.device !== 'demo-seed') || [];
                    const refreshToken = jwt.sign({ id: existing._id }, JWT_REFRESH_SECRET, { expiresIn: '30d' });
                    existing.refreshTokens.push({ token: refreshToken, device: 'demo-seed' });
                    await existing.save();
                    console.log(`Demo account updated: ${acct.email} (password reset to demo value)`);
                    continue;
                  } catch (updateErr) {
                    console.warn(`Failed to update existing demo account ${acct.email}:`, updateErr && updateErr.message ? updateErr.message : updateErr);
                    continue;
                  }
                }

                const demo = new Worker({ name: acct.name, email: acct.email, password: acct.password, skills: acct.skills });
                await demo.save();

                // Generate tokens and store refresh token for demo account
                const accessToken = jwt.sign({ id: demo._id }, JWT_ACCESS_SECRET, { expiresIn: '1h' });
                const refreshToken = jwt.sign({ id: demo._id }, JWT_REFRESH_SECRET, { expiresIn: '30d' });
                demo.refreshTokens.push({ token: refreshToken, device: 'demo-seed' });
                await demo.save();

                console.log(`Demo account created: ${acct.email} (password: ${acct.password})`);
              }catch(e){
                console.warn('Failed to create demo account', acct.email, e && e.message ? e.message : e);
              }
            }
          } catch (err) {
            console.warn('Failed to seed demo accounts:', err && err.message ? err.message : err);
          }
        })();
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
const testRoutes = require('./routes/testRoutes');

// Mount auth routes first (before protected routes) with rate limiting
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api', jobRoutes);
app.use('/api', workerRoutes);
app.use('/api', messageRoutes);
app.use('/api', testRoutes);

// Serve built Vite client in production (dist)
if (process.env.NODE_ENV === 'production') {
  const clientDist = path.join(__dirname, 'dist');
  console.log('Production mode: serving client from', clientDist);
  app.use(express.static(clientDist));
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

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
    error: 'Route not found',
    requestId: req.requestId
  });
});

// Sentry error handler (must be before other error handlers)
if (process.env.SENTRY_DSN) {
  app.use(Sentry.Handlers.errorHandler({
    shouldHandleError(error) {
      // Capture all errors with status >= 400
      return !error.status || error.status >= 400;
    },
  }));
}

// Error handling middleware
app.use((error, req, res, next) => {
  console.error(`[${req.requestId || 'no-id'}] Error:`, error.stack);
  
  // Capture error to Sentry with request context
  if (process.env.SENTRY_DSN) {
    Sentry.withScope((scope) => {
      scope.setTag('request_id', req.requestId);
      scope.setUser({ id: req.userId || 'anonymous' });
      scope.setContext('request', {
        method: req.method,
        url: req.url,
        headers: req.headers,
        body: req.body
      });
      Sentry.captureException(error);
    });
  }
  
  const statusCode = error.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    error: process.env.NODE_ENV === 'production' ? 'Something went wrong!' : error.message,
    requestId: req.requestId
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