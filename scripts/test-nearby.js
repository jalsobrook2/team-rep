const mongoose = require('mongoose');
require('dotenv').config();

const Job = require('../models/Job');
const Worker = require('../models/Worker');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/backend-example';

async function main(){
  console.log('Connecting to MongoDB:', MONGODB_URI);
  await mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });

  try{
    // Ensure geospatial index exists
    console.log('Ensuring 2dsphere index on jobs.locationCoords...');
    await Job.collection.createIndex({ locationCoords: '2dsphere' });
    console.log('Index ensured');

    // Pick demo worker
    const demo = await Worker.findOne({ email: (process.env.DEMO_EMAIL || 'demo@pocketjob.test').toLowerCase().trim() });
    if(!demo || !demo.locationCoords || !Array.isArray(demo.locationCoords.coordinates)){
      console.error('Demo worker or demo coordinates not found. Worker:', demo && demo.email);
      process.exit(1);
    }

    const [lng, lat] = demo.locationCoords.coordinates.map(Number);
    console.log('Using demo coords:', lat, lng);

    const radiusMeters = 50 * 1000; // 50km

    const jobs = await Job.find({
      locationCoords: {
        $near: {
          $geometry: { type: 'Point', coordinates: [lng, lat] },
          $maxDistance: radiusMeters
        }
      }
    }).limit(20);

    console.log('Found', jobs.length, 'jobs near demo worker:');
    jobs.forEach(j => console.log('-', j.title, j.location, j._id.toString()));
  }catch(err){
    console.error('Error during nearby test:', err && err.message ? err.message : err);
  }finally{
    await mongoose.disconnect();
  }
}

main();
