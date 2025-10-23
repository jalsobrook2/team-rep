const jwt = require('jsonwebtoken');
const db = require('../config/database');
const { User } = db;

// Helper function to send standardized responses
const sendResponse = (res, statusCode, success, data = null, error = null) => {
  const response = { success };
  
  if (success && data !== null) {
    response.data = data;
  }
  
  if (!success && error) {
    response.error = error;
  }
  
  return res.status(statusCode).json(response);
};

// Middleware to verify JWT token
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return sendResponse(res, 401, false, null, 'Access token required');
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user from database
    const user = await User.findByPk(decoded.userId);
    if (!user) {
      return sendResponse(res, 401, false, null, 'Invalid token: user not found');
    }

    // Check if user is active
    if (!user.isActive) {
      return sendResponse(res, 403, false, null, 'Account is deactivated');
    }

    // Attach user to request object
    req.user = user;
    next();

  } catch (error) {
    console.error('Authentication error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return sendResponse(res, 403, false, null, 'Invalid access token');
    }
    
    if (error.name === 'TokenExpiredError') {
      return sendResponse(res, 403, false, null, 'Access token expired');
    }

    return sendResponse(res, 500, false, null, 'Internal server error during authentication');
  }
};

// Middleware to check user roles
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return sendResponse(res, 401, false, null, 'Authentication required');
    }

    const userRole = req.user.role;
    
    // If user has 'both' role, they can access any endpoint
    if (userRole === 'both' || roles.includes(userRole)) {
      return next();
    }

    return sendResponse(res, 403, false, null, `Access denied. Required role: ${roles.join(' or ')}`);
  };
};

// Middleware to check if user owns the resource
const requireOwnership = (resourceIdParam = 'id', userIdField = 'ownerId') => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return sendResponse(res, 401, false, null, 'Authentication required');
      }

      const resourceId = req.params[resourceIdParam];
      const userId = req.user.id;

      // The specific ownership check would depend on the resource
      // This is a generic middleware that can be customized per route
      req.resourceId = resourceId;
      req.userId = userId;
      
      next();

    } catch (error) {
      console.error('Ownership check error:', error);
      return sendResponse(res, 500, false, null, 'Internal server error during ownership check');
    }
  };
};

// Middleware to check verification level
const requireVerification = (minLevel = 'email') => {
  const verificationLevels = {
    'none': 0,
    'email': 1,
    'phone': 2,
    'id': 3,
    'background': 4
  };

  return (req, res, next) => {
    if (!req.user) {
      return sendResponse(res, 401, false, null, 'Authentication required');
    }

    const userLevel = verificationLevels[req.user.verificationLevel] || 0;
    const requiredLevel = verificationLevels[minLevel] || 0;

    if (userLevel < requiredLevel) {
      return sendResponse(res, 403, false, null, `Verification level '${minLevel}' required`);
    }

    next();
  };
};

// Optional authentication middleware (for routes that work with or without auth)
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      // No token provided, continue without user
      req.user = null;
      return next();
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user from database
    const user = await User.findByPk(decoded.userId);
    if (user && user.isActive) {
      req.user = user;
    } else {
      req.user = null;
    }

    next();

  } catch (error) {
    // If token is invalid, continue without user
    req.user = null;
    next();
  }
};

// Rate limiting middleware for auth endpoints
const authRateLimit = (req, res, next) => {
  // This would integrate with a rate limiting library like express-rate-limit
  // For now, we'll just pass through
  next();
};

module.exports = {
  authenticateToken,
  requireRole,
  requireOwnership,
  requireVerification,
  optionalAuth,
  authRateLimit
};