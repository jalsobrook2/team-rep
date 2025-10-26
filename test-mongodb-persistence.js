require('dotenv').config();
const mongoose = require('mongoose');
const Worker = require('./models/Worker');

// Test script to verify MongoDB connection and data persistence
async function testMongoDBPersistence() {
  try {
    console.log('Testing MongoDB connection and data persistence...\n');

    // Get MongoDB URI from environment
    const MONGODB_URI = process.env.MONGODB_URI;
    if (!MONGODB_URI) {
      throw new Error('MONGODB_URI not found in environment variables. Make sure .env file exists.');
    }

    // Mask password in URI for logging
    const maskedUri = MONGODB_URI.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@');
    console.log(`Connecting to: ${maskedUri}`);

    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000
    });
    console.log('✓ Successfully connected to MongoDB\n');

    // Test 1: Create a test user
    console.log('Test 1: Creating a test user...');
    const testEmail = `test-${Date.now()}@example.com`;
    const testUser = new Worker({
      name: 'Test User',
      email: testEmail,
      password: 'testPassword123',
      skills: 'Testing, Node.js'
    });
    await testUser.save();
    console.log(`✓ User created with email: ${testEmail}\n`);

    // Test 2: Verify password is hashed
    console.log('Test 2: Verifying password is hashed...');
    const savedUser = await Worker.findOne({ email: testEmail });
    if (savedUser.password === 'testPassword123') {
      console.log('✗ FAIL: Password is stored in plaintext!');
    } else {
      console.log('✓ Password is properly hashed');
      console.log(`  Hashed password: ${savedUser.password.substring(0, 20)}...\n`);
    }

    // Test 3: Verify password comparison works
    console.log('Test 3: Testing password comparison...');
    const isMatch = await savedUser.comparePassword('testPassword123');
    if (isMatch) {
      console.log('✓ Password comparison works correctly\n');
    } else {
      console.log('✗ FAIL: Password comparison failed\n');
    }

    // Test 4: Retrieve user from database
    console.log('Test 4: Retrieving user from database...');
    const retrievedUser = await Worker.findOne({ email: testEmail });
    if (retrievedUser) {
      console.log('✓ User successfully retrieved from database');
      console.log(`  Name: ${retrievedUser.name}`);
      console.log(`  Email: ${retrievedUser.email}`);
      console.log(`  Skills: ${retrievedUser.skills}\n`);
    } else {
      console.log('✗ FAIL: Could not retrieve user\n');
    }

    // Test 5: Count total users
    console.log('Test 5: Counting total users in database...');
    const userCount = await Worker.countDocuments();
    console.log(`✓ Total users in database: ${userCount}\n`);

    // Cleanup: Remove test user
    console.log('Cleanup: Removing test user...');
    await Worker.deleteOne({ email: testEmail });
    console.log('✓ Test user removed\n');

    console.log('═══════════════════════════════════════');
    console.log('All tests passed! ✓');
    console.log('MongoDB connection and persistence verified.');
    console.log('═══════════════════════════════════════');

  } catch (error) {
    console.error('\n✗ Error during testing:');
    console.error(error.message);
    if (error.code === 'ENOTFOUND') {
      console.error('\nConnection error: Could not resolve MongoDB hostname.');
      console.error('Make sure your MONGODB_URI is correct and your IP is whitelisted in MongoDB Atlas.');
    } else if (error.name === 'MongoServerError' && error.code === 18) {
      console.error('\nAuthentication failed: Check your username and password in MONGODB_URI.');
    }
  } finally {
    // Close connection
    await mongoose.connection.close();
    console.log('\nMongoDB connection closed.');
  }
}

// Run the test
testMongoDBPersistence();
