const mongoose = require('mongoose');
require('dotenv').config();
const Job = require('../models/Job');
const { geocodeAddress } = require('../utils/geocode');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/backend-example';

(async ()=>{
  console.log('Connecting to MongoDB:', MONGODB_URI);
  await mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  try{
    const disableGeocode = process.env.DISABLE_GEOCODING === 'true';
    const cursor = Job.find({ $or: [ { locationCoords: { $exists: false } }, { locationCoords: null } ] }).cursor();
    const updated = [];
    const skipped = [];
    for (let job = await cursor.next(); job != null; job = await cursor.next()){
      const loc = (job.location || '').trim();
      if(!loc){
        skipped.push({ id: job._id.toString(), reason: 'no textual location' });
        continue;
      }
      if(disableGeocode){
        skipped.push({ id: job._id.toString(), reason: 'geocoding disabled' });
        continue;
      }
      console.log('Geocoding job', job._id.toString(), '->', loc);
      try{
        const geo = await geocodeAddress(loc);
        if(!geo || Number.isNaN(geo.lat) || Number.isNaN(geo.lon)){
          skipped.push({ id: job._id.toString(), reason: 'geocode returned null' });
          continue;
        }
        job.locationCoords = { type: 'Point', coordinates: [ parseFloat(geo.lon), parseFloat(geo.lat) ] };
        await job.save();
        updated.push({ id: job._id.toString(), coords: job.locationCoords.coordinates });
        console.log('Updated', job._id.toString(), job.locationCoords.coordinates);
      }catch(e){
        console.warn('Failed to geocode/save job', job._id.toString(), e && e.message ? e.message : e);
        skipped.push({ id: job._id.toString(), reason: 'error' });
      }
    }

    console.log('\nSummary:');
    console.log('Updated:', updated.length);
    updated.slice(0,50).forEach(u => console.log('-', u.id, u.coords));
    console.log('Skipped:', skipped.length);
    skipped.slice(0,50).forEach(s => console.log('-', s.id, s.reason));
  }catch(e){
    console.error('Script failed:', e && e.message ? e.message : e);
    process.exit(2);
  }finally{
    await mongoose.disconnect();
    process.exit(0);
  }
})();
