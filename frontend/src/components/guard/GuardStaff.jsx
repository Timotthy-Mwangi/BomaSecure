import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { 
  Users, 
  Phone, 
  Mail, 
  Clock,
  Shield,
  Search,
  RefreshCw
} from 'lucide-react';
import { authAPI } from '../../services/api';
import socketService from '../../services/socket';

const GuardStaff = () => {
  useAuth(); // Initialize auth context
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  // eslint-disable-next-line no-unused-vars
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [staffMembers, setStaffMembers] = useState([]);

  const fetchStaff = useCallback(async () => {
    try {
      setRefreshing(true);
      // Fetch users with role guard only
      const response = await authAPI.getUsers({ role: 'guard', limit: 50 });
      // Filter only guards - no tenants
      const guardUsers = (response.data.users || []).filter(user => user.role === 'guard');
      
      // Map to staff format
      setStaffMembers(guardUsers.map(user => ({
        id: user._id,
        name: user.name,
        role: 'Security Guard',
        phone: user.phone,
        email: user.email,
        status: user.isActive ? 'on-duty' : 'off-duty',
        shift: 'Assigned',
        avatar: user.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'ST'
      })));
    } catch (err) {
      console.error('Error fetching staff:', err);
      setStaffMembers([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  // Real-time updates for staff changes
  useEffect(() => {
    const handleUserCreated = (data) => {
      if (data.user?.role === 'guard') {
        fetchStaff();
      }
    };

    const handleUserUpdated = (data) => {
      fetchStaff();
    };

    const handleUserDeleted = () => {
      fetchStaff();
    };

    socketService.onUserCreated(handleUserCreated);
    socketService.onUserUpdated(handleUserUpdated);
    socketService.onUserDeleted(handleUserDeleted);
    socketService.joinGuards();

    return () => {
      socketService.removeListener('user:created', handleUserCreated);
      socketService.removeListener('user:updated', handleUserUpdated);
      socketService.removeListener('user:deleted', handleUserDeleted);
    };
  }, [fetchStaff]);

  const filteredStaff = staffMembers.filter(member => {
    const matchesSearch = member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         member.role.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterRole === 'all' || 
                         (filterRole === 'on-duty' && member.status === 'on-duty') ||
                         (filterRole === 'off-duty' && member.status === 'off-duty');
    return matchesSearch && matchesFilter;
  });

  const containerStyle = {
    padding: '24px',
    maxWidth: '1000px',
    margin: '0 auto'
  };

  const cardStyle = {
    background: '#1E293B',
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    marginBottom: '20px'
  };

  const onDutyCount = staffMembers.filter(m => m.status === 'on-duty').length;

  return (
    <div style={containerStyle}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ marginBottom: '24px' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{
              margin: 0,
              fontSize: '28px',
              fontWeight: 700,
              color: '#F1F5F9',
              fontFamily: 'Poppins, sans-serif',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <Users size={32} color="#3B82F6" />
              Staff Directory
            </h1>
            <p style={{
              margin: '8px 0 0',
              fontSize: '16px',
              fontWeight: 600,
              color: '#94A3B8'
            }}>
              Security team members and contacts
            </p>
          </div>
          <button
            onClick={fetchStaff}
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
              gap: '8px',
              transition: 'all 0.2s'
            }}
          >
            <RefreshCw size={18} className={refreshing ? 'spinning' : ''} />
            Refresh
          </button>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="stats-grid" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        marginBottom: '24px'
      }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          style={{
            ...cardStyle,
            background: 'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)',
            color: '#fff'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ margin: 0, fontSize: '14px', fontWeight: 700, opacity: 0.9 }}>On Duty</p>
              <h3 style={{ margin: '8px 0 0', fontSize: '36px', fontWeight: 800 }}>{onDutyCount}</h3>
            </div>
            <Shield size={40} opacity={0.3} />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          style={{ ...cardStyle }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#94A3B8' }}>Total Staff</p>
              <h3 style={{ margin: '8px 0 0', fontSize: '36px', fontWeight: 800, color: '#F1F5F9' }}>{staffMembers.length}</h3>
            </div>
            <Users size={40} color="#3B82F6" />
          </div>
        </motion.div>
      </div>

      {/* Search and Filter */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        style={cardStyle}
      >
        <div style={{
          display: 'flex',
          gap: '12px',
          flexWrap: 'wrap'
        }}>
          <div className="search-input" style={{ flex: 1, minWidth: '200px', position: 'relative' }}>
            <Search size={18} style={{
              position: 'absolute',
              left: '14px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#64748B'
            }} />
            <input
              type="text"
              placeholder="Search staff by name or role..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 12px 12px 44px',
                borderRadius: '12px',
                border: `2px solid #334155`,
                background: '#0F172A',
                fontSize: '15px',
                fontWeight: 600,
                color: '#F1F5F9',
                boxSizing: 'border-box'
              }}
            />
          </div>
          <div className="filter-buttons" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              onClick={() => setFilterRole('all')}
              style={{
                padding: '12px 20px',
                borderRadius: '12px',
                border: 'none',
                background: filterRole === 'all' ? '#3B82F6' : '#334155',
                color: '#fff',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              All
            </button>
            <button
              onClick={() => setFilterRole('on-duty')}
              style={{
                padding: '12px 20px',
                borderRadius: '12px',
                border: 'none',
                background: filterRole === 'on-duty' ? '#22C55E' : '#334155',
                color: '#fff',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              On Duty
            </button>
            <button
              onClick={() => setFilterRole('off-duty')}
              style={{
                padding: '12px 20px',
                borderRadius: '12px',
                border: 'none',
                background: filterRole === 'off-duty' ? '#64748B' : '#334155',
                color: '#fff',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Off Duty
            </button>
          </div>
        </div>
      </motion.div>

      {/* Staff List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        style={cardStyle}
      >
        <h2 style={{ margin: '0 0 16px', fontSize: '20px', fontWeight: 700, color: '#F1F5F9' }}>
          👥 Team Members ({filteredStaff.length})
        </h2>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filteredStaff.map((member) => (
            <div
              className="staff-card"
              key={member.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                padding: '16px',
                background: '#0F172A',
                borderRadius: '12px',
                border: `2px solid ${member.status === 'on-duty' ? '#22C55E30' : 'transparent'}`
              }}
            >
              <div className="staff-avatar" style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: member.status === 'on-duty' ? '#3B82F6' : '#64748B',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontWeight: 800,
                fontSize: '18px',
                flexShrink: 0
              }}>
                {member.avatar}
              </div>
              
              <div className="staff-info" style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: '#F1F5F9' }}>
                    {member.name}
                  </h3>
                  <span style={{
                    padding: '2px 10px',
                    borderRadius: '20px',
                    fontSize: '11px',
                    fontWeight: 700,
                    background: member.status === 'on-duty' ? '#22C55E20' : '#6B728020',
                    color: member.status === 'on-duty' ? '#22C55E' : '#94A3B8',
                    textTransform: 'capitalize'
                  }}>
                    {member.status}
                  </span>
                </div>
                <p style={{ margin: '4px 0 0', fontSize: '14px', fontWeight: 600, color: '#94A3B8' }}>
                  {member.role}
                </p>
                <div style={{ display: 'flex', gap: '16px', marginTop: '6px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: '#64748B', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Clock size={14} /> {member.shift}
                  </span>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: '#22C55E', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    📱 {member.phone}
                  </span>
                </div>
              </div>

              <div className="staff-actions" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <a
                  href={`tel:${member.phone}`}
                  style={{
                    padding: '10px 16px',
                    background: '#22C55E',
                    borderRadius: '10px',
                    color: '#fff',
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '14px',
                    gap: '6px',
                    boxShadow: '0 2px 8px rgba(34, 197, 94, 0.3)'
                  }}
                  title="Call"
                >
                  <Phone size={18} />
                  Call
                </a>
                <a
                  href={`mailto:${member.email}`}
                  style={{
                    padding: '10px 16px',
                    background: '#3B82F6',
                    borderRadius: '10px',
                    color: '#fff',
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '14px',
                    gap: '6px'
                  }}
                  title="Email"
                >
                  <Mail size={18} />
                  Email
                </a>
              </div>
            </div>
          ))}
        </div>

        {filteredStaff.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px', color: '#64748B' }}>
            <Users size={48} style={{ opacity: 0.5, marginBottom: '12px' }} />
            <p style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>No staff members found</p>
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
        @media (max-width: 768px) {
          div[style*="maxWidth: 1000px"] {
            padding: 16px !important;
          }
          h1[style*="fontSize: 28px"] {
            fontSize: 22px !important;
          }
          div[style*="flexWrap: 'wrap'"] {
            flex-direction: column !important;
          }
          button[style*="fontWeight: 700"] {
            padding: 10px 14px !important;
            font-size: 13px !important;
          }
          div[style*="display: 'flex', gap: '16px'"] {
            flex-direction: column !important;
          }
          div[style*="display: 'flex', gap: '8px'"] {
            flex-wrap: wrap !important;
          }
        }
        @media (max-width: 640px) {
          /* Staff card responsive layout */
          .staff-card {
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 12px !important;
          }
          .staff-avatar {
            width: 48px !important;
            height: 48px !important;
            font-size: 16px !important;
          }
          .staff-info {
            width: 100% !important;
          }
          .staff-actions {
            width: 100% !important;
            justify-content: stretch !important;
          }
          .staff-actions a {
            flex: 1 !important;
            justify-content: center !important;
            padding: 10px 12px !important;
            font-size: 13px !important;
          }
          /* Filter buttons */
          .filter-buttons {
            width: 100% !important;
            justify-content: flex-start !important;
          }
          .filter-buttons button {
            flex: 1 !important;
            padding: 8px 12px !important;
            font-size: 12px !important;
          }
          /* Search */
          .search-input {
            width: 100% !important;
          }
          /* Stats */
          .stats-grid {
            grid-template-columns: 1fr !important;
          }
        }
        @media (max-width: 480px) {
          div[style*="display: 'flex', gap: '16px'"] > div:last-child {
            justify-content: flex-start !important;
          }
          /* Make title smaller on very small screens */
          h1 {
            font-size: 20px !important;
          }
          h1 svg {
            width: 24px !important;
            height: 24px !important;
          }
          /* Smaller padding on cards */
          .staff-card > div {
            padding: 12px !important;
          }
        }
      `}</style>
    </div>
  );
};

export default GuardStaff;
