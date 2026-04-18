import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { COLORS } from '../../config';
import { 
  Wrench, 
  XCircle,
  User,
  Phone,
  Search
} from 'lucide-react';
import { maintenanceAPI } from '../../services/api';
import socketService from '../../services/socket';

const GUARD_MAINTENANCE_CATEGORIES = [
  { id: 'plumbing', label: 'Plumbing' },
  { id: 'electrical', label: 'Electrical' },
  { id: 'hvac', label: 'HVAC' },
  { id: 'appliance', label: 'Appliances' },
  { id: 'structural', label: 'Structural' },
  { id: 'pest', label: 'Pest Control' },
  { id: 'other', label: 'Other' }
];

const PRIORITY_LEVELS = {
  low: { label: 'Low', color: '#10B981' },
  medium: { label: 'Medium', color: '#F59E0B' },
  high: { label: 'High', color: '#EF4444' },
  emergency: { label: 'Emergency', color: '#DC2626' }
};

const STATUS_OPTIONS = [
  { id: 'pending', label: 'Pending', color: '#F59E0B' },
  { id: 'in_progress', label: 'In Progress', color: '#3B82F6' },
  { id: 'resolved', label: 'Resolved', color: '#10B981' },
  { id: 'cancelled', label: 'Cancelled', color: '#EF4444' }
];

