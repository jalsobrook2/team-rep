const request = require('supertest');
const app = require('../server');
const Order = require('../models/Order');
const Gig = require('../models/Gig');
const Worker = require('../models/Worker');
const mongoose = require('mongoose');

describe('Order Controller Tests', () => {
  let sellerToken, buyerToken;
  let sellerId, buyerId;
  let gigId, orderId;

  beforeEach(async () => {

    // Create seller user
    const sellerData = {
      name: 'Test Seller',
      email: 'seller@example.com',
      password: 'password123',
      skills: 'Web Development'
    };

    const sellerResponse = await request(app)
      .post('/api/auth/signup')
      .send(sellerData);

    sellerToken = sellerResponse.body.data.accessToken;
    sellerId = sellerResponse.body.data.worker._id;

    // Create buyer user
    const buyerData = {
      name: 'Test Buyer',
      email: 'buyer@example.com',
      password: 'password123',
      skills: 'Project Management'
    };

    const buyerResponse = await request(app)
      .post('/api/auth/signup')
      .send(buyerData);

    buyerToken = buyerResponse.body.data.accessToken;
    buyerId = buyerResponse.body.data.worker._id;

    // Create test gig
    const gig = new Gig({
      user_id: sellerId,
      title: 'Test Gig for Orders',
      description: 'This gig is created for order testing purposes.',
      price: 100.00,
      category: 'web-development',
      deliveryTime: 7,
      status: 'active'
    });

    const savedGig = await gig.save();
    gigId = savedGig._id;
  });



  describe('POST /api/orders', () => {
    it('should create a new order with valid data', async () => {
      const orderData = {
        gig_id: gigId,
        requirements: 'I need a professional website for my business with contact forms and a blog section.'
      };

      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send(orderData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.gig_id._id).toBe(gigId.toString());
      expect(response.body.data.buyer_id._id).toBe(buyerId);
      expect(response.body.data.seller_id._id).toBe(sellerId);
      expect(response.body.data.status).toBe('pending');
      expect(response.body.data.totalPrice).toBe(100.00);

      orderId = response.body.data._id;
    });

    it('should return 400 for missing required fields', async () => {
      const incompleteOrderData = {
        gig_id: gigId
        // Missing requirements
      };

      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send(incompleteOrderData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Gig ID and requirements are required');
    });

    it('should return 400 when user tries to order their own gig', async () => {
      const orderData = {
        gig_id: gigId,
        requirements: 'Trying to order my own gig'
      };

      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send(orderData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('You cannot order your own gig');
    });

    it('should return 404 for non-existent gig', async () => {
      const fakeGigId = new mongoose.Types.ObjectId();
      const orderData = {
        gig_id: fakeGigId,
        requirements: 'Order for non-existent gig'
      };

      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send(orderData);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Gig not found');
    });
  });

  describe('GET /api/orders', () => {
    beforeEach(async () => {
      // Create test order
      const order = new Order({
        gig_id: gigId,
        buyer_id: buyerId,
        seller_id: sellerId,
        totalPrice: 100.00,
        requirements: 'Test order for retrieval tests',
        expectedDeliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
      });

      const savedOrder = await order.save();
      orderId = savedOrder._id;
    });

    it('should get user orders for buyer', async () => {
      const response = await request(app)
        .get('/api/orders')
        .set('Authorization', `Bearer ${buyerToken}`)
        .query({ role: 'buyer' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].userRole).toBe('buyer');
      expect(response.body.data[0].buyer_id._id).toBe(buyerId);
    });

    it('should get user orders for seller', async () => {
      const response = await request(app)
        .get('/api/orders')
        .set('Authorization', `Bearer ${sellerToken}`)
        .query({ role: 'seller' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].userRole).toBe('seller');
      expect(response.body.data[0].seller_id._id).toBe(sellerId);
    });

    it('should filter orders by status', async () => {
      const response = await request(app)
        .get('/api/orders')
        .set('Authorization', `Bearer ${buyerToken}`)
        .query({ status: 'pending' });

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].status).toBe('pending');
    });
  });

  describe('GET /api/orders/:id', () => {
    beforeEach(async () => {
      const order = new Order({
        gig_id: gigId,
        buyer_id: buyerId,
        seller_id: sellerId,
        totalPrice: 100.00,
        requirements: 'Test order for single retrieval',
        expectedDeliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      });

      const savedOrder = await order.save();
      orderId = savedOrder._id;
    });

    it('should get specific order for buyer', async () => {
      const response = await request(app)
        .get(`/api/orders/${orderId}`)
        .set('Authorization', `Bearer ${buyerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.userRole).toBe('buyer');
      expect(response.body.data.canComplete).toBe(false); // pending status
    });

    it('should get specific order for seller', async () => {
      const response = await request(app)
        .get(`/api/orders/${orderId}`)
        .set('Authorization', `Bearer ${sellerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.userRole).toBe('seller');
      expect(response.body.data.canAccept).toBe(true); // pending status
    });

    it('should return 403 for unauthorized user', async () => {
      // Create third user
      const thirdUserData = {
        name: 'Third User',
        email: 'third@example.com',
        password: 'password123',
        skills: 'Design'
      };

      const thirdUserResponse = await request(app)
        .post('/api/auth/signup')
        .send(thirdUserData);

      const thirdUserToken = thirdUserResponse.body.data.accessToken;

      const response = await request(app)
        .get(`/api/orders/${orderId}`)
        .set('Authorization', `Bearer ${thirdUserToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Access denied. You are not involved in this order.');
    });
  });

  describe('Order Status Management', () => {
    beforeEach(async () => {
      const order = new Order({
        gig_id: gigId,
        buyer_id: buyerId,
        seller_id: sellerId,
        totalPrice: 100.00,
        requirements: 'Test order for status management',
        expectedDeliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      });

      const savedOrder = await order.save();
      orderId = savedOrder._id;
    });

    it('should accept order (seller only)', async () => {
      const response = await request(app)
        .put(`/api/orders/${orderId}/accept`)
        .set('Authorization', `Bearer ${sellerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('accepted');
      expect(response.body.data.progressPercentage).toBe(25);
    });

    it('should return 403 when buyer tries to accept order', async () => {
      const response = await request(app)
        .put(`/api/orders/${orderId}/accept`)
        .set('Authorization', `Bearer ${buyerToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Only the seller can accept this order');
    });

    it('should start work after accepting', async () => {
      // First accept the order
      await request(app)
        .put(`/api/orders/${orderId}/accept`)
        .set('Authorization', `Bearer ${sellerToken}`);

      // Then start work
      const response = await request(app)
        .put(`/api/orders/${orderId}/start`)
        .set('Authorization', `Bearer ${sellerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe('in-progress');
      expect(response.body.data.progressPercentage).toBe(50);
    });

    it('should deliver order after starting work', async () => {
      // Accept order
      await request(app)
        .put(`/api/orders/${orderId}/accept`)
        .set('Authorization', `Bearer ${sellerToken}`);

      // Start work
      await request(app)
        .put(`/api/orders/${orderId}/start`)
        .set('Authorization', `Bearer ${sellerToken}`);

      // Deliver order
      const deliveryData = {
        deliveryNote: 'Your work is complete! Please review.'
      };

      const response = await request(app)
        .put(`/api/orders/${orderId}/deliver`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .send(deliveryData);

      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe('delivered');
      expect(response.body.data.progressPercentage).toBe(80);
    });

    it('should complete order (buyer only)', async () => {
      // Go through all previous steps
      await request(app)
        .put(`/api/orders/${orderId}/accept`)
        .set('Authorization', `Bearer ${sellerToken}`);

      await request(app)
        .put(`/api/orders/${orderId}/start`)
        .set('Authorization', `Bearer ${sellerToken}`);

      await request(app)
        .put(`/api/orders/${orderId}/deliver`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({ deliveryNote: 'Work complete' });

      // Complete order
      const completionData = {
        rating: 5,
        review: 'Excellent work!'
      };

      const response = await request(app)
        .put(`/api/orders/${orderId}/complete`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .send(completionData);

      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe('completed');
      expect(response.body.data.progressPercentage).toBe(100);
    });
  });

  describe('Order Communication', () => {
    beforeEach(async () => {
      const order = new Order({
        gig_id: gigId,
        buyer_id: buyerId,
        seller_id: sellerId,
        totalPrice: 100.00,
        requirements: 'Test order for communication',
        expectedDeliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      });

      const savedOrder = await order.save();
      orderId = savedOrder._id;
    });

    it('should add message to order', async () => {
      const messageData = {
        message: 'Hello, I have a question about the requirements.'
      };

      const response = await request(app)
        .post(`/api/orders/${orderId}/messages`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .send(messageData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Message added successfully');
    });

    it('should request revision (buyer only)', async () => {
      // First get order to delivered state
      await request(app)
        .put(`/api/orders/${orderId}/accept`)
        .set('Authorization', `Bearer ${sellerToken}`);

      await request(app)
        .put(`/api/orders/${orderId}/start`)
        .set('Authorization', `Bearer ${sellerToken}`);

      await request(app)
        .put(`/api/orders/${orderId}/deliver`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({ deliveryNote: 'Initial delivery' });

      // Request revision
      const revisionData = {
        revisionNote: 'Please adjust the color scheme to be more modern.'
      };

      const response = await request(app)
        .put(`/api/orders/${orderId}/revision`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .send(revisionData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('in-progress');
      expect(response.body.data.revisionCount).toBe(1);
    });

    it('should cancel order with reason', async () => {
      const cancelData = {
        reason: 'Changed project requirements'
      };

      const response = await request(app)
        .put(`/api/orders/${orderId}/cancel`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .send(cancelData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('cancelled');
    });
  });
});