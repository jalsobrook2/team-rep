const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../server');
const Worker = require('../models/Worker');

describe('Workers CRUD Operations', () => {
  let token, userId;
  let mongod;

  beforeAll(async () => {
    // Use MongoDB Memory Server for consistent test environment
    if (!global.__MONGO_SERVER__) {
      mongod = await MongoMemoryServer.create();
      global.__MONGO_SERVER__ = mongod;
      const testDbUri = mongod.getUri();
      
      if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
      }
      await mongoose.connect(testDbUri, { useNewUrlParser: true, useUnifiedTopology: true });
    }
  });

  afterAll(async () => {
    await Worker.deleteMany({});
    await mongoose.connection.close();
    if (global.__MONGO_SERVER__) {
      await global.__MONGO_SERVER__.stop();
      global.__MONGO_SERVER__ = null;
    }
  });

  beforeEach(async () => {
    await Worker.deleteMany({});

    // Create a test user
    const signupRes = await request(app)
      .post('/api/auth/signup')
      .send({ name: 'Test Worker', email: 'test-worker@example.com', password: 'Test123!', skills: 'testing' });
    token = signupRes.body.data.accessToken;
    userId = signupRes.body.data.worker._id;
  });

  describe('GET /api/workers - Get all workers', () => {
    beforeEach(async () => {
      // Create additional workers
      await request(app)
        .post('/api/auth/signup')
        .send({ name: 'Worker Two', email: 'worker2@example.com', password: 'Worker123!', skills: 'coding' });
      
      await request(app)
        .post('/api/auth/signup')
        .send({ name: 'Worker Three', email: 'worker3@example.com', password: 'Worker123!', skills: 'design' });
    });

    it('should get all workers with authentication', async () => {
      const response = await request(app)
        .get('/api/workers')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.workers.length).toBeGreaterThanOrEqual(3);
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/workers?page=1&limit=2')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.workers.length).toBe(2);
      expect(response.body.data.page).toBe(1);
      expect(response.body.data.totalPages).toBeGreaterThan(0);
    });

    it('should not include password in response', async () => {
      const response = await request(app)
        .get('/api/workers')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      response.body.data.workers.forEach(worker => {
        expect(worker).not.toHaveProperty('password');
      });
    });

    it('should include name, email, and skills', async () => {
      const response = await request(app)
        .get('/api/workers')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      const worker = response.body.data.workers[0];
      expect(worker).toHaveProperty('name');
      expect(worker).toHaveProperty('email');
      expect(worker).toHaveProperty('skills');
    });
  });

  describe('GET /api/workers/:id - Get worker by ID', () => {
    it('should get a worker by ID with authentication', async () => {
      const response = await request(app)
        .get(`/api/workers/${userId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.worker._id).toBe(userId);
      expect(response.body.data.worker.name).toBe('Test Worker');
    });

    it('should not include password in response', async () => {
      const response = await request(app)
        .get(`/api/workers/${userId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.worker).not.toHaveProperty('password');
    });

    it('should fail for non-existent worker', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .get(`/api/workers/${fakeId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it('should fail with invalid worker ID', async () => {
      const response = await request(app)
        .get('/api/workers/invalid-id')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(500);
    });
  });

  describe('PUT /api/workers/:id - Update worker', () => {
    it('should allow worker to update their own profile', async () => {
      const response = await request(app)
        .put(`/api/workers/${userId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Updated Name', skills: 'Updated skills' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.worker.name).toBe('Updated Name');
      expect(response.body.data.worker.skills).toBe('Updated skills');
    });

    it('should allow updating email', async () => {
      const response = await request(app)
        .put(`/api/workers/${userId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ email: 'newemail@example.com' });

      expect(response.status).toBe(200);
      expect(response.body.data.worker.email).toBe('newemail@example.com');
    });

    it('should allow updating password', async () => {
      const response = await request(app)
        .put(`/api/workers/${userId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ password: 'NewPassword123!' });

      expect(response.status).toBe(200);

      // Verify can login with new password
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test-worker@example.com', password: 'NewPassword123!' });

      expect(loginRes.status).toBe(200);
    });

    it('should not allow updating another worker\'s profile', async () => {
      // Create another worker
      const otherRes = await request(app)
        .post('/api/auth/signup')
        .send({ name: 'Other Worker', email: 'other@example.com', password: 'Other123!', skills: 'other' });
      const otherId = otherRes.body.data.worker._id;

      const response = await request(app)
        .put(`/api/workers/${otherId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Hacked Name' });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Not authorized');
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .put(`/api/workers/${userId}`)
        .send({ name: 'No Auth' });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should not return password in response', async () => {
      const response = await request(app)
        .put(`/api/workers/${userId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Updated' });

      expect(response.status).toBe(200);
      expect(response.body.data.worker).not.toHaveProperty('password');
    });
  });

  describe('DELETE /api/workers/:id - Delete worker', () => {
    it('should allow worker to delete their own account', async () => {
      const response = await request(app)
        .delete(`/api/workers/${userId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toContain('deleted');

      // Verify worker is deleted
      const worker = await Worker.findById(userId);
      expect(worker).toBeNull();
    });

    it('should not allow deleting another worker\'s account', async () => {
      // Create another worker
      const otherRes = await request(app)
        .post('/api/auth/signup')
        .send({ name: 'Other Worker', email: 'other-del@example.com', password: 'Other123!', skills: 'other' });
      const otherId = otherRes.body.data.worker._id;

      const response = await request(app)
        .delete(`/api/workers/${otherId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Not authorized');
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .delete(`/api/workers/${userId}`);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should fail for non-existent worker', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .delete(`/api/workers/${fakeId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/workers/dashboard - Get worker dashboard', () => {
    it('should get dashboard with authentication', async () => {
      const response = await request(app)
        .get('/api/workers/dashboard')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('dashboard');
      expect(response.body.data).toHaveProperty('worker');
    });

    it('should include posted and accepted jobs', async () => {
      const response = await request(app)
        .get('/api/workers/dashboard')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.dashboard).toHaveProperty('jobsPosted');
      expect(response.body.data.dashboard).toHaveProperty('jobsAccepted');
      expect(Array.isArray(response.body.data.dashboard.jobsPosted)).toBe(true);
      expect(Array.isArray(response.body.data.dashboard.jobsAccepted)).toBe(true);
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .get('/api/workers/dashboard');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });
});
