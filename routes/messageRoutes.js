const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const {
  sendMessage,
  getConversation,
  getConversations,
  markAsRead
} = require('../controllers/messageController');

// All messaging routes require authentication
router.use(authMiddleware);

// Send a message
router.post('/messages', sendMessage);

// Get all conversations for logged-in user
router.get('/messages/conversations', getConversations);

// Get conversation with a specific user
router.get('/messages/conversation/:userId', getConversation);

// Mark messages as read in a conversation
router.post('/messages/conversation/:userId/read', markAsRead);

module.exports = router;
