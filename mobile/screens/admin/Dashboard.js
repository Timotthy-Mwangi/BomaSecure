import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, RefreshControl, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { apartmentsAPI, visitorsAPI, deliveriesAPI, paymentsAPI, emergencyAPI } from '../../services/api';
import { COLORS } from '../../config';

export default function AdminDashboard({ navigation }) {
  const { user } = useAuth();
  const [stats, setStats] = useState({});
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = async () => {
    try {
      const [apartmentStats, emergencyStats, paymentsStats] = await Promise.all([
        apartmentsAPI.getStats(),
        emergencyAPI.getStats(),
        paymentsAPI.getStats()
      ]);
      setStats({
        apartments: apartmentStats.data,
        emergencies: emergencyStats.data,
        payments: paymentsStats.data
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

  const StatCard = ({ title, value, icon, color }) => (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <Ionicons name={icon} size={28} color={color} />
      <Text style={styles.statValue}>{value || 0}</Text>
      <Text style={styles.statTitle}>{title}</Text>
    </View>
  );

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}>
      <View style={styles.header}>
        <Text style={styles.title}>Admin Dashboard</Text>
        <Text style={styles.subtitle}>{user?.apartment?.name || 'BomaSecure'}</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statsRow}>
        <StatCard title="Total Units" value={stats?.apartments?.total} icon="home" color={COLORS.primary} />
        <StatCard title="Tenants" value={stats?.apartments?.occupied} icon="people" color={COLORS.secondary} />
        <StatCard title="Active Emergencies" value={stats?.emergencies?.active} icon="warning" color={COLORS.danger} />
      </ScrollView>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <TouchableOpacity style={styles.actionBtn}>
          <Ionicons name="person-add" size={24} color={COLORS.white} />
          <Text style={styles.actionText}>Manage Users</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn}>
          <Ionicons name="home" size={24} color={COLORS.white} />
          <Text style={styles.actionText}>Manage Units</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn}>
          <Ionicons name="wallet" size={24} color={COLORS.white} />
          <Text style={styles.actionText}>Finance Reports</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.dark },
  header: { padding: 20, paddingTop: 50 },
  title: { fontSize: 24, fontWeight: 'bold', color: COLORS.white },
  subtitle: { fontSize: 14, color: COLORS.textSecondary, marginTop: 4 },
  statsRow: { paddingHorizontal: 20 },
  statCard: { backgroundColor: COLORS.light, borderRadius: 12, padding: 16, marginRight: 12, minWidth: 120, borderLeftWidth: 4 },
  statValue: { fontSize: 28, fontWeight: 'bold', color: COLORS.white, marginTop: 8 },
  statTitle: { fontSize: 12, color: COLORS.textSecondary },
  section: { padding: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.white, marginBottom: 16 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.light, borderRadius: 12, padding: 16, marginBottom: 12, gap: 12 },
  actionText: { color: COLORS.white, fontSize: 16 }
});