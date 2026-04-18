import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { visitorsAPI } from '../../services/api';
import socketService from '../../services/socket';
import { COLORS, VISITOR_PURPOSES } from '../../config';
import { Users, Check, X, ArrowLeft, Plus, QrCode, Trash2, Send } from 'lucide-react';
import QRCodeDisplay from '../common/QRCodeDisplay';

const useWindowSize = () => {
  const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  useEffect(() => {
    const handleResize = () => setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  return windowSize;
};

// eslint-disable-next-line no-unused-vars
const TenantVisitors = () => {
  // eslint-disable-next-line no-unused-vars
  const { user } = useAuth();
  const { id: visitorIdParam } = useParams();
  const [visitors, setVisitors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, pending, approved, denied, checked-in
  const [showQR, setShowQR] = useState(false);
  const [selectedQRVisitor, setSelectedQRVisitor] = useState(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkVisitors, setBulkVisitors] = useState([{ name: '', phone: '', purpose: 'guest' }]);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkSuccess, setBulkSuccess] = useState(null);
  const { width } = useWindowSize();
  const isMobile = width < 768;

  // Fetch visitors
  const fetchVisitors = useCallback(async () => {
    try {
      if (visitorIdParam) {
        const response = await visitorsAPI.getOne(visitorIdParam);
        setVisitors(response.data.visitor ? [response.data.visitor] : []);
      } else {
        const status = filter === 'all' ? undefined : filter;
        const response = await visitorsAPI.getAll({ status, limit: 50 });
        setVisitors(response.data.visitors || []);
      }
    } catch (error) {
      console.error('Error fetching visitors:', error);
    } finally {
      setLoading(false);
    }
  }, [filter, visitorIdParam]);

  useEffect(() => {
    fetchVisitors();
    // Join tenant room for real-time updates
    if (user?._id) {
      socketService.joinTenant(user._id);
    }
  }, [fetchVisitors, user]);

  // Real-time updates
  useEffect(() => {
    const handleVisitorArrived = (data) => {
      setVisitors(prev => [data.visitor, ...prev]);
    };

    const handleVisitorCreated = (data) => {
      setVisitors(prev => [data.visitor, ...prev]);
    };

    const handleVisitorCheckedIn = (data) => {
      setVisitors(prev => 
        prev.map(v => v._id === data.visitor._id ? data.visitor : v)
      );
    };

    if (socketService.onVisitorArrived) socketService.onVisitorArrived(handleVisitorArrived);
    if (socketService.onVisitorCreated) socketService.onVisitorCreated(handleVisitorCreated);
    if (socketService.onVisitorCheckedIn) socketService.onVisitorCheckedIn(handleVisitorCheckedIn);

    return () => {
      socketService.removeListener('visitor:arrived', handleVisitorArrived);
      socketService.removeListener('visitor:created', handleVisitorCreated);
      socketService.removeListener('visitor:checked_in', handleVisitorCheckedIn);
    };
  }, []);

  // Approve visitor
  const handleApprove = async (visitorId) => {
    try {
      await visitorsAPI.approve(visitorId);
      setVisitors(prev => 
        prev.map(v => v._id === visitorId ? { ...v, status: 'approved' } : v)
      );
    } catch (error) {
      console.error('Error approving visitor:', error);
    }
  };

  // Deny visitor
  const handleDeny = async (visitorId) => {
    try {
      await visitorsAPI.deny(visitorId, { reason: 'Denied by host' });
      setVisitors(prev => 
        prev.map(v => v._id === visitorId ? { ...v, status: 'denied' } : v)
      );
    } catch (error) {
      console.error('Error denying visitor:', error);
    }
  };

  // Show QR code
  const handleShowQR = async (visitor) => {
    setSelectedQRVisitor(visitor);
    setQrLoading(true);
    setShowQR(true);
    try {
      const response = await visitorsAPI.getQRCode(visitor._id);
      setSelectedQRVisitor({ ...visitor, qrData: response.data.qrCode });
    } catch (error) {
      console.error('Error fetching QR code:', error);
      setShowQR(false);
    } finally {
      setQrLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return COLORS.secondary;
      case 'denied': return COLORS.accent;
      case 'checked-in': return COLORS.primary;
      case 'checked-out': return COLORS.gray[500];
      default: return COLORS.gray[500];
    }
  };

  const pendingCount = visitors.filter(v => v.status === 'pending').length;

  return (
    <div style={{ padding: isMobile ? '16px' : '24px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <Link to="/tenant" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: COLORS.gray[600], textDecoration: 'none', marginBottom: '16px' }}>
          <ArrowLeft size={isMobile ? 16 : 18} /> Back to Dashboard
        </Link>
        <div style={{ display: 'flex', alignItems: isMobile ? 'flex-start' : 'center', justifyContent: 'space-between', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? '16px' : '0' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: isMobile ? '22px' : '28px', fontWeight: 700, color: COLORS.dark }}>Visitors</h1>
            <p style={{ margin: '8px 0 0', color: pendingCount > 0 ? '#EF4444' : '#22C55E', fontWeight: 600, fontSize: isMobile ? '14px' : '16px' }}>
              {pendingCount > 0 ? `${pendingCount} pending requests` : 'No pending requests'}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px', width: isMobile ? '100%' : 'auto', flexDirection: isMobile ? 'column' : 'row' }}>
            <Link to="/tenant/visitors/new" style={{ textDecoration: 'none', flex: 1 }}>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  width: '100%',
                  padding: '12px 20px', background: COLORS.primary,
                  border: 'none', borderRadius: '10px', color: COLORS.white,
                  fontSize: '14px', fontWeight: 600, cursor: 'pointer'
                }}
              >
                <Plus size={18} /> Single Visitor
              </motion.button>
            </Link>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowBulkModal(true)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                width: '100%',
                padding: '12px 20px', background: COLORS.secondary || '#10B981',
                border: 'none', borderRadius: '10px', color: COLORS.white,
                fontSize: '14px', fontWeight: 600, cursor: 'pointer'
              }}
            >
              <Send size={18} /> Bulk Add
            </motion.button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
        {['all', 'pending', 'approved', 'checked-in', 'denied'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: '8px 16px',
              border: 'none',
              borderRadius: '8px',
              background: filter === f ? COLORS.primary : COLORS.gray[100],
              color: filter === f ? COLORS.white : COLORS.gray[700],
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
              textTransform: 'capitalize'
            }}
          >
            {f.replace('-', ' ')}
          </button>
        ))}
      </div>

      {/* Visitor List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: COLORS.gray[500] }}>Loading...</div>
      ) : visitors.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', color: COLORS.gray[500] }}>
          <Users size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
          <p>No visitors found</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {visitors.map((visitor) => (
            <motion.div
              key={visitor._id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                background: COLORS.white,
                borderRadius: '12px',
                padding: isMobile ? '12px' : '16px 20px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                display: 'flex',
                flexDirection: isMobile ? 'column' : 'row',
                alignItems: isMobile ? 'flex-start' : 'center',
                gap: isMobile ? '12px' : '16px',
                minWidth: 0,
                overflow: 'hidden'
              }}
            >
              {/* Avatar */}
              <div style={{
                width: isMobile ? '40px' : '48px', height: isMobile ? '40px' : '48px', borderRadius: '12px',
                background: COLORS.primary + '15', color: COLORS.primary,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: isMobile ? '16px' : '18px', fontWeight: 600,
                flexShrink: 0
              }}>
                {visitor.name?.charAt(0)}
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0, width: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: isMobile ? '14px' : '16px', fontWeight: 600, color: COLORS.dark, wordBreak: 'break-word' }}>{visitor.name}</span>
                  <span style={{
                    padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 600,
                    background: getStatusColor(visitor.status) + '15',
                    color: getStatusColor(visitor.status),
                    textTransform: 'capitalize',
                    flexShrink: 0
                  }}>
                    {visitor.status}
                  </span>
                </div>
                <div style={{ fontSize: isMobile ? '12px' : '13px', color: COLORS.gray[500], marginTop: '4px', wordBreak: 'break-word' }}>
                  {visitor.purpose} • {visitor.phone} • {visitor.expectedArrival ? new Date(visitor.expectedArrival).toLocaleString() : 'Anytime'}
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '8px', width: isMobile ? '100%' : 'auto', flexWrap: 'wrap' }}>
                {visitor.status === 'pending' && (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleApprove(visitor._id)}
                      style={{
                        padding: '8px', background: COLORS.secondary, border: 'none',
                        borderRadius: '8px', color: COLORS.white, cursor: 'pointer'
                      }}
                    >
                      <Check size={18} />
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleDeny(visitor._id)}
                      style={{
                        padding: '8px', background: COLORS.accent, border: 'none',
                        borderRadius: '8px', color: COLORS.white, cursor: 'pointer'
                      }}
                    >
                      <X size={18} />
                    </motion.button>
                  </div>
                )}

                {/* QR Code Button */}
                {(visitor.status === 'approved' || visitor.status === 'pending') && (
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handleShowQR(visitor)}
                    style={{
                      padding: '8px', background: COLORS.primary + '15', border: 'none',
                      borderRadius: '8px', color: COLORS.primary, cursor: 'pointer'
                    }}
                    title="Show QR Code"
                  >
                    <QrCode size={18} />
                  </motion.button>
                )}

                {/* Time info */}
                {!isMobile && (
                  <div style={{ textAlign: 'right', fontSize: '12px', color: COLORS.gray[500], flexShrink: 0 }}>
                    {visitor.approvedAt && (
                      <div>Approved: {new Date(visitor.approvedAt).toLocaleTimeString()}</div>
                    )}
                    {visitor.checkInTime && (
                      <div>Check-in: {new Date(visitor.checkInTime).toLocaleTimeString()}</div>
                    )}
                    <div>{new Date(visitor.createdAt).toLocaleDateString()}</div>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* QR Code Modal */}
      {showQR && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          {qrLoading ? (
            <div style={{ color: COLORS.white, textAlign: 'center' }}>
              <p>Loading QR code...</p>
            </div>
          ) : (
            <QRCodeDisplay
              qrData={selectedQRVisitor?.qrData}
              type="visitor"
              onClose={() => {
                setShowQR(false);
                setSelectedQRVisitor(null);
              }}
            />
          )}
        </div>
      )}

      {/* Bulk Add Modal */}
      <AnimatePresence>
        {showBulkModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
              background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              zIndex: 1000, padding: '20px'
            }}
            onClick={() => setShowBulkModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                background: '#1E293B', borderRadius: '16px', padding: '24px',
                width: '100%', maxWidth: '600px', maxHeight: '90vh', overflow: 'auto'
              }}
            >
              <h2 style={{ margin: '0 0 20px', fontSize: '22px', fontWeight: 700, color: '#F1F5F9' }}>
                Bulk Pre-approve Visitors
              </h2>
              <p style={{ margin: '0 0 20px', color: '#94A3B8', fontSize: '14px' }}>
                Add up to 20 visitors at once. Each visitor will receive a QR code.
              </p>

              {bulkSuccess ? (
                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                  <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
                  <h3 style={{ margin: '0 0 8px', color: '#10B981' }}>{bulkSuccess}</h3>
                  <p style={{ margin: '0 0 24px', color: '#94A3B8' }}>
                    QR codes have been generated. Guards will see these visitors in real-time.
                  </p>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => { setShowBulkModal(false); setBulkSuccess(null); setBulkVisitors([{ name: '', phone: '', purpose: 'guest' }]); }}
                    style={{
                      padding: '12px 32px', background: COLORS.primary,
                      border: 'none', borderRadius: '10px', color: COLORS.white,
                      fontSize: '14px', fontWeight: 600, cursor: 'pointer'
                    }}
                  >
                    Done
                  </motion.button>
                </div>
              ) : (
                <>
                  {bulkVisitors.map((v, i) => (
                    <div key={i} style={{ display: 'flex', gap: '12px', marginBottom: '12px', alignItems: 'center' }}>
                      <input
                        type="text"
                        placeholder="Visitor name *"
                        value={v.name}
                        onChange={(e) => {
                          const updated = [...bulkVisitors];
                          updated[i].name = e.target.value;
                          setBulkVisitors(updated);
                        }}
                        style={{ flex: 1, padding: '10px', border: '1px solid #334155', borderRadius: '8px', fontSize: '14px', background: '#0F172A', color: '#F1F5F9' }}
                      />
                      <input
                        type="tel"
                        placeholder="Phone *"
                        value={v.phone}
                        onChange={(e) => {
                          const updated = [...bulkVisitors];
                          updated[i].phone = e.target.value;
                          setBulkVisitors(updated);
                        }}
                        style={{ flex: 1, padding: '10px', border: '1px solid #334155', borderRadius: '8px', fontSize: '14px', background: '#0F172A', color: '#F1F5F9' }}
                      />
                      <select
                        value={v.purpose}
                        onChange={(e) => {
                          const updated = [...bulkVisitors];
                          updated[i].purpose = e.target.value;
                          setBulkVisitors(updated);
                        }}
                        style={{ padding: '10px', border: '1px solid #334155', borderRadius: '8px', fontSize: '14px', background: '#0F172A', color: '#F1F5F9' }}
                      >
                        {VISITOR_PURPOSES.map(p => (
                          <option key={p.value} value={p.value}>{p.label}</option>
                        ))}
                      </select>
                      {bulkVisitors.length > 1 && (
                        <button
                          onClick={() => setBulkVisitors(bulkVisitors.filter((_, idx) => idx !== i))}
                          style={{ padding: '8px', background: 'none', border: 'none', cursor: 'pointer', color: '#F59E0B' }}
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                  ))}

                  {bulkVisitors.length < 20 && (
                    <button
                      onClick={() => setBulkVisitors([...bulkVisitors, { name: '', phone: '', purpose: 'guest' }])}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '8px',
                        padding: '10px', background: 'none', border: '1px dashed #334155',
                        borderRadius: '8px', color: '#94A3B8', fontSize: '14px',
                        cursor: 'pointer', width: '100%', justifyContent: 'center', marginBottom: '20px'
                      }}
                    >
                      <Plus size={16} /> Add Another Visitor
                    </button>
                  )}

                  <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setShowBulkModal(false)}
                      style={{
                        padding: '12px 24px', background: '#334155',
                        border: 'none', borderRadius: '10px', color: '#F1F5F9',
                        fontSize: '14px', fontWeight: 600, cursor: 'pointer'
                      }}
                    >
                      Cancel
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={async () => {
                        const validVisitors = bulkVisitors.filter(v => v.name && v.phone);
                        if (validVisitors.length === 0) return;
                        setBulkLoading(true);
                        try {
                          const res = await visitorsAPI.createBulk(validVisitors);
                          setBulkSuccess(`${res.data.count} visitors pre-approved successfully!`);
                          fetchVisitors();
                        } catch (err) {
                          console.error('Bulk create error:', err);
                        } finally {
                          setBulkLoading(false);
                        }
                      }}
                      disabled={bulkLoading || bulkVisitors.filter(v => v.name && v.phone).length === 0}
                      style={{
                        padding: '12px 24px', background: '#10B981',
                        border: 'none', borderRadius: '10px', color: '#FFFFFF',
                        fontSize: '14px', fontWeight: 600, cursor: bulkLoading ? 'not-allowed' : 'pointer',
                        opacity: bulkLoading ? 0.7 : 1
                      }}
                    >
                      {bulkLoading ? 'Creating...' : `Pre-approve ${bulkVisitors.filter(v => v.name && v.phone).length} Visitors`}
                    </motion.button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TenantVisitors;
