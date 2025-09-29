const mongoose = require('mongoose');

const workerSchema = new mongoose.Schema({
    name: 
    {
        type: String,
        required: [true, 'Worker name is required'],
        trim: true,
        maxlength: [50, 'Worker name cannot exceed 50 characters']
    },

    skills: 
    {
        type: String,
        required: [true, 'Worker skills are required'],
        trim: true,
        maxlength: [200, 'Worker skills cannot exceed 200 characters']
    },

    timeJoined: {
        type: Date,
        default: new Date().toISOString() //1 day ago
    }
}, 
{
  timestamps: true // This adds createdAt and updatedAt fields automatically
});

// Add indexes for better query performance
workerSchema.index({ timestamp: -1 });
workerSchema.index({ author: 1 });


module.exports = mongoose.model('Worker', workerSchema);