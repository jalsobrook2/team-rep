const Worker = require('../models/Worker');
const mongoose = require('mongoose');
const Job = require('../models/Job');
const MessageRequest = require('../models/MessageRequest');
const UserMessage = require('../models/UserMessage');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// JWT Configuration
const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'your-access-secret-key';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key';
const ACCESS_TOKEN_EXPIRY = '1h';  // Access token expires in 1 hour
const REFRESH_TOKEN_EXPIRY = '30d'; // Refresh token expires in 30 days

// Helper function to generate tokens
const generateTokens = (workerId) => {
    const accessToken = jwt.sign(
        { id: workerId },
        JWT_ACCESS_SECRET,
        { expiresIn: ACCESS_TOKEN_EXPIRY }
    );

    const refreshToken = jwt.sign(
        { id: workerId },
        JWT_REFRESH_SECRET,
        { expiresIn: REFRESH_TOKEN_EXPIRY }
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

// POST /api/workers → Create a new worker account
const createWorker = async (req, res) => {
  try {
    const { name, email, password, skills } = req.body;

    // Validate required fields
    if (!name || !email || !password || !skills) {
      return sendResponse(res, 400, false, null, "All fields (name, email, password, skills) are required");
    }

    // Validate email format — allow modern TLDs (longer than 3 chars)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return sendResponse(res, 400, false, null, "Invalid email format");
    }

    // Validate password length
    if (password.length < 8) {
      return sendResponse(res, 400, false, null, "Password must be at least 8 characters long");
    }

    // Check if worker with email already exists
    const existingWorker = await Worker.findOne({ email });
    if (existingWorker) {
      return sendResponse(res, 400, false, null, "Email already registered");
    }

    // Create new worker
    const worker = new Worker({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      skills: skills.trim(),
      learningProgress: []
    });

    try {
      await worker.save();
    } catch (saveError) {
      if (saveError.name === 'ValidationError') {
        const validationErrors = Object.values(saveError.errors).map(err => err.message);
        return sendResponse(res, 400, false, null, validationErrors.join(', '));
      }
      throw saveError;
    }

    // Remove password from response
    const workerResponse = worker.toObject();
    delete workerResponse.password;

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(worker._id);

    // Store refresh token in database
    worker.refreshTokens.push({
      token: refreshToken,
      device: req.headers['user-agent'] || 'Unknown Device'
    });
    await worker.save();

    sendResponse(res, 201, true, {
      message: "Account created successfully",
      worker: workerResponse,
      accessToken,
      refreshToken
    });
  } catch (error) {
    console.error('Create worker error:', error);
    sendResponse(res, 500, false, null, "An unexpected error occurred while creating account");
  }
};

// POST /api/auth/refresh → Refresh access token
const refreshToken = async (req, res) => {
  try {
    // Get refresh token from request body or cookie
    const providedRefreshToken = (req.body && req.body.refreshToken) || req.cookies?.refreshToken;
    if (!providedRefreshToken) {
      return sendResponse(res, 401, false, null, "No refresh token provided");
    }

        try {
            // Verify refresh token
            const decoded = jwt.verify(providedRefreshToken, JWT_REFRESH_SECRET);
            
            // Find worker and check if refresh token exists
            const worker = await Worker.findOne({
                _id: decoded.id,
                'refreshTokens.token': providedRefreshToken
            });

            if (!worker) {
                return sendResponse(res, 401, false, null, "Invalid refresh token");
            }

            // Generate new access token and new refresh token (rotation)
            const { accessToken, refreshToken: newRefreshToken } = generateTokens(worker._id);

            // Remove old refresh token and add new one
            worker.refreshTokens = worker.refreshTokens.filter(t => t.token !== providedRefreshToken);
            worker.refreshTokens.push({
                token: newRefreshToken,
                device: req.headers['user-agent'] || 'Unknown Device'
            });
            await worker.save();

            sendResponse(res, 200, true, { accessToken, refreshToken: newRefreshToken });
        } catch (tokenError) {
            if (tokenError.name === 'TokenExpiredError') {
                return sendResponse(res, 401, false, null, "Refresh token has expired");
            }
            throw tokenError;
        }
    } catch (error) {
        console.error('Token refresh error:', error);
        sendResponse(res, 500, false, null, "Error refreshing access token");
    }
};

// POST /api/auth/logout → Logout worker
const logoutWorker = async (req, res) => {
  try {
    // Get refresh token from request body or cookie
    const refreshToken = req.body.refreshToken || req.cookies.refreshToken;
    
    if (!refreshToken) {
      return sendResponse(res, 400, false, null, "No refresh token provided");
    }

    // Find the worker and remove the refresh token
    const worker = await Worker.findById(req.workerId);
    if (!worker) {
      return sendResponse(res, 404, false, null, "Worker not found");
    }

    // Remove the specific refresh token
    worker.refreshTokens = worker.refreshTokens.filter(t => t.token !== refreshToken);
    await worker.save();

    // Clear the refresh token cookie
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    });

    sendResponse(res, 200, true, { message: "Logged out successfully" });
  } catch (error) {
    console.error('Logout error:', error);
    sendResponse(res, 500, false, null, "An error occurred during logout");
  }
};

