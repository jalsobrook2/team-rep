const Job = require('../models/Job');
const Worker = require('../models/Worker');
const { distanceKm } = require('../utils/geo');
const { geocodeAddress } = require('../utils/geocode');

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

// POST /api/jobs → Create a new job
const createJob = async (req, res) => {
  try {
    const { title, description, location, offer, timeDue, coordinates, recurring } = req.body;
    
    // Validate required fields
    if (!title || !description || !location || !offer) {
      return sendResponse(res, 400, false, null, "All fields (title, description, location, offer) are required");
    }

    // Create new job
    const jobData = {
      owner: req.workerId, // From auth middleware
      title,
      description,
      location,
      offer: parseFloat(offer),
      timeDue: timeDue || new Date(Date.now() + 86400000)
    };

    // Accept recurring metadata if supplied
    if (recurring && typeof recurring === 'object') {
      // build recurring object only with provided values to avoid invalid enum/null issues
      const rec = { enabled: !!recurring.enabled };
      if (recurring.frequency) rec.frequency = recurring.frequency;
      rec.interval = recurring.interval && Number(recurring.interval) > 0 ? Number(recurring.interval) : 1;
      if (recurring.endDate) rec.endDate = new Date(recurring.endDate);
      jobData.recurring = rec;
    }

    // Accept coordinates in either { lat, lng } or [lng, lat]
    if (coordinates) {
      try {
        let lng, lat;
        if (Array.isArray(coordinates) && coordinates.length === 2) {
          lng = parseFloat(coordinates[0]);
          lat = parseFloat(coordinates[1]);
        } else if (typeof coordinates === 'object') {
          lat = parseFloat(coordinates.lat || coordinates.latitude);
          lng = parseFloat(coordinates.lng || coordinates.longitude || coordinates.lon);
        }
        if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
          jobData.locationCoords = { type: 'Point', coordinates: [lng, lat] };
        }
      } catch (coordErr) {
        console.warn('Invalid coordinates provided for job create:', coordErr && coordErr.message ? coordErr.message : coordErr);
      }
    }

    // If no coordinates were provided but we have a textual location, attempt to geocode it
    if (!jobData.locationCoords && jobData.location) {
      try {
        // Allow disabling external geocoding during tests by setting DISABLE_GEOCODING=true
        if (process.env.DISABLE_GEOCODING !== 'true') {
          const geo = await geocodeAddress(jobData.location);
          if (geo && !Number.isNaN(geo.lat) && !Number.isNaN(geo.lon)) {
            jobData.locationCoords = { type: 'Point', coordinates: [parseFloat(geo.lon), parseFloat(geo.lat)] };
          }
        }
      } catch (gerr) {
        console.warn('Geocoding failed for job location:', gerr && gerr.message ? gerr.message : gerr);
      }
    }

    const job = new Job(jobData);

    await job.save();

    // Add job to worker's posted jobs (idempotent)
    await Worker.findByIdAndUpdate(req.workerId, {
      $addToSet: { postedJobs: job._id }
    });

    // Remove sensitive information and include distance if user coordinates provided later
    const jobResponse = job.toObject();

    sendResponse(res, 201, true, {
      message: "Job created successfully",
      job: jobResponse
    });
  } catch (error) {
    console.error('Create job error:', error);
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return sendResponse(res, 400, false, null, validationErrors.join(', '));
    }
    sendResponse(res, 500, false, null, "An unexpected error occurred while creating job");
  }
};

