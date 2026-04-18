import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { API_URL } from '../config';

const REQUEST_TIMEOUT = 30000;

const api = axios.create({
  baseURL: API_URL,
  timeout: REQUEST_TIMEOUT,
  headers: {
    'Content-Type': 'application/json'
  }
});

api.interceptors.request.use(
  async (config) => {
    try {
      const token = await SecureStore.getItemAsync('bomasecure_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (e) {
      console.log('Token error:', e);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      const { status, data } = error.response;
      switch (status) {
        case 401:
          SecureStore.deleteItemAsync('bomasecure_token');
          SecureStore.deleteItemAsync('bomasecure_user');
          break;
        case 403:
          console.error('Access forbidden:', data?.message);
          break;
        case 429:
          console.error('Too many requests. Please try again later.');
          break;
        case 500:
        case 502:
        case 503:
          console.error('Server error. Please try again later.');
          break;
        default:
          break;
      }
    } else if (error.request) {
      console.error('Network error. Please check your connection.');
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  generateInvite: (data) => api.post('/auth/invite', data),
  registerViaInvite: (data) => api.post('/auth/register-invite', data),
  getMe: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/profile', data),
  changePassword: (data) => api.put('/auth/password', data),
  logout: () => api.post('/auth/logout'),
  deleteAccount: () => api.delete('/auth/account'),
  getUsers: (params) => api.get('/auth/users', { params })
};

export const visitorsAPI = {
  getAll: (params) => api.get('/visitors', { params }),
  getOne: (id) => api.get(`/visitors/${id}`),
  create: (data) => api.post('/visitors', data),
  createBulk: (visitors) => api.post('/visitors/bulk', { visitors }),
  getPending: () => api.get('/visitors/pending'),
  getToday: (apartmentId) => api.get('/visitors/today', { params: { apartmentId } }),
  approve: (id) => api.put(`/visitors/${id}/approve`),
  deny: (id, reason) => api.put(`/visitors/${id}/deny`, { reason }),
  checkIn: (id, data) => api.put(`/visitors/${id}/checkin`, data),
  checkOut: (id, data) => api.put(`/visitors/${id}/checkout`, data),
  verifyQR: (qrCode) => api.post('/visitors/verify-qr', { qrCode }),
  getQRCode: (id) => api.get(`/visitors/${id}/qrcode`)
};

export const deliveriesAPI = {
  getAll: (params) => api.get('/deliveries', { params }),
  getOne: (id) => api.get(`/deliveries/${id}`),
  create: (data) => api.post('/deliveries', data),
  update: (id, data) => api.put(`/deliveries/${id}`, data),
  delete: (id) => api.delete(`/deliveries/${id}`),
  getPending: () => api.get('/deliveries/pending')
};

export const maintenanceAPI = {
  getAll: (params) => api.get('/maintenance', { params }),
  getMyRequests: () => api.get('/maintenance/my-requests'),
  getOne: (id) => api.get(`/maintenance/${id}`),
  create: (data) => api.post('/maintenance', data),
  update: (id, data) => api.put(`/maintenance/${id}`, data),
  updateStatus: (id, data) => api.patch(`/maintenance/${id}/status`, data),
  delete: (id) => api.delete(`/maintenance/${id}`),
  getStaff: () => api.get('/maintenance/staff'),
  sendMessage: (staffId, data) => api.post(`/maintenance/${staffId}/contact`, data)
};

export const emergencyAPI = {
  getAll: (params) => api.get('/emergencies', { params }),
  getOne: (id) => api.get(`/emergencies/${id}`),
  create: (data) => api.post('/emergencies', data),
  update: (id, data) => api.put(`/emergencies/${id}`, data),
  resolve: (id, data) => api.put(`/emergencies/${id}/resolve`, data),
  getByApartment: (apartmentId, params) => api.get(`/emergencies/apartment/${apartmentId}`, { params }),
  getStats: (params) => api.get('/emergencies/stats', { params })
};

export const notificationsAPI = {
  getAll: (params) => api.get('/notifications', { params }),
  getOne: (id) => api.get(`/notifications/${id}`),
  create: (data) => api.post('/notifications', data),
  markAsRead: (id) => api.put(`/notifications/${id}/read`),
  markAllAsRead: () => api.put('/notifications/read-all'),
  delete: (id) => api.delete(`/notifications/${id}`),
  getUnreadCount: () => api.get('/notifications/unread-count')
};

export const apartmentsAPI = {
  getAll: (params) => api.get('/apartments', { params }),
  getOne: (id) => api.get(`/apartments/${id}`),
  create: (data) => api.post('/apartments', data),
  update: (id, data) => api.put(`/apartments/${id}`, data),
  delete: (id) => api.delete(`/apartments/${id}`),
  getStats: () => api.get('/apartments/stats'),
  getAvailable: () => api.get('/apartments/available'),
  getSettings: () => api.get('/apartments/settings'),
  updateSettings: (data) => api.put('/apartments/settings', data)
};

export const paymentsAPI = {
  getAll: (params) => api.get('/payments', { params }),
  getOne: (id) => api.get(`/payments/${id}`),
  create: (data) => api.post('/payments', data),
  update: (id, data) => api.put(`/payments/${id}`, data),
  delete: (id) => api.delete(`/payments/${id}`),
  getByApartment: (apartmentId, params) => api.get(`/payments/apartment/${apartmentId}`, { params }),
  recordPayment: (data) => api.post('/payments/record', data),
  getStats: () => api.get('/payments/stats'),
  getAdminAnalytics: () => api.get('/payments/admin/analytics'),
  getPlans: () => api.get('/payments/plans'),
  getTenantFinance: () => api.get('/payments/tenant/finance'),
  getTenantRentDashboard: () => api.get('/payments/tenant/rent-dashboard'),
  makeRentPayment: (data) => api.post('/payments/tenant/rent-payment', data)
};

export default api;