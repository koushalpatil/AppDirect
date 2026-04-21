import axios from 'axios';

const API_BASE = 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 responses globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Auth
export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  signup: (data) => api.post('/auth/signup', data),
  getMe: () => api.get('/auth/me'),
};

// Products (Admin)
export const productAPI = {
  create: (data) => api.post('/products', data),
  getAll: (params) => api.get('/products', { params }),
  getOne: (id) => api.get(`/products/${id}`),
  update: (id, data) => api.put(`/products/${id}`, data),
  delete: (id) => api.delete(`/products/${id}`),
  getLogs: (id) => api.get(`/products/${id}/logs`),
  // Public
  getPublished: (params) => api.get('/products/public', { params }),
  getPublicOne: (id) => api.get(`/products/public/${id}`),
  getByAttribute: (params) => api.get('/products/public/by-attribute', { params }),
};

// Catalog (Admin)
export const catalogAPI = {
  create: (data) => api.post('/catalog', data),
  getAll: () => api.get('/catalog'),
  getOne: (id) => api.get(`/catalog/${id}`),
  update: (id, data) => api.put(`/catalog/${id}`, data),
  delete: (id) => api.delete(`/catalog/${id}`),
  getPublic: () => api.get('/catalog/public'),
};

// Config (Admin)
export const configAPI = {
  getContact: () => api.get('/config/contact'),
  updateContact: (data) => api.put('/config/contact', data),
  getHomepage: () => api.get('/config/homepage'),
  updateHomepage: (data) => api.put('/config/homepage', data),
  // Public
  getPublicHomepage: () => api.get('/config/public/homepage'),
  getPublicContactForm: () => api.get('/config/public/contact-form'),
};

// Upload
export const uploadAPI = {
  single: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/upload/single', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  multiple: (files) => {
    const formData = new FormData();
    files.forEach((f) => formData.append('files', f));
    return api.post('/upload/multiple', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

export default api;
