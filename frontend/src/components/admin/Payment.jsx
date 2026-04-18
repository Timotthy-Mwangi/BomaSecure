import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../services/api';
import socketService from '../../services/socket';
import { useAuth } from '../../context/AuthContext';
import bomaSecureLogo from '../../assets/bomasecure.png';
import { Plus, Trash2, Check } from 'lucide-react';

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

const PaymentPage = () => {
  const { user } = useAuth();
  const [plans, setPlans] = useState([]);
  const [exchangeRate, setExchangeRate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState('mpesa');
  const [phoneNumber, setPhoneNumber] = useState(user?.phone || '');
  const [cardDetails, setCardDetails] = useState({ number: '', expiry: '', cvv: '' });
  const [processing, setProcessing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [payments, setPayments] = useState([]);
  const [activeTab, setActiveTab] = useState('subscribe');
  const [bankAccounts, setBankAccounts] = useState([]);
  const [showAddBank, setShowAddBank] = useState(false);
  const [newBankAccount, setNewBankAccount] = useState({
    bankName: '',
    accountName: '',
    accountNumber: '',
    branch: '',
    swiftCode: '',
    isDefault: false
  });
  const [savingBank, setSavingBank] = useState(false);

  useEffect(() => {
    fetchPlans();
    fetchPayments();
    fetchBankAccounts();
    
    // Listen for real-time payment updates
    const handlePaymentUpdate = (payment) => {
      console.log('Payment update received:', payment);
      // Add new payment to the list or update existing one
      setPayments(prev => {
        const exists = prev.find(p => p._id === payment._id);
        if (exists) {
          return prev.map(p => p._id === payment._id ? payment : p);
        }
        return [payment, ...prev];
      });
    };

    const handlePaymentNew = (payment) => {
      console.log('New payment received:', payment);
      // For admin: add new payment to the list
      setPayments(prev => {
        if (prev.some(p => p._id === payment._id)) return prev;
        return [payment, ...prev];
      });
    };

    // Subscribe to payment events
    socketService.onPaymentUpdate(handlePaymentUpdate);
    socketService.onPaymentNew(handlePaymentNew);

    return () => {
      socketService.removeListener('payment:update', handlePaymentUpdate);
      socketService.removeListener('payment:new', handlePaymentNew);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchPlans = async () => {
    try {
      const response = await api.get('/payments/plans');
      setPlans(response.data.plans);
      setExchangeRate(response.data.exchangeRate);
    } catch (error) {
      console.error('Error fetching plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPayments = async () => {
    try {
      // For admins, fetch all payments from their property
      // For tenants, fetch their own payments
      const endpoint = user?.role === 'admin' ? '/payments/all' : '/payments/user';
      const response = await api.get(endpoint);
      setPayments(response.data.payments || []);
    } catch (error) {
      console.error('Error fetching payments:', error);
    }
  };

  const fetchBankAccounts = async () => {
    try {
      const response = await api.get('/settings/bank-accounts');
      if (response.data.success) {
        setBankAccounts(response.data.accounts || []);
      }
    } catch (error) {
      console.error('Error fetching bank accounts:', error);
    }
  };

  const handleAddBankAccount = async () => {
    if (!newBankAccount.bankName || !newBankAccount.accountName || !newBankAccount.accountNumber) {
      setPaymentStatus({
        type: 'error',
        message: 'Please fill in bank name, account name, and account number'
      });
      return;
    }

    setSavingBank(true);
    try {
      const response = await api.post('/settings/bank-accounts', newBankAccount);
      if (response.data.success) {
        setBankAccounts([...bankAccounts, response.data.account]);
        setShowAddBank(false);
        setNewBankAccount({
          bankName: '',
          accountName: '',
          accountNumber: '',
          branch: '',
          swiftCode: '',
          isDefault: false
        });
        setPaymentStatus({
          type: 'success',
          message: 'Bank account added successfully'
        });
      }
    } catch (error) {
      setPaymentStatus({
        type: 'error',
        message: error.response?.data?.message || 'Failed to add bank account'
      });
    } finally {
      setSavingBank(false);
    }
  };

  const handleDeleteBankAccount = async (id) => {
    if (!window.confirm('Are you sure you want to delete this bank account?')) return;
    
    try {
      const response = await api.delete(`/settings/bank-accounts/${id}`);
      if (response.data.success) {
        setBankAccounts(bankAccounts.filter(acc => acc._id !== id));
        setPaymentStatus({
          type: 'success',
          message: 'Bank account deleted successfully'
        });
      }
    } catch (error) {
      setPaymentStatus({
        type: 'error',
        message: error.response?.data?.message || 'Failed to delete bank account'
      });
    }
  };

  const handleMpesaPayment = async (plan) => {
    setProcessing(true);
    setPaymentStatus(null);
    
    try {
      const response = await api.post('/payments/mpesa', {
        phoneNumber,
        amount: plan.priceKES || plan.priceUSD * 150,
        description: `${plan.name} Plan Subscription - ${plan.priceUSD}/month`
      });
      
      setPaymentStatus({
        type: 'success',
        message: response.data.message,
        transactionId: response.data.payment?.transactionId
      });
      
      // Poll for payment status
      pollPaymentStatus(response.data.payment?.transactionId);
    } catch (error) {
      setPaymentStatus({
        type: 'error',
        message: error.response?.data?.message || 'Payment failed'
      });
    } finally {
      setProcessing(false);
    }
  };

  const pollPaymentStatus = async (transactionId) => {
    const maxAttempts = 10;
    let attempts = 0;
    
    const checkStatus = async () => {
      attempts++;
      try {
        const response = await api.get(`/payments/status/${transactionId}`);
        const status = response.data.payment?.status;
        
        if (status === 'completed') {
          setPaymentStatus({
            type: 'success',
            message: 'Payment completed successfully!',
            transactionId
          });
          fetchPayments();
          return;
        } else if (status === 'failed') {
          setPaymentStatus({
            type: 'error',
            message: 'Payment failed. Please try again.',
            transactionId
          });
          return;
        }
        
        if (attempts < maxAttempts) {
          setTimeout(checkStatus, 2000);
        } else {
          setPaymentStatus({
            type: 'warning',
            message: 'Payment is still processing. We will notify you when complete.',
            transactionId
          });
        }
      } catch (error) {
        console.error('Status check error:', error);
      }
    };
    
    setTimeout(checkStatus, 2000);
  };

  const handleSubscribe = async (plan) => {
    if (paymentMethod === 'mpesa') {
      await handleMpesaPayment(plan);
    } else {
      await handleCardPayment(plan);
    }
  };

  const handleCardPayment = async (plan) => {
    setProcessing(true);
    setPaymentStatus(null);
    
    try {
      const response = await api.post('/payments/card', {
        cardNumber: cardDetails.number,
        expiry: cardDetails.expiry,
        cvv: cardDetails.cvv,
        amount: plan.priceKES || plan.priceUSD * 150,
        description: `${plan.name} Plan Subscription - ${plan.priceUSD}/month`
      });
      
      setPaymentStatus({
        type: 'success',
        message: response.data.message,
        transactionId: response.data.payment?.transactionId
      });
      
      pollPaymentStatus(response.data.payment?.transactionId);
    } catch (error) {
      setPaymentStatus({
        type: 'error',
        message: error.response?.data?.message || 'Payment failed'
      });
    } finally {
      setProcessing(false);
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-KE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return COLORS.success;
      case 'pending': return COLORS.warning;
      case 'failed': return COLORS.danger;
      default: return COLORS.secondary;
    }
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <img 
          src={bomaSecureLogo} 
          alt="BomaSecure" 
          style={{
            width: '120px',
            height: 'auto',
            animation: 'pulse 2s ease-in-out infinite'
          }} 
        />
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
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>Subscription & Payments</h1>
            <p style={styles.subtitle}>Manage your subscription and payment methods</p>
          </div>
        </div>

        {/* Tabs */}
        <div style={styles.tabs}>
          <button
            onClick={() => setActiveTab('subscribe')}
            style={{
              ...styles.tab,
              ...(activeTab === 'subscribe' ? styles.activeTab : {})
            }}
          >
            Subscribe
          </button>
          <button
            onClick={() => setActiveTab('history')}
            style={{
              ...styles.tab,
              ...(activeTab === 'history' ? styles.activeTab : {})
            }}
          >
            Payment History
          </button>
          {user?.role === 'admin' && (
            <button
              onClick={() => setActiveTab('bank')}
              style={{
                ...styles.tab,
                ...(activeTab === 'bank' ? styles.activeTab : {})
              }}
            >
              Bank Accounts
            </button>
          )}
        </div>

        {activeTab === 'bank' && user?.role === 'admin' && (
          <div style={styles.historySection}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={styles.sectionTitle}>Bank Accounts for Rent Payments</h3>
              <button
                onClick={() => setShowAddBank(!showAddBank)}
                style={{
                  padding: '8px 16px',
                  background: COLORS.primary,
                  border: 'none',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Plus size={16} />
                Add Bank Account
              </button>
            </div>

            {showAddBank && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  background: COLORS.card,
                  borderRadius: '12px',
                  padding: '20px',
                  marginBottom: '20px',
                  border: `1px solid ${COLORS.border}`
                }}
              >
                <h4 style={{ margin: '0 0 16px', color: COLORS.text, fontSize: '16px' }}>Add New Bank Account</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                  <div>
                    <label style={styles.label}>Bank Name *</label>
                    <input
                      type="text"
                      value={newBankAccount.bankName}
                      onChange={(e) => setNewBankAccount({ ...newBankAccount, bankName: e.target.value })}
                      placeholder="e.g., Kenya Commercial Bank"
                      style={styles.input}
                    />
                  </div>
                  <div>
                    <label style={styles.label}>Account Name *</label>
                    <input
                      type="text"
                      value={newBankAccount.accountName}
                      onChange={(e) => setNewBankAccount({ ...newBankAccount, accountName: e.target.value })}
                      placeholder="e.g., BomaSecure Apartments Ltd"
                      style={styles.input}
                    />
                  </div>
                  <div>
                    <label style={styles.label}>Account Number *</label>
                    <input
                      type="text"
                      value={newBankAccount.accountNumber}
                      onChange={(e) => setNewBankAccount({ ...newBankAccount, accountNumber: e.target.value })}
                      placeholder="e.g., 1234567890"
                      style={styles.input}
                    />
                  </div>
                  <div>
                    <label style={styles.label}>Branch</label>
                    <input
                      type="text"
                      value={newBankAccount.branch}
                      onChange={(e) => setNewBankAccount({ ...newBankAccount, branch: e.target.value })}
                      placeholder="e.g., Westlands"
                      style={styles.input}
                    />
                  </div>
                  <div>
                    <label style={styles.label}>SWIFT Code</label>
                    <input
                      type="text"
                      value={newBankAccount.swiftCode}
                      onChange={(e) => setNewBankAccount({ ...newBankAccount, swiftCode: e.target.value })}
                      placeholder="e.g., KCBLKEN"
                      style={styles.input}
                    />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: '2px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={newBankAccount.isDefault}
                        onChange={(e) => setNewBankAccount({ ...newBankAccount, isDefault: e.target.checked })}
                        style={{ width: '18px', height: '18px' }}
                      />
                      <span style={{ color: COLORS.text, fontSize: '14px' }}>Set as default account</span>
                    </label>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                  <button
                    onClick={handleAddBankAccount}
                    disabled={savingBank}
                    style={{
                      padding: '10px 20px',
                      background: COLORS.success,
                      border: 'none',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '14px',
                      fontWeight: 500,
                      cursor: savingBank ? 'not-allowed' : 'pointer',
                      opacity: savingBank ? 0.7 : 1
                    }}
                  >
                    {savingBank ? 'Saving...' : 'Save Bank Account'}
                  </button>
                  <button
                    onClick={() => setShowAddBank(false)}
                    style={{
                      padding: '10px 20px',
                      background: 'transparent',
                      border: `1px solid ${COLORS.border}`,
                      borderRadius: '8px',
                      color: COLORS.textSecondary,
                      fontSize: '14px',
                      cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            )}

            {bankAccounts.length === 0 ? (
              <div style={styles.emptyState}>
                <span style={styles.emptyIcon}>🏦</span>
                <h3>No bank accounts configured</h3>
                <p>Add bank accounts so tenants can pay rent via bank transfer</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
                {bankAccounts.map((account) => (
                  <motion.div
                    key={account._id}
                    whileHover={{ scale: 1.01 }}
                    style={{
                      background: COLORS.card,
                      borderRadius: '12px',
                      padding: '20px',
                      border: account.isDefault ? `2px solid ${COLORS.success}` : `1px solid ${COLORS.border}`
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                      <div>
                        <h4 style={{ margin: 0, color: COLORS.text, fontSize: '18px', fontWeight: 600 }}>{account.bankName}</h4>
                        {account.isDefault && (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            marginTop: '4px',
                            padding: '4px 8px',
                            background: COLORS.success + '20',
                            color: COLORS.success,
                            borderRadius: '12px',
                            fontSize: '12px',
                            fontWeight: 500
                          }}>
                            <Check size={12} /> Default
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => handleDeleteBankAccount(account._id)}
                        style={{
                          padding: '8px',
                          background: 'transparent',
                          border: 'none',
                          color: COLORS.danger,
                          cursor: 'pointer',
                          borderRadius: '6px'
                        }}
                        title="Delete"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: COLORS.textSecondary, fontSize: '14px' }}>Account Name</span>
                        <span style={{ color: COLORS.text, fontSize: '14px', fontWeight: 500 }}>{account.accountName}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: COLORS.textSecondary, fontSize: '14px' }}>Account Number</span>
                        <span style={{ color: COLORS.success, fontSize: '16px', fontWeight: 700, fontFamily: 'monospace' }}>{account.accountNumber}</span>
                      </div>
                      {account.branch && (
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: COLORS.textSecondary, fontSize: '14px' }}>Branch</span>
                          <span style={{ color: COLORS.text, fontSize: '14px' }}>{account.branch}</span>
                        </div>
                      )}
                      {account.swiftCode && (
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: COLORS.textSecondary, fontSize: '14px' }}>SWIFT Code</span>
                          <span style={{ color: COLORS.text, fontSize: '14px', fontFamily: 'monospace' }}>{account.swiftCode}</span>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'subscribe' ? (
          <>
            {/* Payment Method Selection */}
            <div style={styles.paymentMethodSection}>
              <h3 style={styles.sectionTitle}>Select Payment Method</h3>
              <div style={styles.paymentMethods}>
                <button
                  onClick={() => setPaymentMethod('mpesa')}
                  style={{
                    ...styles.paymentMethodBtn,
                    ...(paymentMethod === 'mpesa' ? styles.paymentMethodActive : {})
                  }}
                >
                  <span style={styles.paymentMethodIcon}>📱</span>
                  <span>M-Pesa</span>
                </button>
                <button
                  onClick={() => setPaymentMethod('card')}
                  style={{
                    ...styles.paymentMethodBtn,
                    ...(paymentMethod === 'card' ? styles.paymentMethodActive : {})
                  }}
                >
                  <span style={styles.paymentMethodIcon}>💳</span>
                  <span>Card</span>
                </button>
              </div>
              
              {paymentMethod === 'mpesa' && (
                <div style={styles.phoneInput}>
                  <label style={styles.label} htmlFor="mpesa-phone">Phone Number (M-Pesa registered)</label>
                  <input
                    id="mpesa-phone"
                    name="mpesaPhone"
                    type="tel"
                    autoComplete="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="0712345678"
                    style={styles.input}
                  />
                  <p style={styles.hint}>Enter the phone number registered with M-Pesa</p>
                </div>
              )}
              
              {paymentMethod === 'card' && (
                <div style={styles.cardInput}>
                  <label style={styles.label} htmlFor="card-number">Card Number</label>
                  <input
                    id="card-number"
                    name="cardNumber"
                    type="text"
                    autoComplete="cc-number"
                    placeholder="1234 5678 9012 3456"
                    style={styles.input}
                    maxLength={19}
                    value={cardDetails.number}
                    onChange={(e) => setCardDetails({ ...cardDetails, number: e.target.value })}
                  />
                  <div style={styles.cardRow}>
                    <div style={styles.cardField}>
                      <label style={styles.label} htmlFor="card-expiry">Expiry</label>
                      <input
                        id="card-expiry"
                        name="cardExpiry"
                        type="text"
                        autoComplete="cc-exp"
                        placeholder="MM/YY"
                        style={styles.input}
                        maxLength={5}
                        value={cardDetails.expiry}
                        onChange={(e) => setCardDetails({ ...cardDetails, expiry: e.target.value })}
                      />
                    </div>
                    <div style={styles.cardField}>
                      <label style={styles.label} htmlFor="card-cvv">CVV</label>
                      <input
                        id="card-cvv"
                        name="cardCvv"
                        type="text"
                        autoComplete="cc-csc"
                        placeholder="123"
                        style={styles.input}
                        maxLength={4}
                        value={cardDetails.cvv}
                        onChange={(e) => setCardDetails({ ...cardDetails, cvv: e.target.value })}
                      />
                    </div>
                  </div>
                  <p style={styles.hint}>Your card will be charged in KES</p>
                </div>
              )}
            </div>

            {/* Plans */}
            <div style={styles.plansGrid}>
              {plans.map((plan) => (
                <motion.div
                  key={plan.id}
                  whileHover={{ scale: 1.02 }}
                  style={styles.planCard}
                >
                  <div style={styles.planHeader}>
                    <h3 style={styles.planName}>{plan.name}</h3>
                    <div style={styles.planPrice}>
                      <span style={styles.currency}>$</span>
                      <span style={{...styles.amount, color: '#22C55E', fontWeight: 700}}>{plan.priceUSD}</span>
                      <span style={styles.period}>/{plan.period}</span>
                      {plan.priceKES && (
                        <span style={styles.kesPrice}> (KES {plan.priceKES.toLocaleString()})</span>
                      )}
                    </div>
                    {plan.rentCommission !== undefined && plan.rentCommission !== null && (
                      <div style={{...styles.commissionBadge, backgroundColor: plan.rentCommission === 0 ? '#22C55E' : '#F59E0B'}}>
                        {plan.rentCommission === 0 ? '0% Commission' : `${plan.rentCommission}% Commission`}
                      </div>
                    )}
                    {exchangeRate && (
                      <p style={styles.exchangeRate}>Exchange rate: 1 USD = KES {exchangeRate.KES}</p>
                    )}
                  </div>
                  <ul style={styles.featureList}>
                    {plan.features.map((feature, index) => (
                      <li key={index} style={styles.feature}>
                        <span style={{...styles.checkIcon, color: '#22C55E'}}>✓</span>
                        {feature}
                      </li>
                    ))}
                    {plan.excludedFeatures && plan.excludedFeatures.length > 0 && (
                      <>
                        <li style={{...styles.feature, color: '#94A3B8', marginTop: '8px'}}>
                          <span style={{...styles.checkIcon, color: '#94A3B8'}}>✗</span>
                          <strong>Not included:</strong>
                        </li>
                        {plan.excludedFeatures.map((feature, index) => (
                          <li key={`excluded-${index}`} style={{...styles.feature, color: '#94A3B8'}}>
                            <span style={{...styles.checkIcon, color: '#94A3B8'}}>-</span>
                            {feature}
                          </li>
                        ))}
                      </>
                    )}
                  </ul>
                  <button
                    onClick={() => handleSubscribe(plan)}
                    disabled={processing}
                    style={styles.subscribeBtn}
                  >
                    {processing ? 'Processing...' : `Subscribe with ${paymentMethod === 'mpesa' ? 'M-Pesa' : 'Card'}`}
                  </button>
                </motion.div>
              ))}
            </div>

            {/* Payment Status */}
            <AnimatePresence>
              {paymentStatus && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  style={{
                    ...styles.statusCard,
                    borderColor: paymentStatus.type === 'error' ? COLORS.danger : 
                                 paymentStatus.type === 'warning' ? COLORS.warning : COLORS.success
                  }}
                >
                  <div style={styles.statusHeader}>
                    <span style={styles.statusIcon}>
                      {paymentStatus.type === 'success' ? '✓' : 
                       paymentStatus.type === 'error' ? '✕' : '⏳'}
                    </span>
                    <span style={styles.statusTitle}>
                      {paymentStatus.type === 'success' ? 'Payment Successful!' :
                       paymentStatus.type === 'error' ? 'Payment Failed' : 'Processing'}
                    </span>
                  </div>
                  <p style={styles.statusMessage}>{paymentStatus.message}</p>
                  {paymentStatus.transactionId && (
                    <p style={styles.transactionId}>
                      Transaction ID: {paymentStatus.transactionId}
                    </p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </>
        ) : (
          /* Payment History */
          <div style={styles.historySection}>
            <h3 style={styles.sectionTitle}>Payment History</h3>
            {payments.length === 0 ? (
              <div style={styles.emptyState}>
                <span style={styles.emptyIcon}>💳</span>
                <h3>No payments yet</h3>
                <p>Your payment history will appear here</p>
              </div>
            ) : (
              <div style={styles.paymentsList}>
                {payments.map((payment) => (
                  <div key={payment._id} style={styles.paymentCard}>
                    <div style={styles.paymentInfo}>
                      <div style={styles.paymentMain}>
                        <span style={{...styles.paymentAmount, color: '#22C55E', fontWeight: 700}}>
                          KES {payment.amount.toLocaleString()}
                        </span>
                        <span style={{
                          ...styles.paymentStatus,
                          backgroundColor: getStatusColor(payment.status) + '20',
                          color: getStatusColor(payment.status)
                        }}>
                          {payment.status}
                        </span>
                      </div>
                      <div style={styles.paymentMeta}>
                        <span>Method: {payment.paymentMethod}</span>
                        <span>•</span>
                        <span>{formatDate(payment.createdAt)}</span>
                      </div>
                      {payment.transactionId && (
                        <span style={styles.transactionId}>
                          Ref: {payment.transactionId}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
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
  spinner: {
    width: '40px',
    height: '40px',
    border: '3px solid #334155',
    borderTopColor: '#2563EB',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  logoLoader: {
    width: '100px',
    height: 'auto',
  },
  header: {
    marginBottom: '24px',
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
  sectionTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: '16px',
  },
  paymentMethodSection: {
    marginBottom: '32px',
  },
  paymentMethods: {
    display: 'flex',
    gap: '12px',
    marginBottom: '16px',
  },
  paymentMethodBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 24px',
    border: `2px solid ${COLORS.border}`,
    borderRadius: '8px',
    background: COLORS.cardInner,
    color: COLORS.text,
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'all 0.2s',
  },
  paymentMethodActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '10',
    color: COLORS.primary,
  },
  paymentMethodIcon: {
    fontSize: '20px',
  },
  phoneInput: {
    marginTop: '16px',
  },
  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '500',
    color: COLORS.text,
    marginBottom: '8px',
  },
  input: {
    width: '100%',
    maxWidth: '300px',
    padding: '10px 14px',
    border: `1px solid ${COLORS.border}`,
    borderRadius: '8px',
    fontSize: '14px',
    color: COLORS.text,
    backgroundColor: COLORS.cardInner,
    boxSizing: 'border-box',
  },
  hint: {
    fontSize: '12px',
    color: COLORS.textSecondary,
    marginTop: '4px',
  },
  cardInput: {
    marginTop: '16px',
  },
  cardRow: {
    display: 'flex',
    gap: '12px',
    marginTop: '12px',
  },
  cardField: {
    flex: 1,
  },
  plansGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '20px',
    marginBottom: '32px',
  },
  planCard: {
    backgroundColor: COLORS.card,
    borderRadius: '12px',
    padding: '24px',
    border: `1px solid ${COLORS.border}`,
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
  },
  planHeader: {
    marginBottom: '20px',
  },
  planName: {
    fontSize: '20px',
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: '8px',
  },
  planPrice: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '4px',
  },
  currency: {
    fontSize: '16px',
    color: COLORS.textSecondary,
  },
  amount: {
    fontSize: '32px',
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  period: {
    fontSize: '14px',
    color: COLORS.textSecondary,
  },
  kesPrice: {
    fontSize: '14px',
    color: COLORS.textSecondary,
    marginLeft: '8px',
  },
  exchangeRate: {
    fontSize: '12px',
    color: COLORS.textSecondary,
    marginTop: '4px',
    fontStyle: 'italic',
  },
  featureList: {
    listStyle: 'none',
    padding: 0,
    margin: '0 0 24px 0',
  },
  feature: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 0',
    fontSize: '14px',
    color: COLORS.text,
  },
  checkIcon: {
    color: COLORS.success,
    fontWeight: 'bold',
  },
  subscribeBtn: {
    width: '100%',
    padding: '12px',
    backgroundColor: COLORS.primary,
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background 0.2s',
  },
  statusCard: {
    backgroundColor: COLORS.card,
    borderRadius: '12px',
    padding: '20px',
    borderLeft: `2px solid ${COLORS.success}`,
    borderRight: `2px solid ${COLORS.success}`,
    borderTop: `2px solid ${COLORS.success}`,
    borderBottom: `2px solid ${COLORS.success}`,
    marginBottom: '24px',
  },
  statusHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '12px',
  },
  statusIcon: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    backgroundColor: COLORS.success + '30',
    color: COLORS.success,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold',
  },
  statusTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: COLORS.text,
  },
  statusMessage: {
    fontSize: '14px',
    color: COLORS.textSecondary,
    marginBottom: '8px',
  },
  transactionId: {
    fontSize: '12px',
    color: COLORS.textSecondary,
    fontFamily: 'monospace',
  },
  bankDetails: {
    marginTop: '16px',
    padding: '16px',
    background: COLORS.cardInner,
    borderRadius: '8px',
    border: `1px solid ${COLORS.border}`,
  },
  bankDetailRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 0',
    borderBottom: `1px solid ${COLORS.border}`,
    fontSize: '14px',
    color: COLORS.text,
  },
  bankNote: {
    fontSize: '12px',
    color: COLORS.warning,
    marginTop: '12px',
    fontStyle: 'italic',
  },
  historySection: {
    marginTop: '16px',
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px',
    background: COLORS.card,
    borderRadius: '12px',
    border: `1px solid ${COLORS.border}`,
    color: COLORS.textSecondary,
  },
  emptyIcon: {
    fontSize: '48px',
    display: 'block',
    marginBottom: '16px',
  },
  paymentsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  paymentCard: {
    backgroundColor: COLORS.card,
    borderRadius: '8px',
    padding: '16px',
    border: `1px solid ${COLORS.border}`,
  },
  paymentInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  paymentMain: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  paymentAmount: {
    fontSize: '18px',
    fontWeight: '600',
    color: COLORS.text,
  },
  paymentStatus: {
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  paymentMeta: {
    display: 'flex',
    gap: '8px',
    fontSize: '12px',
    color: COLORS.textSecondary,
  },
  commissionBadge: {
    display: 'inline-block',
    padding: '6px 12px',
    borderRadius: '20px',
    fontSize: '14px',
    fontWeight: '600',
    color: '#fff',
    marginTop: '8px',
  },
};

export default PaymentPage;
