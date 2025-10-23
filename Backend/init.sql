-- SafeGig Database Initialization Script
-- This script sets up the initial database structure and test data

-- Create database if it doesn't exist (this is handled by Docker environment variables)
-- CREATE DATABASE IF NOT EXISTS safegig_dev;

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis"; -- For location-based queries (optional)

-- Create test database for running tests
CREATE DATABASE safegig_test;

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE safegig_dev TO postgres;
GRANT ALL PRIVILEGES ON DATABASE safegig_test TO postgres;

-- Insert sample data (will be created by Sequelize migrations)
-- This is just a placeholder for any initial setup needed