// POST /api/jobs/:id/accept → Accept a job
const acceptJob = async (req, res) => {
  try {
    console.log('[ACCEPT_JOB] request params:', { params: req.params, workerId: req.workerId, ip: req.ip });
    const { id } = req.params;

    // Find the job
    const job = await Job.findById(id);
    if (!job) {
      return sendResponse(res, 404, false, null, "Job not found");
    }

    // Check if job is already assigned
    if (job.status !== 'open') {
      return sendResponse(res, 400, false, null, "Job is not available for acceptance");
    }

    // Prevent owner from accepting their own job
    if (job.owner && job.owner.toString() === req.workerId.toString()) {
      return sendResponse(res, 403, false, null, 'Owners cannot accept their own jobs');
    }

    // Update job status
    job.status = 'assigned';
    job.assignedTo = req.workerId;
    try {
      await job.save();
    } catch (saveErr) {
      console.error('[ACCEPT_JOB] failed to save job:', saveErr && saveErr.stack ? saveErr.stack : saveErr);
      return sendResponse(res, 500, false, null, 'Failed to persist job assignment');
    }

    // Add job to worker's accepted jobs (idempotent)
    try{
      await Worker.findByIdAndUpdate(req.workerId, {
        $addToSet: { acceptedJobs: job._id }
      });
    } catch (updErr) {
      console.error('[ACCEPT_JOB] failed to update worker acceptedJobs:', updErr && updErr.stack ? updErr.stack : updErr);
      // Attempt to roll back job assignment if worker update failed
      try{ job.assignedTo = null; job.status = 'open'; await job.save(); }catch(rollbackErr){ console.error('[ACCEPT_JOB] rollback failed:', rollbackErr && rollbackErr.stack ? rollbackErr.stack : rollbackErr); }
      return sendResponse(res, 500, false, null, 'Failed to update worker record for accepted job');
    }

    // Send a quick user message to the owner notifying them who accepted the job
    try {
      const UserMessage = require('../models/UserMessage');
      const accepter = await Worker.findById(req.workerId).select('name email');
      if (accepter && job.owner) {
        const ownerId = job.owner;
        const content = `${accepter.name || accepter.email || 'A worker'} has accepted your job: "${job.title}".`;
        await UserMessage.create({ sender: req.workerId, receiver: ownerId, content });
      }
    } catch (msgErr) {
      console.warn('Failed to send owner notification message:', msgErr && msgErr.message ? msgErr.message : msgErr);
    }

    sendResponse(res, 200, true, {
      message: "Job accepted successfully",
      job: job.toObject()
    });
  } catch (error) {
    console.error('Accept job error:', error);
    sendResponse(res, 500, false, null, "An unexpected error occurred while accepting job");
  }
};

// POST /api/jobs/:id/kick → Owner unassigns the worker from the job (kick off)
const kickWorker = async (req, res) => {
  try {
    const { id } = req.params;
    const job = await Job.findById(id);
    if (!job) return sendResponse(res, 404, false, null, 'Job not found');

    // Only owner may kick assigned worker
    if (job.owner.toString() !== req.workerId.toString()) {
      return sendResponse(res, 403, false, null, 'Only the owner can remove the assigned worker');
    }

    if (!job.assignedTo) {
      return sendResponse(res, 400, false, null, 'No worker is currently assigned to this job');
    }

    const kickedWorkerId = job.assignedTo;

    // Unassign and set status back to open
    job.assignedTo = null;
    job.status = 'open';
    await job.save();

    // Remove from worker's acceptedJobs
    await Worker.findByIdAndUpdate(kickedWorkerId, { $pull: { acceptedJobs: job._id } });

    // Notify the kicked worker via a user message
    try {
      const UserMessage = require('../models/UserMessage');
      const owner = await Worker.findById(req.workerId).select('name email');
      const content = `${owner.name || owner.email || 'The owner'} has unassigned you from job: "${job.title}".`;
      await UserMessage.create({ sender: req.workerId, receiver: kickedWorkerId, content });
    } catch (msgErr) {
      console.warn('Failed to send unassign notification message:', msgErr && msgErr.message ? msgErr.message : msgErr);
    }

    sendResponse(res, 200, true, { message: 'Worker removed from job', job: job.toObject() });
  } catch (error) {
    console.error('Kick worker error:', error);
    sendResponse(res, 500, false, null, 'Failed to remove assigned worker');
  }
};

