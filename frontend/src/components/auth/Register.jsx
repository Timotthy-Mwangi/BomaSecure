import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { APP_NAME, APP_TAGLINE, COLORS, ROLE_COLORS } from '../../config';
import { User, Phone, Mail, Lock, AlertCircle, Settings, Wrench } from 'lucide-react';
import logo from "../../assets/bomasecure.png";

const Register = () => {
  const navigate = useNavigate();
  const { register, loading, error } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'admin',
    serviceType: 'general'
  });
  const [localError, setLocalError] = useState('');
  const [selectedRole, setSelectedRole] = useState('admin');
  const [agreeTerms, setAgreeTerms] = useState(false);

  const roleConfig = ROLE_COLORS[selectedRole];

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRoleChange = (role) => {
    setSelectedRole(role);
    setFormData({ ...formData, role, serviceType: role === 'maintenance' ? 'general' : undefined });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');

    if (!formData.name || !formData.phone || !formData.email || !formData.password) {
      setLocalError('Please fill in all required fields');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setLocalError('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setLocalError('Password must be at least 6 characters');
      return;
    }

    if (!agreeTerms) {
      setLocalError('Please accept the Terms and Conditions to continue');
      return;
    }

    const result = await register({
      name: formData.name,
      phone: formData.phone,
      email: formData.email,
      password: formData.password,
      role: formData.role,
      ...(formData.role === 'maintenance' && { serviceType: formData.serviceType })
    });

    if (result.success) {
      const redirectPath = result.user.role === 'maintenance' ? '/maintenance' :
                         result.user.role === 'admin' ? '/admin' : '/';
      navigate(redirectPath);
    }
  };

  const roles = [
    { id: 'admin', name: 'Landlord/Property Manager', icon: Settings, description: 'Property owner or manager' },
    { id: 'maintenance', name: 'Maintenance Staff', icon: Wrench, description: 'Handle repairs and maintenance' }
  ];

  const serviceTypes = [
    { id: 'general', name: 'General Maintenance', description: 'General repairs and maintenance' },
    { id: 'plumbing', name: 'Plumbing', description: 'Water systems, pipes, drains' },
    { id: 'electrical', name: 'Electrical', description: 'Wiring, switches, electrical repairs' },
    { id: 'carpentry', name: 'Carpentry', description: 'Wood work, furniture, doors' },
    { id: 'painting', name: 'Painting', description: 'Interior and exterior painting' },
    { id: 'hvac', name: 'HVAC', description: 'Heating, ventilation, air conditioning' },
    { id: 'appliance', name: 'Appliance Repair', description: 'Home appliances repair' },
    { id: 'other', name: 'Other', description: 'Other services' }
  ];

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      background: `linear-gradient(135deg, ${COLORS.gray[50]} 0%, ${COLORS.white} 100%)`
    }} className="register-container">
      {/* Left Side - Branding */}
      <div style={{
        flex: 1,
        background: roleConfig.gradient,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px',
        position: 'relative',
        overflow: 'hidden'
      }} className="register-branding">
        <div style={{
          position: 'absolute',
          top: '-100px',
          right: '-100px',
          width: '400px',
          height: '400px',
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.1)'
        }} />

        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          style={{
            textAlign: 'center',
            color: COLORS.white,
            zIndex: 1
          }}
        >
          <div style={{
            width: '140px',
            height: '140px',
            background: COLORS.white,
            borderRadius: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 32px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            overflow: 'hidden'
          }}>
            <img 
              src={logo} 
              alt="BomaSecure Logo" 
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain'
              }}
            />
          </div>

          <h1 style={{
            fontSize: '48px',
            fontWeight: 700,
            margin: '0 0 16px',
            fontFamily: 'Poppins, sans-serif'
          }}>
            {APP_NAME}
          </h1>

          <p style={{
            fontSize: '20px',
            opacity: 0.9,
            margin: 0,
            fontFamily: 'Poppins, sans-serif'
          }}>
            {APP_TAGLINE}
          </p>
        </motion.div>
      </div>

      {/* Right Side - Register Form */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px',
        overflowY: 'auto'
      }} className="register-form-container">
        <motion.div
          initial={{ x: 50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
          style={{
            width: '100%',
            maxWidth: '420px'
          }}
        >
          <h2 style={{
            fontSize: '32px',
            fontWeight: 700,
            color: COLORS.dark,
            margin: '0 0 8px',
            fontFamily: 'Poppins, sans-serif'
          }}>
            Create Account
          </h2>
          <p style={{
            fontSize: '16px',
            color: COLORS.gray[500],
            margin: '0 0 32px'
          }}>
            Join BomaSecure today
          </p>

          {/* Role Selection */}
          <div style={{ marginBottom: '24px' }}>
            <span style={{ fontSize: '14px', fontWeight: 600, color: COLORS.dark, display: 'block', marginBottom: '12px' }}>
              Select Account Type
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
              {roles.map((role) => (
                <motion.button
                  key={role.id}
                  type="button"
                  className="role-card"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleRoleChange(role.id)}
                  style={{
                    padding: '12px',
                    border: `2px solid ${selectedRole === role.id ? ROLE_COLORS[role.id].primary : COLORS.gray[200]}`,
                    borderRadius: '10px',
                    background: selectedRole === role.id ? ROLE_COLORS[role.id].primary + '10' : COLORS.white,
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <role.icon size={20} color={selectedRole === role.id ? ROLE_COLORS[role.id].primary : COLORS.gray[500]} />
                  <span style={{ fontSize: '12px', fontWeight: 600, color: selectedRole === role.id ? ROLE_COLORS[role.id].primary : COLORS.gray[600], textAlign: 'center', wordBreak: 'break-word' }}>
                    {role.name}
                  </span>
                </motion.button>
              ))}
            </div>
          </div>

          {/* Service Type Selection - Only for Maintenance */}
          {selectedRole === 'maintenance' && (
            <div style={{ marginBottom: '24px' }}>
              <span style={{ fontSize: '14px', fontWeight: 600, color: COLORS.dark, display: 'block', marginBottom: '12px' }}>
                Select Service Type
              </span>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                {serviceTypes.map((service) => (
                  <motion.button
                    key={service.id}
                    type="button"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setFormData({ ...formData, serviceType: service.id })}
                    style={{
                      padding: '10px',
                      border: `2px solid ${formData.serviceType === service.id ? '#F59E0B' : COLORS.gray[200]}`,
                      borderRadius: '10px',
                      background: formData.serviceType === service.id ? '#FEF3C7' : COLORS.white,
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <span style={{ fontSize: '12px', fontWeight: 600, color: formData.serviceType === service.id ? '#F59E0B' : COLORS.gray[600], textAlign: 'center' }}>
                      {service.name}
                    </span>
                  </motion.button>
                ))}
              </div>
            </div>
          )}

          {(error || localError) && (
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
              <span style={{ fontSize: '14px' }}>{localError || error}</span>
            </motion.div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Name */}
            <div style={{ marginBottom: '16px' }}>
              <label htmlFor="register-name" style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: 600,
                color: COLORS.gray[700],
                marginBottom: '8px'
              }}>
                Full Name *
              </label>
              <div style={{ position: 'relative' }}>
                <User size={20} style={{
                  position: 'absolute',
                  left: '16px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: COLORS.gray[400]
                }} />
                <input
                  type="text"
                  name="name"
                  id="register-name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Enter your full name"
                  autoComplete="name"
                  style={{
                    width: '100%',
                    padding: '14px 16px 14px 48px',
                    border: `2px solid ${COLORS.gray[200]}`,
                    borderRadius: '12px',
                    fontSize: '16px',
                    outline: 'none',
                    boxSizing: 'border-box',
                    background: COLORS.white,
                    color: COLORS.dark
                  }}
                />
              </div>
            </div>

            {/* Phone */}
            <div style={{ marginBottom: '16px' }}>
              <label htmlFor="register-phone" style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: 600,
                color: COLORS.gray[700],
                marginBottom: '8px'
              }}>
                Phone Number *
              </label>
              <div style={{ position: 'relative' }}>
                <Phone size={20} style={{
                  position: 'absolute',
                  left: '16px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: COLORS.gray[400]
                }} />
                <input
                  type="tel"
                  name="phone"
                  id="register-phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="254700000000"
                  autoComplete="tel"
                  style={{
                    width: '100%',
                    padding: '14px 16px 14px 48px',
                    border: `2px solid ${COLORS.gray[200]}`,
                    borderRadius: '12px',
                    fontSize: '16px',
                    outline: 'none',
                    boxSizing: 'border-box',
                    background: COLORS.white,
                    color: COLORS.dark
                  }}
                />
              </div>
            </div>

            {/* Email */}
            <div style={{ marginBottom: '16px' }}>
              <label htmlFor="register-email" style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: 600,
                color: COLORS.gray[700],
                marginBottom: '8px'
              }}>
                Email Address *
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={20} style={{
                  position: 'absolute',
                  left: '16px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: COLORS.gray[400]
                }} />
                <input
                  type="email"
                  name="email"
                  id="register-email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="your@email.com"
                  autoComplete="email"
                  style={{
                    width: '100%',
                    padding: '14px 16px 14px 48px',
                    border: `2px solid ${COLORS.gray[200]}`,
                    borderRadius: '12px',
                    fontSize: '16px',
                    outline: 'none',
                    boxSizing: 'border-box',
                    background: COLORS.white,
                    color: COLORS.dark
                  }}
                />
              </div>
            </div>

            {/* Password */}
            <div style={{ marginBottom: '16px' }}>
              <label htmlFor="register-password" style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: 600,
                color: COLORS.gray[700],
                marginBottom: '8px'
              }}>
                Password *
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={20} style={{
                  position: 'absolute',
                  left: '16px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: COLORS.gray[400]
                }} />
                <input
                  type="password"
                  name="password"
                  id="register-password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Min 6 characters"
                  autoComplete="new-password"
                  style={{
                    width: '100%',
                    padding: '14px 16px 14px 48px',
                    border: `2px solid ${COLORS.gray[200]}`,
                    borderRadius: '12px',
                    fontSize: '16px',
                    outline: 'none',
                    boxSizing: 'border-box',
                    background: COLORS.white,
                    color: COLORS.dark
                  }}
                />
              </div>
            </div>

            {/* Confirm Password */}
            <div style={{ marginBottom: '24px' }}>
              <label htmlFor="register-confirm" style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: 600,
                color: COLORS.gray[700],
                marginBottom: '8px'
              }}>
                Confirm Password *
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={20} style={{
                  position: 'absolute',
                  left: '16px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: COLORS.gray[400]
                }} />
                <input
                  type="password"
                  name="confirmPassword"
                  id="register-confirm"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Confirm password"
                  autoComplete="new-password"
                  style={{
                    width: '100%',
                    padding: '14px 16px 14px 48px',
                    border: `2px solid ${COLORS.gray[200]}`,
                    borderRadius: '12px',
                    fontSize: '16px',
                    outline: 'none',
                    boxSizing: 'border-box',
                    background: COLORS.white,
                    color: COLORS.dark
                  }}
                />
              </div>
            </div>

            {/* Terms & Privacy Agreement */}
            <div style={{
              marginBottom: '20px',
              padding: '16px',
              background: '#F8FAFC',
              borderRadius: '12px',
              border: `1px solid ${COLORS.gray[200]}`
            }}>
              <label style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                cursor: 'pointer',
                color: COLORS.gray[700],
                fontSize: '14px',
                lineHeight: 1.5
              }}>
                <input
                  type="checkbox"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  style={{
                    marginTop: '3px',
                    width: '18px',
                    height: '18px',
                    cursor: 'pointer',
                    accentColor: COLORS.primary
                  }}
                />
                <span>
                  I agree to the{' '}
                  <a href="/terms" target="_blank" style={{ color: COLORS.primary, textDecoration: 'none', fontWeight: 600 }}>Terms and Conditions</a>
                  {' '}and{' '}
                  <a href="/privacy" target="_blank" style={{ color: COLORS.primary, textDecoration: 'none', fontWeight: 600 }}>Privacy Policy</a>
                </span>
              </label>
            </div>

            <motion.button
              type="submit"
              disabled={loading || !agreeTerms}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              style={{
                width: '100%',
                padding: '16px',
                background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.secondary})`,
                border: 'none',
                borderRadius: '12px',
                color: COLORS.white,
                fontSize: '16px',
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
                boxShadow: '0 4px 12px rgba(0, 102, 204, 0.3)'
              }}
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </motion.button>
          </form>

          <p style={{
            marginTop: '24px',
            textAlign: 'center',
            fontSize: '14px',
            color: COLORS.gray[500]
          }}>
            Already have an account?{' '}
            <Link to="/login" style={{
              color: COLORS.primary,
              textDecoration: 'none',
              fontWeight: 600
            }}>
              Sign in
            </Link>
          </p>
        </motion.div>
      </div>
      <style>{`
        @media (max-width: 768px) {
          .register-branding {
            display: none !important;
          }
        }
        @media (max-width: 768px) {
          .register-container {
            flex-direction: column !important;
          }
        }
        @media (max-width: 480px) {
          .role-card {
            min-width: 100px !important;
            padding: 10px 8px !important;
          }
          .role-card span {
            font-size: 10px !important;
          }
        }
      `}</style>
    </div>
  );
};

export default Register;
