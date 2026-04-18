import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { deliveriesAPI } from '../../services/api';
import socketService from '../../services/socket';
import { COLORS } from '../../config';
import { Package, ArrowLeft, Box } from 'lucide-react';

const useWindowSize = () => {
  const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  useEffect(() => {
    const handleResize = () => setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  return windowSize;
};

const TenantDeliveries = () => {
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const { width } = useWindowSize();
  const isMobile = width < 768;

  // Fetch deliveries
  const fetchDeliveries = useCallback(async () => {
    try {
      const status = filter === 'all' ? undefined : filter;
      const response = await deliveriesAPI.getAll({ status, limit: 50 });
      setDeliveries(response.data.deliveries || []);
    } catch (error) {
      console.error('Error fetching deliveries:', error);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchDeliveries();
  }, [fetchDeliveries]);

  // Real-time updates
  useEffect(() => {
    const handleDeliveryArrived = (data) => {
      setDeliveries(prev => [data.delivery, ...prev]);
    };

    const handleDeliveryConfirmed = (data) => {
      setDeliveries(prev => 
        prev.map(d => d._id === data.delivery._id ? data.delivery : d)
      );
    };

    const handleDeliveryReady = (data) => {
      setDeliveries(prev => 
        prev.map(d => d._id === data.delivery._id ? data.delivery : d)
      );
    };

    const handleDeliveryReturned = (data) => {
      setDeliveries(prev => prev.filter(d => d._id !== data.delivery._id));
    };

    if (socketService.onDeliveryArrived) socketService.onDeliveryArrived(handleDeliveryArrived);
    if (socketService.onDeliveryConfirmed) socketService.onDeliveryConfirmed(handleDeliveryConfirmed);
    if (socketService.onDeliveryReady) socketService.onDeliveryReady(handleDeliveryReady);
    if (socketService.onDeliveryReturned) socketService.onDeliveryReturned(handleDeliveryReturned);

    return () => {
      socketService.removeListener('delivery:arrived', handleDeliveryArrived);
      socketService.removeListener('delivery:confirmed', handleDeliveryConfirmed);
      socketService.removeListener('delivery:ready_for_pickup', handleDeliveryReady);
      socketService.removeListener('delivery:returned', handleDeliveryReturned);
    };
  }, []);

  // Confirm delivery
  const handleConfirm = async (deliveryId) => {
    try {
      await deliveriesAPI.confirm(deliveryId);
      setDeliveries(prev => 
        prev.map(d => d._id === deliveryId ? { ...d, status: 'delivered' } : d)
      );
    } catch (error) {
      console.error('Error confirming delivery:', error);
    }
  };

  // Mark as ready for pickup
  const handleReadyForPickup = async (deliveryId) => {
    try {
      await deliveriesAPI.markReady(deliveryId);
      setDeliveries(prev => 
        prev.map(d => d._id === deliveryId ? { ...d, status: 'ready_for_pickup' } : d)
      );
    } catch (error) {
      console.error('Error marking delivery:', error);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'delivered': return COLORS.secondary;
      case 'ready_for_pickup': return COLORS.primary;
      case 'received': return COLORS.gray[500];
      case 'returned': return COLORS.accent;
      default: return COLORS.gray[500];
    }
  };

  const pendingCount = deliveries.filter(d => d.status === 'received' || d.status === 'ready_for_pickup').length;

  return (
    <div style={{ padding: isMobile ? '16px' : '24px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <Link to="/tenant" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: COLORS.gray[600], textDecoration: 'none', marginBottom: '16px' }}>
          <ArrowLeft size={isMobile ? 16 : 18} /> Back to Dashboard
        </Link>
        <div>
          <h1 style={{ margin: 0, fontSize: isMobile ? '22px' : '28px', fontWeight: 700, color: COLORS.dark }}>Deliveries</h1>
          <p style={{ margin: '8px 0 0', color: pendingCount > 0 ? '#EF4444' : '#22C55E', fontWeight: 600, fontSize: isMobile ? '14px' : '16px' }}>
            {pendingCount > 0 ? `${pendingCount} packages waiting` : 'No pending packages'}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
        {['all', 'received', 'ready_for_pickup', 'delivered', 'returned'].map((f) => (
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
            {f.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      {/* Delivery List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: COLORS.gray[500] }}>Loading...</div>
      ) : deliveries.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', color: COLORS.gray[500] }}>
          <Package size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
          <p>No deliveries found</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {deliveries.map((delivery) => (
            <motion.div
              key={delivery._id}
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
              {/* Icon */}
              <div style={{
                width: isMobile ? '40px' : '48px', height: isMobile ? '40px' : '48px', borderRadius: '12px',
                background: COLORS.secondary + '15', color: COLORS.secondary,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0
              }}>
                <Box size={isMobile ? 20 : 24} />
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0, width: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: isMobile ? '14px' : '16px', fontWeight: 600, color: COLORS.dark, wordBreak: 'break-word' }}>
                    {delivery.courierCompany || 'Package'}
                  </span>
                  <span style={{
                    padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 600,
                    background: getStatusColor(delivery.status) + '15',
                    color: getStatusColor(delivery.status),
                    textTransform: 'capitalize',
                    flexShrink: 0
                  }}>
                    {delivery.status.replace(/_/g, ' ')}
                  </span>
                </div>
                <div style={{ fontSize: isMobile ? '12px' : '13px', color: COLORS.gray[500], marginTop: '4px', wordBreak: 'break-word' }}>
                  {delivery.parcelDescription} • {delivery.courierName} • {delivery.courierPhone}
                </div>
                {delivery.trackingNumber && (
                  <div style={{ fontSize: '12px', color: COLORS.gray[400], marginTop: '2px' }}>
                    Tracking: {delivery.trackingNumber}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '8px', width: isMobile ? '100%' : 'auto', flexWrap: 'wrap' }}>
                {delivery.status === 'received' && (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleReadyForPickup(delivery._id)}
                    style={{
                      flex: 1,
                      padding: '10px 16px', background: COLORS.primary, border: 'none',
                      borderRadius: '8px', color: COLORS.white, fontSize: '13px',
                      fontWeight: 600, cursor: 'pointer'
                    }}
                  >
                    Mark for Pickup
                  </motion.button>
                )}

                {delivery.status === 'ready_for_pickup' && (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleConfirm(delivery._id)}
                    style={{
                      flex: 1,
                      padding: '10px 16px', background: COLORS.secondary, border: 'none',
                      borderRadius: '8px', color: COLORS.white, fontSize: '13px',
                      fontWeight: 600, cursor: 'pointer'
                    }}
                  >
                    Confirm Received
                  </motion.button>
                )}
              </div>

              {/* Time */}
              {!isMobile && (
                <div style={{ textAlign: 'right', fontSize: '12px', color: COLORS.gray[500], flexShrink: 0 }}>
                  {delivery.receivedAt && (
                    <div>Received: {new Date(delivery.receivedAt).toLocaleString()}</div>
                  )}
                  <div>{new Date(delivery.createdAt).toLocaleDateString()}</div>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TenantDeliveries;