// POST /api/jobs/:id/unassign-self → Worker removes themselves from a job
const unassignSelf = async (req, res) => {
  try {
    const { id } = req.params;
    const job = await Job.findById(id);
    if (!job) return sendResponse(res, 404, false, null, 'Job not found');

    // Check if the worker is assigned to this job
    if (!job.assignedTo || job.assignedTo.toString() !== req.workerId.toString()) {
      return sendResponse(res, 403, false, null, 'You are not assigned to this job');
    }

    // Unassign and set status back to open
    job.assignedTo = null;
    job.status = 'open';
    await job.save();

    // Remove from worker's acceptedJobs
    await Worker.findByIdAndUpdate(req.workerId, { $pull: { acceptedJobs: job._id } });

    // Notify the owner via a user message
    try {
      const UserMessage = require('../models/UserMessage');
      const worker = await Worker.findById(req.workerId).select('name email');
      const content = `${worker.name || worker.email || 'A worker'} has removed themselves from job: "${job.title}". The job is now available again.`;
      await UserMessage.create({ sender: req.workerId, receiver: job.owner, content });
    } catch (msgErr) {
      console.warn('Failed to send owner notification message:', msgErr && msgErr.message ? msgErr.message : msgErr);
    }

    sendResponse(res, 200, true, { message: 'Successfully removed from job', job: job.toObject() });
  } catch (error) {
    console.error('unassignSelf error:', error);
    sendResponse(res, 500, false, null, 'Failed to remove yourself from job');
  }
};

// POST /api/jobs/:id/apply → Worker applies to a job (adds to applicants list)
const applyJob = async (req, res) => {
  try {
    const { id } = req.params;
    const job = await Job.findById(id);
    if (!job) return sendResponse(res, 404, false, null, 'Job not found');

    if (job.owner && job.owner.toString() === req.workerId.toString()) {
      return sendResponse(res, 403, false, null, 'Owner cannot apply to their own job');
    }

    // Prevent duplicate applications
    const already = (job.applicants || []).some(a => a.toString() === req.workerId.toString());
    if (already) return sendResponse(res, 200, true, { message: 'Already applied' });

    job.applicants = job.applicants || [];
    job.applicants.push(req.workerId);
    await job.save();

    sendResponse(res, 200, true, { message: 'Applied to job', job: job.toObject() });
  } catch (error) {
    console.error('Apply job error:', error);
    sendResponse(res, 500, false, null, 'Failed to apply to job');
  }
};

// POST /api/jobs/:id/assign → Owner assigns a specific applicant to the job
const assignWorker = async (req, res) => {
  try {
    const { id } = req.params;
    const { workerId } = req.body;
    if (!workerId) return sendResponse(res, 400, false, null, 'workerId is required');

    const job = await Job.findById(id);
    if (!job) return sendResponse(res, 404, false, null, 'Job not found');

    if (job.owner.toString() !== req.workerId.toString()) {
      return sendResponse(res, 403, false, null, 'Only the owner can assign a worker to this job');
    }

    // Ensure the worker applied or allow owner to assign anyway
    const applied = (job.applicants || []).some(a => a.toString() === workerId.toString());

    // Assign
    job.assignedTo = workerId;
    job.status = 'assigned';

    // Remove assigned worker from applicants list
    job.applicants = (job.applicants || []).filter(a => a.toString() !== workerId.toString());

    await job.save();

    // Update worker's acceptedJobs
    await Worker.findByIdAndUpdate(workerId, { $addToSet: { acceptedJobs: job._id } });

    // Notify the assigned worker
    try {
      const UserMessage = require('../models/UserMessage');
      const owner = await Worker.findById(req.workerId).select('name email');
      const content = `${owner.name || owner.email || 'The owner'} has assigned you to job: "${job.title}".`;
      await UserMessage.create({ sender: req.workerId, receiver: workerId, content });
    } catch (msgErr) {
      console.warn('Failed to send assignment notification message:', msgErr && msgErr.message ? msgErr.message : msgErr);
    }

    sendResponse(res, 200, true, { message: 'Worker assigned', job: job.toObject(), applied });
  } catch (error) {
    console.error('Assign worker error:', error);
    sendResponse(res, 500, false, null, 'Failed to assign worker');
  }
};

