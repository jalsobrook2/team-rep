const express = require('express');
const router = express.Router();
const {
  createWorker,
  loginWorker,
  logoutWorker,
  refreshToken
} = require('../controllers/workerController');
const authMiddleware = require('../middleware/auth');

// POST /api/auth/signup → Create a new account
router.post('/signup', createWorker);

// POST /api/auth/login → Login to account
router.post('/login', loginWorker);

// POST /api/auth/logout → Logout from account (protected route)
router.post('/logout', authMiddleware, logoutWorker);

// POST /api/auth/refresh → Refresh access token
router.post('/refresh', refreshToken);

module.exports = router;