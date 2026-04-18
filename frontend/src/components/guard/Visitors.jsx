import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { visitorsAPI } from '../../services/api';
import socketService from '../../services/socket';

import { Users, Check, Clock, RefreshCw, Plus } from 'lucide-react';

const useWindowSize = () => {
  const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  useEffect(() => {
    const handleResize = () => setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  return windowSize;
};

const GuardVisitors = () => {
  useAuth();
  const [visitors, setVisitors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('approved'); // approved, pending, checked-in
  const { width } = useWindowSize();
  const isMobile = width < 768;

  // Fetch pre-approved visitors
  const fetchVisitors = useCallback(async () => {
    try {
      setRefreshing(true);
      const status = filter === 'all' ? undefined : filter;
      const response = await visitorsAPI.getAll({ status, limit: 50 });
      // Filter for pre-approved visitors (approved or pending)
      const preApproved = (response.data.visitors || []).filter(v => 
        v.status === 'approved' || v.status === 'pending'
      );
      setVisitors(preApproved);
    } catch (error) {
      console.error('Error fetching visitors:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchVisitors();
  }, [fetchVisitors]);

  // Real-time updates
  useEffect(() => {
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const handleVisitorCreated = (data) => {
      if (data.visitor?.status === 'approved' || data.visitor?.status === 'pending') {
        fetchVisitors();
      }
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
    const handleVisitorArrived = (data) => {
      fetchVisitors();
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
    const handleVisitorCheckedIn = (data) => {
      fetchVisitors();
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
    const handleVisitorApproved = (data) => {
      fetchVisitors();
    };

    socketService.onVisitorCreated(handleVisitorCreated);
    socketService.onVisitorArrived(handleVisitorArrived);
    socketService.onVisitorCheckedIn(handleVisitorCheckedIn);
    socketService.onVisitorApproved(handleVisitorApproved);
    socketService.joinGuards();

    return () => {
      socketService.removeListener('visitor:created', handleVisitorCreated);
      socketService.removeListener('visitor:arrived', handleVisitorArrived);
      socketService.removeListener('visitor:checked_in', handleVisitorCheckedIn);
      socketService.removeListener('visitor:approved', handleVisitorApproved);
    };
  }, [fetchVisitors]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return '#22C55E';
      case 'pending': return '#F59E0B';
      case 'checked-in': return '#3B82F6';
      case 'denied': return '#EF4444';
      default: return '#64748B';
    }
  };

  const containerStyle = {
    padding: isMobile ? '16px' : '24px',
    maxWidth: '1000px',
    margin: '0 auto'
  };

  const cardStyle = {
    background: '#1E293B',
    borderRadius: isMobile ? '12px' : '16px',
    padding: isMobile ? '16px' : '24px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    marginBottom: '20px'
  };

  const approvedCount = visitors.filter(v => v.status === 'approved').length;
  const pendingCount = visitors.filter(v => v.status === 'pending').length;
  const checkedInCount = visitors.filter(v => v.status === 'checked-in').length;

  return (
    <div style={containerStyle}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ marginBottom: '24px' }}
      >
        <div style={{ display: 'flex', alignItems: isMobile ? 'flex-start' : 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', flexDirection: isMobile ? 'column' : 'row' }}>
          <div>
            <h1 style={{
              margin: 0,
              fontSize: isMobile ? '22px' : '28px',
              fontWeight: 700,
              color: '#F1F5F9',
              fontFamily: 'Poppins, sans-serif',
              display: 'flex',
              alignItems: 'center',
              gap: isMobile ? '8px' : '12px',
              flexWrap: 'wrap'
            }}>
              <Users size={isMobile ? 24 : 32} color="#3B82F6" />
              Pre-approved Visitors
            </h1>
            <p style={{
              margin: '8px 0 0',
              fontSize: isMobile ? '14px' : '16px',
              fontWeight: 600,
              color: '#94A3B8'
            }}>
              Manage pre-registered visitors and their access
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', width: isMobile ? '100%' : 'auto' }}>
            <button
              onClick={fetchVisitors}
              disabled={refreshing}
              style={{
                padding: '10px 16px',
                borderRadius: '10px',
                border: '1px solid #334155',
                background: '#1E293B',
                fontSize: '14px',
                fontWeight: 600,
                color: '#F1F5F9',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <RefreshCw size={18} className={refreshing ? 'spinning' : ''} />
              Refresh
            </button>
            <Link to="/guard/register" style={{ textDecoration: 'none' }}>
              <button
                style={{
                  padding: '10px 16px',
                  borderRadius: '10px',
                  border: 'none',
                  background: '#3B82F6',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#fff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <Plus size={18} />
                Register Visitor
              </button>
            </Link>
          </div>
        </div>
      </motion.div>

      {/* Stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: isMobile ? '12px' : '16px',
        marginBottom: '24px'
      }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          style={{ ...cardStyle, background: 'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)', color: '#fff' }}
        >
          <p style={{ margin: 0, fontSize: '14px', fontWeight: 700, opacity: 0.9 }}>Approved</p>
          <h3 style={{ margin: '8px 0 0', fontSize: '32px', fontWeight: 800 }}>{approvedCount}</h3>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          style={{ ...cardStyle }}
        >
          <p style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#94A3B8' }}>Pending</p>
          <h3 style={{ margin: '8px 0 0', fontSize: '32px', fontWeight: 800, color: '#F59E0B' }}>{pendingCount}</h3>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          style={{ ...cardStyle }}
        >
          <p style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#94A3B8' }}>Checked In</p>
          <h3 style={{ margin: '8px 0 0', fontSize: '32px', fontWeight: 800, color: '#3B82F6' }}>{checkedInCount}</h3>
        </motion.div>
      </div>

      {/* Filter Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        style={cardStyle}
      >
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px', overflowX: 'auto', paddingBottom: '8px' }}>
          {['approved', 'pending', 'checked-in'].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              style={{
                padding: '8px 16px',
                borderRadius: '20px',
                border: 'none',
                background: filter === status ? getStatusColor(status) : '#334155',
                color: '#fff',
                fontWeight: 600,
                cursor: 'pointer',
                textTransform: 'capitalize'
              }}
            >
              {status === 'checked-in' ? 'Checked In' : status}
            </button>
          ))}
        </div>

        {/* Visitors List */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#64748B' }}>
            Loading...
          </div>
        ) : visitors.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#64748B' }}>
            <Users size={48} style={{ opacity: 0.5, marginBottom: '12px' }} />
            <p style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>No pre-approved visitors found</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {visitors.filter(v => filter === 'all' || v.status === filter).map((visitor) => (
              <div
                key={visitor._id}
                style={{
                  display: 'flex',
                  flexDirection: isMobile ? 'column' : 'row',
                  alignItems: isMobile ? 'flex-start' : 'center',
                  gap: isMobile ? '12px' : '16px',
                  padding: isMobile ? '12px' : '16px',
                  background: '#0F172A',
                  borderRadius: '12px',
                  border: `2px solid ${getStatusColor(visitor.status)}30`,
                  minWidth: 0,
                  overflow: 'hidden'
                }}
              >
                <div style={{
                  width: isMobile ? '40px' : '48px',
                  height: isMobile ? '40px' : '48px',
                  borderRadius: '50%',
                  background: getStatusColor(visitor.status),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontWeight: 800,
                  fontSize: isMobile ? '16px' : '18px',
                  flexShrink: 0
                }}>
                  {visitor.name?.charAt(0)}
                </div>
                
                <div style={{ flex: 1, minWidth: 0, width: '100%' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <h3 style={{ margin: 0, fontSize: isMobile ? '14px' : '16px', fontWeight: 700, color: '#F1F5F9', wordBreak: 'break-word' }}>
                      {visitor.name}
                    </h3>
                    <span style={{
                      padding: '2px 10px',
                      borderRadius: '20px',
                      fontSize: '11px',
                      fontWeight: 700,
                      background: `${getStatusColor(visitor.status)}20`,
                      color: getStatusColor(visitor.status),
                      textTransform: 'capitalize',
                      flexShrink: 0
                    }}>
                      {visitor.status}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '4px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '12px', color: '#94A3B8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={12} /> {visitor.expectedArrival ? new Date(visitor.expectedArrival).toLocaleDateString() : 'Not scheduled'}
                    </span>
                    <span style={{ fontSize: '12px', color: '#94A3B8', wordBreak: 'break-word' }}>
                      📱 {visitor.phone}
                    </span>
                    <span style={{ fontSize: '12px', color: '#94A3B8', textTransform: 'capitalize' }}>
                      👤 {visitor.purpose}
                    </span>
                  </div>
                </div>

                {visitor.status === 'approved' && (
                  <Link to={`/guard/checkin?id=${visitor._id}`} style={{ width: isMobile ? '100%' : 'auto', flexShrink: 0 }}>
                    <button
                      style={{
                        width: '100%',
                        padding: '10px 16px',
                        borderRadius: '8px',
                        border: 'none',
                        background: '#22C55E',
                        color: '#fff',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        fontSize: isMobile ? '13px' : '14px'
                      }}
                    >
                      <Check size={16} />
                      Check In
                    </button>
                  </Link>
                )}
              </div>
            ))}
          </div>
        )}
      </motion.div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .spinning {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default GuardVisitors;
