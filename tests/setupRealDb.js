const mongoose = require('mongoose');
/**
 * Setup test DB connection. Prefer a real DB when `MONGODB_URI_TEST` or
 * `MONGODB_URI` is provided. Otherwise fall back to an in-memory MongoDB
 * using `mongodb-memory-server` so tests can run locally/CI without a live
 * database.
 */
module.exports = async function setupRealDb() {
  let testDbUri = process.env.MONGODB_URI_TEST || process.env.MONGODB_URI;

  // If no explicit test URI, start an in-memory MongoDB instance.
  if (!testDbUri) {
    try {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      const mongod = await MongoMemoryServer.create();
      testDbUri = mongod.getUri();
      // expose instance for potential teardown/debugging
      module.exports._mongoMemoryServer = mongod;
      console.log('Started in-memory MongoDB for tests');
    } catch (e) {
      console.error('\nERROR: failed to start in-memory MongoDB. Set MONGODB_URI_TEST to use a real DB.');
      console.error(e && e.message ? e.message : e);
      process.exit(1);
    }
  }

  const runningInDocker = process.env.DOCKER === 'true' || process.env.CONTAINER === 'true' || process.env.MONGO_HOST === 'mongo';
  if (!runningInDocker && testDbUri && testDbUri.includes('mongo') && !process.env.MONGODB_URI_TEST && process.env.MONGODB_URI) {
    // if env points to a Docker hostname like 'mongo' but not running in Docker,
    // replace it with 127.0.0.1 so local runs connect to the exposed port.
    testDbUri = testDbUri.replace(/mongodb:\/\/(?:[^:/]+)(:?)/, 'mongodb://127.0.0.1$1'); 
  }

  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }

  try {
    await mongoose.connect(testDbUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000
    });
    console.log('Connected to MongoDB for tests:', testDbUri);
  } catch (err) {
    console.error('Failed to connect to MongoDB at', testDbUri, err && err.message ? `- ${err.message}` : err);
    // Fallback: if real DB is unreachable, try starting an in-memory MongoDB instance
    try {
      console.log('Falling back to in-memory MongoDB for tests');
      const { MongoMemoryServer } = require('mongodb-memory-server');
      const mongod = await MongoMemoryServer.create();
      testDbUri = mongod.getUri();
      module.exports._mongoMemoryServer = mongod;
      await mongoose.connect(testDbUri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 5000
      });
      console.log('Connected to in-memory MongoDB for tests:', testDbUri);
    } catch (memErr) {
      console.error('Failed to start fallback in-memory MongoDB:', memErr && memErr.message ? memErr.message : memErr);
      process.exit(1);
    }
  }
};
