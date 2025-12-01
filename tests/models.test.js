/**
 * Unit tests for Model validations
 */
const mongoose = require('mongoose');

let mongoServer;

beforeAll(async () => {
  // In CI, use the external MongoDB service; locally use mongodb-memory-server
  const useExternal = !!process.env.MONGODB_URI_TEST || process.env.CI === 'true';
  
  if (useExternal) {
    const uri = process.env.MONGODB_URI_TEST || 'mongodb://localhost:27017/backend-example-test';
    await mongoose.connect(uri);
  } else {
    const { MongoMemoryServer } = require('mongodb-memory-server');
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  }
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

// Import models after connection
const Worker = require('../models/Worker');
const Job = require('../models/Job');

describe('Worker Model Validation', () => {
  afterEach(async () => {
    await Worker.deleteMany({});
  });

  it('should create a valid worker', async () => {
    const worker = new Worker({
      name: 'Test Worker',
      email: 'test@example.com',
      password: 'Password123!',
      skills: 'JavaScript, Node.js'
    });
    
    const saved = await worker.save();
    expect(saved._id).toBeDefined();
    expect(saved.name).toBe('Test Worker');
    expect(saved.email).toBe('test@example.com');
  });

  it('should require email field', async () => {
    const worker = new Worker({
      name: 'Test Worker',
      password: 'Password123!'
    });
    
    await expect(worker.save()).rejects.toThrow();
  });

  it('should require name field', async () => {
    const worker = new Worker({
      email: 'test@example.com',
      password: 'Password123!'
    });
    
    await expect(worker.save()).rejects.toThrow();
  });

  it('should require password field', async () => {
    const worker = new Worker({
      name: 'Test Worker',
      email: 'test@example.com'
    });
    
    await expect(worker.save()).rejects.toThrow();
  });

  it('should hash password before saving', async () => {
    const plainPassword = 'Password123!';
    const worker = new Worker({
      name: 'Test Worker',
      email: 'hash@example.com',
      password: plainPassword,
      skills: 'Testing'
    });
    
    const saved = await worker.save();
    expect(saved.password).not.toBe(plainPassword);
    expect(saved.password.startsWith('$2')).toBe(true); // bcrypt hash
  });

  it('should enforce unique email', async () => {
    await Worker.create({
      name: 'First Worker',
      email: 'unique@example.com',
      password: 'Password123!',
      skills: 'First'
    });
    
    const duplicate = new Worker({
      name: 'Second Worker',
      email: 'unique@example.com',
      password: 'Password456!',
      skills: 'Second'
    });
    
    await expect(duplicate.save()).rejects.toThrow();
  });

  it('should initialize refreshTokens as empty array', async () => {
    const worker = new Worker({
      name: 'Token Test',
      email: 'tokens@example.com',
      password: 'Password123!',
      skills: 'Tokens'
    });
    
    const saved = await worker.save();
    expect(saved.refreshTokens).toEqual([]);
  });
});

describe('Job Model Validation', () => {
  let testWorker;

  beforeAll(async () => {
    testWorker = await Worker.create({
      name: 'Job Owner',
      email: 'owner@example.com',
      password: 'Password123!',
      skills: 'Management'
    });
  });

  afterEach(async () => {
    await Job.deleteMany({});
  });

  afterAll(async () => {
    await Worker.deleteMany({});
  });

  it('should create a valid job', async () => {
    const job = new Job({
      title: 'Test Job',
      description: 'This is a test job description',
      location: 'Remote',
      offer: 100,
      owner: testWorker._id,
      timeDue: new Date(Date.now() + 86400000) // 1 day from now
    });
    
    const saved = await job.save();
    expect(saved._id).toBeDefined();
    expect(saved.title).toBe('Test Job');
    expect(saved.status).toBe('open');
  });

  it('should require title field', async () => {
    const job = new Job({
      description: 'Description only',
      location: 'Remote',
      offer: 100,
      owner: testWorker._id
    });
    
    await expect(job.save()).rejects.toThrow();
  });

  it('should require owner field', async () => {
    const job = new Job({
      title: 'No Owner Job',
      description: 'Description',
      location: 'Remote',
      offer: 100
    });
    
    await expect(job.save()).rejects.toThrow();
  });

  it('should default status to open', async () => {
    const job = new Job({
      title: 'Status Test',
      description: 'Testing default status',
      location: 'Remote',
      offer: 50,
      owner: testWorker._id,
      timeDue: new Date(Date.now() + 86400000)
    });
    
    const saved = await job.save();
    expect(saved.status).toBe('open');
  });

  it('should accept valid status values', async () => {
    const statuses = ['open', 'in-progress', 'completed', 'cancelled'];
    
    for (const status of statuses) {
      const job = new Job({
        title: `Job ${status}`,
        description: `Testing ${status} status`,
        location: 'Remote',
        offer: 50,
        owner: testWorker._id,
        status,
        timeDue: new Date(Date.now() + 86400000)
      });
      
      const saved = await job.save();
      expect(saved.status).toBe(status);
    }
  });

  it('should initialize applicants as empty array', async () => {
    const job = new Job({
      title: 'Applicants Test',
      description: 'Testing applicants array',
      location: 'Remote',
      offer: 75,
      owner: testWorker._id,
      timeDue: new Date(Date.now() + 86400000)
    });
    
    const saved = await job.save();
    expect(saved.applicants).toEqual([]);
  });

  it('should store timestamps', async () => {
    const job = new Job({
      title: 'Timestamp Test',
      description: 'Testing timestamps',
      location: 'Remote',
      offer: 60,
      owner: testWorker._id,
      timeDue: new Date(Date.now() + 86400000)
    });
    
    const saved = await job.save();
    expect(saved.createdAt).toBeDefined();
    expect(saved.updatedAt).toBeDefined();
  });
});