// GET /api/jobs → Get all jobs
const getAllJobs = async (req, res) => {
  try {
    // Support query params: status, owner, assignedTo, search, page, limit, sort
    const { status, owner, assignedTo, search, page = 1, limit = 25, sort = '-createdAt', userLat, userLng } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (owner) filter.owner = owner;
    if (assignedTo) filter.assignedTo = assignedTo;
    if (search) filter.$or = [
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
      { location: { $regex: search, $options: 'i' } }
    ];

    const skip = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);
    const [jobs, count] = await Promise.all([
      Job.find(filter)
        .populate('owner', 'name skills')
        .populate('assignedTo', 'name skills')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit, 10)),
      Job.countDocuments(filter)
    ]);

    // If the client provided their coordinates, compute distance for each job.
    // Otherwise, if the request is authenticated and the worker has profile
    // coordinates, use those as a fallback so signed-in users see distances
    // for the regular job listing as well.
    let uLat = parseFloat(userLat);
    let uLng = parseFloat(userLng);
    let includeDistance = !(Number.isNaN(uLat) || Number.isNaN(uLng));
    if (!includeDistance && req && req.workerId) {
      try {
        const profile = await Worker.findById(req.workerId).select('locationCoords');
        if (profile && profile.locationCoords && Array.isArray(profile.locationCoords.coordinates) && profile.locationCoords.coordinates.length === 2) {
          const [plng, plat] = profile.locationCoords.coordinates.map(Number);
          if (!Number.isNaN(plat) && !Number.isNaN(plng)) {
            uLat = plat;
            uLng = plng;
            includeDistance = true;
          }
        }
      } catch (pfErr) {
        console.warn('Failed to read worker profile coords for listing distance:', pfErr && pfErr.message ? pfErr.message : pfErr);
      }
    }

    const jobsWithDistance = jobs.map(j => {
      const obj = j.toObject();
      if (includeDistance && obj.locationCoords && Array.isArray(obj.locationCoords.coordinates) && obj.locationCoords.coordinates.length === 2) {
        const [lng, lat] = obj.locationCoords.coordinates.map(Number);
        const d = distanceKm(uLat, uLng, lat, lng);
        obj.distanceKm = d === null ? null : Math.round(d * 100) / 100; // round to 2 decimals
      } else {
        obj.distanceKm = null;
      }
      return obj;
    });

    sendResponse(res, 200, true, { jobs: jobsWithDistance, count, page: parseInt(page, 10), limit: parseInt(limit, 10) });
  } catch (error) {
    console.error('Get all jobs error:', error);
    sendResponse(res, 500, false, null, "Failed to retrieve jobs");
  }
};

// GET /api/jobs/:id → Get a specific job by ID
const getJobById = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id) return sendResponse(res, 400, false, null, 'Job ID is required');

    const job = await Job.findById(id)
      .populate('owner', 'name email skills')
      .populate('assignedTo', 'name email skills');

    if (!job) return sendResponse(res, 404, false, null, 'Job not found');

    sendResponse(res, 200, true, { job });
  } catch (error) {
    console.error('Get job by id error:', error);
    sendResponse(res, 500, false, null, "Failed to retrieve job");
  }
};

