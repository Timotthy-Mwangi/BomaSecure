import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useNotifications } from '../../context/NotificationContext';
import { COLORS } from '../../config';
import { BellRing, Check, Trash2, User, Package, AlertCircle } from 'lucide-react';

const NotificationBell = () => {
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'visitor_arrival':
        return <User size={16} />;
      case 'delivery_arrival':
        return <Package size={16} />;
      default:
        return <AlertCircle size={16} />;
    }
  };

  const formatTime = (date) => {
    const now = new Date();
    const diff = now - new Date(date);
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      {/* Bell Button */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(!isOpen)}
        style={{
          background: 'none',
          border: 'none',
          padding: '8px',
          cursor: 'pointer',
          position: 'relative',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <BellRing size={24} color={COLORS.gray[600]} />
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            style={{
              position: 'absolute',
              top: '2px',
              right: '2px',
              minWidth: '18px',
              height: '18px',
              background: COLORS.accent,
              borderRadius: '50%',
              fontSize: '10px',
              fontWeight: 600,
              color: COLORS.white,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 4px'
            }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </motion.span>
        )}
      </motion.button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              width: '360px',
              maxHeight: '480px',
              background: COLORS.white,
              borderRadius: '12px',
              boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
              border: `1px solid ${COLORS.gray[200]}`,
              overflow: 'hidden',
              zIndex: 1000
            }}
          >
            {/* Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px',
              borderBottom: `1px solid ${COLORS.gray[200]}`,
              background: COLORS.gray[50]
            }}>
              <h3 style={{
                margin: 0,
                fontSize: '16px',
                fontWeight: 600,
                color: COLORS.dark
              }}>
                Notifications
              </h3>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: COLORS.primary,
                    fontSize: '13px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <Check size={14} />
                  Mark all read
                </button>
              )}
            </div>

            {/* Notifications List */}
            <div style={{
              maxHeight: '360px',
              overflowY: 'auto'
            }}>
              {notifications.length === 0 ? (
                <div style={{
                  padding: '40px 20px',
                  textAlign: 'center',
                  color: COLORS.gray[500]
                }}>
                  <BellRing size={40} style={{ opacity: 0.3, marginBottom: '12px' }} />
                  <p style={{ margin: 0, fontSize: '14px' }}>No notifications yet</p>
                </div>
              ) : (
                notifications.slice(0, 10).map((notification) => (
                  <div
                    key={notification._id}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '12px',
                      padding: '12px 16px',
                      borderBottom: `1px solid ${COLORS.gray[100]}`,
                      // Unread: Bright Red (#FECACA), Read: Bright Green (#BBF7D0)
                      background: notification.isRead ? '#BBF7D0' : '#FECACA',
                      cursor: 'pointer'
                    }}
                    onClick={() => {
                      if (!notification.isRead) {
                        markAsRead(notification._id);
                      }
                    }}
                  >
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      // Unread: Bright Red (#EF4444), Read: Bright Green (#22C55E)
                      background: notification.isRead ? '#22C55E' : '#EF4444',
                      color: notification.isRead ? COLORS.white : COLORS.white,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      {getNotificationIcon(notification.type)}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '4px'
                      }}>
                        <span style={{
                          fontSize: '13px',
                          fontWeight: notification.isRead ? 500 : 600,
                          color: COLORS.dark
                        }}>
                          {notification.title}
                        </span>
                        <span style={{
                          fontSize: '11px',
                          color: COLORS.gray[500],
                          whiteSpace: 'nowrap'
                        }}>
                          {formatTime(notification.createdAt)}
                        </span>
                      </div>
                      <p style={{
                        margin: 0,
                        fontSize: '12px',
                        color: COLORS.gray[600],
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {notification.message}
                      </p>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNotification(notification._id);
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: '4px',
                        cursor: 'pointer',
                        color: COLORS.gray[400],
                        opacity: 0.5
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <Link
                to="/notifications"
                onClick={() => setIsOpen(false)}
                style={{
                  display: 'block',
                  padding: '12px',
                  textAlign: 'center',
                  fontSize: '13px',
                  color: COLORS.primary,
                  textDecoration: 'none',
                  borderTop: `1px solid ${COLORS.gray[200]}`,
                  background: COLORS.gray[50]
                }}
              >
                View all notifications
              </Link>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationBell;
