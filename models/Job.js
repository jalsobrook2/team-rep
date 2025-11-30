const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Worker',
        required: [true, 'Job owner is required']
    },

    assignedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Worker',
        default: null
    },

    status: {
        type: String,
        enum: ['open', 'assigned', 'in-progress', 'completed', 'cancelled'],
        default: 'open'
    },

    title: {
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

    location: {
        type: String,
        required: [true, 'Location is required'],
        trim: true,
        maxlength: [200, 'Location cannot exceed 200 characters']
    },
    // Optional GeoJSON point for precise coordinates (stored as [lng, lat])
    // Keep this optional: don't set a default so documents without coordinates
    // don't include an incomplete GeoJSON object (which MongoDB rejects).
    locationCoords: {
        type: {
            type: String,
            enum: ['Point']
        },
        coordinates: {
            type: [Number] // [lng, lat]
        }
    },

    offer: {
        type: Number,
        set: (num) => parseFloat(num.toFixed(2)),
        required: [true, 'Job offer is required'],
        min: [1, 'Cannot go lower than $1']
    },

    timeDue: {
        type: Date,
        required: [true, 'Due date is required']
    }
    ,
    applicants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Worker' }]
    ,
    // Recurrence metadata for jobs that repeat on a schedule
    recurring: {
        enabled: { type: Boolean, default: false },
            // frequency: how often the job repeats (e.g. daily, weekly, monthly)
            // Include `null` as an allowed enum value to tolerate older documents
            // that explicitly stored `null` for frequency.
            frequency: { type: String, enum: ['daily', 'weekly', 'monthly', null], default: undefined },
        // interval: every N frequency units (e.g. every 2 weeks)
        interval: { type: Number, default: 1, min: 1 },
        // optional end date for the recurrence series
        endDate: { type: Date, default: null }
    }
}, {
    timestamps: true // Adds createdAt and updatedAt fields
});

// Add indexes for better query performance
jobSchema.index({ owner: 1 });
jobSchema.index({ assignedTo: 1 });
jobSchema.index({ status: 1 });
jobSchema.index({ createdAt: -1 });
// Geospatial index for location coordinates (if provided)
jobSchema.index({ locationCoords: '2dsphere' });

// Add methods to change job status
jobSchema.methods.accept = async function(workerId) {
    this.status = 'assigned';
    this.assignedTo = workerId;
    return this.save();
};

jobSchema.methods.start = async function() {
    if (this.status !== 'assigned') {
        throw new Error('Job must be assigned before starting');
    }
    this.status = 'in-progress';
    return this.save();
};

jobSchema.methods.complete = async function() {
    if (this.status !== 'in-progress') {
        throw new Error('Job must be in progress before completing');
    }
    this.status = 'completed';
    return this.save();
};

jobSchema.methods.cancel = async function() {
    if (this.status === 'completed') {
        throw new Error('Cannot cancel a completed job');
    }
    this.status = 'cancelled';
    return this.save();
};

const Job = mongoose.model('Job', jobSchema, 'jobs');
module.exports = Job;