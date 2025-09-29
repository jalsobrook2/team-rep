const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
    owner: 
    {
        type: String,
        required: [true, 'Owner name is required'],
        trim: true,
        maxlength: [50, 'Owner name cannot exceed 50 characters']
    },

    title: 
    {
        type: String,
        required: [true, 'Job title is required'],
        trim: true,
        maxlength: [100, 'Job title cannot exceed 100 characters']
    },

    description: {
        type: String,
        required: [true, 'Job description is required'],
        trim: true,
        maxlength: [1000, 'Job description cannot exceed 1000 characters']
    },

    timestamp: {
        type: Date,
        default: Date.now()
    },

    timeDue: {
        type: Date,
        default: new Date(Date.now() + 86400000).toISOString() //1 day from now
    },

    location: {
        type: String,
        required: [true, 'Job description is required'],
        trim: true,
        maxlength: [1000, 'Job description cannot exceed 1000 characters']
    },

    offer: {
        type: Number,
        set: (num) => parseFloat(num.toFixed(2)),
        required: [true, 'Job offer is required'],
        trim: true,
        min: [1, 'Cannot go lower than $1']
    }
}, {
  timestamps: true // This adds createdAt and updatedAt fields automatically
});

// Add indexes for better query performance
jobSchema.index({ timestamp: -1 });
jobSchema.index({ author: 1 });


module.exports = mongoose.model('Job', jobSchema);