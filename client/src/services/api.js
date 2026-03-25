import axios from 'axios';
import { API_URL } from '../utils/helpers';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' }
});

// Add token to requests
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Auth
export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  me: () => api.get('/auth/me')
};

// Rooms
export const roomsAPI = {
  list: () => api.get('/rooms'),
  availability: (id, date) => api.get(`/rooms/${id}/availability?date=${date}`)
};

// Bookings
export const bookingsAPI = {
  list: (params = {}) => api.get('/bookings', { params }),
  create: (data) => api.post('/bookings', data),
  update: (id, data) => api.put(`/bookings/${id}`, data),
  cancel: (id) => api.delete(`/bookings/${id}`),
  analytics: (params = {}) => api.get('/bookings/analytics', { params }),
  recommendations: (params = {}) => api.get('/bookings/recommendations', { params })
};

export default api;
