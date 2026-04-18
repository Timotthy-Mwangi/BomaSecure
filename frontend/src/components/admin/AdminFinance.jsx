import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import api from '../../services/api';
import socketService from '../../services/socket';
import { currencyService } from '../../services/currencyService';
import CurrencyConverter from '../common/CurrencyConverter';
import bomaSecureLogo from '../../assets/bomasecure.png';

const COLORS = {
  primary: '#2563EB',
  secondary: '#94A3B8',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  background: '#0F172A',
  card: '#1E293B',
  cardInner: '#0F172A',
  text: '#F1F5F9',
  textSecondary: '#94A3B8',
  border: '#334155'
};

const AdminFinance = () => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedCurrency, setSelectedCurrency] = useState('KES');
  const [showConverter, setShowConverter] = useState(false);

  useEffect(() => {
    fetchAnalytics();
    const interval = setInterval(fetchAnalytics, 30000);
    
    socketService.joinAdmin();
    
    const handlePaymentNew = () => {
      fetchAnalytics();
    };
    const handleRentReceived = () => {
      fetchAnalytics();
    };
    const handlePaymentUpdate = () => {
      fetchAnalytics();
    };
    
    socketService.onPaymentNew(handlePaymentNew);
    socketService.onRentReceived(handleRentReceived);
    socketService.onPaymentUpdate(handlePaymentUpdate);
    
    return () => {
      clearInterval(interval);
      socketService.removeListener('payment:new', handlePaymentNew);
      socketService.removeListener('rent:received', handleRentReceived);
      socketService.removeListener('payment:update', handlePaymentUpdate);
    };
  }, []);

  const fetchAnalytics = async () => {
    try {
      const response = await api.get('/payments/admin/analytics');
      setAnalytics(response.data.analytics);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount, overrideCurrency = null) => {
    const currency = overrideCurrency || selectedCurrency;
    const converted = currencyService.convert(amount || 0, 'KES', currency);
    return currencyService.format(converted, currency);
  };

  const formatOriginalCurrency = (amount) => {
    return `KES ${(amount || 0).toLocaleString()}`;
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
      case 'completed': return COLORS.success;
      case 'pending': return COLORS.warning;
      case 'processing': return COLORS.primary;
      case 'failed': return COLORS.danger;
      default: return COLORS.secondary;
    }
  };

  const getPlanBadge = (plan) => {
    const colors = {
      free: { bg: '#7C3AED20', color: '#A78BFA' },
      standard: { bg: '#2563EB20', color: '#60A5FA' },
      premium: { bg: '#10B98120', color: '#34D399' }
    };
    const style = colors[plan] || colors.standard;
    return (
      <span style={{
        padding: '2px 8px',
        borderRadius: '4px',
        fontSize: '12px',
        backgroundColor: style.bg,
        color: style.color,
        textTransform: 'capitalize'
      }}>
        {plan}
      </span>
    );
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <img src={bomaSecureLogo} alt="BomaSecure" style={{ width: '120px', height: 'auto', animation: 'pulse 2s ease-in-out infinite' }} />
        <style>{`
          @keyframes pulse {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.7; transform: scale(0.95); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>Finance Dashboard</h1>
            <p style={styles.subtitle}>Track revenue, earnings, and platform fees</p>
          </div>
          <div style={styles.headerActions}>
            <button 
              onClick={() => setShowConverter(!showConverter)} 
              style={styles.converterBtn}
            >
              💱 Currency Converter
            </button>
            <button onClick={fetchAnalytics} style={styles.refreshBtn}>
              Refresh
            </button>
          </div>
        </div>

        {showConverter && (
          <div style={styles.converterContainer}>
            <CurrencyConverter 
              fromCurrency="KES"
              toCurrency={selectedCurrency}
              onConversion={({ result, toCurrency }) => setSelectedCurrency(toCurrency)}
              compact
            />
          </div>
        )}

        {/* Stats Cards */}
        <div style={styles.statsGrid}>
          <div style={styles.statCard}>
            <div style={styles.statIcon}>💰</div>
            <div style={styles.statContent}>
              <span style={styles.statLabel}>Total Revenue</span>
              <span style={styles.statValue}>{formatCurrency(analytics?.totalRevenue)}</span>
            </div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statIcon}>🏦</div>
            <div style={styles.statContent}>
              <span style={styles.statLabel}>Platform Fee (15%)</span>
              <span style={{...styles.statValue, color: COLORS.warning}}>{formatCurrency(analytics?.platformFee)}</span>
            </div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statIcon}>📈</div>
            <div style={styles.statContent}>
              <span style={styles.statLabel}>Your Earnings</span>
              <span style={{...styles.statValue, color: COLORS.success}}>{formatCurrency(analytics?.adminEarnings)}</span>
            </div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statIcon}>✅</div>
            <div style={styles.statContent}>
              <span style={styles.statLabel}>Completed</span>
              <span style={styles.statValue}>{analytics?.completedPayments || 0}</span>
            </div>
          </div>
        </div>

        {/* Revenue by Plan */}
        <div style={styles.sectionCard}>
          <h3 style={styles.sectionTitle}>Revenue by Plan</h3>
          <div style={styles.planRevenueGrid}>
            <div style={styles.planRevenueItem}>
              <span style={styles.planLabel}>Free Trial (15% fee)</span>
              <span style={{...styles.planAmount, color: '#A78BFA'}}>{formatCurrency(analytics?.revenueByPlan?.free)}</span>
            </div>
            <div style={styles.planRevenueItem}>
              <span style={styles.planLabel}>Standard - $10 (5% fee)</span>
              <span style={{...styles.planAmount, color: '#60A5FA'}}>{formatCurrency(analytics?.revenueByPlan?.standard)}</span>
            </div>
            <div style={styles.planRevenueItem}>
              <span style={styles.planLabel}>Premium - $15 (0% fee)</span>
              <span style={{...styles.planAmount, color: '#34D399'}}>{formatCurrency(analytics?.revenueByPlan?.premium)}</span>
            </div>
          </div>
        </div>

        {/* Monthly Revenue Chart */}
        <div style={styles.sectionCard}>
          <h3 style={styles.sectionTitle}>Monthly Revenue {analytics?.revenueByMonth?.[0]?.year ? `(${analytics.revenueByMonth[0].year})` : ''}</h3>
          {!analytics?.revenueByMonth || analytics.revenueByMonth.length === 0 ? (
            <div style={styles.emptyState}>
              <p>No revenue data yet</p>
            </div>
          ) : (
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-end',
              height: '200px',
              paddingTop: '20px',
              gap: '8px',
              minWidth: 0
            }} className="revenue-chart">
              {(() => {
                const months = analytics?.revenueByMonth || [];
                const maxRevenue = Math.max(...months.map(m => m.revenue), 1);
                return months.map((month, index) => (
                  <div 
                    key={index} 
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      flex: '1 1 0%',
                      minWidth: 0
                    }}
                  >
                    <div style={{
                      height: '120px',
                      width: '40px',
                      display: 'flex',
                      alignItems: 'flex-end'
                    }}>
                      <div 
                        style={{
                          width: '100%',
                          backgroundColor: '#2563EB',
                          borderRadius: '4px 4px 0 0',
                          height: `${Math.max(5, (month.revenue / maxRevenue) * 100)}%`
                        }}
                      />
                    </div>
                    <span style={{fontSize: '12px', color: '#94A3B8', marginTop: '8px'}}>{month.month}</span>
                    <span style={{fontSize: '11px', color: '#F1F5F9'}}>{formatCurrency(month.revenue)}</span>
                  </div>
                ));
              })()}
            </div>
          )}
        </div>

        {/* Recent Transactions */}
        <div style={styles.sectionCard}>
          <h3 style={styles.sectionTitle}>Recent Transactions</h3>
          {analytics?.recentTransactions?.length === 0 ? (
            <div style={styles.emptyState}>
              <p>No transactions yet</p>
            </div>
          ) : (
            <div style={styles.transactionsList}>
              {analytics?.recentTransactions?.map((transaction) => (
                <div key={transaction._id} style={styles.transactionCard}>
                  <div style={styles.transactionMain}>
                    <div>
                      <span style={styles.transactionAmount}>
                        {formatCurrency(transaction.amount)}
                      </span>
                      {getPlanBadge(transaction.revenueSplit?.planType)}
                    </div>
                    <span style={{
                      ...styles.transactionStatus,
                      color: getStatusColor(transaction.status),
                      backgroundColor: getStatusColor(transaction.status) + '20'
                    }}>
                      {transaction.status}
                    </span>
                  </div>
                  <div style={styles.transactionMeta}>
                    <span>{transaction.paymentMethod}</span>
                    <span>•</span>
                    <span>{formatDate(transaction.paidAt)}</span>
                  </div>
                  <div style={styles.transactionRevenue}>
                    <span>Platform Fee: {transaction.revenueSplit?.platformFeePercent}%</span>
                    <span>•</span>
                    <span>Earned: {formatCurrency(transaction.revenueSplit?.adminEarning)}</span>
                  </div>
                  {transaction.user && (
                    <div style={styles.transactionUser}>
                      <span>{transaction.user.name}</span>
                      <span>{transaction.user.phone}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Payment Status Summary */}
        <div style={styles.sectionCard}>
          <h3 style={styles.sectionTitle}>Payment Status Summary</h3>
          <div style={styles.statusGrid}>
            <div style={styles.statusItem}>
              <span style={{...styles.statusCount, color: COLORS.success}}>{analytics?.completedPayments || 0}</span>
              <span style={styles.statusLabel}>Completed</span>
            </div>
            <div style={styles.statusItem}>
              <span style={{...styles.statusCount, color: COLORS.warning}}>{analytics?.pendingPayments || 0}</span>
              <span style={styles.statusLabel}>Pending</span>
            </div>
            <div style={styles.statusItem}>
              <span style={{...styles.statusCount, color: COLORS.danger}}>{analytics?.failedPayments || 0}</span>
              <span style={styles.statusLabel}>Failed</span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

const styles = {
  container: {
    padding: '24px',
  },
  loadingContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '400px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
  },
  headerActions: {
    display: 'flex',
    gap: '12px',
  },
  title: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: '4px',
  },
  subtitle: {
    color: COLORS.textSecondary,
    fontSize: '14px',
  },
  converterBtn: {
    padding: '10px 20px',
    backgroundColor: '#7C3AED',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '500',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  converterContainer: {
    marginBottom: '24px',
    padding: '16px',
    backgroundColor: COLORS.card,
    borderRadius: '12px',
    border: `1px solid ${COLORS.border}`,
  },
  refreshBtn: {
    padding: '10px 20px',
    backgroundColor: COLORS.primary,
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '500',
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
    backgroundColor: COLORS.card,
    borderRadius: '12px',
    border: `1px solid ${COLORS.border}`,
  },
  statIcon: {
    fontSize: '32px',
  },
  statContent: {
    display: 'flex',
    flexDirection: 'column',
  },
  statLabel: {
    fontSize: '14px',
    color: COLORS.textSecondary,
  },
  statValue: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: COLORS.text,
  },
  sectionCard: {
    backgroundColor: COLORS.card,
    borderRadius: '12px',
    padding: '24px',
    border: `1px solid ${COLORS.border}`,
    marginBottom: '24px',
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: '16px',
  },
  planRevenueGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '16px',
  },
  planRevenueItem: {
    display: 'flex',
    flexDirection: 'column',
    padding: '16px',
    backgroundColor: COLORS.cardInner,
    borderRadius: '8px',
    border: `1px solid ${COLORS.border}`,
  },
  planLabel: {
    fontSize: '14px',
    color: COLORS.textSecondary,
    marginBottom: '8px',
  },
  planAmount: {
    fontSize: '20px',
    fontWeight: 'bold',
  },
  chartContainer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: '200px',
    paddingTop: '20px',
    gap: '8px',
    minWidth: 0,
  },
  chartBar: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    minWidth: '60px',
    maxWidth: '120px',
  },
  barWrapper: {
    height: '120px',
    width: '40px',
    display: 'flex',
    alignItems: 'flex-end',
    minHeight: '20px',
  },
  bar: {
    width: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: '4px 4px 0 0',
    transition: 'height 0.3s',
  },
  barLabel: {
    fontSize: '12px',
    color: COLORS.textSecondary,
    marginTop: '8px',
  },
  barValue: {
    fontSize: '11px',
    color: COLORS.text,
  },
  transactionsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  transactionCard: {
    padding: '16px',
    backgroundColor: COLORS.cardInner,
    borderRadius: '8px',
    border: `1px solid ${COLORS.border}`,
  },
  transactionMain: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  transactionAmount: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: COLORS.text,
    marginRight: '12px',
  },
  transactionStatus: {
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  transactionMeta: {
    display: 'flex',
    gap: '8px',
    fontSize: '12px',
    color: COLORS.textSecondary,
  },
  transactionRevenue: {
    display: 'flex',
    gap: '8px',
    fontSize: '12px',
    color: COLORS.textSecondary,
    marginTop: '4px',
  },
  transactionUser: {
    display: 'flex',
    gap: '12px',
    fontSize: '12px',
    color: COLORS.text,
    marginTop: '8px',
    paddingTop: '8px',
    borderTop: `1px solid ${COLORS.border}`,
  },
  statusGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '16px',
  },
  statusItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '16px',
    backgroundColor: COLORS.cardInner,
    borderRadius: '8px',
  },
  statusCount: {
    fontSize: '32px',
    fontWeight: 'bold',
  },
  statusLabel: {
    fontSize: '14px',
    color: COLORS.textSecondary,
  },
  emptyState: {
    textAlign: 'center',
    padding: '40px',
    color: COLORS.textSecondary,
  },
};

export default AdminFinance;
