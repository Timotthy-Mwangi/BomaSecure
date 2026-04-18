import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { visitorsAPI, deliveriesAPI, paymentsAPI } from '../../services/api';
import socketService from '../../services/socket';
import { COLORS } from '../../config';
import { 
  Users, 
  Package, 
  Clock, 
  CheckCircle, 
  Bell, 
  Plus, 
  ArrowRight,
  DollarSign
} from 'lucide-react';

const TenantDashboard = () => {
  const { user } = useAuth();
  const { notifications } = useNotifications();
  const [visitors, setVisitors] = useState([]);
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rentDashboard, setRentDashboard] = useState(null);
  
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
    try {
      const [visitorsRes, deliveriesRes, rentRes] = await Promise.all([
        visitorsAPI.getPending().catch(() => ({ data: { visitors: [] } })),
        deliveriesAPI.getPending().catch(() => ({ data: { deliveries: [] } })),
        paymentsAPI.getTenantRentDashboard().catch(() => ({ data: { dashboard: null } }))
      ]);
      setVisitors(visitorsRes.data.visitors || []);
      setDeliveries(deliveriesRes.data.deliveries || []);
      setRentDashboard(rentRes.data.dashboard);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    // Join tenant room for real-time updates
    if (user?._id) {
      socketService.joinTenant(user._id);
    }
  }, [fetchData, user]);

  // Real-time updates
  useEffect(() => {
    // Listen for new visitors
    const handleVisitorArrived = (data) => {
      setVisitors(prev => [data.visitor, ...prev]);
    };

    // Listen for new deliveries
    const handleDeliveryArrived = (data) => {
      setDeliveries(prev => [data.delivery, ...prev]);
    };

    // Listen for visitor checked in
    const handleVisitorCheckedIn = (data) => {
      setVisitors(prev => prev.filter(v => v._id !== data.visitor._id));
    };

    // Listen for delivery confirmed/ready
    const handleDeliveryReady = (data) => {
      setDeliveries(prev => prev.filter(d => d._id !== data.delivery._id));
    };

    // Listen for delivery returned
    const handleDeliveryReturned = (data) => {
      setDeliveries(prev => prev.filter(d => d._id !== data.delivery._id));
    };

    // Listen for apartment updates (real-time for tenants)
    const handleApartmentUpdated = () => {
      fetchData();
    };

    // Subscribe to events
    if (socketService.onVisitorArrived) socketService.onVisitorArrived(handleVisitorArrived);
    if (socketService.onDeliveryArrived) socketService.onDeliveryArrived(handleDeliveryArrived);
    if (socketService.onVisitorCheckedIn) socketService.onVisitorCheckedIn(handleVisitorCheckedIn);
    if (socketService.onDeliveryReady) socketService.onDeliveryReady(handleDeliveryReady);
    if (socketService.onDeliveryReturned) socketService.onDeliveryReturned(handleDeliveryReturned);
    if (socketService.onApartmentUpdated) socketService.onApartmentUpdated(handleApartmentUpdated);

    // Cleanup
    return () => {
      if (socketService.removeListener) {
        socketService.removeListener('visitor:arrived', handleVisitorArrived);
        socketService.removeListener('delivery:arrived', handleDeliveryArrived);
        socketService.removeListener('visitor:checked_in', handleVisitorCheckedIn);
        socketService.removeListener('delivery:ready_for_pickup', handleDeliveryReady);
        socketService.removeListener('delivery:returned', handleDeliveryReturned);
        socketService.removeListener('apartment:updated', handleApartmentUpdated);
      }
    };
  }, [fetchData]);

  const recentNotifications = notifications.slice(0, 3);

  const containerStyle = {
    padding: isMobile ? '12px' : isTablet ? '16px' : '24px',
    maxWidth: '1200px',
    margin: '0 auto'
  };

  // Check for mobile (for future responsive features)
  useEffect(() => {
    const checkMobile = () => {
      // Can be used for responsive adjustments
    };
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : isTablet ? 'repeat(2, 1fr)' : 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: isMobile ? '10px' : isTablet ? '14px' : '20px',
    marginBottom: isMobile ? '16px' : '24px'
  };

  const cardStyle = {
    background: COLORS.white,
    borderRadius: isMobile ? '12px' : '16px',
    padding: isMobile ? '16px' : '24px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
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
              color: '#64748B',
              marginBottom: '4px'
            }}>
              {title}
            </p>
            <h3 style={{
              margin: 0,
              fontSize: isMobile ? '22px' : '28px',
              fontWeight: 700,
              color: '#1E293B'
            }}>
              {value}
            </h3>
          </div>
        </div>
      </Link>
    </motion.div>
  );

  const SectionTitle = ({ children, action }) => (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: isMobile ? '12px' : '16px'
    }}>
      <h2 style={{
        margin: 0,
        fontSize: isMobile ? '16px' : '18px',
        fontWeight: 600,
        color: '#1E293B'
      }}>
        {children}
      </h2>
      {action}
    </div>
  );

  return (
    <div className="tenant-dashboard" style={containerStyle}>
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
          Welcome back, {user?.name?.split(' ')[0]}! 👋
        </h1>
        <p style={{
          margin: isMobile ? '4px 0 0' : '8px 0 0',
          fontSize: isMobile ? '14px' : '16px',
          color: '#64748B'
        }}>
          Here's what's happening at your home today
        </p>
      </motion.div>

      {/* Stats Grid */}
      <div style={gridStyle}>
        <StatCard
          icon={Users}
          title="Pending Visitors"
          value={visitors.length}
          color={COLORS.accent}
          link="/tenant/visitors"
        />
        <StatCard
          icon={Package}
          title="Pending Deliveries"
          value={deliveries.length}
          color={COLORS.secondary}
          link="/tenant/deliveries"
        />
        <StatCard
          icon={CheckCircle}
          title="Approved Today"
          value={visitors.filter(v => v.status === 'approved').length}
          color={COLORS.primary}
          link="/tenant/history"
        />
        {rentDashboard && (
          <StatCard
            icon={DollarSign}
            title="Rent Status"
            value={rentDashboard.rentStatus === 'paid' ? 'Paid' : rentDashboard.rentStatus === 'overdue' ? 'Overdue' : `KES ${rentDashboard.balance?.toLocaleString()}`}
            color={rentDashboard.rentStatus === 'paid' ? '#10B981' : rentDashboard.rentStatus === 'overdue' ? '#EF4444' : '#F59E0B'}
            link="/tenant/rent"
          />
        )}
      </div>

      {/* Main Content Grid */}
      <div className="tenant-dashboard-grid" style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(300px, 1fr))', gap: isMobile ? '12px' : '20px' }}>
        {/* Pending Requests */}
        <div style={{ ...cardStyle, padding: isMobile ? '16px' : '24px' }}>
          <SectionTitle>
            Action Required
            <Link to="/tenant/visitors" style={{
              fontSize: isMobile ? '12px' : '13px',
              color: COLORS.primary,
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              View all <ArrowRight size={isMobile ? 12 : 14} />
            </Link>
          </SectionTitle>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '20px', color: COLORS.gray[600] }}>
              Loading...
            </div>
          ) : visitors.length === 0 && deliveries.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: isMobile ? '20px' : '32px',
              color: COLORS.gray[600]
            }}>
              <CheckCircle size={isMobile ? 32 : 40} style={{ opacity: 0.3, marginBottom: '12px', color: COLORS.gray[400] }} />
              <p style={{ margin: 0, color: COLORS.gray[700] }}>No pending requests</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '8px' : '12px' }}>
              {/* Visitor Requests */}
              {visitors.slice(0, 3).map((visitor) => (
                <motion.div
                  key={visitor._id}
                  whileHover={{ x: 4 }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: isMobile ? '10px' : '12px',
                    background: COLORS.gray[50],
                    borderRadius: isMobile ? '10px' : '12px',
                    border: `1px solid ${COLORS.gray[100]}`
                  }}
                >
                  <div style={{
                    width: isMobile ? '36px' : '40px',
                    height: isMobile ? '36px' : '40px',
                    borderRadius: isMobile ? '8px' : '10px',
                    background: COLORS.accent,
                    color: COLORS.white,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 600,
                    fontSize: isMobile ? '14px' : '16px'
                  }}>
                    {visitor.name?.charAt(0)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{
                      margin: 0,
                      fontSize: isMobile ? '13px' : '14px',
                      fontWeight: 600,
                      color: '#1E293B'
                    }}>
                      {visitor.name}
                    </p>
                    <p style={{
                      margin: '2px 0 0',
                      fontSize: isMobile ? '11px' : '12px',
                      color: COLORS.gray[600],
                      textTransform: 'capitalize'
                    }}>
                      {visitor.purpose}
                    </p>
                  </div>
                  <div style={{
                    display: 'flex',
                    gap: '6px'
                  }}>
                    <Link to={`/tenant/visitors/${visitor._id}`}>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        style={{
                          padding: isMobile ? '5px 10px' : '6px 12px',
                          background: COLORS.secondary,
                          border: 'none',
                          borderRadius: '6px',
                          color: COLORS.white,
                          fontSize: isMobile ? '11px' : '12px',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        Review
                      </motion.button>
                    </Link>
                  </div>
                </motion.div>
              ))}

              {/* Delivery Requests */}
              {deliveries.slice(0, 3).map((delivery) => (
                <motion.div
                  key={delivery._id}
                  whileHover={{ x: 4 }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: isMobile ? '10px' : '12px',
                    background: COLORS.gray[50],
                    borderRadius: isMobile ? '10px' : '12px',
                    border: `1px solid ${COLORS.gray[100]}`
                  }}
                >
                  <div style={{
                    width: isMobile ? '36px' : '40px',
                    height: isMobile ? '36px' : '40px',
                    borderRadius: isMobile ? '8px' : '10px',
                    background: COLORS.secondary,
                    color: COLORS.white,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Package size={isMobile ? 16 : 20} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{
                      margin: 0,
                      fontSize: isMobile ? '13px' : '14px',
                      fontWeight: 600,
                      color: '#1E293B'
                    }}>
                      {delivery.courierCompany || 'Package'}
                    </p>
                    <p style={{
                      margin: '2px 0 0',
                      fontSize: isMobile ? '11px' : '12px',
                      color: COLORS.gray[600]
                    }}>
                      {delivery.parcelDescription?.substring(0, 30)}...
                    </p>
                  </div>
                  <Link to={`/tenant/deliveries/${delivery._id}`}>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      style={{
                        padding: '6px 12px',
                        background: COLORS.primary,
                        border: 'none',
                        borderRadius: '6px',
                        color: COLORS.white,
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      Confirm
                    </motion.button>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div style={cardStyle}>
          <SectionTitle>
            Recent Activity
          </SectionTitle>

          {recentNotifications.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '32px',
              color: COLORS.gray[600]
            }}>
              <Bell size={40} style={{ opacity: 0.3, marginBottom: '12px', color: COLORS.gray[400] }} />
              <p style={{ margin: 0, color: COLORS.gray[700] }}>No recent activity</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {recentNotifications.map((notification) => (
                <div
                  key={notification._id}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    padding: '12px',
                    borderBottom: `1px solid ${COLORS.gray[100]}`
                  }}
                >
                  <div style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: notification.isRead ? COLORS.gray[300] : COLORS.primary,
                    marginTop: '6px',
                    flexShrink: 0
                  }} />
                  <div>
                    <p style={{
                      margin: 0,
                      fontSize: '13px',
                      fontWeight: 500,
                      color: '#1E293B'
                    }}>
                      {notification.title}
                    </p>
                    <p style={{
                      margin: '4px 0 0',
                      fontSize: '12px',
                      color: COLORS.gray[600]
                    }}>
                      {notification.message}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div style={{
        marginTop: '24px',
        display: 'flex',
        gap: '16px',
        flexWrap: 'wrap'
      }}>
        <Link to="/tenant/visitors/new" style={{ textDecoration: 'none' }}>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '14px 24px',
              background: COLORS.primary,
              border: 'none',
              borderRadius: '12px',
              color: COLORS.white,
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <Plus size={18} />
            Pre-approve Visitor
          </motion.button>
        </Link>

        {rentDashboard && rentDashboard.rentStatus !== 'paid' && (
          <Link to="/tenant/rent" style={{ textDecoration: 'none' }}>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '14px 24px',
                background: rentDashboard.rentStatus === 'overdue' ? '#EF4444' : '#10B981',
                border: 'none',
                borderRadius: '12px',
                color: COLORS.white,
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <DollarSign size={18} />
              {rentDashboard.rentStatus === 'overdue' ? 'Pay Overdue Rent' : 'Pay Rent'}
            </motion.button>
          </Link>
        )}

        <Link to="/tenant/history" style={{ textDecoration: 'none' }}>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '14px 24px',
              background: '#1E293B',
              border: `2px solid #334155`,
              borderRadius: '12px',
              color: '#F1F5F9',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <Clock size={18} />
            View History
          </motion.button>
        </Link>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .tenant-dashboard .stat-card {
            padding: 16px !important;
          }
          .tenant-dashboard .stat-card h3 {
            font-size: 24px !important;
          }
          .tenant-dashboard .quick-actions {
            flex-direction: column;
          }
          .tenant-dashboard .quick-actions button {
            width: 100%;
            justify-content: center;
          }
          .tenant-dashboard-grid {
            grid-template-columns: 1fr !important;
          }
        }
        .tenant-dashboard-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
        }
        @media (max-width: 480px) {
          .tenant-dashboard-grid {
            gap: 16px !important;
          }
        }
      `}</style>
    </div>
  );
};

export default TenantDashboard;
