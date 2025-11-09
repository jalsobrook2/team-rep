const mongoose = require('mongoose');

// Set test environment
process.env.NODE_ENV = 'test';

// Use Docker MongoDB for testing
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/backend-example-test';

// Setup Docker MongoDB connection before all tests
beforeAll(async () => {
  // Connect mongoose to the Docker MongoDB with a test database
  await mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
});

// Cleanup after all tests
afterAll(async () => {
  // Clear the test database
  await mongoose.connection.db.dropDatabase();
  
  // Close mongoose connection
  await mongoose.connection.close();
});

// Clear all test data after each test
afterEach(async () => {
  const collections = mongoose.connection.collections;
  
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
});