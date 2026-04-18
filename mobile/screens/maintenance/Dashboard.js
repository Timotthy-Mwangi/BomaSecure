import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, RefreshControl, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { maintenanceAPI, notificationsAPI } from '../../services/api';
import { COLORS, ROLE_COLORS } from '../../config';

export default function MaintenanceDashboard({ navigation }) {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({ pending: 0, inProgress: 0, completed: 0 });

  const fetchData = async () => {
    try {
      console.log('[Dashboard] Fetching maintenance requests...');
      const [requestsRes, unreadRes] = await Promise.all([
        maintenanceAPI.getAll({ status: 'pending' }),
        notificationsAPI.getUnreadCount()
      ]);
      console.log('[Dashboard] Requests response:', JSON.stringify(requestsRes.data).substring(0, 500));
      setRequests(requestsRes.data.slice(0, 5));
      setUnreadCount(unreadRes.data.count);
      
      const pending = requestsRes.data.filter(r => r.status === 'pending').length;
      const inProgress = requestsRes.data.filter(r => r.status === 'in-progress').length;
      const completed = requestsRes.data.filter(r => r.status === 'completed').length;
      setStats({ pending, inProgress, completed });
    } catch (e) {
      console.log('Fetch error:', e);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const renderRequest = ({ item }) => (
    <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('Requests')}>
      <View style={styles.cardIcon}>
        <Ionicons name="construct" size={24} color={COLORS.accent} />
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle}>{item.title || item.issue}</Text>
        <Text style={styles.cardSubtitle}>{item.apartment?.buildingName || 'N/A'} - Unit {item.unitNumber || item.unit}</Text>
      </View>
      <View style={[styles.statusBadge, { backgroundColor: item.status === 'pending' ? COLORS.accent : COLORS.success }]}>
        <Text style={styles.statusText}>{item.status}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={[]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        ListHeaderComponent={
          <>
            <View style={styles.header}>
              <View>
                <Text style={styles.greeting}>Welcome back,</Text>
                <Text style={styles.name}>{user?.name?.split(' ')[0]}</Text>
              </View>
              <TouchableOpacity style={styles.notificationBtn} onPress={() => navigation.navigate('Notifications')}>
                <Ionicons name="notifications" size={24} color={COLORS.white} />
                {unreadCount > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{unreadCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.statsContainer}>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{stats.pending}</Text>
                <Text style={styles.statLabel}>Pending</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{stats.inProgress}</Text>
                <Text style={styles.statLabel}>In Progress</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{stats.completed}</Text>
                <Text style={styles.statLabel}>Completed</Text>
              </View>
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Recent Requests</Text>
                <TouchableOpacity onPress={() => navigation.navigate('Requests')}>
                  <Text style={styles.seeAll}>See All</Text>
                </TouchableOpacity>
              </View>
              {requests.length === 0 ? (
                <Text style={styles.emptyText}>No pending requests</Text>
              ) : (
                requests.map(renderRequest)
              )}
            </View>
          </>
        }
        keyExtractor={() => 'dashboard'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.dark
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 40
  },
  greeting: {
    fontSize: 16,
    color: COLORS.textSecondary
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.white
  },
  notificationBtn: {
    padding: 8
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: COLORS.danger,
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center'
  },
  badgeText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: 'bold'
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.light,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center'
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.accent
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4
  },
  section: {
    padding: 20
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.white
  },
  seeAll: {
    color: COLORS.primary,
    fontSize: 14
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.light,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8
  },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.dark,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  cardContent: {
    flex: 1
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white
  },
  cardSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8
  },
  statusText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '600'
  },
  emptyText: {
    color: COLORS.textSecondary,
    textAlign: 'center',
    padding: 20
  }
});