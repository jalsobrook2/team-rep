const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const cookieParser = require('cookie-parser');
require('dotenv').config();

// Optional Sentry initialization (backend)
let Sentry;
try{
  Sentry = require('@sentry/node');
  const SENTRY_DSN = process.env.SENTRY_DSN || '';
  if (SENTRY_DSN) {
    Sentry.init({
      dsn: SENTRY_DSN,
      environment: process.env.NODE_ENV || 'development',
      tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.05') || 0.05,
    });
    console.log('Sentry initialized for backend');
  }
}catch(e){
  // If @sentry/node isn't installed, skip gracefully
}

const app = express();
const path = require('path');
const PORT = process.env.PORT || 3000;

// Middleware
// Allow local dev origins (more tolerant) and show blocked origins in logs.
// CORS: allow the configured client plus localhost and common private-network hosts
app.use(cors({
  origin: function(origin, callback) {
    // Allow non-browser requests (curl, server-to-server) which have no origin
    if (!origin) return callback(null, true)

    const allowedClient = process.env.CLIENT_URL || 'http://localhost:5173'
    const allowListEnv = (process.env.ALLOW_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean)

    // Allow exact configured client URL
    if (origin === allowedClient) return callback(null, true)

    // Allow any origin explicitly listed in ALLOW_ORIGINS env var
    if (allowListEnv.includes(origin)) return callback(null, true)

    // Parse hostname to allow common local/private network ranges
    try{
      const u = new URL(origin)
      const host = u.hostname

      // localhost and loopback
      if (host === 'localhost' || host === '127.0.0.1') return callback(null, true)

      // Private IPv4 ranges: 10.x.x.x, 192.168.x.x, 172.16.x.x - 172.31.x.x
      if (/^10\./.test(host) || /^192\.168\./.test(host) || /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(host)) return callback(null, true)

      // Also allow IPv4 localhost with ports (e.g. 127.0.0.1:5173) — URL.hostname already strips port
    }catch(e){
      // fallthrough to block below if origin is unparsable
    }

    console.warn('[CORS] blocked origin:', origin)
    return callback(new Error('Not allowed by CORS'))
  },
  credentials: true
}))
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Simple request logger to help debug auth/CORS issues (prints origin + auth header presence)
app.use((req, res, next) => {
  try {
    const origin = req.headers.origin || '<no-origin>';
    const hasAuth = !!req.headers.authorization;
    console.log(`[REQ] ${req.method} ${req.path} Origin:${origin} Auth:${hasAuth}`);
  } catch (e) { /* ignore logging errors */ }
  next();
});

// If Sentry is available and initialized, attach request handler early
if (Sentry && Sentry.getCurrentHub && process.env.SENTRY_DSN) {
  app.use(Sentry.Handlers.requestHandler());
  app.use(Sentry.Handlers.tracingHandler());
}

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
      // In local development keep the server running so the frontend can load
      // Tests and production should still fail fast; only avoid exit in dev.
      if (process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'test') {
        process.exit(1);
      } else {
        console.warn('Continuing without MongoDB connection (dev mode). Some features may be disabled.');
      }
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
// Mount worker routes before job routes so public worker endpoints are not
// intercepted by jobRoutes' router-level auth middleware.
app.use('/api', workerRoutes);
app.use('/api', jobRoutes);
app.use('/api', messageRoutes);

// Serve built Vite client in production (dist)
if (process.env.NODE_ENV === 'production') {
  const clientDist = path.join(__dirname, 'dist');
  console.log('Production mode: serving client from', clientDist);
  app.use(express.static(clientDist));
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// Default route: serve client index.html if present (built), otherwise return API info JSON
const fs = require('fs');
app.get('/', (req, res) => {
  try {
    const clientIndex = path.join(__dirname, 'dist', 'index.html');
    if (fs.existsSync(clientIndex)) {
      // If a built client exists, serve the SPA entrypoint so cy.visit('/') loads HTML
      return res.sendFile(clientIndex);
    }
  } catch (err) {
    // ignore fs errors and fall back to JSON response
  }

  // Fallback: helpful JSON for API consumers when no client is present
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
  // Capture error in Sentry if available
  if (Sentry && process.env.SENTRY_DSN) {
    try { Sentry.captureException(error); } catch (e) { /* noop */ }
  }
  console.error(error && error.stack ? error.stack : error);
  const isProd = process.env.NODE_ENV === 'production';
  const message = isProd ? 'Something went wrong!' : (error && (error.message || error.toString()) ? (error.message || String(error)) : 'Something went wrong!');
  const payload = { success: false, error: message };
  if (!isProd && error && error.stack) payload.stack = error.stack;
  const statusCode = (error && error.statusCode && Number.isInteger(error.statusCode)) ? error.statusCode : 500;
  res.status(statusCode).json(payload);
});

// If Sentry is available, use its error handler after ours to ensure proper event flushing
if (Sentry && process.env.SENTRY_DSN) {
  app.use(Sentry.Handlers.errorHandler());
}

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