/**
 * Unit tests for middleware functions
 */
const request = require('supertest');
const express = require('express');

// Import middleware
const asyncHandler = require('../middleware/asyncHandler');
const requestId = require('../middleware/requestId');
const { authLimiter, apiLimiter } = require('../middleware/rateLimiter');

describe('Middleware Unit Tests', () => {
  describe('asyncHandler', () => {
    it('should pass through successful async operations', async () => {
      const app = express();
      app.get('/test', asyncHandler(async (req, res) => {
        res.json({ success: true });
      }));

      const response = await request(app).get('/test');
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should catch async errors and pass to error handler', async () => {
      const app = express();
      app.get('/test', asyncHandler(async (req, res) => {
        throw new Error('Test error');
      }));
      app.use((err, req, res, next) => {
        res.status(500).json({ error: err.message });
      });

      const response = await request(app).get('/test');
      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Test error');
    });

    it('should handle rejected promises', async () => {
      const app = express();
      app.get('/test', asyncHandler(async (req, res) => {
        return Promise.reject(new Error('Promise rejected'));
      }));
      app.use((err, req, res, next) => {
        res.status(500).json({ error: err.message });
      });

      const response = await request(app).get('/test');
      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Promise rejected');
    });
  });

  describe('requestId', () => {
    it('should add requestId to request object', async () => {
      const app = express();
      app.use(requestId);
      app.get('/test', (req, res) => {
        res.json({ requestId: req.requestId });
      });

      const response = await request(app).get('/test');
      expect(response.status).toBe(200);
      expect(response.body.requestId).toBeDefined();
      expect(typeof response.body.requestId).toBe('string');
    });

    it('should set X-Request-ID header in response', async () => {
      const app = express();
      app.use(requestId);
      app.get('/test', (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app).get('/test');
      expect(response.headers['x-request-id']).toBeDefined();
    });

    it('should use existing X-Request-ID header if provided', async () => {
      const app = express();
      app.use(requestId);
      app.get('/test', (req, res) => {
        res.json({ requestId: req.requestId });
      });

      const customId = 'custom-request-id-123';
      const response = await request(app)
        .get('/test')
        .set('X-Request-ID', customId);
      
      expect(response.body.requestId).toBe(customId);
    });

    it('should generate UUID format request IDs', async () => {
      const app = express();
      app.use(requestId);
      app.get('/test', (req, res) => {
        res.json({ requestId: req.requestId });
      });

      const response = await request(app).get('/test');
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      expect(response.body.requestId).toMatch(uuidRegex);
    });
  });

  describe('rateLimiter', () => {
    it('authLimiter should be a function', () => {
      expect(typeof authLimiter).toBe('function');
    });

    it('apiLimiter should be a function', () => {
      expect(typeof apiLimiter).toBe('function');
    });

    it('should allow requests under the limit', async () => {
      const app = express();
      app.use(apiLimiter);
      app.get('/test', (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app).get('/test');
      expect(response.status).toBe(200);
    });
  });
});

describe('Validation Middleware', () => {
  const { 
    signupValidation, 
    loginValidation, 
    createJobValidation,
    handleValidationErrors 
  } = require('../middleware/validation');

  describe('signupValidation', () => {
    it('should reject invalid email', async () => {
      const app = express();
      app.use(express.json());
      app.post('/test', signupValidation, (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .post('/test')
        .send({ 
          email: 'notanemail', 
          password: 'Password123!', 
          name: 'Test User' 
        });
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should reject short password', async () => {
      const app = express();
      app.use(express.json());
      app.post('/test', signupValidation, (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .post('/test')
        .send({ 
          email: 'test@example.com', 
          password: 'short', 
          name: 'Test User' 
        });
      
      expect(response.status).toBe(400);
    });

    it('should accept valid signup data', async () => {
      const app = express();
      app.use(express.json());
      app.post('/test', signupValidation, (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .post('/test')
        .send({ 
          email: 'test@example.com', 
          password: 'Password123!', 
          name: 'Test User' 
        });
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('loginValidation', () => {
    it('should reject missing password', async () => {
      const app = express();
      app.use(express.json());
      app.post('/test', loginValidation, (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .post('/test')
        .send({ email: 'test@example.com' });
      
      expect(response.status).toBe(400);
    });

    it('should accept valid login data', async () => {
      const app = express();
      app.use(express.json());
      app.post('/test', loginValidation, (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .post('/test')
        .send({ 
          email: 'test@example.com', 
          password: 'anypassword' 
        });
      
      expect(response.status).toBe(200);
    });
  });

  describe('createJobValidation', () => {
    it('should reject short title', async () => {
      const app = express();
      app.use(express.json());
      app.post('/test', createJobValidation, (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .post('/test')
        .send({ 
          title: 'AB', 
          description: 'This is a valid description for the job',
          location: 'Remote',
          offer: 100
        });
      
      expect(response.status).toBe(400);
    });

    it('should accept valid job data', async () => {
      const app = express();
      app.use(express.json());
      app.post('/test', createJobValidation, (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .post('/test')
        .send({ 
          title: 'Test Job Title', 
          description: 'This is a valid description for the job posting',
          location: 'Remote Work',
          offer: 150
        });
      
      expect(response.status).toBe(200);
    });
  });
});
