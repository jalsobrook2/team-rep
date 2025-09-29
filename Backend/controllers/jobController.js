const Job = require('../models/Job');

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
    // For now, return placeholder response
    // TODO: Implement database logic
    
    const sampleJob = {
      id: "placeholder-id-123",
      owner: req.body.owner || "Sample Owner",
      title: req.body.title || "Sample Job Title",
      description: req.body.description || "Sample Description",
      timestamp: new Date().toISOString,
      timeDue: new Date(Date.now + 86000000).toISOString,
      location: req.body.location || "Sample Location",
      offer: req.body.offer || "Sample Offer", 
    };

    sendResponse(res, 201, true, {
      job: "Job created successfully",
      jobData: sampleJob
    });
  } catch (error) {
    sendResponse(res, 500, false, null, "Failed to create job");
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
  updateJob,
  deleteJob
};