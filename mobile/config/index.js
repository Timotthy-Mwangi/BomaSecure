export const API_URL = 'http://localhost:5050/api';
export const API_BASE_URL = 'http://localhost:5050';
export const SOCKET_URL = 'http://localhost:5050';

export const APP_NAME = 'BomaSecure';
export const APP_TAGLINE = 'Building Safer Communities';

export const COLORS = {
  primary: '#3B82F6',
  secondary: '#10B981',
  accent: '#F59E0B',
  success: '#10B981',
  danger: '#EF4444',
  dark: '#0F172A',
  light: '#1E293B',
  white: '#FFFFFF',
  text: '#F1F5F9',
  textSecondary: '#94A3B8',
  lightBackground: '#F8FAFC',
  lightText: '#1E293B',
  gray: {
    50: '#F8FAFC',
    100: '#F1F5F9',
    200: '#E2E8F0',
    300: '#CBD5E1',
    400: '#94A3B8',
    500: '#64748B',
    600: '#475569',
    700: '#334155',
    800: '#1E293B',
    900: '#0F172A'
  }
};

export const ROLE_COLORS = {
  tenant: {
    primary: '#3B82F6',
    secondary: '#10B981',
    gradient: 'linear-gradient(135deg, #3B82F6 0%, #10B981 100%)',
    name: 'Tenant Portal',
    description: 'Manage visitors & deliveries for your home'
  },
  guard: {
    primary: '#8B5CF6',
    secondary: '#10B981',
    gradient: 'linear-gradient(135deg, #8B5CF6 0%, #10B981 100%)',
    name: 'Security Portal',
    description: 'Manage access & security for your property'
  },
  maintenance: {
    primary: '#F59E0B',
    secondary: '#10B981',
    gradient: 'linear-gradient(135deg, #F59E0B 0%, #10B981 100%)',
    name: 'Maintenance Portal',
    description: 'Handle repairs and maintenance requests'
  },
  admin: {
    primary: '#EF4444',
    secondary: '#F59E0B',
    gradient: 'linear-gradient(135deg, #EF4444 0%, #F59E0B 100%)',
    name: 'Admin Portal',
    description: 'Full system management & oversight'
  }
};

export const VISITOR_PURPOSES = [
  { value: 'guest', label: 'Guest Visit' },
  { value: 'delivery', label: 'Delivery' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'official', label: 'Official Business' },
  { value: 'other', label: 'Other' }
];

export const DELIVERY_STATUS = [
  { value: 'pending', label: 'Pending', color: 'yellow' },
  { value: 'received', label: 'Received', color: 'blue' },
  { value: 'ready_for_pickup', label: 'Ready for Pickup', color: 'purple' },
  { value: 'delivered', label: 'Delivered', color: 'green' },
  { value: 'returned', label: 'Returned', color: 'red' }
];

export const VISITOR_STATUS = [
  { value: 'pending', label: 'Pending', color: 'yellow' },
  { value: 'approved', label: 'Approved', color: 'blue' },
  { value: 'denied', label: 'Denied', color: 'red' },
  { value: 'checked-in', label: 'Checked In', color: 'green' },
  { value: 'checked-out', label: 'Checked Out', color: 'gray' }
];