const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server');
const Worker = require('../models/Worker');
const Job = require('../models/Job');

// Check if MongoDB is available
let mongoAvailable = true;

describe('Job lifecycle: create → accept → start → complete → cancel', () => {
  // eslint-disable-next-line no-unused-vars
  let posterToken, workerToken, posterId, workerId, jobId, jobId2;

  beforeAll(async () => {
    // In CI, use the external MongoDB service; locally use mongodb-memory-server
    const useExternal = !!process.env.MONGODB_URI_TEST || process.env.CI === 'true';
    let testDbUri;
    
    if (useExternal) {
      testDbUri = process.env.MONGODB_URI_TEST || 'mongodb://localhost:27017/backend-example-test';
    } else {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      const mongod = await MongoMemoryServer.create();
      global.__MONGO_SERVER__ = mongod;
      testDbUri = mongod.getUri();
    }

    if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
    
    try {
      await mongoose.connect(testDbUri, { useNewUrlParser: true, useUnifiedTopology: true, serverSelectionTimeoutMS: 5000 });
    } catch (error) {
      console.warn('⚠️  MongoDB not available, skipping job lifecycle tests');
      mongoAvailable = false;
    }
  });

  afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await Worker.deleteMany({});
      await Job.deleteMany({});
      await mongoose.connection.close();
    }
    if (global.__MONGO_SERVER__) {
      await global.__MONGO_SERVER__.stop();
      global.__MONGO_SERVER__ = null;
    }
  });

  const testIfMongo = mongoAvailable ? test : test.skip;

  testIfMongo('full lifecycle and permission checks', async () => {
    // Skip if connection failed in beforeAll
    if (!mongoAvailable) {
      return;
    }
    
    // create poster
    const posterRes = await request(app)
      .post('/api/auth/signup')
      .send({ name: 'Poster', email: 'poster-lifecycle@example.com', password: 'Poster123!', skills: 'posting' });
    expect(posterRes.status).toBe(201);
    posterToken = posterRes.body.data.accessToken;
    posterId = posterRes.body.data.worker._id;

    // create worker
    const workerRes = await request(app)
      .post('/api/auth/signup')
      .send({ name: 'Worker', email: 'worker-lifecycle@example.com', password: 'Worker123!', skills: 'doing' });
    expect(workerRes.status).toBe(201);
    workerToken = workerRes.body.data.accessToken;
    workerId = workerRes.body.data.worker._id;

    // poster creates a job
    const jobRes = await request(app)
      .post('/api/jobs')
      .set('Authorization', `Bearer ${posterToken}`)
      .send({ title: 'Lifecycle Job', description: 'Lifecycle test', location: 'Nowhere', offer: 15 });
    expect(jobRes.status).toBe(201);
    jobId = jobRes.body.data.job._id;

    // worker accepts job
    const acceptRes = await request(app)
      .post(`/api/jobs/${jobId}/accept`)
      .set('Authorization', `Bearer ${workerToken}`)
      .send();
    expect(acceptRes.status).toBe(200);
    expect(acceptRes.body.data.job.status).toBe('assigned');

    // worker starts job
    const startRes = await request(app)
      .post(`/api/jobs/${jobId}/start`)
      .set('Authorization', `Bearer ${workerToken}`)
      .send();
    expect(startRes.status).toBe(200);
    expect(startRes.body.data.job.status).toBe('in-progress');

    // worker completes job
    const completeRes = await request(app)
      .post(`/api/jobs/${jobId}/complete`)
      .set('Authorization', `Bearer ${workerToken}`)
      .send();
    expect(completeRes.status).toBe(200);
    expect(completeRes.body.data.job.status).toBe('completed');

    // poster tries to cancel completed job -> should fail
    const cancelFail = await request(app)
      .post(`/api/jobs/${jobId}/cancel`)
      .set('Authorization', `Bearer ${posterToken}`)
      .send();
    expect(cancelFail.status).toBe(400);
    expect(cancelFail.body.success).toBe(false);

    // create another job and cancel before assignment
    const jobRes2 = await request(app)
      .post('/api/jobs')
      .set('Authorization', `Bearer ${posterToken}`)
      .send({ title: 'Job to Cancel', description: 'Will be cancelled', location: 'Here', offer: 7 });
    expect(jobRes2.status).toBe(201);
    jobId2 = jobRes2.body.data.job._id;

    const cancelRes = await request(app)
      .post(`/api/jobs/${jobId2}/cancel`)
      .set('Authorization', `Bearer ${posterToken}`)
      .send();
    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.success).toBe(true);
    expect(cancelRes.body.data.job.status).toBe('cancelled');
  }, 30000);
});
