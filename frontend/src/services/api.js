import axios from 'axios';
import { API_URL } from '../config';

// Security: Request timeout to prevent hanging connections
const REQUEST_TIMEOUT = 30000; // 30 seconds

const api = axios.create({
  baseURL: API_URL,
  timeout: REQUEST_TIMEOUT,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('bomasecure_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle different error scenarios
    if (error.response) {
      const { status, data } = error.response;
      
      switch (status) {
        case 401:
          // Unauthorized - clear tokens and redirect to login
          localStorage.removeItem('bomasecure_token');
          localStorage.removeItem('bomasecure_user');
          
          // Only redirect if not already on login page
          if (!window.location.pathname.includes('/login')) {
            window.location.href = '/login';
          }
          break;
          
        case 403:
          // Forbidden - user doesn't have permission
          console.error('Access forbidden:', data?.message);
          break;
          
        case 429:
          // Too many requests
          console.error('Too many requests. Please try again later.');
          break;
          
        case 500:
        case 502:
        case 503:
          // Server errors
          console.error('Server error. Please try again later.');
          break;
          
        default:
          // Other errors
          break;
      }
    } else if (error.request) {
      // Network error
      console.error('Network error. Please check your connection.');
    } else {
      // Request setup error
      console.error('Request error:', error.message);
    }
    
    return Promise.reject(error);
  }
);

// Auth API
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
  getUsers: (params) => api.get('/auth/users', { params }),
  getStats: () => api.get('/auth/stats'),
  verifyUser: (userId) => api.put(`/auth/users/${userId}/verify`),
  updateUser: (userId, data) => api.put(`/auth/users/${userId}`, data),
  rateUser: (userId, rating) => api.post(`/auth/users/${userId}/rate`, { rating }),
  // Superadmin APIs
  getSuperAdminStats: () => api.get('/auth/superadmin/stats'),
  getAllUsersSystemWide: (params) => api.get('/auth/superadmin/users', { params }),
  updateUserSystemWide: (userId, data) => api.put(`/auth/superadmin/users/${userId}`, data),
  suspendUser: (userId, reason) => api.post(`/auth/superadmin/users/${userId}/suspend`, { reason }),
  unsuspendUser: (userId) => api.post(`/auth/superadmin/users/${userId}/unsuspend`),
  discontinueUser: (userId, reason) => api.delete(`/auth/superadmin/users/${userId}`, { data: { reason } }),
  bulkSuspendUsers: (userIds, reason) => api.post('/auth/superadmin/users/bulk-suspend', { userIds, reason }),
  configureSuperAdminSecurity: (data) => api.put('/auth/superadmin/security', data),
  getAllBuildingsSystemWide: (params) => api.get('/auth/superadmin/buildings', { params }),
  getAuditLogs: (params) => api.get('/auth/superadmin/audit-logs', { params }),
  getSecurityAlerts: (params) => api.get('/auth/superadmin/security/alerts', { params }),
  getSystemServers: (params) => api.get('/auth/superadmin/servers', { params }),
  getSystemStats: () => api.get('/auth/superadmin/system-stats'),
  getSystemSettings: () => api.get('/auth/superadmin/settings'),
  updateSystemSettings: (data) => api.put('/auth/superadmin/settings', data)
};

// Visitors API
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

// Deliveries API
export const deliveriesAPI = {
  getAll: (params) => api.get('/deliveries', { params }),
  getOne: (id) => api.get(`/deliveries/${id}`),
  create: (data) => api.post('/deliveries', data),
  update: (id, data) => api.put(`/deliveries/${id}`, data),
  delete: (id) => api.delete(`/deliveries/${id}`),
  getPending: () => api.get('/deliveries/pending'),
  getToday: (apartmentId) => api.get('/deliveries/today', { params: { apartmentId } })
};

