import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { visitorsAPI, deliveriesAPI, emergencyAPI } from '../../services/api';
import { COLORS } from '../../config';

export default function GuardDashboard({ navigation }) {
  const { user } = useAuth();
  const [stats, setStats] = useState({ visitors: 0, deliveries: 0, emergencies: 0 });
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = async () => {
    try {
      const [visitorsRes, deliveriesRes, emergencyRes] = await Promise.all([
        visitorsAPI.getPending(),
        deliveriesAPI.getPending(),
        emergencyAPI.getAll({ resolved: false })
      ]);
      setStats({
        visitors: visitorsRes.data.length,
        deliveries: deliveriesRes.data.length,
        emergencies: emergencyRes.data.length
      });
    } catch (e) {
      console.log('Error:', e);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [user]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchStats();
    setRefreshing(false);
  };

  const StatCard = ({ icon, label, count, color, route }) => (
    <TouchableOpacity style={styles.statCard} onPress={() => navigation.navigate(route)}>
      <View style={[styles.statIcon, { backgroundColor: color + '30' }]}>
        <Ionicons name={icon} size={28} color={color} />
      </View>
      <Text style={styles.statCount}>{count}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={[]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.greeting}>Security Dashboard</Text>
            <Text style={styles.subtitle}>{user?.apartment?.name || 'Your Property'}</Text>
          </View>
        }
        keyExtractor={() => 'guard-dashboard'}
      />

      <View style={styles.statsGrid}>
        <StatCard icon="people" label="Visitors" count={stats.visitors} color="#3B82F6" route="Visitors" />
        <StatCard icon="cube" label="Deliveries" count={stats.deliveries} color="#10B981" route="Deliveries" />
        <StatCard icon="warning" label="Emergencies" count={stats.emergencies} color="#EF4444" route="CheckIn" />
      </View>

      <View style={styles.quickActions}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('CheckIn')}>
          <Ionicons name="qr-code" size={24} color={COLORS.white} />
          <Text style={styles.actionText}>Scan QR Code</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('Visitors')}>
          <Ionicons name="person-add" size={24} color={COLORS.white} />
          <Text style={styles.actionText}>Register Visitor</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.dark },
  header: { padding: 20, paddingTop: 50 },
  greeting: { fontSize: 24, fontWeight: 'bold', color: COLORS.white },
  subtitle: { fontSize: 14, color: COLORS.textSecondary, marginTop: 4 },
  statsGrid: { flexDirection: 'row', padding: 16, gap: 12 },
  statCard: { flex: 1, backgroundColor: COLORS.light, borderRadius: 16, padding: 16, alignItems: 'center' },
  statIcon: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  statCount: { fontSize: 28, fontWeight: 'bold', color: COLORS.white },
  statLabel: { fontSize: 12, color: COLORS.textSecondary, marginTop: 4 },
  quickActions: { padding: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.white, marginBottom: 16 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.light, borderRadius: 12, padding: 16, marginBottom: 12, gap: 12 },
  actionText: { color: COLORS.white, fontSize: 16 }
});