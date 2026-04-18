import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity, Modal, FlatList as NFT, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { paymentsAPI } from '../../services/api';
import { COLORS } from '../../config';
import { getCurrencies, convert, formatSimple, getCurrencyByCode } from '../../services/currencyService';

export default function TenantPayments({ navigation }) {
  const { user } = useAuth();
  const [payments, setPayments] = useState([]);
  const [finance, setFinance] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState('KES');
  const [currencies] = useState(getCurrencies());
  const [searchQuery, setSearchQuery] = useState('');

  const fetchPayments = async () => {
    try {
      if (user?.role === 'admin') {
        const [paymentsRes, analyticsRes] = await Promise.all([
          paymentsAPI.getAll({ limit: 50, sort: '-createdAt', paymentMethod: { $ne: 'bank' } }),
          paymentsAPI.getAdminAnalytics()
        ]);
        setPayments(paymentsRes.data.payments || paymentsRes.data);
        setFinance(analyticsRes.data);
      } else {
        const [paymentsRes, financeRes] = await Promise.all([
          paymentsAPI.getByApartment(user?.apartment?._id || user?.apartment, { paymentMethod: { $ne: 'bank' } }),
          paymentsAPI.getTenantRentDashboard()
        ]);
        setPayments(paymentsRes.data);
        setFinance(financeRes.data.dashboard);
      }
    } catch (e) {
      console.log('Error:', e);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [user]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchPayments();
    setRefreshing(false);
  };

  const handleCurrencySelect = (currencyCode) => {
    setSelectedCurrency(currencyCode);
    setShowCurrencyPicker(false);
    setSearchQuery('');
  };

  const getPaymentAmount = (payment) => {
    const baseCurrency = payment.currency || finance?.currency || 'KES';
    if (selectedCurrency === baseCurrency) {
      return formatSimple(payment.amount, baseCurrency);
    }
    const converted = convert(payment.amount, baseCurrency, selectedCurrency);
    return formatSimple(converted, selectedCurrency);
  };

  const renderPayment = ({ item }) => {
    const isCompleted = item.status === 'completed';
    const isPartial = item.status === 'partial';
    const isFailed = item.status === 'failed';
    
    let statusColor = COLORS.accent;
    let amountPrefix = '+';
    
    if (isCompleted) {
      statusColor = COLORS.success;
      amountPrefix = '-';
    } else if (isPartial) {
      statusColor = COLORS.warning;
      amountPrefix = '-';
    } else if (isFailed) {
      statusColor = COLORS.danger;
      amountPrefix = '+';
    }
    
    return (
      <View style={styles.card}>
        <View style={styles.cardIcon}>
          <Ionicons 
            name={item.paymentType === 'rent' ? 'home' : 'card'} 
            size={24} 
            color={statusColor} 
          />
        </View>
        <View style={styles.cardContent}>
          <Text style={styles.cardTitle}>
            {item.description || (item.paymentType === 'rent' ? 'Rent Payment' : item.paymentType === 'deposit' ? 'Deposit' : 'Payment')}
          </Text>
          <Text style={styles.cardMeta}>
            {user?.role === 'admin' ? (item.userId?.name || 'Unknown') + ' • ' : ''}
            {item.paidAt ? new Date(item.paidAt).toLocaleDateString() : new Date(item.createdAt).toLocaleDateString()}
          </Text>
        </View>
        <View style={styles.amountContainer}>
          <Text style={[styles.amount, { color: statusColor }]}>
            {amountPrefix}{getPaymentAmount(item)}
          </Text>
          <Text style={styles.currencyLabel}>{selectedCurrency}</Text>
        </View>
      </View>
    );
  };

  const filteredCurrencies = searchQuery
    ? currencies.filter(c => 
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.code.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : currencies;

  const selectedCurrencyInfo = getCurrencyByCode(selectedCurrency);

  const getRentDisplay = () => {
    if (!finance?.rentAmount) return 'N/A';
    const baseCurrency = finance.currency || 'KES';
    if (selectedCurrency === baseCurrency) {
      return formatSimple(finance.rentAmount, baseCurrency);
    }
    const converted = convert(finance.rentAmount, baseCurrency, selectedCurrency);
    return formatSimple(converted, selectedCurrency);
  };

  const getBalanceDisplay = () => {
    if (!finance?.balance) return 'N/A';
    const baseCurrency = finance.currency || 'KES';
    if (selectedCurrency === baseCurrency) {
      return formatSimple(finance.balance, baseCurrency);
    }
    const converted = convert(finance.balance, baseCurrency, selectedCurrency);
    return formatSimple(converted, selectedCurrency);
  };

  const renderAdminSummary = () => {
    if (user?.role !== 'admin' || !finance) return null;
    return (
      <View style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Total Collected</Text>
            <Text style={styles.summaryValue}>
              {selectedCurrency}{finance.totalCollected?.toLocaleString()}
            </Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Platform Fee</Text>
            <Text style={[styles.summaryValue, { color: COLORS.accent }]}>
              {selectedCurrency}{finance.platformFee?.toLocaleString()}
            </Text>
          </View>
        </View>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Transactions</Text>
            <Text style={styles.summaryValue}>{finance.totalPayments}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>This Month</Text>
            <Text style={[styles.summaryValue, { color: COLORS.success }]}>
              {selectedCurrency}{finance.monthlyRevenue?.toLocaleString()}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const getTitle = () => user?.role === 'admin' ? 'Tenant Payments' : 'Rent Payments 💰';

  return (
    <View style={styles.container}>
      <FlatList
        data={payments}
        renderItem={renderPayment}
        keyExtractor={(item) => item._id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>{getTitle()}</Text>
            
            <TouchableOpacity 
              style={styles.currencySelector}
              onPress={() => setShowCurrencyPicker(true)}
            >
              <Text style={styles.currencySelectorText}>
                {selectedCurrencyInfo?.flag} {selectedCurrency} ▼
              </Text>
            </TouchableOpacity>
            
            {renderAdminSummary()}
            
            {user?.role !== 'admin' && finance && (
              <View style={styles.summaryCard}>
                <View style={styles.summaryRow}>
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>Rent Amount</Text>
                    <Text style={styles.summaryValue}>{getRentDisplay()}</Text>
                  </View>
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>Balance</Text>
                    <Text style={[styles.summaryValue, { color: finance.balance > 0 ? COLORS.danger : COLORS.success }]}>
                      {getBalanceDisplay()}
                    </Text>
                  </View>
                </View>
                <View style={styles.summaryRow}>
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>Due Date</Text>
                    <Text style={styles.summaryValue}>
                      {finance.currentPeriodEnd 
                        ? new Date(finance.currentPeriodEnd).toLocaleDateString()
                        : 'Not set'}
                    </Text>
                  </View>
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>Status</Text>
                    <Text style={[styles.summaryValue, { 
                      color: finance.rentStatus === 'paid' ? COLORS.success : 
                             finance.rentStatus === 'partial' ? COLORS.accent : 
                             COLORS.danger 
                    }]}>
                      {finance.rentStatus?.charAt(0).toUpperCase() + finance.rentStatus?.slice(1) || 'N/A'}
                    </Text>
                  </View>
                </View>
              </View>
            )}
          </View>
        )}
        ListEmptyComponent={<Text style={styles.emptyText}>No payment history</Text>}
      />

      <Modal
        visible={showCurrencyPicker}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCurrencyPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Currency</Text>
              <TouchableOpacity onPress={() => setShowCurrencyPicker(false)}>
                <Ionicons name="close" size={24} color={COLORS.white} />
              </TouchableOpacity>
            </View>

            <View style={styles.searchContainer}>
              <Ionicons name="search" size={20} color={COLORS.textSecondary} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search currencies..."
                placeholderTextColor={COLORS.textSecondary}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            <NFT
              data={filteredCurrencies}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.currencyItem,
                    selectedCurrency === item.code && styles.currencyItemSelected
                  ]}
                  onPress={() => handleCurrencySelect(item.code)}
                >
                  <Text style={styles.currencyFlag}>{item.flag}</Text>
                  <View style={styles.currencyInfo}>
                    <Text style={styles.currencyCode}>{item.code}</Text>
                    <Text style={styles.currencyName}>{item.name}</Text>
                  </View>
                  {selectedCurrency === item.code && (
                    <Ionicons name="checkmark" size={20} color={COLORS.success} />
                  )}
                </TouchableOpacity>
              )}
              style={styles.currencyList}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.dark },
  header: { padding: 20, paddingTop: 50 },
  title: { fontSize: 24, fontWeight: 'bold', color: COLORS.white, marginBottom: 16 },
  currencySelector: {
    backgroundColor: COLORS.light,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  currencySelectorText: { fontSize: 14, color: COLORS.white },
  summaryCard: { backgroundColor: COLORS.light, borderRadius: 16, padding: 20, marginBottom: 16 },
  summaryRow: { flexDirection: 'row', marginBottom: 16 },
  summaryItem: { flex: 1 },
  summaryLabel: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 4 },
  summaryValue: { fontSize: 18, fontWeight: 'bold', color: COLORS.white },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.light, marginHorizontal: 20, marginBottom: 8, borderRadius: 12, padding: 16 },
  cardIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: COLORS.dark, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  cardContent: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: COLORS.white },
  cardMeta: { fontSize: 14, color: COLORS.textSecondary, marginTop: 4 },
  amountContainer: { alignItems: 'flex-end' },
  amount: { fontSize: 16, fontWeight: 'bold' },
  currencyLabel: { fontSize: 10, color: COLORS.textSecondary, marginTop: 2 },
  emptyText: { color: COLORS.textSecondary, textAlign: 'center', marginTop: 40 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: COLORS.dark, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.white },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.light, marginHorizontal: 20, paddingHorizontal: 12, borderRadius: 12, marginBottom: 16 },
  searchInput: { flex: 1, color: COLORS.white, paddingVertical: 12, marginLeft: 8 },
  currencyList: { maxHeight: 400 },
  currencyItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: COLORS.light },
  currencyItemSelected: { backgroundColor: COLORS.light },
  currencyFlag: { fontSize: 24, marginRight: 12 },
  currencyInfo: { flex: 1 },
  currencyCode: { fontSize: 16, fontWeight: '600', color: COLORS.white },
  currencyName: { fontSize: 12, color: COLORS.textSecondary }
});