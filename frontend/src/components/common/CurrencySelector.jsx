import React, { useState, useEffect, useRef } from 'react';
import { currencyService } from '../../services/currencyService';
import { ChevronDown, Search, RefreshCw } from 'lucide-react';

const CurrencySelector = ({ value, onChange, showCurrencyCode = true }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [currencies, setCurrencies] = useState([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    setCurrencies(currencyService.getCurrencies());
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleRefresh = async (e) => {
    e.stopPropagation();
    setLoading(true);
    await currencyService.fetchRates();
    setLoading(false);
  };

  const filteredCurrencies = currencies.filter(c => 
    c.code.toLowerCase().includes(search.toLowerCase()) ||
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const selectedCurrency = currencies.find(c => c.code === value);

  return (
    <div style={styles.container} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={styles.selector}
      >
        <span style={styles.flag}>{selectedCurrency?.flag || '🌐'}</span>
        <span style={styles.code}>{value || 'USD'}</span>
        {showCurrencyCode && selectedCurrency && (
          <span style={styles.name}>{selectedCurrency.name}</span>
        )}
        <ChevronDown size={16} style={{ 
          transform: isOpen ? 'rotate(180deg)' : 'rotate(0)',
          transition: 'transform 0.2s'
        }} />
      </button>

      {isOpen && (
        <div style={styles.dropdown}>
          <div style={styles.searchContainer}>
            <Search size={16} style={styles.searchIcon} />
            <input
              type="text"
              placeholder="Search currency..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={styles.searchInput}
              autoFocus
            />
            <button onClick={handleRefresh} style={styles.refreshBtn} title="Refresh rates">
              <RefreshCw size={14} style={loading ? { animation: 'spin 1s linear infinite' } : {}} />
            </button>
          </div>
          <style>{`
            @keyframes spin { 100% { transform: rotate(360deg); } }
          `}</style>
          <div style={styles.list}>
            {filteredCurrencies.map(currency => (
              <button
                key={currency.code}
                type="button"
                onClick={() => {
                  onChange(currency.code);
                  setIsOpen(false);
                  setSearch('');
                }}
                style={{
                  ...styles.option,
                  ...(value === currency.code ? styles.optionSelected : {})
                }}
              >
                <span style={styles.optionFlag}>{currency.flag}</span>
                <span style={styles.optionCode}>{currency.code}</span>
                <span style={styles.optionName}>{currency.name}</span>
                <span style={styles.optionSymbol}>{currency.symbol}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    position: 'relative',
    display: 'inline-block',
  },
  selector: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    background: '#0F172A',
    border: '1px solid #334155',
    borderRadius: '8px',
    color: '#F1F5F9',
    cursor: 'pointer',
    fontSize: '14px',
    minWidth: '120px',
  },
  flag: {
    fontSize: '18px',
  },
  code: {
    fontWeight: '600',
  },
  name: {
    color: '#94A3B8',
    fontSize: '12px',
    flex: 1,
    textAlign: 'left',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    marginTop: '4px',
    width: '320px',
    maxHeight: '400px',
    background: '#1E293B',
    border: '1px solid #334155',
    borderRadius: '12px',
    boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
    zIndex: 1000,
    overflow: 'hidden',
  },
  searchContainer: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px',
    borderBottom: '1px solid #334155',
    gap: '8px',
  },
  searchIcon: {
    color: '#94A3B8',
    flexShrink: 0,
  },
  searchInput: {
    flex: 1,
    background: 'transparent',
    border: 'none',
    color: '#F1F5F9',
    fontSize: '14px',
    outline: 'none',
  },
  refreshBtn: {
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
  list: {
    maxHeight: '340px',
    overflowY: 'auto',
  },
  option: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    width: '100%',
    padding: '10px 12px',
    background: 'transparent',
    border: 'none',
    color: '#F1F5F9',
    cursor: 'pointer',
    fontSize: '14px',
    textAlign: 'left',
  },
  optionSelected: {
    background: '#2563EB20',
  },
  optionFlag: {
    fontSize: '20px',
  },
  optionCode: {
    fontWeight: '600',
    width: '40px',
  },
  optionName: {
    flex: 1,
    color: '#94A3B8',
    fontSize: '13px',
  },
  optionSymbol: {
    color: '#64748B',
    fontSize: '13px',
  },
};

export default CurrencySelector;