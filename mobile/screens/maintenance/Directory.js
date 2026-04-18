import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, RefreshControl, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { maintenanceAPI } from '../../services/api';
import { COLORS } from '../../config';

export default function MaintenanceDirectory({ navigation }) {
  const { user } = useAuth();
  const [staff, setStaff] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  const fetchStaff = async () => {
    try {
      const res = await maintenanceAPI.getStaff();
      setStaff(res.data);
    } catch (e) {
      console.log('Fetch error:', e);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchStaff();
    setRefreshing(false);
  };

  const filteredStaff = staff.filter(s => 
    s.name?.toLowerCase().includes(search.toLowerCase()) ||
    s.serviceType?.toLowerCase().includes(search.toLowerCase())
  );

  const renderStaff = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.avatar}>
        <Ionicons name="person" size={24} color={COLORS.white} />
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle}>{item.name}</Text>
        <Text style={styles.cardSubtitle}>{item.serviceType || 'General Maintenance'}</Text>
        {item.phone && <Text style={styles.phone}>{item.phone}</Text>}
      </View>
      <TouchableOpacity style={styles.callBtn}>
        <Ionicons name="call" size={20} color={COLORS.white} />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={COLORS.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search staff..."
          placeholderTextColor={COLORS.textSecondary}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <FlatList
        data={filteredStaff}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        renderItem={renderStaff}
        keyExtractor={item => item._id}
        ListEmptyComponent={<Text style={styles.emptyText}>No staff found</Text>}
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.light,
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 16,
    paddingHorizontal: 12
  },
  searchInput: {
    flex: 1,
    color: COLORS.white,
    paddingVertical: 12,
    marginLeft: 8
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.light,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.accent,
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
    marginTop: 2
  },
  phone: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2
  },
  callBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.success,
    justifyContent: 'center',
    alignItems: 'center'
  },
  emptyText: {
    color: COLORS.textSecondary,
    textAlign: 'center',
    padding: 40
  }
});