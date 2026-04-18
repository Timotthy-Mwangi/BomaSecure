import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity, TextInput } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useAuth } from '../../context/AuthContext';
import { visitorsAPI } from '../../services/api';
import { COLORS } from '../../config';

export default function GuardCheckIn({ navigation }) {
  const { user } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [manualCode, setManualCode] = useState('');

  const handleBarCodeScanned = async ({ type, data }) => {
    if (scanned) return;
    setScanned(true);

    try {
      const response = await visitorsAPI.verifyQR(data);
      const visitor = response.data;
      
      if (visitor) {
        Alert.alert(
          'Visitor Verified',
          `${visitor.name}\nPurpose: ${visitor.purpose}`,
          [
            {
              text: 'Check In',
              onPress: async () => {
                await visitorsAPI.checkIn(visitor._id, { checkedInBy: user?._id });
                Alert.alert('Success', 'Visitor checked in');
                setScanned(false);
              }
            },
            { text: 'Cancel', style: 'cancel', onPress: () => setScanned(false) }
          ]
        );
      }
    } catch (e) {
      Alert.alert('Invalid', 'This QR code is not valid');
      setScanned(false);
    }
  };

  const handleManualVerify = async () => {
    if (!manualCode) {
      Alert.alert('Error', 'Please enter code');
      return;
    }

    try {
      const response = await visitorsAPI.verifyQR(manualCode);
      const visitor = response.data;
      
      if (visitor) {
        await visitorsAPI.checkIn(visitor._id, { checkedInBy: user?._id });
        Alert.alert('Success', `${visitor.name} checked in`);
        setManualCode('');
      }
    } catch (e) {
      Alert.alert('Invalid', 'Invalid verification code');
    }
  };

  if (!permission) {
    return <View style={styles.container}><Text style={styles.text}>Requesting camera permission...</Text></View>;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Camera permission required to scan QR codes</Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Scan QR Code</Text>
        <Text style={styles.subtitle}>Point camera at visitor's QR code</Text>
      </View>

      <View style={styles.cameraContainer}>
        <CameraView
          style={styles.camera}
          onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        >
          <View style={styles.overlay}>
            <View style={styles.scanArea}>
              <View style={[styles.corner, styles.topLeft]} />
              <View style={[styles.corner, styles.topRight]} />
              <View style={[styles.corner, styles.bottomLeft]} />
              <View style={[styles.corner, styles.bottomRight]} />
            </View>
          </View>
        </CameraView>
      </View>

      {scanned && (
        <TouchableOpacity style={styles.rescanBtn} onPress={() => setScanned(false)}>
          <Text style={styles.rescanText}>Tap to scan again</Text>
        </TouchableOpacity>
      )}

      <View style={styles.manualSection}>
        <Text style={styles.manualTitle}>Or enter code manually</Text>
        <View style={styles.manualInput}>
          <TextInput
            style={styles.input}
            value={manualCode}
            onChangeText={setManualCode}
            placeholder="Enter visitor code"
            placeholderTextColor={COLORS.textSecondary}
          />
          <TouchableOpacity style={styles.verifyBtn} onPress={handleManualVerify}>
            <Text style={styles.verifyText}>Verify</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.dark },
  header: { padding: 20, paddingTop: 50 },
  title: { fontSize: 24, fontWeight: 'bold', color: COLORS.white },
  subtitle: { fontSize: 14, color: COLORS.textSecondary, marginTop: 4 },
  text: { color: COLORS.white, textAlign: 'center', padding: 20 },
  button: { backgroundColor: COLORS.primary, padding: 16, borderRadius: 12, margin: 20, alignItems: 'center' },
  buttonText: { color: COLORS.white, fontWeight: 'bold' },
  cameraContainer: { flex: 1, margin: 20, borderRadius: 16, overflow: 'hidden' },
  camera: { flex: 1 },
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  scanArea: { width: 250, height: 250, borderWidth: 2, borderColor: COLORS.primary, borderRadius: 12 },
  corner: { position: 'absolute', width: 30, height: 30, borderColor: COLORS.primary },
  topLeft: { top: -2, left: -2, borderTopWidth: 4, borderLeftWidth: 4 },
  topRight: { top: -2, right: -2, borderTopWidth: 4, borderRightWidth: 4 },
  bottomLeft: { bottom: -2, left: -2, borderBottomWidth: 4, borderLeftWidth: 4 },
  bottomRight: { bottom: -2, right: -2, borderBottomWidth: 4, borderRightWidth: 4 },
  rescanBtn: { backgroundColor: COLORS.primary, margin: 20, padding: 16, borderRadius: 12, alignItems: 'center' },
  rescanText: { color: COLORS.white, fontWeight: 'bold' },
  manualSection: { padding: 20 },
  manualTitle: { fontSize: 16, color: COLORS.textSecondary, marginBottom: 12 },
  manualInput: { flexDirection: 'row', gap: 12 },
  input: { flex: 1, backgroundColor: COLORS.light, borderRadius: 12, padding: 16, color: COLORS.white },
  verifyBtn: { backgroundColor: COLORS.primary, borderRadius: 12, padding: 16, justifyContent: 'center' },
  verifyText: { color: COLORS.white, fontWeight: 'bold' }
});