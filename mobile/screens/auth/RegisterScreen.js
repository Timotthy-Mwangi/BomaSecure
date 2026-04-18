import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { COLORS, APP_NAME } from '../../config';

export default function RegisterScreen({ navigation }) {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    apartment: '',
    role: 'tenant'
  });
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleRegister = async () => {
    const { firstName, lastName, email, phone, password, confirmPassword, apartment } = formData;
    
    if (!firstName || !lastName || !email || !phone || !password || !apartment) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    setLoading(true);
    const result = await register({
      firstName,
      lastName,
      email,
      phone,
      password,
      apartment,
      role: 'tenant'
    });
    setLoading(false);

    if (!result.success) {
      Alert.alert('Registration Failed', result.error);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Join {APP_NAME}</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.row}>
            <View style={styles.halfInput}>
              <Text style={styles.label}>First Name</Text>
              <TextInput
                style={styles.input}
                value={formData.firstName}
                onChangeText={(v) => updateField('firstName', v)}
                placeholder="First name"
                placeholderTextColor={COLORS.textSecondary}
              />
            </View>
            <View style={styles.halfInput}>
              <Text style={styles.label}>Last Name</Text>
              <TextInput
                style={styles.input}
                value={formData.lastName}
                onChangeText={(v) => updateField('lastName', v)}
                placeholder="Last name"
                placeholderTextColor={COLORS.textSecondary}
              />
            </View>
          </View>

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={formData.email}
            onChangeText={(v) => updateField('email', v)}
            placeholder="Enter your email"
            placeholderTextColor={COLORS.textSecondary}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Text style={styles.label}>Phone</Text>
          <TextInput
            style={styles.input}
            value={formData.phone}
            onChangeText={(v) => updateField('phone', v)}
            placeholder="Phone number"
            placeholderTextColor={COLORS.textSecondary}
            keyboardType="phone-pad"
          />

          <Text style={styles.label}>Apartment/Unit</Text>
          <TextInput
            style={styles.input}
            value={formData.apartment}
            onChangeText={(v) => updateField('apartment', v)}
            placeholder="e.g., A101"
            placeholderTextColor={COLORS.textSecondary}
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            value={formData.password}
            onChangeText={(v) => updateField('password', v)}
            placeholder="Create password"
            placeholderTextColor={COLORS.textSecondary}
            secureTextEntry
          />

          <Text style={styles.label}>Confirm Password</Text>
          <TextInput
            style={styles.input}
            value={formData.confirmPassword}
            onChangeText={(v) => updateField('confirmPassword', v)}
            placeholder="Confirm password"
            placeholderTextColor={COLORS.textSecondary}
            secureTextEntry
          />

          <TouchableOpacity 
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.buttonText}>Create Account</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.linkButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.linkText}>
              Already have an account? <Text style={styles.linkHighlight}>Sign In</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.dark
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24
  },
  header: {
    marginBottom: 24,
    marginTop: 40
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.white
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginTop: 8
  },
  form: {},
  row: {
    flexDirection: 'row',
    gap: 12
  },
  halfInput: {
    flex: 1
  },
  label: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 8,
    marginTop: 16
  },
  input: {
    backgroundColor: COLORS.light,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.gray[700]
  },
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 32
  },
  buttonDisabled: {
    opacity: 0.6
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold'
  },
  linkButton: {
    alignItems: 'center',
    marginTop: 24
  },
  linkText: {
    color: COLORS.textSecondary,
    fontSize: 14
  },
  linkHighlight: {
    color: COLORS.primary,
    fontWeight: 'bold'
  }
});