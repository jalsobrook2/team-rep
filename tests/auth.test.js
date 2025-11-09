const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server');
const Worker = require('../models/Worker');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

describe('Authentication Tests', () => {

  describe('POST /api/auth/signup - Worker Signup', () => {
    it('should create a new worker account successfully', async () => {
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

    it('should fail signup with missing fields', async () => {
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

    it('should fail signup with invalid email format', async () => {
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

    it('should fail signup with short password', async () => {
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

    it('should fail signup with duplicate email', async () => {
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

    it('should hash password securely on signup', async () => {
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

    it('should login successfully with valid credentials', async () => {
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

    it('should return a signed JWT with worker id claim', async () => {
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

    it('should fail login with incorrect password', async () => {
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

    it('should fail login with non-existent email', async () => {
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

    it('should fail login with missing credentials', async () => {
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

    it('should fail login with invalid email format', async () => {
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

    it('should logout successfully with valid token', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ refreshToken });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toContain('Logged out');
    });

    it('should fail logout without authorization header', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .send({ refreshToken });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Authorization');
    });

    it('should fail logout with invalid token', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', 'Bearer invalidtoken')
        .send({ refreshToken });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should fail logout without refresh token', async () => {
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

    it('should deny access without Authorization header', async () => {
      const response = await request(app)
        .get('/api/workers/dashboard');
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Authorization');
    });

    it('should deny access with invalid token', async () => {
      const response = await request(app)
        .get('/api/workers/dashboard')
        .set('Authorization', 'Bearer invalidtoken');
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toMatch(/Invalid token|expired/i);
    });

    it('should allow access with valid token', async () => {
      const response = await request(app)
        .get('/api/workers/dashboard')
        .set('Authorization', `Bearer ${accessToken}`);
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('dashboard');
    });
  });

  describe('POST /api/auth/refresh - Token Refresh', () => {
    let accessToken;
    let refreshToken;

    beforeEach(async () => {
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

    it('should return a new access token when refresh token is in body', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('accessToken');
      expect(typeof response.body.data.accessToken).toBe('string');
    });

    it('should rotate refresh token (issue new one, revoke old)', async () => {
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

    it('should return a new access token when refresh token is in cookie', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .set('Cookie', [`refreshToken=${refreshToken}`])
        .send({});

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('accessToken');
    });

    it('should fail when no refresh token is provided', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({});

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('No refresh token');
    });

    it('should fail when refresh token is invalid', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'invalid.token.value' });

      expect([400,401,500]).toContain(response.status);
      expect(response.body.success).toBe(false);
    });
  });
});
