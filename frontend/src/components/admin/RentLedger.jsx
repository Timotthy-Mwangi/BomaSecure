import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { rentLedgerAPI } from '../../services/api';
import { 
  DollarSign, 
  Calendar, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Download,
  RefreshCw,
  Plus,
  Edit,
  Trash2,
  X,
  Search,
  Filter,
  FileText
} from 'lucide-react';

const RentLedger = () => {
  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [formData, setFormData] = useState({
    tenantId: '',
    period: { month: new Date().getMonth() + 1, year: new Date().getFullYear() },
    rentAmount: '',
    amountPaid: '',
    dueDate: '',
    paymentMethod: 'manual',
    reference: '',
    notes: ''
  });

  const fetchLedger = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filterStatus !== 'all') params.status = filterStatus;
      const response = await rentLedgerAPI.getAll(params);
      setRecords(response.data.data || []);
      setSummary(response.data.summary);
    } catch (error) {
      console.error('Error fetching rent ledger:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLedger();
  }, [filterStatus]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = {
        ...formData,
        period: formData.period,
        rentAmount: parseFloat(formData.rentAmount),
        amountPaid: parseFloat(formData.amountPaid) || 0,
        dueDate: new Date(formData.dueDate)
      };
      
      if (editingRecord) {
        await rentLedgerAPI.updateRecord(editingRecord._id, data);
      } else {
        await rentLedgerAPI.createRecord(data);
      }
      
      setShowModal(false);
      setEditingRecord(null);
      setFormData({
        tenantId: '',
        period: { month: new Date().getMonth() + 1, year: new Date().getFullYear() },
        rentAmount: '',
        amountPaid: '',
        dueDate: '',
        paymentMethod: 'manual',
        reference: '',
        notes: ''
      });
      fetchLedger();
    } catch (error) {
      console.error('Error saving rent record:', error);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this record?')) return;
    try {
      await rentLedgerAPI.deleteRecord(id);
      fetchLedger();
    } catch (error) {
      console.error('Error deleting record:', error);
    }
  };

  const handleExport = async (format) => {
    try {
      const response = await rentLedgerAPI.generateReport({ format });
      if (format === 'csv') {
        const blob = new Blob([response.data], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `rent-ledger-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
      }
    } catch (error) {
      console.error('Error exporting report:', error);
    }
  };

  const handleApplyLateFees = async () => {
    try {
      const lateFeePercent = prompt('Enter late fee percentage (default 10%):', '10');
      if (lateFeePercent === null) return;
      await rentLedgerAPI.applyLateFees(parseInt(lateFeePercent) || 10);
      fetchLedger();
      alert('Late fees applied successfully');
    } catch (error) {
      console.error('Error applying late fees:', error);
    }
  };

  const handleTriggerReminders = async () => {
    try {
      await rentLedgerAPI.triggerReminders();
      alert('Reminders sent successfully');
    } catch (error) {
      console.error('Error sending reminders:', error);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      paid: { bg: '#10B98120', color: '#10B981', text: 'Paid' },
      partial: { bg: '#F59E0B20', color: '#F59E0B', text: 'Partial' },
      pending: { bg: '#3B82F620', color: '#3B82F6', text: 'Pending' },
      overdue: { bg: '#EF444420', color: '#EF4444', text: 'Overdue' }
    };
    const style = styles[status] || styles.pending;
    return (
      <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, background: style.bg, color: style.color }}>
        {style.text}
      </span>
    );
  };

  const formatCurrency = (amount) => `KES ${(amount || 0).toLocaleString()}`;
  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-KE', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const filteredRecords = records.filter(r => {
    if (!searchTerm) return true;
    const tenant = r.tenantId;
    const search = searchTerm.toLowerCase();
    return tenant?.name?.toLowerCase().includes(search) || 
           tenant?.email?.toLowerCase().includes(search) || 
           tenant?.roomNumber?.toLowerCase().includes(search);
  });

  return (
    <div style={{ padding: '20px', background: '#0F172A', minHeight: '100vh', color: '#F1F5F9' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700 }}>Rent Ledger</h1>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => handleExport('csv')} style={btnStyle}>
            <Download size={16} /> Export CSV
          </button>
          <button onClick={handleTriggerReminders} style={btnStyle}>
            <RefreshCw size={16} /> Send Reminders
          </button>
          <button onClick={handleApplyLateFees} style={btnStyle}>
            <AlertCircle size={16} /> Apply Late Fees
          </button>
          <button onClick={() => setShowModal(true)} style={{ ...btnStyle, background: '#3B82F6' }}>
            <Plus size={16} /> Add Record
          </button>
        </div>
      </div>

      {summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px', marginBottom: '20px' }}>
          <div style={cardStyle}>
            <DollarSign size={20} color="#3B82F6" />
            <div>
              <p style={{ fontSize: '12px', color: '#64748B' }}>Total Rent</p>
              <p style={{ fontSize: '20px', fontWeight: 700 }}>{formatCurrency(summary.totalRent)}</p>
            </div>
          </div>
          <div style={cardStyle}>
            <CheckCircle size={20} color="#10B981" />
            <div>
              <p style={{ fontSize: '12px', color: '#64748B' }}>Total Paid</p>
              <p style={{ fontSize: '20px', fontWeight: 700 }}>{formatCurrency(summary.totalPaid)}</p>
            </div>
          </div>
          <div style={cardStyle}>
            <Clock size={20} color="#F59E0B" />
            <div>
              <p style={{ fontSize: '12px', color: '#64748B' }}>Pending</p>
              <p style={{ fontSize: '20px', fontWeight: 700 }}>{formatCurrency(summary.totalBalance)}</p>
            </div>
          </div>
          <div style={cardStyle}>
            <AlertCircle size={20} color="#EF4444" />
            <div>
              <p style={{ fontSize: '12px', color: '#64748B' }}>Overdue</p>
              <p style={{ fontSize: '20px', fontWeight: 700 }}>{summary.overdueCount || 0}</p>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748B' }} />
          <input
            type="text"
            placeholder="Search tenants..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ ...inputStyle, paddingLeft: '40px' }}
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          style={inputStyle}
        >
          <option value="all">All Status</option>
          <option value="paid">Paid</option>
          <option value="partial">Partial</option>
          <option value="pending">Pending</option>
          <option value="overdue">Overdue</option>
        </select>
      </div>

      <div style={{ background: '#1E293B', borderRadius: '12px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#0F172A' }}>
              <th style={thStyle}>Period</th>
              <th style={thStyle}>Tenant</th>
              <th style={thStyle}>Unit</th>
              <th style={thStyle}>Rent</th>
              <th style={thStyle}>Paid</th>
              <th style={thStyle}>Balance</th>
              <th style={thStyle}>Late Fee</th>
              <th style={thStyle}>Due Date</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="10" style={{ ...tdStyle, textAlign: 'center' }}>Loading...</td></tr>
            ) : filteredRecords.length === 0 ? (
              <tr><td colSpan="10" style={{ ...tdStyle, textAlign: 'center' }}>No records found</td></tr>
            ) : filteredRecords.map((record) => (
              <tr key={record._id} style={{ borderBottom: '1px solid #334155' }}>
                <td style={tdStyle}>{record.period?.month}/{record.period?.year}</td>
                <td style={tdStyle}>{record.tenantId?.name || '-'}</td>
                <td style={tdStyle}>{record.unitNumber || record.tenantId?.roomNumber || '-'}</td>
                <td style={{ ...tdStyle, fontWeight: 600 }}>{formatCurrency(record.rentAmount)}</td>
                <td style={{ ...tdStyle, color: '#10B981' }}>{formatCurrency(record.amountPaid)}</td>
                <td style={{ ...tdStyle, fontWeight: 600, color: record.balance > 0 ? '#EF4444' : '#10B981' }}>
                  {formatCurrency(record.balance)}
                </td>
                <td style={{ ...tdStyle, color: record.lateFee > 0 ? '#EF4444' : '#64748B' }}>
                  {record.lateFee > 0 ? formatCurrency(record.lateFee) : '-'}
                </td>
                <td style={tdStyle}>{formatDate(record.dueDate)}</td>
                <td style={tdStyle}>{getStatusBadge(record.status)}</td>
                <td style={tdStyle}>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => { setEditingRecord(record); setShowModal(true); }} style={iconBtnStyle}>
                      <Edit size={14} />
                    </button>
                    <button onClick={() => handleDelete(record._id)} style={{ ...iconBtnStyle, color: '#EF4444' }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}
          >
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} style={{ background: '#1E293B', padding: '30px', borderRadius: '12px', width: '500px', maxWidth: '90vw' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 700 }}>{editingRecord ? 'Edit' : 'Add'} Rent Record</h2>
                <button onClick={() => { setShowModal(false); setEditingRecord(null); }} style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer' }}>
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleSubmit}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: '#64748B', marginBottom: '5px' }}>Tenant ID</label>
                    <input
                      type="text"
                      value={formData.tenantId}
                      onChange={(e) => setFormData({ ...formData, tenantId: e.target.value })}
                      style={inputStyle}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: '#64748B', marginBottom: '5px' }}>Unit Number</label>
                    <input
                      type="text"
                      value={formData.unitNumber}
                      onChange={(e) => setFormData({ ...formData, unitNumber: e.target.value })}
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: '#64748B', marginBottom: '5px' }}>Month</label>
                    <select
                      value={formData.period.month}
                      onChange={(e) => setFormData({ ...formData, period: { ...formData.period, month: parseInt(e.target.value) } })}
                      style={inputStyle}
                    >
                      {Array.from({ length: 12 }, (_, i) => (
                        <option key={i + 1} value={i + 1}>{i + 1}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: '#64748B', marginBottom: '5px' }}>Year</label>
                    <input
                      type="number"
                      value={formData.period.year}
                      onChange={(e) => setFormData({ ...formData, period: { ...formData.period, year: parseInt(e.target.value) } })}
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: '#64748B', marginBottom: '5px' }}>Rent Amount</label>
                    <input
                      type="number"
                      value={formData.rentAmount}
                      onChange={(e) => setFormData({ ...formData, rentAmount: e.target.value })}
                      style={inputStyle}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: '#64748B', marginBottom: '5px' }}>Amount Paid</label>
                    <input
                      type="number"
                      value={formData.amountPaid}
                      onChange={(e) => setFormData({ ...formData, amountPaid: e.target.value })}
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: '#64748B', marginBottom: '5px' }}>Due Date</label>
                    <input
                      type="date"
                      value={formData.dueDate}
                      onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                      style={inputStyle}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: '#64748B', marginBottom: '5px' }}>Payment Method</label>
                    <select
                      value={formData.paymentMethod}
                      onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                      style={inputStyle}
                    >
                      <option value="manual">Manual</option>
                      <option value="mpesa">M-Pesa</option>
                      <option value="bank">Bank</option>
                      <option value="cash">Cash</option>
                      <option value="cheque">Cheque</option>
                    </select>
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ display: 'block', fontSize: '12px', color: '#64748B', marginBottom: '5px' }}>Reference</label>
                    <input
                      type="text"
                      value={formData.reference}
                      onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                      style={inputStyle}
                    />
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ display: 'block', fontSize: '12px', color: '#64748B', marginBottom: '5px' }}>Notes</label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }}
                    />
                  </div>
                </div>
                <button type="submit" style={{ ...btnStyle, width: '100%', marginTop: '20px', background: '#3B82F6' }}>
                  {editingRecord ? 'Update' : 'Create'} Record
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const cardStyle = {
  background: '#1E293B',
  padding: '20px',
  borderRadius: '12px',
  display: 'flex',
  alignItems: 'center',
  gap: '15px'
};

const btnStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  padding: '10px 16px',
  background: '#1E293B',
  border: 'none',
  borderRadius: '8px',
  color: '#F1F5F9',
  fontSize: '14px',
  fontWeight: 500,
  cursor: 'pointer',
  transition: 'all 0.2s'
};

const inputStyle = {
  width: '100%',
  padding: '12px',
  background: '#0F172A',
  border: '1px solid #334155',
  borderRadius: '8px',
  color: '#F1F5F9',
  fontSize: '14px',
  outline: 'none'
};

const thStyle = {
  padding: '15px',
  textAlign: 'left',
  fontSize: '12px',
  fontWeight: 600,
  color: '#64748B',
  textTransform: 'uppercase'
};

const tdStyle = {
  padding: '15px',
  fontSize: '14px'
};

const iconBtnStyle = {
  padding: '8px',
  background: '#0F172A',
  border: 'none',
  borderRadius: '6px',
  color: '#64748B',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center'
};

export default RentLedger;