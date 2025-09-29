const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/backend-example';

mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB');
  })
  .catch((error) => {
    console.error('MongoDB connection error:', error);
  });

// Routes
const jobRoutes = require('./routes/jobRoutes');
app.use('/api', jobRoutes);
const workerRoutes = require('./routes/workerRoutes');
app.use('/api', workerRoutes);

// Default route
app.get('/', (req, res) => {
  res.json({
    success: true,
    data: {
      job: 'Backend Example API is running!',
      jobEndpoints: [
        'POST /api/jobs - Create a new job',
        'GET /api/jobs - Get all jobs',
        'GET /api/jobs/:id - Get a specific job by ID',
        'PUT /api/jobs/:id - Update a job by ID',
        'DELETE /api/jobs/:id - Delete a job by ID'
      ],
      worker: 'Example API for workers',
      workerEndpoints: [
        'POST /api/workers - Create a new worker',
        'GET /api/workers - Get all workers',
        'GET /api/workers/:id - Get a specific worker by ID',
        'PUT /api/workers/:id - Update a worker by ID',
        'DELETE /api/workers/:id - Delete a worker by ID'
      ]
    }
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found'
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error(error.stack);
  res.status(500).json({
    success: false,
    error: 'Something went wrong!'
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Visit http://localhost:${PORT} to see available endpoints`);
});

module.exports = app;