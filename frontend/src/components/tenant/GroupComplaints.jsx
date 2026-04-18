import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import api from '../../services/api';
import { 
  MessageSquare, 
  Plus
} from 'lucide-react';

const GroupComplaints = () => {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newComplaint, setNewComplaint] = useState({
    title: '',
    description: '',
    category: 'noise'
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchComplaints();
  }, []);

  const fetchComplaints = async () => {
    try {
      const response = await api.get('/feedback?type=complaint');
      setComplaints(response.data.feedback || []);
    } catch (error) {
      console.error('Error fetching complaints:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/feedback', {
        subject: newComplaint.title,
        message: newComplaint.description,
        category: 'complaint'
      });
      setShowModal(false);
      setNewComplaint({ title: '', description: '', category: 'noise' });
      fetchComplaints();
    } catch (error) {
      console.error('Error submitting complaint:', error);
    } finally {
      setSubmitting(false);
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

  const categories = [
    { value: 'noise', label: 'Noise' },
    { value: 'cleanliness', label: 'Cleanliness' },
    { value: 'security', label: 'Security' },
    { value: 'parking', label: 'Parking' },
    { value: 'common_area', label: 'Common Areas' },
    { value: 'other', label: 'Other' }
  ];

  return (
    <div style={styles.container}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>Group Complaints 💬</h1>
            <p style={styles.subtitle}>Report issues affecting your community</p>
          </div>
          <button onClick={() => setShowModal(true)} style={styles.newBtn}>
            <Plus size={18} />
            New Complaint
          </button>
        </div>

        {loading ? (
          <div style={styles.loading}>Loading...</div>
        ) : complaints.length === 0 ? (
          <div style={styles.empty}>
            <MessageSquare size={48} color="#64748B" />
            <p>No complaints yet</p>
            <span>Be the first to report an issue</span>
          </div>
        ) : (
          <div style={styles.list}>
            {complaints.map((complaint) => (
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
                  <span style={styles.category}>
                    {complaint.category}
                  </span>
                  <span style={styles.date}>{formatDate(complaint.createdAt)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {showModal && (
        <div style={styles.modalOverlay} onClick={() => setShowModal(false)}>
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }} 
            animate={{ opacity: 1, scale: 1 }}
            style={styles.modal}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={styles.modalHeader}>
              <h2>New Complaint</h2>
              <button onClick={() => setShowModal(false)} style={styles.closeBtn}>×</button>
            </div>
            <form onSubmit={handleSubmit} style={styles.form}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Title</label>
                <input
                  type="text"
                  value={newComplaint.title}
                  onChange={(e) => setNewComplaint({ ...newComplaint, title: e.target.value })}
                  placeholder="Brief description of the issue"
                  required
                  style={styles.input}
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Category</label>
                <select
                  value={newComplaint.category}
                  onChange={(e) => setNewComplaint({ ...newComplaint, category: e.target.value })}
                  style={styles.input}
                >
                  {categories.map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Description</label>
                <textarea
                  value={newComplaint.description}
                  onChange={(e) => setNewComplaint({ ...newComplaint, description: e.target.value })}
                  placeholder="Provide details about the issue..."
                  required
                  style={{...styles.input, minHeight: '100px'}}
                />
              </div>
              <button 
                type="submit" 
                disabled={submitting}
                style={styles.submitBtn}
              >
                {submitting ? 'Submitting...' : 'Submit Complaint'}
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    padding: '24px',
    maxWidth: '800px',
    margin: '0 auto',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
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
  newBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 16px',
    background: '#2563EB',
    border: 'none',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '14px',
    fontWeight: 500,
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
  modalOverlay: {
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
  },
  modal: {
    background: '#1E293B',
    borderRadius: '16px',
    padding: '24px',
    width: '90%',
    maxWidth: '500px',
    border: '1px solid #334155',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    fontSize: '24px',
    color: '#94A3B8',
    cursor: 'pointer',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  label: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#F1F5F9',
  },
  input: {
    padding: '12px',
    background: '#0F172A',
    border: '1px solid #334155',
    borderRadius: '8px',
    color: '#F1F5F9',
    fontSize: '14px',
  },
  submitBtn: {
    padding: '14px',
    background: '#2563EB',
    border: 'none',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '15px',
    fontWeight: 600,
    cursor: 'pointer',
    marginTop: '8px',
  },
};

export default GroupComplaints;