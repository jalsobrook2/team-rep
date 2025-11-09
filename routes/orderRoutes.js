const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const {
  createOrder,
  getUserOrders,
  getOrderById,
  acceptOrder,
  startWork,
  deliverOrder,
  completeOrder,
  addMessage,
  requestRevision,
  cancelOrder
} = require('../controllers/orderController');

// All order routes require authentication
router.use(authMiddleware);

// POST /api/orders → Create a new order - Story 2.5
router.post('/', createOrder);

// GET /api/orders → Get user's orders (buyer and seller) - Story 2.5, 2.6
router.get('/', getUserOrders);

// GET /api/orders/:id → Get a specific order by ID - Story 2.5, 2.6
router.get('/:id', getOrderById);

// PUT /api/orders/:id/accept → Accept an order (seller only) - Story 2.6
router.put('/:id/accept', acceptOrder);

// PUT /api/orders/:id/start → Start work on order (seller only) - Story 2.6
router.put('/:id/start', startWork);

// PUT /api/orders/:id/deliver → Deliver an order (seller only) - Story 2.6
router.put('/:id/deliver', deliverOrder);

// PUT /api/orders/:id/complete → Complete an order (buyer only) - Story 2.6
router.put('/:id/complete', completeOrder);

// POST /api/orders/:id/messages → Add a message to an order
router.post('/:id/messages', addMessage);

// PUT /api/orders/:id/revision → Request revision (buyer only)
router.put('/:id/revision', requestRevision);

// PUT /api/orders/:id/cancel → Cancel an order
router.put('/:id/cancel', cancelOrder);

module.exports = router;