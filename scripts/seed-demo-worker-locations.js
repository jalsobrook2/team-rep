const mongoose = require('mongoose');
require('dotenv').config();

const Worker = require('../models/Worker');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/backend-example';

// Map demo emails to coordinates (lng, lat)
const demoLocations = {
  'demo@pocketjob.test': { location: 'San Francisco, CA', coords: [-122.4194, 37.7749] },
  'alice@demo.test': { location: 'New York, NY', coords: [-74.0060, 40.7128] },
  'bob@demo.test': { location: 'London, UK', coords: [-0.1278, 51.5074] }
};

async function main(){
  console.log('Connecting to MongoDB:', MONGODB_URI);
  await mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  try {
    for (const [email, data] of Object.entries(demoLocations)){
      const worker = await Worker.findOne({ email });
      if (!worker) {
        console.warn('Worker not found:', email);
        continue;
      }

      worker.location = data.location;
      worker.locationCoords = { type: 'Point', coordinates: data.coords };
      await worker.save();
      console.log('Updated worker with location:', email, data.location);
    }
    console.log('Demo worker location seeding complete.');
  } catch (err) {
    console.error('Error seeding worker locations:', err && err.message ? err.message : err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

main().catch(err => { console.error('Unhandled:', err); process.exit(1); });
