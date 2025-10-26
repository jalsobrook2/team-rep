const Job = require('../models/Job');
const Worker = require('../models/Worker');

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
    const { title, description, location, offer, timeDue } = req.body;
    
    // Validate required fields
    if (!title || !description || !location || !offer) {
      return sendResponse(res, 400, false, null, "All fields (title, description, location, offer) are required");
    }

    // Create new job
    const job = new Job({
      owner: req.workerId, // From auth middleware
      title,
      description,
      location,
      offer: parseFloat(offer),
      timeDue: timeDue || new Date(Date.now() + 86400000)
    });

    await job.save();

    // Add job to worker's posted jobs
    await Worker.findByIdAndUpdate(req.workerId, {
      $push: { postedJobs: job._id }
    });

    // Remove sensitive information
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

    // Update job status
    job.status = 'assigned';
    job.assignedTo = req.workerId;
    await job.save();

    // Add job to worker's accepted jobs
    await Worker.findByIdAndUpdate(req.workerId, {
      $push: { 
        acceptedJobs: {
          _id: job._id,
          status: 'in-progress'
        }
      }
    });

    sendResponse(res, 200, true, {
      message: "Job accepted successfully",
      job: job.toObject()
    });
  } catch (error) {
    console.error('Accept job error:', error);
    sendResponse(res, 500, false, null, "An unexpected error occurred while accepting job");
  }
};

// GET /api/jobs → Get all jobs
const getAllJobs = async (req, res) => {
  try {
    // For now, return placeholder response
    // TODO: Implement database logic
    
    const sampleJobs = [
      {
        id: "job-1",
        owner: "Jen Marble",
        title: "Clean up trash in my yard",
        description: "Lots of trash in my yard, willing to pay to get it cleaned",
        timestamp: new Date().toISOString,
        timeDue: new Date(Date.now + 86000000).toISOString,
        location: "My yard",
        offer: 5.25
      },
      {
        id: "job-2",
        owner: "Bob Marble",
        title: "Clean up trash in my wife's yard",
        description: "Lots of trash in my wife's yard, willing to pay to get it cleaned",
        timestamp: new Date().toISOString,
        timeDue: new Date(Date.now + 46000000).toISOString,
        location: "My wife's yard",
        offer: 90.50
      },
      {
        id: "job-3",
        owner: "Peter",
        title: "Build me a wonderful vase",
        description: "Hammer and nails provided",
        timestamp: new Date().toISOString,
        timeDue: new Date(Date.now + 86000000).toISOString,
        location: "City museum",
        offer: 55000.25
      }
    ];

    sendResponse(res, 200, true, {
      jobs: sampleJobs,
      count: sampleJobs.length
    });
  } catch (error) {
    sendResponse(res, 500, false, null, "Failed to retrieve jobs");
  }
};

// GET /api/jobs/:id → Get a specific job by ID
const getJobById = async (req, res) => {
  try {
    const { id } = req.params;
    
    // For now, return placeholder response
    // TODO: Implement database logic
    
    if (!id) {
      return sendResponse(res, 400, false, null, "Job ID is required");
    }

    const sampleJob = {
      id: id,
      owner: "Sample Owner",
      title: "Sample Job Title",
      description: "Sample Description",
      timestamp: new Date().toISOString,
      timeDue: new Date(Date.now + 86000000).toISOString,
      location: "Sample Location",
      offer: "Sample Offer", 
    };

    sendResponse(res, 200, true, {
      job: sampleJob
    });
  } catch (error) {
    sendResponse(res, 500, false, null, "Failed to retrieve job");
  }
};

// PUT /api/jobs/:id → Update a job by ID
const updateJob = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    // For now, return placeholder response
    // TODO: Implement database logic
    
    if (!id) {
      return sendResponse(res, 400, false, null, "Job ID is required");
    }

    const updatedJob = {
      id: id,
      owner: updateData.owner || "Updated Owner",
      title: updateData.title || "Updated Job Title",
      description: updateData.description || "Updated Description",
      timestamp: new Date().toISOString,
      timeDue: new Date(Date.now + 86000000).toISOString,
      location: updateData.location || "Updated Location",
      offer: updateData.offer || "Updated Offer", 
    };

    sendResponse(res, 200, true, {
      job: "Job updated successfully",
      jobData: updatedJob
    });
  } catch (error) {
    sendResponse(res, 500, false, null, "Failed to update job");
  }
};

// DELETE /api/jobs/:id → Delete a job by ID
const deleteJob = async (req, res) => {
  try {
    const { id } = req.params;
    
    // For now, return placeholder response
    // TODO: Implement database logic
    
    if (!id) {
      return sendResponse(res, 400, false, null, "Job ID is required");
    }

    sendResponse(res, 200, true, {
      job: `Job with ID ${id} deleted successfully`,
      deletedId: id
    });
  } catch (error) {
    sendResponse(res, 500, false, null, "Failed to delete job");
  }
};

module.exports = {
  createJob,
  getAllJobs,
  getJobById,
  acceptJob,
  updateJob,
  deleteJob,
  sendResponse
};