const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const {
  createGig,
  getAllGigs,
  getGigById,
  updateGig,
  deleteGig,
  getUserGigs,
  getGigCategories
} = require('../controllers/gigController');

// Public routes (no authentication required)
// GET /api/gigs → Get all gigs (for browsing) - Story 2.4
router.get('/', getAllGigs);

// GET /api/gigs/categories → Get gig categories
router.get('/categories', getGigCategories);

// Protected routes (authentication required)
// POST /api/gigs → Create a new gig - Story 2.1, 2.2
router.post('/', authMiddleware, createGig);

// GET /api/gigs/user/me → Get current user's gigs
router.get('/user/me', authMiddleware, getUserGigs);

// GET /api/gigs/:id → Get a specific gig by ID (must be after specific routes)
router.get('/:id', getGigById);

// PUT /api/gigs/:id → Update a gig by ID - Story 2.2
router.put('/:id', authMiddleware, updateGig);

// DELETE /api/gigs/:id → Delete a gig by ID - Story 2.2
router.delete('/:id', authMiddleware, deleteGig);

module.exports = router;