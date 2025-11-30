const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server');
const Worker = require('../models/Worker');

describe('GET /api/workers fallback', () => {
  beforeAll(async () => {
    const setupRealDb = require('./setupRealDb');
    await setupRealDb();
  });

  afterAll(async () => {
    await Worker.deleteMany({});
    await mongoose.connection.close();
  });

  test('returns sample workers when DB empty', async () => {
    // Ensure DB empty
    await Worker.deleteMany({});

    const res = await request(app)
      .get('/api/workers')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.workers).toBeDefined();
    expect(res.body.data.workers.length).toBeGreaterThanOrEqual(1);
  });
});
