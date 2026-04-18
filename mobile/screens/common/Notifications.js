import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, RefreshControl, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { notificationsAPI } from '../../services/api';
import { COLORS } from '../../config';

export default function NotificationsScreen({ navigation }) {
  const { user } = useAuth();
  const { notifications, fetchNotifications, markAsRead, markAllAsRead, unreadCount } = useNotifications();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchNotifications();
    setRefreshing(false);
  }, [fetchNotifications]);

  const handleMarkRead = async (id) => {
    try {
      await markAsRead(id);
    } catch (e) {
      console.log('Error:', e);
    }
  };

  const handleDelete = async (id) => {
    try {
      await notificationsAPI.delete(id);
      fetchNotifications();
    } catch (e) {
      console.log('Error:', e);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllAsRead();
    } catch (e) {
      console.log('Error:', e);
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'visitor_arrival':
      case 'visitor_approved':
      case 'visitor_denied': return 'person';
      case 'delivery_arrival':
      case 'delivery_confirmed': return 'cube';
      case 'payment':
      case 'subscription': return 'card';
      case 'emergency':
      case 'security_alert': return 'warning';
      case 'maintenance_created':
      case 'maintenance_received':
      case 'maintenance_in_progress':
      case 'maintenance_resolved':
      case 'maintenance_contact':
      case 'maintenance_image': return 'construct';
      default: return 'notifications';
    }
  };

  const getColor = (type) => {
    switch (type) {
      case 'visitor_arrival':
      case 'visitor_approved': return COLORS.primary;
      case 'visitor_denied': return COLORS.danger;
      case 'delivery_arrival':
      case 'delivery_confirmed': return COLORS.secondary;
      case 'payment':
      case 'subscription': return COLORS.success;
      case 'emergency':
      case 'security_alert': return COLORS.danger;
      case 'maintenance_created':
      case 'maintenance_received':
      case 'maintenance_contact':
      case 'maintenance_image': return COLORS.accent;
      case 'maintenance_in_progress': return COLORS.primary;
      case 'maintenance_resolved': return COLORS.success;
      default: return COLORS.textSecondary;
    }
  };

  const getStatusText = (type) => {
    switch (type) {
      case 'maintenance_created':
      case 'maintenance_received':
      case 'maintenance_contact':
      case 'maintenance_image': return 'NEW';
      case 'maintenance_in_progress': return 'IN PROGRESS';
      case 'maintenance_resolved': return 'RESOLVED';
      default: return null;
    }
  };

  const renderNotification = ({ item }) => (
    <TouchableOpacity 
      style={[styles.card, !item.isRead && styles.unread]}
      onPress={() => handleMarkRead(item._id)}
    >
      <View style={[styles.icon, { backgroundColor: getColor(item.type) + '30' }]}>
        <Ionicons name={getIcon(item.type)} size={20} color={getColor(item.type)} />
      </View>
      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>{item.title}</Text>
          {getStatusText(item.type) && (
            <View style={[styles.statusBadge, { backgroundColor: getColor(item.type) + '30' }]}>
              <Text style={[styles.statusText, { color: getColor(item.type) }]}>
                {getStatusText(item.type)}
              </Text>
            </View>
          )}
        </View>
        <Text style={styles.message}>{item.message}</Text>
        <Text style={styles.time}>{new Date(item.createdAt).toLocaleString()}</Text>
      </View>
      <TouchableOpacity onPress={() => handleDelete(item._id)}>
        <Ionicons name="trash-outline" size={20} color={COLORS.textSecondary} />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Notifications</Text>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={handleMarkAllRead}>
            <Text style={styles.markAll}>Mark all as read</Text>
          </TouchableOpacity>
        )}
      </View>
      <FlatList
        data={notifications}
        renderItem={renderNotification}
        keyExtractor={(item) => item._id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        ListEmptyComponent={<Text style={styles.emptyText}>No notifications</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.dark },
  header: { padding: 20, paddingTop: 60, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { color: COLORS.white, fontSize: 24, fontWeight: 'bold' },
  markAll: { color: COLORS.primary, fontSize: 14 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.light, marginHorizontal: 20, marginBottom: 8, borderRadius: 12, padding: 16 },
  unread: { borderLeftWidth: 3, borderLeftColor: COLORS.primary },
  icon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  content: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  title: { fontSize: 16, fontWeight: '600', color: COLORS.white },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  statusText: { fontSize: 10, fontWeight: 'bold' },
  message: { fontSize: 14, color: COLORS.textSecondary, marginTop: 4 },
  time: { fontSize: 12, color: COLORS.textSecondary, marginTop: 4 },
  emptyText: { color: COLORS.textSecondary, textAlign: 'center', marginTop: 40 }
});