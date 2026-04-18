import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, TextInput, Alert, Modal, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { visitorsAPI } from '../../services/api';
import { COLORS, VISITOR_PURPOSES, VISITOR_STATUS } from '../../config';

export default function TenantVisitors({ navigation }) {
  const { user } = useAuth();
  const [visitors, setVisitors] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [newVisitor, setNewVisitor] = useState({ name: '', purpose: 'guest', phone: '' });

  const fetchVisitors = async () => {
    try {
      const response = await visitorsAPI.getAll({ apartment: user?.apartment?._id || user?.apartment });
      setVisitors(response.data);
    } catch (e) {
      Alert.alert('Error', 'Failed to load visitors');
    }
  };

  useEffect(() => {
    fetchVisitors();
  }, [user]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchVisitors();
    setRefreshing(false);
  };

  const handleCreateVisitor = async () => {
    if (!newVisitor.name || !newVisitor.phone) {
      Alert.alert('Error', 'Please fill in name and phone');
      return;
    }

    try {
      await visitorsAPI.create({
        ...newVisitor,
        apartment: user?.apartment?._id || user?.apartment,
        expectedAt: new Date().toISOString()
      });
      setShowModal(false);
      setNewVisitor({ name: '', purpose: 'guest', phone: '' });
      fetchVisitors();
      Alert.alert('Success', 'Visitor invited successfully');
    } catch (e) {
      Alert.alert('Error', 'Failed to create visitor');
    }
  };

  const getStatusColor = (status) => {
    const statusObj = VISITOR_STATUS.find(s => s.value === status);
    return COLORS[statusObj?.color] || COLORS.textSecondary;
  };

  const renderVisitor = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.avatar}>
        <Ionicons name="person" size={24} color={COLORS.primary} />
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle}>{item.name}</Text>
        <Text style={styles.cardSubtitle}>{item.phone}</Text>
        <Text style={styles.cardMeta}>{item.purpose} • {new Date(item.expectedAt).toLocaleTimeString()}</Text>
      </View>
      <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
        <Text style={styles.statusText}>{item.status}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={visitors}
        renderItem={renderVisitor}
        keyExtractor={(item) => item._id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No visitors found</Text>
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>Visitors</Text>
            <TouchableOpacity style={styles.addBtn} onPress={() => setShowModal(true)}>
              <Ionicons name="add" size={24} color={COLORS.white} />
            </TouchableOpacity>
          </View>
        }
      />

      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Invite Visitor</Text>
            
            <Text style={styles.label}>Visitor Name</Text>
            <TextInput
              style={styles.input}
              value={newVisitor.name}
              onChangeText={(v) => setNewVisitor(p => ({ ...p, name: v }))}
              placeholder="Enter name"
              placeholderTextColor={COLORS.textSecondary}
            />

            <Text style={styles.label}>Phone Number</Text>
            <TextInput
              style={styles.input}
              value={newVisitor.phone}
              onChangeText={(v) => setNewVisitor(p => ({ ...p, phone: v }))}
              placeholder="Enter phone"
              placeholderTextColor={COLORS.textSecondary}
              keyboardType="phone-pad"
            />

            <Text style={styles.label}>Purpose</Text>
            <View style={styles.purposeGrid}>
              {VISITOR_PURPOSES.map(p => (
                <TouchableOpacity
                  key={p.value}
                  style={[styles.purposeBtn, newVisitor.purpose === p.value && styles.purposeActive]}
                  onPress={() => setNewVisitor(pr => ({ ...pr, purpose: p.value }))}
                >
                  <Text style={[styles.purposeText, newVisitor.purpose === p.value && styles.purposeTextActive]}>
                    {p.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowModal(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitBtn} onPress={handleCreateVisitor}>
                <Text style={styles.submitText}>Invite</Text>
              </TouchableOpacity>
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
  statusText: { color: COLORS.white, fontSize: 12, fontWeight: '600' },
  emptyText: { color: COLORS.textSecondary, textAlign: 'center', marginTop: 40 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: COLORS.dark, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.white, marginBottom: 20 },
  label: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 8, marginTop: 12 },
  input: { backgroundColor: COLORS.light, borderRadius: 12, padding: 16, fontSize: 16, color: COLORS.white },
  purposeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  purposeBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: COLORS.light },
  purposeActive: { backgroundColor: COLORS.primary },
  purposeText: { color: COLORS.textSecondary, fontSize: 14 },
  purposeTextActive: { color: COLORS.white },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 24 },
  cancelBtn: { flex: 1, padding: 16, borderRadius: 12, backgroundColor: COLORS.light, alignItems: 'center' },
  cancelText: { color: COLORS.textSecondary, fontSize: 16, fontWeight: '600' },
  submitBtn: { flex: 1, padding: 16, borderRadius: 12, backgroundColor: COLORS.primary, alignItems: 'center' },
  submitText: { color: COLORS.white, fontSize: 16, fontWeight: '600' }
});