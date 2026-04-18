import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { COLORS, APP_NAME, APP_TAGLINE } from '../../config';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }

    setLoading(true);
    const result = await login(email, password);
    setLoading(false);

    if (!result.success) {
      Alert.alert('Login Failed', result.error);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.logo}>🏢</Text>
          <Text style={styles.title}>{APP_NAME}</Text>
          <Text style={styles.tagline}>{APP_TAGLINE}</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="Enter your email"
            placeholderTextColor={COLORS.textSecondary}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="Enter your password"
            placeholderTextColor={COLORS.textSecondary}
            secureTextEntry
            autoComplete="password"
          />

          <TouchableOpacity 
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.buttonText}>Sign In</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.linkButton}
            onPress={() => navigation.navigate('Register')}
          >
            <Text style={styles.linkText}>
              Don't have an account? <Text style={styles.linkHighlight}>Register</Text>
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
    justifyContent: 'center',
    padding: 24
  },
  header: {
    alignItems: 'center',
    marginBottom: 48
  },
  logo: {
    fontSize: 64,
    marginBottom: 16
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: 8
  },
  tagline: {
    fontSize: 16,
    color: COLORS.textSecondary
  },
  form: {
    width: '100%'
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