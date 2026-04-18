import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { paymentsAPI } from '../../services/api';
import socketService from '../../services/socket';
import { currencyService } from '../../services/currencyService';
import CurrencySelector from '../common/CurrencySelector';
import { 
  Users, 
  Building, 
  DollarSign, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Search,
  RefreshCw,
  Filter,
  Phone,
  Wallet,
  XCircle
} from 'lucide-react';

const AdminTenantsFinance = () => {
  const [tenants, setTenants] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [displayCurrency, setDisplayCurrency] = useState('USD');

  const fetchTenantsFinance = async () => {
    try {
      const response = await paymentsAPI.getAdminTenantsFinance();
      setTenants(response.data.tenants || []);
      setSummary(response.data.summary);
    } catch (error) {
      console.error('Error fetching tenants finance:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTenantsFinance();
  }, []);

  useEffect(() => {
    socketService.joinAdmin();

    const handlePaymentNew = (payment) => {
      console.log('New payment received:', payment);
      fetchTenantsFinance();
    };

    const handleRentReceived = (data) => {
      console.log('Rent payment received:', data);
      fetchTenantsFinance();
    };

    const handleRentUpdate = (data) => {
      console.log('Rent update received:', data);
      fetchTenantsFinance();
    };

    const handleTenantRentStatus = (data) => {
      console.log('Tenant rent status changed:', data);
      fetchTenantsFinance();
    };

    socketService.onPaymentNew(handlePaymentNew);
    socketService.onRentReceived(handleRentReceived);
    socketService.onRentUpdate(handleRentUpdate);
    socketService.onTenantRentStatus(handleTenantRentStatus);

    return () => {
      socketService.removeListener('payment:new', handlePaymentNew);
      socketService.removeListener('rent:received', handleRentReceived);
      socketService.removeListener('rent:update', handleRentUpdate);
      socketService.removeListener('tenant:rentStatus', handleTenantRentStatus);
    };
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchTenantsFinance();
  };

  const formatCurrency = (amount) => {
    const kesAmount = amount || 0;
    if (displayCurrency !== 'KES') {
      const converted = currencyService.convert(kesAmount, 'KES', displayCurrency);
      return currencyService.format(converted, displayCurrency);
    }
    return `KES ${kesAmount.toLocaleString()}`;
  };
  
  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-KE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
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
      <span style={{
        padding: '4px 10px',
        borderRadius: '20px',
        fontSize: '12px',
        fontWeight: 600,
        background: style.bg,
        color: style.color
      }}>
        {style.text}
      </span>
    );
  };

  const filteredTenants = tenants.filter(tenant => {
    const matchesSearch = tenant.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tenant.phone?.includes(searchTerm) ||
      tenant.roomNumber?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || tenant.rentStatus === filterStatus;
    return matchesSearch && matchesFilter;
  });

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

  return (
    <div style={styles.container}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div style={styles.header}>
          <div>
            <h1 className="tenant-finance-title" style={styles.title}>Tenant Finance 💰</h1>
            <p style={styles.subtitle}>Track rent payments from your tenants</p>
          </div>
          <div style={styles.headerRight}>
            <div style={styles.currencySelector}>
              <span style={styles.currencyLabel}>Display in:</span>
              <CurrencySelector value={displayCurrency} onChange={setDisplayCurrency} showCurrencyCode={true} />
            </div>
            <button onClick={handleRefresh} style={styles.refreshBtn}>
              <RefreshCw size={18} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>

        <div style={styles.statsGrid}>
          <motion.div whileHover={{ y: -4 }} style={styles.statCard}>
            <div style={{ ...styles.statIcon, background: '#3B82F620' }}>
              <Users size={24} color="#3B82F6" />
            </div>
            <div style={styles.statContent}>
              <span style={styles.statLabel}>Total Tenants</span>
              <span style={styles.statValue}>{summary?.totalTenants || 0}</span>
            </div>
          </motion.div>

          <motion.div whileHover={{ y: -4 }} style={styles.statCard}>
            <div style={{ ...styles.statIcon, background: '#10B98120' }}>
              <DollarSign size={24} color="#10B981" />
            </div>
            <div style={styles.statContent}>
              <span style={styles.statLabel}>Total Collected (Gross)</span>
              <span style={{ ...styles.statValue, color: '#10B981' }}>
                {formatCurrency(summary?.totalCollected)}
              </span>
            </div>
          </motion.div>

          <motion.div whileHover={{ y: -4 }} style={styles.statCard}>
            <div style={{ ...styles.statIcon, background: '#F59E0B20' }}>
              <Clock size={24} color="#F59E0B" />
            </div>
            <div style={styles.statContent}>
              <span style={styles.statLabel}>Platform Fee (5%)</span>
              <span style={{ ...styles.statValue, color: '#F59E0B' }}>
                {formatCurrency(summary?.totalCollected * 0.05)}
              </span>
            </div>
          </motion.div>

          <motion.div whileHover={{ y: -4 }} style={styles.statCard}>
            <div style={{ ...styles.statIcon, background: '#8B5CF620' }}>
              <DollarSign size={24} color="#8B5CF6" />
            </div>
            <div style={styles.statContent}>
              <span style={styles.statLabel}>Net Revenue</span>
              <span style={{ ...styles.statValue, color: '#8B5CF6' }}>
                {formatCurrency(summary?.totalCollected * 0.95)}
              </span>
            </div>
          </motion.div>

          <motion.div whileHover={{ y: -4 }} style={styles.statCard}>
            <div style={{ ...styles.statIcon, background: '#F59E0B20' }}>
              <Clock size={24} color="#F59E0B" />
            </div>
            <div style={styles.statContent}>
              <span style={styles.statLabel}>Expected</span>
              <span style={styles.statValue}>{formatCurrency(summary?.totalRentExpected)}</span>
            </div>
          </motion.div>

          <motion.div whileHover={{ y: -4 }} style={styles.statCard}>
            <div style={{ ...styles.statIcon, background: '#EF444420' }}>
              <AlertCircle size={24} color="#EF4444" />
            </div>
            <div style={styles.statContent}>
              <span style={styles.statLabel}>Overdue Tenants</span>
              <span style={{ ...styles.statValue, color: '#EF4444' }}>
                {summary?.totalOverdue || 0}
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
                {summary?.totalPending || 0}
              </span>
            </div>
          </motion.div>

          <motion.div whileHover={{ y: -4 }} style={styles.statCard}>
            <div style={{ ...styles.statIcon, background: '#8B5CF620' }}>
              <Wallet size={24} color="#8B5CF6" />
            </div>
            <div style={styles.statContent}>
              <span style={styles.statLabel}>Total Deposits</span>
              <span style={styles.statValue}>
                {formatCurrency(tenants.reduce((sum, t) => sum + (t.depositAmount || 0), 0))}
              </span>
            </div>
          </motion.div>
        </div>

        <div style={styles.filtersCard}>
          <div style={styles.searchBox}>
            <Search size={18} color="#64748B" />
            <input
              type="text"
              placeholder="Search by name, phone, or room..."
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
              <option value="paid">Paid</option>
              <option value="partial">Partial</option>
              <option value="pending">Pending</option>
              <option value="overdue">Overdue</option>
            </select>
          </div>
        </div>

        <div style={styles.tableCard}>
          <div style={styles.tableHeader}>
            <h3 style={styles.cardTitle}>
              <Building size={20} />
              Tenant Payments
            </h3>
            <span style={styles.tableCount}>
              {filteredTenants.length} tenant{filteredTenants.length !== 1 ? 's' : ''}
            </span>
          </div>

          {filteredTenants.length === 0 ? (
            <div style={styles.emptyState}>
              <Users size={40} color="#64748B" />
              <p>No tenants found</p>
            </div>
          ) : (
            <div style={styles.tableWrapper}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Tenant</th>
                    <th style={styles.th}>Property/Unit</th>
                    <th style={styles.th}>Rent Amount</th>
                    <th style={styles.th}>Deposit</th>
                    <th style={styles.th}>Paid This Month</th>
                    <th style={styles.th}>Platform Fee (5%)</th>
                    <th style={styles.th}>Net Collected</th>
                    <th style={styles.th}>Balance</th>
                    <th style={styles.th}>Status</th>
                    <th style={styles.th}>Last Payment</th>
                    <th style={styles.th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTenants.map((tenant) => (
                    <tr key={tenant.id} style={styles.tr}>
                      <td style={styles.td}>
                        <div style={styles.tenantInfo}>
                          <div style={styles.tenantAvatar}>
                            {tenant.name?.charAt(0)}
                          </div>
                          <div>
                            <div style={styles.tenantName}>{tenant.name}</div>
                            <div style={styles.tenantContact}>
                              {tenant.phone}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td style={styles.td}>
                        <div style={styles.propertyInfo}>
                          <div style={styles.propertyName}>
                            {tenant.apartmentId?.buildingName || tenant.apartment?.buildingName || '-'}
                          </div>
                          {tenant.roomNumber && (
                            <div style={styles.propertyUnit}>
                              Unit {tenant.roomNumber}
                            </div>
                          )}
                        </div>
                      </td>
                      <td style={styles.td}>
                        <span style={styles.amount}>{formatCurrency(tenant.rentAmount)}</span>
                      </td>
                      <td style={styles.td}>
                        <span style={{ 
                          fontWeight: 500, 
                          color: tenant.depositPaid ? '#10B981' : '#F59E0B' 
                        }}>
                          {formatCurrency(tenant.depositAmount)}
                        </span>
                        {tenant.depositPaid && (
                          <CheckCircle size={12} color="#10B981" style={{ marginLeft: '4px' }} />
                        )}
                      </td>
                      <td style={styles.td}>
                        <span style={{ ...styles.amount, color: '#10B981' }}>
                          {formatCurrency(tenant.paidThisMonth)}
                        </span>
                      </td>
                      <td style={styles.td}>
                        <span style={{ color: '#F59E0B', fontWeight: 500 }}>
                          {formatCurrency(tenant.paidThisMonth * 0.05)}
                        </span>
                      </td>
                      <td style={styles.td}>
                        <span style={{ color: '#10B981', fontWeight: 600 }}>
                          {formatCurrency(tenant.paidThisMonth * 0.95)}
                        </span>
                      </td>
                      <td style={styles.td}>
                        <span style={{
                          ...styles.amount,
                          color: tenant.balance > 0 ? '#EF4444' : '#10B981'
                        }}>
                          {formatCurrency(tenant.balance)}
                        </span>
                      </td>
                      <td style={styles.td}>
                        {getStatusBadge(tenant.rentStatus)}
                      </td>
                      <td style={styles.td}>
                        {tenant.lastPayment ? (
                          <div>
                            <div style={styles.lastPaymentAmount}>
                              {formatCurrency(tenant.lastPayment.amount)}
                            </div>
                            <div style={styles.lastPaymentDate}>
                              {formatDate(tenant.lastPayment.date)}
                            </div>
                          </div>
                        ) : (
                          <span style={styles.noPayment}>No payments</span>
                        )}
                      </td>
                      <td style={styles.td}>
                        <div style={styles.actionButtons}>
                          {tenant.phone && (
                            <a href={`tel:${tenant.phone}`} style={styles.iconBtn} title="Call">
                              <Phone size={16} />
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </motion.div>

      <style>{`
        @media (max-width: 1024px) {
          .table-wrapper { overflow-x: auto; }
        }
        @media (max-width: 768px) {
          .tenant-finance-title {
            font-size: 22px !important;
          }
          .stats-grid { 
            grid-template-columns: repeat(2, 1fr) !important; 
          }
          .filters-card { 
            flex-direction: column !important; 
            gap: 12px !important;
          }
          .header {
            flex-direction: column !important;
            align-items: stretch !important;
          }
          .container {
            padding: 16px !important;
          }
        }
        @media (max-width: 500px) {
          .stats-grid { grid-template-columns: 1fr !important; }
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
    flexWrap: 'wrap',
    gap: '16px',
  },
  headerRight: {
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
    color: '#94A3B8',
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
  filtersCard: {
    display: 'flex',
    gap: '16px',
    marginBottom: '24px',
    padding: '16px',
    background: '#1E293B',
    borderRadius: '12px',
    border: '1px solid #334155',
    flexWrap: 'wrap',
  },
  searchBox: {
    flex: '1 1 300px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 16px',
    background: '#0F172A',
    borderRadius: '8px',
    border: '1px solid #334155',
    minWidth: '200px',
  },
  filterGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flex: '0 1 auto',
  },
  searchInput: {
    flex: 1,
    background: 'transparent',
    border: 'none',
    color: '#F1F5F9',
    fontSize: '14px',
    outline: 'none',
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
  tableCard: {
    background: '#1E293B',
    borderRadius: '12px',
    border: '1px solid #334155',
    padding: '20px',
  },
  tableHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  cardTitle: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#F1F5F9',
    margin: 0,
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  tableCount: {
    fontSize: '14px',
    color: '#64748B',
  },
  tableWrapper: {
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  th: {
    padding: '12px 16px',
    textAlign: 'left',
    fontSize: '12px',
    fontWeight: 600,
    color: '#64748B',
    borderBottom: '1px solid #334155',
    textTransform: 'uppercase',
  },
  tr: {
    borderBottom: '1px solid #334155',
  },
  td: {
    padding: '16px',
    fontSize: '14px',
    color: '#F1F5F9',
    verticalAlign: 'middle',
  },
  tenantInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  tenantAvatar: {
    width: '40px',
    height: '40px',
    borderRadius: '10px',
    background: '#3B82F6',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 600,
    fontSize: '16px',
  },
  tenantName: {
    fontWeight: 600,
    color: '#F1F5F9',
  },
  tenantContact: {
    fontSize: '12px',
    color: '#64748B',
  },
  propertyInfo: {
    display: 'flex',
    flexDirection: 'column',
  },
  propertyName: {
    fontWeight: 500,
    color: '#F1F5F9',
  },
  propertyUnit: {
    fontSize: '12px',
    color: '#64748B',
  },
  amount: {
    fontWeight: 600,
    color: '#F1F5F9',
  },
  depositInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '11px',
    color: '#64748B',
    marginTop: '2px',
  },
  lastPaymentAmount: {
    fontWeight: 500,
    color: '#F1F5F9',
  },
  lastPaymentDate: {
    fontSize: '12px',
    color: '#64748B',
  },
  noPayment: {
    color: '#64748B',
    fontSize: '13px',
  },
  actionButtons: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  iconBtn: {
    padding: '8px',
    background: '#0F172A',
    borderRadius: '6px',
    color: '#64748B',
    textDecoration: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewBtn: {
    padding: '8px 12px',
    background: '#3B82F6',
    border: 'none',
    borderRadius: '6px',
    color: '#fff',
    fontSize: '12px',
    fontWeight: 500,
    cursor: 'pointer',
  },
  emptyState: {
    textAlign: 'center',
    padding: '40px',
    color: '#64748B',
  },
};

export default AdminTenantsFinance;