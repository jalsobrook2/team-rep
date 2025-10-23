const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Worker = sequelize.define('Worker', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    name: {
      type: DataTypes.STRING(50),
      allowNull: false,
      validate: {
        len: [1, 50],
        notEmpty: true
      }
    },
    skills: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: true,
      defaultValue: []
    },
    timeJoined: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      allowNull: false
    },
    // Additional worker-specific fields
    experience: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    hourlyRate: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      validate: {
        min: 0.00
      }
    },
    availability: {
      type: DataTypes.JSONB,
      allowNull: true
      // Structure: { days: ['monday', 'tuesday'], timeSlots: [{ start: '09:00', end: '17:00' }] }
    },
    completedJobs: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false
    },
    rating: {
      type: DataTypes.DECIMAL(3, 2),
      allowNull: true,
      validate: {
        min: 0.00,
        max: 5.00
      }
    },
    totalReviews: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
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
    tableName: 'workers',
    timestamps: true,
    paranoid: true, // Enables soft deletes
    indexes: [
      {
        fields: ['userId']
      },
      {
        fields: ['isActive']
      },
      {
        fields: ['rating']
      },
      {
        fields: ['createdAt']
      }
    ]
  });

  // Instance methods
  Worker.prototype.updateRating = function(newRating) {
    const currentTotal = this.rating * this.totalReviews || 0;
    this.totalReviews += 1;
    this.rating = (currentTotal + newRating) / this.totalReviews;
    return this.save();
  };

  Worker.prototype.addCompletedJob = function() {
    this.completedJobs += 1;
    return this.save();
  };

  // Class methods
  Worker.findBySkills = async function(skills) {
    return await this.findAll({
      where: {
        skills: {
          [sequelize.Sequelize.Op.overlap]: skills
        },
        isActive: true
      }
    });
  };

  Worker.findTopRated = async function(limit = 10) {
    return await this.findAll({
      where: {
        isActive: true,
        totalReviews: {
          [sequelize.Sequelize.Op.gte]: 5
        }
      },
      order: [['rating', 'DESC']],
      limit
    });
  };

  return Worker;
};