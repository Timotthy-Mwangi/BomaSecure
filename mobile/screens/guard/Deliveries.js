import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, RefreshControl, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { deliveriesAPI } from '../../services/api';
import { COLORS, DELIVERY_STATUS } from '../../config';

export default function GuardDeliveries({ navigation }) {
  const [deliveries, setDeliveries] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDeliveries = async () => {
    try {
      const response = await deliveriesAPI.getPending();
      setDeliveries(response.data);
    } catch (e) {
      Alert.alert('Error', 'Failed to load deliveries');
    }
  };

  useEffect(() => {
    fetchDeliveries();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchDeliveries();
    setRefreshing(false);
  };

  const handleUpdateStatus = async (id, status) => {
    try {
      await deliveriesAPI.update(id, { status });
      fetchDeliveries();
      Alert.alert('Success', `Delivery marked as ${status}`);
    } catch (e) {
      Alert.alert('Error', 'Failed to update');
    }
  };

  const getStatusColor = (status) => {
    const statusObj = DELIVERY_STATUS.find(s => s.value === status);
    return COLORS[statusObj?.color] || COLORS.textSecondary;
  };

  const renderDelivery = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.avatar}>
        <Ionicons name="cube" size={24} color={COLORS.secondary} />
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle}>{item.sender}</Text>
        <Text style={styles.cardSubtitle}>{item.description}</Text>
        <Text style={styles.cardMeta}>Unit: {item.apartment?.name || item.apartment}</Text>
      </View>
      <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
        <Text style={styles.statusText}>{item.status.replace('_', ' ')}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={deliveries}
        renderItem={renderDelivery}
        keyExtractor={(item) => item._id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        ListEmptyComponent={<Text style={styles.emptyText}>No pending deliveries</Text>}
        ListHeaderComponent={<View style={styles.header}><Text style={styles.title}>Deliveries</Text></View>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.dark },
  header: { padding: 20, paddingTop: 50 },
  title: { fontSize: 24, fontWeight: 'bold', color: COLORS.white },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.light, marginHorizontal: 20, marginBottom: 8, borderRadius: 12, padding: 16 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: COLORS.dark, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  cardContent: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: COLORS.white },
  cardSubtitle: { fontSize: 14, color: COLORS.textSecondary },
  cardMeta: { fontSize: 12, color: COLORS.textSecondary, marginTop: 4 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8 },
  statusText: { color: COLORS.white, fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
  emptyText: { color: COLORS.textSecondary, textAlign: 'center', marginTop: 40 }
});