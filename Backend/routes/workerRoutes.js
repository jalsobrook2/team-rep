const express = require('express');
const router = express.Router();
const {
  createWorker,
  getAllWorkers,
  getWorkerById,
  updateWorker,
  deleteWorker
} = require('../controllers/workerController');

// POST /api/jobs → Create a new worker
router.post('/workers', createWorker);

// GET /api/jobs → Get all workers
router.get('/workers', getAllWorkers);

// GET /api/jobs/:id → Get a specific worker by ID
router.get('/workers/:id', getWorkerById);

// PUT /api/jobs/:id → Update a worker by ID
router.put('/workers/:id', updateWorker);

// DELETE /api/jobs/:id → Delete a worker by ID
router.delete('/workers/:id', deleteWorker);

module.exports = router;