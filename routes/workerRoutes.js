const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const {
  getAllWorkers,
  getWorkerById,
  updateWorker,
  deleteWorker,
  getDashboard
} = require('../controllers/workerController');

// Protected routes that require authentication
router.use(authMiddleware);


// GET /api/workers → Get all workers
router.get('/workers', getAllWorkers);

// GET /api/workers/dashboard → Get user dashboard shell (place before :id route)
router.get('/workers/dashboard', getDashboard);

// GET /api/workers/:id → Get a specific worker by ID
router.get('/workers/:id', getWorkerById);

// PUT /api/jobs/:id → Update a worker by ID
router.put('/workers/:id', updateWorker);

// DELETE /api/jobs/:id → Delete a worker by ID
router.delete('/workers/:id', deleteWorker);

module.exports = router;