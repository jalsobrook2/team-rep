const request = require('supertest');
const mongoose = require('mongoose');
const { connect, clear, close } = require('./testDb');
const app = require('../server');
const Worker = require('../models/Worker');
const Job = require('../models/Job');

describe('Job Actions: Apply, Assign, Kick, Unassign-Self', () => {
  let ownerToken, worker1Token, worker2Token, ownerId, worker1Id, worker2Id, jobId;

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

    // Create job owner
    const ownerRes = await request(app)
      .post('/api/auth/signup')
      .send({ name: 'Job Owner', email: 'owner-action@example.com', password: 'Owner123!', skills: 'managing' });
    ownerToken = ownerRes.body.data.accessToken;
    ownerId = ownerRes.body.data.worker._id;

    // Create worker 1
    const worker1Res = await request(app)
      .post('/api/auth/signup')
      .send({ name: 'Worker One', email: 'worker1-action@example.com', password: 'Worker123!', skills: 'coding' });
    worker1Token = worker1Res.body.data.accessToken;
    worker1Id = worker1Res.body.data.worker._id;

    // Create worker 2
    const worker2Res = await request(app)
      .post('/api/auth/signup')
      .send({ name: 'Worker Two', email: 'worker2-action@example.com', password: 'Worker123!', skills: 'testing' });
    worker2Token = worker2Res.body.data.accessToken;
    worker2Id = worker2Res.body.data.worker._id;

    // Owner creates a job
    const jobRes = await request(app)
      .post('/api/jobs')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ title: 'Test Job', description: 'Test description', location: 'Remote', offer: 100 });
    jobId = jobRes.body.data.job._id;
  });

  describe('POST /api/jobs/:id/apply - Worker applies to job', () => {
    it('should allow a worker to apply to an open job', async () => {
      const response = await request(app)
        .post(`/api/jobs/${jobId}/apply`)
        .set('Authorization', `Bearer ${worker1Token}`)
        .send();

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toMatch(/applied/i);

      // Verify applicant is in job's applicants array
      const job = await Job.findById(jobId);
      expect(job.applicants.map(id => id.toString())).toContain(worker1Id);
    });

    it('should allow multiple workers to apply to the same job', async () => {
      // Worker 1 applies
      await request(app)
        .post(`/api/jobs/${jobId}/apply`)
        .set('Authorization', `Bearer ${worker1Token}`)
        .send();

      // Worker 2 applies
      const response = await request(app)
        .post(`/api/jobs/${jobId}/apply`)
        .set('Authorization', `Bearer ${worker2Token}`)
        .send();

      expect(response.status).toBe(200);

      // Verify both applicants are in the array
      const job = await Job.findById(jobId);
      expect(job.applicants.length).toBe(2);
      expect(job.applicants.map(id => id.toString())).toContain(worker1Id);
      expect(job.applicants.map(id => id.toString())).toContain(worker2Id);
    });

    it('should not allow duplicate applications from same worker', async () => {
      // First application
      await request(app)
        .post(`/api/jobs/${jobId}/apply`)
        .set('Authorization', `Bearer ${worker1Token}`)
        .send();

      // Second application from same worker
      const response = await request(app)
        .post(`/api/jobs/${jobId}/apply`)
        .set('Authorization', `Bearer ${worker1Token}`)
        .send();

      // The API returns 200 with "Already applied" message instead of 400
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toMatch(/already applied/i);
    });

    it('should not allow owner to apply to their own job', async () => {
      const response = await request(app)
        .post(`/api/jobs/${jobId}/apply`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send();

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('own job');
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .post(`/api/jobs/${jobId}/apply`)
        .send();

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should fail for non-existent job', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .post(`/api/jobs/${fakeId}/apply`)
        .set('Authorization', `Bearer ${worker1Token}`)
        .send();

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/jobs/:id/assign - Owner assigns worker from applicants', () => {
    beforeEach(async () => {
      // Worker applies to job first
      await request(app)
        .post(`/api/jobs/${jobId}/apply`)
        .set('Authorization', `Bearer ${worker1Token}`)
        .send();
    });

    it('should allow owner to assign a worker from applicants', async () => {
      const response = await request(app)
        .post(`/api/jobs/${jobId}/assign`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ workerId: worker1Id });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.job.assignedTo.toString()).toBe(worker1Id);
      expect(response.body.data.job.status).toBe('assigned');

      // Verify worker's acceptedJobs array
      const worker = await Worker.findById(worker1Id);
      expect(worker.acceptedJobs.map(id => id.toString())).toContain(jobId);
    });

    it('should not allow non-owner to assign worker', async () => {
      const response = await request(app)
        .post(`/api/jobs/${jobId}/assign`)
        .set('Authorization', `Bearer ${worker2Token}`)
        .send({ workerId: worker1Id });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('owner');
    });

    it('should allow assigning worker even if not in applicants', async () => {
      // The API allows assigning any worker, not just applicants
      const response = await request(app)
        .post(`/api/jobs/${jobId}/assign`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ workerId: worker2Id });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.job.assignedTo.toString()).toBe(worker2Id);
    });

    it('should fail without workerId', async () => {
      const response = await request(app)
        .post(`/api/jobs/${jobId}/assign`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/jobs/:id/kick - Owner removes assigned worker', () => {
    beforeEach(async () => {
      // Apply and assign worker first
      await request(app)
        .post(`/api/jobs/${jobId}/apply`)
        .set('Authorization', `Bearer ${worker1Token}`)
        .send();

      await request(app)
        .post(`/api/jobs/${jobId}/assign`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ workerId: worker1Id });
    });

    it('should allow owner to remove assigned worker', async () => {
      const response = await request(app)
        .post(`/api/jobs/${jobId}/kick`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send();

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.job.assignedTo).toBeNull();
      expect(response.body.data.job.status).toBe('open');

      // Verify worker's acceptedJobs array is updated
      const worker = await Worker.findById(worker1Id);
      expect(worker.acceptedJobs.map(id => id.toString())).not.toContain(jobId);
    });

    it('should not allow non-owner to kick worker', async () => {
      const response = await request(app)
        .post(`/api/jobs/${jobId}/kick`)
        .set('Authorization', `Bearer ${worker2Token}`)
        .send();

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('owner');
    });

    it('should fail when no worker is assigned', async () => {
      // First kick the worker
      await request(app)
        .post(`/api/jobs/${jobId}/kick`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send();

      // Try to kick again
      const response = await request(app)
        .post(`/api/jobs/${jobId}/kick`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send();

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('No worker');
    });
  });

  describe('POST /api/jobs/:id/unassign-self - Worker removes themselves from job', () => {
    beforeEach(async () => {
      // Apply and assign worker first
      await request(app)
        .post(`/api/jobs/${jobId}/apply`)
        .set('Authorization', `Bearer ${worker1Token}`)
        .send();

      await request(app)
        .post(`/api/jobs/${jobId}/assign`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ workerId: worker1Id });
    });

    it('should allow assigned worker to remove themselves', async () => {
      const response = await request(app)
        .post(`/api/jobs/${jobId}/unassign-self`)
        .set('Authorization', `Bearer ${worker1Token}`)
        .send();

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.job.assignedTo).toBeNull();
      expect(response.body.data.job.status).toBe('open');

      // Verify worker's acceptedJobs array is updated
      const worker = await Worker.findById(worker1Id);
      expect(worker.acceptedJobs.map(id => id.toString())).not.toContain(jobId);
    });

    it('should not allow unassigned worker to unassign themselves', async () => {
      const response = await request(app)
        .post(`/api/jobs/${jobId}/unassign-self`)
        .set('Authorization', `Bearer ${worker2Token}`)
        .send();

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('not assigned');
    });

    it('should fail for non-existent job', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .post(`/api/jobs/${fakeId}/unassign-self`)
        .set('Authorization', `Bearer ${worker1Token}`)
        .send();

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });
});