// GET /api/jobs/near → Find jobs within given radius (km) of supplied coordinates
const getJobsNear = async (req, res) => {
  try {
    const { lat, lng, radiusKm = 5, page = 1, limit = 25 } = req.query;

    // If client did not supply lat/lng, but the request is authenticated and the
    // worker has profile coordinates, use those as a fallback so signed-in users
    // can query nearby jobs without granting browser geolocation.
    let uLat = lat ? parseFloat(lat) : NaN;
    let uLng = lng ? parseFloat(lng) : NaN;

    // Attempt to decode an optional Authorization Bearer token so this public route
    // can still use profile coordinates when the client is authenticated.
    let authWorkerId = null;
    try {
      const authHeader = req.headers && req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        const decoded = require('jsonwebtoken').verify(token, process.env.JWT_ACCESS_SECRET || 'your-access-secret-key');
        if (decoded && decoded.id) authWorkerId = String(decoded.id);
      }
    } catch (authErr) {
      // ignore invalid/expired tokens — we'll treat the request as anonymous
    }

    // If coordinates missing from query, attempt to use authenticated worker's profile coords.
    const effectiveWorkerId = authWorkerId || req.workerId;
    if ((Number.isNaN(uLat) || Number.isNaN(uLng)) && effectiveWorkerId) {
      try {
        const profile = await Worker.findById(effectiveWorkerId).select('locationCoords');
        const hasProfileCoords = profile && profile.locationCoords && Array.isArray(profile.locationCoords.coordinates) && profile.locationCoords.coordinates.length === 2;
        console.log('[GET_JOBS_NEAR] no client coords; workerId present:', !!effectiveWorkerId, 'hasProfileCoords:', !!hasProfileCoords, 'workerId:', effectiveWorkerId ? String(effectiveWorkerId).slice(0,8) : '<none>');
        if (hasProfileCoords) {
          const [plng, plat] = profile.locationCoords.coordinates.map(Number);
          if (!Number.isNaN(plat) && !Number.isNaN(plng)) {
            uLat = plat;
            uLng = plng;
            console.log('[GET_JOBS_NEAR] using profile coords for worker', effectiveWorkerId ? String(effectiveWorkerId).slice(0,8) : '<none>', 'lat:', uLat, 'lng:', uLng);
          }
        }
      } catch (pfErr) {
        console.warn('Failed to read worker profile coords for nearby fallback:', pfErr && pfErr.message ? pfErr.message : pfErr);
      }
    }

    // If still missing coords, return helpful 400 and log context to aid debugging
    if (Number.isNaN(uLat) || Number.isNaN(uLng)) {
      console.warn('[GET_JOBS_NEAR] missing coordinates: client lat/lng absent and no profile coords available. workerId:', req.workerId || '<none>');
      return sendResponse(res, 400, false, null, 'lat and lng are required');
    }
    const rKm = parseFloat(radiusKm);
    if (Number.isNaN(uLat) || Number.isNaN(uLng) || Number.isNaN(rKm)) {
      return sendResponse(res, 400, false, null, 'Invalid numeric parameters');
    }

    const radiusMeters = Math.max(0, rKm) * 1000;

    const skip = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);

    const jobs = await Job.find({
      locationCoords: {
        $near: {
          $geometry: { type: 'Point', coordinates: [uLng, uLat] },
          $maxDistance: radiusMeters
        }
      }
    })
      .populate('owner', 'name skills')
      .populate('assignedTo', 'name skills')
      .skip(skip)
      .limit(parseInt(limit, 10));

    // Attach distance for convenience
    const jobsWithDistance = jobs.map(j => {
      const obj = j.toObject();
      if (obj.locationCoords && Array.isArray(obj.locationCoords.coordinates) && obj.locationCoords.coordinates.length === 2) {
        const [lng, lat] = obj.locationCoords.coordinates.map(Number);
        const d = distanceKm(uLat, uLng, lat, lng);
        obj.distanceKm = d === null ? null : Math.round(d * 100) / 100;
      } else {
        obj.distanceKm = null;
      }
      return obj;
    });

    sendResponse(res, 200, true, { jobs: jobsWithDistance, page: parseInt(page, 10), limit: parseInt(limit, 10) });
  } catch (error) {
    console.error('getJobsNear error:', error);
    sendResponse(res, 500, false, null, 'Failed to query nearby jobs');
  }
};

// PUT /api/jobs/:id → Update a job by ID
const updateJob = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    if (!id) return sendResponse(res, 400, false, null, 'Job ID is required');

    const job = await Job.findById(id);
    if (!job) return sendResponse(res, 404, false, null, 'Job not found');

    // Only owner can update certain fields
    if (job.owner.toString() !== req.workerId.toString()) {
      return sendResponse(res, 403, false, null, 'Only the owner can update this job');
    }

    // Do not allow updates when job is not open
    if (job.status !== 'open') {
      return sendResponse(res, 400, false, null, 'Only open jobs can be edited');
    }

    const allowed = ['title', 'description', 'location', 'offer', 'timeDue', 'recurring'];
    allowed.forEach(field => {
      if (!Object.prototype.hasOwnProperty.call(updateData, field)) return;
      if (field === 'recurring' && updateData.recurring && typeof updateData.recurring === 'object') {
        // Merge recurring settings safely
        job.recurring = job.recurring || {};
        const r = updateData.recurring;
        job.recurring.enabled = typeof r.enabled === 'boolean' ? r.enabled : !!job.recurring.enabled;
        if (r.frequency) job.recurring.frequency = r.frequency;
        if (r.interval) job.recurring.interval = Number(r.interval) || job.recurring.interval || 1;
        if (r.endDate) job.recurring.endDate = new Date(r.endDate);
        // allow clearing endDate explicitly
        if (r.endDate === null) job.recurring.endDate = null;
      } else if (field !== 'recurring') {
        job[field] = updateData[field];
      }
    });

    await job.save();
    sendResponse(res, 200, true, { message: 'Job updated successfully', job });
  } catch (error) {
    console.error('Update job error:', error);
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return sendResponse(res, 400, false, null, validationErrors.join(', '));
    }
    sendResponse(res, 500, false, null, "Failed to update job");
  }
};

