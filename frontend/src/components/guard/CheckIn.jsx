import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { visitorsAPI } from '../../services/api';
import socketService from '../../services/socket';
import { COLORS } from '../../config';
import { UserCheck, Search, ArrowLeft, Check, X, QrCode } from 'lucide-react';

const GuardCheckIn = () => {
  const { apartment } = useAuth();
  const [visitors, setVisitors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  // eslint-disable-next-line no-unused-vars
  const [selectedVisitor, setSelectedVisitor] = useState(null);

  // Fetch today's visitors
  const fetchVisitors = useCallback(async () => {
    if (!apartment?._id) return;
    try {
      const response = await visitorsAPI.getToday(apartment._id);
      setVisitors(response.data.visitors || []);
    } catch (error) {
      console.error('Error fetching visitors:', error);
    } finally {
      setLoading(false);
    }
  }, [apartment?._id]);

  useEffect(() => {
    fetchVisitors();
  }, [fetchVisitors]);

  // Real-time updates
  useEffect(() => {
    // Join the apartment guards room to receive visitor notifications
    if (apartment?._id) {
      socketService.joinApartment(apartment._id);
    }

    const handleVisitorNew = (data) => {
      // Add new visitor to the list
      setVisitors(prev => [data.visitor, ...prev]);
    };

    const handleVisitorCheckedIn = (data) => {
      setVisitors(prev => prev.filter(v => v._id !== data.visitor._id));
    };

    // Listen for visitor:new (emitted to guards)
    socketService.onVisitorNew(handleVisitorNew);
    socketService.onVisitorCheckedIn(handleVisitorCheckedIn);
    socketService.joinGuards();

    return () => {
      socketService.removeListener('visitor:new', handleVisitorNew);
      socketService.removeListener('visitor:checked_in', handleVisitorCheckedIn);
    };
  }, [apartment?._id]);

  // Check in visitor
  const handleCheckIn = async (visitorId) => {
    try {
      await visitorsAPI.checkIn(visitorId);
      setVisitors(prev => prev.filter(v => v._id !== visitorId));
      setSelectedVisitor(null);
    } catch (error) {
      console.error('Error checking in visitor:', error);
    }
  };

  // Quick approve and check-in
  const handleQuickCheckIn = async (visitor) => {
    try {
      if (visitor.status === 'pending') {
        await visitorsAPI.approve(visitor._id);
      }
      await visitorsAPI.checkIn(visitor._id);
      setVisitors(prev => prev.filter(v => v._id !== visitor._id));
    } catch (error) {
      console.error('Error with quick check-in:', error);
    }
  };

  const filteredVisitors = visitors.filter(v => 
    v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.phone.includes(searchQuery)
  );

  const pendingVisitors = filteredVisitors.filter(v => v.status === 'pending');
  const approvedVisitors = filteredVisitors.filter(v => v.status === 'approved');
  const checkedInVisitors = filteredVisitors.filter(v => v.status === 'checked-in');

  return (
    <>
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <Link to="/guard" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: COLORS.gray[600], textDecoration: 'none', marginBottom: '16px' }}>
          <ArrowLeft size={18} /> Back to Dashboard
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 700, color: COLORS.dark }}>Visitor Check-In</h1>
            <p style={{ margin: '8px 0 0', color: COLORS.gray[500] }}>
              {apartment?.buildingName || 'Apartment'} - {pendingVisitors.length} pending approvals
            </p>
          </div>
          <Link to="/guard/qr" style={{ textDecoration: 'none' }}>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '12px 20px', background: COLORS.primary,
                border: 'none', borderRadius: '10px', color: COLORS.white,
                fontSize: '14px', fontWeight: 600, cursor: 'pointer'
              }}
            >
              <QrCode size={18} /> Scan QR Code
            </motion.button>
          </Link>
        </div>
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: '24px' }}>
        <Search size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: COLORS.gray[500], zIndex: 1 }} />
        <input
          id="checkin-search"
          name="checkin-search"
          type="text"
          autoComplete="off"
          placeholder="Search by name or phone..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            width: '100%',
            padding: '14px 16px 14px 48px',
            border: '2px solid #E2E8F0',
            borderRadius: '12px',
            background: '#FFFFFF',
            fontSize: '15px',
            fontWeight: '500',
            color: '#1E293B',
            boxSizing: 'border-box',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            outline: 'none',
            transition: 'border-color 0.2s, box-shadow 0.2s'
          }}
        />
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div style={{ background: '#EF444420', borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#EF4444' }}>{pendingVisitors.length}</div>
          <div style={{ fontSize: '13px', color: '#94A3B8' }}>Pending Approval</div>
        </div>
        <div style={{ background: '#3B82F620', borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#3B82F6' }}>{approvedVisitors.length}</div>
          <div style={{ fontSize: '13px', color: '#94A3B8' }}>Approved (Not Checked In)</div>
        </div>
        <div style={{ background: COLORS.primary + '15', borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
          <div style={{ fontSize: '28px', fontWeight: 700, color: COLORS.primary }}>{checkedInVisitors.length}</div>
          <div style={{ fontSize: '13px', color: COLORS.gray[600] }}>Currently Inside</div>
        </div>
      </div>

      {/* Visitor List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: COLORS.gray[500] }}>Loading...</div>
      ) : filteredVisitors.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', color: COLORS.gray[500] }}>
          <UserCheck size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
          <p>No visitors found</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
          {filteredVisitors.map((visitor) => (
            <motion.div
              key={visitor._id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                background: COLORS.white,
                borderRadius: '12px',
                padding: '16px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                borderLeft: `4px solid ${
                  visitor.status === 'pending' ? COLORS.accent :
                  visitor.status === 'approved' ? COLORS.secondary :
                  visitor.status === 'checked-in' ? COLORS.primary : COLORS.gray[300]
                }`
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '12px' }}>
                <div style={{
                  width: '40px', height: '40px', borderRadius: '10px',
                  background: COLORS.primary + '15', color: COLORS.primary,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '16px', fontWeight: 600
                }}>
                  {visitor.name?.charAt(0)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '16px', fontWeight: 600, color: COLORS.dark }}>{visitor.name}</div>
                  <div style={{ fontSize: '13px', color: COLORS.gray[500] }}>{visitor.phone}</div>
                </div>
                 <span style={{
                   padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 600,
                   background: visitor.status === 'pending' ? COLORS.accent + '15' :
                              visitor.status === 'approved' ? COLORS.secondary + '15' :
                              visitor.status === 'checked-in' ? COLORS.primary + '15' : COLORS.gray[100],
                   color: visitor.status === 'pending' ? COLORS.accent :
                          visitor.status === 'approved' ? COLORS.secondary :
                          visitor.status === 'checked-in' ? COLORS.primary : COLORS.gray[600],
                   textTransform: 'capitalize'
                 }}>
                  {visitor.status}
                </span>
              </div>

              <div style={{ fontSize: '13px', color: COLORS.gray[500], marginBottom: '12px' }}>
                <div><strong>Purpose:</strong> {visitor.purpose}</div>
                <div><strong>Room:</strong> {apartment?.buildingName || 'Apartment'}: {visitor.roomNumber}</div>
                {visitor.vehiclePlate && <div><strong>Vehicle:</strong> {visitor.vehiclePlate}</div>}
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                {visitor.status === 'pending' && (
                  <>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleQuickCheckIn(visitor)}
                      style={{
                        flex: 1, padding: '10px', background: COLORS.secondary, border: 'none',
                        borderRadius: '8px', color: COLORS.white, fontSize: '13px',
                        fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', gap: '6px'
                      }}
                    >
                      <Check size={16} /> Approve & Check In
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      style={{
                        padding: '10px', background: COLORS.gray[100], border: 'none',
                        borderRadius: '8px', color: COLORS.gray[600], fontSize: '13px',
                        fontWeight: 600, cursor: 'pointer'
                      }}
                    >
                      <X size={16} />
                    </motion.button>
                  </>
                )}
                {visitor.status === 'approved' && (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleCheckIn(visitor._id)}
                    style={{
                      flex: 1, padding: '10px', background: COLORS.primary, border: 'none',
                      borderRadius: '8px', color: COLORS.white, fontSize: '13px',
                      fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center',
                      justifyContent: 'center', gap: '6px'
                    }}
                  >
                    <UserCheck size={16} /> Check In
                  </motion.button>
                )}
                {visitor.status === 'checked-in' && (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={async () => {
                      try {
                        await visitorsAPI.checkOut(visitor._id);
                        setVisitors(prev => prev.filter(v => v._id !== visitor._id));
                      } catch (error) {
                        console.error('Error checking out:', error);
                      }
                    }}
                    style={{
                      flex: 1, padding: '10px', background: COLORS.gray[600], border: 'none',
                      borderRadius: '8px', color: COLORS.white, fontSize: '13px',
                      fontWeight: 600, cursor: 'pointer'
                    }}
                  >
                    Check Out
                  </motion.button>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>

    </>
  );
};

export default GuardCheckIn;
