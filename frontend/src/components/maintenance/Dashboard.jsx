import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { COLORS } from '../../config';
import { 
  Wrench, 
  Clock,
  User,
  Search,
  Building
} from 'lucide-react';
import { maintenanceAPI } from '../../services/api';
import socketService from '../../services/socket';

const STATUS_OPTIONS = [
  { id: 'pending', label: 'Pending', color: '#F59E0B' },
  { id: 'in_progress', label: 'In Progress', color: '#3B82F6' },
  { id: 'resolved', label: 'Resolved', color: '#10B981' },
  { id: 'cancelled', label: 'Cancelled', color: '#EF4444' }
];

const MaintenanceDashboard = () => {
  useAuth(); // Initialize auth context
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [stats, setStats] = useState({ pending: 0, in_progress: 0, resolved: 0, total: 0 });
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
  }, [fetchRequests]);

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
    };

    const handleMaintenanceDeleted = (data) => {
      setRequests(prev => prev.filter(r => r._id !== data.requestId));
      setStats(prev => ({ ...prev, total: Math.max(0, prev.total - 1) }));
    };

    socketService.onMaintenanceCreated(handleMaintenanceCreated);
    socketService.onMaintenanceNew(handleMaintenanceCreated);
    socketService.onMaintenanceUpdated(handleMaintenanceUpdated);
    socketService.onMaintenanceDeleted(handleMaintenanceDeleted);
    
    socketService.joinAdmin();

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
    width: '100%',
    background: '#1E293B',
    borderRadius: '16px',
    minHeight: 'calc(100vh - 150px)'
  };

  const statCard = (label, value, bgColor, textColor) => ({
    background: '#334155',
    borderRadius: '12px',
    padding: isMobile ? '16px' : '20px',
    minWidth: isMobile ? '100%' : '120px',
    textAlign: 'center',
    boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
  });

  const getStatusBadge = (status) => {
    const statusConfig = STATUS_OPTIONS.find(s => s.id === status);
    if (!statusConfig) return null;
    return (
      <span style={{
        background: statusConfig.color + '20',
        color: statusConfig.color,
        padding: '4px 10px',
        borderRadius: '20px',
        fontSize: '12px',
        fontWeight: 600
      }}>
        {statusConfig.label}
      </span>
    );
  };

  const getPriorityBadge = (priority) => {
    const colors = {
      low: '#10B981',
      medium: '#F59E0B',
      high: '#EF4444',
      emergency: '#DC2626'
    };
    return (
      <span style={{
        color: colors[priority] || colors.medium,
        fontSize: '12px',
        fontWeight: 600,
        textTransform: 'uppercase'
      }}>
        {priority}
      </span>
    );
  };

  return (
    <div style={containerStyle}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ margin: 0, fontSize: isMobile ? '22px' : '28px', color: '#F8FAFC', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Wrench size={28} color={COLORS.primary} />
          Maintenance Dashboard
        </h1>
        <p style={{ margin: '8px 0 0', fontSize: '16px', color: '#94A3B8' }}>
          Manage and track maintenance requests
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '24px' }}>
        <div style={{ ...statCard('Pending', stats.pending, '#FEF3C7', '#92400E'), borderLeft: '4px solid #F59E0B' }}>
          <p style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: '#F59E0B' }}>{stats.pending}</p>
          <p style={{ margin: '4px 0 0', fontSize: '12px', fontWeight: 600, color: '#CBD5E1' }}>PENDING</p>
        </div>
        <div style={{ ...statCard('In Progress', stats.in_progress, '#DBEAFE', '#1E40AF'), borderLeft: '4px solid #3B82F6' }}>
          <p style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: '#3B82F6' }}>{stats.in_progress}</p>
          <p style={{ margin: '4px 0 0', fontSize: '12px', fontWeight: 600, color: '#CBD5E1' }}>IN PROGRESS</p>
        </div>
        <div style={{ ...statCard('Resolved', stats.resolved, '#D1FAE5', '#065F46'), borderLeft: '4px solid #10B981' }}>
          <p style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: '#10B981' }}>{stats.resolved}</p>
          <p style={{ margin: '4px 0 0', fontSize: '12px', fontWeight: 600, color: '#CBD5E1' }}>RESOLVED</p>
        </div>
        <div style={{ ...statCard('Total', stats.total, '#F3F4F6', '#374151'), borderLeft: '4px solid #6B7280' }}>
          <p style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: '#94A3B8' }}>{stats.total}</p>
          <p style={{ margin: '4px 0 0', fontSize: '12px', fontWeight: 600, color: '#CBD5E1' }}>TOTAL</p>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, position: 'relative', minWidth: '200px' }}>
          <Search size={18} color="#9CA3AF" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            placeholder="Search requests..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 12px 12px 44px',
              borderRadius: '12px',
              border: '2px solid #475569',
              fontSize: '14px',
              outline: 'none',
              background: '#334155',
              color: '#F8FAFC'
            }}
          />
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{
            padding: '12px 16px',
            borderRadius: '12px',
            border: '2px solid #475569',
            fontSize: '14px',
            background: filter === 'all' ? '#000000' : '#334155', // Styles the <select> button itself
            color: filter === 'all' ? '#FFFFFF' : '#F8FAFC',     // Styles the <select> button itself
            cursor: 'pointer',
            fontWeight: filter === 'all' ? '600' : 'normal'
          }}
        >
          <option value="all" style={{ background: '#334155', color: '#1E293B' }}>All Status</option>
          <option value="pending" style={{ background: '#334155', color: '#1E293B' }}>Pending</option>
          <option value="in_progress" style={{ background: '#334155', color: '#1E293B' }}>In Progress</option>
          <option value="resolved" style={{ background: '#334155', color: '#1E293B' }}>Resolved</option>
        </select>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          style={{
            padding: '12px 16px',
            borderRadius: '12px',
            border: '2px solid #475569',
            fontSize: '14px',
            background: categoryFilter === 'all' ? '#000000' : '#334155', // Styles the <select> button itself
            color: categoryFilter === 'all' ? '#FFFFFF' : '#F8FAFC',     // Styles the <select> button itself
            cursor: 'pointer',
            fontWeight: categoryFilter === 'all' ? '600' : 'normal'
          }}
        >
          <option value="all" style={{ background: '#334155', color: '#1E293B' }}>All Categories</option>
          <option value="plumbing" style={{ background: '#334155', color: '#1E293B' }}>Plumbing</option>
          <option value="electrical" style={{ background: '#334155', color: '#1E293B' }}>Electrical</option>
          <option value="general" style={{ background: '#334155', color: '#1E293B' }}>General</option>
        </select>
      </div>

      {/* Request List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#94A3B8' }}>Loading...</div>
      ) : filteredRequests.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#94A3B8', background: '#334155', borderRadius: '16px' }}>
          <Wrench size={48} color="#64748B" />
          <p style={{ margin: '12px 0 0', fontSize: '16px' }}>No maintenance requests found</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filteredRequests.map((request) => (
            <motion.div
              key={request._id}
              whileHover={{ scale: 1.01 }}
              onClick={() => setSelectedRequest(request)}
              style={{
                background: '#334155',
                borderRadius: isMobile ? '12px' : '16px',
                padding: isMobile ? '12px' : '16px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                cursor: 'pointer',
                border: '1px solid #475569'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: '#F8FAFC' }}>
                      {request.category?.charAt(0).toUpperCase() + request.category?.slice(1)} Issue
                    </span>
                    {getPriorityBadge(request.priority)}
                  </div>
                  <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#CBD5E1', wordBreak: 'break-word' }}>
                    {request.description}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '12px', color: '#94A3B8' }}>
                    {request.reportedBy?.name && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <User size={12} /> {request.reportedBy.name}
                      </span>
                    )}
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Building size={12} /> {request.apartmentId?.buildingName || 'N/A'}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={12} /> {new Date(request.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  {getStatusBadge(request.status)}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {selectedRequest && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}
          onClick={() => setSelectedRequest(null)}
        >
          <div
            style={{
              background: '#1E293B',
              borderRadius: '16px',
              padding: '24px',
              maxWidth: '500px',
              width: '100%',
              maxHeight: '90vh',
              overflow: 'auto',
              border: '1px solid #475569'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ margin: '0 0 16px 0', fontSize: '20px', fontWeight: 600, color: '#F8FAFC' }}>
              {selectedRequest.category?.charAt(0).toUpperCase() + selectedRequest.category?.slice(1)} Issue
            </h2>
            
            <div style={{ marginBottom: '16px' }}>
              <strong style={{ color: '#94A3B8' }}>Status:</strong> {getStatusBadge(selectedRequest.status)}
            </div>
            
            <div style={{ marginBottom: '16px' }}>
              <strong style={{ color: '#94A3B8' }}>Priority:</strong> {getPriorityBadge(selectedRequest.priority)}
            </div>
            
            <div style={{ marginBottom: '16px' }}>
              <strong style={{ color: '#94A3B8' }}>Description:</strong>
              <p style={{ margin: '8px 0 0 0', color: '#CBD5E1' }}>{selectedRequest.description}</p>
            </div>
            
            <div style={{ marginBottom: '16px' }}>
              <strong style={{ color: '#94A3B8' }}>Reported By:</strong> <span style={{ color: '#F8FAFC' }}>{selectedRequest.reportedBy?.name || 'Unknown'}</span>
            </div>
            
            {selectedRequest.apartmentId && (
              <div style={{ marginBottom: '16px' }}>
                <strong style={{ color: '#94A3B8' }}>Building:</strong> <span style={{ color: '#F8FAFC' }}>{selectedRequest.apartmentId.buildingName || 'N/A'}</span>
              </div>
            )}
            
            {selectedRequest.photos && selectedRequest.photos.length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <strong style={{ color: '#94A3B8' }}>Photos:</strong>
                <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
                  {selectedRequest.photos.map((photo, idx) => (
                    <img 
                      key={idx}
                      src={photo}
                      alt={`Maintenance ${idx + 1}`}
                      style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '8px' }}
                    />
                  ))}
                </div>
              </div>
            )}
            
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '24px' }}>
              {selectedRequest.status !== 'resolved' && (
                <button
                  onClick={() => updateRequestStatus(selectedRequest._id, 'in_progress')}
                  style={{
                    padding: '10px 20px',
                    background: '#3B82F6',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff',
                    cursor: 'pointer',
                    fontWeight: 500
                  }}
                >
                  Start Work
                </button>
              )}
              {selectedRequest.status !== 'resolved' && (
                <button
                  onClick={() => updateRequestStatus(selectedRequest._id, 'resolved')}
                  style={{
                    padding: '10px 20px',
                    background: '#10B981',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff',
                    cursor: 'pointer',
                    fontWeight: 500
                  }}
                >
                  Mark Resolved
                </button>
              )}
              <button
                onClick={() => setSelectedRequest(null)}
                style={{
                  padding: '10px 20px',
                  background: '#475569',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#F8FAFC',
                  cursor: 'pointer',
                  fontWeight: 500
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MaintenanceDashboard;