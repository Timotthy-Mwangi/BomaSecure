import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { apartmentsAPI, authAPI } from '../../services/api';
import socketService from '../../services/socket';
import { COLORS } from '../../config';
import { 
  Building, 
  Users, 
  Shield, 
  Activity, 
  Settings, 
  Plus, 
  ArrowRight, 
  TrendingUp, 
  UserCheck, 
  Package, 
  Clock
} from 'lucide-react';

const AdminDashboard = () => {
  // eslint-disable-next-line no-unused-vars
  const { user } = useAuth();
  const [apartments, setApartments] = useState([]);
  const [users, setUsers] = useState({ tenants: 0, guards: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [recentActivity, setRecentActivity] = useState([]);
  const [todayStats, setTodayStats] = useState({ visitors: 0, deliveries: 0 });
  
// Window size for responsive design
  const [windowSize, setWindowSize] = useState({ width: typeof window !== 'undefined' ? window.innerWidth : 1200, height: typeof window !== 'undefined' ? window.innerHeight : 800 });
  useEffect(() => {
    const handleResize = () => setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  const isMobile = windowSize.width < 768;
  const isTablet = windowSize.width >= 768 && windowSize.width < 1024;

  const containerStyle = {
    padding: isMobile ? '12px' : isTablet ? '16px' : '24px',
    maxWidth: '1200px',
    margin: '0 auto'
  };

  const cardStyle = {
    background: '#1E293B',
    borderRadius: isMobile ? '12px' : '16px',
    padding: isMobile ? '16px' : '24px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
  };

  const statCardStyle = {
    background: COLORS.white,
    borderRadius: isMobile ? '12px' : '16px',
    padding: isMobile ? '16px' : '24px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
  };

  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : isTablet ? 'repeat(2, 1fr)' : 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: isMobile ? '10px' : isTablet ? '14px' : '20px',
    marginBottom: isMobile ? '16px' : '24px'
  };

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [apartmentsRes, usersRes] = await Promise.all([
        apartmentsAPI.getAll(),
        authAPI.getStats()
      ]);
      setApartments(apartmentsRes.data?.apartments || []);
      setUsers(usersRes.data?.data || { tenants: 0, guards: 0, total: 0 });
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const addActivity = (type, message, icon) => {
      const activity = {
        id: Date.now(),
        type,
        message,
        icon,
        time: new Date().toLocaleTimeString()
      };
      setRecentActivity(prev => {
        const updated = [activity, ...prev].slice(0, 10);
        return updated;
      });
      
      if (type === 'visitor') {
        setTodayStats(prev => ({ ...prev, visitors: prev.visitors + 1 }));
      } else if (type === 'delivery') {
        setTodayStats(prev => ({ ...prev, deliveries: prev.deliveries + 1 }));
      }
      
      fetchData();
    };

    const handleVisitorArrived = (data) => {
      addActivity('visitor', `Visitor arrived: ${data.visitor?.name || 'Guest'}`, <UserCheck size={16} />);
    };

    const handleDeliveryArrived = (data) => {
      addActivity('delivery', `Delivery arrived: ${data.delivery?.courier || 'Package'}`, <Package size={16} />);
    };

    const handleAccessNew = (data) => {
      addActivity('access', `Access event: ${data.type || 'Activity'}`, <Clock size={16} />);
    };

    const handleNotification = (data) => {
      addActivity('notification', `New notification sent`, <Activity size={16} />);
    };

    const handleEmergencyNew = (data) => {
      addActivity('emergency', `🚨 Emergency: ${data.emergency?.type || 'Alert'}`, <Activity size={16} />);
      fetchData();
    };

    const handleAnnouncementNew = (data) => {
      addActivity('announcement', `📢 New announcement posted`, <Activity size={16} />);
    };

    const handleApartmentCreated = (data) => {
      const apt = data.apartment;
      addActivity('property', `🏢 New property added: ${apt?.buildingName || 'Property'}`, <Building size={16} />);
      fetchData();
    };

    const handleApartmentUpdated = (data) => {
      const apt = data.apartment;
      addActivity('property', `🏢 Property updated: ${apt?.buildingName || 'Property'}`, <Building size={16} />);
      fetchData();
    };

    const handleUserCreated = (data) => {
      addActivity('user', `👤 New user: ${data.user?.name || 'User'}`, <Users size={16} />);
      fetchData();
    };

    socketService.onVisitorArrived(handleVisitorArrived);
    socketService.onDeliveryArrived(handleDeliveryArrived);
    socketService.onAccessNew(handleAccessNew);
    socketService.onNotification(handleNotification);
    socketService.onEmergencyNew(handleEmergencyNew);
    socketService.onAnnouncementNew(handleAnnouncementNew);
    socketService.onApartmentCreated(handleApartmentCreated);
    socketService.onApartmentUpdated(handleApartmentUpdated);
    socketService.onUserCreated(handleUserCreated);
    socketService.joinAdmin();

    return () => {
      socketService.removeListener('visitor:arrived', handleVisitorArrived);
      socketService.removeListener('delivery:arrived', handleDeliveryArrived);
      socketService.removeListener('access:new', handleAccessNew);
      socketService.removeListener('notification:new', handleNotification);
      socketService.removeListener('emergency:new', handleEmergencyNew);
      socketService.removeListener('announcement:new', handleAnnouncementNew);
      socketService.removeListener('apartment:created', handleApartmentCreated);
      socketService.removeListener('apartment:updated', handleApartmentUpdated);
      socketService.removeListener('user:created', handleUserCreated);
    };
  }, [fetchData]);

  const StatCard = ({ icon: Icon, title, value, color, subtitle }) => (
    <motion.div
      whileHover={{ y: -4, boxShadow: '0 8px 24px rgba(0,0,0,0.1)' }}
      transition={{ duration: 0.2 }}
      style={statCardStyle}
    >
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between'
      }}>
        <div>
          <p style={{
            margin: 0,
            fontSize: isMobile ? '12px' : '14px',
            fontWeight: 700,
            color: '#4B5563',
            marginBottom: isMobile ? '4px' : '8px'
          }}>
            {title}
          </p>
          <h3 className="stat-value stat-value-green" style={{
            margin: 0,
            fontSize: isMobile ? '28px' : '36px',
            fontWeight: 800,
            color: '#22C55E'
          }}>
            {value}
          </h3>
          {subtitle && (
            <p style={{
              margin: isMobile ? '4px 0 0' : '8px 0 0',
              fontSize: isMobile ? '10px' : '12px',
              color: COLORS.secondary,
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              <TrendingUp size={isMobile ? 10 : 12} />
              {subtitle}
            </p>
          )}
        </div>
        <div style={{
          width: isMobile ? '40px' : '48px',
          height: isMobile ? '40px' : '48px',
          borderRadius: isMobile ? '10px' : '12px',
          background: `${color}15`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <Icon size={isMobile ? 20 : 24} color={color} />
        </div>
      </div>
    </motion.div>
  );

  return (
    <div style={containerStyle}>
      {/* Welcome Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ marginBottom: isMobile ? '20px' : '32px' }}
      >
        <h1 style={{
          margin: 0,
          fontSize: isMobile ? '22px' : '28px',
          fontWeight: 700,
          color: '#F1F5F9',
          fontFamily: 'Poppins, sans-serif'
        }}>
          Admin Dashboard ⚙️
        </h1>
        <p style={{
          margin: isMobile ? '4px 0 0' : '8px 0 0',
          fontSize: isMobile ? '14px' : '16px',
          color: COLORS.gray[500]
        }}>
          Smart Homes, Safer Communities
        </p>
      </motion.div>

      {/* Stats Grid */}
      <div style={gridStyle}>
        <StatCard
          icon={Building}
          title="Properties"
          value={apartments.length}
          color={COLORS.primary}
          subtitle="Active buildings"
        />
        <StatCard
          icon={Users}
          title="Tenants"
          value={users.tenants}
          color={COLORS.secondary}
          subtitle="Registered residents"
        />
        <StatCard
          icon={Shield}
          title="Security Guards"
          value={users.guards}
          color={COLORS.accent}
          subtitle="Active guards"
        />
        <StatCard
          icon={Activity}
          title="Total Users"
          value={users.total}
          color={COLORS.primary}
          subtitle="All roles"
        />

      </div>

      {/* Quick Actions */}
      <div style={{
        display: 'flex',
        gap: isMobile ? '8px' : '16px',
        marginBottom: isMobile ? '16px' : '24px',
        flexWrap: 'wrap'
      }}>
        <Link to="/admin/apartments/new" style={{ textDecoration: 'none' }}>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: isMobile ? '10px 16px' : '14px 24px',
              background: COLORS.primary,
              border: 'none',
              borderRadius: isMobile ? '10px' : '12px',
              color: COLORS.white,
              fontSize: isMobile ? '13px' : '14px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <Plus size={isMobile ? 16 : 18} />
            {isMobile ? 'Add' : 'Add Property'}
          </motion.button>
        </Link>

        <Link to="/admin/users" style={{ textDecoration: 'none' }}>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: isMobile ? '10px 16px' : '14px 24px',
              background: '#1E293B',
              border: `2px solid #334155`,
              borderRadius: isMobile ? '10px' : '12px',
              color: '#F1F5F9',
              fontSize: isMobile ? '13px' : '14px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <Users size={isMobile ? 16 : 18} />
            {isMobile ? 'Users' : 'Manage Users'}
          </motion.button>
        </Link>

        <Link to="/admin/settings" style={{ textDecoration: 'none' }}>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: isMobile ? '10px 16px' : '14px 24px',
              background: '#1E293B',
              border: `2px solid #334155`,
              borderRadius: isMobile ? '10px' : '12px',
              color: '#F1F5F9',
              fontSize: isMobile ? '13px' : '14px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <Settings size={isMobile ? 16 : 18} />
            Settings
          </motion.button>
        </Link>
      </div>

      {/* Properties List */}
      <div style={cardStyle}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '16px'
        }}>
          <h2 style={{
            margin: 0,
            fontSize: '18px',
            fontWeight: 600,
            color: '#F8FAFC'
          }}>
            Properties
          </h2>
          <Link to="/admin/apartments" style={{
            fontSize: '13px',
            color: COLORS.primary,
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            View all <ArrowRight size={14} />
          </Link>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '20px', color: COLORS.gray[500] }}>
            Loading...
          </div>
        ) : apartments.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '32px',
            color: COLORS.gray[500]
          }}>
            <Building size={40} style={{ opacity: 0.3, marginBottom: '12px' }} />
            <p style={{ margin: 0 }}>No properties yet</p>
            <Link to="/admin/apartments/new" style={{
              color: COLORS.primary,
              textDecoration: 'none',
              fontSize: '14px'
            }}>
              Add your first property
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {apartments.slice(0, 5).map((apt) => (
              <div
                key={apt._id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '16px',
                  background: COLORS.gray[50],
                  borderRadius: '12px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '10px',
                    background: COLORS.primary,
                    color: COLORS.white,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Building size={22} />
                  </div>
                  <div>
                    <p style={{
                      margin: 0,
                      fontSize: '15px',
                      fontWeight: 600,
                      color: '#F8FAFC'
                    }}>
                      {apt.buildingName}
                    </p>
                    <p style={{
                      margin: '4px 0 0',
                      fontSize: '13px',
                      color: '#94A3B8'
                    }}>
                      {apt.location?.city || apt.location?.address || 'Unknown'} • {apt.totalUnits ?? apt.units?.length ?? 0} units
                    </p>
                  </div>
                </div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <span style={{
                    padding: '4px 10px',
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontWeight: 600,
                    background: apt.isActive ? `${COLORS.secondary}15` : `${COLORS.gray[300]}15`,
                    color: apt.isActive ? COLORS.secondary : COLORS.gray[500]
                  }}>
                    {apt.isActive ? 'Active' : 'Inactive'}
                  </span>
                  <Link to={`/admin/apartments/${apt._id}`}>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      style={{
                        padding: '6px 10px',
                        background: 'none',
                        border: `1px solid ${COLORS.gray[200]}`,
                        borderRadius: '6px',
                        cursor: 'pointer'
                      }}
                    >
                      <ArrowRight size={16} color={COLORS.gray[500]} />
                    </motion.button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Real-time Activity Feed */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        style={{
          ...cardStyle,
          marginTop: isMobile ? '16px' : '24px',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: '#fff'
        }}
      >
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: isMobile ? '12px' : '16px'
        }}>
          <h2 style={{
            margin: 0,
            fontSize: isMobile ? '16px' : '18px',
            fontWeight: 600
          }}>
            🔴 Live Activity
          </h2>
          <span style={{
            padding: isMobile ? '3px 8px' : '4px 12px',
            background: 'rgba(255,255,255,0.2)',
            borderRadius: '20px',
            fontSize: isMobile ? '10px' : '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <span style={{
              width: '8px',
              height: '8px',
              background: '#4ade80',
              borderRadius: '50%',
              animation: 'pulse 1.5s infinite'
            }} />
            Real-time
          </span>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: isMobile ? '8px' : '12px',
          marginBottom: isMobile ? '12px' : '16px'
        }}>
          <div style={{
            background: 'rgba(255,255,255,0.15)',
            padding: isMobile ? '10px' : '12px',
            borderRadius: '10px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: isMobile ? '20px' : '24px', fontWeight: 700 }}>{todayStats.visitors}</div>
            <div style={{ fontSize: isMobile ? '10px' : '12px', opacity: 0.8 }}>Today's Visitors</div>
          </div> 
          <div style={{
            background: 'rgba(255,255,255,0.15)',
            padding: isMobile ? '10px' : '12px',
            borderRadius: '10px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: isMobile ? '20px' : '24px', fontWeight: 700 }}>{todayStats.deliveries}</div>
            <div style={{ fontSize: isMobile ? '10px' : '12px', opacity: 0.8 }}>Today's Deliveries</div>
          </div>
        </div>

        {recentActivity.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '20px',
            opacity: 0.7
          }}>
            <Activity size={24} style={{ marginBottom: '8px', opacity: 0.5 }} />
            <p style={{ margin: 0, fontSize: '13px' }}>Waiting for activity...</p>
          </div>
        ) : (
          <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
            {recentActivity.map((activity) => (
              <div
                key={activity.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px',
                  background: 'rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  marginBottom: '8px'
                }}
              >
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: 'rgba(255,255,255,0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {activity.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>{activity.message}</p>
                  <p style={{ margin: '2px 0 0', fontSize: '11px', fontWeight: 500, opacity: 0.8 }}>{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default AdminDashboard;
