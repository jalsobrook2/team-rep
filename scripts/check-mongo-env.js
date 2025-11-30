// Simple guard script used by npm script "test:require-db"
// Exits with non-zero status if MONGODB_URI_TEST is not set or seems empty.

const uri = process.env.MONGODB_URI_TEST || process.env.MONGODB_URI;

if (!uri || typeof uri !== 'string' || uri.trim() === '') {
  console.error('\nERROR: MONGODB_URI_TEST (or MONGODB_URI) is not set.');
  console.error('Set MONGODB_URI_TEST to your MongoDB connection string before running this script.');
  console.error('Example: MONGODB_URI_TEST=mongodb://127.0.0.1:27017/backend-example-test npm run test:require-db\n');
  process.exit(1);
}

console.log('Using MongoDB URI for tests:', uri);
process.exit(0);
