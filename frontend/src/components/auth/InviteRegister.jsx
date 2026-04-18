import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { authAPI } from '../../services/api';
import { COLORS } from '../../config';
import { User, Phone, Mail, Lock, CheckCircle, AlertCircle } from 'lucide-react';
import logo from '../../assets/bomasecure.png';

const InviteRegister = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const inviteToken = searchParams.get('token');

  const [inviteRole, setInviteRole] = useState('tenant');
  const [form, setForm] = useState({ name: '', phone: '', email: '', password: '', confirmPassword: '', roomNumber: '', serviceType: 'general' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);

  useEffect(() => {
    if (inviteToken) {
      try {
        const decoded = JSON.parse(atob(inviteToken.split('.')[1]));
        setInviteRole(decoded.role || 'tenant');
      } catch (e) {
        setInviteRole('tenant');
      }
    }
  }, [inviteToken]);

  const getTitleText = () => {
    switch (inviteRole) {
      case 'maintenance':
        return "You've been invited as Maintenance Staff!";
      case 'guard':
        return "You've been invited as Security Guard!";
      case 'admin':
        return "You've been invited as Administrator!";
      default:
        return "You've been invited!";
    }
  };

  const getSubtitleText = () => {
    switch (inviteRole) {
      case 'maintenance':
        return "Fill in your details to create your maintenance staff account";
      case 'guard':
        return "Fill in your details to create your security guard account";
      case 'admin':
        return "Fill in your details to create your admin account";
      default:
        return "Fill in your details to create your account";
    }
  };

  const serviceTypes = [
    { id: 'general', name: 'General' },
    { id: 'plumbing', name: 'Plumbing' },
    { id: 'electrical', name: 'Electrical' },
    { id: 'carpentry', name: 'Carpentry' },
    { id: 'painting', name: 'Painting' },
    { id: 'hvac', name: 'HVAC' },
    { id: 'appliance', name: 'Appliance' },
    { id: 'other', name: 'Other' }
  ];

  if (!inviteToken) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: COLORS.gray[50] }}>
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <AlertCircle size={48} color={COLORS.accent} style={{ marginBottom: '16px' }} />
          <h2 style={{ color: COLORS.dark }}>Invalid Invite Link</h2>
          <p style={{ color: COLORS.gray[500] }}>This link is missing a token. Please request a new invite.</p>
        </div>
      </div>
    );
  }

  const handleChange = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirmPassword) return setError('Passwords do not match');
    if (form.password.length < 6) return setError('Password must be at least 6 characters');
    if (!agreeTerms) return setError('Please accept the Terms and Conditions to continue');

    setLoading(true);
    try {
      const payload = {
        inviteToken,
        name: form.name,
        phone: form.phone,
        email: form.email,
        password: form.password,
        roomNumber: form.roomNumber
      };
      payload.serviceType = form.serviceType;
      await authAPI.registerViaInvite(payload);
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: '100%', padding: '13px 16px 13px 46px',
    border: `1px solid ${COLORS.gray[200]}`, borderRadius: '10px',
    fontSize: '15px', outline: 'none', boxSizing: 'border-box',
    background: COLORS.white, color: COLORS.dark
  };

  const iconStyle = {
    position: 'absolute', left: '14px', top: '50%',
    transform: 'translateY(-50%)', color: COLORS.gray[400]
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: COLORS.gray[50], padding: '24px' }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ width: '100%', maxWidth: '440px', background: COLORS.white, borderRadius: '20px', padding: '36px', boxShadow: '0 8px 32px rgba(0,0,0,0.08)' }}
      >
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <img src={logo} alt="BomaSecure" style={{ width: '60px', height: '60px', objectFit: 'contain', marginBottom: '12px' }} />
          <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 700, color: COLORS.dark }}>{getTitleText()}</h2>
          <p style={{ margin: '6px 0 0', fontSize: '14px', color: COLORS.gray[500] }}>{getSubtitleText()}</p>
        </div>

        {error && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', background: COLORS.accent + '15', border: `1px solid ${COLORS.accent}`, borderRadius: '10px', marginBottom: '20px', color: COLORS.accent, fontSize: '14px' }}
          >
            <AlertCircle size={16} /> {error}
          </motion.div>
        )}

        <form onSubmit={handleSubmit}>
          {[
            { name: 'name', label: 'Full Name', type: 'text', icon: User, placeholder: 'Enter your full name', required: true },
            { name: 'phone', label: 'Phone Number', type: 'tel', icon: Phone, placeholder: '254700000000', required: true },
            { name: 'email', label: 'Email Address', type: 'email', icon: Mail, placeholder: 'your@email.com', required: false },
            { name: 'roomNumber', label: 'Room Number', type: 'text', icon: null, placeholder: 'e.g. 101, A1', required: false },
          ].map(({ name, label, type, icon: Icon, placeholder, required }) => (
            <div key={name} style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: COLORS.dark, marginBottom: '6px' }}>
                {label} {required && <span style={{ color: COLORS.accent }}>*</span>}
              </label>
              <div style={{ position: 'relative' }}>
                {Icon && <Icon size={16} style={iconStyle} />}
                <input
                  name={name} id={name} type={type} value={form[name]}
                  onChange={handleChange} placeholder={placeholder}
                  required={required} autoComplete="off"
                  style={{ ...inputStyle, paddingLeft: Icon ? '46px' : '16px' }}
                />
              </div>
            </div>
          ))}

          {/* Service Type Selection - only for Maintenance Staff */}
          {inviteRole === 'maintenance' && (
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: COLORS.dark, marginBottom: '6px' }}>
                Service Type
              </label>
              <select
                name="serviceType"
                value={form.serviceType}
                onChange={handleChange}
                style={{ ...inputStyle, paddingLeft: '16px' }}
              >
                {serviceTypes.map(st => (
                  <option key={st.id} value={st.id}>{st.name}</option>
                ))}
              </select>
            </div>
          )}

          {[
            { name: 'password', label: 'Password', type: 'password', icon: Lock, placeholder: 'Min 6 characters', required: true },
            { name: 'confirmPassword', label: 'Confirm Password', type: 'password', icon: Lock, placeholder: 'Repeat password', required: true },
          ].map(({ name, label, type, icon: Icon, placeholder, required }) => (
            <div key={name} style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: COLORS.dark, marginBottom: '6px' }}>
                {label} {required && <span style={{ color: COLORS.accent }}>*</span>}
              </label>
              <div style={{ position: 'relative' }}>
                {Icon && <Icon size={16} style={iconStyle} />}
                <input
                  name={name} id={name} type={type} value={form[name]}
                  onChange={handleChange} placeholder={placeholder}
                  required={required} autoComplete="off"
                  style={{ ...inputStyle, paddingLeft: Icon ? '46px' : '16px' }}
                />
              </div>
            </div>
          ))}

          {/* Terms & Privacy Agreement */}
          <div style={{
            marginBottom: '20px',
            padding: '14px',
            background: '#F8FAFC',
            borderRadius: '10px',
            border: `1px solid ${COLORS.gray[200]}`
          }}>
            <label style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              cursor: 'pointer',
              color: COLORS.gray[700],
              fontSize: '13px',
              lineHeight: 1.5
            }}>
              <input
                type="checkbox"
                checked={agreeTerms}
                onChange={(e) => setAgreeTerms(e.target.checked)}
                style={{
                  marginTop: '2px',
                  width: '16px',
                  height: '16px',
                  cursor: 'pointer',
                  accentColor: COLORS.primary
                }}
              />
              <span>
                I agree to the{' '}
                <a href="/terms" target="_blank" style={{ color: COLORS.primary, textDecoration: 'none', fontWeight: 600 }}>Terms</a>
                {' '}and{' '}
                <a href="/privacy" target="_blank" style={{ color: COLORS.primary, textDecoration: 'none', fontWeight: 600 }}>Privacy Policy</a>
              </span>
            </label>
          </div>

          <motion.button
            type="submit" disabled={loading || !agreeTerms}
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            style={{
              width: '100%', padding: '14px', marginTop: '8px',
              background: loading ? COLORS.gray[300] : COLORS.primary,
              border: 'none', borderRadius: '10px', color: COLORS.white,
              fontSize: '15px', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </motion.button>
        </form>
      </motion.div>

      {/* Success Popup */}
      <AnimatePresence>
        {success && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '24px' }}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              style={{ background: COLORS.white, borderRadius: '20px', padding: '40px', textAlign: 'center', maxWidth: '360px', width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring' }}
              >
                <CheckCircle size={64} color={COLORS.secondary} style={{ marginBottom: '20px' }} />
              </motion.div>
              <h2 style={{ margin: '0 0 10px', fontSize: '22px', fontWeight: 700, color: COLORS.dark }}>Account Created!</h2>
              <p style={{ margin: '0 0 28px', fontSize: '15px', color: COLORS.gray[500] }}>
                Your account has been created successfully. You can now log in.
              </p>
              <motion.button
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                onClick={() => navigate('/login')}
                style={{
                  width: '100%', padding: '14px', background: COLORS.primary,
                  border: 'none', borderRadius: '10px', color: COLORS.white,
                  fontSize: '15px', fontWeight: 600, cursor: 'pointer'
                }}
              >
                Go to Login
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default InviteRegister;