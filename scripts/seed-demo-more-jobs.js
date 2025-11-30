const mongoose = require('mongoose');
require('dotenv').config();

const Worker = require('../models/Worker');
const Job = require('../models/Job');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/backend-example';

// Jobs arranged by owner email
const moreJobs = {
  'demo@pocketjob.test': [
    { title: 'SF Nearby: Community Garden Help', description: 'Help plant and water flowers.', location: 'Oakland, CA', coords: [-122.2711, 37.8044], offer: 20 },
    { title: 'SF Nearby: Move small furniture', description: 'Move a bookshelf within Daly City.', location: 'Daly City, CA', coords: [-122.4750, 37.6879], offer: 30 },
    { title: 'SF Far: Deliver documents to LA', description: 'Drive documents to Los Angeles.', location: 'Los Angeles, CA', coords: [-118.2437, 34.0522], offer: 120 },
    { title: 'SF Far: Tech meetup help in Seattle', description: 'Assist event setup in Seattle.', location: 'Seattle, WA', coords: [-122.3321, 47.6062], offer: 150 }
  ],
  'alice@demo.test': [
    { title: 'NY Nearby: Assemble desk', description: 'Assemble small office desk in Brooklyn.', location: 'Brooklyn, NY', coords: [-73.9442, 40.6782], offer: 35 },
    { title: 'NY Nearby: Grocery pickup', description: 'Pick up groceries in Jersey City.', location: 'Jersey City, NJ', coords: [-74.0657, 40.7178], offer: 15 },
    { title: 'NY Far: Transport boxes to LA', description: 'Ship boxes cross-country to LA.', location: 'Los Angeles, CA', coords: [-118.2437, 34.0522], offer: 200 },
    { title: 'NY Far: Beach cleanup in Miami', description: 'Coordinate small beach cleanup team.', location: 'Miami, FL', coords: [-80.1918, 25.7617], offer: 90 }
  ],
  'bob@demo.test': [
    { title: 'London Nearby: Market stall setup', description: 'Help set up a market stall in Camden.', location: 'Camden, London', coords: [-0.1396, 51.5416], offer: 22 },
    { title: 'London Nearby: Park bench repair', description: 'Repair bench near Greenwich Park.', location: 'Greenwich, London', coords: [0.0007, 51.4826], offer: 28 },
    { title: 'London Far: Conference assistance in Edinburgh', description: 'Assist conference logistics.', location: 'Edinburgh, UK', coords: [-3.1883, 55.9533], offer: 130 },
    { title: 'London Far: Art fair help in Paris', description: 'Help at international art fair.', location: 'Paris, France', coords: [2.3522, 48.8566], offer: 140 }
  ]
};

async function run() {
  console.log('Connecting to MongoDB:', MONGODB_URI);
  await mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  try {
    for (const email of Object.keys(moreJobs)) {
      const worker = await Worker.findOne({ email });
      if (!worker) {
        console.warn(`Worker ${email} not found — skipping jobs for this owner`);
        continue;
      }

      const jobs = moreJobs[email];
      for (const j of jobs) {
        const jobDoc = new Job({
          owner: worker._id,
          title: j.title,
          description: j.description,
          location: j.location,
          locationCoords: { type: 'Point', coordinates: j.coords },
          offer: j.offer,
          timeDue: new Date(Date.now() + (3 + Math.floor(Math.random() * 14)) * 24 * 60 * 60 * 1000)
        });
        await jobDoc.save();
        // Ensure the owner's postedJobs contains this job id
        await Worker.findByIdAndUpdate(worker._id, { $addToSet: { postedJobs: jobDoc._id } });
        console.log(`Created job for ${email}: ${jobDoc._id.toString()} -> ${j.title}`);
      }
    }
    console.log('Finished seeding additional demo jobs.');
  } catch (err) {
    console.error('Error seeding more demo jobs:', err && err.message ? err.message : err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

run().catch(err => { console.error('Unhandled error:', err); process.exit(1); });
