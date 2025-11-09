const Gig = require('../models/Gig');
const Order = require('../models/Order');
const mongoose = require('mongoose');

// Helper function to send standardized responses
const sendResponse = (res, statusCode, success, data = null, error = null) => {
  const response = { success };
  
  if (success && data !== null) {
    response.data = data;
  }
  
  if (!success && error) {
    response.error = error;
  }
  
  res.status(statusCode).json(response);
};

// Create a new gig - Story 2.1, 2.2
const createGig = async (req, res) => {
  try {
    const user_id = req.workerId;
    const { title, description, price, category, deliveryTime, tags } = req.body;

    // Validation
    if (!title || !description || !price || !category || !deliveryTime) {
      return sendResponse(res, 400, false, null, 'All required fields must be provided');
    }

    if (price <= 0) {
      return sendResponse(res, 400, false, null, 'Price must be greater than 0');
    }

    if (deliveryTime <= 0) {
      return sendResponse(res, 400, false, null, 'Delivery time must be greater than 0');
    }

    // Create new gig
    const gig = new Gig({
      user_id,
      title: title.trim(),
      description: description.trim(),
      price: parseFloat(price),
      category: category.trim().toLowerCase(),
      deliveryTime: parseInt(deliveryTime),
      tags: tags ? (Array.isArray(tags) ? tags : tags.split(',').map(tag => tag.trim())) : [],
      status: 'active'
    });

    const savedGig = await gig.save();

    // Populate user information for response
    await savedGig.populate('user_id', 'name email');

    sendResponse(res, 201, true, savedGig);

  } catch (error) {
    console.error('Create gig error:', error);
    
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return sendResponse(res, 400, false, null, validationErrors.join(', '));
    }
    
    sendResponse(res, 500, false, null, 'Failed to create gig');
  }
};

// Get all gigs with filtering, pagination, and search - Story 2.4
const getAllGigs = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      category, 
      minPrice, 
      maxPrice, 
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build filter object
    const filter = { status: 'active' };
    
    if (category) {
      filter.category = category;
    }
    
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = parseFloat(minPrice);
      if (maxPrice) filter.price.$lte = parseFloat(maxPrice);
    }
    
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $regex: search, $options: 'i' } }
      ];
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute queries in parallel
    const [gigs, totalGigs] = await Promise.all([
      Gig.find(filter)
        .populate('user_id', 'name email')
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Gig.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(totalGigs / parseInt(limit));

    res.status(200).json({
      success: true,
      data: gigs,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalGigs,
        gigsPerPage: parseInt(limit),
        hasNextPage: parseInt(page) < totalPages,
        hasPrevPage: parseInt(page) > 1
      }
    });

  } catch (error) {
    console.error('Get all gigs error:', error);
    sendResponse(res, 500, false, null, 'Failed to fetch gigs');
  }
};

// Get a single gig by ID
const getGigById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendResponse(res, 400, false, null, 'Invalid gig ID format');
    }

    const gig = await Gig.findById(id)
      .populate('user_id', 'name email skills')
      .lean();

    if (!gig) {
      return sendResponse(res, 404, false, null, 'Gig not found');
    }

    sendResponse(res, 200, true, gig);

  } catch (error) {
    console.error('Get gig by ID error:', error);
    sendResponse(res, 500, false, null, 'Failed to fetch gig');
  }
};

