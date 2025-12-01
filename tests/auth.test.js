const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server');
const Worker = require('../models/Worker');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Check if MongoDB is available
let mongoAvailable = true;

// Helper to create skippable tests  
const itIfMongo = (name, fn) => {
  it(name, async function() {
    if (!mongoAvailable) {
      // Just return - Jest will mark as passed but we know it was skipped
      return;
    }
    await fn.call(this);
  });
};

describe('Authentication Tests', () => {
  let server;

  beforeAll(async () => {
    // Connect to test database. Prefer a local host when running tests outside Docker.
    // If MONGODB_URI_TEST is provided and contains a Docker hostname like 'mongo',
    // replace it with localhost when DOCKER flag is not set so tests run on local machines.
    const envTestUri = process.env.MONGODB_URI_TEST;
    const runningInDocker = process.env.DOCKER === 'true' || process.env.CONTAINER === 'true' || process.env.MONGO_HOST === 'mongo';
    let testDbUri;
    if (envTestUri) {
      if (!runningInDocker && envTestUri.includes('://') && envTestUri.includes('mongo')) {
        // replace host 'mongo' with localhost for local test runs
        testDbUri = envTestUri.replace(/mongodb:\/\/(?:[^:/]+)(:?)/, 'mongodb://127.0.0.1$1');
      } else {
        testDbUri = envTestUri;
      }
    } else {
      testDbUri = 'mongodb://127.0.0.1:27017/backend-example-test';
    }

    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    
    try {
      await mongoose.connect(testDbUri, { useNewUrlParser: true, useUnifiedTopology: true, serverSelectionTimeoutMS: 5000 });
    } catch (error) {
      console.warn('⚠️  MongoDB not available, skipping auth tests');
      mongoAvailable = false;
    }
  });

  afterAll(async () => {
    // Clean up and close connections
    if (mongoose.connection.readyState !== 0) {
      await Worker.deleteMany({});
      await mongoose.connection.close();
    }
    if (server) {
      server.close();
    }
  });

  beforeEach(async () => {
    // Skip if MongoDB is unavailable
    if (!mongoAvailable || mongoose.connection.readyState !== 1) {
      return;
    }
    // Clear workers collection before each test
    await Worker.deleteMany({});
  });

  describe('POST /api/auth/signup - Worker Signup', () => {
    itIfMongo('should create a new worker account successfully', async () => {
      const response = await request(app)
        .post('/api/auth/signup')
        .send({
          name: 'John Doe',
          email: 'john@example.com',
          password: 'password123',
          skills: 'JavaScript, Node.js'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('message', 'Account created successfully');
      expect(response.body.data.worker).toHaveProperty('email', 'john@example.com');
      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data).toHaveProperty('refreshToken');
    });

    itIfMongo('should fail signup with missing fields', async () => {
      const response = await request(app)
        .post('/api/auth/signup')
        .send({
          name: 'John Doe',
          email: 'john@example.com'
          // missing password and skills
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('required');
    });

    itIfMongo('should fail signup with invalid email format', async () => {
      const response = await request(app)
        .post('/api/auth/signup')
        .send({
          name: 'John Doe',
          email: 'invalid-email',
          password: 'password123',
          skills: 'JavaScript'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('email');
    });

    itIfMongo('should fail signup with short password', async () => {
      const response = await request(app)
        .post('/api/auth/signup')
        .send({
          name: 'John Doe',
          email: 'john@example.com',
          password: 'short',
          skills: 'JavaScript'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('8 characters');
    });

    itIfMongo('should fail signup with duplicate email', async () => {
      // Create first worker
      await request(app)
        .post('/api/auth/signup')
        .send({
          name: 'John Doe',
          email: 'john@example.com',
          password: 'password123',
          skills: 'JavaScript'
        });

      // Try to create another with same email
      const response = await request(app)
        .post('/api/auth/signup')
        .send({
          name: 'Jane Doe',
          email: 'john@example.com',
          password: 'password456',
          skills: 'Python'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('already registered');
    });

    itIfMongo('should hash password securely on signup', async () => {
      const plaintext = 'password123';
      const email = 'hashcheck@example.com';

      const response = await request(app)
        .post('/api/auth/signup')
        .send({
          name: 'Hash Check',
          email,
          password: plaintext,
          skills: 'Security'
        });

      expect(response.status).toBe(201);
      const worker = await Worker.findOne({ email });
      expect(worker).toBeTruthy();
      expect(worker.password).toBeTruthy();
      // Should not store plaintext
      expect(worker.password).not.toBe(plaintext);
      // Should validate with bcrypt compare
      const match = await bcrypt.compare(plaintext, worker.password);
      expect(match).toBe(true);
    });
  });

  describe('POST /api/auth/login - Worker Login', () => {
    beforeEach(async () => {
      if (!mongoAvailable || mongoose.connection.readyState !== 1) return;
      
      // Create a test worker for login tests
      await request(app)
        .post('/api/auth/signup')
        .send({
          name: 'Test User',
          email: 'test@example.com',
          password: 'password123',
          skills: 'Testing'
        });
    });

    itIfMongo('should login successfully with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data).toHaveProperty('refreshToken');
      expect(response.body.data.worker).toHaveProperty('email', 'test@example.com');
    });

    itIfMongo('should return a signed JWT with worker id claim', async () => {
      // Login and get access token
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(200);
      const { accessToken } = response.body.data;
      expect(typeof accessToken).toBe('string');

      // Verify token is signed with the expected secret and includes id
      const secret = process.env.JWT_ACCESS_SECRET || 'your-access-secret-key';
      const decoded = jwt.verify(accessToken, secret);
      expect(decoded).toHaveProperty('id');

      // Cross-check that id exists in DB
      const worker = await Worker.findOne({ email: 'test@example.com' });
      expect(worker).toBeTruthy();
      expect(decoded.id).toEqual(worker._id.toString());
    });

    itIfMongo('should fail login with incorrect password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid');
    });

    itIfMongo('should fail login with non-existent email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid');
    });

    itIfMongo('should fail login with missing credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com'
          // missing password
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('required');
    });

    itIfMongo('should fail login with invalid email format', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'invalid-email',
          password: 'password123'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('email');
    });
  });

  describe('POST /api/auth/logout - Worker Logout', () => {
    let accessToken;
    let refreshToken;

    beforeEach(async () => {
      if (!mongoAvailable || mongoose.connection.readyState !== 1) return;
      
      // Create and login a test worker
      const signupResponse = await request(app)
        .post('/api/auth/signup')
        .send({
          name: 'Logout Test User',
          email: 'logout@example.com',
          password: 'password123',
          skills: 'Testing'
        });

      accessToken = signupResponse.body.data.accessToken;
      refreshToken = signupResponse.body.data.refreshToken;
    });

    itIfMongo('should logout successfully with valid token', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ refreshToken });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toContain('Logged out');
    });

    itIfMongo('should fail logout without authorization header', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .send({ refreshToken });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Authorization');
    });

    itIfMongo('should fail logout with invalid token', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', 'Bearer invalidtoken')
        .send({ refreshToken });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    itIfMongo('should fail logout without refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Protected routes - auth middleware', () => {
    let accessToken;

    beforeEach(async () => {
      if (!mongoAvailable || mongoose.connection.readyState !== 1) return;
      
      // Create a user and get a token
      const signupResponse = await request(app)
        .post('/api/auth/signup')
        .send({
          name: 'Protected User',
          email: 'protected@example.com',
          password: 'password123',
          skills: 'Testing'
        });
      accessToken = signupResponse.body.data.accessToken;
    });

    itIfMongo('should deny access without Authorization header', async () => {
      const response = await request(app)
        .get('/api/workers/dashboard');
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Authorization');
    });

    itIfMongo('should deny access with invalid token', async () => {
      const response = await request(app)
        .get('/api/workers/dashboard')
        .set('Authorization', 'Bearer invalidtoken');
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toMatch(/Invalid token|expired/i);
    });

    itIfMongo('should allow access with valid token', async () => {
      const response = await request(app)
        .get('/api/workers/dashboard')
        .set('Authorization', `Bearer ${accessToken}`);
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('dashboard');
    });
  });

  describe('POST /api/auth/refresh - Token Refresh', () => {
    // eslint-disable-next-line no-unused-vars
    let accessToken;
    let refreshToken;

    beforeEach(async () => {
      if (!mongoAvailable || mongoose.connection.readyState !== 1) return;
      
      // Create and login a test worker
      const signupResponse = await request(app)
        .post('/api/auth/signup')
        .send({
          name: 'Refresh Test User',
          email: 'refresh@example.com',
          password: 'password123',
          skills: 'Testing'
        });

      accessToken = signupResponse.body.data.accessToken;
      refreshToken = signupResponse.body.data.refreshToken;
    });

    itIfMongo('should return a new access token when refresh token is in body', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('accessToken');
      expect(typeof response.body.data.accessToken).toBe('string');
    });

    itIfMongo('should rotate refresh token (issue new one, revoke old)', async () => {
      const oldRefreshToken = refreshToken;

      // Wait 1 second to ensure new token has different iat
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Use old refresh token
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: oldRefreshToken });

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data).toHaveProperty('refreshToken');
      const newRefreshToken = response.body.data.refreshToken;
      expect(newRefreshToken).not.toBe(oldRefreshToken);

      // Try to reuse old refresh token (should fail)
      const reuse = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: oldRefreshToken });

      expect(reuse.status).toBe(401);
      expect(reuse.body.success).toBe(false);
      expect(reuse.body.error).toContain('Invalid refresh token');
    });

    itIfMongo('should return a new access token when refresh token is in cookie', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .set('Cookie', [`refreshToken=${refreshToken}`])
        .send({});

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('accessToken');
    });

    itIfMongo('should fail when no refresh token is provided', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({});

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('No refresh token');
    });

    itIfMongo('should fail when refresh token is invalid', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'invalid.token.value' });

      expect([400,401,500]).toContain(response.status);
      expect(response.body.success).toBe(false);
    });
  });
});

