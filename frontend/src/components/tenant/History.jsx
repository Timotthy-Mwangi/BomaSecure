import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { visitorsAPI, deliveriesAPI, logsAPI } from '../../services/api';
import { COLORS } from '../../config';
import { FileText, ArrowLeft, Users, Package, Clock } from 'lucide-react';

// eslint-disable-next-line no-unused-vars
const TenantHistory = () => {
  const [history, setHistory] = useState({ visitors: [], deliveries: [], logs: [] });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  // Fetch history data
  const fetchHistory = useCallback(async () => {
    try {
      setLoading(true);
      const [visitorsRes, deliveriesRes, logsRes] = await Promise.all([
        visitorsAPI.getAll({ limit: 100 }),
        deliveriesAPI.getAll({ limit: 100 }),
        logsAPI.getAll({ limit: 100 })
      ]);
      
      setHistory({
        visitors: visitorsRes.data.visitors || [],
        deliveries: deliveriesRes.data.deliveries || [],
        logs: logsRes.data.logs || []
      });
    } catch (error) {
      console.error('Error fetching history:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const filteredHistory = useMemo(() => {
    let items = [];
    
    if (filter === 'all' || filter === 'visitors') {
      items = [...items, ...history.visitors.map(v => ({ ...v, type: 'visitor' }))];
    }
    if (filter === 'all' || filter === 'deliveries') {
      items = [...items, ...history.deliveries.map(d => ({ ...d, type: 'delivery' }))];
    }
    if (filter === 'all' || filter === 'logs') {
      items = [...items, ...history.logs.map(l => ({ ...l, type: 'log' }))];
    }
    
    return items.sort((a, b) => new Date(b.createdAt || b.timestamp) - new Date(a.createdAt || a.timestamp));
  }, [filter, history]);

  const getIcon = (type) => {
    switch (type) {
      case 'visitor': return <Users size={18} />;
      case 'delivery': return <Package size={18} />;
      default: return <Clock size={18} />;
    }
  };

  const getColor = (type) => {
    switch (type) {
      case 'visitor': return COLORS.primary;
      case 'delivery': return COLORS.secondary;
      default: return COLORS.gray[500];
    }
  };

  const getTitle = (item, type) => {
    if (type === 'visitor') return item.name;
    if (type === 'delivery') return item.courierCompany || 'Package';
    return item.personName || 'Access Event';
  };

  const getSubtitle = (item, type) => {
    if (type === 'visitor') return item.purpose;
    if (type === 'delivery') return item.parcelDescription;
    return `${item.action} - ${item.personType}`;
  };

  const getStatus = (item, type) => {
    if (type === 'visitor') return item.status;
    if (type === 'delivery') return item.status;
    return item.action;
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <Link to="/tenant" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: COLORS.gray[600], textDecoration: 'none', marginBottom: '16px' }}>
          <ArrowLeft size={18} /> Back to Dashboard
        </Link>
        <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 700, color: COLORS.dark }}>History</h1>
        <p style={{ margin: '8px 0 0', color: COLORS.gray[500] }}>
          View all past visitor and delivery records
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div style={{ background: COLORS.white, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
          <div style={{ fontSize: '24px', fontWeight: 700, color: COLORS.primary }}>{history.visitors.length}</div>
          <div style={{ fontSize: '13px', color: COLORS.gray[500] }}>Total Visitors</div>
        </div>
        <div style={{ background: COLORS.white, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
          <div style={{ fontSize: '24px', fontWeight: 700, color: COLORS.secondary }}>{history.deliveries.length}</div>
          <div style={{ fontSize: '13px', color: COLORS.gray[500] }}>Total Deliveries</div>
        </div>
        <div style={{ background: COLORS.white, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
          <div style={{ fontSize: '24px', fontWeight: 700, color: COLORS.gray[700] }}>{history.logs.length}</div>
          <div style={{ fontSize: '13px', color: COLORS.gray[500] }}>Access Logs</div>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
        {['all', 'visitors', 'deliveries', 'logs'].map((f) => (
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
            {f}
          </button>
        ))}
      </div>

      {/* History List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: COLORS.gray[500] }}>Loading...</div>
      ) : filteredHistory.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', color: COLORS.gray[500] }}>
          <FileText size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
          <p>No history found</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {filteredHistory.map((item, index) => {
            const type = item.type;
            return (
              <motion.div
                key={item._id || index}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                style={{
                  background: COLORS.white,
                  borderRadius: '10px',
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}
              >
                <div style={{
                  width: '36px', height: '36px', borderRadius: '8px',
                  background: getColor(type) + '15', color: getColor(type),
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  {getIcon(type)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: COLORS.dark }}>
                    {getTitle(item, type)}
                  </div>
                  <div style={{ fontSize: '12px', color: COLORS.gray[500] }}>
                    {getSubtitle(item, type)}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ 
                    fontSize: '11px', fontWeight: 600, 
                    color: COLORS.gray[600],
                    textTransform: 'capitalize'
                  }}>
                    {getStatus(item, type)}
                  </div>
                  <div style={{ fontSize: '11px', color: COLORS.gray[400] }}>
                    {new Date(item.createdAt || item.timestamp).toLocaleDateString()}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};
export default TenantHistory;
