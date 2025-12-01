const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;

const connect = async () => {
  const useExternal = !!process.env.MONGODB_URI_TEST || process.env.CI === 'true';
  if (useExternal) {
    const uri = process.env.MONGODB_URI_TEST || process.env.MONGODB_URI || 'mongodb://localhost:27017/backend-example-test';
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
    return { kind: 'external', uri };
  }
  // fallback to memory server locally
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
  return { kind: 'memory', uri };
};

const clear = async () => {
  const { connection } = mongoose;
  if (!connection || !connection.db) return;
  const collections = await connection.db.collections();
  for (const collection of collections) {
    try { await collection.deleteMany({}); } catch (_) { /* ignore errors */ }
  }
};

const close = async () => {
  await mongoose.connection.close();
  if (mongod) {
    try { await mongod.stop(); } catch (_) { /* ignore errors */ }
    mongod = null;
  }
};

module.exports = { connect, clear, close };
