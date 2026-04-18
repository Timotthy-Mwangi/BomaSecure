import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { authAPI, apartmentsAPI } from '../../services/api';
import { COLORS } from '../../config';
import socketService from '../../services/socket';
import CurrencySelector from '../common/CurrencySelector';

const Settings = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [settings, setSettings] = useState({
    buildingName: '',
    address: '',
    phone: '',
    email: '',
    timezone: 'Africa/Nairobi',
    currency: 'USD',
    depositCurrency: 'USD',
    depositUnit: 'month',
    depositAmountPerUnit: 1,
    visitorAutoApprove: false,
    deliveryNotifications: true,
    visitorNotifications: true,
    accessLogRetention: 90,
    maxVisitorsPerDay: 10,
    requirePhoto: true,
    requireId: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Fetch settings from API
  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apartmentsAPI.getSettings();
      if (response.data.settings) {
        setSettings(prev => ({
          ...prev,
          ...response.data.settings
        }));
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // Real-time updates for settings
  useEffect(() => {
    const handleSettingsUpdated = (data) => {
      if (data.settings) {
        setSettings(prev => ({
          ...prev,
          ...data.settings,
          buildingName: data.buildingName || prev.buildingName
        }));
      }
    };

    socketService.onSettingsUpdated(handleSettingsUpdated);

    return () => {
      socketService.removeListener('settings:updated', handleSettingsUpdated);
    };
  }, []);

  const handleChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await apartmentsAPI.updateSettings(settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    setDeleteError('');
    try {
      await authAPI.deleteAccount();
      logout();
      navigate('/login');
    } catch (error) {
      setDeleteError(error.response?.data?.message || 'Failed to delete account');
    } finally {
      setDeleting(false);
    }
  };

  // Show loading state
  if (loading) {
    return (
      <div style={styles.container}>
        <div style={{ textAlign: 'center', padding: '60px', color: COLORS.textSecondary }}>
          <p>Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>Settings</h1>
            <p style={styles.subtitle}>Configure system preferences</p>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              ...styles.saveButton,
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? 'Saving...' : saved ? '✓ Saved' : 'Save Changes'}
          </button>
        </div>

        <div style={styles.sectionsGrid}>
          {/* System Preferences */}
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>⚙️ System Preferences</h2>
            <div style={styles.formRow}>
              <div style={styles.formGroup}>
                <label style={styles.label} htmlFor="settings-timezone">Timezone</label>
                <select
                  id="settings-timezone"
                  name="timezone"
                  value={settings.timezone}
                  onChange={(e) => handleChange('timezone', e.target.value)}
                  style={styles.select}
                >
                  <option value="Africa/Nairobi">Africa/Nairobi (UTC+3)</option>
                  <option value="UTC">UTC</option>
                  <option value="America/New_York">America/New_York (UTC-5)</option>
                  <option value="Europe/London">Europe/London (UTC+0)</option>
                </select>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label} htmlFor="settings-currency">Currency</label>
                <select
                  id="settings-currency"
                  name="currency"
                  value={settings.currency}
                  onChange={(e) => handleChange('currency', e.target.value)}
                  style={styles.select}
                >
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="KES">KES (KSh)</option>
                </select>
              </div>
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label} htmlFor="accessLogRetention">Access Log Retention (days)</label>
              <input
                id="accessLogRetention"
                name="accessLogRetention"
                type="number"
                autoComplete="off"
                value={settings.accessLogRetention}
                onChange={(e) => handleChange('accessLogRetention', parseInt(e.target.value))}
                style={styles.input}
                min="30"
                max="365"
              />
            </div>
          </div>

          {/* Deposit Unit Settings */}
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>💰 Deposit & Rent Units</h2>
            <div style={styles.formRow}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Deposit Currency</label>
                <CurrencySelector 
                  value={settings.depositCurrency || settings.currency} 
                  onChange={(code) => handleChange('depositCurrency', code)}
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label} htmlFor="depositUnit">Charge Per</label>
                <select
                  id="depositUnit"
                  name="depositUnit"
                  value={settings.depositUnit}
                  onChange={(e) => handleChange('depositUnit', e.target.value)}
                  style={styles.select}
                >
                  <option value="day">Day</option>
                  <option value="week">Week</option>
                  <option value="month">Month</option>
                  <option value="year">Year</option>
                </select>
              </div>
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label} htmlFor="depositAmountPerUnit">Deposit Amount (per unit)</label>
              <input
                id="depositAmountPerUnit"
                name="depositAmountPerUnit"
                type="number"
                autoComplete="off"
                value={settings.depositAmountPerUnit}
                onChange={(e) => handleChange('depositAmountPerUnit', parseFloat(e.target.value))}
                style={styles.input}
                min="0"
                step="0.01"
              />
              <p style={styles.hint}>
                Example: If set to 1 month, deposit = 1 month of rent
              </p>
            </div>
          </div>

          {/* Notification Settings */}
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>🔔 Notifications</h2>
            <div style={styles.toggleGroup}>
              <div style={styles.toggleItem}>
                <div>
                  <div style={styles.toggleLabel}>Delivery Notifications</div>
                  <div style={styles.toggleDescription}>Get notified when deliveries arrive</div>
                </div>
                <button
                  aria-label="Delivery Notifications"
                  onClick={() => handleChange('deliveryNotifications', !settings.deliveryNotifications)}
                  style={{
                    ...styles.toggle,
                    backgroundColor: settings.deliveryNotifications ? COLORS.primary : '#e5e7eb',
                  }}
                >
                  <div style={{
                    ...styles.toggleKnob,
                    transform: settings.deliveryNotifications ? 'translateX(20px)' : 'translateX(0)',
                  }} />
                </button>
              </div>
              <div style={styles.toggleItem}>
                <div>
                  <div style={styles.toggleLabel}>Visitor Notifications</div>
                  <div style={styles.toggleDescription}>Get notified when visitors arrive</div>
                </div>
                <button
                  aria-label="Visitor Notifications"
                  onClick={() => handleChange('visitorNotifications', !settings.visitorNotifications)}
                  style={{
                    ...styles.toggle,
                    backgroundColor: settings.visitorNotifications ? COLORS.primary : '#e5e7eb',
                  }}
                >
                  <div style={{
                    ...styles.toggleKnob,
                    transform: settings.visitorNotifications ? 'translateX(20px)' : 'translateX(0)',
                  }} />
                </button>
              </div>
              <div style={styles.toggleItem}>
                <div>
                  <div style={styles.toggleLabel}>Auto-approve Visitors</div>
                  <div style={styles.toggleDescription}>Automatically approve pre-registered visitors</div>
                </div>
                <button
                  aria-label="Auto-approve Visitors"
                  onClick={() => handleChange('visitorAutoApprove', !settings.visitorAutoApprove)}
                  style={{
                    ...styles.toggle,
                    backgroundColor: settings.visitorAutoApprove ? COLORS.primary : '#e5e7eb',
                  }}
                >
                  <div style={{
                    ...styles.toggleKnob,
                    transform: settings.visitorAutoApprove ? 'translateX(20px)' : 'translateX(0)',
                  }} />
                </button>
              </div>
            </div>
          </div>

          {/* Security Settings */}
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>🔒 Security</h2>
            <div style={styles.dangerZone}>
              <h3 style={styles.dangerTitle}>Danger Zone</h3>
              <p style={styles.dangerDescription}>
                Once you delete your account, there is no going back. Please be certain.
              </p>
              <div style={styles.dangerActions}>
                <button 
                  onClick={() => setShowDeleteModal(true)}
                  style={styles.deleteAccountButton}
                >
                  Delete My Account
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Delete Account Modal */}
        {showDeleteModal && (
          <div style={styles.modalOverlay}>
            <div style={styles.modal}>
              <h3 style={styles.modalTitle}>Delete Account</h3>
              <p style={styles.modalText}>
                Are you sure you want to delete your account? This action cannot be undone.
                All your properties, users, and data will be permanently removed.
              </p>
              {deleteError && (
                <p style={styles.errorText}>{deleteError}</p>
              )}
              <div style={styles.modalActions}>
                <button
                  onClick={() => setShowDeleteModal(false)}
                  style={styles.cancelButton}
                  disabled={deleting}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAccount}
                  style={styles.confirmDeleteButton}
                  disabled={deleting}
                >
                  {deleting ? 'Deleting...' : 'Yes, Delete My Account'}
                </button>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};

