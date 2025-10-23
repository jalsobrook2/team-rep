const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const db = require('../config/database');
const { User } = db;
const { Op } = db.Sequelize;

// Helper function to generate JWT tokens
const generateTokens = (userId) => {
  const accessToken = jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
  );

  const refreshToken = jwt.sign(
    { userId },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
  );

  return { accessToken, refreshToken };
};

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

// POST /api/auth/register → Register a new user
const register = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendResponse(res, 400, false, null, {
        message: 'Validation failed',
        details: errors.array()
      });
    }

    const {
      username,
      email,
      password,
      firstName,
      lastName,
      phone,
      role,
      bio,
      skills,
      location,
      emergencyContact
    } = req.body;

    // Check if user already exists by email or username
    const existingUser = await User.findOne({
      where: {
        [Op.or]: [
          { email },
          { username }
        ]
      }
    });
    if (existingUser) {
      return sendResponse(res, 409, false, null, 'User with this email or username already exists');
    }

    // Create new user
    const newUser = await User.create({
      username,
      email,
      password, // Will be hashed by the model hook
      firstName,
      lastName,
      phone,
      role: role || 'both',
      bio,
      skills: skills || [],
      location,
      emergencyContact
    });

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(newUser.id);

    // Save refresh token to user
    newUser.refreshToken = refreshToken;
    await newUser.save();

    // Return success response (excluding password)
    sendResponse(res, 201, true, {
      message: 'User registered successfully',
      user: newUser.toSafeObject(),
      accessToken,
      refreshToken
    });

  } catch (error) {
    console.error('Registration error:', error);
    
    // Handle specific database errors
    if (error.name === 'SequelizeUniqueConstraintError') {
      return sendResponse(res, 409, false, null, 'Username or email already exists');
    }
    
    if (error.name === 'SequelizeValidationError') {
      return sendResponse(res, 400, false, null, {
        message: 'Validation failed',
        details: error.errors.map(err => ({
          field: err.path,
          message: err.message
        }))
      });
    }

    sendResponse(res, 500, false, null, 'Internal server error during registration');
  }
};

// POST /api/auth/login → Login user
const login = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendResponse(res, 400, false, null, {
        message: 'Validation failed',
        details: errors.array()
      });
    }

    const { identifier, password } = req.body; // identifier can be email or username

    // Find user by email or username
    const user = await User.findByEmailOrUsername(identifier);
    if (!user) {
      return sendResponse(res, 401, false, null, 'Invalid credentials');
    }

    // Check if user is active
    if (!user.isActive) {
      return sendResponse(res, 403, false, null, 'Account is deactivated');
    }

    // Validate password
    const isPasswordValid = await user.validatePassword(password);
    if (!isPasswordValid) {
      return sendResponse(res, 401, false, null, 'Invalid credentials');
    }

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user.id);

    // Update user's refresh token and last login
    user.refreshToken = refreshToken;
    user.lastLogin = new Date();
    await user.save();

    sendResponse(res, 200, true, {
      message: 'Login successful',
      user: user.toSafeObject(),
      accessToken,
      refreshToken
    });

  } catch (error) {
    console.error('Login error:', error);
    sendResponse(res, 500, false, null, 'Internal server error during login');
  }
};

// POST /api/auth/refresh → Refresh access token
const refreshToken = async (req, res) => {
  try {
    const { refreshToken: token } = req.body;

    if (!token) {
      return sendResponse(res, 401, false, null, 'Refresh token required');
    }

    // Verify refresh token
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    
    // Find user and verify refresh token matches
    const user = await User.findByPk(decoded.userId);
    if (!user || user.refreshToken !== token) {
      return sendResponse(res, 403, false, null, 'Invalid refresh token');
    }

    // Check if user is still active
    if (!user.isActive) {
      return sendResponse(res, 403, false, null, 'Account is deactivated');
    }

    // Generate new tokens
    const { accessToken, refreshToken: newRefreshToken } = generateTokens(user.id);

    // Update user's refresh token
    user.refreshToken = newRefreshToken;
    await user.save();

    sendResponse(res, 200, true, {
      accessToken,
      refreshToken: newRefreshToken
    });

  } catch (error) {
    console.error('Token refresh error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return sendResponse(res, 403, false, null, 'Invalid refresh token');
    }
    
    if (error.name === 'TokenExpiredError') {
      return sendResponse(res, 403, false, null, 'Refresh token expired');
    }

    sendResponse(res, 500, false, null, 'Internal server error during token refresh');
  }
};

// POST /api/auth/logout → Logout user
const logout = async (req, res) => {
  try {
    const userId = req.user.id; // Set by auth middleware

    // Clear refresh token from database
    const user = await User.findByPk(userId);
    if (user) {
      user.refreshToken = null;
      await user.save();
    }

    sendResponse(res, 200, true, {
      message: 'Logout successful'
    });

  } catch (error) {
    console.error('Logout error:', error);
    sendResponse(res, 500, false, null, 'Internal server error during logout');
  }
};

// GET /api/auth/me → Get current user profile
const getProfile = async (req, res) => {
  try {
    const userId = req.user.id; // Set by auth middleware

    const user = await User.findByPk(userId);
    if (!user) {
      return sendResponse(res, 404, false, null, 'User not found');
    }

    sendResponse(res, 200, true, {
      user: user.toSafeObject()
    });

  } catch (error) {
    console.error('Get profile error:', error);
    sendResponse(res, 500, false, null, 'Internal server error');
  }
};

// PUT /api/auth/profile → Update user profile
const updateProfile = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendResponse(res, 400, false, null, {
        message: 'Validation failed',
        details: errors.array()
      });
    }

    const userId = req.user.id;
    const updates = req.body;

    // Remove sensitive fields that shouldn't be updated via this endpoint
    delete updates.password;
    delete updates.refreshToken;
    delete updates.isVerified;
    delete updates.verificationLevel;

    const user = await User.findByPk(userId);
    if (!user) {
      return sendResponse(res, 404, false, null, 'User not found');
    }

    // Update user
    await user.update(updates);

    sendResponse(res, 200, true, {
      message: 'Profile updated successfully',
      user: user.toSafeObject()
    });

  } catch (error) {
    console.error('Update profile error:', error);
    
    if (error.name === 'SequelizeValidationError') {
      return sendResponse(res, 400, false, null, {
        message: 'Validation failed',
        details: error.errors.map(err => ({
          field: err.path,
          message: err.message
        }))
      });
    }

    sendResponse(res, 500, false, null, 'Internal server error');
  }
};

// POST /api/auth/change-password → Change user password
const changePassword = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendResponse(res, 400, false, null, {
        message: 'Validation failed',
        details: errors.array()
      });
    }

    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    const user = await User.findByPk(userId);
    if (!user) {
      return sendResponse(res, 404, false, null, 'User not found');
    }

    // Verify current password
    const isCurrentPasswordValid = await user.validatePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return sendResponse(res, 400, false, null, 'Current password is incorrect');
    }

    // Update password (will be hashed by model hook)
    user.password = newPassword;
    user.refreshToken = null; // Invalidate all refresh tokens
    await user.save();

    sendResponse(res, 200, true, {
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('Change password error:', error);
    sendResponse(res, 500, false, null, 'Internal server error');
  }
};

module.exports = {
  register,
  login,
  refreshToken,
  logout,
  getProfile,
  updateProfile,
  changePassword
};