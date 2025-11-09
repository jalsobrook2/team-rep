const mongoose = require('mongoose');

const gigSchema = new mongoose.Schema({
    // Reference to the user who created the gig (seller)
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Worker',
        required: [true, 'Gig creator is required']
    },

    title: {
        type: String,
        required: [true, 'Gig title is required'],
        trim: true,
        maxlength: [100, 'Gig title cannot exceed 100 characters']
    },

    description: {
        type: String,
        required: [true, 'Gig description is required'],
        trim: true,
        maxlength: [1000, 'Gig description cannot exceed 1000 characters']
    },

    price: {
        type: Number,
        required: [true, 'Gig price is required'],
        min: [5, 'Gig price cannot be less than $5'],
        set: (num) => parseFloat(num.toFixed(2))
    },

    category: {
        type: String,
        required: [true, 'Gig category is required'],
        enum: [
            'web-development',
            'mobile-development',
            'design',
            'writing',
            'marketing',
            'data-entry',
            'customer-service',
            'accounting',
            'video-editing',
            'music-audio',
            'programming',
            'other'
        ],
        trim: true
    },

    status: {
        type: String,
        enum: ['active', 'paused', 'completed', 'draft'],
        default: 'active'
    },

    // Additional fields for better gig management
    tags: [{
        type: String,
        trim: true,
        maxlength: [30, 'Tag cannot exceed 30 characters']
    }],

    deliveryTime: {
        type: Number, // in days
        required: [true, 'Delivery time is required'],
        min: [1, 'Delivery time must be at least 1 day'],
        max: [365, 'Delivery time cannot exceed 365 days']
    },

    // For rating and reviews (to be implemented later)
    rating: {
        type: Number,
        default: 0,
        min: 0,
        max: 5
    },

    totalOrders: {
        type: Number,
        default: 0,
        min: 0
    },

    // Images/gallery (optional for now)
    images: [{
        url: String,
        alt: String
    }]
}, {
    timestamps: true // Adds createdAt and updatedAt fields
});

// Add indexes for better query performance
gigSchema.index({ user_id: 1 });
gigSchema.index({ category: 1 });
gigSchema.index({ status: 1 });
gigSchema.index({ price: 1 });
gigSchema.index({ createdAt: -1 });
gigSchema.index({ rating: -1 });

// Virtual for average rating calculation (can be populated later)
gigSchema.virtual('averageRating').get(function() {
    return this.rating || 0;
});

// Methods for gig status management
gigSchema.methods.activate = async function() {
    this.status = 'active';
    return this.save();
};

gigSchema.methods.pause = async function() {
    this.status = 'paused';
    return this.save();
};

gigSchema.methods.complete = async function() {
    this.status = 'completed';
    return this.save();
};

// Method to increment order count
gigSchema.methods.incrementOrderCount = async function() {
    this.totalOrders += 1;
    return this.save();
};

const Gig = mongoose.model('Gig', gigSchema, 'gigs');
module.exports = Gig;