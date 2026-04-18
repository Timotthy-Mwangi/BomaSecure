import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { paymentsAPI } from '../../services/api';
import socketService from '../../services/socket';
import { currencyService } from '../../services/currencyService';
import CurrencyConverter from '../common/CurrencyConverter';
import CurrencySelector from '../common/CurrencySelector';
import { 
  Building, 
  Home, 
  CreditCard, 
  Clock, 
  CheckCircle, 
  XCircle,
  DollarSign,
  TrendingUp,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  Wallet
} from 'lucide-react';

const TenantRentDashboard = () => {
  const { user } = useAuth();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    paymentMethod: 'mpesa',
    phoneNumber: '',
    description: ''
  });
  const [processingPayment, setProcessingPayment] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState('KES');
  const [showConverter, setShowConverter] = useState(false);
  const [displayCurrency, setDisplayCurrency] = useState('USD');

  const fetchDashboard = useCallback(async () => {
    try {
      const response = await paymentsAPI.getTenantRentDashboard();
      setDashboard(response.data);
    } catch (error) {
      console.error('Error fetching dashboard:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  useEffect(() => {
    if (user?._id) {
      socketService.joinTenant(user._id);
    }

    const handlePaymentUpdate = (data) => {
      console.log('Payment update received:', data);
      fetchDashboard();
    };

    const handleRentPaid = (data) => {
      console.log('Rent paid received:', data);
      fetchDashboard();
    };

    if (socketService.onPaymentUpdate) {
      socketService.onPaymentUpdate(handlePaymentUpdate);
    }
    
    if (socketService.onRentPaid) {
      socketService.onRentPaid(handleRentPaid);
    }

    return () => {
      if (socketService.removeListener) {
        socketService.removeListener('payment:update', handlePaymentUpdate);
        socketService.removeListener('rent:paid', handleRentPaid);
      }
    };
  }, [user, fetchDashboard]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDashboard();
  };

  const handlePayment = async (e) => {
    e.preventDefault();
    setProcessingPayment(true);
    try {
      const response = await paymentsAPI.makeRentPayment({
        ...paymentForm,
        amount: parseFloat(paymentForm.amount),
        rentPeriod: {
          month: new Date().getMonth() + 1,
          year: new Date().getFullYear()
        }
      });

      if (response.data.success) {
        setShowPaymentModal(false);
        setPaymentForm({ amount: '', paymentMethod: 'mpesa', phoneNumber: '', description: '' });
        fetchDashboard();
      }
    } catch (error) {
      console.error('Payment error:', error);
    } finally {
      setProcessingPayment(false);
    }
  };

  const handleDeposit = async (e) => {
    e.preventDefault();
    setProcessingPayment(true);
    try {
      const response = await paymentsAPI.makeRentPayment({
        amount: dashboard?.dashboard?.depositAmount,
        paymentMethod: paymentForm.paymentMethod,
        phoneNumber: paymentForm.phoneNumber,
        paymentType: 'deposit',
        description: 'Security deposit payment'
      });

      if (response.data.success) {
        setShowDepositModal(false);
        setPaymentForm({ amount: '', paymentMethod: 'mpesa', phoneNumber: '', description: '' });
        fetchDashboard();
      }
    } catch (error) {
      console.error('Deposit error:', error);
    } finally {
      setProcessingPayment(false);
    }
  };

  const formatCurrency = (amount, useDisplayCurrency = false) => {
    if (useDisplayCurrency && displayCurrency !== 'KES') {
      const converted = currencyService.convert(amount || 0, 'KES', displayCurrency);
      return currencyService.format(converted, displayCurrency);
    }
    return currencyService.format(amount || 0, selectedCurrency);
  };
  
  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-KE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'paid': return { bg: '#10B98120', color: '#10B981', text: 'Paid' };
      case 'partial': return { bg: '#F59E0B20', color: '#F59E0B', text: 'Partial' };
      case 'pending': return { bg: '#3B82F620', color: '#3B82F6', text: 'Pending' };
      case 'overdue': return { bg: '#EF444420', color: '#EF4444', text: 'Overdue' };
      default: return { bg: '#94A3B820', color: '#94A3B8', text: status };
    }
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <RefreshCw size={32} style={{ animation: 'spin 1s linear infinite' }} />
        <style>{`
          @keyframes spin { 100% { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  const statusStyle = getStatusColor(dashboard?.dashboard?.rentStatus);

  return (
    <div style={styles.container}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div style={styles.header} className="rent-header">
          <div>
            <h1 style={styles.title} className="rent-title">Rent Payment 💰</h1>
            <p style={styles.subtitle}>View and manage your rent payments</p>
          </div>
          <div style={styles.headerActions}>
            <div style={styles.currencySelector}>
              <span style={styles.currencyLabel}>Display in:</span>
              <CurrencySelector value={displayCurrency} onChange={setDisplayCurrency} showCurrencyCode={true} />
            </div>
            <button 
              onClick={() => setShowConverter(!showConverter)} 
              style={styles.converterToggleBtn}
              className="rent-converter-toggle"
            >
              💱 Convert
            </button>
            <button onClick={handleRefresh} style={styles.refreshBtn} className="rent-header-refresh">
              <RefreshCw size={18} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>

        {showConverter && (
          <div style={styles.converterSection}>
            <CurrencyConverter 
              amount={dashboard?.dashboard?.balance || 0}
              fromCurrency="KES"
              toCurrency={selectedCurrency}
              onConversion={({ result, toCurrency }) => setSelectedCurrency(toCurrency)}
              compact
            />
          </div>
        )}

        {dashboard?.dashboard?.createdBy && (
          <div style={styles.adminBadge}>
            <span style={styles.adminLabel}>Managed by Admin</span>
            <span style={styles.adminId}>ID: {dashboard.dashboard.createdBy}</span>
          </div>
        )}

        <div style={styles.statsGrid} className="rent-stats-grid">
          <motion.div whileHover={{ y: -4 }} style={styles.statCard}>
            <div style={{ ...styles.statIcon, background: '#3B82F620' }}>
              <DollarSign size={24} color="#3B82F6" />
            </div>
            <div style={styles.statContent}>
              <span style={styles.statLabel}>Monthly Rent</span>
              <span style={styles.statValue}>{formatCurrency(dashboard?.dashboard?.rentAmount, true)}</span>
            </div>
          </motion.div>

          <motion.div whileHover={{ y: -4 }} style={styles.statCard}>
            <div style={{ ...styles.statIcon, background: '#8B5CF620' }}>
              <Wallet size={24} color="#8B5CF6" />
            </div>
            <div style={styles.statContent}>
              <span style={styles.statLabel}>Deposit</span>
              <span style={styles.statValue}>{formatCurrency(dashboard?.dashboard?.depositAmount, true)}</span>
            </div>
          </motion.div>

          <motion.div whileHover={{ y: -4 }} style={styles.statCard}>
            <div style={{ ...styles.statIcon, background: '#EF444420' }}>
              <AlertCircle size={24} color="#EF4444" />
            </div>
            <div style={styles.statContent}>
              <span style={styles.statLabel}>Balance</span>
              <span style={{ ...styles.statValue, color: '#EF4444' }}>
                {formatCurrency(dashboard?.dashboard?.balance, true)}
              </span>
            </div>
          </motion.div>

          <motion.div whileHover={{ y: -4 }} style={styles.statCard}>
            <div style={{ ...styles.statIcon, background: '#F59E0B20' }}>
              <Clock size={24} color="#F59E0B" />
            </div>
            <div style={styles.statContent}>
              <span style={styles.statLabel}>Overdue</span>
              <span style={{ ...styles.statValue, color: dashboard?.dashboard?.rentStatus === 'overdue' ? '#EF4444' : '#F59E0B' }}>
                {dashboard?.dashboard?.rentStatus === 'overdue' ? 'Yes' : 'No'}
              </span>
            </div>
          </motion.div>

          <motion.div whileHover={{ y: -4 }} style={styles.statCard}>
            <div style={{ ...styles.statIcon, background: '#64748B20' }}>
              <XCircle size={24} color="#64748B" />
            </div>
            <div style={styles.statContent}>
              <span style={styles.statLabel}>Not Paid</span>
              <span style={{ ...styles.statValue, color: '#64748B' }}>
                {dashboard?.dashboard?.rentStatus === 'paid' ? 'No' : 'Yes'}
              </span>
            </div>
          </motion.div>

          <motion.div whileHover={{ y: -4 }} style={styles.statCard}>
            <div style={{ ...styles.statIcon, background: '#10B98120' }}>
              <CheckCircle size={24} color="#10B981" />
            </div>
            <div style={styles.statContent}>
              <span style={styles.statLabel}>Deposit Paid</span>
              <span style={{ ...styles.statValue, color: '#10B981' }}>
                {dashboard?.dashboard?.depositPaid ? 'Yes' : 'No'}
              </span>
            </div>
          </motion.div>
        </div>

        <div style={styles.mainGrid} className="rent-main-grid">
          <div style={styles.leftColumn}>
            <div style={styles.card} className="rent-card">
              <h3 style={styles.cardTitle}>
                <Building size={20} />
                Property Details
              </h3>
              {dashboard?.dashboard?.building ? (
                <div style={styles.propertyInfo}>
                  <div style={styles.propertyRow}>
                    <span style={styles.propertyLabel}>Building</span>
                    <span style={styles.propertyValue}>{dashboard.dashboard.building.name}</span>
                  </div>
                  <div style={styles.propertyRow}>
                    <span style={styles.propertyLabel}>Code</span>
                    <span style={styles.propertyValue}>{dashboard.dashboard.building.code || 'N/A'}</span>
                  </div>
                  <div style={styles.propertyRow}>
                    <span style={styles.propertyLabel}>Location</span>
                    <span style={styles.propertyValue}>
                      {dashboard.dashboard.building.location?.city || dashboard.dashboard.building.location?.address || 'N/A'}
                    </span>
                  </div>
                </div>
              ) : (
                <p style={styles.noData}>No property assigned</p>
              )}
            </div>

            <div style={styles.card}>
              <h3 style={styles.cardTitle}>
                <Home size={20} />
                Unit Information
              </h3>
              {dashboard?.dashboard?.unit ? (
                <div style={styles.propertyInfo}>
                  <div style={styles.propertyRow}>
                    <span style={styles.propertyLabel}>Unit Number</span>
                    <span style={styles.propertyValue}>{dashboard.dashboard.unit.number}</span>
                  </div>
                  <div style={styles.propertyRow}>
                    <span style={styles.propertyLabel}>Floor</span>
                    <span style={styles.propertyValue}>Floor {dashboard.dashboard.unit.floor}</span>
                  </div>
                  <div style={styles.propertyRow}>
                    <span style={styles.propertyLabel}>Type</span>
                    <span style={styles.propertyValue}>{dashboard.dashboard.unit.type}</span>
                  </div>
                  {dashboard.dashboard.unit.size && (
                    <div style={styles.propertyRow}>
                      <span style={styles.propertyLabel}>Size</span>
                      <span style={styles.propertyValue}>{dashboard.dashboard.unit.size} m²</span>
                    </div>
                  )}
                </div>
              ) : (
                <p style={styles.noData}>No unit assigned</p>
              )}
            </div>

            <div style={styles.card}>
              <h3 style={styles.cardTitle}>
                <CreditCard size={20} />
                Deposit Status
              </h3>
              <div style={styles.depositInfo}>
                <div style={styles.depositRow}>
                  <span style={styles.depositLabel}>Deposit Amount</span>
                  <span style={styles.depositValue}>{formatCurrency(dashboard?.dashboard?.depositAmount)}</span>
                </div>
                <div style={styles.depositRow}>
                  <span style={styles.depositLabel}>Status</span>
                  <span style={{
                    ...styles.depositBadge,
                    background: dashboard?.dashboard?.depositPaid ? '#10B98120' : '#F59E0B20',
                    color: dashboard?.dashboard?.depositPaid ? '#10B981' : '#F59E0B'
                  }}>
                    {dashboard?.dashboard?.depositPaid ? 'Paid' : 'Pending'}
                  </span>
                </div>
                {dashboard?.dashboard?.depositPaid && (
                  <div style={styles.depositRow}>
                    <span style={styles.depositLabel}>Paid On</span>
                    <span style={styles.depositValue}>
                      {formatDate(dashboard?.dashboard?.depositPaidAt)}
                    </span>
                  </div>
                )}
                {!dashboard?.dashboard?.depositPaid && (
                  <button 
                    onClick={() => setShowDepositModal(true)}
                    style={styles.depositBtn}
                  >
                    Place Deposit
                  </button>
                )}
              </div>
            </div>
          </div>

          <div style={styles.rightColumn}>
            <div style={styles.card}>
              <div style={styles.balanceHeader} className="rent-balance-header">
                <div>
                  <h3 style={styles.cardTitle}>Current Balance</h3>
                  <span style={styles.balanceLabel}>Amount due for {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
                </div>
                <button 
                  onClick={() => setShowPaymentModal(true)}
                  style={styles.payBtn}
                  className="rent-pay-btn"
                >
                  Pay Now
                </button>
              </div>
              <div style={styles.balanceAmount} className="rent-balance-amount">
                {formatCurrency(dashboard?.dashboard?.balance)}
              </div>
              <div style={styles.statusRow}>
                <span style={{
                  ...styles.statusBadge,
                  background: statusStyle.bg,
                  color: statusStyle.color
                }}>
                  {statusStyle.text}
                </span>
                <span style={styles.periodInfo}>
                  Period: {formatDate(dashboard?.dashboard?.currentPeriodStart)} - {formatDate(dashboard?.dashboard?.currentPeriodEnd)}
                </span>
              </div>
            </div>

            <div style={styles.card}>
              <h3 style={styles.cardTitle}>
                <TrendingUp size={20} />
                Payment Summary
              </h3>
              <div style={styles.summaryGrid}>
                <div style={styles.summaryItem}>
                  <span style={styles.summaryLabel}>Total Paid (All Time)</span>
                  <span style={styles.summaryValue}>{formatCurrency(dashboard?.dashboard?.totalPaid)}</span>
                </div>
                <div style={styles.summaryItem}>
                  <span style={styles.summaryLabel}>Total Pending</span>
                  <span style={{ ...styles.summaryValue, color: '#F59E0B' }}>
                    {formatCurrency(dashboard?.dashboard?.totalPending)}
                  </span>
                </div>
                <div style={styles.summaryItem}>
                  <span style={styles.summaryLabel}>Total Failed</span>
                  <span style={{ ...styles.summaryValue, color: '#EF4444' }}>
                    {formatCurrency(dashboard?.dashboard?.totalFailed)}
                  </span>
                </div>
              </div>
            </div>

            <div style={styles.card}>
              <div style={styles.cardHeader}>
                <h3 style={styles.cardTitle}>
                  <Clock size={20} />
                  Recent Transactions
                </h3>
              </div>
              {dashboard?.recentTransactions?.length === 0 ? (
                <p style={styles.noData}>No transactions yet</p>
              ) : (
                <div style={styles.transactionsList}>
                  {dashboard?.recentTransactions?.slice(0, 5).map((tx) => (
                    <div key={tx._id} style={styles.transactionItem}>
                      <div style={styles.transactionIcon}>
                        {tx.status === 'completed' ? <CheckCircle size={16} color="#10B981" /> :
                         tx.status === 'failed' ? <XCircle size={16} color="#EF4444" /> :
                         <Clock size={16} color="#F59E0B" />}
                      </div>
                      <div style={styles.transactionInfo}>
                        <span style={styles.transactionAmount}>{formatCurrency(tx.amount)}</span>
                        <span style={styles.transactionMeta}>
                          {tx.paymentType} • {tx.paymentMethod} • {formatDate(tx.paidAt || tx.createdAt)}
                        </span>
                      </div>
                      <span style={{
                        ...styles.transactionStatus,
                        color: tx.status === 'completed' ? '#10B981' : 
                               tx.status === 'failed' ? '#EF4444' : '#F59E0B'
                      }}>
                        {tx.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              {dashboard?.recentTransactions?.length > 5 && (
                <Link to="/tenant/finance" style={styles.viewAllLink}>
                  View all transactions <ArrowRight size={14} />
                </Link>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {showPaymentModal && (
        <div style={styles.modalOverlay} onClick={() => setShowPaymentModal(false)}>
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }} 
            animate={{ opacity: 1, scale: 1 }}
            style={styles.modal}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={styles.modalHeader}>
              <h2>Make Payment</h2>
              <button onClick={() => setShowPaymentModal(false)} style={styles.closeBtn}>×</button>
            </div>
            <form onSubmit={handlePayment} style={styles.modalForm}>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Amount (KES)</label>
                <input
                  type="number"
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                  placeholder={dashboard?.dashboard?.balance?.toString() || ''}
                  required
                  style={styles.formInput}
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Payment Method</label>
                <select
                  value={paymentForm.paymentMethod}
                  onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })}
                  style={styles.formInput}
                >
                  <option value="mpesa">M-Pesa</option>
                  <option value="bank">Bank Transfer</option>
                  <option value="card">Card</option>
                </select>
              </div>
              {paymentForm.paymentMethod === 'mpesa' && (
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Phone Number</label>
                  <input
                    type="tel"
                    value={paymentForm.phoneNumber}
                    onChange={(e) => setPaymentForm({ ...paymentForm, phoneNumber: e.target.value })}
                    placeholder="0712345678"
                    required
                    style={styles.formInput}
                  />
                  <span style={styles.formHint}>STK Push will be sent to this number</span>
                </div>
              )}
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Description (Optional)</label>
                <input
                  type="text"
                  value={paymentForm.description}
                  onChange={(e) => setPaymentForm({ ...paymentForm, description: e.target.value })}
                  placeholder="Rent payment for April 2026"
                  style={styles.formInput}
                />
              </div>
              <button 
                type="submit" 
                disabled={processingPayment}
                style={styles.submitBtn}
              >
                {processingPayment ? 'Processing...' : 'Pay Now'}
              </button>
            </form>
          </motion.div>
        </div>
      )}

      {showDepositModal && (
        <div style={styles.modalOverlay} onClick={() => setShowDepositModal(false)}>
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }} 
            animate={{ opacity: 1, scale: 1 }}
            style={styles.modal}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={styles.modalHeader}>
              <h2>Pay Security Deposit</h2>
              <button onClick={() => setShowDepositModal(false)} style={styles.closeBtn}>×</button>
            </div>
            <div style={styles.depositModalInfo}>
              <p style={styles.depositModalText}>
                You need to pay a security deposit of <strong>{formatCurrency(dashboard?.dashboard?.depositAmount)}</strong> to complete your tenancy setup.
              </p>
            </div>
            <form onSubmit={handleDeposit} style={styles.modalForm}>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Payment Method</label>
                <select
                  value={paymentForm.paymentMethod}
                  onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })}
                  style={styles.formInput}
                >
                  <option value="mpesa">M-Pesa</option>
                  <option value="bank">Bank Transfer</option>
                  <option value="card">Card</option>
                </select>
              </div>
              {paymentForm.paymentMethod === 'mpesa' && (
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Phone Number</label>
                  <input
                    type="tel"
                    value={paymentForm.phoneNumber}
                    onChange={(e) => setPaymentForm({ ...paymentForm, phoneNumber: e.target.value })}
                    placeholder="0712345678"
                    required
                    style={styles.formInput}
                  />
                  <span style={styles.formHint}>STK Push will be sent to this number</span>
                </div>
              )}
              <button 
                type="submit" 
                disabled={processingPayment}
                style={styles.submitBtn}
              >
                {processingPayment ? 'Processing...' : `Pay ${formatCurrency(dashboard?.dashboard?.depositAmount)}`}
              </button>
            </form>
          </motion.div>
        </div>
      )}

      <style>{`
        @media (max-width: 900px) {
          .rent-main-grid {
            grid-template-columns: 1fr !important;
          }
          .rent-stats-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
          .rent-header {
            flex-direction: column !important;
            gap: 12px !important;
          }
          .rent-header-actions {
            flex-direction: column !important;
            width: 100% !important;
          }
          .rent-converter-toggle {
            width: 100% !important;
            justify-content: center !important;
          }
          .rent-title {
            font-size: 22px !important;
          }
          .rent-balance-amount {
            font-size: 28px !important;
          }
          .rent-header-refresh {
            width: 100% !important;
            justify-content: center !important;
          }
          .rent-card {
            padding: 16px !important;
          }
        }
        @media (max-width: 768px) {
          div[style*="maxWidth: 1400px"] {
            padding: 16px !important;
          }
        }
        @media (max-width: 500px) {
          .rent-stats-grid {
            grid-template-columns: 1fr !important;
          }
          .rent-stats-grid > div {
            padding: 14px !important;
          }
          .rent-stat-icon {
            width: 40px !important;
            height: 40px !important;
          }
          .rent-stat-value {
            font-size: 18px !important;
          }
          .rent-balance-header {
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 12px !important;
          }
          .rent-pay-btn {
            width: 100% !important;
            text-align: center !important;
          }
        }
      `}</style>
    </div>
  );
};

const styles = {
  container: {
    padding: '24px',
    maxWidth: '1400px',
    margin: '0 auto',
  },
  mainGrid: {
    display: 'grid',
    gridTemplateColumns: '350px 1fr',
    gap: '24px',
  },
  loadingContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '400px',
    color: '#94A3B8',
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
  refreshBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 16px',
    background: '#1E293B',
    border: '1px solid #334155',
    borderRadius: '8px',
    color: '#F1F5F9',
    cursor: 'pointer',
    fontSize: '14px',
  },
  headerActions: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
  },
  converterToggleBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 16px',
    background: '#8B5CF620',
    border: '1px solid #8B5CF6',
    borderRadius: '8px',
    color: '#A78BFA',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
  },
  converterSection: {
    marginBottom: '20px',
    padding: '16px',
    background: '#0F172A',
    borderRadius: '12px',
    border: '1px solid #334155',
  },
  adminBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    background: '#6366F120',
    borderRadius: '6px',
    marginBottom: '20px',
  },
  adminLabel: {
    fontSize: '12px',
    color: '#818CF8',
    fontWeight: 500,
  },
  adminId: {
    fontSize: '11px',
    color: '#64748B',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
    marginBottom: '24px',
  },
  statCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '20px',
    background: '#1E293B',
    borderRadius: '12px',
    border: '1px solid #334155',
  },
  statIcon: {
    width: '48px',
    height: '48px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statContent: {
    display: 'flex',
    flexDirection: 'column',
  },
  statLabel: {
    fontSize: '13px',
    color: '#94A3B8',
  },
  statValue: {
    fontSize: '20px',
    fontWeight: 700,
    color: '#F1F5F9',
  },
  leftColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  rightColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  card: {
    background: '#1E293B',
    borderRadius: '12px',
    padding: '20px',
    border: '1px solid #334155',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#F1F5F9',
    margin: '0 0 16px 0',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  propertyInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  propertyRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  propertyLabel: {
    fontSize: '13px',
    color: '#94A3B8',
  },
  propertyValue: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#F1F5F9',
  },
  depositInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  depositRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  depositLabel: {
    fontSize: '13px',
    color: '#94A3B8',
  },
  depositValue: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#F1F5F9',
  },
  depositBadge: {
    padding: '4px 10px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: 600,
  },
  depositBtn: {
    marginTop: '12px',
    padding: '12px 20px',
    background: '#8B5CF6',
    border: 'none',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    width: '100%',
  },
  depositModalInfo: {
    background: '#0F172A',
    padding: '16px',
    borderRadius: '8px',
    marginBottom: '20px',
  },
  depositModalText: {
    fontSize: '14px',
    color: '#F1F5F9',
    margin: 0,
    lineHeight: 1.6,
  },
  balanceHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '16px',
  },
  balanceAmount: {
    fontSize: '36px',
    fontWeight: 800,
    color: '#F1F5F9',
    marginBottom: '12px',
  },
  statusRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  statusBadge: {
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '13px',
    fontWeight: 600,
  },
  periodInfo: {
    fontSize: '12px',
    color: '#64748B',
  },
  payBtn: {
    padding: '10px 20px',
    background: '#2563EB',
    border: 'none',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  summaryGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  summaryItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: '13px',
    color: '#94A3B8',
  },
  summaryValue: {
    fontSize: '15px',
    fontWeight: 600,
    color: '#F1F5F9',
  },
  transactionsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  transactionItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px',
    background: '#0F172A',
    borderRadius: '8px',
  },
  transactionIcon: {
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    background: '#1E293B',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  transactionInfo: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  transactionAmount: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#F1F5F9',
  },
  transactionMeta: {
    fontSize: '12px',
    color: '#64748B',
  },
  transactionStatus: {
    fontSize: '12px',
    fontWeight: 600,
    textTransform: 'capitalize',
  },
  viewAllLink: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    marginTop: '12px',
    fontSize: '13px',
    color: '#2563EB',
    textDecoration: 'none',
  },
  noData: {
    fontSize: '14px',
    color: '#64748B',
    textAlign: 'center',
    padding: '20px',
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
    maxWidth: '450px',
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
  modalForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  formLabel: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#F1F5F9',
  },
  formInput: {
    padding: '12px',
    background: '#0F172A',
    border: '1px solid #334155',
    borderRadius: '8px',
    color: '#F1F5F9',
    fontSize: '14px',
  },
  formHint: {
    fontSize: '12px',
    color: '#64748B',
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

export default TenantRentDashboard;