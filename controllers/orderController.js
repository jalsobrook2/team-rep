const Order = require('../models/Order');
const Gig = require('../models/Gig');
const Worker = require('../models/Worker');

// Create a new order (Story 2.5)
exports.createOrder = async (req, res) => {
  try {
    const { gig_id, requirements } = req.body;
    const buyer_id = req.workerId;

    // Validate required fields
    if (!gig_id || !requirements) {
      return res.status(400).json({
        success: false,
        error: 'Gig ID and requirements are required'
      });
    }

    // Find the gig
    const gig = await Gig.findById(gig_id).populate('user_id');
    
    if (!gig) {
      return res.status(404).json({
        success: false,
        error: 'Gig not found'
      });
    }

    // Check if gig is active
    if (gig.status !== 'active') {
      return res.status(400).json({
        success: false,
        error: 'This gig is not available for orders'
      });
    }

    // Prevent users from ordering their own gigs
    if (gig.user_id._id.toString() === buyer_id) {
      return res.status(400).json({
        success: false,
        error: 'You cannot order your own gig'
      });
    }

    // Calculate expected delivery date
    const expectedDeliveryDate = new Date();
    expectedDeliveryDate.setDate(expectedDeliveryDate.getDate() + gig.deliveryTime);

    // Create the order
    const order = new Order({
      gig_id,
      buyer_id,
      seller_id: gig.user_id._id,
      totalPrice: gig.price,
      requirements: requirements.trim(),
      expectedDeliveryDate,
      maxRevisions: 2 // Default, can be made configurable
    });

    await order.save();

    // Increment the gig's order count
    await gig.incrementOrderCount();

    // Populate the order with related data
    const populatedOrder = await Order.findById(order._id)
      .populate('gig_id', 'title price category')
      .populate('buyer_id', 'name email')
      .populate('seller_id', 'name email')
      .lean();

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: populatedOrder
    });

  } catch (error) {
    console.error('Create order error:', error);
    
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validationErrors
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to create order'
    });
  }
};

// Get all orders for a user (buyer or seller)
exports.getUserOrders = async (req, res) => {
  try {
    const userId = req.workerId;
    const { role = 'all', status, page = 1, limit = 10 } = req.query;

    // Build filter
    let filter = {};
    
    if (role === 'buyer') {
      filter.buyer_id = userId;
    } else if (role === 'seller') {
      filter.seller_id = userId;
    } else {
      // Get both buyer and seller orders
      filter.$or = [
        { buyer_id: userId },
        { seller_id: userId }
      ];
    }

    if (status && status !== 'all') {
      filter.status = status;
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Execute query
    const orders = await Order.find(filter)
      .populate('gig_id', 'title price category images')
      .populate('buyer_id', 'name email')
      .populate('seller_id', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Get total count
    const totalOrders = await Order.countDocuments(filter);
    const totalPages = Math.ceil(totalOrders / parseInt(limit));

    // Add user role information to each order
    const ordersWithRole = orders.map(order => ({
      ...order,
      userRole: order.buyer_id._id.toString() === userId ? 'buyer' : 'seller',
      progressPercentage: getProgressPercentage(order.status)
    }));

    res.status(200).json({
      success: true,
      data: ordersWithRole,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalOrders,
        hasNext: parseInt(page) < totalPages,
        hasPrev: parseInt(page) > 1
      }
    });

  } catch (error) {
    console.error('Get user orders error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch orders'
    });
  }
};

// Get a specific order by ID
exports.getOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.workerId;

    const order = await Order.findById(id)
      .populate('gig_id', 'title price category deliveryTime images')
      .populate('buyer_id', 'name email skills')
      .populate('seller_id', 'name email skills')
      .populate('messages.sender', 'name email')
      .lean();

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    // Check if user is involved in this order
    const isBuyer = order.buyer_id._id.toString() === userId;
    const isSeller = order.seller_id._id.toString() === userId;

    if (!isBuyer && !isSeller) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. You are not involved in this order.'
      });
    }

    // Add user role and progress information
    const orderWithInfo = {
      ...order,
      userRole: isBuyer ? 'buyer' : 'seller',
      progressPercentage: getProgressPercentage(order.status),
      canRequestRevision: isBuyer && order.status === 'delivered' && order.revisionCount < order.maxRevisions,
      canAccept: isSeller && order.status === 'pending',
      canStartWork: isSeller && order.status === 'accepted',
      canDeliver: isSeller && order.status === 'in-progress',
      canComplete: isBuyer && order.status === 'delivered'
    };

    res.status(200).json({
      success: true,
      data: orderWithInfo
    });

  } catch (error) {
    console.error('Get order by ID error:', error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        error: 'Invalid order ID format'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to fetch order'
    });
  }
};

// Accept an order (seller only) - Story 2.6 progress tracking
exports.acceptOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.workerId;

    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    // Check if user is the seller
    if (order.seller_id.toString() !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Only the seller can accept this order'
      });
    }

    // Accept the order
    await order.accept();

    // Add system message
    await order.addMessage(userId, 'Order has been accepted. Work will begin shortly.', true);

    res.status(200).json({
      success: true,
      message: 'Order accepted successfully',
      data: { 
        status: order.status,
        progressPercentage: getProgressPercentage(order.status)
      }
    });

  } catch (error) {
    console.error('Accept order error:', error);
    
    if (error.message.includes('Only pending orders')) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to accept order'
    });
  }
};

