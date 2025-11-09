const request = require('supertest');
const mongoose = require('mongoose');
const app = require('./server');

async function testRoutes() {
  try {
    console.log('Testing debug route...');
    const debugResponse = await request(app).get('/api/test-public');
    console.log('Debug route status:', debugResponse.status);
    console.log('Debug route body:', debugResponse.body);
    
    console.log('\nTesting gigs route...');
    const gigsResponse = await request(app).get('/api/gigs');
    console.log('Gigs route status:', gigsResponse.status);
    console.log('Gigs route body:', gigsResponse.body);
  } catch (error) {
    console.error('Error during testing:', error);
  } finally {
    // Close database connection and exit
    await mongoose.connection.close();
    process.exit(0);
  }
}

testRoutes().catch(console.error);