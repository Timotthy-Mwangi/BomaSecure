import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { emergencyAPI, authAPI } from '../../services/api';
import socketService from '../../services/socket';
import { API_BASE_URL } from '../../config';
import { 
  AlertTriangle, 
  Phone, 
  MapPin, 
  Users,
  Siren,
  CheckCircle,
  Eye
} from 'lucide-react';

const AdminEmergency = () => {
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);
  const isMobile = windowWidth < 768;
  const isTablet = windowWidth >= 768 && windowWidth < 1024;
  const [emergencies, setEmergencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('active'); // 'active', 'resolved', 'all'
  const [stats, setStats] = useState({
    active: 0,
    resolvedToday: 0,
    securityStaff: 0,
    total: 0
  });
  const [users, setUsers] = useState([]);
  const [emergencyContacts, setEmergencyContacts] = useState([]);

  useEffect(() => {
    fetchEmergencies();
    fetchStats();
    fetchSecurityStaff();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]); // Refetch when tab changes
  
  useEffect(() => {
    // Real-time emergency listeners
    const handleNewEmergency = (emergency) => {
      setEmergencies(prev => [emergency, ...prev]);
      setStats(prev => ({ ...prev, active: prev.active + 1 }));
    };
    
    const handleEmergencyResolved = (data) => {
      setEmergencies(prev => 
        prev.map(e => e._id === data.emergencyId ? { ...e, status: 'resolved' } : e)
      );
      setStats(prev => ({ 
        ...prev, 
        active: Math.max(0, prev.active - 1),
        resolvedToday: prev.resolvedToday + 1 
      }));
    };
    
    socketService.onEmergencyNew(handleNewEmergency);
    socketService.onEmergencyResolved(handleEmergencyResolved);
    socketService.joinAdmin();
    
    // Handle window resize
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      socketService.removeListener('emergency:new', handleNewEmergency);
      socketService.removeListener('emergency:resolved', handleEmergencyResolved);
    };
  }, []);

  const fetchEmergencies = async () => {
    try {
      // Fetch all emergencies with pagination
      const response = await emergencyAPI.getAll({ limit: 100, status: activeTab === 'all' ? undefined : activeTab });
      setEmergencies(response.data.emergencies || []);
    } catch (error) {
      console.error('Error fetching emergencies:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await emergencyAPI.getStats();
      setStats(response.data.stats || { active: 0, resolvedToday: 0, securityStaff: 0, total: 0 });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchSecurityStaff = async () => {
    try {
      const response = await authAPI.getUsers({ role: 'guard', limit: 100 });
      // Filter only guards (security staff) - exclude tenants
      const guardUsers = (response.data.users || []).filter(user => user.role === 'guard');
      setUsers(guardUsers);
      // Also set emergency contacts from security staff
      const contacts = guardUsers.map(guard => ({
        id: guard._id,
        name: guard.name,
        phone: guard.phone,
        role: 'Security Guard'
      }));
      setEmergencyContacts(contacts);
    } catch (error) {
      console.error('Error fetching users:', error);
      setUsers([]);
      setEmergencyContacts([]);
    }
  };

  const containerStyle = {
    padding: isMobile ? '12px' : isTablet ? '16px' : '24px',
    maxWidth: '1200px',
    margin: '0 auto',
    width: '100%'
  };

  const cardStyle = {
    background: '#1E293B',
    borderRadius: isMobile ? '12px' : '16px',
    padding: isMobile ? '16px' : '24px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    marginBottom: '20px'
  };

  const getSeverityColor = (severity) => {
    switch(severity) {
      case 'critical': return '#EF4444';
      case 'high': return '#F59E0B';
      case 'medium': return '#3B82F6';
      default: return '#6B7280';
    }
  };

  const getTypeIcon = (type) => {
    switch(type) {
      case 'fire': return '🔥';
      case 'medical': return '🏥';
      case 'security': return '🛡️';
      case 'natural_disaster': return '🌊';
      default: return '⚠️';
    }
  };

  const resolveEmergency = async (id) => {
    try {
      await emergencyAPI.resolve(id, { resolutionNotes: 'Resolved by admin' });
      fetchEmergencies();
      fetchStats();
    } catch (error) {
      console.error('Error resolving emergency:', error);
    }
  };

  // Get filtered emergencies based on activeTab
  const getFilteredEmergencies = () => {
    if (activeTab === 'all') return emergencies;
    return emergencies.filter(e => e.status === activeTab);
  };

  const formatTime = (date) => {
    const now = new Date();
    const diff = now - new Date(date);
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} mins ago`;
    if (hours < 24) return `${hours} hours ago`;
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
          fontSize: isMobile ? '22px' : '28px',
          fontWeight: 700,
          color: '#F1F5F9',
          fontFamily: 'Poppins, sans-serif',
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: 'center',
          gap: '12px'
        }}>
          <AlertTriangle size={isMobile ? 28 : 32} color="#EF4444" />
          Emergency Management
        </h1>
        <p style={{
          margin: '8px 0 0',
          fontSize: isMobile ? '14px' : '16px',
          color: '#94A3B8'
        }}>
          Monitor and manage emergency incidents across all properties
        </p>
      </motion.div>

      {/* Stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '16px',
        marginBottom: '24px'
      }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          style={{
            ...cardStyle,
            background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
            color: '#fff'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ margin: 0, fontSize: '13px', opacity: 0.9 }}>Active</p>
              <h3 style={{ margin: '8px 0 0', fontSize: '32px', fontWeight: 700, color: '#fff' }}>
                {stats.active}
              </h3>
            </div>
            <Siren size={40} opacity={0.3} />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          style={cardStyle}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ margin: 0, fontSize: '13px', color: '#94A3B8' }}>Resolved Today</p>
              <h3 style={{ margin: '8px 0 0', fontSize: '32px', fontWeight: 700, color: '#22C55E' }}>
                {stats.resolvedToday}
              </h3>
            </div>
            <CheckCircle size={40} color="#22C55E" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          style={cardStyle}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ margin: 0, fontSize: '13px', color: '#94A3B8' }}>Total Records</p>
              <h3 style={{ margin: '8px 0 0', fontSize: '32px', fontWeight: 700, color: '#3B82F6' }}>{stats.total || emergencies.length}</h3>
            </div>
            <Eye size={40} color="#3B82F6" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          style={cardStyle}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ margin: 0, fontSize: '13px', color: '#94A3B8' }}>Security Staff</p>
              <h3 style={{ margin: '8px 0 0', fontSize: '32px', fontWeight: 700, color: '#22C55E' }}>{users.length}</h3>
            </div>
            <Users size={40} color="#22C55E" />
          </div>
        </motion.div>
      </div>

      {/* Emergency Records with Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        style={cardStyle}
      >
        {/* Tab Navigation */}
        <div style={{ 
          display: 'flex', 
          gap: '8px', 
          marginBottom: '20px',
          borderBottom: '1px solid #334155',
          paddingBottom: '12px',
          flexWrap: 'wrap'
        }}>
          <button
            onClick={() => setActiveTab('active')}
            style={{
              padding: isMobile ? '8px 12px' : '10px 20px',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === 'active' ? '#EF4444' : '#1E293B',
              color: activeTab === 'active' ? '#fff' : '#94A3B8',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: isMobile ? '12px' : '14px',
              flex: isMobile ? '1 1 auto' : 'none',
              justifyContent: 'center'
            }}
          >
            <Siren size={16} />
            Active ({stats.active})
          </button>
          <button
            onClick={() => setActiveTab('resolved')}
            style={{
              padding: isMobile ? '8px 12px' : '10px 20px',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === 'resolved' ? '#22C55E' : '#1E293B',
              color: activeTab === 'resolved' ? '#fff' : '#94A3B8',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: isMobile ? '12px' : '14px',
              flex: isMobile ? '1 1 auto' : 'none',
              justifyContent: 'center'
            }}
          >
            <CheckCircle size={16} />
            Resolved ({stats.resolvedToday})
          </button>
          <button
            onClick={() => setActiveTab('all')}
            style={{
              padding: isMobile ? '8px 12px' : '10px 20px',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === 'all' ? '#3B82F6' : '#1E293B',
              color: activeTab === 'all' ? '#fff' : '#94A3B8',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: isMobile ? '12px' : '14px',
              flex: isMobile ? '1 1 auto' : 'none',
              justifyContent: 'center'
            }}
          >
            <Eye size={16} />
            All Records
          </button>
        </div>
        
        <h2 style={{ margin: '0 0 16px', fontSize: isMobile ? '18px' : '20px', fontWeight: 600, color: '#F1F5F9' }}>
          {activeTab === 'active' ? '🚨 Active Emergencies' : activeTab === 'resolved' ? '✅ Resolved Emergencies' : '📋 All Emergency Records'}
        </h2>
        
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#94A3B8' }}>Loading...</div>
        ) : getFilteredEmergencies().length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#22C55E' }}>
            <CheckCircle size={48} style={{ marginBottom: '12px' }} />
            <p style={{ margin: 0, fontSize: '16px' }}>No emergencies</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'column', gap: '12px' }}>
            {getFilteredEmergencies().map((emergency) => (
              <div
                key={emergency._id}
                style={{
                  padding: isMobile ? '16px' : '20px',
                  background: '#0F172A',
                  border: `2px solid ${getSeverityColor(emergency.severity)}`,
                  borderRadius: '12px',
                  opacity: emergency.status === 'resolved' ? 0.7 : 1
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? '16px' : '0' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', flex: 1, minWidth: 0 }}>
                    <div style={{
                      width: isMobile ? '40px' : '48px',
                      height: isMobile ? '40px' : '48px',
                      borderRadius: '12px',
                      background: getSeverityColor(emergency.severity),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fff',
                      fontWeight: 700,
                      fontSize: isMobile ? '18px' : '20px',
                      flexShrink: 0
                    }}>
                      {getTypeIcon(emergency.type)}
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <h3 style={{ margin: 0, fontSize: isMobile ? '15px' : '18px', fontWeight: 600, color: '#F1F5F9', wordBreak: 'break-word' }}>
                          {emergency.type.charAt(0).toUpperCase() + emergency.type.slice(1).replace('_', ' ')} Emergency
                        </h3>
                        <span style={{
                          padding: '2px 10px',
                          borderRadius: '20px',
                          fontSize: '11px',
                          fontWeight: 600,
                          background: getSeverityColor(emergency.severity) + '20',
                          color: getSeverityColor(emergency.severity),
                          textTransform: 'uppercase'
                        }}>
                          {emergency.severity}
                        </span>
                        <span style={{
                          padding: '2px 10px',
                          borderRadius: '20px',
                          fontSize: '11px',
                          fontWeight: 600,
                          background: emergency.status === 'resolved' ? '#22C55E20' : '#EF444420',
                          color: emergency.status === 'resolved' ? '#22C55E' : '#EF4444',
                          textTransform: 'uppercase'
                        }}>
                          {emergency.status}
                        </span>
                      </div>
                      <p style={{ margin: '4px 0 0', fontSize: isMobile ? '12px' : '14px', color: '#94A3B8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <MapPin size={14} /> {emergency.location?.building || 'Unknown'} • {emergency.location?.unit || 'N/A'}
                      </p>
                      <p style={{ margin: '4px 0 0', fontSize: isMobile ? '12px' : '13px', color: '#94A3B8', wordBreak: 'break-word' }}>
                        {emergency.description}
                      </p>
                      {emergency.attachments && emergency.attachments.length > 0 && (
                        <div style={{ marginTop: '8px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          {emergency.attachments.map((photo, idx) => (
                            <div 
                              key={idx}
                              onClick={() => window.open(`${API_BASE_URL}${photo}`, '_blank')}
                              style={{
                                width: '60px',
                                height: '60px',
                                borderRadius: '8px',
                                overflow: 'hidden',
                                cursor: 'pointer',
                                border: '2px solid #334155'
                              }}
                            >
                              <img 
                                src={`${API_BASE_URL}${photo}`}
                                alt={`Incident documentation ${idx + 1}`}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              />
                            </div>
                          ))}
                        </div>
                      )}
                      <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#64748B' }}>
                        Reported by {emergency.reportedBy?.name || 'Unknown'} • {formatTime(emergency.createdAt)}
                        {emergency.resolvedAt && ` • Resolved ${formatTime(emergency.resolvedAt)}`}
                      </p>
                    </div>
                  </div>
                  <div style={{ 
                    display: 'flex', 
                    gap: '8px',
                    flexDirection: isMobile ? 'row' : 'row',
                    width: isMobile ? '100%' : 'auto',
                    flexShrink: 0
                  }}>
                    {emergency.status !== 'resolved' && (
                      <button
                        onClick={() => resolveEmergency(emergency._id)}
                        style={{
                          padding: isMobile ? '12px' : '10px 20px',
                          background: '#22C55E',
                          border: 'none',
                          borderRadius: '10px',
                          color: '#fff',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          flex: 1,
                          fontSize: isMobile ? '14px' : '14px'
                        }}
                      >
                        <CheckCircle size={16} />
                        Resolve
                      </button>
                    )}
                    <button style={{
                      padding: isMobile ? '12px 16px' : '10px 12px',
                      background: '#EF4444',
                      border: 'none',
                      borderRadius: '10px',
                      color: '#fff',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flex: isMobile ? 'none' : 'none'
                    }}>
                      <Phone size={18} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Emergency Contacts */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        style={cardStyle}
      >
        <h2 style={{ margin: '0 0 16px', fontSize: '20px', fontWeight: 600, color: '#F1F5F9' }}>
          📞 Emergency Contacts
        </h2>
        
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(250px, 1fr))', gap: '12px' }}>
          {emergencyContacts.map((contact, index) => (
            <div
              key={index}
              style={{
                padding: isMobile ? '12px' : '16px',
                background: '#0F172A',
                borderRadius: '12px',
                display: 'flex',
                flexDirection: isMobile ? 'column' : 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                textAlign: isMobile ? 'center' : 'left'
              }}
            >
              <div>
                <p style={{ margin: 0, fontSize: isMobile ? '14px' : '15px', fontWeight: 600, color: '#F1F5F9' }}>{contact.name}</p>
                <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#94A3B8' }}>Response: {contact.response}</p>
              </div>
              <a
                href={`tel:${contact.phone}`}
                style={{
                  padding: isMobile ? '12px 20px' : '10px 20px',
                  background: '#EF4444',
                  borderRadius: '10px',
                  color: '#fff',
                  fontWeight: 700,
                  textDecoration: 'none',
                  fontSize: isMobile ? '14px' : '16px',
                  whiteSpace: 'nowrap'
                }}
              >
                {contact.phone}
              </a>
            </div>
          ))}
        </div>
      </motion.div>

      <style>{`
        @media (max-width: 768px) {
          div[style*="maxWidth: 1200px"] {
            padding: 16px !important;
          }
        }
      `}</style>
    </div>
  );
};

export default AdminEmergency;
