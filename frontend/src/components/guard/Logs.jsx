import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { logsAPI } from '../../services/api';
import socketService from '../../services/socket';
import { COLORS } from '../../config';
import { ClipboardList, Search, ArrowLeft, Download, Users, Package } from 'lucide-react';

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
const GuardLogs = () => {
  const { apartment } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const { width } = useWindowSize();
  const isMobile = width < 768;

  // Fetch logs
  const fetchLogs = useCallback(async () => {
    if (!apartment?._id) return;
    try {
      const personType = filter === 'all' ? undefined : filter;
      const response = await logsAPI.getAll({ apartmentId: apartment._id, personType, limit: 100 });
      setLogs(response.data.logs || []);
    } catch (error) {
      console.error('Error fetching logs:', error);
    } finally {
      setLoading(false);
    }
  }, [apartment?._id, filter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Real-time updates
  useEffect(() => {
    const handleAccessNew = (data) => {
      setLogs(prev => [data.log, ...prev].slice(0, 100));
    };

    socketService.onAccessNew(handleAccessNew);

    return () => {
      socketService.removeListener('access:new', handleAccessNew);
    };
  }, []);

  const filteredLogs = logs.filter(l => 
    l.personName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.personPhone?.includes(searchQuery) ||
    l.roomNumber?.includes(searchQuery)
  );

  const getActionColor = (action) => {
    switch (action) {
      case 'entry': return COLORS.secondary;
      case 'exit': return COLORS.primary;
      case 'approved': return COLORS.secondary;
      case 'denied': return COLORS.accent;
      default: return COLORS.gray[500];
    }
  };

  const getIcon = (personType) => {
    switch (personType) {
      case 'visitor': return <Users size={16} />;
      case 'delivery': return <Package size={16} />;
      default: return null;
    }
  };

  // Stats
  const entryCount = filteredLogs.filter(l => l.action === 'entry').length;
  const exitCount = filteredLogs.filter(l => l.action === 'exit').length;
  const deniedCount = filteredLogs.filter(l => l.action === 'denied').length;

  return (
    <div style={{ padding: isMobile ? '16px' : '24px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <Link to="/guard" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: COLORS.gray[600], textDecoration: 'none', marginBottom: '16px' }}>
          <ArrowLeft size={isMobile ? 16 : 18} /> Back to Dashboard
        </Link>
        <div style={{ display: 'flex', alignItems: isMobile ? 'flex-start' : 'center', justifyContent: 'space-between', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? '16px' : '0' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: isMobile ? '22px' : '28px', fontWeight: 700, color: COLORS.dark }}>Access Logs</h1>
            <p style={{ margin: '8px 0 0', color: COLORS.gray[500], fontSize: isMobile ? '14px' : '16px' }}>
              {apartment?.buildingName || 'Apartment'} - Real-time activity log
            </p>
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '10px 16px', background: COLORS.white,
              border: `1px solid ${COLORS.gray[200]}`, borderRadius: '8px',
              color: COLORS.dark, fontSize: '13px', fontWeight: 500, cursor: 'pointer'
            }}
          >
            <Download size={16} /> Export
          </motion.button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: isMobile ? '12px' : '16px', marginBottom: '24px' }}>
        <div style={{ background: COLORS.white, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
          <div style={{ fontSize: '28px', fontWeight: 700, color: COLORS.dark }}>{filteredLogs.length}</div>
          <div style={{ fontSize: '12px', color: COLORS.gray[500] }}>Total Events</div>
        </div>
        <div style={{ background: COLORS.secondary + '15', borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
          <div style={{ fontSize: '28px', fontWeight: 700, color: COLORS.secondary }}>{entryCount}</div>
          <div style={{ fontSize: '12px', color: COLORS.gray[600] }}>Entries</div>
        </div>
        <div style={{ background: COLORS.primary + '15', borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
          <div style={{ fontSize: '28px', fontWeight: 700, color: COLORS.primary }}>{exitCount}</div>
          <div style={{ fontSize: '12px', color: COLORS.gray[600] }}>Exits</div>
        </div>
        <div style={{ background: COLORS.accent + '15', borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
          <div style={{ fontSize: '28px', fontWeight: 700, color: COLORS.accent }}>{deniedCount}</div>
          <div style={{ fontSize: '12px', color: COLORS.gray[600] }}>Denied</div>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
        {['all', 'visitor', 'delivery', 'tenant'].map((f) => (
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

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: '24px' }}>
        <Search size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: COLORS.gray[400] }} />
        <input
          id="logs-search"
          name="logs-search"
          type="text"
          autoComplete="off"
          placeholder="Search by name, phone, or unit..."
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

      {/* Logs Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: COLORS.gray[500] }}>Loading...</div>
      ) : filteredLogs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', color: COLORS.gray[500] }}>
          <ClipboardList size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
          <p>No access logs found</p>
        </div>
      ) : isMobile ? (
        /* Mobile Card View */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filteredLogs.map((log) => (
            <motion.div
              key={log._id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                background: COLORS.white,
                borderRadius: '12px',
                padding: '16px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '14px', fontWeight: 600, color: COLORS.dark }}>{log.personName}</span>
                <span style={{
                  padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 600,
                  background: getActionColor(log.action) + '15',
                  color: getActionColor(log.action),
                  textTransform: 'capitalize'
                }}>
                  {log.action}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '12px', color: COLORS.gray[500] }}>
                <span>{getIcon(log.personType)} {log.personType}</span>
                <span>Room: {log.roomNumber || '-'}</span>
                <span>Method: {log.method}</span>
              </div>
              <div style={{ fontSize: '11px', color: COLORS.gray[400] }}>
                {new Date(log.timestamp).toLocaleString()}
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        /* Desktop Table View */
        <div style={{ background: COLORS.white, borderRadius: '12px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: COLORS.gray[50], borderBottom: `1px solid ${COLORS.gray[200]}` }}>
                <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: COLORS.gray[600] }}>Time</th>
                <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: COLORS.gray[600] }}>Name</th>
                <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: COLORS.gray[600] }}>Type</th>
                <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: COLORS.gray[600] }}>Unit</th>
                <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: COLORS.gray[600] }}>Status</th>
                <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: COLORS.gray[600] }}>Method</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log) => (
                <tr key={log._id} style={{ borderBottom: `1px solid ${COLORS.gray[100]}` }}>
                  <td style={{ padding: '12px 16px', fontSize: '13px', color: COLORS.gray[600] }}>
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: 500, color: COLORS.dark }}>
                    {log.personName}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '13px', color: COLORS.gray[600], textTransform: 'capitalize' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {getIcon(log.personType)} {log.personType}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '13px', color: COLORS.gray[600] }}>
                    {log.roomNumber || '-'}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{
                      padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 600,
                      background: getActionColor(log.action) + '15',
                      color: getActionColor(log.action),
                      textTransform: 'capitalize'
                    }}>
                      {log.action}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '13px', color: COLORS.gray[600], textTransform: 'capitalize' }}>
                    {log.method}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default GuardLogs;
