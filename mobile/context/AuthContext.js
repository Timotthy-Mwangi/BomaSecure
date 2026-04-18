import React, { createContext, useContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import { authAPI } from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = await SecureStore.getItemAsync('bomasecure_token');
      const userData = await SecureStore.getItemAsync('bomasecure_user');
      
      if (token && userData) {
        setUser(JSON.parse(userData));
        setIsAuthenticated(true);
        
        try {
          const response = await authAPI.getMe();
          const freshUser = response.data;
          setUser(freshUser);
          await SecureStore.setItemAsync('bomasecure_user', JSON.stringify(freshUser));
        } catch (e) {
          console.log('Token expired');
          await logout();
        }
      }
    } catch (e) {
      console.log('Auth check error:', e);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const response = await authAPI.login({ email, password });
      const { token, user: userData } = response.data;
      
      await SecureStore.setItemAsync('bomasecure_token', token);
      await SecureStore.setItemAsync('bomasecure_user', JSON.stringify(userData));
      
      setUser(userData);
      setIsAuthenticated(true);
      
      return { success: true, user: userData };
    } catch (error) {
      const message = error.response?.data?.message || 'Login failed';
      return { success: false, error: message };
    }
  };

  const register = async (data) => {
    try {
      const response = await authAPI.register(data);
      const { token, user: userData } = response.data;
      
      await SecureStore.setItemAsync('bomasecure_token', token);
      await SecureStore.setItemAsync('bomasecure_user', JSON.stringify(userData));
      
      setUser(userData);
      setIsAuthenticated(true);
      
      return { success: true, user: userData };
    } catch (error) {
      const message = error.response?.data?.message || 'Registration failed';
      return { success: false, error: message };
    }
  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch (e) {
      console.log('Logout API error:', e);
    }
    
    await SecureStore.deleteItemAsync('bomasecure_token');
    await SecureStore.deleteItemAsync('bomasecure_user');
    
    setUser(null);
    setIsAuthenticated(false);
  };

  const updateUser = (userData) => {
    setUser(userData);
    SecureStore.setItemAsync('bomasecure_user', JSON.stringify(userData));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated,
        login,
        register,
        logout,
        updateUser,
        checkAuth
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export default AuthContext;