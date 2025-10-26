const Worker = require('../models/Worker');
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

    // Validate email format
    const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
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

    // Validate email format
    const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
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
    // For now, return placeholder response
    // TODO: Implement database logic
    
    const sampleWorkers = [
      {
        id: "worker-1",
        name: "Bob Builder",
        skills: "Accomplished with every building tool ever.",
        timeJoined: new Date(Date.now - 4320000000).toISOString
      },
      {
        id: "worker-2",
        name: "Paula Vasebuilder",
        skills: "Vase-building",
        timeJoined: new Date(Date.now - 8640000000).toISOString
      },
      {
        id: "worker-3",
        name: "Mr. Unemployed",
        skills: "N/A",
        timeJoined: new Date(Date.now - 864000000).toISOString
      }
    ];

    sendResponse(res, 200, true, {
      workers: sampleWorkers,
      count: sampleWorkers.length
    });
  } catch (error) {
    sendResponse(res, 500, false, null, "Failed to retrieve workers");
  }
};

// GET /api/workers/:id → Get a specific workers by ID
const getWorkerById = async (req, res) => {
  try {
    const { id } = req.params;
    
    // For now, return placeholder response
    // TODO: Implement database logic
    
    if (!id) {
      return sendResponse(res, 400, false, null, "Worker ID is required");
    }

    const sampleWorker = {
        id: id,
        name: "Sample Name",
        skills: "Sample Skills",
        timeJoined: new Date().toISOString
    };

    sendResponse(res, 200, true, {
      worker: sampleWorker
    });
  } catch (error) {
    sendResponse(res, 500, false, null, "Failed to retrieve worker");
  }
};

// PUT /api/worker/:id → Update a worker by ID
const updateWorker = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    // For now, return placeholder response
    // TODO: Implement database logic
    
    if (!id) {
      return sendResponse(res, 400, false, null, "Worker ID is required");
    }

    const updatedWorker = {
      id: id,
      name: updateData.name || "Updated Name",
      skills: updateData.skills || "Updated Skills",
      timeJoined: new Date().toISOString
    };

    sendResponse(res, 200, true, {
      worker: "Worker updated successfully",
      workerData: updatedWorker
    });
  } catch (error) {
    sendResponse(res, 500, false, null, "Failed to update worker");
  }
};

// DELETE /api/workers/:id → Delete a worker by ID
const deleteWorker = async (req, res) => {
  try {
    const { id } = req.params;
    
    // For now, return placeholder response
    // TODO: Implement database logic
    
    if (!id) {
      return sendResponse(res, 400, false, null, "Worker ID is required");
    }

    sendResponse(res, 200, true, {
      worker: `Worker with ID ${id} deleted successfully`,
      deletedId: id
    });
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
      .select('title status createdAt offer timeDue assignedTo')
      .sort({ createdAt: -1 });

    // Jobs posted by others
    const jobsOthersPosted = await Job.find({ owner: { $ne: worker._id } })
      .select('title status createdAt offer timeDue assignedTo')
      .sort({ createdAt: -1 });

    // Jobs accepted by this user
    const jobsAccepted = await Job.find({ assignedTo: worker._id })
      .select('title status createdAt offer timeDue owner')
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

    sendResponse(res, 200, true, { dashboard: dashboardData });
  } catch (error) {
    console.error('Dashboard shell retrieval error:', error);
    sendResponse(res, 500, false, null, "Failed to retrieve dashboard shell data");
  }
};

module.exports = {
  createWorker,
  loginWorker,
  logoutWorker,
  refreshToken,
  getAllWorkers,
  getWorkerById,
  updateWorker,
  deleteWorker,
  sendResponse,
  getDashboard
};