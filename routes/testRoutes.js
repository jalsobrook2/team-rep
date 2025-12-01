/**
 * Test Routes for Error Monitoring
 * These routes are used to test Sentry integration and error alerting
 */
const express = require('express');
const router = express.Router();

/**
 * Test Error Endpoint 1 - Throws a simple error
 * GET /api/test-error
 */
router.get('/test-error', (req, res, next) => {
  const error = new Error('Test Error 1: This is a test error for Sentry monitoring');
  error.statusCode = 500;
  next(error);
});

/**
 * Test Error Endpoint 2 - Throws a critical error with additional context
 * GET /api/test-error-2
 * This specifically tests that Sentry captures and generates an alert
 */
router.get('/test-error-2', (req, res, next) => {
  const error = new Error('Test Error 2: Critical error for Sentry alert testing');
  error.statusCode = 500;
  error.context = {
    severity: 'critical',
    test: true,
    timestamp: new Date().toISOString()
  };
  
  // If Sentry is available, capture with extra context
  try {
    const Sentry = require('@sentry/node');
    Sentry.withScope((scope) => {
      scope.setLevel('error');
      scope.setTag('test_error', 'true');
      scope.setTag('error_type', 'test_error_2');
      scope.setContext('test_info', {
        purpose: 'Verify Sentry alert generation',
        endpoint: '/api/test-error-2',
        triggered_at: new Date().toISOString()
      });
      Sentry.captureException(error);
    });
  } catch (e) {
    console.log('Sentry not available, proceeding with standard error handling');
  }
  
  next(error);
});

/**
 * Test Async Error - Tests async error handling
 * GET /api/test-error-async
 */
router.get('/test-error-async', async (req, res, next) => {
  try {
    // Simulate async operation that fails
    await new Promise((resolve, reject) => {
      setTimeout(() => {
        reject(new Error('Test Async Error: Simulated async failure'));
      }, 100);
    });
  } catch (error) {
    error.statusCode = 500;
    next(error);
  }
});

/**
 * Test Frontend Error Capture
 * POST /api/log-frontend-error
 * Receives frontend errors and logs them to Sentry
 */
router.post('/log-frontend-error', (req, res) => {
  const { message, stack, componentStack, url, userAgent } = req.body;
  
  try {
    const Sentry = require('@sentry/node');
    Sentry.withScope((scope) => {
      scope.setLevel('error');
      scope.setTag('source', 'frontend');
      scope.setContext('frontend_error', {
        url,
        userAgent,
        componentStack
      });
      Sentry.captureMessage(message || 'Unknown frontend error', {
        extra: { stack, componentStack }
      });
    });
  } catch (e) {
    console.error('Failed to log frontend error to Sentry:', message);
  }
  
  res.json({ success: true, message: 'Error logged' });
});

/**
 * Health Check Endpoint
 * GET /api/health
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

module.exports = router;
