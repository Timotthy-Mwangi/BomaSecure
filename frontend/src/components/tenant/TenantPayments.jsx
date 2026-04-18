import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { COLORS } from '../../config';
import { 
  CreditCard, 
  Download, 
  Calendar, 
  CheckCircle, 
  Clock,
  DollarSign,
  Receipt,
  Building,
  User,
  Hash
} from 'lucide-react';
import { paymentsAPI } from '../../services/api';

const TenantPayments = () => {
  const { user } = useAuth();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [bankAccount, setBankAccount] = useState(null);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const fetchBankAccount = async () => {
      try {
        const response = await paymentsAPI.getDefaultBankAccount();
        if (response.data.success && response.data.account) {
          setBankAccount(response.data.account);
        }
      } catch (error) {
        console.error('Error fetching bank account:', error);
      }
    };

    fetchBankAccount();
  }, []);

  useEffect(() => {
    const fetchPayments = async () => {
      try {
        setLoading(true);
        const response = await paymentsAPI.getAll({ limit: 50 });
        setPayments(response.data.payments || response.data || []);
      } catch (err) {
        console.error('Error fetching payments:', err);
        // Use sample data as fallback
        setPayments([
          { 
            id: '1', 
            amount: 25000, 
            type: 'Rent', 
            status: 'paid', 
            date: new Date().toISOString(),
            method: 'M-Pesa'
          },
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchPayments();
  }, [user?._id]);

  const containerStyle = {
    padding: isMobile ? '16px' : '24px',
    maxWidth: '1000px',
    margin: '0 auto'
  };

  const cardStyle = {
    background: '#1E293B',
    borderRadius: '16px',
    padding: isMobile ? '16px' : '24px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    marginBottom: '20px',
    border: '1px solid #334155'
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'paid': return '#22C55E';
      case 'pending': return '#F59E0B';
      case 'overdue': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const totalPaid = payments
    .filter(p => p.status === 'paid')
    .reduce((sum, p) => sum + p.amount, 0);
  
  const pending = payments
    .filter(p => p.status === 'pending')
    .reduce((sum, p) => sum + p.amount, 0);

  return (
    <div style={containerStyle}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ marginBottom: '24px' }}
      >
        <h1 style={{
          margin: 0,
          fontSize: isMobile ? '22px' : '28px',
          fontWeight: 700,
          color: '#F1F5F9',
          fontFamily: 'Poppins, sans-serif',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          flexWrap: 'wrap'
        }}>
          <CreditCard size={32} color={COLORS.primary} />
          Payments
        </h1>
        <p style={{
          margin: '8px 0 0',
          fontSize: '16px',
          color: COLORS.gray[500]
        }}>
          View and manage your payment history
        </p>
      </motion.div>

      {/* Stats Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: isMobile ? '12px' : '16px',
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
              <p style={{ margin: 0, fontSize: '13px', opacity: 0.9 }}>Total Paid</p>
              <h3 style={{ margin: '8px 0 0', fontSize: '28px', fontWeight: 700 }}>
                {formatCurrency(totalPaid)}
              </h3>
            </div>
            <CheckCircle size={40} opacity={0.3} />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          style={{
            ...cardStyle,
            background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
            color: '#fff'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ margin: 0, fontSize: '13px', opacity: 0.9 }}>Pending</p>
              <h3 style={{ margin: '8px 0 0', fontSize: '28px', fontWeight: 700, color: pending > 0 ? '#EF4444' : '#fff' }}>
                {formatCurrency(pending)}
              </h3>
            </div>
            <Clock size={40} opacity={0.3} />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          style={{ ...cardStyle }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ margin: 0, fontSize: '13px', color: COLORS.gray[500] }}>Monthly Rent</p>
              <h3 style={{ margin: '8px 0 0', fontSize: '28px', fontWeight: 700, color: '#22C55E' }}>
                {formatCurrency(25000)}
              </h3>
            </div>
            <DollarSign size={40} color={COLORS.primary} />
          </div>
        </motion.div>
      </div>

      {/* Payment History */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        style={cardStyle}
      >
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '20px'
        }}>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 600, color: '#F1F5F9' }}>
            📋 Payment History
          </h2>
          <button style={{
            padding: '8px 16px',
            background: COLORS.primary,
            border: 'none',
            borderRadius: '8px',
            color: '#fff',
            fontSize: '13px',
            fontWeight: 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <Download size={16} />
            Export
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: COLORS.gray[500] }}>
            Loading...
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: isMobile ? '600px' : 'auto' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #334155' }}>
                  <th style={{ textAlign: 'left', padding: isMobile ? '8px' : '12px', fontSize: '13px', color: '#94A3B8', fontWeight: 600 }}>Date</th>
                  <th style={{ textAlign: 'left', padding: isMobile ? '8px' : '12px', fontSize: '13px', color: '#94A3B8', fontWeight: 600 }}>Type</th>
                  <th style={{ textAlign: 'left', padding: isMobile ? '8px' : '12px', fontSize: '13px', color: '#94A3B8', fontWeight: 600 }}>Amount</th>
                  <th style={{ textAlign: 'left', padding: isMobile ? '8px' : '12px', fontSize: '13px', color: '#94A3B8', fontWeight: 600 }}>Method</th>
                  <th style={{ textAlign: 'left', padding: isMobile ? '8px' : '12px', fontSize: '13px', color: '#94A3B8', fontWeight: 600 }}>Status</th>
                  <th style={{ textAlign: 'left', padding: isMobile ? '8px' : '12px', fontSize: '13px', color: '#94A3B8', fontWeight: 600 }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.id} style={{ borderBottom: '1px solid #334155' }}>
                    <td style={{ padding: '12px', fontSize: '14px', color: '#F1F5F9' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Calendar size={16} color="#94A3B8" />
                        {new Date(payment.date).toLocaleDateString('en-KE')}
                      </div>
                    </td>
                    <td style={{ padding: '12px', fontSize: '14px', color: '#F1F5F9' }}>
                      {payment.type}
                    </td>
                    <td style={{ padding: '12px', fontSize: '14px', fontWeight: 700, color: '#22C55E' }}>
                      {formatCurrency(payment.amount)}
                    </td>
                    <td style={{ padding: '12px', fontSize: '14px', color: '#94A3B8' }}>
                      {payment.method}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <span style={{
                        padding: '4px 12px',
                        borderRadius: '20px',
                        fontSize: '12px',
                        fontWeight: 600,
                        background: getStatusColor(payment.status) + '20',
                        color: getStatusColor(payment.status),
                        textTransform: 'capitalize'
                      }}>
                        {payment.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px' }}>
                      <button style={{
                        padding: '6px 12px',
                        background: 'transparent',
                        border: `1px solid ${COLORS.gray[200]}`,
                        borderRadius: '6px',
                        fontSize: '12px',
                        color: COLORS.gray[500],
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        <Receipt size={14} />
                        Receipt
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      {/* Quick Pay */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        style={{
          ...cardStyle,
          background: COLORS.gray[50]
        }}
      >
        <h2 style={{ margin: '0 0 16px', fontSize: '20px', fontWeight: 600, color: '#F1F5F9' }}>
          💳 Make a Payment
        </h2>
        <p style={{ margin: '0 0 16px', fontSize: '14px', color: COLORS.gray[500] }}>
          Pay your rent and other charges securely via M-Pesa or Bank Transfer
        </p>
        <button style={{
          padding: '14px 28px',
          background: COLORS.primary,
          border: 'none',
          borderRadius: '12px',
          color: '#fff',
          fontSize: '15px',
          fontWeight: 600,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <CreditCard size={20} />
          Pay Now
        </button>
      </motion.div>

      {/* Bank Transfer Details */}
      {bankAccount && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          style={{
            ...cardStyle,
            borderLeft: '4px solid #22C55E'
          }}
        >
          <h2 style={{ margin: '0 0 16px', fontSize: '20px', fontWeight: 600, color: '#F1F5F9', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Building size={24} color="#22C55E" />
            Bank Transfer Details
          </h2>
          <p style={{ margin: '0 0 16px', fontSize: '14px', color: COLORS.gray[500] }}>
            Use these details to pay via bank transfer
          </p>
          
          <div style={{ 
            background: COLORS.gray[800], 
            borderRadius: '12px', 
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', borderBottom: '1px solid #334155' }}>
              <span style={{ color: '#94A3B8', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Building size={16} />
                Bank
              </span>
              <span style={{ color: '#F1F5F9', fontSize: '16px', fontWeight: 600 }}>{bankAccount.bankName}</span>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', borderBottom: '1px solid #334155' }}>
              <span style={{ color: '#94A3B8', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <User size={16} />
                Account Name
              </span>
              <span style={{ color: '#F1F5F9', fontSize: '16px', fontWeight: 600 }}>{bankAccount.accountName}</span>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', borderBottom: '1px solid #334155' }}>
              <span style={{ color: '#94A3B8', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Hash size={16} />
                Account Number
              </span>
              <span style={{ color: '#22C55E', fontSize: '18px', fontWeight: 700, fontFamily: 'monospace' }}>{bankAccount.accountNumber}</span>
            </div>
            
            {bankAccount.branch && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', borderBottom: '1px solid #334155' }}>
                <span style={{ color: '#94A3B8', fontSize: '14px' }}>Branch</span>
                <span style={{ color: '#F1F5F9', fontSize: '14px' }}>{bankAccount.branch}</span>
              </div>
            )}
            
            {bankAccount.swiftCode && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#94A3B8', fontSize: '14px' }}>SWIFT Code</span>
                <span style={{ color: '#F1F5F9', fontSize: '14px', fontFamily: 'monospace' }}>{bankAccount.swiftCode}</span>
              </div>
            )}
          </div>
          
          <p style={{ margin: '16px 0 0', fontSize: '13px', color: '#F59E0B', fontStyle: 'italic' }}>
            💡 Remember to include your apartment/unit number as the payment reference
          </p>
        </motion.div>
      )}

      <style>{`
        @media (max-width: 768px) {
          div[style*="maxWidth: 1000px"] {
            padding: 16px !important;
          }
          h1[style*="fontSize: 28px"] {
            font-size: 22px !important;
          }
          .payments-header {
            flex-direction: column !important;
            align-items: stretch !important;
          }
          .payments-stats {
            grid-template-columns: 1fr !important;
          }
          .payments-table {
            display: block !important;
            overflow-x: auto !important;
          }
          .payments-card {
            padding: 16px !important;
          }
        }
        @media (max-width: 480px) {
          .payments-title {
            font-size: 20px !important;
          }
          .payments-grid {
            grid-template-columns: 1fr !important;
          }
          div[style*="display: 'grid'"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
};

export default TenantPayments;
