const express = require('express');
const router = express.Router();
const controller = require('../controllers/messageController');

/**
 * API routes:
 * POST   /api/messages       -> createMessage
 * GET    /api/messages       -> getMessages
 * GET    /api/messages/:id   -> getMessageById
 * PUT    /api/messages/:id   -> updateMessage
 * DELETE /api/messages/:id   -> deleteMessage
 */
router.post('/', controller.createMessage);
router.get('/', controller.getMessages);
router.get('/:id', controller.getMessageById);
router.put('/:id', controller.updateMessage);
router.delete('/:id', controller.deleteMessage);

module.exports = router;