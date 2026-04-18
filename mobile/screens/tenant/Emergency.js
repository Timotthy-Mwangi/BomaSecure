import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput, Alert, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useAuth } from '../../context/AuthContext';
import { emergencyAPI } from '../../services/api';
import { COLORS } from '../../config';

export default function TenantEmergency({ navigation }) {
  const { user } = useAuth();
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [sending, setSending] = useState(false);

  const handleEmergency = async () => {
    if (!description) {
      Alert.alert('Error', 'Please describe the emergency');
      return;
    }

    setSending(true);

    try {
      let currentLocation = location;
      if (!currentLocation) {
        const loc = await Location.getCurrentPositionAsync({});
        currentLocation = `${loc.coords.latitude}, ${loc.coords.longitude}`;
      }

      await emergencyAPI.create({
        type: 'security',
        description,
        location: currentLocation,
        apartment: user?.apartment?._id || user?.apartment,
        reportedBy: user?._id,
        severity: 'high'
      });

      Alert.alert('Emergency Reported', 'Security has been notified. Stay calm.');
      setDescription('');
      setLocation('');
    } catch (e) {
      Alert.alert('Error', 'Failed to report emergency');
    } finally {
      setSending(false);
    }
  };

  const emergencyTypes = [
    { id: 'breakin', icon: 'alarm', label: 'Break-in', color: COLORS.danger },
    { id: 'suspicious', icon: 'eye', label: 'Suspicious Activity', color: COLORS.accent },
    { id: 'fire', icon: 'flame', label: 'Fire', color: '#FF6B00' },
    { id: 'medical', icon: 'medkit', label: 'Medical Emergency', color: COLORS.danger },
    { id: 'noise', icon: 'volume-high', label: 'Noise Complaint', color: COLORS.primary },
    { id: 'other', icon: 'warning', label: 'Other', color: COLORS.textSecondary }
  ];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Emergency</Text>
        <Text style={styles.subtitle}>Report an emergency to security</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.warningBox}>
          <Ionicons name="warning" size={40} color={COLORS.danger} />
          <Text style={styles.warningText}>In life-threatening situations, call emergency services directly</Text>
        </View>

        <Text style={styles.label}>Emergency Type</Text>
        <View style={styles.typeGrid}>
          {emergencyTypes.map(type => (
            <TouchableOpacity
              key={type.id}
              style={[styles.typeBtn, { borderColor: type.color }]}
              onPress={() => setDescription(type.label)}
            >
              <Ionicons name={type.icon} size={24} color={type.color} />
              <Text style={[styles.typeText, { color: description === type.label ? type.color : COLORS.textSecondary }]}>
                {type.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Description</Text>
        <TextInput
          style={styles.textArea}
          value={description}
          onChangeText={setDescription}
          placeholder="Describe the emergency situation..."
          placeholderTextColor={COLORS.textSecondary}
          multiline
          numberOfLines={4}
        />

        <Text style={styles.label}>Location (Optional)</Text>
        <TextInput
          style={styles.input}
          value={location}
          onChangeText={setLocation}
          placeholder="e.g., Apartment A101, Parking lot"
          placeholderTextColor={COLORS.textSecondary}
        />

        <TouchableOpacity
          style={[styles.submitBtn, sending && styles.submitDisabled]}
          onPress={handleEmergency}
          disabled={sending}
        >
          <Ionicons name="warning" size={24} color={COLORS.white} />
          <Text style={styles.submitText}>{sending ? 'Sending...' : 'Report Emergency'}</Text>
        </TouchableOpacity>

        <View style={styles.quickContacts}>
          <Text style={styles.contactTitle}>Quick Contacts</Text>
          <TouchableOpacity style={styles.contactBtn}>
            <Ionicons name="call" size={20} color={COLORS.success} />
            <Text style={styles.contactText}>Security Office</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.contactBtn}>
            <Ionicons name="call" size={20} color={COLORS.danger} />
            <Text style={styles.contactText}>Police (999)</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.contactBtn}>
            <Ionicons name="call" size={20} color={COLORS.danger} />
            <Text style={styles.contactText}>Ambulance (998)</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.dark },
  header: { padding: 20, paddingTop: 50 },
  title: { fontSize: 24, fontWeight: 'bold', color: COLORS.white },
  subtitle: { fontSize: 14, color: COLORS.textSecondary, marginTop: 4 },
  content: { padding: 20 },
  warningBox: { backgroundColor: COLORS.danger, borderRadius: 16, padding: 20, alignItems: 'center', marginBottom: 24 },
  warningText: { color: COLORS.white, textAlign: 'center', marginTop: 12, fontSize: 14 },
  label: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 12, marginTop: 16 },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  typeBtn: { width: '47%', backgroundColor: COLORS.light, borderRadius: 12, padding: 16, alignItems: 'center', borderWidth: 2 },
  typeText: { fontSize: 12, marginTop: 8, textAlign: 'center' },
  textArea: { backgroundColor: COLORS.light, borderRadius: 12, padding: 16, fontSize: 16, color: COLORS.white, minHeight: 100, textAlignVertical: 'top' },
  input: { backgroundColor: COLORS.light, borderRadius: 12, padding: 16, fontSize: 16, color: COLORS.white },
  submitBtn: { backgroundColor: COLORS.danger, borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 24, flexDirection: 'row', justifyContent: 'center', gap: 12 },
  submitDisabled: { opacity: 0.6 },
  submitText: { color: COLORS.white, fontSize: 18, fontWeight: 'bold' },
  quickContacts: { marginTop: 32 },
  contactTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.white, marginBottom: 16 },
  contactBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.light, borderRadius: 12, padding: 16, marginBottom: 12, gap: 12 },
  contactText: { color: COLORS.white, fontSize: 16 }
});