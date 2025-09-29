const User = require('../models/Message');

/**
 * Create a new user (worker or agent)
 */
exports.createMessage = async (req, res) => {
  try {
    const { role, username, legalName, email, description, appliedJobs, openJobs } = req.body;

    if (!role || !['worker', 'agent'].includes(role)) {
      return res.status(400).json({ error: 'role is required and must be "worker" or "agent"' });
    }
    if (!username || !legalName || !email) {
      return res.status(400).json({ error: 'username, legalName and email are required' });
    }

    const userData = { role, username, legalName, email, description };

    if (role === 'worker') userData.appliedJobs = Array.isArray(appliedJobs) ? appliedJobs : [];
    if (role === 'agent') userData.openJobs = Array.isArray(openJobs) ? openJobs : [];

    const user = new User(userData);
    await user.save();
    res.status(201).json(user);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

/**
 * List users (with optional pagination)
 */
exports.getMessages = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page || '1', 10), 1);
    const limit = Math.max(parseInt(req.query.limit || '50', 10), 1);
    const users = await User.find()
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Get single user by id
 */
exports.getMessageById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).populate('appliedJobs openJobs');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

/**
 * Update user by id
 */
exports.updateMessage = async (req, res) => {
  try {
    const updates = { ...req.body };

    if (updates.role && !['worker', 'agent'].includes(updates.role)) {
      return res.status(400).json({ error: 'Invalid role value' });
    }

    // Ensure role-specific arrays are consistent
    if (updates.role === 'worker') delete updates.openJobs;
    if (updates.role === 'agent') delete updates.appliedJobs;

    // If role not being changed, ensure we don't accidentally set the other role's array
    if (updates.appliedJobs && updates.appliedJobs.length && updates.role === 'agent') {
      return res.status(400).json({ error: 'Agents cannot have appliedJobs' });
    }
    if (updates.openJobs && updates.openJobs.length && updates.role === 'worker') {
      return res.status(400).json({ error: 'Workers cannot have openJobs' });
    }

    const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

/**
 * Delete user by id
 */
exports.deleteMessage = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};