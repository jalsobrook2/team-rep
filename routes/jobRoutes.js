const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const {
  createJob,
  getAllJobs,
  getJobById,
  acceptJob,
  updateJob,
  deleteJob
} = require('../controllers/jobController');

// All job routes require authentication
router.use(authMiddleware);

// POST /api/jobs → Create a new job
router.post('/jobs', createJob);

// GET /api/jobs → Get all jobs
router.get('/jobs', getAllJobs);

// GET /api/jobs/:id → Get a specific job by ID
router.get('/jobs/:id', getJobById);

// POST /api/jobs/:id/accept → Accept a job
router.post('/jobs/:id/accept', acceptJob);

// PUT /api/jobs/:id → Update a job by ID
router.put('/jobs/:id', updateJob);

// DELETE /api/jobs/:id → Delete a job by ID
router.delete('/jobs/:id', deleteJob);

module.exports = router;