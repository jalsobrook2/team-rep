const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const {
  createJob,
  getAllJobs,
  getJobById,
  acceptJob,
  kickWorker,
  updateJob,
  deleteJob,
  startJob,
  completeJob,
  cancelJob
} = require('../controllers/jobController');

// The jobController also exports applyJob, assignWorker, and unassignSelf (added later)
const { applyJob, assignWorker, unassignSelf } = require('../controllers/jobController');

// Public routes: allow anonymous users to browse jobs and nearby listings
// GET /api/jobs → Get all jobs
router.get('/jobs', getAllJobs);
// GET /api/jobs/near → Find jobs near coordinates within a radius (km)
router.get('/jobs/near', require('../controllers/jobController').getJobsNear);
// GET /api/jobs/:id → Get a specific job by ID
router.get('/jobs/:id', getJobById);

// Apply auth middleware for routes that modify or act on jobs
router.use(authMiddleware);

// POST /api/jobs → Create a new job (protected)
router.post('/jobs', createJob);

// POST /api/jobs/:id/accept → Accept a job
router.post('/jobs/:id/accept', acceptJob);

// Worker applies to a job
router.post('/jobs/:id/apply', applyJob);

// Owner assigns a worker from applicants
router.post('/jobs/:id/assign', assignWorker);

// POST /api/jobs/:id/kick → Owner unassigns the worker
router.post('/jobs/:id/kick', kickWorker);

// POST /api/jobs/:id/unassign-self → Worker removes themselves from job
router.post('/jobs/:id/unassign-self', unassignSelf);

// POST /api/jobs/:id/start → Assigned worker starts job
router.post('/jobs/:id/start', startJob);

// POST /api/jobs/:id/complete → Assigned worker completes job
router.post('/jobs/:id/complete', completeJob);

// POST /api/jobs/:id/cancel → Owner cancels job
router.post('/jobs/:id/cancel', cancelJob);

// PUT /api/jobs/:id → Update a job by ID
router.put('/jobs/:id', updateJob);

// DELETE /api/jobs/:id → Delete a job by ID
router.delete('/jobs/:id', deleteJob);

module.exports = router;