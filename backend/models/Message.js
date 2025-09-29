const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  role: {
    type: String,
    required: [true, 'Role is required'],
    enum: ['worker', 'agent'],
    index: true
  },
  username: {
    type: String,
    required: [true, 'Username is required'],
    trim: true,
    maxlength: [100, 'Username cannot exceed 100 characters'],
    unique: true
  },
  legalName: {
    type: String,
    required: [true, 'Legal name is required'],
    trim: true,
    maxlength: [200, 'Legal name cannot exceed 200 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    trim: true,
    lowercase: true,
    unique: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },

  // Worker-specific: jobs the worker has applied to
  appliedJobs: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job'
    }
  ],

  // Agent-specific: jobs the agent has open/listed
  openJobs: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job'
    }
  ]
}, {
  timestamps: true
});

// Commonly used indices
userSchema.index({ username: 1 });
userSchema.index({ email: 1 });

// Checks role 
userSchema.virtual('isWorker').get(function () {
  return this.role === 'worker';
});
userSchema.virtual('isAgent').get(function () {
  return this.role === 'agent';
});

module.exports = mongoose.model('User', userSchema);