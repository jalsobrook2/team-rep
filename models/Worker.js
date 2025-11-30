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
        // Allow modern TLDs (e.g. .technology, .company) — use a simple, permissive but practical pattern
        match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please enter a valid email address']
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

    phone: {
        type: String,
        trim: true,
        maxlength: [30, 'Phone cannot exceed 30 characters'],
        default: null
    },

    // Optional profile location (human readable) and GeoJSON coordinates
    location: {
        type: String,
        trim: true,
        maxlength: [200, 'Location cannot exceed 200 characters'],
        default: null
    },

    locationCoords: {
        type: {
            type: String,
            enum: ['Point']
        },
        coordinates: {
            type: [Number]
        }
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
        ,
        // Reviews left by job posters for this worker
        reviews: [{
                reviewer: { type: mongoose.Schema.Types.ObjectId, ref: 'Worker' },
                rating: { type: Number, min: 1, max: 5, required: true },
                comment: { type: String, trim: true, maxlength: 1000, default: '' },
                createdAt: { type: Date, default: Date.now }
        }]
}, 
{
  timestamps: true // This adds createdAt and updatedAt fields automatically
});

// Virtual: average rating and count
workerSchema.virtual('avgRating').get(function(){
    if(!this.reviews || this.reviews.length === 0) return null;
    const sum = this.reviews.reduce((s, r) => s + (r.rating||0), 0);
    return Math.round((sum / this.reviews.length) * 10) / 10; // one decimal
});

workerSchema.virtual('reviewCount').get(function(){
    return (this.reviews && this.reviews.length) || 0;
});

// Add indexes for better query performance
workerSchema.index({ timestamp: -1 });
workerSchema.index({ email: 1 });
// Geospatial index for worker coordinates (optional)
workerSchema.index({ locationCoords: '2dsphere' });

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