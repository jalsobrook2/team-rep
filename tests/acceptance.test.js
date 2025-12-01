const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server');
const Worker = require('../models/Worker');
const Job = require('../models/Job');

// Check if MongoDB is available
let mongoAvailable = true;

describe('Acceptance flow', () => {
  // eslint-disable-next-line no-unused-vars
  let posterToken, accepterToken, jobId, posterId, accepterId;

  beforeAll(async () => {
    // Prefer a local host when running tests outside Docker. If no MONGODB_URI_TEST
    // is provided, fallback to an in-memory MongoDB for CI-free tests.
    const envTestUri = process.env.MONGODB_URI_TEST;
    const runningInDocker = process.env.DOCKER === 'true' || process.env.CONTAINER === 'true' || process.env.MONGO_HOST === 'mongo';
    let testDbUri = envTestUri;
    if (!testDbUri) {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      const mongod = await MongoMemoryServer.create();
      global.__MONGO_SERVER__ = mongod;
      testDbUri = mongod.getUri();
      process.env.MONGODB_URI_TEST = testDbUri;
    } else if (!runningInDocker && envTestUri && envTestUri.includes('mongo')) {
      testDbUri = envTestUri.replace(/mongodb:\/\/(?:[^:/]+)(:?)/, 'mongodb://127.0.0.1$1');
    }

    if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
    
    try {
      await mongoose.connect(testDbUri, { useNewUrlParser: true, useUnifiedTopology: true, serverSelectionTimeoutMS: 5000 });
    } catch (error) {
      console.warn('⚠️  MongoDB not available, skipping acceptance tests');
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

  testIfMongo('poster can create job and accepter can accept it', async () => {
    // Skip if connection failed in beforeAll
    if (!mongoAvailable) {
      return;
    }
    
    // create poster
    const posterRes = await request(app)
      .post('/api/auth/signup')
      .send({ name: 'Poster Test', email: 'poster-test@example.com', password: 'Poster123!', skills: 'posting' });
    expect(posterRes.status).toBe(201);
    posterToken = posterRes.body.data.accessToken;
    posterId = posterRes.body.data.worker._id;

    // create accepter
    const accepterRes = await request(app)
      .post('/api/auth/signup')
      .send({ name: 'Accepter Test', email: 'accepter-test@example.com', password: 'Accept123!', skills: 'doing' });
    expect(accepterRes.status).toBe(201);
    accepterToken = accepterRes.body.data.accessToken;
    accepterId = accepterRes.body.data.worker._id;

    // poster creates a job
    const jobRes = await request(app)
      .post('/api/jobs')
      .set('Authorization', `Bearer ${posterToken}`)
      .send({ title: 'Acceptance test job', description: 'Please accept', location: 'Here', offer: 20 });
    expect(jobRes.status).toBe(201);
    expect(jobRes.body.success).toBe(true);
    jobId = jobRes.body.data.job._id;

    // accepter accepts the job
    const acceptRes = await request(app)
      .post(`/api/jobs/${jobId}/accept`)
      .set('Authorization', `Bearer ${accepterToken}`)
      .send();
    expect(acceptRes.status).toBe(200);
    expect(acceptRes.body.success).toBe(true);
    expect(acceptRes.body.data.job.status).toBe('assigned');

    // confirm in DB that accepter has job id in acceptedJobs
    const accepter = await Worker.findById(accepterId).lean();
    expect(accepter).toBeTruthy();
    // acceptedJobs should contain the job id
    const contains = (accepter.acceptedJobs || []).some(id => id.toString() === jobId.toString());
    expect(contains).toBe(true);
  }, 20000);
});
