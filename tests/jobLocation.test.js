const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server');
const Worker = require('../models/Worker');
const Job = require('../models/Job');

describe('Job location and radius search', () => {
  beforeAll(async () => {
    const setupRealDb = require('./setupRealDb');
    await setupRealDb();
  });

  afterAll(async () => {
    await Worker.deleteMany({});
    await Job.deleteMany({});
    await mongoose.connection.close();
  });

  test('create jobs with coordinates and find nearby by radius', async () => {
    // Create a worker and get token
    const signup = await request(app)
      .post('/api/auth/signup')
      .send({ name: 'Loc User', email: 'locuser@example.com', password: 'password123', skills: 'Testing' });

    expect(signup.status).toBe(201);
    const token = signup.body.data.accessToken;

    // Create a job near San Francisco (37.7749, -122.4194)
    const jobNear = await request(app)
      .post('/api/jobs')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Nearby Task',
        description: 'Close by',
        location: 'San Francisco, CA',
        offer: 20,
        coordinates: { lat: 37.7749, lng: -122.4194 }
      });
    expect(jobNear.status).toBe(201);

    // Create a job far away (New York)
    const jobFar = await request(app)
      .post('/api/jobs')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Far Task',
        description: 'Far away',
        location: 'New York, NY',
        offer: 30,
        coordinates: { lat: 40.7128, lng: -74.0060 }
      });
    expect(jobFar.status).toBe(201);

    // Query for jobs within 5 km of SF coordinates
    const resNear = await request(app)
      .get('/api/jobs/near')
      .set('Authorization', `Bearer ${token}`)
      .query({ lat: 37.7749, lng: -122.4194, radiusKm: 5 });

    expect(resNear.status).toBe(200);
    expect(resNear.body.success).toBe(true);
    const jobs = resNear.body.data.jobs;
    // Should include Nearby Task and not include Far Task
    expect(jobs.some(j => j.title === 'Nearby Task')).toBe(true);
    expect(jobs.some(j => j.title === 'Far Task')).toBe(false);
  }, 20000);
});
