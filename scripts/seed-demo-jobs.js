const mongoose = require('mongoose');
require('dotenv').config();

const Worker = require('../models/Worker');
const Job = require('../models/Job');

// Default Mongo URI (matches server.js fallback)
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/backend-example';

const demoAccounts = [
  { email: (process.env.DEMO_EMAIL || 'demo@pocketjob.test').toLowerCase().trim(), name: 'Demo User' },
  { email: (process.env.DEMO_EMAIL_2 || 'alice@demo.test').toLowerCase().trim(), name: 'Alice Demo' },
  { email: (process.env.DEMO_EMAIL_3 || 'bob@demo.test').toLowerCase().trim(), name: 'Bob Demo' }
];

// Example jobs with locations (lng, lat)
const exampleJobs = [
  {
    title: 'Demo: Clean up the park',
    description: 'Pick up trash and tidy the community park area.',
    location: 'San Francisco, CA',
    coords: [-122.4194, 37.7749],
    offer: 25
  },
  {
    title: 'Alice: Assemble bookshelf',
    description: 'Assemble a 5-shelf unit and mount to wall.',
    location: 'New York, NY',
    coords: [-74.0060, 40.7128],
    offer: 40
  },
  {
    title: 'Bob: Dog walking for a week',
    description: 'Daily 30-minute dog walks for one week.',
    location: 'London, UK',
    coords: [-0.1278, 51.5074],
    offer: 60
  }
];

async function main() {
  console.log('Connecting to MongoDB:', MONGODB_URI);
  await mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });

  try {
    for (let i = 0; i < demoAccounts.length; i++) {
      const acct = demoAccounts[i];
      let worker = await Worker.findOne({ email: acct.email });
      if (!worker) {
        // create a minimal demo worker if missing
        const password = process.env.DEMO_PASSWORD || 'Demo123!';
        worker = new Worker({ name: acct.name, email: acct.email, password, skills: 'Demo' });
        await worker.save();
        console.log('Created demo worker:', acct.email);
      } else {
        console.log('Found demo worker:', acct.email);
      }

      const jobSpec = exampleJobs[i];
      const job = new Job({
        owner: worker._id,
        title: jobSpec.title,
        description: jobSpec.description,
        location: jobSpec.location,
        locationCoords: { type: 'Point', coordinates: jobSpec.coords },
        offer: jobSpec.offer,
        timeDue: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // due in 7 days
      });

      await job.save();
      // Ensure worker.postedJobs contains this job id
      await Worker.findByIdAndUpdate(worker._id, { $addToSet: { postedJobs: job._id } });
      console.log('Created job for', acct.email, '→', job._id.toString());
    }

    console.log('Seeding complete.');
  } catch (err) {
    console.error('Error seeding demo jobs:', err && err.message ? err.message : err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

main().catch(err => {
  console.error('Unhandled error in seed script:', err);
  process.exit(1);
});