// POST /api/auth/login → Login worker
const loginWorker = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
      return sendResponse(res, 400, false, null, "Email and password are required");
    }

    // Validate email format — allow modern TLDs
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return sendResponse(res, 400, false, null, "Invalid email format");
    }

    // Find worker by email
    const worker = await Worker.findOne({ email: email.toLowerCase().trim() });
    if (!worker) {
      return sendResponse(res, 401, false, null, "Invalid email or password");
    }

    try {
      // Check password
      const isMatch = await worker.comparePassword(password);
      if (!isMatch) {
        return sendResponse(res, 401, false, null, "Invalid email or password");
      }
    } catch (passwordError) {
      console.error('Password comparison error:', passwordError);
      return sendResponse(res, 500, false, null, "Error verifying credentials");
    }

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(worker._id);

    // Store refresh token in database
    worker.refreshTokens.push({
      token: refreshToken,
      device: req.headers['user-agent'] || 'Unknown Device'
    });
    await worker.save();

    // Remove password from response
    const workerResponse = worker.toObject();
    delete workerResponse.password;

    sendResponse(res, 200, true, {
      worker: workerResponse,
      accessToken,
      refreshToken
    });
  } catch (error) {
    console.error('Login error:', error);
    sendResponse(res, 500, false, null, "An unexpected error occurred during login");
  }
};


const getAllWorkers = async (req, res) => {
  try {
    // Support pagination via query params
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    let limit = Math.max(1, parseInt(req.query.limit || '6', 10));
    if (limit > 50) limit = 50;

    // Prefer real DB-backed workers when possible
    try {
      const totalCount = await Worker.countDocuments({}).catch(() => 0);
      if (totalCount > 0) {
        const totalPages = Math.max(1, Math.ceil(totalCount / limit));
        const skip = (page - 1) * limit;
        const workersFromDb = await Worker.find({})
          .select('name skills createdAt email')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean();

        const normalized = workersFromDb.map(w => ({
          _id: w._id ? w._id.toString() : mongoose.Types.ObjectId().toString(),
          name: w.name || (w.email || '').split('@')[0],
          email: w.email || null,
          skills: w.skills || '',
          timeJoined: (w.createdAt && new Date(w.createdAt).toISOString()) || new Date().toISOString()
        }));

        console.log(`Returning ${normalized.length} workers from DB (page ${page}/${totalPages})`);
        return sendResponse(res, 200, true, { workers: normalized, totalCount, totalPages, page });
      }
    } catch (dbErr) {
      // Log DB query errors and fall back to sample workers
      console.warn('Failed to query workers collection (pagination), falling back to sample data:', dbErr && dbErr.message ? dbErr.message : dbErr);
    }

    // If DB wasn't available or returned no workers, return stable sample workers (with basic emails)
    const sampleWorkers = [
      {
        _id: mongoose.Types.ObjectId().toString(),
        name: "Bob Builder",
        email: 'bob.builder@example.test',
        skills: "Accomplished with every building tool ever.",
        timeJoined: new Date(Date.now() - 4320000000).toISOString()
      },
      {
        _id: mongoose.Types.ObjectId().toString(),
        name: "Paula Vasebuilder",
        email: 'paula.vase@example.test',
        skills: "Vase-building",
        timeJoined: new Date(Date.now() - 8640000000).toISOString()
      },
      {
        _id: mongoose.Types.ObjectId().toString(),
        name: "Mr. Unemployed",
        email: 'no.reply@example.test',
        skills: "N/A",
        timeJoined: new Date(Date.now() - 864000000).toISOString()
      }
    ];

    const totalCount = sampleWorkers.length;
    const totalPages = Math.max(1, Math.ceil(totalCount / limit));

    console.log('Serving sample workers (fallback):', sampleWorkers.map(w => ({ _id: w._id, name: w.name })) );

    return sendResponse(res, 200, true, { workers: sampleWorkers, totalCount, totalPages, page });
  } catch (error) {
    console.error('getAllWorkers unexpected error:', error && error.message ? error.message : error);
    return sendResponse(res, 500, false, null, "Failed to retrieve workers");
  }
};

