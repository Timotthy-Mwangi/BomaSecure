import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { deliveriesAPI } from '../../services/api';
import socketService from '../../services/socket';
import { COLORS } from '../../config';
import { Package, Search, ArrowLeft, Box, Truck } from 'lucide-react';

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
const GuardDeliveries = () => {
  const { apartment } = useAuth();
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const { width } = useWindowSize();
  const isMobile = width < 768;
  const isTablet = width >= 768 && width <= 1024;

  // Fetch today's deliveries
  const fetchDeliveries = useCallback(async () => {
    if (!apartment?._id) return;
    try {
      const response = await deliveriesAPI.getToday(apartment._id);
      setDeliveries(response.data.deliveries || []);
    } catch (error) {
      console.error('Error fetching deliveries:', error);
    } finally {
      setLoading(false);
    }
  }, [apartment?._id]);

  useEffect(() => {
    fetchDeliveries();
  }, [fetchDeliveries]);

  // Real-time updates
  useEffect(() => {
    const handleDeliveryArrived = (data) => {
      setDeliveries(prev => [data.delivery, ...prev]);
    };

    const handleDeliveryConfirmed = (data) => {
      setDeliveries(prev => prev.filter(d => d._id !== data.delivery._id));
    };

    const handleDeliveryReturned = (data) => {
      setDeliveries(prev => prev.filter(d => d._id !== data.delivery._id));
    };

    socketService.onDeliveryArrived(handleDeliveryArrived);
    socketService.onDeliveryConfirmed(handleDeliveryConfirmed);
    socketService.onDeliveryReturned(handleDeliveryReturned);
    socketService.joinGuards();

    return () => {
      socketService.removeListener('delivery:arrived', handleDeliveryArrived);
      socketService.removeListener('delivery:confirmed', handleDeliveryConfirmed);
      socketService.removeListener('delivery:returned', handleDeliveryReturned);
    };
  }, []);

  // Mark as returned
  const handleReturn = async (deliveryId) => {
    try {
      await deliveriesAPI.return(deliveryId, { reason: 'Returned by guard' });
      setDeliveries(prev => prev.filter(d => d._id !== deliveryId));
    } catch (error) {
      console.error('Error returning delivery:', error);
    }
  };

  const filteredDeliveries = deliveries.filter(d => 
    d.courierName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.courierCompany?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.recipientTenantId?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pendingCount = filteredDeliveries.filter(d => d.status === 'received').length;
  const readyCount = filteredDeliveries.filter(d => d.status === 'ready_for_pickup').length;

  return (
    <>
    <div style={{ padding: isMobile ? '16px' : '24px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <Link to="/guard" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: COLORS.gray[600], textDecoration: 'none', marginBottom: '16px' }}>
          <ArrowLeft size={isMobile ? 16 : 18} /> Back to Dashboard
        </Link>
        <h1 style={{ margin: 0, fontSize: isMobile ? '22px' : '28px', fontWeight: 700, color: COLORS.dark }}>Deliveries</h1>
        <p style={{ margin: '8px 0 0', color: COLORS.gray[500], fontSize: isMobile ? '14px' : '16px' }}>
          {apartment?.buildingName || 'Apartment'} - {pendingCount + readyCount} packages
        </p>
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: '24px' }}>
        <Search size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: COLORS.gray[400] }} />
        <input
          id="delivery-search"
          name="delivery-search"
          type="text"
          autoComplete="off"
          placeholder="Search by courier or recipient..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            width: '100%',
            padding: '12px 16px 12px 48px',
            border: 'none',
            borderRadius: '10px',
            background: COLORS.white,
            fontSize: '14px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
          }}
        />
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : isTablet ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: isMobile ? '12px' : '16px', marginBottom: '24px' }}>
        <div style={{ background: '#22C55E20', borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#22C55E' }}>{filteredDeliveries.length}</div>
          <div style={{ fontSize: '12px', color: '#94A3B8' }}>Total Today</div>
        </div>
        <div style={{ background: '#EF444420', borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#EF4444' }}>{pendingCount}</div>
          <div style={{ fontSize: '12px', color: '#94A3B8' }}>To Notify</div>
        </div>
        <div style={{ background: '#3B82F620', borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#3B82F6' }}>{readyCount}</div>
          <div style={{ fontSize: '12px', color: '#94A3B8' }}>Ready for Pickup</div>
        </div>
        <div style={{ background: '#22C55E20', borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#22C55E' }}>
            {filteredDeliveries.filter(d => d.status === 'delivered').length}
          </div>
          <div style={{ fontSize: '12px', color: '#94A3B8' }}>Delivered</div>
        </div>
      </div>

      {/* Delivery List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: COLORS.gray[500] }}>Loading...</div>
      ) : filteredDeliveries.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', color: COLORS.gray[500] }}>
          <Package size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
          <p>No deliveries today</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filteredDeliveries.map((delivery) => (
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
                    padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 600,
                    background: delivery.status === 'delivered' ? COLORS.secondary + '15' :
                               delivery.status === 'ready_for_pickup' ? COLORS.primary + '15' :
                               delivery.status === 'returned' ? COLORS.accent + '15' : COLORS.gray[100],
                    color: delivery.status === 'delivered' ? COLORS.secondary :
                           delivery.status === 'ready_for_pickup' ? COLORS.primary :
                           delivery.status === 'returned' ? COLORS.accent : COLORS.gray[600],
                    textTransform: 'capitalize',
                    flexShrink: 0
                  }}>
                    {delivery.status.replace(/_/g, ' ')}
                  </span>
                </div>
                <div style={{ fontSize: isMobile ? '12px' : '13px', color: COLORS.gray[500], marginTop: '4px' }}>
                  <Truck size={12} style={{ display: 'inline', marginRight: '4px' }} />
                  {delivery.courierName} • {delivery.courierPhone}
                </div>
                {delivery.vehiclePlate && (
                  <div style={{ fontSize: isMobile ? '12px' : '13px', color: COLORS.gray[500] }}>
                    Vehicle: {delivery.vehiclePlate}
                  </div>
                )}
                <div style={{ fontSize: isMobile ? '12px' : '13px', color: COLORS.gray[500] }}>
                  For: Room {delivery.roomNumber}
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', width: isMobile ? '100%' : 'auto' }}>
                {delivery.status === 'received' && (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={async () => {
                      try {
                        // Notify tenant
                        await deliveriesAPI.markReady(delivery._id);
                        setDeliveries(prev => 
                          prev.map(d => d._id === delivery._id ? { ...d, status: 'ready_for_pickup' } : d)
                        );
                      } catch (error) {
                        console.error('Error:', error);
                      }
                    }}
                    style={{
                      flex: 1,
                      padding: '10px 16px', background: COLORS.primary, border: 'none',
                      borderRadius: '8px', color: COLORS.white, fontSize: '13px',
                      fontWeight: 600, cursor: 'pointer'
                    }}
                  >
                    Notify Tenant
                  </motion.button>
                )}

                {(delivery.status === 'received' || delivery.status === 'ready_for_pickup') && (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleReturn(delivery._id)}
                    style={{
                      flex: 1,
                      padding: '10px 16px', background: COLORS.accent, border: 'none',
                      borderRadius: '8px', color: COLORS.white, fontSize: '13px',
                      fontWeight: 600, cursor: 'pointer'
                    }}
                  >
                    Return
                  </motion.button>
                )}
              </div>

              {/* Time */}
              {!isMobile && (
                <div style={{ textAlign: 'right', fontSize: '12px', color: COLORS.gray[500], flexShrink: 0 }}>
                  <div>{new Date(delivery.createdAt).toLocaleTimeString()}</div>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>

    </>
  );
};

export default GuardDeliveries;