// DELETE /api/jobs/:id → Delete a job by ID
const deleteJob = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id) return sendResponse(res, 400, false, null, 'Job ID is required');

    const job = await Job.findById(id);
    if (!job) return sendResponse(res, 404, false, null, 'Job not found');

    // Only owner can delete
    if (job.owner.toString() !== req.workerId.toString()) {
      return sendResponse(res, 403, false, null, 'Only the owner can delete this job');
    }

    // Remove job
    await Job.findByIdAndDelete(id);

    // Remove from owner's postedJobs
    await Worker.findByIdAndUpdate(job.owner, { $pull: { postedJobs: job._id } });

    // If assigned, remove from assigned worker's acceptedJobs
    if (job.assignedTo) {
      await Worker.findByIdAndUpdate(job.assignedTo, { $pull: { acceptedJobs: job._id } });
    }

    sendResponse(res, 200, true, { message: `Job with ID ${id} deleted successfully`, deletedId: id });
  } catch (error) {
    console.error('Delete job error:', error);
    sendResponse(res, 500, false, null, "Failed to delete job");
  }
};

// exports are declared at the end to ensure functions are defined

// POST /api/jobs/:id/start → Assigned worker starts the job
const startJob = async (req, res) => {
  try {
    const { id } = req.params;
    const job = await Job.findById(id);
    if (!job) return sendResponse(res, 404, false, null, 'Job not found');

    if (job.status !== 'assigned') return sendResponse(res, 400, false, null, 'Job must be assigned to start');

    if (!job.assignedTo || job.assignedTo.toString() !== req.workerId.toString()) {
      return sendResponse(res, 403, false, null, 'Only the assigned worker can start this job');
    }

    job.status = 'in-progress';
    await job.save();
    sendResponse(res, 200, true, { message: 'Job started', job });
  } catch (error) {
    console.error('Start job error:', error);
    sendResponse(res, 500, false, null, 'Failed to start job');
  }
};

// POST /api/jobs/:id/complete → Assigned worker marks job complete
const completeJob = async (req, res) => {
  try {
    const { id } = req.params;
    const job = await Job.findById(id);
    if (!job) return sendResponse(res, 404, false, null, 'Job not found');

    if (job.status !== 'in-progress') return sendResponse(res, 400, false, null, 'Job must be in-progress to complete');

    if (!job.assignedTo || job.assignedTo.toString() !== req.workerId.toString()) {
      return sendResponse(res, 403, false, null, 'Only the assigned worker can complete this job');
    }

    job.status = 'completed';
    await job.save();
    // leave acceptedJobs as historical record; do not remove
    sendResponse(res, 200, true, { message: 'Job completed', job });
  } catch (error) {
    console.error('Complete job error:', error);
    sendResponse(res, 500, false, null, 'Failed to complete job');
  }
};

// POST /api/jobs/:id/cancel → Owner cancels a job
const cancelJob = async (req, res) => {
  try {
    const { id } = req.params;
    const job = await Job.findById(id);
    if (!job) return sendResponse(res, 404, false, null, 'Job not found');

    // Only owner may cancel
    if (job.owner.toString() !== req.workerId.toString()) {
      return sendResponse(res, 403, false, null, 'Only the owner can cancel this job');
    }

    if (job.status === 'completed') {
      return sendResponse(res, 400, false, null, 'Cannot cancel a completed job');
    }

    // mark cancelled
    job.status = 'cancelled';
    await job.save();

    // cleanup: if assigned, remove from assigned worker's acceptedJobs
    if (job.assignedTo) {
      await Worker.findByIdAndUpdate(job.assignedTo, { $pull: { acceptedJobs: job._id } });
      job.assignedTo = null;
      await job.save();
    }

    sendResponse(res, 200, true, { message: 'Job cancelled', job });
  } catch (error) {
    console.error('Cancel job error:', error);
    sendResponse(res, 500, false, null, 'Failed to cancel job');
  }
};

    module.exports = {
      createJob,
      getAllJobs,
      getJobById,
    acceptJob,
    kickWorker,
    unassignSelf,
      updateJob,
      deleteJob,
      startJob,
      completeJob,
      cancelJob,
      applyJob,
      assignWorker,
      getJobsNear,
      sendResponse
    };