const mongoose = require('mongoose');
require('dotenv').config();
const Job = require('../models/Job');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/backend-example';

(async ()=>{
  console.log('Connecting to MongoDB:', MONGODB_URI);
  await mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  try{
    const seattleLng = -122.3321;
    const seattleLat = 47.6062;
    const jobs = await Job.find({ 'locationCoords.coordinates': { $exists: true } }).lean();
    const filtered = jobs.filter(j => {
      if(!j.locationCoords || !Array.isArray(j.locationCoords.coordinates)) return false;
      const [lng, lat] = j.locationCoords.coordinates.map(Number);
      // skip Seattle exact match (allow slight rounding differences)
      if(Math.abs(lng - seattleLng) < 0.0002 && Math.abs(lat - seattleLat) < 0.0002) return false;
      return true;
    });
    if(filtered.length===0){
      console.log('No jobs found with hard-coded coords other than the Seattle job');
    } else {
      console.log('Jobs with explicit locationCoords (excluding Seattle):');
      filtered.forEach(j => {
        const [lng, lat] = j.locationCoords.coordinates.map(Number);
        console.log(`- ${j.title || j._id} | ${j.location || 'N/A'} | coords: [${lng}, ${lat}] | id: ${j._id}`);
      });
    }
  }catch(e){
    console.error('Error querying jobs:', e && e.message ? e.message : e);
    process.exit(2);
  }finally{
    await mongoose.disconnect();
    process.exit(0);
  }
})();
