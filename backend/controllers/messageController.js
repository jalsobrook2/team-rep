const Message = require('../models/Message');

/**
 * Create a new message
 */
exports.createMessage = async (req, res) => {
  try {
    const { author, text, isRead } = req.body;
    const message = new Message({ author, text, isRead });
    await message.save();
    res.status(201).json(message);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

/**
 * List all messages (with optional pagination)
 */
exports.getMessages = async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const messages = await Message.find()
      .sort({ timestamp: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit, 10));
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Get single message by id
 */
exports.getMessageById = async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);
    if (!message) return res.status(404).json({ error: 'Message not found' });
    res.json(message);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

/**
 * Update message by id
 */
exports.updateMessage = async (req, res) => {
  try {
    const updates = req.body;
    const message = await Message.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    if (!message) return res.status(404).json({ error: 'Message not found' });
    res.json(message);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

/**
 * Delete message by id
 */
exports.deleteMessage = async (req, res) => {
  try {
    const message = await Message.findByIdAndDelete(req.params.id);
    if (!message) return res.status(404).json({ error: 'Message not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};