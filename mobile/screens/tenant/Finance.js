import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Modal, FlatList, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { paymentsAPI } from '../../services/api';
import { COLORS } from '../../config';
import { getCurrencies, convert, formatSimple, fetchRates, getLastUpdated, getCurrencyByCode } from '../../services/currencyService';

export default function TenantFinance({ navigation }) {
  const { user } = useAuth();
  const [finance, setFinance] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState('KES');
  const [currencies, setCurrencies] = useState(getCurrencies());
  const [searchQuery, setSearchQuery] = useState('');
  const [convertedAmount, setConvertedAmount] = useState(null);
  const [ratesFetched, setRatesFetched] = useState(false);

  const fetchFinance = async () => {
    try {
      const financeRes = await paymentsAPI.getTenantRentDashboard();
      setFinance(financeRes.data.dashboard);
      convertRentAmount(financeRes.data.dashboard?.rentAmount || 0, selectedCurrency, financeRes.data.dashboard?.currency || 'KES');
    } catch (e) {
      console.log('Error:', e);
    }
  };

  const loadRates = useCallback(async () => {
    await fetchRates();
    setRatesFetched(true);
  }, []);

  useEffect(() => {
    fetchFinance();
    loadRates();
  }, [user]);

  const convertRentAmount = (amount, targetCurrency, baseCurrency = 'KES') => {
    if (!amount) {
      setConvertedAmount(null);
      return;
    }
    const converted = convert(amount, baseCurrency, targetCurrency);
    setConvertedAmount(converted);
  };

  const handleCurrencySelect = (currencyCode) => {
    setSelectedCurrency(currencyCode);
    setShowCurrencyPicker(false);
    setSearchQuery('');
    if (finance?.rentAmount) {
      convertRentAmount(finance.rentAmount, currencyCode, finance.currency || 'KES');
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadRates();
    await fetchFinance();
    setRefreshing(false);
  };

  const filteredCurrencies = searchQuery
    ? currencies.filter(c => 
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.code.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : currencies;

  const getRentDisplay = () => {
    if (!finance?.rentAmount) return 'N/A';
    const baseCurrency = finance.currency || 'KES';
    if (selectedCurrency === baseCurrency) {
      return formatSimple(finance.rentAmount, baseCurrency);
    }
    return formatSimple(convertedAmount, selectedCurrency);
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

  const getTotalPaidDisplay = () => {
    if (!finance?.totalPaid) return 'N/A';
    const baseCurrency = finance.currency || 'KES';
    if (selectedCurrency === baseCurrency) {
      return formatSimple(finance.totalPaid, baseCurrency);
    }
    const converted = convert(finance.totalPaid, baseCurrency, selectedCurrency);
    return formatSimple(converted, selectedCurrency);
  };

  const selectedCurrencyInfo = getCurrencyByCode(selectedCurrency);

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.primary} />}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Tenant Finance</Text>
        <Text style={styles.subtitle}>💰 Track rent payments</Text>
      </View>

      <TouchableOpacity 
        style={styles.currencySelector}
        onPress={() => setShowCurrencyPicker(true)}
      >
        <Text style={styles.currencyLabel}>
          {selectedCurrencyInfo?.flag} {selectedCurrency}
        </Text>
        <Ionicons name="chevron-down" size={16} color={COLORS.textSecondary} />
      </TouchableOpacity>

      {finance && (
        <View style={styles.content}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Monthly Rent</Text>
            
            <TouchableOpacity 
              style={styles.rentAmountContainer}
              onPress={() => setShowCurrencyPicker(true)}
            >
              <Text style={styles.rentAmount}>{getRentDisplay()}</Text>
              <View style={styles.currencyBadge}>
                <Text style={styles.currencyBadgeText}>
                  {selectedCurrencyInfo?.flag} {selectedCurrency}
                </Text>
              </View>
            </TouchableOpacity>

            {selectedCurrency !== (finance.currency || 'KES') && (
              <Text style={styles.convertedNote}>
                Converted from {finance.currency || 'KES'}
              </Text>
            )}
          </View>

          <View style={styles.card}>
            <View style={styles.row}>
              <View style={styles.item}>
                <Text style={styles.label}>Balance Due</Text>
                <Text style={[styles.value, { color: finance.balance > 0 ? COLORS.danger : COLORS.success }]}>
                  {getBalanceDisplay()}
                </Text>
              </View>
              <View style={styles.item}>
                <Text style={styles.label}>Total Paid</Text>
                <Text style={[styles.value, { color: COLORS.success }]}>
                  {getTotalPaidDisplay()}
                </Text>
              </View>
            </View>
            <View style={styles.row}>
              <View style={styles.item}>
                <Text style={styles.label}>Due Date</Text>
                <Text style={styles.value}>
                  {finance.currentPeriodEnd 
                    ? new Date(finance.currentPeriodEnd).toLocaleDateString()
                    : 'Not set'}
                </Text>
              </View>
              <View style={styles.item}>
                <Text style={styles.label}>Status</Text>
                <Text style={[styles.value, { 
                  color: finance.rentStatus === 'paid' ? COLORS.success : 
                         finance.rentStatus === 'partial' ? COLORS.accent : 
                         COLORS.danger 
                }]}>
                  {finance.rentStatus?.charAt(0).toUpperCase() + finance.rentStatus?.slice(1) || 'N/A'}
                </Text>
              </View>
            </View>
          </View>

          {finance.building && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Property Info</Text>
              <View style={styles.row}>
                <View style={styles.item}>
                  <Text style={styles.label}>Building</Text>
                  <Text style={styles.value}>{finance.building.name}</Text>
                </View>
                {finance.unit && (
                  <View style={styles.item}>
                    <Text style={styles.label}>Unit</Text>
                    <Text style={styles.value}>{finance.unit.number}</Text>
                  </View>
                )}
              </View>
            </View>
          )}

          <TouchableOpacity 
            style={styles.paymentsButton}
            onPress={() => navigation.navigate('Payments')}
          >
            <View style={styles.paymentsButtonIcon}>
              <Ionicons name="receipt" size={24} color={COLORS.white} />
            </View>
            <View style={styles.paymentsButtonContent}>
              <Text style={styles.paymentsButtonTitle}>Rent Payments</Text>
              <Text style={styles.paymentsButtonSubtitle}>View payment history</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>

          <Text style={styles.ratesNote}>
            Rates updated: {new Date(getLastUpdated()).toLocaleTimeString()}
          </Text>
        </View>
      )}

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

            <FlatList
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.dark },
  header: { padding: 20, paddingTop: 50 },
  title: { fontSize: 24, fontWeight: 'bold', color: COLORS.white },
  subtitle: { fontSize: 14, color: COLORS.textSecondary, marginTop: 4 },
  currencySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.light,
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 12,
    borderRadius: 12,
  },
  currencyLabel: { fontSize: 16, color: COLORS.white },
  content: { padding: 20, paddingTop: 0 },
  card: { backgroundColor: COLORS.light, borderRadius: 16, padding: 20, marginBottom: 16 },
  cardTitle: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 12 },
  rentAmountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rentAmount: { fontSize: 32, fontWeight: 'bold', color: COLORS.white },
  currencyBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  currencyBadgeText: { fontSize: 14, color: COLORS.white, fontWeight: '600' },
  convertedNote: { fontSize: 12, color: COLORS.textSecondary, marginTop: 8 },
  row: { flexDirection: 'row', marginBottom: 16 },
  item: { flex: 1 },
  label: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 4 },
  value: { fontSize: 18, fontWeight: 'bold', color: COLORS.white },
  paymentsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.light,
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
  },
  paymentsButtonIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  paymentsButtonContent: { flex: 1 },
  paymentsButtonTitle: { fontSize: 16, fontWeight: '600', color: COLORS.white },
  paymentsButtonSubtitle: { fontSize: 12, color: COLORS.textSecondary },
  ratesNote: { fontSize: 12, color: COLORS.textSecondary, textAlign: 'center' },
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