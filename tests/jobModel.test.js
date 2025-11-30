const mongoose = require('mongoose');
const Job = require('../models/Job');

describe('Job model methods (unit)', () => {
  beforeAll(async () => {
    const setupRealDb = require('./setupRealDb');
    await setupRealDb();
  });

  afterAll(async () => {
    await Job.deleteMany({});
    await mongoose.connection.close();
  });

  test('create job and offer setter formats to 2 decimals', async () => {
    const ownerId = new mongoose.Types.ObjectId();
    const job = new Job({
      owner: ownerId,
      title: 'Unit Test Job',
      description: 'Testing offer setter',
      location: 'Nowhere',
      offer: 10.129,
      timeDue: new Date(Date.now() + 1000 * 60 * 60 * 24)
    });

    const saved = await job.save();
    expect(saved.offer).toBeCloseTo(10.13, 2);
    expect(saved.status).toBe('open');
  });

  test('accept, start, complete lifecycle works and enforces state', async () => {
    const ownerId = new mongoose.Types.ObjectId();
    const workerId = new mongoose.Types.ObjectId();
    const job = new Job({
      owner: ownerId,
      title: 'Lifecycle Job',
      description: 'Testing lifecycle',
      location: 'Here',
      offer: 5,
      timeDue: new Date(Date.now() + 1000 * 60 * 60 * 24)
    });

    const saved = await job.save();

    // accept
    const accepted = await saved.accept(workerId);
    expect(accepted.status).toBe('assigned');
    expect(accepted.assignedTo.toString()).toBe(workerId.toString());

    // start
    const started = await accepted.start();
    expect(started.status).toBe('in-progress');

    // complete
    const completed = await started.complete();
    expect(completed.status).toBe('completed');
  });

  test('start throws when not assigned', async () => {
    const ownerId = new mongoose.Types.ObjectId();
    const job = new Job({
      owner: ownerId,
      title: 'Start Fail Job',
      description: 'Should not start',
      location: 'Here',
      offer: 12,
      timeDue: new Date(Date.now() + 1000 * 60 * 60 * 24)
    });
    const saved = await job.save();
    await expect(saved.start()).rejects.toThrow('Job must be assigned before starting');
  });

  test('complete throws when not in-progress', async () => {
    const ownerId = new mongoose.Types.ObjectId();
    const job = new Job({
      owner: ownerId,
      title: 'Complete Fail Job',
      description: 'Should not complete',
      location: 'Here',
      offer: 12,
      timeDue: new Date(Date.now() + 1000 * 60 * 60 * 24)
    });
    const saved = await job.save();
    await expect(saved.complete()).rejects.toThrow('Job must be in progress before completing');
  });

  test('cancel throws when job completed', async () => {
    const ownerId = new mongoose.Types.ObjectId();
    const job = new Job({
      owner: ownerId,
      title: 'Cancel Fail Job',
      description: 'Cannot cancel after complete',
      location: 'There',
      offer: 20,
      timeDue: new Date(Date.now() + 1000 * 60 * 60 * 24)
    });
    const saved = await job.save();
    // set to completed then try cancel
    saved.status = 'completed';
    await saved.save();
    await expect(saved.cancel()).rejects.toThrow('Cannot cancel a completed job');
  });
});
