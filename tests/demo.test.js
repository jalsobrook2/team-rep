const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server');
const Worker = require('../models/Worker');

describe('Demo login and fallback behaviors', () => {
  beforeAll(async () => {
    const setupRealDb = require('./setupRealDb');
    await setupRealDb();
  });

  afterAll(async () => {
    await Worker.deleteMany({});
    await mongoose.connection.close();
  });

  test('POST /api/auth/demo-login creates demo account and returns tokens', async () => {
    const email = `demo${Date.now()}@demo.test`;
    const res = await request(app)
      .post('/api/auth/demo-login')
      .send({ email })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('accessToken');
    expect(res.body.data).toHaveProperty('refreshToken');
    expect(res.body.data.worker).toHaveProperty('email', email.toLowerCase());
  });
});
