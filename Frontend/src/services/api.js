import axios from 'axios';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3000/api',
  withCredentials: true, // Include cookies for authentication
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token if available
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle common errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Unauthorized - redirect to login
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (userData) => api.post('/auth/register', userData),
  login: (credentials) => api.post('/auth/login', credentials),
  logout: () => api.post('/auth/logout'),
  getCurrentUser: () => api.get('/auth/me'),
};

// Gigs API - Story 2.1, 2.2, 2.4
export const gigsAPI = {
  // Public endpoints
  getAll: (params = {}) => api.get('/gigs', { params }),
  getById: (id) => api.get(`/gigs/${id}`),
  getCategories: () => api.get('/gigs/categories'),
  
  // Protected endpoints (require auth)
  create: (gigData) => api.post('/gigs', gigData),
  getUserGigs: (params = {}) => api.get('/gigs/user/me', { params }),
  update: (id, gigData) => api.put(`/gigs/${id}`, gigData),
  delete: (id) => api.delete(`/gigs/${id}`),
};

// Orders API - Story 2.5, 2.6
export const ordersAPI = {
  create: (orderData) => api.post('/orders', orderData),
  getUserOrders: (params = {}) => api.get('/orders', { params }),
  getById: (id) => api.get(`/orders/${id}`),
  
  // Order status management for progress tracking
  accept: (id) => api.put(`/orders/${id}/accept`),
  startWork: (id) => api.put(`/orders/${id}/start`),
  deliver: (id, deliveryData) => api.put(`/orders/${id}/deliver`, deliveryData),
  complete: (id, reviewData) => api.put(`/orders/${id}/complete`, reviewData),
  
  // Communication
  addMessage: (id, messageData) => api.post(`/orders/${id}/messages`, messageData),
  requestRevision: (id, revisionData) => api.put(`/orders/${id}/revision`, revisionData),
  cancel: (id, cancelData) => api.put(`/orders/${id}/cancel`, cancelData),
};

// Workers API (existing)
export const workersAPI = {
  getAll: () => api.get('/workers'),
  getById: (id) => api.get(`/workers/${id}`),
  create: (workerData) => api.post('/workers', workerData),
  update: (id, workerData) => api.put(`/workers/${id}`, workerData),
  delete: (id) => api.delete(`/workers/${id}`),
};

// Jobs API (existing)
export const jobsAPI = {
  getAll: () => api.get('/jobs'),
  getById: (id) => api.get(`/jobs/${id}`),
  create: (jobData) => api.post('/jobs', jobData),
  update: (id, jobData) => api.put(`/jobs/${id}`, jobData),
  delete: (id) => api.delete(`/jobs/${id}`),
  accept: (id) => api.post(`/jobs/${id}/accept`),
};

export default api;