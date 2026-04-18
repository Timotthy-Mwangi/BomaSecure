import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import api from '../../services/api';
import { 
  MessageSquare, 
  CheckCircle, 
  Search,
  Filter
} from 'lucide-react';

const AdminGroupComplaints = () => {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    fetchComplaints();
  }, []);

  const fetchComplaints = async () => {
    try {
      const response = await api.get('/feedback', { 
        params: { category: 'complaint', limit: 100 }
      });
      setComplaints(response.data.feedback || []);
    } catch (error) {
      console.error('Error fetching complaints:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async (complaintId) => {
    try {
      await api.put(`/feedback/${complaintId}`, { status: 'resolved' });
      fetchComplaints();
    } catch (error) {
      console.error('Error resolving complaint:', error);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      resolved: { bg: '#10B98120', color: '#10B981', text: 'Resolved' },
      pending: { bg: '#F59E0B20', color: '#F59E0B', text: 'Pending' },
      in_progress: { bg: '#3B82F620', color: '#3B82F6', text: 'In Progress' }
    };
    const style = styles[status] || styles.pending;
    return (
      <span style={{
        padding: '4px 10px',
        borderRadius: '20px',
        fontSize: '11px',
        fontWeight: 600,
        background: style.bg,
        color: style.color
      }}>
        {style.text}
      </span>
    );
  };

  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-KE', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredComplaints = complaints.filter(c => {
    const matchesSearch = c.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.message?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || c.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  return (
    <div style={styles.container}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>Group Complaints 💬</h1>
            <p style={styles.subtitle}>View and manage community complaints</p>
          </div>
        </div>

        <div style={styles.filtersCard}>
          <div style={styles.searchBox}>
            <Search size={18} color="#64748B" />
            <input
              type="text"
              placeholder="Search complaints..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={styles.searchInput}
            />
          </div>
          <div style={styles.filterGroup}>
            <Filter size={18} color="#64748B" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              style={styles.filterSelect}
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div style={styles.loading}>Loading...</div>
        ) : filteredComplaints.length === 0 ? (
          <div style={styles.empty}>
            <MessageSquare size={48} color="#64748B" />
            <p>No complaints found</p>
          </div>
        ) : (
          <div style={styles.list}>
            {filteredComplaints.map((complaint) => (
              <div key={complaint._id} style={styles.card}>
                <div style={styles.cardHeader}>
                  <div style={styles.cardTitle}>
                    <MessageSquare size={18} color="#64748B" />
                    <span>{complaint.subject}</span>
                  </div>
                  {getStatusBadge(complaint.status)}
                </div>
                <p style={styles.description}>{complaint.message}</p>
                <div style={styles.cardFooter}>
                  <div style={styles.meta}>
                    <span style={styles.category}>{complaint.category}</span>
                    <span style={styles.date}>{formatDate(complaint.createdAt)}</span>
                  </div>
                  {complaint.status !== 'resolved' && (
                    <button 
                      onClick={() => handleResolve(complaint._id)}
                      style={styles.resolveBtn}
                    >
                      <CheckCircle size={14} />
                      Mark Resolved
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      <style>{`
        @media (max-width: 768px) {
          .filters-card { flex-direction: column; gap: 12px; }
        }
      `}</style>
    </div>
  );
};

const styles = {
  container: {
    padding: '24px',
    maxWidth: '900px',
    margin: '0 auto',
  },
  header: {
    marginBottom: '24px',
  },
  title: {
    fontSize: '28px',
    fontWeight: 700,
    color: '#F1F5F9',
    margin: 0,
  },
  subtitle: {
    fontSize: '14px',
    color: '#94A3B8',
    marginTop: '4px',
  },
  filtersCard: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '16px',
    marginBottom: '24px',
    padding: '16px',
    background: '#1E293B',
    borderRadius: '12px',
    border: '1px solid #334155',
  },
  searchBox: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 16px',
    background: '#0F172A',
    borderRadius: '8px',
    border: '1px solid #334155',
  },
  searchInput: {
    flex: 1,
    background: 'transparent',
    border: 'none',
    color: '#F1F5F9',
    fontSize: '14px',
    outline: 'none',
  },
  filterGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  filterSelect: {
    padding: '10px 16px',
    background: '#0F172A',
    border: '1px solid #334155',
    borderRadius: '8px',
    color: '#F1F5F9',
    fontSize: '14px',
    cursor: 'pointer',
  },
  loading: {
    textAlign: 'center',
    padding: '40px',
    color: '#64748B',
  },
  empty: {
    textAlign: 'center',
    padding: '60px 20px',
    background: '#1E293B',
    borderRadius: '12px',
    border: '1px solid #334155',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  card: {
    padding: '20px',
    background: '#1E293B',
    borderRadius: '12px',
    border: '1px solid #334155',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: '8px',
    marginBottom: '12px',
  },
  cardTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    fontSize: '16px',
    fontWeight: 600,
    color: '#F1F5F9',
  },
  description: {
    fontSize: '14px',
    color: '#94A3B8',
    marginBottom: '12px',
    lineHeight: 1.5,
  },
  cardFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  meta: {
    display: 'flex',
    gap: '12px',
    fontSize: '12px',
  },
  category: {
    padding: '4px 10px',
    background: '#334155',
    borderRadius: '20px',
    color: '#94A3B8',
    textTransform: 'capitalize',
  },
  date: {
    color: '#64748B',
  },
  resolveBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 14px',
    background: '#10B981',
    border: 'none',
    borderRadius: '6px',
    color: '#fff',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
  },
};

export default AdminGroupComplaints;