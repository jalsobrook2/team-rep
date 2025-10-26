const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const workerSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Name is required'],
        trim: true,
        maxlength: [50, 'Name cannot exceed 50 characters']
    },
    
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        trim: true,
        lowercase: true,
        match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email address']
    },

    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: [8, 'Password must be at least 8 characters long']
    },

    skills: {
        type: String,
        required: [true, 'Skills are required'],
        trim: true,
        maxlength: [200, 'Skills cannot exceed 200 characters']
    },

    postedJobs: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Job'
    }],

    acceptedJobs: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Job',
        status: {
            type: String,
            enum: ['in-progress', 'completed'],
            default: 'in-progress'
        }
    }],

    timeJoined: {
        type: Date,
        default: new Date().toISOString()
    },

    refreshTokens: [{
        token: {
            type: String,
            required: true
        },
        device: {
            type: String,
            default: 'Unknown Device'
        },
        createdAt: {
            type: Date,
            default: Date.now,
            expires: 30 * 24 * 60 * 60 // 30 days TTL
        }
    }]
}, 
{
  timestamps: true // This adds createdAt and updatedAt fields automatically
});

// Add indexes for better query performance
workerSchema.index({ timestamp: -1 });
workerSchema.index({ email: 1 });

// Hash password before saving
workerSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    
    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Method to check password
workerSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('Worker', workerSchema);