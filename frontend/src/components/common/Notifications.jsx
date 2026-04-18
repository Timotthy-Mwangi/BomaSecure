import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import api from '../../services/api';
import socketService from '../../services/socket';
import { useAuth } from '../../context/AuthContext';
import { COLORS } from '../../config';

const Notifications = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const fetchNotifications = async () => {
    try {
      const response = await api.get('/notifications');
      setNotifications(response.data.notifications || response.data || []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    
    // Listen for real-time notifications
    const handleNewNotification = (data) => {
      setNotifications(prev => [data, ...prev]);
    };

    const handleVisitorArrived = (data) => {
      setNotifications(prev => [{
        _id: `socket_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'visitor_arrival',
        title: 'Visitor Arrived',
        message: `${data.visitor?.name || 'A visitor'} has arrived`,
        read: false,
        createdAt: new Date(),
        data: data,
        qrCode: data.qrCode,
        isSocketNotification: true
      }, ...prev]);
    };

    const handleDeliveryArrived = (data) => {
      setNotifications(prev => [{
        _id: `socket_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'delivery_arrival',
        title: 'Delivery Received',
        message: `A package has been delivered`,
        read: false,
        createdAt: new Date(),
        data: data,
        qrCode: data.qrCode,
        isSocketNotification: true
      }, ...prev]);
    };

    // Listen for emergency/trigger alarm events
    const handleEmergencyNew = (data) => {
      const emergency = data.emergency;
      const message = emergency?.description 
        ? `${emergency.type?.toUpperCase()}: ${emergency.description}`
        : emergency?.type || 'Emergency alarm triggered';
      setNotifications(prev => [{
        _id: `socket_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'emergency',
        title: '🚨 EMERGENCY ALERT',
        message: message,
        read: false,
        createdAt: new Date(),
        data: data,
        priority: 'high',
        isSocketNotification: true
      }, ...prev]);
    };

    // Listen for emergency resolved events
    const handleEmergencyResolved = (data) => {
      const emergency = data.emergency;
      const message = emergency?.description 
        ? `Resolved: ${emergency.type?.toUpperCase()} - ${emergency.description}`
        : `Emergency has been resolved: ${emergency?.type || 'Alert'}`;
      setNotifications(prev => [{
        _id: `socket_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'emergency_resolved',
        title: '✅ Emergency Resolved',
        message: message,
        read: false,
        createdAt: new Date(),
        data: data,
        isSocketNotification: true
      }, ...prev]);
    };

    // Listen for announcement events
    const handleAnnouncementNew = (data) => {
      setNotifications(prev => [{
        _id: `socket_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'announcement',
        title: data.announcement?.title || '📢 New Announcement',
        message: data.announcement?.message || 'A new announcement has been posted',
        read: false,
        createdAt: new Date(),
        data: data,
        priority: 'normal',
        isSocketNotification: true
      }, ...prev]);
    };

    // Listen for access log events
    const handleAccessNew = (data) => {
      setNotifications(prev => [{
        _id: `socket_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'access_log',
        title: '🚪 Access Event',
        message: `${data.log?.personName || 'Someone'} - ${data.log?.action || 'access'} at ${data.log?.gateNumber || 'gate'}`,
        read: false,
        createdAt: new Date(),
        data: data,
        priority: 'low',
        isSocketNotification: true
      }, ...prev]);
    };

    // Subscribe to socket events
    if (socketService.onNotification) socketService.onNotification(handleNewNotification);
    if (socketService.onVisitorArrived) socketService.onVisitorArrived(handleVisitorArrived);
    if (socketService.onDeliveryArrived) socketService.onDeliveryArrived(handleDeliveryArrived);
    if (socketService.onEmergencyNew) socketService.onEmergencyNew(handleEmergencyNew);
    if (socketService.onEmergencyResolved) socketService.onEmergencyResolved(handleEmergencyResolved);
    if (socketService.onAnnouncementNew) socketService.onAnnouncementNew(handleAnnouncementNew);
    if (socketService.onAccessNew) socketService.onAccessNew(handleAccessNew);
    
    // Join role-based rooms for receiving emergency notifications
    if (user?.role === 'admin') {
      socketService.joinAdmin();
    } else if (user?.role === 'guard') {
      socketService.joinGuards();
    } else if (user?.role === 'tenant') {
      socketService.joinTenants();
    }

    return () => {
      socketService.removeListener('notification:new', handleNewNotification);
      socketService.removeListener('visitor:arrived', handleVisitorArrived);
      socketService.removeListener('delivery:arrived', handleDeliveryArrived);
      socketService.removeListener('emergency:new', handleEmergencyNew);
      socketService.removeListener('emergency:resolved', handleEmergencyResolved);
      socketService.removeListener('announcement:new', handleAnnouncementNew);
      socketService.removeListener('access:new', handleAccessNew);
    };
  }, [user?._id, user?.role]);

  const getIsRead = (notification) => {
    return notification.isRead ?? notification.read ?? false;
  };

  const markAsRead = async (id) => {
    // Find the notification to check if it's a socket notification
    const notification = notifications.find(n => n._id === id);
    
    // Skip API call for socket notifications - they don't exist in the database
    if (notification?.isSocketNotification) {
      setNotifications(prev =>
        prev.map(n => n._id === id ? { ...n, isRead: true, read: true } : n)
      );
      return;
    }
    
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications(prev =>
        prev.map(n => n._id === id ? { ...n, isRead: true, read: true } : n)
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    // Mark socket notifications as read locally (they don't exist in the database)
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true, read: true })));
    
    // Also try to mark database notifications as read
    try {
      await api.put('/notifications/read-all');
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const deleteNotification = async (id) => {
    // Find the notification to check if it's a socket notification
    const notification = notifications.find(n => n._id === id);
    
    // Skip API call for socket notifications - they don't exist in the database
    if (notification?.isSocketNotification) {
      setNotifications(prev => prev.filter(n => n._id !== id));
      return;
    }
    
    try {
      await api.delete(`/notifications/${id}`);
      setNotifications(prev => prev.filter(n => n._id !== id));
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const getFilteredNotifications = () => {
    if (!Array.isArray(notifications)) return [];
    switch (filter) {
      case 'unread':
        return notifications.filter(n => !getIsRead(n));
      case 'read':
        return notifications.filter(n => getIsRead(n));
      default:
        return notifications;
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'visitor_arrival': return '👤';
      case 'delivery_arrival': return '📦';
      case 'access_granted': return '✅';
      case 'access_denied': return '❌';
      case 'access_log': return '🚪';
      case 'emergency': return '🚨';
      case 'emergency_resolved': return '✅';
      case 'announcement': return '📢';
      case 'system': return '🔔';
      default: return '📢';
    }
  };

  const unreadCount = Array.isArray(notifications) ? notifications.filter(n => !getIsRead(n)).length : 0;
  const filteredNotifications = getFilteredNotifications();

  return (
    <div style={styles.container}>
      {/* Header with Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={styles.header}
      >
        <div>
          <h1 style={styles.title}>Notifications</h1>
          <p style={styles.subtitle}>
            {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'All caught up!'}
          </p>
        </div>
      </motion.div>

      {/* Mark all as read */}
      {unreadCount > 0 && (
        <button onClick={markAllAsRead} style={styles.markAllButton}>
          Mark all as read
        </button>
      )}

      {/* Filters */}
      <div style={styles.filters}>
        {['all', 'unread', 'read'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              ...styles.filterButton,
              backgroundColor: filter === f ? COLORS.primary : 'transparent',
              color: filter === f ? '#fff' : COLORS.textSecondary,
            }}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      {loading ? (
        <div style={styles.loadingContainer}>
          <div style={styles.spinner}></div>
        </div>
      ) : filteredNotifications.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={styles.emptyState}
        >
          <span style={styles.emptyIcon}>🔔</span>
          <h3>No notifications</h3>
          <p>You're all caught up!</p>
        </motion.div>
      ) : (
        <div style={styles.notificationsList}>
          <AnimatePresence>
            {filteredNotifications.map((notification, index) => (
              <motion.div
                key={notification._id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: index * 0.05 }}
                style={{
                  ...styles.notificationCard,
                  // Unread: Bright Red (#EF4444), Read: Bright Green (#22C55E)
                  ...(getIsRead(notification) 
                    ? { backgroundColor: '#14532D', borderLeftColor: '#22C55E' }  // Read - bright green
                    : { backgroundColor: '#7F1D1D', borderLeftColor: '#EF4444' }), // Unread - bright red
                }}
                onClick={() => {
                  if (!getIsRead(notification)) {
                    markAsRead(notification._id);
                    setNotifications(prev =>
                      prev.map(n => n._id === notification._id ? { ...n, isRead: true, read: true } : n)
                    );
                  }
                }}
              >
                <div style={styles.notificationIcon}>
                  {getNotificationIcon(notification.type)}
                </div>
                <div style={styles.notificationContent}>
                  <h4 style={styles.notificationTitle}>{notification.title}</h4>
                  <p style={styles.notificationMessage}>{notification.message}</p>
                  <span style={styles.notificationTime}>
                    {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                  </span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteNotification(notification._id);
                  }}
                  style={styles.deleteButton}
                >
                  ×
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
        )}
      </div>
  );
};

const styles = {
  container: {
    padding: '24px',
    maxWidth: '800px',
    margin: '0 auto',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
    flexWrap: 'wrap',
    gap: '12px',
  },
  title: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#F1F5F9',
    marginBottom: '4px',
  },
  subtitle: {
    color: '#94A3B8',
    fontSize: '14px',
  },
  markAllButton: {
    padding: '8px 16px',
    backgroundColor: '#3B82F6',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    marginBottom: '16px',
  },
  filters: {
    display: 'flex',
    gap: '8px',
    marginBottom: '20px',
    padding: '4px',
    backgroundColor: '#1E293B',
    borderRadius: '8px',
    width: 'fit-content',
  },
  filterButton: {
    padding: '8px 16px',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'all 0.2s',
  },
  loadingContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '60px',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '3px solid #f3f3f3',
    borderTop: '3px solid #3B82F6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px',
    color: '#94A3B8',
  },
  emptyIcon: {
    fontSize: '64px',
    display: 'block',
    marginBottom: '16px',
  },
  notificationsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  notificationCard: {
    display: 'flex',
    alignItems: 'flex-start',
    padding: '16px',
    backgroundColor: '#334155',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
    borderLeft: '4px solid',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  notificationIcon: {
    fontSize: '24px',
    marginRight: '16px',
    flexShrink: 0,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#F1F5F9',
    marginBottom: '4px',
  },
  notificationMessage: {
    fontSize: '14px',
    color: '#94A3B8',
    marginBottom: '8px',
  },
  notificationTime: {
    fontSize: '12px',
    color: '#64748B',
  },
  deleteButton: {
    background: 'none',
    border: 'none',
    fontSize: '20px',
    color: '#64748B',
    cursor: 'pointer',
    padding: '0 8px',
    opacity: 0.5,
  },
  input: {
    flex: 1,
    padding: '12px',
    borderRadius: '8px',
    border: '1px solid #334155',
    backgroundColor: '#0F172A',
    color: '#F1F5F9',
    fontSize: '14px',
  },
  sendButton: {
    padding: '12px 16px',
    backgroundColor: '#3B82F6',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
  },
};

export default Notifications;
