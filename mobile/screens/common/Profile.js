import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { COLORS } from '../../config';

export default function ProfileScreen({ navigation }) {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: logout }
      ]
    );
  };

  const menuItems = [
    { icon: 'person', label: 'Edit Profile', onPress: () => {} },
    { icon: 'lock', label: 'Change Password', onPress: () => {} },
    { icon: 'notifications', label: 'Notifications Settings', onPress: () => {} },
    { icon: 'help-circle', label: 'Help & Support', onPress: () => {} },
    { icon: 'document-text', label: 'Terms & Privacy', onPress: () => {} },
    { icon: 'log-out', label: 'Logout', onPress: handleLogout, danger: true }
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Ionicons name="person" size={40} color={COLORS.primary} />
        </View>
        <Text style={styles.name}>{user?.firstName} {user?.lastName}</Text>
        <Text style={styles.email}>{user?.email}</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>{user?.role?.toUpperCase()}</Text>
        </View>
        <Text style={styles.apartment}>Unit: {user?.apartment?.name || 'Not assigned'}</Text>
      </View>

      <View style={styles.menu}>
        {menuItems.map((item, index) => (
          <TouchableOpacity key={index} style={styles.menuItem} onPress={item.onPress}>
            <Ionicons 
              name={item.icon} 
              size={24} 
              color={item.danger ? COLORS.danger : COLORS.textSecondary} 
            />
            <Text style={[styles.menuLabel, item.danger && styles.dangerText]}>
              {item.label}
            </Text>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.footer}>
        <Text style={styles.version}>BomaSecure Mobile v1.0.0</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.dark },
  header: { alignItems: 'center', padding: 40, paddingTop: 60 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.light, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  name: { fontSize: 24, fontWeight: 'bold', color: COLORS.white },
  email: { fontSize: 14, color: COLORS.textSecondary, marginTop: 4 },
  roleBadge: { backgroundColor: COLORS.primary, paddingHorizontal: 16, paddingVertical: 4, borderRadius: 12, marginTop: 12 },
  roleText: { color: COLORS.white, fontSize: 12, fontWeight: 'bold' },
  apartment: { fontSize: 14, color: COLORS.textSecondary, marginTop: 8 },
  menu: { padding: 20 },
  menuItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.light, borderRadius: 12, padding: 16, marginBottom: 8, gap: 12 },
  menuLabel: { flex: 1, fontSize: 16, color: COLORS.white },
  dangerText: { color: COLORS.danger },
  footer: { alignItems: 'center', padding: 20, marginTop: 'auto' },
  version: { fontSize: 12, color: COLORS.textSecondary }
});