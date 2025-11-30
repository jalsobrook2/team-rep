const mongoose = require('mongoose');
const UserMessage = require('../models/UserMessage');
const Worker = require('../models/Worker');

// Send a message to another user
const sendMessage = async (req, res) => {
  try {
    const senderId = req.workerId;
    // Ensure request is authenticated
    if (!senderId) {
      return res.status(401).json({ success: false, error: 'Authentication required.' });
    }
    const { receiverId, content } = req.body;
    // Validate receiverId is a valid ObjectId to avoid CastError from Mongoose
    if (!mongoose.Types.ObjectId.isValid(receiverId)) {
      return res.status(400).json({ success: false, error: 'Invalid receiver id.' });
    }
    if (!receiverId || !content) {
      return res.status(400).json({ success: false, error: 'Receiver and content required.' });
    }
    if (content.length > 2000) {
      return res.status(400).json({ success: false, error: 'Message too long.' });
    }
    // Prevent sending to self
    if (receiverId === senderId) {
      return res.status(400).json({ success: false, error: 'Cannot message yourself.' });
    }
    // Check receiver exists
    const receiver = await Worker.findById(receiverId);
    if (!receiver) {
      return res.status(404).json({ success: false, error: 'Receiver not found.' });
    }
    const message = new UserMessage({ sender: senderId, receiver: receiverId, content });
    await message.save();
    res.status(201).json({ success: true, data: message });
  } catch (error) {
    console.error('sendMessage error:', error);
    // In development show the underlying error message to aid debugging
    const errMsg = (error && error.message) ? error.message : 'Failed to send message.';
    res.status(500).json({ success: false, error: errMsg });
  }
};

// Get conversation between two users
const getConversation = async (req, res) => {
  try {
    const userA = req.workerId;
    const userB = req.params.userId;
    // Populate sender/receiver names so the frontend can display friendly labels
    const messages = await UserMessage.find({
      $or: [
        { sender: userA, receiver: userB },
        { sender: userB, receiver: userA }
      ]
    }).sort({ createdAt: 1 }).populate('sender receiver', 'name email');

    // Map messages to include a senderName for convenience
    const mapped = messages.map(m => {
      const obj = m.toObject();
      obj.senderName = (obj.sender && (obj.sender.name || obj.sender.email)) || String(obj.sender);
      obj.receiverName = (obj.receiver && (obj.receiver.name || obj.receiver.email)) || String(obj.receiver);
      return obj;
    });

    res.json({ success: true, data: mapped });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to get conversation.' });
  }
};

// Get all conversations for logged-in user
const getConversations = async (req, res) => {
  try {
    const userId = req.workerId;
    // Get distinct user IDs from messages
    const sent = await UserMessage.find({ sender: userId }).distinct('receiver');
    const received = await UserMessage.find({ receiver: userId }).distinct('sender');
    const userIds = Array.from(new Set([...sent, ...received]));
    // Build a richer conversation list: include other user's name and unread count
    const conversations = await Promise.all(userIds.map(async (otherId) => {
      const lastMsg = await UserMessage.findOne({
        $or: [
          { sender: userId, receiver: otherId },
          { sender: otherId, receiver: userId }
        ]
      }).sort({ createdAt: -1 }).lean();

      // Count unread messages from other user
      const unreadCount = await UserMessage.countDocuments({ sender: otherId, receiver: userId, isRead: false });

      // Try to get display name for the other user
      let otherName = otherId;
      try {
        const other = await Worker.findById(otherId).select('name email').lean();
        if (other) otherName = other.name || other.email || String(otherId);
      } catch (e) {
        // ignore lookup errors and fall back to id
      }

      return { otherId, otherName, lastMsg, unreadCount };
    }));

    res.json({ success: true, data: conversations.filter(Boolean) });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to get conversations.' });
  }
};

// Mark messages as read in a conversation
const markAsRead = async (req, res) => {
  try {
    const userA = req.workerId;
    const userB = req.params.userId;
    await UserMessage.updateMany({ sender: userB, receiver: userA, isRead: false }, { isRead: true });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to mark as read.' });
  }
};

module.exports = { sendMessage, getConversation, getConversations, markAsRead };