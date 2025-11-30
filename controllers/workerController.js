const Worker = require('../models/Worker');
const mongoose = require('mongoose');
const Job = require('../models/Job');
const MessageRequest = require('../models/MessageRequest');
const UserMessage = require('../models/UserMessage');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const axios = require('axios');

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
    });

    // Ensure a proper join timestamp is set (use Date object)
    try { worker.timeJoined = new Date(); } catch(e){ /* ignore */ }

    // If the client provided lat/lng in the signup payload, use it to set GeoJSON coords
    const lat = req.body && (req.body.lat || req.body.latitude || req.body.latitudef);
    const lng = req.body && (req.body.lng || req.body.longitude || req.body.longitudef);
    if (lat && lng && !isNaN(parseFloat(lat)) && !isNaN(parseFloat(lng))) {
      try{
        // Round coordinates to one decimal place (tenth) to preserve privacy
        const rlat = Math.round(parseFloat(lat) * 10) / 10
        const rlng = Math.round(parseFloat(lng) * 10) / 10
        worker.locationCoords = { type: 'Point', coordinates: [rlng, rlat] };
      }catch(e){ /* ignore invalid coords */ }
    } else {
      // Best-effort: try IP-based geolocation if running in non-localhost environment
      try {
        const ip = (req.headers['x-forwarded-for'] || req.connection?.remoteAddress || req.ip || '').split(',')[0].trim();
        if (ip && ip !== '127.0.0.1' && ip !== '::1' && !ip.startsWith('192.168.') && !ip.startsWith('10.') ) {
          // Call ipapi.co to get approximate lat/lon; this is non-critical and will not block signup on failure
          try {
            const geoRes = await axios.get(`https://ipapi.co/${ip}/json/`, { timeout: 3000 });
            if (geoRes && geoRes.data && geoRes.data.latitude && geoRes.data.longitude) {
              const plat = parseFloat(geoRes.data.latitude);
              const plong = parseFloat(geoRes.data.longitude);
              if (!isNaN(plat) && !isNaN(plong)) {
                worker.locationCoords = { type: 'Point', coordinates: [plong, plat] };
                // Prefer a human-readable location if available
                if (!worker.location && geoRes.data.city) worker.location = `${geoRes.data.city}${geoRes.data.region ? ', '+geoRes.data.region : ''}`;
              }
            }
          } catch(e) {
            // ignore geolocation failures
          }
        }
      } catch(e) { /* ignore IP parsing errors */ }
    }

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
    if (limit > 200) limit = 200;

    // Optional geolocation parameters to sort by distance
    const lat = req.query.lat ? parseFloat(req.query.lat) : null;
    const lng = req.query.lng ? parseFloat(req.query.lng) : null;
    // Optional radius in kilometers to limit geo results
    const radiusKm = req.query.radiusKm ? parseFloat(req.query.radiusKm) : null;

    // If lat/lng provided, use geoNear aggregation to sort by closeness and support pagination
    if (lat !== null && lng !== null && !Number.isNaN(lat) && !Number.isNaN(lng)) {
      try {
        const nearPoint = { type: 'Point', coordinates: [lng, lat] };
        // Build aggregation pipeline
        const pipeline = [];
        const geoNearOpts = {
          near: nearPoint,
          distanceField: 'distanceMeters',
          spherical: true,
          distanceMultiplier: 0.001, // meters -> kilometers
          query: { locationCoords: { $exists: true } }
        };
        // If a radius (in km) was provided, convert to meters and include as maxDistance
        if (radiusKm !== null && !Number.isNaN(radiusKm)) {
          geoNearOpts.maxDistance = Math.max(0, Number(radiusKm)) * 1000;
        }
        pipeline.push({ $geoNear: geoNearOpts });
        // Project desired fields
        pipeline.push({ $project: { name: 1, email:1, skills:1, location:1, locationCoords:1, distanceKm: '$distanceMeters', createdAt:1 } });
        // Pagination
        const skip = (page - 1) * limit;
        if(skip) pipeline.push({ $skip: skip });
        pipeline.push({ $limit: limit });

        const results = await Worker.aggregate(pipeline).allowDiskUse(true);
        // Normalize IDs and ensure distanceKm is present
        const normalized = results.map(w => ({ _id: w._id ? String(w._id) : null, name: w.name || (w.email||'').split('@')[0], email: w.email || null, skills: w.skills || '', location: w.location || null, locationCoords: w.locationCoords || null, distanceKm: typeof w.distanceKm === 'number' ? w.distanceKm : null, timeJoined: (w.createdAt && new Date(w.createdAt).toISOString()) || null }))
        // Try to get an approximate total count of workers with coords; fallback to results.length
        let totalCount = 0;
        try{ totalCount = await Worker.countDocuments({ locationCoords: { $exists: true } }) }catch(e){ totalCount = normalized.length }
        const totalPages = Math.max(1, Math.ceil(totalCount / limit));
        return sendResponse(res, 200, true, { workers: normalized, totalCount, totalPages, page });
      } catch (geoErr) {
        console.warn('Geo query failed, falling back to standard listing:', geoErr && geoErr.message ? geoErr.message : geoErr);
      }
    }

    // Prefer real DB-backed workers when possible (non-geo listing)
    try {
      const totalCount = await Worker.countDocuments({}).catch(() => 0);
      if (totalCount > 0) {
        const totalPages = Math.max(1, Math.ceil(totalCount / limit));
        const skip = (page - 1) * limit;
        const workersFromDb = await Worker.find({})
          .select('name skills createdAt email location locationCoords')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean();

        const normalized = workersFromDb.map(w => ({
          _id: w._id ? String(w._id) : null,
          name: w.name || (w.email || '').split('@')[0],
          email: w.email || null,
          skills: w.skills || '',
          location: w.location || null,
          locationCoords: w.locationCoords || null,
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
        _id: new mongoose.Types.ObjectId().toString(),
        name: "Bob Builder",
        email: 'bob.builder@example.test',
        skills: "Accomplished with every building tool ever.",
        timeJoined: new Date(Date.now() - 4320000000).toISOString()
      },
      {
        _id: new mongoose.Types.ObjectId().toString(),
        name: "Paula Vasebuilder",
        email: 'paula.vase@example.test',
        skills: "Vase-building",
        timeJoined: new Date(Date.now() - 8640000000).toISOString()
      },
      {
        _id: new mongoose.Types.ObjectId().toString(),
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

    // Populate reviews and compute avg rating when available
    // Attempt to identify the requesting user from Authorization header (optional)
    let viewerId = null;
    try{
      const authHeader = req.headers && req.headers.authorization;
      if(authHeader && authHeader.startsWith('Bearer ')){
        const token = authHeader.split(' ')[1];
        if(token){
          const decoded = require('jsonwebtoken').verify(token, JWT_ACCESS_SECRET);
          if(decoded && decoded.id) viewerId = String(decoded.id);
        }
      }
    }catch(e){ /* ignore token errors — treat as anonymous */ }

    const worker = await Worker.findById(id).select('-password -refreshTokens').lean();
    if (!worker) return sendResponse(res, 404, false, null, 'Worker not found');

    // Normalize output
    // Prepare a coarse location for non-owners (round to 1 decimal ~11km) so we can show imprecise distances
    let locationCoordsCoarse = null;
    try{
      if(worker.locationCoords && Array.isArray(worker.locationCoords.coordinates) && worker.locationCoords.coordinates.length === 2){
        const [lng, lat] = worker.locationCoords.coordinates.map(Number);
        if(!Number.isNaN(lat) && !Number.isNaN(lng)){
          const rlat = Math.round(lat * 10) / 10;
          const rlng = Math.round(lng * 10) / 10;
          locationCoordsCoarse = { type: 'Point', coordinates: [rlng, rlat] };
        }
      }
    }catch(e){ /* ignore */ }

    const normalized = {
      _id: worker._id,
      name: worker.name,
      email: worker.email,
      skills: worker.skills,
      timeJoined: worker.createdAt || worker.timeJoined,
      // Attach reviews and rating summary if included
      reviews: (worker.reviews || []).map(r => ({ reviewer: r.reviewer, rating: r.rating, comment: r.comment, createdAt: r.createdAt })),
      avgRating: worker.reviews && worker.reviews.length ? Math.round(((worker.reviews.reduce((s, r) => s + (r.rating||0), 0) / worker.reviews.length) * 10)) / 10 : null,
      reviewCount: (worker.reviews || []).length,
      // Only expose precise coords when the viewer is the same user
      location: worker.location || null,
      locationCoords: (viewerId && String(worker._id) === String(viewerId)) ? worker.locationCoords || null : null,
      // For non-owners expose a very coarse location (rounded) so clients can compute imprecise distances
      locationCoordsCoarse: (viewerId && String(worker._id) === String(viewerId)) ? null : locationCoordsCoarse
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

    // Allow changing certain editable fields. Email updates are supported but
    // validated and checked for duplicates to avoid accidental overwrite.
    const allowed = ['name', 'skills', 'password', 'location', 'phone'];
    const payload = {};
    allowed.forEach(f => { if (Object.prototype.hasOwnProperty.call(updateData, f)) payload[f] = updateData[f]; });
    // If email is provided, validate and apply it (normalize and check duplicates)
    if (Object.prototype.hasOwnProperty.call(updateData, 'email')) {
      const newEmail = String(updateData.email || '').toLowerCase().trim();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(newEmail)) {
        return sendResponse(res, 400, false, null, 'Invalid email format');
      }
      // Ensure no other worker has this email
      const conflict = await Worker.findOne({ email: newEmail, _id: { $ne: id } });
      if (conflict) {
        return sendResponse(res, 400, false, null, 'Email already registered');
      }
      payload.email = newEmail;
    }

    // Update and rely on pre-save hooks to hash password when necessary
    const worker = await Worker.findById(id);
    if (!worker) return sendResponse(res, 404, false, null, 'Worker not found');

    // Log incoming update payload for debugging coordinate updates
    try{ console.log('[UPDATE_WORKER] incoming updateData keys:', Object.keys(updateData || {}), 'sample:', { lat: updateData?.lat, lng: updateData?.lng, location: updateData?.location }); }catch(e){}

    Object.assign(worker, payload);

    // Accept lat/lng in update payload and set GeoJSON locationCoords
    const lat = updateData && (updateData.lat || updateData.latitude || updateData.latitudef);
    const lng = updateData && (updateData.lng || updateData.longitude || updateData.longitudef);
    if (lat !== undefined && lng !== undefined && !isNaN(parseFloat(lat)) && !isNaN(parseFloat(lng))) {
      try{
        // Round coordinates to one decimal place (tenth) to preserve privacy
        const rlat = Math.round(parseFloat(lat) * 10) / 10;
        const rlng = Math.round(parseFloat(lng) * 10) / 10;
        worker.locationCoords = { type: 'Point', coordinates: [rlng, rlat] };
        try{ console.log('[UPDATE_WORKER] setting locationCoords ->', worker.locationCoords); }catch(e){}
      }catch(e){ /* ignore invalid coords */ }
    }
    try{ await worker.save(); } catch(saveErr){
      if (saveErr.name === 'ValidationError'){
        const validationErrors = Object.values(saveErr.errors).map(err => err.message);
        return sendResponse(res, 400, false, null, validationErrors.join(', '));
      }
      throw saveErr;
    }

    // Re-fetch the saved worker to ensure nested fields (like locationCoords) are present and normalized
    let savedWorker = null;
    try{
      savedWorker = await Worker.findById(id).select('-password -refreshTokens').lean();
    }catch(e){ console.warn('[UPDATE_WORKER] failed to re-query saved worker', e && e.message)}

    const out = savedWorker || (worker.toObject && worker.toObject()) || null;
    try{ console.log('[UPDATE_WORKER] saved worker.locationCoords ->', out && out.locationCoords); }catch(e){}
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
    const startMs = Date.now();
    console.log('[DASHBOARD] getDashboard start for workerId=', String(req.workerId).slice(0,8));

    // Fetch worker and the main dashboard pieces in parallel where possible.
    // Use `lean()` and field projections to avoid Mongoose document hydration overhead.
    const workerPromise = Worker.findById(req.workerId).lean().select('name email skills location locationCoords createdAt timeJoined');

    const jobsPostedPromise = Job.find({ owner: req.workerId })
      .select('title description location status createdAt offer timeDue assignedTo')
      .sort({ createdAt: -1 })
      .lean();

    const jobsOthersPostedPromise = Job.find({ owner: { $ne: req.workerId } })
      .select('title description location status createdAt offer timeDue assignedTo')
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    const jobsAcceptedPromise = Job.find({ assignedTo: req.workerId })
      .select('title description location status createdAt offer timeDue owner')
      .sort({ createdAt: -1 })
      .lean();

    const messageRequestsPromise = MessageRequest.find({ receiver: req.workerId })
      .select('sender message status createdAt')
      .sort({ createdAt: -1 })
      .lean();

    const [worker, jobsPosted, jobsOthersPosted, jobsAccepted, messageRequests] = await Promise.all([
      workerPromise,
      jobsPostedPromise,
      jobsOthersPostedPromise,
      jobsAcceptedPromise,
      messageRequestsPromise
    ]);

    if (!worker) return sendResponse(res, 404, false, null, 'Worker not found');

    // Recent conversations: compute distinct peer IDs then fetch last message per peer (limit to 20 recent)
    const sent = await UserMessage.find({ sender: req.workerId }).distinct('receiver');
    const received = await UserMessage.find({ receiver: req.workerId }).distinct('sender');
    const userIds = Array.from(new Set([...sent, ...received])).slice(0, 20);
    console.log('[DASHBOARD] conversations count:', userIds.length);

    const recentConversations = await Promise.all(userIds.map(async (otherId) => {
      return UserMessage.findOne({
        $or: [
          { sender: req.workerId, receiver: otherId },
          { sender: otherId, receiver: req.workerId }
        ]
      }).sort({ createdAt: -1 }).populate('sender receiver', 'name email').lean();
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
      _id: worker._id,
      id: worker._id, // keep legacy 'id' field for older clients
      name: worker.name,
      email: worker.email,
      skills: worker.skills,
      location: worker.location || null,
      locationCoords: worker.locationCoords || null,
      // Provide createdAt/timeJoined so clients can show when the account joined
      createdAt: worker.createdAt || null,
      timeJoined: (worker.createdAt ? new Date(worker.createdAt).toISOString() : (worker.timeJoined || null))
    };

    // Create a JSON-safe version for quick logging (convert mongoose docs to plain objects)
    try {
      const safe = {
        dashboard: {
          jobsPosted: (jobsPosted || []).map(j => (j && j.toObject) ? j.toObject() : j),
          jobsOthersPosted: (jobsOthersPosted || []).map(j => (j && j.toObject) ? j.toObject() : j),
          jobsAccepted: (jobsAccepted || []).map(j => (j && j.toObject) ? j.toObject() : j),
          messageRequests: (messageRequests || []).map(m => (m && m.toObject) ? m.toObject() : m),
          recentConversations: (recentConversations || []).map(r => (r && r.toObject) ? r.toObject() : r)
        },
        worker: workerInfo
      };
      console.log('DASHBOARD_PAYLOAD: (safe summary) jobsPosted=', (jobsPosted||[]).length, 'jobsAccepted=', (jobsAccepted||[]).length, 'messageRequests=', (messageRequests||[]).length, 'recentConversations=', (recentConversations||[]).length);
    } catch (logErr) {
      console.warn('Failed to stringify dashboard payload for logging:', logErr && logErr.message ? logErr.message : logErr);
    }

    console.log('[DASHBOARD] total getDashboard duration:', Date.now()-startMs, 'ms');
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
    console.log('[DEMO_LOGIN] incoming body:', { body: req.body, ip: req.ip, ua: req.headers['user-agent'] });
    if (!email) return sendResponse(res, 400, false, null, 'Email is required');

    const demoEmail = String(email).toLowerCase().trim();
    const WorkerModel = Worker;

    let worker = await WorkerModel.findOne({ email: demoEmail });
    if (!worker) {
      // Create a lightweight demo account if missing. Use a random strong password (not used).
      const randomPassword = crypto.randomBytes(12).toString('hex');
      worker = new WorkerModel({ name: (demoEmail.split('@')[0] || 'Demo'), email: demoEmail, password: randomPassword, skills: 'Demo account' });
      try {
        console.log('[DEMO_LOGIN] creating demo worker object (before save):', { email: worker.email, name: worker.name, skills: worker.skills });
        await worker.save();
        console.log('[DEMO_LOGIN] demo worker created with id:', worker._id);
      } catch (saveErr) {
        console.error('[DEMO_LOGIN] Demo account save failed:', saveErr && saveErr.stack ? saveErr.stack : saveErr);
        if (saveErr && saveErr.name === 'ValidationError') {
          const validationErrors = Object.values(saveErr.errors).map(e => e.message).join(', ');
          console.error('[DEMO_LOGIN] Demo account validation failed:', validationErrors);
          return sendResponse(res, 400, false, null, `Demo account invalid: ${validationErrors}`);
        }
        return sendResponse(res, 500, false, null, 'Failed to create demo account');
      }
    }

    // Ensure a demo-seed refresh token exists and return tokens without checking password
    const { accessToken, refreshToken } = generateTokens(worker._id);
    try {
      // Remove prior demo-seed tokens and add a fresh one
      worker.refreshTokens = (worker.refreshTokens || []).filter(t => t.device !== 'demo-seed');
      worker.refreshTokens.push({ token: refreshToken, device: 'demo-seed' });
      console.log('[DEMO_LOGIN] saving demo refresh token for worker:', worker._id);
      await worker.save();
      console.log('[DEMO_LOGIN] refresh token saved for worker:', worker._id);
    } catch (tokErr) {
      console.error('[DEMO_LOGIN] Saving demo refresh token failed:', tokErr && tokErr.stack ? tokErr.stack : tokErr);
      if (tokErr && tokErr.name === 'ValidationError') {
        const validationErrors = Object.values(tokErr.errors).map(e => e.message).join(', ');
        console.error('[DEMO_LOGIN] Demo token save validation failed:', validationErrors);
        return sendResponse(res, 400, false, null, `Demo token save invalid: ${validationErrors}`);
      }
      return sendResponse(res, 500, false, null, 'Failed to store demo refresh token');
    }

    const workerResponse = worker.toObject();
    delete workerResponse.password;

    return sendResponse(res, 200, true, { worker: workerResponse, accessToken, refreshToken });
  } catch (error) {
    console.error('Demo login error:', error && error.stack ? error.stack : error);
    // Provide a friendly but informative error message in non-production
    const message = process.env.NODE_ENV === 'production' ? 'Demo login failed' : `Demo login error: ${error && error.message ? error.message : String(error)}`;
    return sendResponse(res, 500, false, null, message);
  }
};

// POST /api/workers/:id/reviews → Create a review for a worker (authenticated)
const postReview = async (req, res) => {
  try {
    const { id } = req.params;
    const reviewerId = req.workerId;
    if (!id) return sendResponse(res, 400, false, null, 'Worker ID is required');
    if (!reviewerId) return sendResponse(res, 401, false, null, 'Authentication required');

    // Prevent reviewing yourself
    if (reviewerId.toString() === id.toString()) return sendResponse(res, 403, false, null, 'Cannot review yourself');

    const { rating, comment } = req.body;
    const score = Number(rating);
    if (Number.isNaN(score) || score < 1 || score > 5) return sendResponse(res, 400, false, null, 'Rating must be a number between 1 and 5');

    const worker = await Worker.findById(id);
    if (!worker) return sendResponse(res, 404, false, null, 'Worker not found');

    // Append review subdocument
    worker.reviews = worker.reviews || [];
    worker.reviews.push({ reviewer: reviewerId, rating: score, comment: comment ? String(comment).trim() : '' });
    await worker.save();

    return sendResponse(res, 201, true, { message: 'Review submitted' });
  } catch (error) {
    console.error('postReview error:', error);
    return sendResponse(res, 500, false, null, 'Failed to submit review');
  }
};

// GET /api/workers/:id/reviews → List reviews for a worker (public)
const getReviews = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return sendResponse(res, 400, false, null, 'Worker ID is required');
    const worker = await Worker.findById(id).select('reviews').populate('reviews.reviewer', 'name email').lean();
    if (!worker) return sendResponse(res, 404, false, null, 'Worker not found');
    const reviews = (worker.reviews || []).map(r => ({ reviewer: r.reviewer ? { _id: r.reviewer._id, name: r.reviewer.name, email: r.reviewer.email } : null, rating: r.rating, comment: r.comment, createdAt: r.createdAt }));
    const avg = reviews.length ? Math.round((reviews.reduce((s, r) => s + (r.rating||0), 0) / reviews.length) * 10) / 10 : null;
    return sendResponse(res, 200, true, { reviews, avgRating: avg, reviewCount: reviews.length });
  } catch (error) {
    console.error('getReviews error:', error);
    return sendResponse(res, 500, false, null, 'Failed to retrieve reviews');
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
  getDashboard,
  postReview,
  getReviews
};