// GET /api/workers/:id → Get a specific workers by ID
const getWorkerById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return sendResponse(res, 400, false, null, 'Worker ID is required');

    const worker = await Worker.findById(id).select('-password -refreshTokens').lean();
    if (!worker) return sendResponse(res, 404, false, null, 'Worker not found');

    // Normalize output
    const normalized = {
      _id: worker._id,
      name: worker.name,
      email: worker.email,
      skills: worker.skills,
      timeJoined: worker.createdAt || worker.timeJoined
    };

    sendResponse(res, 200, true, { worker: normalized });
  } catch (error) {
    sendResponse(res, 500, false, null, "Failed to retrieve worker");
  }
};

// PUT /api/worker/:id → Update a worker by ID
const updateWorker = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    if (!id) return sendResponse(res, 400, false, null, 'Worker ID is required');

    // Only the owner may update their profile
    if (!req.workerId || req.workerId.toString() !== id.toString()) {
      return sendResponse(res, 403, false, null, 'Not authorized to update this worker');
    }

    const allowed = ['name', 'skills', 'email', 'password'];
    const payload = {};
    allowed.forEach(f => { if (Object.prototype.hasOwnProperty.call(updateData, f)) payload[f] = updateData[f]; });

    // If email is provided, normalize
    if (payload.email) payload.email = payload.email.toLowerCase().trim();

    // Update and rely on pre-save hooks to hash password when necessary
    const worker = await Worker.findById(id);
    if (!worker) return sendResponse(res, 404, false, null, 'Worker not found');

    Object.assign(worker, payload);
    try{ await worker.save(); } catch(saveErr){
      if (saveErr.name === 'ValidationError'){
        const validationErrors = Object.values(saveErr.errors).map(err => err.message);
        return sendResponse(res, 400, false, null, validationErrors.join(', '));
      }
      throw saveErr;
    }

    const out = worker.toObject(); delete out.password; delete out.refreshTokens;
    sendResponse(res, 200, true, { message: 'Worker updated successfully', worker: out });
  } catch (error) {
    sendResponse(res, 500, false, null, "Failed to update worker");
  }
};

// DELETE /api/workers/:id → Delete a worker by ID
const deleteWorker = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return sendResponse(res, 400, false, null, 'Worker ID is required');

    // Only the owner may delete their account
    if (!req.workerId || req.workerId.toString() !== id.toString()) {
      return sendResponse(res, 403, false, null, 'Not authorized to delete this worker');
    }

    const worker = await Worker.findById(id);
    if (!worker) return sendResponse(res, 404, false, null, 'Worker not found');

    await Worker.findByIdAndDelete(id);
    sendResponse(res, 200, true, { message: `Worker with ID ${id} deleted successfully`, deletedId: id });
  } catch (error) {
    sendResponse(res, 500, false, null, "Failed to delete worker");
  }
};

