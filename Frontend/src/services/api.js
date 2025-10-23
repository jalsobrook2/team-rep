import axios from 'axios';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // If error is 403 (token expired) and we haven't already tried to refresh
    if (error.response?.status === 403 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          const response = await axios.post(
            `${process.env.REACT_APP_API_URL || 'http://localhost:3000/api'}/auth/refresh`,
            { refreshToken }
          );

          const { accessToken, refreshToken: newRefreshToken } = response.data;
          
          // Update stored tokens
          localStorage.setItem('accessToken', accessToken);
          localStorage.setItem('refreshToken', newRefreshToken);

          // Retry original request with new token
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed, redirect to login
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// Authentication API endpoints
export const authAPI = {
  login: (identifier, password) =>
    api.post('/auth/login', { identifier, password }),
  
  register: (userData) =>
    api.post('/auth/register', userData),
  
  logout: () =>
    api.post('/auth/logout'),
  
  refreshToken: (refreshToken) =>
    api.post('/auth/refresh', { refreshToken }),
  
  getProfile: () =>
    api.get('/auth/me'),
  
  updateProfile: (userData) =>
    api.put('/auth/profile', userData),
  
  changePassword: (currentPassword, newPassword) =>
    api.post('/auth/change-password', { currentPassword, newPassword }),
};

// Jobs API endpoints
export const jobsAPI = {
  getAll: (params = {}) =>
    api.get('/jobs', { params }),
  
  getById: (id) =>
    api.get(`/jobs/${id}`),
  
  create: (jobData) =>
    api.post('/jobs', jobData),
  
  update: (id, jobData) =>
    api.put(`/jobs/${id}`, jobData),
  
  delete: (id) =>
    api.delete(`/jobs/${id}`),
  
  search: (searchParams) =>
    api.get('/jobs/search', { params: searchParams }),
  
  apply: (id, applicationData) =>
    api.post(`/jobs/${id}/apply`, applicationData),
  
  complete: (id, completionData) =>
    api.post(`/jobs/${id}/complete`, completionData),
};

// Workers API endpoints
export const workersAPI = {
  getAll: (params = {}) =>
    api.get('/workers', { params }),
  
  getById: (id) =>
    api.get(`/workers/${id}`),
  
  update: (id, workerData) =>
    api.put(`/workers/${id}`, workerData),
  
  search: (searchParams) =>
    api.get('/workers/search', { params: searchParams }),
  
  getReviews: (id) =>
    api.get(`/workers/${id}/reviews`),
  
  addReview: (id, reviewData) =>
    api.post(`/workers/${id}/reviews`, reviewData),
};

// Safety API endpoints
export const safetyAPI = {
  reportIncident: (incidentData) =>
    api.post('/safety/incidents', incidentData),
  
  getIncidents: () =>
    api.get('/safety/incidents'),
  
  updateLocation: (locationData) =>
    api.post('/safety/location', locationData),
  
  notifyEmergencyContact: (emergencyData) =>
    api.post('/safety/emergency-contact', emergencyData),
  
  getSafetyTips: () =>
    api.get('/safety/tips'),
  
  getVerificationStatus: () =>
    api.get('/safety/verification-status'),
  
  submitVerificationDocument: (documentData) =>
    api.post('/safety/verification', documentData),
};

export default api;