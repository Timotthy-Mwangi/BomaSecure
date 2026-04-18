import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from '../services/api';
import socketService from '../services/socket';
import { ROLE_ROUTES } from '../config';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [apartment, setApartment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [maintenanceMode, setMaintenanceMode] = useState(false);

  // Initialize auth state
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('bomasecure_token');
      const savedUser = localStorage.getItem('bomasecure_user');

      if (token && savedUser) {
        try {
          const userData = JSON.parse(savedUser);
          setUser(userData);
          
          // Connect socket
          socketService.connect(token);
          
          // Join appropriate room based on role after socket connects
          if (userData.role === 'tenant') {
            socketService.joinTenant(userData._id);
          } else if (userData.role === 'guard') {
            socketService.joinGuards();
          } else if (userData.role === 'admin') {
            socketService.joinAdmin();
          } else if (userData.role === 'maintenance') {
            socketService.joinAdmin();
          }
          
          // Listen for account deletion events
          socketService.onAccountDeleted((data) => {
            if (data.userId === userData._id) {
              // Account was deleted by admin
              localStorage.removeItem('bomasecure_token');
              localStorage.removeItem('bomasecure_user');
              setUser(null);
              setApartment(null);
              socketService.disconnect();
              window.location.href = '/login?message=account_deleted';
            }
          });
          
          // Listen for account deactivation events
          socketService.onAccountDeactivated((data) => {
            if (data.userId === userData._id) {
              localStorage.removeItem('bomasecure_token');
              localStorage.removeItem('bomasecure_user');
              setUser(null);
              setApartment(null);
              socketService.disconnect();
              window.location.href = '/login?message=account_inactive';
            }
          });
          
          // Fetch fresh user data
          const response = await authAPI.getMe();
          setUser(response.data.user);
          setApartment(response.data.user.apartmentId);

          // Fetch system settings for maintenance mode (superadmin only)
          if (userData.role === 'superadmin' || userData.isSuperAdmin === true) {
            try {
              const settingsRes = await authAPI.getSystemSettings();
              if (settingsRes.data?.success) {
                setMaintenanceMode(settingsRes.data.data.maintenanceMode || false);
              }
            } catch (settingsErr) {
              console.error('Error fetching system settings:', settingsErr);
            }
          }
        } catch (err) {
          console.error('Auth init error:', err);
          localStorage.removeItem('bomasecure_token');
          localStorage.removeItem('bomasecure_user');
          setUser(null);
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  // Login - supports both phone and email
  const login = useCallback(async (identifier, password) => {
    setError(null);
    setLoading(true);
    
    try {
      // Determine if identifier is email or phone
      const isEmail = identifier.includes('@');
      const loginData = isEmail 
        ? { email: identifier, password } 
        : { phone: identifier, password };
      
      const response = await authAPI.login(loginData);
      const { token, user: userData, apartment: apartmentData } = response.data;

      localStorage.setItem('bomasecure_token', token);
      localStorage.setItem('bomasecure_user', JSON.stringify(userData));

      setUser(userData);
      setApartment(apartmentData);

      // Connect socket
      socketService.connect(token);
      
      // Join appropriate room based on role
      if (userData.role === 'tenant') {
        socketService.joinTenant(userData._id);
      } else if (userData.role === 'guard') {
        socketService.joinGuards();
      } else if (userData.role === 'admin') {
        socketService.joinAdmin();
      } else if (userData.role === 'maintenance') {
        socketService.joinAdmin();
      }

      return { success: true, user: userData };
    } catch (err) {
      const message = err.response?.data?.message || 'Login failed';
      setError(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  }, []);

  // Register
  const register = useCallback(async (userData) => {
    setError(null);
    setLoading(true);
    
    try {
      const response = await authAPI.register(userData);
      const { token, user: newUser } = response.data;

      localStorage.setItem('bomasecure_token', token);
      localStorage.setItem('bomasecure_user', JSON.stringify(newUser));

      setUser(newUser);

      // Connect socket
      socketService.connect(token);

      return { success: true, user: newUser };
    } catch (err) {
      const message = err.response?.data?.message || 'Registration failed';
      setError(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  }, []);

  // Logout
  const logout = useCallback(async () => {
    try {
      await authAPI.logout();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      localStorage.removeItem('bomasecure_token');
      localStorage.removeItem('bomasecure_user');
      setUser(null);
      setApartment(null);
      socketService.disconnect();
    }
  }, []);

  // Update profile
  const updateProfile = useCallback(async (data) => {
    try {
      const response = await authAPI.updateProfile(data);
      const updatedUser = response.data.user;
      
      setUser(updatedUser);
      localStorage.setItem('bomasecure_user', JSON.stringify(updatedUser));
      
      return { success: true, user: updatedUser };
    } catch (err) {
      const message = err.response?.data?.message || 'Update failed';
      return { success: false, error: message };
    }
  }, []);

  // Get redirect path based on role
  const getRedirectPath = useCallback(() => {
    if (!user) return '/login';
    return ROLE_ROUTES[user.role] || '/';
  }, [user]);

  const value = {
    user,
    apartment,
    loading,
    error,
    login,
    register,
    logout,
    updateProfile,
    getRedirectPath,
    maintenanceMode,
    setMaintenanceMode,
    isAuthenticated: !!user,
    isTenant: user?.role === 'tenant',
    isGuard: user?.role === 'guard',
    isAdmin: user?.role === 'admin',
    isMaintenance: user?.role === 'maintenance',
    isSuperAdmin: user?.role === 'superadmin' || user?.isSuperAdmin === true
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
