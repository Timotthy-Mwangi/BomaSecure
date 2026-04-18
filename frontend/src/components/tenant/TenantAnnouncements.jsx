import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import api, { notificationsAPI } from '../../services/api';
import socketService from '../../services/socket';
import { useAuth } from '../../context/AuthContext';
import { 
  Megaphone, 
  Send, 
  Clock, 
  Users,
  Building,
  CheckCircle,
  Trash2,
  Bell
} from 'lucide-react';

const TenantAnnouncements = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [newAnnouncement, setNewAnnouncement] = useState({
    title: '',
    message: '',
    target: 'admins'
  });
  const [sending, setSending] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      const response = await notificationsAPI.getAll({ limit: 50 });
      setNotifications(response.data.notifications || []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    // Join tenant room for real-time updates
    if (user?._id) {
      socketService.joinTenant(user._id);
    }
  }, [user, fetchNotifications]);

  // Listen for real-time announcements
  useEffect(() => {
    const handleAnnouncementNew = (data) => {
      // Add new announcement to the list
      const announcement = {
        _id: `socket_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        title: data.announcement?.title || 'New Announcement',
        message: data.announcement?.message || 'A new announcement has been posted',
        type: 'announcement',
        target: data.announcement?.target || 'all',
        createdAt: data.timestamp || new Date().toISOString(),
        isRead: false,
        senderRole: data.announcement?.senderRole || 'admin'
      };
      setNotifications(prev => [announcement, ...prev]);
    }; 

    if (socketService.onAnnouncementNew) {
      socketService.onAnnouncementNew(handleAnnouncementNew);
    }

    return () => {
      socketService.removeListener('announcement:new', handleAnnouncementNew);
    };
  }, []);

  const handleSend = async () => {
    if (!newAnnouncement.title || !newAnnouncement.message) return;
    setSending(true);
    
    try {
      // Call the broadcast API to send announcement
      await api.post('/notifications/broadcast', {
        title: newAnnouncement.title,
        message: newAnnouncement.message,
        target: newAnnouncement.target,
        senderRole: 'tenant'
      });

      // Add to local list for immediate feedback
      const announcement = {
        _id: Date.now().toString(),
        title: newAnnouncement.title,
        message: newAnnouncement.message,
        type: 'announcement',
        target: newAnnouncement.target,
        createdAt: new Date().toISOString(),
        isRead: false,
        senderRole: 'tenant'
      };
      
      setNotifications([announcement, ...notifications]);
      setNewAnnouncement({ title: '', message: '', target: 'admins' });
    } catch (error) {
      console.error('Error sending announcement:', error);
    } finally {
      setSending(false);
    }
  };

  const deleteAnnouncement = async (id) => {
    // If it's a temporary local ID, just remove locally and skip the API call
    if (id.toString().startsWith('socket_') || /^\d+$/.test(id.toString())) {
      setNotifications(prev => prev.filter(a => a._id !== id));
      return;
    }

    try {
      await notificationsAPI.delete(id);
      setNotifications(prev => prev.filter(a => a._id !== id));
    } catch (error) {
      // If API fails, just remove locally
      setNotifications(prev => prev.filter(a => a._id !== id));
    }
  };

  const containerStyle = {
    padding: '24px',
    maxWidth: '1000px',
    margin: '0 auto'
  };

  const cardStyle = {
    background: '#1E293B',
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    marginBottom: '20px'
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
    if (days < 7) return `${days}d ago`;
    return new Date(date).toLocaleDateString();
  };

  return (
    <div style={containerStyle}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ marginBottom: '24px' }}
      >
        <h1 style={{
          margin: 0,
          fontSize: '28px',
          fontWeight: 700,
          color: '#F1F5F9',
          fontFamily: 'Poppins, sans-serif',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <Megaphone size={32} color="#3B82F6" />
          Announcements
        </h1>
        <p style={{
          margin: '8px 0 0',
          fontSize: '16px',
          color: '#94A3B8'
        }}>
          Send messages to admins or guards
        </p>
      </motion.div>

      {/* Create Announcement */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        style={cardStyle}
      >
        <h2 style={{ margin: '0 0 16px', fontSize: '20px', fontWeight: 600, color: '#F1F5F9' }}>
          📢 Send New Announcement
        </h2>
        
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#F1F5F9', fontWeight: 500 }}>
            Title
          </label>
          <input
            type="text"
            value={newAnnouncement.title}
            onChange={(e) => setNewAnnouncement({ ...newAnnouncement, title: e.target.value })}
            placeholder="Enter announcement title..."
            style={{
              width: '100%',
              padding: '12px 16px',
              borderRadius: '12px',
              border: '1px solid #334155',
              background: '#0F172A',
              fontSize: '14px',
              color: '#F1F5F9',
              boxSizing: 'border-box'
            }}
          />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#F1F5F9', fontWeight: 500 }}>
            Message
          </label>
          <textarea
            value={newAnnouncement.message}
            onChange={(e) => setNewAnnouncement({ ...newAnnouncement, message: e.target.value })}
            placeholder="Enter your announcement message..."
            rows={4}
            style={{
              width: '100%',
              padding: '12px 16px',
              borderRadius: '12px',
              border: '1px solid #334155',
              background: '#0F172A',
              fontSize: '14px',
              color: '#F1F5F9',
              resize: 'none',
              boxSizing: 'border-box'
            }}
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#F1F5F9', fontWeight: 500 }}>
            Send To
          </label>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button
              onClick={() => setNewAnnouncement({ ...newAnnouncement, target: 'admins' })}
              style={{
                padding: '12px 24px',
                borderRadius: '12px',
                border: `2px solid ${newAnnouncement.target === 'admins' ? '#3B82F6' : '#334155'}`,
                background: newAnnouncement.target === 'admins' ? '#3B82F620' : 'transparent',
                color: '#F1F5F9',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <Building size={18} />
              Admins
            </button>
            <button
              onClick={() => setNewAnnouncement({ ...newAnnouncement, target: 'guards' })}
              style={{
                padding: '12px 24px',
                borderRadius: '12px',
                border: `2px solid ${newAnnouncement.target === 'guards' ? '#F59E0B' : '#334155'}`,
                background: newAnnouncement.target === 'guards' ? '#F59E0B20' : 'transparent',
                color: '#F1F5F9',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <Bell size={18} />
              Guards
            </button>
            <button
              onClick={() => setNewAnnouncement({ ...newAnnouncement, target: 'all' })}
              style={{
                padding: '12px 24px',
                borderRadius: '12px',
                border: `2px solid ${newAnnouncement.target === 'all' ? '#22C55E' : '#334155'}`,
                background: newAnnouncement.target === 'all' ? '#22C55E20' : 'transparent',
                color: '#F1F5F9',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <Users size={18} />
              All
            </button>
          </div>
        </div>

        <button
          onClick={handleSend}
          disabled={!newAnnouncement.title || !newAnnouncement.message || sending}
          style={{
            width: '100%',
            padding: '16px',
            borderRadius: '12px',
            border: 'none',
            background: sending ? '#22C55E' : '#3B82F6',
            color: '#fff',
            fontSize: '16px',
            fontWeight: 600,
            cursor: sending ? 'default' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
        >
          {sending ? (
            <>
              <CheckCircle size={20} />
              Announcement Sent!
            </>
          ) : (
            <>
              <Send size={20} />
              Send Announcement
            </>
          )}
        </button>
      </motion.div>

      {/* Past Announcements */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        style={cardStyle}
      >
        <h2 style={{ margin: '0 0 16px', fontSize: '20px', fontWeight: 600, color: '#F1F5F9' }}>
          📋 Past Announcements
        </h2>
        
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#94A3B8' }}>Loading...</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {notifications.map((announcement) => (
              <div
                key={announcement._id}
                style={{
                  padding: '20px',
                  background: '#0F172A',
                  borderRadius: '12px',
                  border: '1px solid #334155'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#F1F5F9' }}>
                        {announcement.title}
                      </h3>
                      <span style={{
                        padding: '2px 10px',
                        borderRadius: '20px',
                        fontSize: '11px',
                        fontWeight: 600,
                        background: announcement.senderRole === 'tenant' ? '#22C55E20' :
                                   announcement.target === 'admins' ? '#3B82F620' : '#F59E0B20',
                        color: announcement.senderRole === 'tenant' ? '#22C55E' :
                               announcement.target === 'admins' ? '#3B82F6' : '#F59E0B',
                        textTransform: 'capitalize'
                      }}>
                        {announcement.senderRole === 'tenant' ? 'You' : announcement.senderRole || 'admin'}
                      </span>
                    </div>
                    <p style={{ margin: '0 0 12px', fontSize: '14px', color: '#94A3B8', lineHeight: 1.5 }}>
                      {announcement.message}
                    </p>
                    <div style={{ display: 'flex', gap: '16px', fontSize: '13px', color: '#64748B' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={14} />
                        {formatTime(announcement.createdAt)}
                      </span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => deleteAnnouncement(announcement._id)}
                      style={{
                        padding: '8px',
                        background: 'transparent',
                        border: '1px solid #334155',
                        borderRadius: '8px',
                        color: '#94A3B8',
                        cursor: 'pointer'
                      }}
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {notifications.length === 0 && !loading && (
          <div style={{ textAlign: 'center', padding: '40px', color: '#94A3B8' }}>
            No announcements yet
          </div>
        )}
      </motion.div>

      <style>{`
        @media (max-width: 768px) {
          div[style*="maxWidth: 1000px"] {
            padding: 16px !important;
          }
        }
      `}</style>
    </div>
  );
};

export default TenantAnnouncements;
