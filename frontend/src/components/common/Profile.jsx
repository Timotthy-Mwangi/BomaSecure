import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { authAPI } from '../../services/api';
import api from '../../services/api';
import socketService from '../../services/socket';
import { COLORS } from '../../config';
import { User, Phone, Mail, Lock, Building, Save, AlertCircle, Check, Map } from 'lucide-react';
import { startTour } from './UserGuide';

const Profile = ({ role = 'tenant' }) => {
  const { user, updateProfile, logout } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    email: user?.email || '',
    roomNumber: user?.roomNumber || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        name: user.name || '',
        phone: user.phone || '',
        email: user.email || '',
        roomNumber: user.roomNumber || ''
      }));
    }
  }, [user]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setSuccess(false);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      // Update profile
      const result = await updateProfile({
        name: formData.name,
        phone: formData.phone,
        roomNumber: formData.roomNumber
      });

      if (result.success) {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } else {
        setError(result.error || 'Failed to update profile');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    
    if (!formData.currentPassword || !formData.newPassword || !formData.confirmPassword) {
      setError('Please fill in all password fields');
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (formData.newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await authAPI.changePassword({
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword
      });
      setSuccess(true);
      setFormData(prev => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      }));
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    setError('');
    
    try {
      await api.delete(`/auth/users/${user._id}`);
      // Broadcast account deletion
      socketService.emit('account:deleted', { userId: user._id });
      // Log out the user
      await logout();
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete account');
      setDeleting(false);
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 700, color: COLORS.text }}>Profile Settings</h1>
          <p style={{ margin: '8px 0 0', color: COLORS.textSecondary }}>
            Manage your account information
          </p>
        </div>
        <button
          onClick={() => startTour()}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 16px',
            background: COLORS.primary + '15',
            border: `1px solid ${COLORS.primary}`,
            borderRadius: '8px',
            color: COLORS.primary,
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.background = COLORS.primary + '25';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.background = COLORS.primary + '15';
          }}
        >
          <Map size={18} />
          Take a Tour
        </button>
      </div>

      {/* Success Message */}
      {role !== 'guard' && success && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            background: `${COLORS.secondary}15`,
            border: `1px solid ${COLORS.secondary}`,
            borderRadius: '12px',
            padding: '12px 16px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            color: COLORS.secondary
          }}
        >
          <Check size={20} />
          <span style={{ fontSize: '14px' }}>Profile updated successfully!</span>
        </motion.div>
      )}

      {/* Error Message */}
      {role !== 'guard' && error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            background: `${COLORS.accent}15`,
            border: `1px solid ${COLORS.accent}`,
            borderRadius: '12px',
            padding: '12px 16px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            color: COLORS.accent
          }}
        >
          <AlertCircle size={20} />
          <span style={{ fontSize: '14px' }}>{error}</span>
        </motion.div>
      )}

      {/* Profile Form */}
      <div style={{ 
        background: '#1E293B', 
        borderRadius: '16px', 
        padding: '24px',
        marginBottom: '24px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
      }}>
        <h2 style={{ margin: '0 0 24px', fontSize: '18px', fontWeight: 600, color: COLORS.text }}>
          Personal Information
        </h2>

        {/* Avatar - Initials only, no upload */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.secondary})`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '28px',
            fontWeight: 700,
            color: COLORS.white
          }}>
            {formData.name?.charAt(0) || 'U'}
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px' }} className="profile-grid">
            {/* Name */}
            <div>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: 600,
                color: COLORS.text,
                marginBottom: '8px'
              }}>
                Full Name
              </label>
              <div style={{ position: 'relative' }}>
                <User size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: COLORS.textSecondary }} />
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  style={{
                    width: '100%',
                    padding: '12px 12px 12px 40px',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            {/* Phone */}
            <div>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: 600,
                color: COLORS.text,
                marginBottom: '8px'
              }}>
                Phone Number
              </label>
              <div style={{ position: 'relative' }}>
                <Phone size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: COLORS.textSecondary }} />
                <input
                  id="profile-phone"
                  type="tel"
                  name="phone"
                  autoComplete="tel"
                  value={formData.phone}
                  onChange={handleChange}
                  style={{
                    width: '100%',
                    padding: '12px 12px 12px 40px',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: 600,
                color: COLORS.text,
                marginBottom: '8px'
              }}>
                Email Address
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: COLORS.textSecondary }} />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  disabled
                  style={{
                    width: '100%',
                    padding: '12px 12px 12px 40px',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    fontSize: '14px',
                    opacity: 0.6,
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            {/* Building/Property Name - Display Only */}
            {user?.apartmentId && (
              <>
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: COLORS.text,
                    marginBottom: '8px'
                  }}>
                    Property/Building
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Building size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: COLORS.textSecondary }} />
                    <input
                      type="text"
                      value={user.apartmentId.buildingName || user.apartmentId.buildingName || ''}
                      disabled
                      style={{
                        width: '100%',
                        padding: '12px 12px 12px 40px',
                        border: '1px solid #334155',
                        borderRadius: '8px',
                        fontSize: '14px',
                        boxSizing: 'border-box',
                        backgroundColor: '#1E293B',
                        color: '#94A3B8'
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: COLORS.text,
                    marginBottom: '8px'
                  }}>
                    Building Code
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Building size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: COLORS.textSecondary }} />
                    <input
                      type="text"
                      value={user.apartmentId.buildingCode || 'N/A'}
                      disabled
                      style={{
                        width: '100%',
                        padding: '12px 12px 12px 40px',
                        border: '1px solid #334155',
                        borderRadius: '8px',
                        fontSize: '14px',
                        boxSizing: 'border-box',
                        backgroundColor: '#1E293B',
                        color: '#94A3B8'
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: COLORS.text,
                    marginBottom: '8px'
                  }}>
                    Location
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Map size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: COLORS.textSecondary }} />
                    <input
                      type="text"
                      value={user.apartmentId.location?.city || user.apartmentId.location?.address || 'N/A'}
                      disabled
                      style={{
                        width: '100%',
                        padding: '12px 12px 12px 40px',
                        border: '1px solid #334155',
                        borderRadius: '8px',
                        fontSize: '14px',
                        boxSizing: 'border-box',
                        backgroundColor: '#1E293B',
                        color: '#94A3B8'
                      }}
                    />
                  </div>
                </div>
              </>
            )}

            {/* Room Number */}
            <div>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: 600,
                color: COLORS.text,
                marginBottom: '8px'
              }}>
                Room Number
              </label>
              <div style={{ position: 'relative' }}>
                <Building size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: COLORS.textSecondary }} />
                <input
                  type="text"
                  name="roomNumber"
                  value={formData.roomNumber}
                  onChange={handleChange}
                  style={{
                    width: '100%',
                    padding: '12px 12px 12px 40px',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            type="submit"
            disabled={loading}
            style={{
              marginTop: '24px',
              padding: '12px 24px',
              background: COLORS.primary,
              border: 'none',
              borderRadius: '8px',
              color: COLORS.white,
              fontSize: '14px',
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <Save size={18} />
            {loading ? 'Saving...' : 'Save Changes'}
          </motion.button>
        </form>
      </div>

      {/* Password Change */}
      <div style={{ 
        background: '#1E293B', 
        borderRadius: '16px', 
        padding: '24px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
      }}>
        <h2 style={{ margin: '0 0 24px', fontSize: '18px', fontWeight: 600, color: COLORS.text }}>
          Change Password
        </h2>

        <form onSubmit={handlePasswordChange}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: 600,
                color: COLORS.text,
                marginBottom: '8px'
              }}>
                Current Password
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: COLORS.textSecondary }} />
                <input
                  type="password"
                  name="currentPassword"
                  value={formData.currentPassword}
                  onChange={handleChange}
                  style={{
                    width: '100%',
                    padding: '12px 12px 12px 40px',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: 600,
                color: COLORS.text,
                marginBottom: '8px'
              }}>
                New Password
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: COLORS.textSecondary }} />
                <input
                  type="password"
                  name="newPassword"
                  value={formData.newPassword}
                  onChange={handleChange}
                  style={{
                    width: '100%',
                    padding: '12px 12px 12px 40px',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: 600,
                color: COLORS.text,
                marginBottom: '8px'
              }}>
                Confirm New Password
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: COLORS.textSecondary }} />
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  style={{
                    width: '100%',
                    padding: '12px 12px 12px 40px',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            type="submit"
            disabled={loading}
            style={{
              marginTop: '24px',
              padding: '12px 24px',
              background: COLORS.gray[700],
              border: 'none',
              borderRadius: '8px',
              color: COLORS.white,
              fontSize: '14px',
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1
            }}
          >
            {loading ? 'Updating...' : 'Update Password'}
          </motion.button>
        </form>
      </div>

      {/* Delete Account Section */}
      <div style={{
        marginTop: '48px',
        padding: '24px',
        background: '#FEF2F2',
        borderRadius: '12px',
        border: '1px solid #FECACA'
      }}>
        <h2 style={{ 
          margin: '0 0 8px 0', 
          fontSize: '18px', 
          fontWeight: 600, 
          color: '#DC2626' 
        }}>
          🔴 Delete Account
        </h2>
        <p style={{ 
          margin: '0 0 16px 0', 
          color: '#7F1D1D',
          fontSize: '14px' 
        }}>
          Once you delete your account, there is no going back. Please be certain.
        </p>
        
        {showDeleteConfirm ? (
          <div style={{ background: '#1E293B', padding: '16px', borderRadius: '8px' }}>
            <p style={{ margin: '0 0 12px 0', color: '#F1F5F9', fontWeight: 500 }}>
              Are you sure you want to delete your account? This action cannot be undone.
            </p>
            {role !== 'guard' && error && (
              <p style={{ color: '#DC2626', fontSize: '14px', marginBottom: '12px' }}>
                {error}
              </p>
            )}
            <div style={{ display: 'flex', gap: '12px' }}>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleDeleteAccount}
                disabled={deleting}
                style={{
                  padding: '10px 20px',
                  background: '#DC2626',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 600,
                  cursor: deleting ? 'not-allowed' : 'pointer',
                  opacity: deleting ? 0.7 : 1
                }}
              >
                {deleting ? 'Deleting...' : 'Yes, Delete My Account'}
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setError('');
                }}
                style={{
                  padding: '10px 20px',
                  background: '#334155',
                  color: '#F1F5F9',
                  border: '1px solid #475569',
                  borderRadius: '8px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </motion.button>
            </div>
          </div>
        ) : (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowDeleteConfirm(true)}
            style={{
              padding: '10px 20px',
              background: '#DC2626',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Delete My Account
          </motion.button>
        )}
      </div>

      <style>{`
        @media (max-width: 768px) {
          div[style*="maxWidth: 800px"] {
            padding: 16px !important;
          }
          h1[style*="fontSize: 28px"] {
            font-size: 22px !important;
          }
          .profile-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
};

export default Profile;
