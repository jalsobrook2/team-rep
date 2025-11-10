import axios from 'axios';

const API_BASE_URL = 'http://localhost:3000/api';

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests automatically
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle errors globally
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Gig API calls
export const gigAPI = {
  // Get all gigs
  getAllGigs: async (params = {}) => {
    try {
      const response = await apiClient.get('/gigs', { params });
      return { success: true, data: response.data };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.message || 'Failed to fetch gigs' 
      };
    }
  },

  // Get gig by ID
  getGigById: async (id) => {
    try {
      const response = await apiClient.get(`/gigs/${id}`);
      return { success: true, data: response.data };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.message || 'Failed to fetch gig' 
      };
    }
  },

  // Get user's gigs
  getUserGigs: async () => {
    try {
      const response = await apiClient.get('/gigs/user/me');
      return { success: true, data: response.data };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.message || 'Failed to fetch user gigs' 
      };
    }
  },

  // Create new gig
  createGig: async (gigData) => {
    try {
      const response = await apiClient.post('/gigs', gigData);
      return { success: true, data: response.data };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.message || 'Failed to create gig' 
      };
    }
  },

  // Update gig
  updateGig: async (id, gigData) => {
    try {
      const response = await apiClient.put(`/gigs/${id}`, gigData);
      return { success: true, data: response.data };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.message || 'Failed to update gig' 
      };
    }
  },

  // Delete gig
  deleteGig: async (id) => {
    try {
      const response = await apiClient.delete(`/gigs/${id}`);
      return { success: true, data: response.data };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.message || 'Failed to delete gig' 
      };
    }
  },

  // Get gig categories
  getCategories: async () => {
    try {
      const response = await apiClient.get('/gigs/categories');
      return { success: true, data: response.data };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.message || 'Failed to fetch categories' 
      };
    }
  },
};

// Order API calls
export const orderAPI = {
  // Get user's orders
  getUserOrders: async () => {
    try {
      const response = await apiClient.get('/orders');
      return { success: true, data: response.data };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.message || 'Failed to fetch orders' 
      };
    }
  },

  // Get order by ID
  getOrderById: async (id) => {
    try {
      const response = await apiClient.get(`/orders/${id}`);
      return { success: true, data: response.data };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.message || 'Failed to fetch order' 
      };
    }
  },

  // Create new order
  createOrder: async (orderData) => {
    try {
      const response = await apiClient.post('/orders', orderData);
      return { success: true, data: response.data };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.message || 'Failed to create order' 
      };
    }
  },

  // Accept order (seller)
  acceptOrder: async (id) => {
    try {
      const response = await apiClient.put(`/orders/${id}/accept`);
      return { success: true, data: response.data };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.message || 'Failed to accept order' 
      };
    }
  },

  // Start work on order (seller)
  startWork: async (id) => {
    try {
      const response = await apiClient.put(`/orders/${id}/start`);
      return { success: true, data: response.data };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.message || 'Failed to start work' 
      };
    }
  },

  // Deliver order (seller)
  deliverOrder: async (id) => {
    try {
      const response = await apiClient.put(`/orders/${id}/deliver`);
      return { success: true, data: response.data };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.message || 'Failed to deliver order' 
      };
    }
  },

  // Complete order (buyer)
  completeOrder: async (id) => {
    try {
      const response = await apiClient.put(`/orders/${id}/complete`);
      return { success: true, data: response.data };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.message || 'Failed to complete order' 
      };
    }
  },

  // Cancel order
  cancelOrder: async (id, reason) => {
    try {
      const response = await apiClient.put(`/orders/${id}/cancel`, { reason });
      return { success: true, data: response.data };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.message || 'Failed to cancel order' 
      };
    }
  },

  // Add message to order
  addMessage: async (id, message) => {
    try {
      const response = await apiClient.post(`/orders/${id}/messages`, { message });
      return { success: true, data: response.data };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.message || 'Failed to send message' 
      };
    }
  },

  // Request revision
  requestRevision: async (id, revisionNote) => {
    try {
      const response = await apiClient.put(`/orders/${id}/revision`, { revisionNote });
      return { success: true, data: response.data };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.message || 'Failed to request revision' 
      };
    }
  },
};

export default apiClient;
