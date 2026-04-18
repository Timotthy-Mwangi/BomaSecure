import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, Alert, RefreshControl, Modal, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { deliveriesAPI } from '../../services/api';
import { COLORS, DELIVERY_STATUS } from '../../config';

export default function TenantDeliveries({ navigation }) {
  const { user } = useAuth();
  const [deliveries, setDeliveries] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [newDelivery, setNewDelivery] = useState({ sender: '', description: '', trackingNumber: '' });

  const fetchDeliveries = async () => {
    try {
      const response = await deliveriesAPI.getAll({ apartment: user?.apartment?._id || user?.apartment });
      setDeliveries(response.data);
    } catch (e) {
      Alert.alert('Error', 'Failed to load deliveries');
    }
  };

  useEffect(() => {
    fetchDeliveries();
  }, [user]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchDeliveries();
    setRefreshing(false);
  };

  const handleCreate = async () => {
    if (!newDelivery.sender || !newDelivery.description) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    try {
      await deliveriesAPI.create({
        ...newDelivery,
        apartment: user?.apartment?._id || user?.apartment,
        status: 'pending'
      });
      setShowModal(false);
      setNewDelivery({ sender: '', description: '', trackingNumber: '' });
      fetchDeliveries();
      Alert.alert('Success', 'Delivery added');
    } catch (e) {
      Alert.alert('Error', 'Failed to add delivery');
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
        {item.trackingNumber && <Text style={styles.cardMeta}>Tracking: {item.trackingNumber}</Text>}
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
        ListEmptyComponent={<Text style={styles.emptyText}>No deliveries</Text>}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>Deliveries</Text>
            <TouchableOpacity style={styles.addBtn} onPress={() => setShowModal(true)}>
              <Ionicons name="add" size={24} color={COLORS.white} />
            </TouchableOpacity>
          </View>
        }
      />

      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Delivery</Text>
            <Text style={styles.label}>Sender/Company</Text>
            <TextInput style={styles.input} value={newDelivery.sender} onChangeText={(v) => setNewDelivery(p => ({ ...p, sender: v }))} placeholder="e.g., Jumia, Amazon" placeholderTextColor={COLORS.textSecondary} />
            <Text style={styles.label}>Description</Text>
            <TextInput style={styles.input} value={newDelivery.description} onChangeText={(v) => setNewDelivery(p => ({ ...p, description: v }))} placeholder="Package description" placeholderTextColor={COLORS.textSecondary} />
            <Text style={styles.label}>Tracking Number (Optional)</Text>
            <TextInput style={styles.input} value={newDelivery.trackingNumber} onChangeText={(v) => setNewDelivery(p => ({ ...p, trackingNumber: v }))} placeholder="Enter tracking number" placeholderTextColor={COLORS.textSecondary} />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowModal(false)}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={styles.submitBtn} onPress={handleCreate}><Text style={styles.submitText}>Add</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.dark },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 50 },
  title: { fontSize: 24, fontWeight: 'bold', color: COLORS.white },
  addBtn: { backgroundColor: COLORS.primary, width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.light, marginHorizontal: 20, marginBottom: 8, borderRadius: 12, padding: 16 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: COLORS.dark, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  cardContent: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: COLORS.white },
  cardSubtitle: { fontSize: 14, color: COLORS.textSecondary },
  cardMeta: { fontSize: 12, color: COLORS.textSecondary, marginTop: 4 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8 },
  statusText: { color: COLORS.white, fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
  emptyText: { color: COLORS.textSecondary, textAlign: 'center', marginTop: 40 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: COLORS.dark, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.white, marginBottom: 20 },
  label: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 8, marginTop: 12 },
  input: { backgroundColor: COLORS.light, borderRadius: 12, padding: 16, fontSize: 16, color: COLORS.white },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 24 },
  cancelBtn: { flex: 1, padding: 16, borderRadius: 12, backgroundColor: COLORS.light, alignItems: 'center' },
  cancelText: { color: COLORS.textSecondary, fontSize: 16, fontWeight: '600' },
  submitBtn: { flex: 1, padding: 16, borderRadius: 12, backgroundColor: COLORS.primary, alignItems: 'center' },
  submitText: { color: COLORS.white, fontSize: 16, fontWeight: '600' }
});