// Start work on an order (seller only) - Story 2.6 progress tracking
exports.startWork = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.workerId;

    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    // Check if user is the seller
    if (order.seller_id.toString() !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Only the seller can start work on this order'
      });
    }

    // Start work
    await order.startWork();

    // Add system message
    await order.addMessage(userId, 'Work has started on your order.', true);

    res.status(200).json({
      success: true,
      message: 'Work started successfully',
      data: { 
        status: order.status,
        progressPercentage: getProgressPercentage(order.status)
      }
    });

  } catch (error) {
    console.error('Start work error:', error);
    
    if (error.message.includes('must be accepted')) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to start work'
    });
  }
};

// Deliver an order (seller only) - Story 2.6 progress tracking
exports.deliverOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { deliveryNote } = req.body;
    const userId = req.workerId;

    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    // Check if user is the seller
    if (order.seller_id.toString() !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Only the seller can deliver this order'
      });
    }

    // Deliver the order
    await order.deliver();

    // Add delivery message
    const message = deliveryNote ? 
      `Order delivered! ${deliveryNote}` : 
      'Order has been delivered. Please review and confirm completion.';
    
    await order.addMessage(userId, message, true);

    res.status(200).json({
      success: true,
      message: 'Order delivered successfully',
      data: { 
        status: order.status,
        progressPercentage: getProgressPercentage(order.status),
        actualDeliveryDate: order.actualDeliveryDate
      }
    });

  } catch (error) {
    console.error('Deliver order error:', error);
    
    if (error.message.includes('must be in progress')) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to deliver order'
    });
  }
};

// Complete an order (buyer only) - Story 2.6 progress tracking
exports.completeOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, review } = req.body;
    const userId = req.workerId;

    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    // Check if user is the buyer
    if (order.buyer_id.toString() !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Only the buyer can complete this order'
      });
    }

    // Add review if provided
    if (rating) {
      order.review = {
        rating: parseInt(rating),
        comment: review || '',
        reviewedAt: new Date()
      };
    }

    // Complete the order
    await order.complete();

    // Add completion message
    await order.addMessage(userId, 'Order has been marked as complete. Thank you!', false);

    res.status(200).json({
      success: true,
      message: 'Order completed successfully',
      data: { 
        status: order.status,
        progressPercentage: getProgressPercentage(order.status)
      }
    });

  } catch (error) {
    console.error('Complete order error:', error);
    
    if (error.message.includes('must be delivered')) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to complete order'
    });
  }
};

// Add a message to an order
exports.addMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { message } = req.body;
    const userId = req.workerId;

    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Message cannot be empty'
      });
    }

    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    // Check if user is involved in this order
    const isBuyer = order.buyer_id.toString() === userId;
    const isSeller = order.seller_id.toString() === userId;

    if (!isBuyer && !isSeller) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    // Add the message
    await order.addMessage(userId, message.trim(), isSeller);

    res.status(200).json({
      success: true,
      message: 'Message added successfully'
    });

  } catch (error) {
    console.error('Add message error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add message'
    });
  }
};

// Request revision (buyer only)
exports.requestRevision = async (req, res) => {
  try {
    const { id } = req.params;
    const { revisionNote } = req.body;
    const userId = req.workerId;

    if (!revisionNote || !revisionNote.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Revision note is required'
      });
    }

    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    // Check if user is the buyer
    if (order.buyer_id.toString() !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Only the buyer can request revisions'
      });
    }

    // Request revision
    await order.requestRevision(revisionNote.trim());

    res.status(200).json({
      success: true,
      message: 'Revision requested successfully',
      data: {
        status: order.status,
        revisionCount: order.revisionCount,
        progressPercentage: getProgressPercentage(order.status)
      }
    });

  } catch (error) {
    console.error('Request revision error:', error);
    
    if (error.message.includes('Maximum revisions') || error.message.includes('Can only request revisions')) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to request revision'
    });
  }
};

// Cancel an order
exports.cancelOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const userId = req.workerId;

    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    // Check if user is involved in this order
    const isBuyer = order.buyer_id.toString() === userId;
    const isSeller = order.seller_id.toString() === userId;

    if (!isBuyer && !isSeller) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    // Cancel the order
    await order.cancel(reason);

    res.status(200).json({
      success: true,
      message: 'Order cancelled successfully',
      data: {
        status: order.status,
        progressPercentage: getProgressPercentage(order.status)
      }
    });

  } catch (error) {
    console.error('Cancel order error:', error);
    
    if (error.message.includes('Cannot cancel')) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to cancel order'
    });
  }
};

// Helper function for progress percentage calculation (Story 2.6)
function getProgressPercentage(status) {
  const statusProgress = {
    'pending': 10,
    'accepted': 25,
    'in-progress': 50,
    'delivered': 80,
    'completed': 100,
    'cancelled': 0,
    'disputed': 30
  };
  return statusProgress[status] || 0;
}
