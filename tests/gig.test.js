const request = require('supertest');
const app = require('../server');
const Gig = require('../models/Gig');
const Worker = require('../models/Worker');
const mongoose = require('mongoose');

describe('Gig Controller Tests', () => {
  let authToken;
  let userId;
  let gigId;

  beforeEach(async () => {

    // Create test user and get auth token
    const userData = {
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123',
      skills: 'Web Development'
    };

    const registerResponse = await request(app)
      .post('/api/auth/signup')
      .send(userData);

    authToken = registerResponse.body.data.accessToken;
    userId = registerResponse.body.data.worker._id;
  });



  describe('POST /api/gigs', () => {
    it('should create a new gig with valid data', async () => {
      const gigData = {
        title: 'Test Gig Creation',
        description: 'This is a test gig for unit testing purposes. It includes all required fields.',
        price: 99.99,
        category: 'web-development',
        deliveryTime: 7,
        tags: ['test', 'web development']
      };

      const response = await request(app)
        .post('/api/gigs')
        .set('Authorization', `Bearer ${authToken}`)
        .send(gigData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe(gigData.title);
      expect(response.body.data.price).toBe(gigData.price);
      expect(response.body.data.user_id._id).toBe(userId);

      gigId = response.body.data._id;
    });

    it('should return 400 for missing required fields', async () => {
      const incompleteGigData = {
        title: 'Incomplete Gig',
        // Missing description, price, category, deliveryTime
      };

      const response = await request(app)
        .post('/api/gigs')
        .set('Authorization', `Bearer ${authToken}`)
        .send(incompleteGigData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('All required fields must be provided');
    });

    it('should return 401 without authentication', async () => {
      const gigData = {
        title: 'Unauthorized Gig',
        description: 'This should fail without auth.',
        price: 50,
        category: 'web-development',
        deliveryTime: 3
      };

      const response = await request(app)
        .post('/api/gigs')
        .send(gigData);

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/gigs', () => {
    beforeEach(async () => {
      // Create test gigs
      const testGigs = [
        {
          user_id: userId,
          title: 'First Test Gig',
          description: 'First gig description for testing.',
          price: 25.00,
          category: 'web-development',
          deliveryTime: 3,
          status: 'active'
        },
        {
          user_id: userId,
          title: 'Second Test Gig',
          description: 'Second gig description for testing.',
          price: 75.00,
          category: 'design',
          deliveryTime: 5,
          status: 'active'
        }
      ];

      await Gig.insertMany(testGigs);
    });

    it('should get all active gigs without authentication', async () => {
      const response = await request(app).get('/api/gigs');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.pagination.totalGigs).toBe(2);
    });

    it('should filter gigs by category', async () => {
      const response = await request(app)
        .get('/api/gigs')
        .query({ category: 'web-development' });

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].category).toBe('web-development');
    });

    it('should filter gigs by price range', async () => {
      const response = await request(app)
        .get('/api/gigs')
        .query({ minPrice: 30, maxPrice: 80 });

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].price).toBe(75.00);
    });

    it('should search gigs by title', async () => {
      const response = await request(app)
        .get('/api/gigs')
        .query({ search: 'First Test' });

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].title).toContain('First Test');
    });
  });

  describe('GET /api/gigs/:id', () => {
    beforeEach(async () => {
      const gig = new Gig({
        user_id: userId,
        title: 'Single Gig Test',
        description: 'This gig is for testing single gig retrieval.',
        price: 150.00,
        category: 'programming',
        deliveryTime: 10
      });

      const savedGig = await gig.save();
      gigId = savedGig._id;
    });

    it('should get a specific gig by ID', async () => {
      const response = await request(app).get(`/api/gigs/${gigId}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe('Single Gig Test');
      expect(response.body.data.price).toBe(150.00);
    });

    it('should return 404 for non-existent gig', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request(app).get(`/api/gigs/${fakeId}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Gig not found');
    });

    it('should return 400 for invalid gig ID format', async () => {
      const response = await request(app).get('/api/gigs/invalid-id');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid gig ID format');
    });
  });

  describe('PUT /api/gigs/:id', () => {
    beforeEach(async () => {
      const gig = new Gig({
        user_id: userId,
        title: 'Updatable Gig',
        description: 'This gig will be updated in tests.',
        price: 100.00,
        category: 'writing',
        deliveryTime: 7
      });

      const savedGig = await gig.save();
      gigId = savedGig._id;
    });

    it('should update gig with valid data', async () => {
      const updateData = {
        title: 'Updated Gig Title',
        price: 120.00,
        description: 'This gig has been updated with new information.'
      };

      const response = await request(app)
        .put(`/api/gigs/${gigId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe(updateData.title);
      expect(response.body.data.price).toBe(updateData.price);
    });

    it('should return 403 when trying to update another user\'s gig', async () => {
      // Create another user
      const otherUserData = {
        name: 'Other User',
        email: 'other@example.com',
        password: 'password123',
        skills: 'Design'
      };

      const otherUserResponse = await request(app)
        .post('/api/auth/signup')
        .send(otherUserData);

      const otherUserToken = otherUserResponse.body.data.accessToken;

      const updateData = {
        title: 'Unauthorized Update'
      };

      const response = await request(app)
        .put(`/api/gigs/${gigId}`)
        .set('Authorization', `Bearer ${otherUserToken}`)
        .send(updateData);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('You can only update your own gigs');
    });
  });

  describe('DELETE /api/gigs/:id', () => {
    beforeEach(async () => {
      const gig = new Gig({
        user_id: userId,
        title: 'Deletable Gig',
        description: 'This gig will be deleted in tests.',
        price: 50.00,
        category: 'other',
        deliveryTime: 3
      });

      const savedGig = await gig.save();
      gigId = savedGig._id;
    });

    it('should delete gig successfully', async () => {
      const response = await request(app)
        .delete(`/api/gigs/${gigId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Gig deleted successfully');

      // Verify gig is actually deleted
      const deletedGig = await Gig.findById(gigId);
      expect(deletedGig).toBeNull();
    });

    it('should return 404 when trying to delete non-existent gig', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      
      const response = await request(app)
        .delete(`/api/gigs/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Gig not found');
    });
  });

  describe('GET /api/gigs/categories', () => {
    it('should return available gig categories', async () => {
      const response = await request(app).get('/api/gigs/categories');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      
      // Check that categories have required structure
      const firstCategory = response.body.data[0];
      expect(firstCategory).toHaveProperty('value');
      expect(firstCategory).toHaveProperty('label');
    });
  });
});