const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    // Reference to the gig being ordered
    gig_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Gig',
        required: [true, 'Gig reference is required']
    },

    // Reference to the buyer (client who placed the order)
    buyer_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Worker',
        required: [true, 'Buyer is required']
    },

    // Reference to the seller (gig creator)
    seller_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Worker',
        required: [true, 'Seller is required']
    },

    // Order status for progress tracking (Story 2.6)
    status: {
        type: String,
        enum: ['pending', 'accepted', 'in-progress', 'delivered', 'completed', 'cancelled', 'disputed'],
        default: 'pending'
    },

    // Financial information
    totalPrice: {
        type: Number,
        required: [true, 'Total price is required'],
        min: [0, 'Total price cannot be negative'],
        set: (num) => parseFloat(num.toFixed(2))
    },

    // Order details
    requirements: {
        type: String,
        required: [true, 'Order requirements are required'],
        trim: true,
        maxlength: [2000, 'Requirements cannot exceed 2000 characters']
    },

    // Delivery information
    expectedDeliveryDate: {
        type: Date,
        required: [true, 'Expected delivery date is required']
    },

    actualDeliveryDate: {
        type: Date,
        default: null
    },

    // Communication and files
    messages: [{
        sender: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Worker',
            required: true
        },
        message: {
            type: String,
            required: true,
            maxlength: [1000, 'Message cannot exceed 1000 characters']
        },
        timestamp: {
            type: Date,
            default: Date.now
        },
        isFromSeller: {
            type: Boolean,
            required: true
        }
    }],

    // File attachments (for requirements or deliverables)
    attachments: [{
        filename: String,
        url: String,
        uploadedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Worker'
        },
        uploadedAt: {
            type: Date,
            default: Date.now
        },
        type: {
            type: String,
            enum: ['requirement', 'deliverable', 'revision'],
            required: true
        }
    }],

    // Revision tracking
    revisionCount: {
        type: Number,
        default: 0,
        min: 0
    },

    maxRevisions: {
        type: Number,
        default: 2,
        min: 0
    },

    // Payment and review (for future implementation)
    isPaid: {
        type: Boolean,
        default: false
    },

    review: {
        rating: {
            type: Number,
            min: 1,
            max: 5
        },
        comment: {
            type: String,
            maxlength: [500, 'Review comment cannot exceed 500 characters']
        },
        reviewedAt: Date
    }
}, {
    timestamps: true // Adds createdAt and updatedAt fields
});

// Add indexes for better query performance
orderSchema.index({ gig_id: 1 });
orderSchema.index({ buyer_id: 1 });
orderSchema.index({ seller_id: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ expectedDeliveryDate: 1 });

// Methods for order status management (for Story 2.6 progress tracking)
orderSchema.methods.accept = async function() {
    if (this.status !== 'pending') {
        throw new Error('Only pending orders can be accepted');
    }
    this.status = 'accepted';
    return this.save();
};

orderSchema.methods.startWork = async function() {
    if (this.status !== 'accepted') {
        throw new Error('Order must be accepted before starting work');
    }
    this.status = 'in-progress';
    return this.save();
};

orderSchema.methods.deliver = async function() {
    if (this.status !== 'in-progress') {
        throw new Error('Order must be in progress before delivery');
    }
    this.status = 'delivered';
    this.actualDeliveryDate = new Date();
    return this.save();
};

orderSchema.methods.complete = async function() {
    if (this.status !== 'delivered') {
        throw new Error('Order must be delivered before completion');
    }
    this.status = 'completed';
    this.isPaid = true;
    return this.save();
};

orderSchema.methods.cancel = async function(reason) {
    if (['completed', 'cancelled'].includes(this.status)) {
        throw new Error('Cannot cancel completed or already cancelled orders');
    }
    this.status = 'cancelled';
    
    // Add cancellation message
    this.messages.push({
        sender: this.buyer_id,
        message: `Order cancelled. Reason: ${reason || 'No reason provided'}`,
        isFromSeller: false
    });
    
    return this.save();
};

// Method to add messages (for order communication)
orderSchema.methods.addMessage = async function(senderId, message, isFromSeller) {
    this.messages.push({
        sender: senderId,
        message: message,
        isFromSeller: isFromSeller
    });
    return this.save();
};

// Method to request revision
orderSchema.methods.requestRevision = async function(revisionNote) {
    if (this.revisionCount >= this.maxRevisions) {
        throw new Error('Maximum revisions exceeded');
    }
    if (this.status !== 'delivered') {
        throw new Error('Can only request revisions on delivered orders');
    }
    
    this.revisionCount += 1;
    this.status = 'in-progress';
    
    // Add revision request message
    this.messages.push({
        sender: this.buyer_id,
        message: `Revision requested: ${revisionNote}`,
        isFromSeller: false
    });
    
    return this.save();
};

// Virtual for progress percentage (for Story 2.6)
orderSchema.virtual('progressPercentage').get(function() {
    const statusProgress = {
        'pending': 10,
        'accepted': 25,
        'in-progress': 50,
        'delivered': 80,
        'completed': 100,
        'cancelled': 0,
        'disputed': 30
    };
    return statusProgress[this.status] || 0;
});

const Order = mongoose.model('Order', orderSchema, 'orders');
module.exports = Order;