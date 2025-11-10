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

// Public route: GET /api/workers → Get all workers
router.get('/workers', getAllWorkers);

// Protected routes that require authentication
// GET /api/workers/dashboard → Get user dashboard shell (place before :id route)
router.get('/workers/dashboard', authMiddleware, getDashboard);

// GET /api/workers/:id → Get a specific worker by ID (public)
router.get('/workers/:id', getWorkerById);

// PUT /api/workers/:id → Update a worker by ID (protected)
router.put('/workers/:id', authMiddleware, updateWorker);

// DELETE /api/workers/:id → Delete a worker by ID (protected)
router.delete('/workers/:id', authMiddleware, deleteWorker);

module.exports = router;