// GET /api/workers/dashboard → Get user dashboard shell
const getDashboard = async (req, res) => {
  try {
    // Get worker from database using the ID from the auth middleware
    const worker = await Worker.findById(req.workerId);
    if (!worker) {
      return sendResponse(res, 404, false, null, "Worker not found");
    }

    // Jobs posted by this user
    const jobsPosted = await Job.find({ owner: worker._id })
      .select('title description location status createdAt offer timeDue assignedTo')
      .populate('assignedTo', 'name email')
      .sort({ createdAt: -1 });

    // Jobs posted by others
    const jobsOthersPosted = await Job.find({ owner: { $ne: worker._id } })
      .select('title description location status createdAt offer timeDue assignedTo')
      .sort({ createdAt: -1 });

    // Jobs accepted by this user
    const jobsAccepted = await Job.find({ assignedTo: worker._id })
      .select('title description location status createdAt offer timeDue owner')
      .populate('owner', 'name email')
      .sort({ createdAt: -1 });

    // Message requests for this user
    const messageRequests = await MessageRequest.find({ receiver: worker._id })
      .select('sender message status createdAt')
      .populate('sender', 'name email')
      .sort({ createdAt: -1 });

    // Recent conversations for this user
    const sent = await UserMessage.find({ sender: worker._id }).distinct('receiver');
    const received = await UserMessage.find({ receiver: worker._id }).distinct('sender');
    const userIds = Array.from(new Set([...sent, ...received]));
    const recentConversations = await Promise.all(userIds.map(async (otherId) => {
      const lastMsg = await UserMessage.findOne({
        $or: [
          { sender: worker._id, receiver: otherId },
          { sender: otherId, receiver: worker._id }
        ]
      }).sort({ createdAt: -1 }).populate('sender receiver', 'name email');
      return lastMsg;
    }));

    const dashboardData = {
      jobsPosted,
      jobsOthersPosted,
      jobsAccepted,
      messageRequests,
      recentConversations: recentConversations.filter(Boolean)
    };

    // Include basic worker info in the dashboard response so UIs can display name/email
    const workerInfo = {
      id: worker._id,
      name: worker.name,
      email: worker.email,
      skills: worker.skills
    };

    sendResponse(res, 200, true, { dashboard: dashboardData, worker: workerInfo });
  } catch (error) {
    console.error('Dashboard shell retrieval error:', error);
    sendResponse(res, 500, false, null, "Failed to retrieve dashboard shell data");
  }
};

// (module.exports moved to end of file)

// POST /api/auth/demo-login → Issue tokens for a demo account without password
const demoLogin = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return sendResponse(res, 400, false, null, 'Email is required');

    const demoEmail = email.toLowerCase().trim();
    const WorkerModel = Worker;

    let worker = await WorkerModel.findOne({ email: demoEmail });
    if (!worker) {
      // Create a lightweight demo account if missing. Use a random strong password (not used).
      const randomPassword = crypto.randomBytes(12).toString('hex');
      worker = new WorkerModel({ name: (demoEmail.split('@')[0] || 'Demo'), email: demoEmail, password: randomPassword, skills: 'Demo account' });
      await worker.save();
    }

    // Ensure a demo-seed refresh token exists and return tokens without checking password
    const { accessToken, refreshToken } = generateTokens(worker._id);
    // Remove prior demo-seed tokens and add a fresh one
    worker.refreshTokens = worker.refreshTokens?.filter(t => t.device !== 'demo-seed') || [];
    worker.refreshTokens.push({ token: refreshToken, device: 'demo-seed' });
    await worker.save();

    const workerResponse = worker.toObject();
    delete workerResponse.password;

    return sendResponse(res, 200, true, { worker: workerResponse, accessToken, refreshToken });
  } catch (error) {
    console.error('Demo login error:', error);
    return sendResponse(res, 500, false, null, 'Demo login failed');
  }
};

module.exports = {
  createWorker,
  loginWorker,
  logoutWorker,
  refreshToken,
  demoLogin,
  getAllWorkers,
  getWorkerById,
  updateWorker,
  deleteWorker,
  sendResponse,
  getDashboard
};