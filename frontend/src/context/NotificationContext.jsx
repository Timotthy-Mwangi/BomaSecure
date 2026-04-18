import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { notificationsAPI } from '../services/api';
import socketService from '../services/socket';
import audioService from '../services/audioService';
import { useAuth } from './AuthContext';

const NotificationContext = createContext(null);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const response = await notificationsAPI.getAll({ limit: 20 });
      setNotifications(response.data.notifications);
      setUnreadCount(response.data.unreadCount);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Fetch unread count
  const fetchUnreadCount = useCallback(async () => {
    if (!user) return;
    
    try {
      const response = await notificationsAPI.getUnreadCount();
      setUnreadCount(response.data.count);
    } catch (err) {
      console.error('Error fetching unread count:', err);
    }
  }, [user]);

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId) => {
    try {
      await notificationsAPI.markAsRead(notificationId);
      setNotifications(prev => 
        prev.map(n => n._id === notificationId ? { ...n, isRead: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  }, []);

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    try {
      await notificationsAPI.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  }, []);

  // Delete notification
  const deleteNotification = useCallback(async (notificationId) => {
    try {
      await notificationsAPI.delete(notificationId);
      const notification = notifications.find(n => n._id === notificationId);
      setNotifications(prev => prev.filter(n => n._id !== notificationId));
      if (notification && !notification.isRead) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error('Error deleting notification:', err);
    }
  }, [notifications]);

  // Listen for real-time notifications
  useEffect(() => {
    if (!user) return;

    // Track user interaction for audio compliance on first click
    const handleUserInteraction = () => {
      audioService.trackUserInteraction();
    };

    // Add document click listener for audio policy compliance
    document.addEventListener('click', handleUserInteraction, { once: true });

    // Refresh notifications when new ones are added (to get persisted ones from DB)
    const handleNewNotification = (data) => {
      // Add the new notification directly to the list without full re-fetch
      if (data && data._id) {
        setNotifications(prev => {
          // Check if notification already exists
          const exists = prev.some(n => n._id === data._id);
          if (!exists) {
            return [data, ...prev];
          }
          return prev;
        });
        // Increment unread count
        setUnreadCount(prev => prev + 1);
      }
      // Also do a full refresh to ensure data consistency
      fetchNotifications();
    };

    const handleVisitorArrived = (data) => {
      // Add notification directly if present
      if (data?.notification?._id) {
        setNotifications(prev => {
          const exists = prev.some(n => n._id === data.notification._id);
          if (!exists) {
            return [data.notification, ...prev];
          }
          return prev;
        });
        setUnreadCount(prev => prev + 1);
      }
      fetchNotifications();
    };

    const handleDeliveryArrived = (data) => {
      if (data?.notification?._id) {
        setNotifications(prev => {
          const exists = prev.some(n => n._id === data.notification._id);
          if (!exists) {
            return [data.notification, ...prev];
          }
          return prev;
        });
        setUnreadCount(prev => prev + 1);
      }
      fetchNotifications();
    };

    const handleEmergencyNew = (data) => {
      fetchNotifications();
      // Play emergency alarm sound (requires user interaction)
      if (data.emergency?.severity === 'critical') {
        audioService.playCriticalAlert({ volume: 0.8, loops: 2 });
      } else {
        audioService.playAlarm({ volume: 0.7, loops: 3 });
      }
    };

    const handleRentIncreaseAlert = (data) => {
      setUnreadCount(prev => prev + 1);
      fetchNotifications();
      audioService.playNotification({ volume: 0.6 });
    };

    const handleAnnouncementNew = (data) => {
      setUnreadCount(prev => prev + 1);
      fetchNotifications();
    };

    const handleAccessNew = (data) => {
      setUnreadCount(prev => prev + 1);
      fetchNotifications();
    };

    const handleMaintenanceCreated = (data) => {
      setUnreadCount(prev => prev + 1);
      fetchNotifications();
    };

    const handleMaintenanceUpdated = (data) => {
      fetchNotifications();
    };

    socketService.onNotification(handleNewNotification);
    socketService.onVisitorArrived(handleVisitorArrived);
    socketService.onDeliveryArrived(handleDeliveryArrived);
    socketService.onEmergencyNew(handleEmergencyNew);
    socketService.onRentIncreaseAlert?.(handleRentIncreaseAlert);
    socketService.onAnnouncementNew(handleAnnouncementNew);
    socketService.onAccessNew(handleAccessNew);
    socketService.onMaintenanceCreated(handleMaintenanceCreated);
    socketService.onMaintenanceUpdated(handleMaintenanceUpdated);

    return () => {
      socketService.removeListener('notification:new', handleNewNotification);
      socketService.removeListener('visitor:arrived', handleVisitorArrived);
      socketService.removeListener('delivery:arrived', handleDeliveryArrived);
      socketService.removeListener('emergency:new', handleEmergencyNew);
      socketService.removeListener('rent:increase:alert', handleRentIncreaseAlert); // Remove listener
      socketService.removeListener('announcement:new', handleAnnouncementNew);
      socketService.removeListener('access:new', handleAccessNew);
      socketService.removeListener('maintenance:created', handleMaintenanceCreated);
      socketService.removeListener('maintenance:updated', handleMaintenanceUpdated);
    };
  }, [user, fetchNotifications]);

  // Initial fetch
  useEffect(() => {
    if (user) {
      fetchNotifications();
    }
  }, [user, fetchNotifications]);

  const value = {
    notifications,
    unreadCount,
    loading,
    fetchNotifications,
    fetchUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export default NotificationContext;
