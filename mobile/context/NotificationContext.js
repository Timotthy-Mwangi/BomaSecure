import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { notificationsAPI } from '../services/api';
import { useAuth } from './AuthContext';
import { API_URL } from '../config';
import * as SecureStore from 'expo-secure-store';
import io from 'socket.io-client';

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [socket, setSocket] = useState(null);

  const fetchUnreadCount = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const response = await notificationsAPI.getUnreadCount();
      setUnreadCount(response.data.count);
    } catch (e) {
      console.log('Error fetching unread count:', e);
    }
  }, [isAuthenticated]);

  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const response = await notificationsAPI.getAll({ limit: 50 });
      setNotifications(response.data.notifications || []);
    } catch (e) {
      console.log('Error fetching notifications:', e);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated && user) {
      fetchUnreadCount();
      fetchNotifications();

      const setupSocket = async () => {
        try {
          const token = await SecureStore.getItemAsync('bomasecure_token');
          if (token) {
            const newSocket = io(API_URL, {
              auth: { token },
              transports: ['websocket']
            });

            newSocket.on('connect', () => {
              console.log('Notification socket connected');
              // Join maintenance room if user is maintenance role
              if (user?.role === 'maintenance') {
                newSocket.emit('join:maintenance');
                console.log('Emitted join:maintenance for maintenance user');
              }
            });

            newSocket.on('notification:new', (notification) => {
              console.log('New notification received:', notification);
              setNotifications(prev => [notification, ...prev]);
              setUnreadCount(prev => prev + 1);
            });

            newSocket.on('maintenance:created', (request) => {
              console.log('Maintenance created:', request);
              fetchUnreadCount();
            });

            newSocket.on('maintenance:updated', (request) => {
              console.log('Maintenance updated:', request);
              fetchUnreadCount();
            });

            newSocket.on('maintenance:contact', (data) => {
              console.log('Maintenance contact message:', data);
              setNotifications(prev => [{
                _id: Date.now().toString(),
                title: 'New Maintenance Message',
                message: data.message,
                from: data.from,
                type: 'maintenance_contact',
                createdAt: data.timestamp,
                isRead: false
              }, ...prev]);
              setUnreadCount(prev => prev + 1);
            });

            newSocket.on('maintenance:image', (data) => {
              console.log('Maintenance image received:', data);
              setNotifications(prev => [{
                _id: Date.now().toString(),
                title: 'New Maintenance Image',
                message: 'Received an image from ' + data.from,
                imageUrl: data.imageUrl,
                type: 'maintenance_image',
                createdAt: data.timestamp,
                isRead: false
              }, ...prev]);
              setUnreadCount(prev => prev + 1);
            });

            newSocket.on('disconnect', () => {
              console.log('Notification socket disconnected');
            });

            setSocket(newSocket);
          }
        } catch (e) {
          console.log('Socket setup error:', e);
        }
      };

      setupSocket();

      return () => {
        if (socket) {
          socket.disconnect();
        }
      };
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [socket]);

  const markAsRead = async (id) => {
    try {
      await notificationsAPI.markAsRead(id);
      setUnreadCount(prev => Math.max(0, prev - 1));
      setNotifications(prev => 
        prev.map(n => n._id === id ? { ...n, isRead: true } : n)
      );
    } catch (e) {
      console.log('Error marking as read:', e);
    }
  };

  const markAllAsRead = async () => {
    try {
      await notificationsAPI.markAllAsRead();
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (e) {
      console.log('Error marking all as read:', e);
    }
  };

  const addNotification = (notification) => {
    setNotifications(prev => [notification, ...prev]);
    if (!notification.isRead) {
      setUnreadCount(prev => prev + 1);
    }
  };

  return (
    <NotificationContext.Provider
      value={{
        unreadCount,
        notifications,
        fetchUnreadCount,
        fetchNotifications,
        markAsRead,
        markAllAsRead,
        addNotification
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
};

export default NotificationContext;