const styles = {
  container: {
    padding: '24px',
    maxWidth: '1200px',
    margin: '0 auto',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
    flexWrap: 'wrap',
    gap: '16px',
  },
  title: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: '4px',
  },
  subtitle: {
    color: COLORS.textSecondary,
    fontSize: '14px',
  },
  saveButton: {
    padding: '10px 24px',
    backgroundColor: COLORS.primary,
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '600',
    transition: 'all 0.2s',
  },
  sectionsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
    gap: '24px',
  },
  section: {
    backgroundColor: '#1E293B',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: '20px',
    paddingBottom: '12px',
    borderBottom: '1px solid #334155',
  },
  formRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '16px',
  },
  formGroup: {
    marginBottom: '16px',
  },
  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: '6px',
  },
  input: {
    width: '100%',
    padding: '10px 14px',
    border: '1px solid #334155',
    borderRadius: '8px',
    fontSize: '14px',
    boxSizing: 'border-box',
    backgroundColor: '#0F172A',
    color: '#F1F5F9',
  },
  select: {
    width: '100%',
    padding: '10px 14px',
    border: '1px solid #334155',
    borderRadius: '8px',
    fontSize: '14px',
    boxSizing: 'border-box',
    backgroundColor: '#1E293B',
    color: '#F1F5F9',
  },
  hint: {
    fontSize: '12px',
    color: '#64748B',
    marginTop: '4px',
  },
  toggleGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  toggleItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '12px',
  },
  toggleLabel: {
    fontSize: '14px',
    fontWeight: '600',
    color: COLORS.text,
  },
  toggleDescription: {
    fontSize: '12px',
    color: COLORS.textSecondary,
    marginTop: '2px',
  },
  toggle: {
    width: '48px',
    height: '28px',
    borderRadius: '14px',
    border: 'none',
    cursor: 'pointer',
    position: 'relative',
    transition: 'background-color 0.2s',
  },
  toggleKnob: {
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    backgroundColor: '#fff',
    position: 'absolute',
    top: '2px',
    left: '2px',
    transition: 'transform 0.2s',
    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
  },
  dangerZone: {
    border: '1px solid #FEE2E2',
    borderRadius: '8px',
    padding: '16px',
    backgroundColor: '#FEF2F2',
  },
  dangerTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: COLORS.danger,
    marginBottom: '8px',
  },
  dangerDescription: {
    fontSize: '13px',
    color: COLORS.textSecondary,
    marginBottom: '16px',
  },
  dangerActions: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
  },
  dangerButton: {
    padding: '8px 16px',
    backgroundColor: '#1E293B',
    color: '#F1F5F9',
    border: '1px solid #334155',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '500',
  },
  deleteAccountButton: {
    padding: '10px 20px',
    backgroundColor: COLORS.danger,
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '20px',
  },
  modal: {
    backgroundColor: '#1E293B',
    borderRadius: '12px',
    padding: '24px',
    maxWidth: '400px',
    width: '100%',
  },
  modalTitle: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#F1F5F9',
    marginBottom: '12px',
  },
  modalText: {
    fontSize: '14px',
    color: '#94A3B8',
    marginBottom: '20px',
    lineHeight: '1.5',
  },
  errorText: {
    fontSize: '14px',
    color: COLORS.danger,
    marginBottom: '16px',
  },
  modalActions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
  },
  cancelButton: {
    padding: '10px 20px',
    backgroundColor: '#334155',
    color: '#F1F5F9',
    border: '1px solid #475569',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
  },
  confirmDeleteButton: {
    padding: '10px 20px',
    backgroundColor: COLORS.danger,
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
  },
};

export default Settings;