// Maintenance API
export const maintenanceAPI = {
  getAll: (params) => api.get('/maintenance', { params }),
  getMyRequests: () => api.get('/maintenance/my-requests'),
  getOne: (id) => api.get(`/maintenance/${id}`),
  create: (data) => api.post('/maintenance', data, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  update: (id, data) => api.put(`/maintenance/${id}`, data),
  updateStatus: (id, data) => api.patch(`/maintenance/${id}/status`, data),
  delete: (id) => api.delete(`/maintenance/${id}`),
  getStaff: () => api.get('/maintenance/staff'),
  sendMessage: (staffId, data) => api.post(`/maintenance/${staffId}/contact`, data),
  sendImage: (staffId, data) => api.post(`/maintenance/${staffId}/image`, data, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
};

// Emergency API
export const emergencyAPI = {
  getAll: (params) => api.get('/emergencies', { params }),
  getOne: (id) => api.get(`/emergencies/${id}`),
  create: (data) => api.post('/emergencies', data),
  update: (id, data) => api.put(`/emergencies/${id}`, data),
  resolve: (id, data) => api.put(`/emergencies/${id}/resolve`, data),
  getByApartment: (apartmentId, params) => api.get(`/emergencies/apartment/${apartmentId}`, { params }),
  getStats: (params) => api.get('/emergencies/stats', { params })
};

// Promotional Ads API
export const promotionalAPI = {
  create: (formData) => api.post('/promotional', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getActive: () => api.get('/promotional/active'),
  getMyAds: () => api.get('/promotional/my-ads'),
  getStats: () => api.get('/promotional/stats'),
  update: (id, data) => api.put(`/promotional/${id}`, data),
  delete: (id) => api.delete(`/promotional/${id}`),
  trackImpression: (id) => api.post(`/promotional/${id}/impression`),
  trackClick: (id) => api.post(`/promotional/${id}/click`)
};

// Notifications API
export const notificationsAPI = {
  getAll: (params) => api.get('/notifications', { params }),
  getOne: (id) => api.get(`/notifications/${id}`),
  create: (data) => api.post('/notifications', data),
  markAsRead: (id) => api.put(`/notifications/${id}/read`),
  markAllAsRead: () => api.put('/notifications/read-all'),
  delete: (id) => api.delete(`/notifications/${id}`),
  getUnreadCount: () => api.get('/notifications/unread-count')
};

// Apartments API
export const apartmentsAPI = {
  getAll: (params) => api.get('/apartments', { params }),
  getOne: (id) => api.get(`/apartments/${id}`),
  create: (data) => api.post('/apartments', data),
  update: (id, data) => api.put(`/apartments/${id}`, data),
  delete: (id) => api.delete(`/apartments/${id}`),
  getStats: () => api.get('/apartments/stats'),
  getAvailable: () => api.get('/apartments/available'),
  getSettings: () => api.get('/apartments/settings'),
  updateSettings: (data) => api.put('/apartments/settings', data),
  // Unit management
  assignTenant: (id, data) => api.put(`/apartments/${id}/units/assign`, data),
  unassignTenant: (id, data) => api.put(`/apartments/${id}/units/unassign`, data),
  updateUnit: (id, unitId, data) => api.put(`/apartments/${id}/units/${unitId}`, data),
  // Guard management
  addGuard: (id, guardId) => api.post(`/apartments/${id}/guards`, { guardId }),
  removeGuard: (id, guardId) => api.delete(`/apartments/${id}/guards/${guardId}`)
};

// Logs API
export const logsAPI = {
  getAll: (params) => api.get('/logs', { params }),
  getOne: (id) => api.get(`/logs/${id}`),
  create: (data) => api.post('/logs', data),
  getByApartment: (apartmentId, params) => api.get(`/logs/apartment/${apartmentId}`, { params }),
  getByUser: (userId, params) => api.get(`/logs/user/${userId}`, { params }),
  getStats: (params) => api.get('/logs/stats', { params }),
  getRealtime: (params) => api.get('/logs/realtime', { params })
};

// Payments API
export const paymentsAPI = {
  getAll: (params) => api.get('/payments', { params }),
  getOne: (id) => api.get(`/payments/${id}`),
  create: (data) => api.post('/payments', data),
  update: (id, data) => api.put(`/payments/${id}`, data),
  delete: (id) => api.delete(`/payments/${id}`),
  getByApartment: (apartmentId, params) => api.get(`/payments/apartment/${apartmentId}`, { params }),
  recordPayment: (data) => api.post('/payments/record', data),
  getStats: () => api.get('/payments/stats'),
  // Subscription plans
  getPlans: () => api.get('/payments/plans'),
  // Admin finance
  getAdminAnalytics: () => api.get('/payments/admin/analytics'),
  // Tenant finance
  getTenantFinance: () => api.get('/payments/tenant/finance'),
  getTenantRentDashboard: () => api.get('/payments/tenant/rent-dashboard'),
  makeRentPayment: (data) => api.post('/payments/tenant/rent-payment', data),
  updatePayoutSettings: (data) => api.put('/payments/tenant/payout', data),
  // Admin tenant finance
  getAdminTenantsFinance: () => api.get('/payments/admin/tenants-finance'),
  updateTenantRent: (tenantId, data) => api.put(`/payments/admin/tenant-rent/${tenantId}`, data),
  // Rent due date settings
  setGlobalRentDueDate: (data) => api.put('/payments/admin/rent-due-date/global', data),
  setTenantRentDueDate: (tenantId, data) => api.put(`/payments/admin/rent-due-date/tenant/${tenantId}`, data),
  // Bank accounts
  getBankAccounts: () => api.get('/settings/bank-accounts'),
  getDefaultBankAccount: () => api.get('/settings/bank-accounts/default'),
  addBankAccount: (data) => api.post('/settings/bank-accounts', data),
  updateBankAccount: (id, data) => api.put(`/settings/bank-accounts/${id}`, data),
  deleteBankAccount: (id) => api.delete(`/settings/bank-accounts/${id}`)
};

// Rent Ledger API (non-realtime manual tracking)
export const rentLedgerAPI = {
  createRecord: (data) => api.post('/rent-ledger', data),
  bulkCreate: (records) => api.post('/rent-ledger/bulk', { records }),
  getAll: (params) => api.get('/rent-ledger/all', { params }),
  getSummary: () => api.get('/rent-ledger/summary'),
  getTenantLedger: (tenantId) => api.get(`/rent-ledger/tenant/${tenantId}`),
  updateRecord: (id, data) => api.put(`/rent-ledger/${id}`, data),
  deleteRecord: (id) => api.delete(`/rent-ledger/${id}`),
  generateReport: (params) => api.get('/rent-ledger/report', { params }),
  applyLateFees: (lateFeePercent) => api.put('/rent-ledger/late-fees', { lateFeePercent }),
  triggerReminders: () => api.post('/rent-ledger/reminders/trigger')
};

export default api;
