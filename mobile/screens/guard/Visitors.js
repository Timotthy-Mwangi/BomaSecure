import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, RefreshControl, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { visitorsAPI } from '../../services/api';
import { COLORS, VISITOR_STATUS } from '../../config';

export default function GuardVisitors({ navigation }) {
  const [visitors, setVisitors] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchVisitors = async () => {
    try {
      const response = await visitorsAPI.getPending();
      setVisitors(response.data);
    } catch (e) {
      Alert.alert('Error', 'Failed to load visitors');
    }
  };

  useEffect(() => {
    fetchVisitors();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchVisitors();
    setRefreshing(false);
  };

  const handleApprove = async (id) => {
    try {
      await visitorsAPI.approve(id);
      fetchVisitors();
      Alert.alert('Success', 'Visitor approved');
    } catch (e) {
      Alert.alert('Error', 'Failed to approve');
    }
  };

  const handleDeny = async (id) => {
    try {
      await visitorsAPI.deny(id, 'Denied by security');
      fetchVisitors();
      Alert.alert('Success', 'Visitor denied');
    } catch (e) {
      Alert.alert('Error', 'Failed to deny');
    }
  };

  const renderVisitor = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.avatar}>
        <Ionicons name="person" size={24} color={COLORS.primary} />
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle}>{item.name}</Text>
        <Text style={styles.cardSubtitle}>{item.phone}</Text>
        <Text style={styles.cardMeta}>{item.purpose} • {item.apartment?.name || item.apartment}</Text>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity style={styles.approveBtn} onPress={() => handleApprove(item._id)}>
          <Ionicons name="checkmark" size={20} color={COLORS.white} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.denyBtn} onPress={() => handleDeny(item._id)}>
          <Ionicons name="close" size={20} color={COLORS.white} />
        </TouchableOpacity>
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
        ListEmptyComponent={<Text style={styles.emptyText}>No pending visitors</Text>}
        ListHeaderComponent={<View style={styles.header}><Text style={styles.title}>Visitors</Text></View>}
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
  actions: { flexDirection: 'row', gap: 8 },
  approveBtn: { backgroundColor: COLORS.success, width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  denyBtn: { backgroundColor: COLORS.danger, width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: COLORS.textSecondary, textAlign: 'center', marginTop: 40 }
});