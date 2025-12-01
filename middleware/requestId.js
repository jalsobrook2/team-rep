/**
 * Request ID Middleware
 * Adds a unique request ID to each request for error correlation and tracing
 */
const crypto = require('crypto');

/**
 * Generate a UUID v4 using Node.js crypto module
 * @returns {string} UUID v4 string
 */
function generateUUID() {
  return crypto.randomUUID ? crypto.randomUUID() : 
    'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
}

const requestId = (req, res, next) => {
  // Use existing request ID from header or generate a new one
  req.requestId = req.headers['x-request-id'] || generateUUID();
  
  // Set the request ID in response headers for client correlation
  res.setHeader('X-Request-ID', req.requestId);
  
  next();
};

module.exports = requestId;
