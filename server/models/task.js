const mongoose = require('mongoose');

const TaskSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  status: { type: String, enum: ['todo','in-progress','done'], default: 'todo' },
  assignee: String,
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Task', TaskSchema);
