import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import api from '../../services/api';
import CurrencyConverter from '../common/CurrencyConverter';
import CurrencySelector from '../common/CurrencySelector';
import { currencyService } from '../../services/currencyService';
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

const TenantFinance = () => {
  const [financeInfo, setFinanceInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [showConverter, setShowConverter] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState('USD');
  const [displayCurrency, setDisplayCurrency] = useState('USD');
  const [payoutSettings, setPayoutSettings] = useState({
    isEnabled: false,
    bankName: '',
    accountNumber: '',
    accountName: '',
    mpesaPhone: ''
  });
  const [savingPayout, setSavingPayout] = useState(false);

  useEffect(() => {
    fetchFinanceInfo();
  }, []);

  const fetchFinanceInfo = async () => {
    try {
      const response = await api.get('/payments/tenant/finance');
      setFinanceInfo(response.data.financeInfo);
      if (response.data.financeInfo?.payoutSettings) {
        setPayoutSettings(response.data.financeInfo.payoutSettings);
      }
    } catch (error) {
      console.error('Error fetching finance info:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSavePayoutSettings = async () => {
    setSavingPayout(true);
    try {
      const response = await api.put('/payments/tenant/payout', payoutSettings);
      setFinanceInfo(prev => ({
        ...prev,
        payoutSettings: response.data.payoutSettings
      }));
    } catch (error) {
      console.error('Error saving payout settings:', error);
    } finally {
      setSavingPayout(false);
    }
  };

  const formatCurrency = (amount, useSelectedCurrency = false) => {
    if (useSelectedCurrency && displayCurrency !== 'KES') {
      const kesAmount = amount || 0;
      const converted = currencyService.convert(kesAmount, 'KES', displayCurrency);
      return currencyService.format(converted, displayCurrency);
    }
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

  const getFeeInfo = (planType) => {
    switch (planType) {
      case 'free':
        return { percent: 15, description: 'Free Trial - 15% platform fee' };
      case 'premium':
        return { percent: 0, description: 'Premium - 0% platform fee' };
      default:
        return { percent: 5, description: 'Standard - 5% platform fee' };
    }
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
            <h1 style={styles.title}>My Finance</h1>
            <p style={styles.subtitle}>Track your payments and earnings</p>
          </div>
          <div style={styles.headerActions}>
            <div style={styles.currencySelector}>
              <span style={styles.currencyLabel}>Display in:</span>
              <CurrencySelector value={displayCurrency} onChange={setDisplayCurrency} showCurrencyCode={true} />
            </div>
            <button 
              onClick={() => setShowConverter(!showConverter)} 
              style={styles.converterBtn}
            >
              💱 Converter
            </button>
          </div>
        </div>

        {showConverter && (
          <div style={styles.converterSection}>
            <CurrencyConverter 
              fromCurrency="KES"
              toCurrency={selectedCurrency}
              onConversion={({ result, toCurrency }) => setSelectedCurrency(toCurrency)}
              compact
            />
          </div>
        )}

        {/* Tabs */}
        <div style={styles.tabs}>
          <button
            onClick={() => setActiveTab('overview')}
            style={{
              ...styles.tab,
              ...(activeTab === 'overview' ? styles.activeTab : {})
            }}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('payments')}
            style={{
              ...styles.tab,
              ...(activeTab === 'payments' ? styles.activeTab : {})
            }}
          >
            Payment History
          </button>
          <button
            onClick={() => setActiveTab('payouts')}
            style={{
              ...styles.tab,
              ...(activeTab === 'payouts' ? styles.activeTab : {})
            }}
          >
            Payout Settings
          </button>
        </div>

        {activeTab === 'overview' && (
          <>
            {/* Subscription Status */}
            <div style={styles.sectionCard}>
              <h3 style={styles.sectionTitle}>Current Subscription</h3>
              <div style={styles.subscriptionInfo}>
                <div>
                  <span style={styles.subscriptionLabel}>Plan</span>
                  <span style={styles.subscriptionValue}>
                    {financeInfo?.subscription?.planType === 'premium' ? 'Premium' : 
                     financeInfo?.subscription?.planType === 'standard' ? 'Standard' : 'Free'}
                  </span>
                </div>
                <div>
                  <span style={styles.subscriptionLabel}>Status</span>
                  <span style={{
                    ...styles.subscriptionValue,
                    color: financeInfo?.subscription?.isActive ? COLORS.success : COLORS.secondary
                  }}>
                    {financeInfo?.subscription?.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div>
                  <span style={styles.subscriptionLabel}>End Date</span>
                  <span style={styles.subscriptionValue}>
                    {formatDate(financeInfo?.subscription?.endDate)}
                  </span>
                </div>
              </div>
            </div>

            {/* Payment Summary */}
            <div style={styles.statsGrid}>
              <div style={styles.statCard}>
                <div style={styles.statIcon}>💳</div>
                <div style={styles.statContent}>
                  <span style={styles.statLabel}>Total Paid</span>
                  <span style={styles.statValue}>{formatCurrency(financeInfo?.totalPaid, true)}</span>
                </div>
              </div>
              <div style={styles.statCard}>
                <div style={styles.statIcon}>🏛️</div>
                <div style={styles.statContent}>
                  <span style={styles.statLabel}>Platform Fees (Total)</span>
                  <span style={{...styles.statValue, color: COLORS.warning}}>
                    {formatCurrency(financeInfo?.totalPlatformFees, true)}
                  </span>
                </div>
              </div>
              <div style={styles.statCard}>
                <div style={styles.statIcon}>📈</div>
                <div style={styles.statContent}>
                  <span style={styles.statLabel}>Your Share</span>
                  <span style={{...styles.statValue, color: COLORS.success}}>
                    {formatCurrency(financeInfo?.totalTenantShare, true)}
                  </span>
                </div>
              </div>
            </div>

            {/* Revenue by Plan */}
            <div style={styles.sectionCard}>
              <h3 style={styles.sectionTitle}>Payments by Plan</h3>
              <div style={styles.planRevenueGrid}>
                <div style={styles.planRevenueItem}>
                  <span style={styles.planLabel}>Free Trial</span>
                  <span style={styles.planAmount}>{formatCurrency(financeInfo?.revenueByPlan?.free, true)}</span>
                  <span style={styles.planFee}>15% platform fee {displayCurrency !== 'KES' ? `(${currencyService.format(currencyService.convert((financeInfo?.revenueByPlan?.free || 0) * 0.15, 'KES', displayCurrency), displayCurrency)})` : `(KES ${((financeInfo?.revenueByPlan?.free || 0) * 0.15).toLocaleString()})`}</span>
                </div>
                <div style={styles.planRevenueItem}>
                  <span style={styles.planLabel}>Standard ($10)</span>
                  <span style={styles.planAmount}>{formatCurrency(financeInfo?.revenueByPlan?.standard, true)}</span>
                  <span style={styles.planFee}>5% platform fee {displayCurrency !== 'KES' ? `(${currencyService.format(currencyService.convert((financeInfo?.revenueByPlan?.standard || 0) * 0.05, 'KES', displayCurrency), displayCurrency)})` : `(KES ${((financeInfo?.revenueByPlan?.standard || 0) * 0.05).toLocaleString()})`}</span>
                </div>
                <div style={styles.planRevenueItem}>
                  <span style={styles.planLabel}>Premium ($15)</span>
                  <span style={styles.planAmount}>{formatCurrency(financeInfo?.revenueByPlan?.premium, true)}</span>
                  <span style={styles.planFee}>0% platform fee</span>
                </div>
              </div>
            </div>

            {/* How it Works */}
            <div style={styles.sectionCard}>
              <h3 style={styles.sectionTitle}>How Revenue Sharing Works</h3>
              <div style={styles.howItWorks}>
                <div style={styles.howItem}>
                  <span style={styles.howIcon}>🎯</span>
                  <div>
                    <h4 style={styles.howTitle}>Free Trial</h4>
                    <p style={styles.howDesc}>Pay any amount under KES 1,500 - 15% goes to platform, 85% to you</p>
                  </div>
                </div>
                <div style={styles.howItem}>
                  <span style={styles.howIcon}>⭐</span>
                  <div>
                    <h4 style={styles.howTitle}>Standard - $10/month</h4>
                    <p style={styles.howDesc}>KES ~1,500 - Only 5% goes to platform, 95% to you</p>
                  </div>
                </div>
                <div style={styles.howItem}>
                  <span style={styles.howIcon}>👑</span>
                  <div>
                    <h4 style={styles.howTitle}>Premium - $15/month</h4>
                    <p style={styles.howDesc}>KES ~2,250+ - 0% goes to platform, you keep 100%</p>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'payments' && (
          <div style={styles.sectionCard}>
            <h3 style={styles.sectionTitle}>Payment History</h3>
            {financeInfo?.recentPayments?.length === 0 ? (
              <div style={styles.emptyState}>
                <p>No payments yet</p>
              </div>
            ) : (
              <div style={styles.paymentsList}>
                {financeInfo?.recentPayments?.map((payment) => {
                  const feeInfo = getFeeInfo(payment.planType);
                  return (
                    <div key={payment._id} style={styles.paymentCard}>
                      <div style={styles.paymentMain}>
                        <span style={styles.paymentAmount}>
                          {formatCurrency(payment.amount)}
                        </span>
                        {getPlanBadge(payment.planType)}
                      </div>
                      <div style={styles.paymentMeta}>
                        <span>{payment.paymentMethod}</span>
                        <span>•</span>
                        <span>{formatDate(payment.paidAt)}</span>
                      </div>
                      <div style={styles.paymentBreakdown}>
                        <span>Platform Fee ({feeInfo.percent}%): {formatCurrency(payment.platformFeeAmount, true)}</span>
                        <span>•</span>
                        <span style={{ color: COLORS.success }}>
                          Your Share: {formatCurrency(payment.tenantShareAmount, true)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'payouts' && (
          <div style={styles.sectionCard}>
            <h3 style={styles.sectionTitle}>Payout Settings</h3>
            <p style={styles.payoutDesc}>
              Enable payout settings to receive your share of rental payments directly to your bank account or M-Pesa.
            </p>
            
            <div style={styles.payoutToggle}>
              <label style={styles.toggleLabel}>
                <input
                  type="checkbox"
                  checked={payoutSettings.isEnabled}
                  onChange={(e) => setPayoutSettings({ ...payoutSettings, isEnabled: e.target.checked })}
                  style={styles.toggleInput}
                />
                <span style={styles.toggleSwitch}></span>
                <span>Enable Payouts</span>
              </label>
            </div>

            {payoutSettings.isEnabled && (
              <div style={styles.payoutForm}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Bank Name</label>
                  <input
                    type="text"
                    value={payoutSettings.bankName}
                    onChange={(e) => setPayoutSettings({ ...payoutSettings, bankName: e.target.value })}
                    placeholder="e.g., Standard Chartered"
                    style={styles.input}
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Account Number</label>
                  <input
                    type="text"
                    value={payoutSettings.accountNumber}
                    onChange={(e) => setPayoutSettings({ ...payoutSettings, accountNumber: e.target.value })}
                    placeholder="e.g., 0123456789"
                    style={styles.input}
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Account Name</label>
                  <input
                    type="text"
                    value={payoutSettings.accountName}
                    onChange={(e) => setPayoutSettings({ ...payoutSettings, accountName: e.target.value })}
                    placeholder="e.g., John Doe"
                    style={styles.input}
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Or M-Pesa Phone</label>
                  <input
                    type="tel"
                    value={payoutSettings.mpesaPhone}
                    onChange={(e) => setPayoutSettings({ ...payoutSettings, mpesaPhone: e.target.value })}
                    placeholder="e.g., 0712345678"
                    style={styles.input}
                  />
                </div>
                <button
                  onClick={handleSavePayoutSettings}
                  disabled={savingPayout}
                  style={styles.saveBtn}
                >
                  {savingPayout ? 'Saving...' : 'Save Payout Settings'}
                </button>
              </div>
            )}

            {/* Earnings Summary */}
            <div style={styles.earningsSummary}>
              <h4 style={styles.earningsTitle}>Earnings Summary</h4>
              <div style={styles.earningsGrid}>
                <div style={styles.earningsItem}>
                  <span style={styles.earningsLabel}>Total Earnings</span>
                  <span style={styles.earningsValue}>{formatCurrency(financeInfo?.payoutSettings?.totalEarnings || 0, true)}</span>
                </div>
                <div style={styles.earningsItem}>
                  <span style={styles.earningsLabel}>Pending Payout</span>
                  <span style={{...styles.earningsValue, color: COLORS.warning}}>
                    {formatCurrency(financeInfo?.payoutSettings?.pendingPayout || 0, true)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
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
    flexWrap: 'wrap',
    gap: '16px',
  },
  headerActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap',
  },
  currencySelector: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  currencyLabel: {
    fontSize: '14px',
    color: COLORS.textSecondary,
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
  converterSection: {
    marginBottom: '24px',
    padding: '16px',
    backgroundColor: COLORS.card,
    borderRadius: '12px',
    border: `1px solid ${COLORS.border}`,
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
  tabs: {
    display: 'flex',
    gap: '8px',
    marginBottom: '24px',
    borderBottom: `1px solid ${COLORS.border}`,
    paddingBottom: '8px',
  },
  tab: {
    padding: '10px 20px',
    border: 'none',
    backgroundColor: 'transparent',
    color: COLORS.textSecondary,
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    borderRadius: '8px',
    transition: 'all 0.2s',
  },
  activeTab: {
    backgroundColor: COLORS.primary,
    color: '#fff',
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
  subscriptionInfo: {
    display: 'flex',
    gap: '32px',
  },
  subscriptionLabel: {
    display: 'block',
    fontSize: '12px',
    color: COLORS.textSecondary,
    marginBottom: '4px',
  },
  subscriptionValue: {
    fontSize: '18px',
    fontWeight: '600',
    color: COLORS.text,
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
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
    fontSize: '20px',
    fontWeight: 'bold',
    color: COLORS.text,
  },
  planRevenueGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
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
    fontSize: '18px',
    fontWeight: 'bold',
    color: COLORS.text,
  },
  planFee: {
    fontSize: '12px',
    color: COLORS.textSecondary,
    marginTop: '4px',
  },
  howItWorks: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  howItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '16px',
    padding: '16px',
    backgroundColor: COLORS.cardInner,
    borderRadius: '8px',
  },
  howIcon: {
    fontSize: '24px',
  },
  howTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: '4px',
  },
  howDesc: {
    fontSize: '14px',
    color: COLORS.textSecondary,
  },
  paymentsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  paymentCard: {
    padding: '16px',
    backgroundColor: COLORS.cardInner,
    borderRadius: '8px',
    border: `1px solid ${COLORS.border}`,
  },
  paymentMain: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '8px',
  },
  paymentAmount: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: COLORS.text,
  },
  paymentMeta: {
    display: 'flex',
    gap: '8px',
    fontSize: '12px',
    color: COLORS.textSecondary,
  },
  paymentBreakdown: {
    display: 'flex',
    gap: '8px',
    fontSize: '12px',
    color: COLORS.textSecondary,
    marginTop: '8px',
    paddingTop: '8px',
    borderTop: `1px solid ${COLORS.border}`,
  },
  payoutDesc: {
    fontSize: '14px',
    color: COLORS.textSecondary,
    marginBottom: '24px',
  },
  payoutToggle: {
    marginBottom: '24px',
  },
  toggleLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    cursor: 'pointer',
    fontSize: '16px',
    color: COLORS.text,
  },
  toggleInput: {
    display: 'none',
  },
  toggleSwitch: {
    position: 'relative',
    width: '48px',
    height: '24px',
    backgroundColor: COLORS.border,
    borderRadius: '24px',
    transition: 'background 0.2s',
  },
  payoutForm: {
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
    fontWeight: '500',
    color: COLORS.text,
  },
  input: {
    padding: '10px 14px',
    border: `1px solid ${COLORS.border}`,
    borderRadius: '8px',
    fontSize: '14px',
    color: COLORS.text,
    backgroundColor: COLORS.cardInner,
  },
  saveBtn: {
    padding: '12px',
    backgroundColor: COLORS.primary,
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    marginTop: '8px',
  },
  earningsSummary: {
    marginTop: '32px',
    paddingTop: '24px',
    borderTop: `1px solid ${COLORS.border}`,
  },
  earningsTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: '16px',
  },
  earningsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '16px',
  },
  earningsItem: {
    display: 'flex',
    flexDirection: 'column',
    padding: '16px',
    backgroundColor: COLORS.cardInner,
    borderRadius: '8px',
  },
  earningsLabel: {
    fontSize: '12px',
    color: COLORS.textSecondary,
    marginBottom: '4px',
  },
  earningsValue: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: COLORS.text,
  },
  emptyState: {
    textAlign: 'center',
    padding: '40px',
    color: COLORS.textSecondary,
  },
};

export default TenantFinance;
