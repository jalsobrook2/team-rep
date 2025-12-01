/**
 * Rate Limiting Middleware
 * Protects endpoints from brute force attacks
 */
const rateLimit = require('express-rate-limit');

// Check if we're in test/CI environment - skip rate limiting there
const isTestEnv = process.env.NODE_ENV === 'test' || 
                  process.env.CI === 'true' || 
                  process.env.CYPRESS === 'true';

// Rate limiter for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isTestEnv ? 10000 : 20, // Higher limit for testing
  message: {
    success: false,
    error: 'Too many authentication attempts. Please try again in 15 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isTestEnv, // Skip rate limiting in test environment
});

// General API rate limiter
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: isTestEnv ? 10000 : 100, // Higher limit for testing
  message: {
    success: false,
    error: 'Too many requests. Please slow down.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isTestEnv, // Skip rate limiting in test environment
});

// Strict limiter for sensitive operations
const strictLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: isTestEnv ? 10000 : 10, // Higher limit for testing
  message: {
    success: false,
    error: 'Rate limit exceeded for this action. Please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isTestEnv, // Skip rate limiting in test environment
});

module.exports = { authLimiter, apiLimiter, strictLimiter };
