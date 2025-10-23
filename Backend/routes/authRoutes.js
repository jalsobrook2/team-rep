const express = require('express');
const router = express.Router();

// Import controllers
const {
  register,
  login,
  refreshToken,
  logout,
  getProfile,
  updateProfile,
  changePassword
} = require('../controllers/authController');

// Import middleware
const {
  authenticateToken,
  requireRole,
  authRateLimit
} = require('../middleware/auth');

const {
  validateRegistration,
  validateLogin,
  validateRefreshToken,
  validateProfileUpdate,
  validatePasswordChange
} = require('../middleware/validation');

// Public routes (no authentication required)

// POST /api/auth/register → Register a new user
router.post('/register', 
  authRateLimit,
  validateRegistration, 
  register
);

// POST /api/auth/login → Login user
router.post('/login', 
  authRateLimit,
  validateLogin, 
  login
);

// POST /api/auth/refresh → Refresh access token
router.post('/refresh', 
  authRateLimit,
  validateRefreshToken, 
  refreshToken
);

// Protected routes (authentication required)

// POST /api/auth/logout → Logout user
router.post('/logout', 
  authenticateToken, 
  logout
);

// GET /api/auth/me → Get current user profile
router.get('/me', 
  authenticateToken, 
  getProfile
);

// PUT /api/auth/profile → Update user profile
router.put('/profile', 
  authenticateToken,
  validateProfileUpdate,
  updateProfile
);

// POST /api/auth/change-password → Change user password
router.post('/change-password', 
  authenticateToken,
  validatePasswordChange,
  changePassword
);

module.exports = router;