import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { visitorsAPI, deliveriesAPI, logsAPI } from '../../services/api';
import socketService from '../../services/socket';
import { COLORS } from '../../config';
import { 
  Users, 
  Package, 
  Activity, 
  QrCode, 
  UserCheck, 
  Clock, 
  ArrowRight, 
  UserPlus
} from 'lucide-react';

const GuardDashboard = () => {
  const { apartment } = useAuth();
  const [todayStats, setTodayStats] = useState({
    visitors: 0,
    deliveries: 0,
    entries: 0,
    exits: 0,
  });
  const [recentLogs, setRecentLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Window size for responsive design
  const [windowSize, setWindowSize] = useState({ width: typeof window !== 'undefined' ? window.innerWidth : 1200, height: typeof window !== 'undefined' ? window.innerHeight : 800 });
  useEffect(() => {
    const handleResize = () => setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  const isMobile = windowSize.width < 768;
  const isTablet = windowSize.width >= 768 && windowSize.width < 1024;

  // Fetch data function
  const fetchData = useCallback(async () => {
    if (!apartment?._id) return;
    
    try {
      const [visitorsRes, deliveriesRes, logsRes] = await Promise.all([
        visitorsAPI.getToday(apartment?._id),
        deliveriesAPI.getToday(apartment?._id), // Fetch today's deliveries
        logsAPI.getRealtime({ apartmentId: apartment?._id, limit: 10 }) // Fetch recent logs
      ]);

      setTodayStats({
        visitors: visitorsRes.data.stats?.total || 0,
        deliveries: deliveriesRes.data.stats?.total || 0,
        entries: visitorsRes.data.stats?.checkedIn || 0,
        exits: visitorsRes.data.stats?.checkedOut || 0
      });

      setRecentLogs(logsRes.data.logs || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, [apartment?._id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Real-time updates
  useEffect(() => {
    // Listen for new access logs
    const handleAccessNew = (data) => {
      setRecentLogs(prev => [data.log, ...prev].slice(0, 10));
      
      // Update stats based on the action
      if (data.log.action === 'entry') {
        setTodayStats(prev => ({ ...prev, entries: prev.entries + 1, visitors: prev.visitors + 1 }));
      } else if (data.log.action === 'exit') {
        setTodayStats(prev => ({ ...prev, exits: prev.exits + 1 }));
      }
    };

    // Listen for visitor checked in
    const handleVisitorCheckedIn = (data) => {
      setRecentLogs(prev => [data.accessLog, ...prev].slice(0, 10));
      setTodayStats(prev => ({ ...prev, entries: prev.entries + 1 }));
    };

    // Listen for visitor checked out
    const handleVisitorCheckedOut = (data) => {
      setRecentLogs(prev => [data.accessLog, ...prev].slice(0, 10));
      setTodayStats(prev => ({ ...prev, exits: prev.exits + 1 }));
    };

    // Listen for new deliveries
    const handleDeliveryArrived = (data) => {
      setTodayStats(prev => ({ ...prev, deliveries: prev.deliveries + 1 }));
    };

    // Listen for delivery ready for pickup
    const handleDeliveryReady = (data) => {
      // Delivery ready notification
    };

    // Listen for access denied
    const handleAccessDenied = (data) => {
      setRecentLogs(prev => [data.accessLog, ...prev].slice(0, 10));
    };

    // Subscribe to events
    socketService.onAccessNew(handleAccessNew);
    socketService.onVisitorCheckedIn(handleVisitorCheckedIn);
    socketService.onVisitorCheckedOut(handleVisitorCheckedOut);
    socketService.onDeliveryArrived(handleDeliveryArrived);
    socketService.onDeliveryReady(handleDeliveryReady);
    socketService.onAccessDenied(handleAccessDenied);

    // Cleanup
    return () => {
      socketService.removeListener('access:new', handleAccessNew);
      socketService.removeListener('visitor:checked_in', handleVisitorCheckedIn);
      socketService.removeListener('visitor:checked_out', handleVisitorCheckedOut);
      socketService.removeListener('delivery:arrived', handleDeliveryArrived);
      socketService.removeListener('delivery:ready_for_pickup', handleDeliveryReady);
      socketService.removeListener('access:denied', handleAccessDenied);
    };
  }, [fetchData, apartment?._id]);

  const containerStyle = {
    padding: isMobile ? '12px' : isTablet ? '16px' : '24px',
    maxWidth: '1200px',
    margin: '0 auto'
  };

  const cardStyle = {
    background: COLORS.white,
    borderRadius: isMobile ? '12px' : '16px',
    padding: isMobile ? '16px' : '24px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
  };

  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: isMobile ? '10px' : isTablet ? '14px' : '20px',
    marginBottom: isMobile ? '16px' : '24px'
  };

  const StatCard = ({ icon: Icon, title, value, color, link }) => (
    <motion.div
      whileHover={{ y: -4, boxShadow: '0 8px 24px rgba(0,0,0,0.1)' }}
      transition={{ duration: 0.2 }}
    >
      <Link to={link} style={{ textDecoration: 'none' }}>
        <div style={{
          ...cardStyle,
          display: 'flex',
          alignItems: 'center',
          gap: isMobile ? '12px' : '16px'
        }}>
          <div style={{
            width: isMobile ? '44px' : '56px',
            height: isMobile ? '44px' : '56px',
            borderRadius: isMobile ? '10px' : '14px',
            background: `${color}15`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Icon size={isMobile ? 22 : 28} color={color} />
          </div>
          <div>
            <p style={{
              margin: 0,
              fontSize: isMobile ? '11px' : '13px',
              color: COLORS.gray[500],
              marginBottom: '4px'
            }}>
              {title}
            </p>
            <h3 style={{
              margin: 0,
              fontSize: isMobile ? '24px' : '28px',
              fontWeight: 700,
              color: '#22C55E'
            }}>
              {value}
            </h3>
          </div>
        </div>
      </Link>
    </motion.div>
  );

  const SectionTitle = ({ children }) => (
    <h2 style={{
      margin: '0 0 16px',
      fontSize: '18px',
      fontWeight: 600,
      color: COLORS.dark
    }}>
      {children}
    </h2>
  );

  const getActionColor = (action) => {
    switch (action) {
      case 'entry': return COLORS.secondary;
      case 'exit': return COLORS.primary;
      case 'denied': return COLORS.accent;
      default: return COLORS.gray[500];
    }
  };

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
          Security Dashboard 🛡️
        </h1>
        <p style={{
          margin: isMobile ? '4px 0 0' : '8px 0 0',
          fontSize: isMobile ? '14px' : '16px',
          color: COLORS.gray[500]
        }}>
          {apartment?.buildingName || 'Apartment'} - Gate Control Center
        </p>
      </motion.div>

      {/* Stats Grid */}
      <div style={gridStyle}>
        <StatCard
          icon={Users}
          title="Visitors Today"
          value={todayStats.visitors}
          color={COLORS.primary}
          link="/guard/checkin"
        />
        <StatCard
          icon={Package}
          title="Deliveries Today"
          value={todayStats.deliveries}
          color={COLORS.secondary}
          link="/guard/deliveries"
        />
        <StatCard
          icon={UserCheck}
          title="Entries"
          value={todayStats.entries}
          color={COLORS.secondary}
          link="/guard/logs"
        />
        <StatCard
          icon={Activity}
          title="Total Activity"
          value={todayStats.visitors + todayStats.deliveries}
          color={COLORS.accent}
          link="/guard/logs"
        />
      </div>

      {/* Quick Actions */}
      <div style={{
        display: 'flex',
        gap: isMobile ? '8px' : '16px',
        marginBottom: isMobile ? '16px' : '24px',
        flexWrap: 'wrap'
      }}>
        <Link to="/guard/checkin" style={{ textDecoration: 'none' }}>
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
            <UserCheck size={isMobile ? 16 : 18} />
            Quick Check-In
          </motion.button>
        </Link>

        <Link to="/guard/qr" style={{ textDecoration: 'none' }}>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: isMobile ? '10px 16px' : '14px 24px',
              background: COLORS.secondary,
              border: 'none',
              borderRadius: isMobile ? '10px' : '12px',
              color: COLORS.white,
              fontSize: isMobile ? '13px' : '14px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <QrCode size={isMobile ? 16 : 18} />
            Scan QR Code
          </motion.button>
        </Link>

        <Link to="/guard/logs" style={{ textDecoration: 'none' }}>
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
            <Clock size={isMobile ? 16 : 18} />
            Access Logs
          </motion.button>
        </Link>

        <Link to="/guard/register" style={{ textDecoration: 'none' }}>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: isMobile ? '10px 16px' : '14px 24px',
              background: COLORS.accent,
              border: 'none',
              borderRadius: isMobile ? '10px' : '12px',
              color: COLORS.white,
              fontSize: isMobile ? '13px' : '14px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <UserPlus size={isMobile ? 16 : 18} />
            Register Entry
          </motion.button>
        </Link>
      </div>

      {/* Recent Activity */}
      <div style={{ ...cardStyle, overflowX: 'hidden' }}>
        <SectionTitle>Real-Time Activity</SectionTitle>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '20px', color: COLORS.gray[500] }}>
            Loading...
          </div>
        ) : recentLogs.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: isMobile ? '20px' : '32px',
            color: COLORS.gray[500]
          }}>
            <Activity size={isMobile ? 32 : 40} style={{ opacity: 0.3, marginBottom: '12px' }} />
            <p style={{ margin: 0 }}>No recent activity</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              minWidth: isMobile ? '500px' : 'auto'
            }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${COLORS.gray[100]}` }}>
                  <th style={{
                    textAlign: 'left',
                    padding: '12px',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: COLORS.gray[600]
                  }}>Time</th>
                  <th style={{
                    textAlign: 'left',
                    padding: '12px',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: COLORS.gray[600]
                  }}>Name</th>
                  <th style={{
                    textAlign: 'left',
                    padding: '12px',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: COLORS.gray[600]
                  }}>Type</th>
                  <th style={{
                    textAlign: 'left',
                    padding: '12px',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: COLORS.gray[600]
                  }}>Unit</th>
                  <th style={{
                    textAlign: 'left',
                    padding: '12px',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: COLORS.gray[600]
                  }}>Status</th>
                  <th style={{
                    textAlign: 'left',
                    padding: '12px',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: COLORS.gray[600]
                  }}>Method</th>
                </tr>
              </thead>
              <tbody>
                {recentLogs.map((log) => (
                  <tr key={log._id} style={{ borderBottom: `1px solid ${COLORS.gray[100]}` }}>
                    <td style={{ padding: '12px', fontSize: '13px', color: COLORS.gray[600] }}>
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </td>
                    <td style={{ padding: '12px', fontSize: '14px', fontWeight: 500, color: '#F1F5F9' }}>
                      {log.personName}
                    </td>
                    <td style={{ padding: '12px', fontSize: '13px', color: COLORS.gray[600], textTransform: 'capitalize' }}>
                      {log.personType}
                    </td>
                    <td style={{ padding: '12px', fontSize: '13px', color: COLORS.gray[600] }}>
                      {log.roomNumber || '-'}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <span style={{
                        padding: '4px 10px',
                        borderRadius: '20px',
                        fontSize: '12px',
                        fontWeight: 600,
                        background: `${getActionColor(log.action)}15`,
                        color: getActionColor(log.action),
                        textTransform: 'capitalize'
                      }}>
                        {log.action}
                      </span>
                    </td>
                    <td style={{ padding: '12px', fontSize: '13px', color: COLORS.gray[600], textTransform: 'capitalize' }}>
                      {log.method}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {recentLogs.length > 0 && (
          <div style={{ marginTop: isMobile ? '12px' : '16px', textAlign: 'center' }}>
            <Link to="/guard/logs" style={{
              fontSize: isMobile ? '13px' : '14px',
              color: COLORS.primary,
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              View all logs <ArrowRight size={14} />
            </Link>
          </div>
        )}
      </div>

      <style>{`
        @media (max-width: 768px) {
          .guard-dashboard .stat-card {
            padding: 16px !important;
          }
          .guard-dashboard .stat-card h3 {
            font-size: 24px !important;
          }
          .guard-dashboard .quick-actions {
            flex-direction: column;
          }
          .guard-dashboard .quick-actions button {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
};

export default GuardDashboard;