// Update a gig by ID (only gig owner can update)
const updateGig = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.workerId;
    const updates = req.body;

    // Find the gig
    const gig = await Gig.findById(id);

    if (!gig) {
      return sendResponse(res, 404, false, null, 'Gig not found');
    }

    // Check ownership
    if (gig.user_id.toString() !== userId) {
      return sendResponse(res, 403, false, null, 'You can only update your own gigs');
    }

    // Check if gig has active orders
    const activeOrder = await Order.findOne({
      gig_id: id,
      status: { $in: ['pending', 'accepted', 'in_progress'] }
    });

    if (activeOrder) {
      return sendResponse(res, 400, false, null, 'Cannot update gig with active orders');
    }

    // Update allowed fields
    const allowedUpdates = ['title', 'description', 'price', 'category', 'deliveryTime', 'tags', 'status'];
    const updateData = {};

    allowedUpdates.forEach(field => {
      if (updates[field] !== undefined) {
        updateData[field] = updates[field];
      }
    });

    // Additional validation
    if (updateData.price && updateData.price <= 0) {
      return sendResponse(res, 400, false, null, 'Price must be greater than 0');
    }

    if (updateData.deliveryTime && updateData.deliveryTime <= 0) {
      return sendResponse(res, 400, false, null, 'Delivery time must be greater than 0');
    }

    if (updateData.tags && typeof updateData.tags === 'string') {
      updateData.tags = updateData.tags.split(',').map(tag => tag.trim());
    }

    const updatedGig = await Gig.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate('user_id', 'name email');

    sendResponse(res, 200, true, updatedGig);

  } catch (error) {
    console.error('Update gig error:', error);
    
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return sendResponse(res, 400, false, null, validationErrors.join(', '));
    }
    
    if (error.name === 'CastError') {
      return sendResponse(res, 400, false, null, 'Invalid gig ID format');
    }
    
    sendResponse(res, 500, false, null, 'Failed to update gig');
  }
};

// Delete a gig by ID (only gig owner can delete)
const deleteGig = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.workerId;

    // Find the gig
    const gig = await Gig.findById(id);

    if (!gig) {
      return sendResponse(res, 404, false, null, 'Gig not found');
    }

    // Check ownership
    if (gig.user_id.toString() !== userId) {
      return sendResponse(res, 403, false, null, 'You can only delete your own gigs');
    }

    // Check if gig has active orders
    const activeOrder = await Order.findOne({
      gig_id: id,
      status: { $in: ['pending', 'accepted', 'in_progress'] }
    });

    if (activeOrder) {
      return sendResponse(res, 400, false, null, 'Cannot delete gig with active orders. Complete or cancel orders first.');
    }

    await Gig.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'Gig deleted successfully'
    });

  } catch (error) {
    console.error('Delete gig error:', error);
    
    if (error.name === 'CastError') {
      return sendResponse(res, 400, false, null, 'Invalid gig ID format');
    }
    
    sendResponse(res, 500, false, null, 'Failed to delete gig');
  }
};

// Get gigs by user (for dashboard)
const getUserGigs = async (req, res) => {
  try {
    const userId = req.workerId;
    const { status } = req.query;

    const filter = { user_id: userId };
    if (status) {
      filter.status = status;
    }

    const gigs = await Gig.find(filter)
      .populate('user_id', 'name email')
      .sort({ createdAt: -1 })
      .lean();

    sendResponse(res, 200, true, gigs);

  } catch (error) {
    console.error('Get user gigs error:', error);
    sendResponse(res, 500, false, null, 'Failed to fetch user gigs');
  }
};

// Get gig categories (for frontend dropdowns)
const getGigCategories = async (req, res) => {
  try {
    const categories = [
      { value: 'web-development', label: 'Web Development' },
      { value: 'mobile-development', label: 'Mobile Development' },
      { value: 'design', label: 'Design' },
      { value: 'writing', label: 'Writing & Translation' },
      { value: 'marketing', label: 'Digital Marketing' },
      { value: 'data-entry', label: 'Data Entry' },
      { value: 'customer-service', label: 'Customer Service' },
      { value: 'accounting', label: 'Accounting & Finance' },
      { value: 'video-editing', label: 'Video & Animation' },
      { value: 'music-audio', label: 'Music & Audio' },
      { value: 'programming', label: 'Programming & Tech' },
      { value: 'other', label: 'Other' }
    ];

    sendResponse(res, 200, true, categories);

  } catch (error) {
    console.error('Get gig categories error:', error);
    sendResponse(res, 500, false, null, 'Failed to fetch categories');
  }
};

module.exports = {
  createGig,
  getAllGigs,
  getGigById,
  updateGig,
  deleteGig,
  getUserGigs,
  getGigCategories
};