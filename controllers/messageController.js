const UserMessage = require('../models/UserMessage');
const Worker = require('../models/Worker');

// Send a message to another user
const sendMessage = async (req, res) => {
  try {
    const senderId = req.workerId;
    const { receiverId, content } = req.body;
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
    res.status(500).json({ success: false, error: 'Failed to send message.' });
  }
};

// Get conversation between two users
const getConversation = async (req, res) => {
  try {
    const userA = req.workerId;
    const userB = req.params.userId;
    const messages = await UserMessage.find({
      $or: [
        { sender: userA, receiver: userB },
        { sender: userB, receiver: userA }
      ]
    }).sort({ createdAt: 1 });
    res.json({ success: true, data: messages });
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
    // Get latest message for each conversation
    const conversations = await Promise.all(userIds.map(async (otherId) => {
      const lastMsg = await UserMessage.findOne({
        $or: [
          { sender: userId, receiver: otherId },
          { sender: otherId, receiver: userId }
        ]
      }).sort({ createdAt: -1 });
      return lastMsg;
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