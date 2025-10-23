const { Sequelize } = require('sequelize');
require('dotenv').config();

// Database configuration
const config = {
  development: {
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME || 'safegig_dev',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: console.log, // Enable SQL logging in development
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  },
  test: {
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME_TEST || 'safegig_test',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: false, // Disable logging in tests
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  },
  production: {
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: false, // Disable logging in production
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    ssl: process.env.NODE_ENV === 'production' ? {
      require: true,
      rejectUnauthorized: false
    } : false
  }
};

const env = process.env.NODE_ENV || 'development';
const dbConfig = config[env];

// Create Sequelize instance
const sequelize = new Sequelize(
  dbConfig.database,
  dbConfig.username,
  dbConfig.password,
  {
    host: dbConfig.host,
    port: dbConfig.port,
    dialect: dbConfig.dialect,
    logging: dbConfig.logging,
    pool: dbConfig.pool,
    ...(dbConfig.ssl && { dialectOptions: { ssl: dbConfig.ssl } })
  }
);

// Import models
const User = require('../models/User')(sequelize);
const Job = require('../models/Job')(sequelize);  
const Worker = require('../models/Worker')(sequelize);

// Define associations
User.hasMany(Job, { 
  foreignKey: 'ownerId', 
  as: 'createdJobs',
  onDelete: 'CASCADE'
});

Job.belongsTo(User, { 
  foreignKey: 'ownerId', 
  as: 'owner'
});

User.hasMany(Job, { 
  foreignKey: 'workerId', 
  as: 'assignedJobs',
  onDelete: 'SET NULL'
});

Job.belongsTo(User, { 
  foreignKey: 'workerId', 
  as: 'assignedWorker'
});

// Export database object
const db = {
  sequelize,
  Sequelize,
  User,
  Job,
  Worker
};

module.exports = db;