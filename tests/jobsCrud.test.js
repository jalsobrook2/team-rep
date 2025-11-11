const request = require('supertest');
const mongoose = require('mongoose');
const { connect, clear, close } = require('./testDb');
const app = require('../server');
const Worker = require('../models/Worker');
const Job = require('../models/Job');

describe('Jobs CRUD Operations', () => {
  let token, userId, jobId;

  beforeAll(async () => {
    await connect();
  });

  afterAll(async () => {
    await Worker.deleteMany({});
    await Job.deleteMany({});
    await close();
  });

  beforeEach(async () => {
    await clear();

    // Create a test user
    const signupRes = await request(app)
      .post('/api/auth/signup')
      .send({ name: 'Test User', email: 'test-crud@example.com', password: 'Test123!', skills: 'testing' });
    token = signupRes.body.data.accessToken;
    userId = signupRes.body.data.worker._id;
  });

  describe('GET /api/jobs - Get all jobs', () => {
    beforeEach(async () => {
      // Create multiple jobs
      await request(app)
        .post('/api/jobs')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Job 1', description: 'First job', location: 'NYC', offer: 100 });
      
      await request(app)
        .post('/api/jobs')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Job 2', description: 'Second job', location: 'LA', offer: 200 });
    });

    it('should get all jobs', async () => {
      const response = await request(app)
        .get('/api/jobs')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.jobs.length).toBeGreaterThanOrEqual(2);
      expect(response.body.data.count).toBeGreaterThanOrEqual(2);
    });

    it('should filter jobs by status', async () => {
      const response = await request(app)
        .get('/api/jobs?status=open')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.jobs.every(j => j.status === 'open')).toBe(true);
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/jobs?page=1&limit=1')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.jobs.length).toBe(1);
      expect(response.body.data.page).toBe(1);
      expect(response.body.data.limit).toBe(1);
    });

    it('should search jobs by title, description, or location', async () => {
      const response = await request(app)
        .get('/api/jobs?search=NYC')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.jobs.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/jobs/:id - Get job by ID', () => {
    beforeEach(async () => {
      const jobRes = await request(app)
        .post('/api/jobs')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Get Test Job', description: 'For getting', location: 'Remote', offer: 150 });
      jobId = jobRes.body.data.job._id;
    });

    it('should get a job by ID', async () => {
      const response = await request(app)
        .get(`/api/jobs/${jobId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.job._id).toBe(jobId);
      expect(response.body.data.job.title).toBe('Get Test Job');
    });

    it('should populate owner and assignedTo fields', async () => {
      const response = await request(app)
        .get(`/api/jobs/${jobId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.job.owner).toHaveProperty('name');
      expect(response.body.data.job.owner).toHaveProperty('email');
    });

    it('should fail for non-existent job', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .get(`/api/jobs/${fakeId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it('should fail with invalid job ID', async () => {
      const response = await request(app)
        .get('/api/jobs/invalid-id')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(500);
    });
  });

  describe('PUT /api/jobs/:id - Update job', () => {
    beforeEach(async () => {
      const jobRes = await request(app)
        .post('/api/jobs')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Original Title', description: 'Original desc', location: 'Original', offer: 100 });
      jobId = jobRes.body.data.job._id;
    });

    it('should allow owner to update job', async () => {
      const response = await request(app)
        .put(`/api/jobs/${jobId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Updated Title', offer: 150 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.job.title).toBe('Updated Title');
      expect(response.body.data.job.offer).toBe(150);
    });

    it('should not allow non-owner to update job', async () => {
      // Create another user
      const otherRes = await request(app)
        .post('/api/auth/signup')
        .send({ name: 'Other User', email: 'other-crud@example.com', password: 'Other123!', skills: 'other' });
      const otherToken = otherRes.body.data.accessToken;

      const response = await request(app)
        .put(`/api/jobs/${jobId}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ title: 'Hacked Title' });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('owner');
    });

    it('should not allow updating non-open jobs', async () => {
      // Apply and assign to change status
      await request(app)
        .post(`/api/jobs/${jobId}/apply`)
        .set('Authorization', `Bearer ${token}`)
        .send();
      
      await request(app)
        .post(`/api/jobs/${jobId}/assign`)
        .set('Authorization', `Bearer ${token}`)
        .send({ workerId: userId });

      const response = await request(app)
        .put(`/api/jobs/${jobId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Cannot Update' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/jobs/:id - Delete job', () => {
    beforeEach(async () => {
      const jobRes = await request(app)
        .post('/api/jobs')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Delete Test', description: 'To be deleted', location: 'Nowhere', offer: 50 });
      jobId = jobRes.body.data.job._id;
    });

    it('should allow owner to delete job', async () => {
      const response = await request(app)
        .delete(`/api/jobs/${jobId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify job is deleted
      const job = await Job.findById(jobId);
      expect(job).toBeNull();

      // Verify removed from worker's postedJobs
      const worker = await Worker.findById(userId);
      expect(worker.postedJobs.map(id => id.toString())).not.toContain(jobId);
    });

    it('should not allow non-owner to delete job', async () => {
      // Create another user
      const otherRes = await request(app)
        .post('/api/auth/signup')
        .send({ name: 'Other User', email: 'other-delete@example.com', password: 'Other123!', skills: 'other' });
      const otherToken = otherRes.body.data.accessToken;

      const response = await request(app)
        .delete(`/api/jobs/${jobId}`)
        .set('Authorization', `Bearer ${otherToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    it('should clean up worker relationships when deleting', async () => {
      // Create another user who will accept the job
      const workerRes = await request(app)
        .post('/api/auth/signup')
        .send({ name: 'Worker', email: 'worker-delete@example.com', password: 'Worker123!', skills: 'working' });
      const workerToken = workerRes.body.data.accessToken;
      const workerId = workerRes.body.data.worker._id;

      // Worker accepts job
      await request(app)
        .post(`/api/jobs/${jobId}/accept`)
        .set('Authorization', `Bearer ${workerToken}`);

      // Owner deletes job
      await request(app)
        .delete(`/api/jobs/${jobId}`)
        .set('Authorization', `Bearer ${token}`);

      // Verify removed from worker's acceptedJobs
      const worker = await Worker.findById(workerId);
      expect(worker.acceptedJobs.map(id => id.toString())).not.toContain(jobId);
    });
  });
});