const GuardMaintenance = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);
  const isMobile = windowWidth < 768;

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const response = await maintenanceAPI.getAll();
      setRequests(response.data.requests || []);
    } catch (err) {
      console.error('Error fetching requests:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  // Real-time updates
  useEffect(() => {
    const handleMaintenanceCreated = (data) => {
      const request = data.request || data;
      setRequests(prev => {
        if (prev.some(r => r._id === request._id)) return prev;
        return [request, ...prev];
      });
    };

    const handleMaintenanceUpdated = (data) => {
      const updatedRequest = data.request || data;
      setRequests(prev => prev.map(r => r._id === updatedRequest._id ? updatedRequest : r));
    };

    const handleMaintenanceDeleted = (data) => {
      setRequests(prev => prev.filter(r => r._id !== data.requestId));
    };

    socketService.onMaintenanceCreated(handleMaintenanceCreated);
    socketService.onMaintenanceNew(handleMaintenanceCreated);
    socketService.onMaintenanceUpdated(handleMaintenanceUpdated);
    socketService.onMaintenanceDeleted(handleMaintenanceDeleted);

    return () => {
      socketService.removeListener('maintenance:created', handleMaintenanceCreated);
      socketService.removeListener('maintenance:new', handleMaintenanceCreated);
      socketService.removeListener('maintenance:updated', handleMaintenanceUpdated);
      socketService.removeListener('maintenance:deleted', handleMaintenanceDeleted);
    };
  }, []);

  const filteredRequests = requests.filter(r => {
    const matchesFilter = filter === 'all' || r.status === filter;
    const matchesSearch = !searchTerm || 
      r.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.category?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const containerStyle = {
    padding: isMobile ? '12px' : '20px',
    maxWidth: '1000px',
    margin: '0 auto',
    width: '100%'
  };

  const cardStyle = {
    background: '#FFFFFF',
    borderRadius: isMobile ? '12px' : '16px',
    padding: isMobile ? '16px' : '20px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    marginBottom: '16px'
  };

  return (
    <div style={containerStyle}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ marginBottom: '24px' }}
      >
        <h1 style={{
          margin: 0,
          fontSize: isMobile ? '22px' : '28px',
          fontWeight: 800,
          color: '#1F2937',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <Wrench size={32} color={COLORS.primary} />
          Maintenance Requests
        </h1>
        <p style={{ margin: '8px 0 0', fontSize: '16px', fontWeight: 600, color: '#4B5563' }}>
          View and manage maintenance requests from residents
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        style={{ ...cardStyle, padding: isMobile ? '12px' : '16px' }}
      >
        <div style={{ 
          display: 'flex', 
          flexDirection: isMobile ? 'column' : 'row', 
          gap: '12px',
          marginBottom: '16px'
        }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <Search 
              size={18} 
              color="#9CA3AF" 
              style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} 
            />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search requests..."
              style={{
                width: '100%',
                padding: '12px 12px 12px 44px',
                borderRadius: '12px',
                border: '2px solid #E5E7EB',
                fontSize: '14px',
                outline: 'none'
              }}
            />
          </div>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            style={{
              padding: '10px 14px',
              borderRadius: '12px',
              border: '2px solid #E5E7EB',
              fontSize: '14px',
              background: '#FFFFFF',
              cursor: 'pointer'
            }}
          >
            <option value="all">All Status</option>
            {STATUS_OPTIONS.map(status => (
              <option key={status.id} value={status.id}>{status.label}</option>
            ))}
          </select>
        </div>
        <span style={{ fontSize: '13px', color: '#6B7280' }}>
          {filteredRequests.length} request{filteredRequests.length !== 1 ? 's' : ''}
        </span>
      </motion.div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '3px solid #E5E7EB',
            borderTopColor: COLORS.primary,
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto'
          }}></div>
        </div>
      ) : filteredRequests.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{ ...cardStyle, textAlign: 'center', padding: '40px' }}
        >
          <Wrench size={48} color="#9CA3AF" />
          <p style={{ margin: '12px 0 0', fontSize: '16px', color: '#6B7280' }}>
            No maintenance requests found
          </p>
        </motion.div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filteredRequests.map((request, index) => (
            <motion.div
              key={request._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => setSelectedRequest(request)}
              style={{
                ...cardStyle,
                cursor: 'pointer',
                border: selectedRequest?._id === request._id ? `2px solid ${COLORS.primary}` : '2px solid transparent'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <span style={{
                      background: PRIORITY_LEVELS[request.priority]?.color + '20',
                      color: PRIORITY_LEVELS[request.priority]?.color,
                      padding: '4px 10px',
                      borderRadius: '20px',
                      fontSize: '11px',
                      fontWeight: 600
                    }}>
                      {PRIORITY_LEVELS[request.priority]?.label || request.priority}
                    </span>
                    <span style={{
                      background: STATUS_OPTIONS.find(s => s.id === request.status)?.color + '20',
                      color: STATUS_OPTIONS.find(s => s.id === request.status)?.color,
                      padding: '4px 10px',
                      borderRadius: '20px',
                      fontSize: '11px',
                      fontWeight: 600,
                      textTransform: 'capitalize'
                    }}>
                      {request.status}
                    </span>
                  </div>
                  <h3 style={{ margin: '0 0 4px', fontSize: '16px', fontWeight: 600, color: '#1F2937' }}>
                    {GUARD_MAINTENANCE_CATEGORIES.find(c => c.id === request.category)?.label || request.category}
                  </h3>
                  <p style={{ margin: 0, fontSize: '13px', color: '#6B7280', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <User size={12} /> {request.reportedBy?.name || 'Unknown'}
                  </p>
                </div>
                <span style={{ fontSize: '11px', color: '#9CA3AF' }}>
                  {new Date(request.createdAt).toLocaleDateString()}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {selectedRequest && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedRequest(null)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: '#000',
              zIndex: 999
            }}
          />
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              background: '#FFFFFF',
              borderTopLeftRadius: '24px',
              borderTopRightRadius: '24px',
              padding: '24px',
              zIndex: 1001,
              maxHeight: '80vh',
              overflowY: 'auto'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#1F2937' }}>
                Request Details
              </h2>
              <button
                onClick={() => setSelectedRequest(null)}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  border: 'none',
                  background: '#F3F4F6',
                  cursor: 'pointer'
                }}
              >
                <XCircle size={18} color="#6B7280" />
              </button>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                <span style={{
                  background: PRIORITY_LEVELS[selectedRequest.priority]?.color + '20',
                  color: PRIORITY_LEVELS[selectedRequest.priority]?.color,
                  padding: '4px 10px',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: 600
                }}>
                  {PRIORITY_LEVELS[selectedRequest.priority]?.label}
                </span>
                <span style={{
                  background: STATUS_OPTIONS.find(s => s.id === selectedRequest.status)?.color + '20',
                  color: STATUS_OPTIONS.find(s => s.id === selectedRequest.status)?.color,
                  padding: '4px 10px',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: 600,
                  textTransform: 'capitalize'
                }}>
                  {selectedRequest.status}
                </span>
              </div>

              <h3 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: 600, color: '#1F2937' }}>
                {GUARD_MAINTENANCE_CATEGORIES.find(c => c.id === selectedRequest.category)?.label || selectedRequest.category}
              </h3>
              <p style={{ margin: 0, fontSize: '14px', color: '#4B5563', lineHeight: 1.5 }}>
                {selectedRequest.description}
              </p>
            </div>

            <div style={{ 
              padding: '16px', 
              background: '#F9FAFB', 
              borderRadius: '12px',
              marginBottom: '20px' 
            }}>
              <h4 style={{ margin: '0 0 12px', fontSize: '14px', fontWeight: 600, color: '#6B7280' }}>
                REPORTED BY
              </h4>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  background: COLORS.primary + '15',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <User size={20} color={COLORS.primary} />
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#1F2937' }}>
                    {selectedRequest.reportedBy?.name || 'Unknown'}
                  </p>
                  {selectedRequest.reportedBy?.phone && (
                    <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#6B7280', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Phone size={12} /> {selectedRequest.reportedBy?.phone}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default GuardMaintenance;
