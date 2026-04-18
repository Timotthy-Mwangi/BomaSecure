import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, RefreshControl, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { visitorsAPI, deliveriesAPI, notificationsAPI } from '../../services/api';
import { COLORS, ROLE_COLORS } from '../../config';

export default function TenantDashboard({ navigation }) {
  const { user } = useAuth();
  const [visitors, setVisitors] = useState([]);
  const [deliveries, setDeliveries] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      const [visitorsRes, deliveriesRes, unreadRes] = await Promise.all([
        visitorsAPI.getToday(user?.apartment?._id || user?.apartment),
        deliveriesAPI.getAll({ apartment: user?.apartment?._id || user?.apartment }),
        notificationsAPI.getUnreadCount()
      ]);
      setVisitors(visitorsRes.data.slice(0, 3));
      setDeliveries(deliveriesRes.data.slice(0, 3));
      setUnreadCount(unreadRes.data.count);
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

  const renderVisitor = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardIcon}>
        <Ionicons name="person" size={24} color={COLORS.primary} />
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle}>{item.name}</Text>
        <Text style={styles.cardSubtitle}>{item.purpose}</Text>
      </View>
      <View style={[styles.statusBadge, { backgroundColor: item.status === 'checked-in' ? COLORS.success : COLORS.accent }]}>
        <Text style={styles.statusText}>{item.status}</Text>
      </View>
    </View>
  );

  const renderDelivery = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardIcon}>
        <Ionicons name="cube" size={24} color={COLORS.secondary} />
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle}>{item.sender}</Text>
        <Text style={styles.cardSubtitle}>{item.description}</Text>
      </View>
      <View style={[styles.statusBadge, { backgroundColor: item.status === 'delivered' ? COLORS.success : COLORS.accent }]}>
        <Text style={styles.statusText}>{item.status}</Text>
      </View>
    </View>
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
                <Text style={styles.name}>{user?.firstName}</Text>
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

            <View style={styles.quickActions}>
              <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('Visitors')}>
                <Ionicons name="person-add" size={28} color={COLORS.white} />
                <Text style={styles.actionText}>Add Visitor</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('Deliveries')}>
                <Ionicons name="cube" size={28} color={COLORS.white} />
                <Text style={styles.actionText}>Track Delivery</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, styles.emergencyBtn]} onPress={() => navigation.navigate('Emergency')}>
                <Ionicons name="warning" size={28} color={COLORS.white} />
                <Text style={styles.actionText}>Emergency</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Recent Visitors</Text>
                <TouchableOpacity onPress={() => navigation.navigate('Visitors')}>
                  <Text style={styles.seeAll}>See All</Text>
                </TouchableOpacity>
              </View>
              {visitors.length === 0 ? (
                <Text style={styles.emptyText}>No visitors today</Text>
              ) : (
                visitors.map(renderVisitor)
              )}
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Recent Deliveries</Text>
                <TouchableOpacity onPress={() => navigation.navigate('Deliveries')}>
                  <Text style={styles.seeAll}>See All</Text>
                </TouchableOpacity>
              </View>
              {deliveries.length === 0 ? (
                <Text style={styles.emptyText}>No deliveries</Text>
              ) : (
                deliveries.map(renderDelivery)
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
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12
  },
  actionBtn: {
    flex: 1,
    backgroundColor: COLORS.light,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center'
  },
  emergencyBtn: {
    backgroundColor: COLORS.danger
  },
  actionText: {
    color: COLORS.white,
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center'
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