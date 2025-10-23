const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Job = sequelize.define('Job', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false
    },
    ownerId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    workerId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    },
    title: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        len: [1, 100],
        notEmpty: true
      }
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        len: [1, 1000],
        notEmpty: true
      }
    },
    category: {
      type: DataTypes.ENUM(
        'cleaning', 'handyman', 'tutoring', 'pet_care', 
        'landscaping', 'tech_help', 'moving', 'delivery', 
        'personal_care', 'event_help', 'other'
      ),
      allowNull: false,
      defaultValue: 'other'
    },
    status: {
      type: DataTypes.ENUM('open', 'assigned', 'in_progress', 'completed', 'cancelled'),
      allowNull: false,
      defaultValue: 'open'
    },
    priority: {
      type: DataTypes.ENUM('low', 'medium', 'high', 'urgent'),
      allowNull: false,
      defaultValue: 'medium'
    },
    location: {
      type: DataTypes.JSONB,
      allowNull: false,
      validate: {
        notEmpty: true
      }
      // Structure: { address: '', city: '', state: '', zipCode: '', lat: 0, lng: 0 }
    },
    offer: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: 1.00,
        notNull: true
      }
    },
    estimatedDuration: {
      type: DataTypes.INTEGER, // Duration in minutes
      allowNull: true,
      validate: {
        min: 15 // Minimum 15 minutes
      }
    },
    skillsRequired: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: true,
      defaultValue: []
    },
    equipmentProvided: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false
    },
    safetyRequirements: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: true,
      defaultValue: []
      // Examples: ['background_check', 'references', 'insurance']
    },
    scheduledStart: {
      type: DataTypes.DATE,
      allowNull: true
    },
    scheduledEnd: {
      type: DataTypes.DATE,
      allowNull: true
    },
    actualStart: {
      type: DataTypes.DATE,
      allowNull: true
    },
    actualEnd: {
      type: DataTypes.DATE,
      allowNull: true
    },
    completionNotes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    rating: {
      type: DataTypes.DECIMAL(3, 2),
      allowNull: true,
      validate: {
        min: 0.00,
        max: 5.00
      }
    },
    feedback: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    // Safety tracking
    emergencyContactNotified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false
    },
    locationShared: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false
    },
    // Timestamps
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    deletedAt: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: 'jobs',
    timestamps: true,
    paranoid: true, // Enables soft deletes
    indexes: [
      {
        fields: ['ownerId']
      },
      {
        fields: ['workerId']
      },
      {
        fields: ['status']
      },
      {
        fields: ['category']
      },
      {
        fields: ['priority']
      },
      {
        fields: ['createdAt']
      },
      {
        fields: ['scheduledStart']
      }
    ]
  });

  // Instance methods
  Job.prototype.assignWorker = function(workerId) {
    this.workerId = workerId;
    this.status = 'assigned';
    return this.save();
  };

  Job.prototype.startJob = function() {
    this.status = 'in_progress';
    this.actualStart = new Date();
    return this.save();
  };

  Job.prototype.completeJob = function(completionNotes = null, rating = null) {
    this.status = 'completed';
    this.actualEnd = new Date();
    if (completionNotes) this.completionNotes = completionNotes;
    if (rating) this.rating = rating;
    return this.save();
  };

  Job.prototype.cancelJob = function(reason = null) {
    this.status = 'cancelled';
    if (reason) this.completionNotes = reason;
    return this.save();
  };

  // Class methods
  Job.findByStatus = async function(status) {
    return await this.findAll({
      where: { status },
      include: ['owner', 'assignedWorker']
    });
  };

  Job.findByLocation = async function(lat, lng, radiusKm = 25) {
    // This would require PostGIS extension for proper geographic queries
    // For now, we'll implement a basic bounding box search
    return await this.findAll({
      where: sequelize.literal(`
        ST_DWithin(
          ST_MakePoint(CAST(location->>'lng' AS FLOAT), CAST(location->>'lat' AS FLOAT))::geography,
          ST_MakePoint(${lng}, ${lat})::geography,
          ${radiusKm * 1000}
        )
      `),
      include: ['owner']
    });
  };

  return Job;
};