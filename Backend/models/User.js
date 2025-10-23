const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');

module.exports = (sequelize) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false
    },
    username: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      validate: {
        len: [3, 50],
        notEmpty: true,
        isAlphanumeric: {
          msg: 'Username must contain only letters and numbers'
        }
      }
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: {
          msg: 'Must be a valid email address'
        },
        notEmpty: true
      }
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        len: {
          args: [6, 255],
          msg: 'Password must be at least 6 characters long'
        }
      }
    },
    firstName: {
      type: DataTypes.STRING(50),
      allowNull: false,
      validate: {
        len: [1, 50],
        notEmpty: true
      }
    },
    lastName: {
      type: DataTypes.STRING(50),
      allowNull: false,
      validate: {
        len: [1, 50],
        notEmpty: true
      }
    },
    phone: {
      type: DataTypes.STRING(20),
      allowNull: true,
      validate: {
        is: {
          args: /^[\+]?[1-9][\d]{0,15}$/,
          msg: 'Phone number must be valid'
        }
      }
    },
    role: {
      type: DataTypes.ENUM('worker', 'requester', 'both'),
      allowNull: false,
      defaultValue: 'both',
      validate: {
        isIn: {
          args: [['worker', 'requester', 'both']],
          msg: 'Role must be worker, requester, or both'
        }
      }
    },
    // Safety and verification fields
    isVerified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false
    },
    verificationLevel: {
      type: DataTypes.ENUM('none', 'email', 'phone', 'id', 'background'),
      defaultValue: 'none',
      allowNull: false
    },
    safetyRating: {
      type: DataTypes.DECIMAL(3, 2),
      allowNull: true,
      validate: {
        min: 0.00,
        max: 5.00
      }
    },
    totalRatings: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false
    },
    // Profile information
    bio: {
      type: DataTypes.TEXT,
      allowNull: true,
      validate: {
        len: [0, 1000]
      }
    },
    skills: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: true,
      defaultValue: []
    },
    location: {
      type: DataTypes.JSONB,
      allowNull: true,
      // Structure: { address: '', city: '', state: '', zipCode: '', lat: 0, lng: 0 }
    },
    availability: {
      type: DataTypes.JSONB,
      allowNull: true,
      // Structure: { days: ['monday', 'tuesday'], timeSlots: [{ start: '09:00', end: '17:00' }] }
    },
    emergencyContact: {
      type: DataTypes.JSONB,
      allowNull: true,
      // Structure: { name: '', phone: '', relationship: '' }
    },
    // Account status
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false
    },
    lastLogin: {
      type: DataTypes.DATE,
      allowNull: true
    },
    refreshToken: {
      type: DataTypes.TEXT,
      allowNull: true
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
    // Model options
    tableName: 'users',
    timestamps: true,
    paranoid: true, // Enables soft deletes
    indexes: [
      {
        unique: true,
        fields: ['email']
      },
      {
        unique: true,
        fields: ['username']
      },
      {
        fields: ['role']
      },
      {
        fields: ['isVerified']
      },
      {
        fields: ['isActive']
      },
      {
        fields: ['createdAt']
      }
    ],
    hooks: {
      // Hash password before creating user
      beforeCreate: async (user) => {
        if (user.password) {
          const saltRounds = 12;
          user.password = await bcrypt.hash(user.password, saltRounds);
        }
      },
      // Hash password before updating if it's changed
      beforeUpdate: async (user) => {
        if (user.changed('password')) {
          const saltRounds = 12;
          user.password = await bcrypt.hash(user.password, saltRounds);
        }
      }
    }
  });

  // Instance methods
  User.prototype.validatePassword = async function(password) {
    return await bcrypt.compare(password, this.password);
  };

  User.prototype.toSafeObject = function() {
    const { password, refreshToken, ...safeUser } = this.toJSON();
    return safeUser;
  };

  User.prototype.updateSafetyRating = function(newRating) {
    const currentTotal = this.safetyRating * this.totalRatings || 0;
    this.totalRatings += 1;
    this.safetyRating = (currentTotal + newRating) / this.totalRatings;
    return this.save();
  };

  // Class methods
  User.findByEmailOrUsername = async function(identifier) {
    return await this.findOne({
      where: {
        [sequelize.Sequelize.Op.or]: [
          { email: identifier },
          { username: identifier }
        ]
      }
    });
  };

  User.findActiveUsers = async function() {
    return await this.findAll({
      where: {
        isActive: true,
        deletedAt: null
      }
    });
  };

  return User;
};