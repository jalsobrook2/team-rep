const mongoose = require('mongoose');
require('dotenv').config();
const Job = require('../models/Job');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/backend-example';
const JOB_ID = process.env.JOB_ID || '690a7d2ae7c92991a6d609e7';
// Murray, KY coordinates (approx): lat 36.6107, lon -88.3145
const MURRAY_COORDS = [-88.3145, 36.6107];

(async ()=>{
  console.log('Connecting to MongoDB:', MONGODB_URI);
  await mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  try{
    const job = await Job.findById(JOB_ID);
    if(!job){ console.error('Job not found:', JOB_ID); process.exit(2); }
    job.locationCoords = { type: 'Point', coordinates: MURRAY_COORDS };
    // Optionally normalize location string
    if(!job.location || !job.location.trim()) job.location = 'Murray, KY';
    await job.save();
    console.log('Updated job', JOB_ID, '-> coords:', MURRAY_COORDS);
  }catch(e){ console.error('Error updating job:', e && e.message ? e.message : e); process.exit(3); }
  finally{ await mongoose.disconnect(); process.exit(0); }
})();
