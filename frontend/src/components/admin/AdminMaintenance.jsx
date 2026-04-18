import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { COLORS } from '../../config';
import { 
  Wrench, 
  XCircle,
  Clock,
  User,
  Phone,
  Search,
  Building,
  Calendar
} from 'lucide-react';
import { maintenanceAPI } from '../../services/api';
import socketService from '../../services/socket';

const MAINTENANCE_CATEGORIES = [
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

const AdminMaintenance = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [stats, setStats] = useState({ pending: 0, in_progress: 0, resolved: 0, total: 0 });
  const [staff, setStaff] = useState([]);
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
      const allRequests = response.data.requests || [];
      setRequests(allRequests);
      
      setStats({
        pending: allRequests.filter(r => r.status === 'pending').length,
        in_progress: allRequests.filter(r => r.status === 'in_progress').length,
        resolved: allRequests.filter(r => r.status === 'resolved').length,
        total: allRequests.length
      });
    } catch (err) {
      console.error('Error fetching requests:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
    fetchStaff();
  }, [fetchRequests]);

  const fetchStaff = async () => {
    try {
      const response = await maintenanceAPI.getStaff();
      if (response.data?.staff) {
        setStaff(response.data.staff);
      }
    } catch (err) {
      console.error('Error fetching staff:', err);
    }
  };

  // Real-time updates
  useEffect(() => {
    const handleMaintenanceCreated = (data) => {
      const request = data.request || data;
      setRequests(prev => {
        if (prev.some(r => r._id === request._id)) return prev;
        return [request, ...prev];
      });
      setStats(prev => ({ ...prev, total: prev.total + 1, pending: prev.pending + 1 }));
    };

    const handleMaintenanceUpdated = (data) => {
      const updatedRequest = data.request || data;
      setRequests(prev => prev.map(r => r._id === updatedRequest._id ? updatedRequest : r));
      setStats(prev => {
        let pending = prev.pending;
        let in_progress = prev.in_progress;
        let resolved = prev.resolved;
        
        const oldRequest = prev.requests?.find(r => r._id === updatedRequest._id);
        if (oldRequest) {
          if (oldRequest.status === 'pending' && updatedRequest.status !== 'pending') pending = Math.max(0, pending - 1);
          if (oldRequest.status !== 'pending' && updatedRequest.status === 'pending') pending += 1;
          if (oldRequest.status === 'in_progress' && updatedRequest.status !== 'in_progress') in_progress = Math.max(0, in_progress - 1);
          if (oldRequest.status !== 'in_progress' && updatedRequest.status === 'in_progress') in_progress += 1;
          if (oldRequest.status === 'resolved' && updatedRequest.status !== 'resolved') resolved = Math.max(0, resolved - 1);
          if (oldRequest.status !== 'resolved' && updatedRequest.status === 'resolved') resolved += 1;
        }
        
        return { ...prev, pending, in_progress, resolved };
      });
    };

    const handleMaintenanceDeleted = (data) => {
      setRequests(prev => prev.filter(r => r._id !== data.requestId));
      setStats(prev => ({ ...prev, total: Math.max(0, prev.total - 1) }));
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateRequestStatus = async (requestId, newStatus) => {
    try {
      await maintenanceAPI.updateStatus(requestId, { status: newStatus });
      fetchRequests();
      setSelectedRequest(null);
    } catch (err) {
      console.error('Error updating request:', err);
    }
  };

  const assignStaff = async (requestId, staffId) => {
    try {
      await maintenanceAPI.update(requestId, { assignedTo: staffId || null });
      fetchRequests();
      setSelectedRequest(prev => prev ? { ...prev, assignedTo: staffId ? staff.find(s => s._id === staffId) : null } : null);
    } catch (err) {
      console.error('Error assigning staff:', err);
    }
  };

  const filteredRequests = requests.filter(r => {
    const matchesFilter = filter === 'all' || r.status === filter;
    const matchesCategory = categoryFilter === 'all' || r.category === categoryFilter;
    const matchesSearch = !searchTerm || 
      r.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.reportedBy?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesCategory && matchesSearch;
  });

  const containerStyle = {
    padding: isMobile ? '12px' : '20px',
    maxWidth: '1200px',
    margin: '0 auto',
    width: '100%'
  };

  const statCard = (label, value, color, bgColor) => ({
    background: bgColor,
    borderRadius: '12px',
    padding: isMobile ? '16px' : '20px',
    flex: 1,
    minWidth: isMobile ? '100%' : '120px',
    textAlign: 'center'
  });

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
          Maintenance Management
        </h1>
        <p style={{ margin: '8px 0 0', fontSize: '16px', fontWeight: 600, color: '#4B5563' }}>
          Monitor and manage all maintenance requests across properties
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        style={{ 
          display: 'flex', 
          flexWrap: 'wrap', 
          gap: '12px', 
          marginBottom: '20px' 
        }}
      >
        <div style={{ ...statCard('Pending', stats.pending, '#F59E0B', '#FEF3C7'), borderLeft: '4px solid #F59E0B' }}>
          <p style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: '#92400E' }}>{stats.pending}</p>
          <p style={{ margin: '4px 0 0', fontSize: '12px', fontWeight: 600, color: '#92400E' }}>PENDING</p>
        </div>
        <div style={{ ...statCard('In Progress', stats.in_progress, '#3B82F6', '#DBEAFE'), borderLeft: '4px solid #3B82F6' }}>
          <p style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: '#1E40AF' }}>{stats.in_progress}</p>
          <p style={{ margin: '4px 0 0', fontSize: '12px', fontWeight: 600, color: '#1E40AF' }}>IN PROGRESS</p>
        </div>
        <div style={{ ...statCard('Resolved', stats.resolved, '#10B981', '#D1FAE5'), borderLeft: '4px solid #10B981' }}>
          <p style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: '#065F46' }}>{stats.resolved}</p>
          <p style={{ margin: '4px 0 0', fontSize: '12px', fontWeight: 600, color: '#065F46' }}>RESOLVED</p>
        </div>
        <div style={{ ...statCard('Total', stats.total, '#6B7280', '#F3F4F6'), borderLeft: '4px solid #6B7280' }}>
          <p style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: '#374151' }}>{stats.total}</p>
          <p style={{ margin: '4px 0 0', fontSize: '12px', fontWeight: 600, color: '#374151' }}>TOTAL</p>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        style={{
          background: '#FFFFFF',
          borderRadius: isMobile ? '12px' : '16px',
          padding: isMobile ? '12px' : '16px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          marginBottom: '16px'
        }}
      >
        <div style={{ 
          display: 'flex', 
          flexDirection: isMobile ? 'column' : 'row', 
          gap: '12px',
          marginBottom: '12px'
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
              placeholder="Search by description, category, or resident..."
              style={{
                width: '100%',
                padding: '12px 12px 12px 44px',
                borderRadius: '12px',
                border: '2px solid #9CA3AF',
                fontSize: '14px',
                outline: 'none',
                background: '#F9FAFB',
                color: '#1F2937',
                fontWeight: 500
              }}
            />
          </div>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            style={{
              padding: '10px 14px',
              borderRadius: '12px',
              border: '2px solid #9CA3AF',
              fontSize: '14px',
              background: '#F9FAFB',
              color: '#1F2937',
              cursor: 'pointer',
              minWidth: '140px',
              fontWeight: 500
            }}
          >
            <option value="all">All Status</option>
            {STATUS_OPTIONS.map(status => (
              <option key={status.id} value={status.id}>{status.label}</option>
            ))}
          </select>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            style={{
              padding: '10px 14px',
              borderRadius: '12px',
              border: '2px solid #9CA3AF',
              fontSize: '14px',
              background: '#F9FAFB',
              color: '#1F2937',
              cursor: 'pointer',
              minWidth: '140px',
              fontWeight: 500
            }}
          >
            <option value="all">All Categories</option>
            {MAINTENANCE_CATEGORIES.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.label}</option>
            ))}
          </select>
        </div>
        <span style={{ fontSize: '13px', color: '#6B7280' }}>
          {filteredRequests.length} of {requests.length} requests
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
          style={{
            background: '#FFFFFF',
            borderRadius: isMobile ? '12px' : '16px',
            padding: '40px',
            textAlign: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
          }}
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
              transition={{ delay: index * 0.03 }}
              onClick={() => setSelectedRequest(request)}
              style={{
                background: '#FFFFFF',
                borderRadius: isMobile ? '12px' : '16px',
                padding: isMobile ? '16px' : '20px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                cursor: 'pointer',
                border: selectedRequest?._id === request._id ? `2px solid ${COLORS.primary}` : '2px solid transparent'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                    <span style={{
                      background: PRIORITY_LEVELS[request.priority]?.color + '20',
                      color: PRIORITY_LEVELS[request.priority]?.color,
                      padding: '4px 10px',
                      borderRadius: '20px',
                      fontSize: '11px',
                      fontWeight: 600
                    }}>
                      {PRIORITY_LEVELS[request.priority]?.label}
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
                    <span style={{
                      background: '#E5E7EB',
                      color: '#4B5563',
                      padding: '4px 10px',
                      borderRadius: '20px',
                      fontSize: '11px',
                      fontWeight: 600
                    }}>
                      {MAINTENANCE_CATEGORIES.find(c => c.id === request.category)?.label || request.category}
                    </span>
                  </div>
                  <h3 style={{ margin: '0 0 8px', fontSize: '16px', fontWeight: 600, color: '#1F2937' }}>
                    {request.description?.substring(0, 100)}{request.description?.length > 100 ? '...' : ''}
                  </h3>
                  <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '13px', color: '#6B7280', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <User size={12} /> {request.reportedBy?.name || 'Unknown'}
                    </span>
                    {request.reportedBy?.apartmentId?.buildingName && (
                      <span style={{ fontSize: '13px', color: '#6B7280', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Building size={12} /> {request.reportedBy.apartmentId.buildingName}
                      </span>
                    )}
                    <span style={{ fontSize: '13px', color: '#9CA3AF', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Calendar size={12} /> {new Date(request.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
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
              maxHeight: '85vh',
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

            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
              <span style={{
                background: PRIORITY_LEVELS[selectedRequest.priority]?.color + '20',
                color: PRIORITY_LEVELS[selectedRequest.priority]?.color,
                padding: '4px 12px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: 600
              }}>
                {PRIORITY_LEVELS[selectedRequest.priority]?.label}
              </span>
              <span style={{
                background: STATUS_OPTIONS.find(s => s.id === selectedRequest.status)?.color + '20',
                color: STATUS_OPTIONS.find(s => s.id === selectedRequest.status)?.color,
                padding: '4px 12px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: 600,
                textTransform: 'capitalize'
              }}>
                {selectedRequest.status}
              </span>
              <span style={{
                background: '#E5E7EB',
                color: '#4B5563',
                padding: '4px 12px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: 600
              }}>
                {MAINTENANCE_CATEGORIES.find(c => c.id === selectedRequest.category)?.label || selectedRequest.category}
              </span>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: 600, color: '#1F2937' }}>
                Description
              </h3>
              <p style={{ margin: 0, fontSize: '14px', color: '#4B5563', lineHeight: 1.6 }}>
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
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  background: COLORS.primary + '15',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <User size={24} color={COLORS.primary} />
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#1F2937' }}>
                    {selectedRequest.reportedBy?.name || 'Unknown'}
                  </p>
                  <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
                    {selectedRequest.reportedBy?.phone && (
                      <span style={{ fontSize: '13px', color: '#6B7280', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Phone size={12} /> {selectedRequest.reportedBy?.phone}
                      </span>
                    )}
                    {selectedRequest.reportedBy?.apartmentId?.buildingName && (
                      <span style={{ fontSize: '13px', color: '#6B7280', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Building size={12} /> {selectedRequest.reportedBy.apartmentId.buildingName}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div style={{ 
              padding: '16px', 
              background: selectedRequest.assignedTo ? '#D1FAE5' : '#F3F4F6', 
              borderRadius: '12px',
              border: `1px solid ${selectedRequest.assignedTo ? '#10B981' : '#D1D5DB'}`,
              marginBottom: '20px' 
            }}>
              <h4 style={{ margin: '0 0 12px', fontSize: '14px', fontWeight: 600, color: selectedRequest.assignedTo ? '#065F46' : '#6B7280' }}>
                ASSIGNED TECHNICIAN
              </h4>
              {selectedRequest.assignedTo ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '20px',
                    background: '#10B981',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <User size={20} color="#FFFFFF" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#065F46' }}>
                      {selectedRequest.assignedTo?.name || 'Assigned'}
                    </p>
                    {selectedRequest.assignedTo?.rating && (
                      <span style={{ fontSize: '12px', color: '#047857' }}>
                        ★ {selectedRequest.assignedTo.rating.toFixed(1)} ({selectedRequest.assignedTo.ratingCount} reviews)
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => assignStaff(selectedRequest._id, null)}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: 'none',
                      background: '#DC2626',
                      color: '#FFFFFF',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <select
                  value=""
                  onChange={(e) => assignStaff(selectedRequest._id, e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '2px solid #D1D5DB',
                    fontSize: '14px',
                    background: '#FFFFFF',
                    color: '#1F2937',
                    cursor: 'pointer'
                  }}
                >
                  <option value="">Select a technician...</option>
                  {staff.map(s => (
                    <option key={s._id} value={s._id}>{s.name} ({s.specialization || 'General'})</option>
                  ))}
                </select>
              )}
            </div>

            <div style={{ 
              padding: '16px', 
              background: '#FEF3C7', 
              borderRadius: '12px',
              border: '1px solid #F59E0B',
              marginBottom: '20px' 
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock size={16} color="#92400E" />
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#92400E' }}>
                  Submitted: {new Date(selectedRequest.createdAt).toLocaleString()}
                </span>
              </div>
            </div>

            <h4 style={{ margin: '0 0 12px', fontSize: '14px', fontWeight: 600, color: '#6B7280' }}>
              UPDATE STATUS
            </h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {STATUS_OPTIONS.map(status => (
                <button
                  key={status.id}
                  onClick={() => updateRequestStatus(selectedRequest._id, status.id)}
                  disabled={selectedRequest.status === status.id}
                  style={{
                    padding: '12px 20px',
                    borderRadius: '20px',
                    border: 'none',
                    background: selectedRequest.status === status.id ? status.color : status.color + '20',
                    color: selectedRequest.status === status.id ? '#FFFFFF' : status.color,
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: selectedRequest.status === status.id ? 'default' : 'pointer'
                  }}
                >
                  {status.label}
                </button>
              ))}
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

export default AdminMaintenance;
