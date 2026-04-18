import React, { useState, useEffect, useCallback } from 'react';
import { currencyService } from '../../services/currencyService';
import CurrencySelector from './CurrencySelector';
import { ArrowRightLeft, RefreshCw, X } from 'lucide-react';

const CurrencyConverter = ({ 
  amount: initialAmount, 
  fromCurrency: initialFrom = 'KES',
  toCurrency: initialTo = 'USD',
  onConversion,
  showAmountInput = true,
  compact = false,
  showWidget = true,
  onClose
}) => {
  const [amount, setAmount] = useState(initialAmount || 0);
  const [fromCurrency, setFromCurrency] = useState(initialFrom);
  const [toCurrency, setToCurrency] = useState(initialTo);
  const [convertedAmount, setConvertedAmount] = useState(0);
  const [lastUpdated, setLastUpdated] = useState('');
  const [isOpen, setIsOpen] = useState(showWidget);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const convert = useCallback(() => {
    const result = currencyService.convert(amount, fromCurrency, toCurrency);
    setConvertedAmount(result);
    setLastUpdated(currencyService.getLastUpdated());
    if (onConversion) {
      onConversion({ amount, fromCurrency, toCurrency, result });
    }
  }, [amount, fromCurrency, toCurrency, onConversion]);

  useEffect(() => {
    convert();
  }, [convert]);

  useEffect(() => {
    const unsubscribe = currencyService.subscribe(() => {
      convert();
    });
    currencyService.startAutoRefresh(300000);
    return () => {
      unsubscribe();
    };
  }, [convert]);

  const handleSwap = () => {
    const temp = fromCurrency;
    setFromCurrency(toCurrency);
    setToCurrency(temp);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await currencyService.fetchRates();
    setIsRefreshing(false);
    convert();
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!isOpen && !compact) {
    return (
      <div style={styles.widgetToggle}>
        <button onClick={() => setIsOpen(true)} style={styles.toggleBtn}>
          <ArrowRightLeft size={16} />
        </button>
      </div>
    );
  }

  if (compact) {
    return (
      <div style={styles.compactContainer}>
        <div style={styles.compactHeader}>
          <button onClick={handleRefresh} style={styles.refreshBtn} disabled={isRefreshing}>
            <RefreshCw size={12} style={isRefreshing ? { animation: 'spin 1s linear infinite' } : {}} />
          </button>
        </div>
        <div style={styles.compactRow}>
          <CurrencySelector value={fromCurrency} onChange={setFromCurrency} />
          <ArrowRightLeft size={14} style={styles.swapIcon} />
          <CurrencySelector value={toCurrency} onChange={setToCurrency} />
        </div>
        {amount > 0 && (
          <div style={styles.compactResult}>
            {currencyService.format(convertedAmount, toCurrency)}
          </div>
        )}
        {showAmountInput && (
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
            style={styles.compactInput}
            placeholder="Amount"
          />
        )}
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <span style={styles.title}>Currency Converter</span>
        </div>
        <div style={styles.headerRight}>
          <button onClick={handleRefresh} style={styles.actionBtn} title="Refresh rates" disabled={isRefreshing}>
            <RefreshCw size={14} style={isRefreshing ? { animation: 'spin 1s linear infinite' } : {}} />
          </button>
          {onClose && (
            <button onClick={() => { setIsOpen(false); onClose(); }} style={styles.actionBtn} title="Close">
              <X size={14} />
            </button>
          )}
        </div>
      </div>
      {lastUpdated && (
        <div style={styles.updated}>
          Rates: {formatDate(lastUpdated)}
        </div>
      )}
      
      <div style={styles.converter}>
        <div style={styles.inputGroup}>
          <label style={styles.label}>From</label>
          {showAmountInput && (
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
              style={styles.input}
              placeholder="Enter amount"
            />
          )}
          <CurrencySelector value={fromCurrency} onChange={setFromCurrency} />
        </div>

        <button onClick={handleSwap} style={styles.swapBtn} title="Swap currencies">
          <ArrowRightLeft size={20} />
        </button>

        <div style={styles.inputGroup}>
          <label style={styles.label}>To</label>
          <div style={styles.resultDisplay}>
            {currencyService.format(convertedAmount, toCurrency)}
          </div>
          <CurrencySelector value={toCurrency} onChange={setToCurrency} />
        </div>
      </div>

      <div style={styles.rateInfo}>
        1 {fromCurrency} = {currencyService.convert(1, fromCurrency, toCurrency).toFixed(4)} {toCurrency}
      </div>
    </div>
  );
};

const styles = {
  container: {
    background: '#1E293B',
    borderRadius: '12px',
    padding: '16px',
    border: '1px solid #334155',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  title: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#F1F5F9',
  },
  updated: {
    fontSize: '12px',
    color: '#64748B',
  },
  converter: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: '12px',
    flexWrap: 'wrap',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    flex: 1,
    minWidth: '180px',
  },
  label: {
    fontSize: '13px',
    color: '#94A3B8',
    fontWeight: '500',
  },
  input: {
    padding: '12px',
    background: '#0F172A',
    border: '1px solid #334155',
    borderRadius: '8px',
    color: '#F1F5F9',
    fontSize: '16px',
    fontWeight: '600',
    width: '100%',
    boxSizing: 'border-box',
  },
  resultDisplay: {
    padding: '12px',
    background: '#0F172A',
    border: '1px solid #334155',
    borderRadius: '8px',
    color: '#10B981',
    fontSize: '16px',
    fontWeight: '600',
  },
  swapBtn: {
    padding: '12px',
    background: '#2563EB',
    border: 'none',
    borderRadius: '8px',
    color: '#fff',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rateInfo: {
    marginTop: '12px',
    fontSize: '13px',
    color: '#64748B',
    textAlign: 'center',
  },
  compactContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  compactRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  swapIcon: {
    color: '#64748B',
  },
  compactResult: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#10B981',
    textAlign: 'center',
    padding: '8px',
    background: '#10B98110',
    borderRadius: '6px',
  },
  widgetToggle: {
    position: 'fixed',
    top: '20px',
    right: '20px',
    zIndex: 1000,
  },
  toggleBtn: {
    padding: '10px 14px',
    background: '#2563EB',
    border: 'none',
    borderRadius: '8px',
    color: '#fff',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  headerRight: {
    display: 'flex',
    gap: '4px',
  },
  actionBtn: {
    padding: '6px',
    background: 'transparent',
    border: 'none',
    color: '#94A3B8',
    cursor: 'pointer',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  refreshBtn: {
    padding: '4px',
    background: 'transparent',
    border: 'none',
    color: '#94A3B8',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
  },
  compactHeader: {
    display: 'flex',
    justifyContent: 'flex-end',
  },
  compactInput: {
    padding: '8px',
    background: '#0F172A',
    border: '1px solid #334155',
    borderRadius: '6px',
    color: '#F1F5F9',
    fontSize: '14px',
    width: '100%',
    boxSizing: 'border-box',
  },
};

export default CurrencyConverter;