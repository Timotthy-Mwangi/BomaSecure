import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, RefreshControl, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { maintenanceAPI } from '../../services/api';
import { COLORS } from '../../config';

export default function MaintenanceRequests({ navigation }) {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all');

  const fetchRequests = async () => {
    try {
      const params = filter !== 'all' ? { status: filter } : {};
      const res = await maintenanceAPI.getAll(params);
      setRequests(res.data);
    } catch (e) {
      console.log('Fetch error:', e);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [filter]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchRequests();
    setRefreshing(false);
  };

  const updateStatus = async (id, newStatus) => {
    try {
      await maintenanceAPI.updateStatus(id, { status: newStatus });
      Alert.alert('Success', 'Request updated');
      fetchRequests();
    } catch (e) {
      Alert.alert('Error', 'Failed to update request');
    }
  };

  const filters = ['all', 'pending', 'in-progress', 'completed'];

  const renderRequest = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardIcon}>
          <Ionicons name="construct" size={24} color={COLORS.accent} />
        </View>
        <View style={styles.cardContent}>
          <Text style={styles.cardTitle}>{item.title || item.issue}</Text>
          <Text style={styles.cardSubtitle}>{item.apartment?.buildingName || 'N/A'} - Unit {item.unitNumber || item.unit}</Text>
        </View>
      </View>
      
      <Text style={styles.description}>{item.description}</Text>
      
      <View style={styles.statusRow}>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
      </View>

      <View style={styles.actions}>
        {item.status === 'pending' && (
          <TouchableOpacity style={styles.actionBtn} onPress={() => updateStatus(item._id, 'in-progress')}>
            <Text style={styles.actionText}>Start</Text>
          </TouchableOpacity>
        )}
        {item.status === 'in-progress' && (
          <TouchableOpacity style={[styles.actionBtn, styles.completeBtn]} onPress={() => updateStatus(item._id, 'completed')}>
            <Text style={styles.actionText}>Complete</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return COLORS.accent;
      case 'in-progress': return COLORS.primary;
      case 'completed': return COLORS.success;
      default: return COLORS.textSecondary;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.filterContainer}>
        {filters.map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.filterBtn, filter === f && styles.filterActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={requests}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        renderItem={renderRequest}
        keyExtractor={item => item._id}
        ListEmptyComponent={<Text style={styles.emptyText}>No requests found</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.dark,
    paddingTop: 20
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 8
  },
  filterBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.light
  },
  filterActive: {
    backgroundColor: COLORS.accent
  },
  filterText: {
    color: COLORS.textSecondary,
    fontSize: 14
  },
  filterTextActive: {
    color: COLORS.white,
    fontWeight: 'bold'
  },
  card: {
    backgroundColor: COLORS.light,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center'
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
  description: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 12
  },
  statusRow: {
    flexDirection: 'row',
    marginTop: 12
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
  actions: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 12
  },
  actionBtn: {
    flex: 1,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center'
  },
  completeBtn: {
    backgroundColor: COLORS.success
  },
  actionText: {
    color: COLORS.white,
    fontWeight: '600'
  },
  emptyText: {
    color: COLORS.textSecondary,
    textAlign: 'center',
    padding: 40
  }
});