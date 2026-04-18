import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../config';

export default function NotificationBadge({ count }) {
  if (!count || count <= 0) return null;
  
  const displayCount = count > 99 ? '99+' : count;
  
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>{displayCount}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: -5,
    right: -8,
    backgroundColor: COLORS.danger,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4
  },
  badgeText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: 'bold'
  }
});