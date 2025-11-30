const mongoose = require('mongoose');
const Worker = require('../models/Worker');

describe('Worker model (unit)', () => {
  beforeAll(async () => {
    const setupRealDb = require('./setupRealDb');
    await setupRealDb();
  });

  afterAll(async () => {
    await Worker.deleteMany({});
    await mongoose.connection.close();
  });

  test('password is hashed and comparePassword works; email lowercased', async () => {
    const workerData = {
      name: 'Hash Test',
      email: 'UPPERCASE@EXAMPLE.COM',
      password: 'Password123!',
      skills: 'testing'
    };

    const worker = new Worker(workerData);
    const saved = await worker.save();

    expect(saved.email).toBe('uppercase@example.com');
    expect(saved.password).not.toBe(workerData.password);

    const match = await saved.comparePassword(workerData.password);
    expect(match).toBe(true);
  });

  test('can add refresh token entry to refreshTokens array', async () => {
    const worker = new Worker({
      name: 'Token Test',
      email: `token${Date.now()}@example.com`,
      password: 'TokenPass123!',
      skills: 'tokens'
    });
    const saved = await worker.save();
    saved.refreshTokens.push({ token: 'dummy-token', device: 'unit-test' });
    await saved.save();

    const reloaded = await Worker.findById(saved._id);
    expect(reloaded.refreshTokens.length).toBeGreaterThanOrEqual(1);
    expect(reloaded.refreshTokens.some(t => t.device === 'unit-test')).toBe(true);
  });
});
