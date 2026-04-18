import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { APP_NAME, APP_TAGLINE, COLORS, ROLE_COLORS } from '../../config';
import { Phone, Lock, Eye, EyeOff, AlertCircle, Home, Shield, Settings, Mail, Wrench } from 'lucide-react';
import logo from "../../assets/bomasecure.png";

const Login = () => {
  const navigate = useNavigate();
  const { login, loading, error } = useAuth();
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState('');
  const [selectedRole, setSelectedRole] = useState('tenant');
  const [loginMethod, setLoginMethod] = useState('phone');
  
  const roleConfig = ROLE_COLORS[selectedRole];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');

    if (loginMethod === 'phone' && !phone) {
      setLocalError('Please enter your phone number');
      return;
    }
    if (loginMethod === 'email' && !email) {
      setLocalError('Please enter your email address');
      return;
    }
    if (!password) {
      setLocalError('Please enter your password');
      return;
    }

    const identifier = loginMethod === 'email' ? email : phone;
    const result = await login(identifier, password);
    if (result.success) {
      const userRole = result.user.role;
      if (userRole === 'superadmin' || result.user.isSuperAdmin) {
        navigate('/superadmin');
        return;
      }
      const redirectPath = result.user.role === 'tenant' ? '/tenant' :
                         result.user.role === 'guard' ? '/guard' :
                         result.user.role === 'maintenance' ? '/maintenance' :
                         result.user.role === 'admin' ? '/admin' : '/';
      navigate(redirectPath);
    }
  };

  const roles = [
    { id: 'tenant', name: 'Resident', icon: Home, description: 'Access your home' },
    { id: 'guard', name: 'Security', icon: Shield, description: 'Guard portal' },
    { id: 'maintenance', name: 'Maintenance', icon: Wrench, description: 'Staff dashboard' },
    { id: 'admin', name: 'Property Manager', icon: Settings, description: 'Manage properties' }
  ];

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      background: `linear-gradient(135deg, ${COLORS.gray[50]} 0%, ${COLORS.white} 100%)`
    }}>
      {/* Left Side - Branding */}
      <div className="login-branding" style={{
        flex: 1,
        background: roleConfig.gradient,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute',
          top: '-100px',
          right: '-100px',
          width: '400px',
          height: '400px',
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.1)'
        }} />
        <div style={{
          position: 'absolute',
          bottom: '-50px',
          left: '-50px',
          width: '200px',
          height: '200px',
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.05)'
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

          <div style={{
            marginTop: '48px',
            display: 'flex',
            gap: '24px',
            flexWrap: 'wrap',
            justifyContent: 'center'
          }}>
            {[
              { label: 'Tenant Access', icon: '🏠' },
              { label: 'Guard Portal', icon: '🛡️' },
              { label: 'Admin Control', icon: '⚙️' }
            ].map((item, index) => (
              <motion.div
                key={item.label}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 + index * 0.1 }}
                style={{
                  background: 'rgba(255,255,255,0.15)',
                  backdropFilter: 'blur(10px)',
                  padding: '16px 24px',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}
              >
                <span style={{ fontSize: '24px' }}>{item.icon}</span>
                <span style={{ fontSize: '14px', fontWeight: 500 }}>{item.label}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Right Side - Login Form */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px'
      }}>
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
            Welcome to BomaSecure
          </h2>
          <p style={{
            fontSize: '16px',
            color: COLORS.gray[500],
            margin: '0 0 24px'
          }}>
            Sign in to access your community portal
          </p>

          {/* Role Selection */}
          <div style={{ marginBottom: '24px' }}>
            <span style={{ fontSize: '14px', fontWeight: 600, color: COLORS.dark, display: 'block', marginBottom: '12px' }}>
              I am a...
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
              {roles.map((role) => (
                <motion.button
                  key={role.id}
                  type="button"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setSelectedRole(role.id)}
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

          {/* Error Message */}
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
            {/* Login Method Toggle */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ 
                display: 'flex', 
                gap: '8px', 
                background: COLORS.gray[100], 
                padding: '4px', 
                borderRadius: '10px' 
              }}>
                <button
                  type="button"
                  onClick={() => setLoginMethod('phone')}
                  style={{
                    flex: 1,
                    padding: '10px',
                    border: 'none',
                    borderRadius: '8px',
                    background: loginMethod === 'phone' ? COLORS.white : 'transparent',
                    color: loginMethod === 'phone' ? COLORS.primary : COLORS.gray[600],
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    fontSize: '14px',
                    boxShadow: loginMethod === 'phone' ? '0 2px 4px rgba(0,0,0,0.1)' : 'none'
                  }}
                >
                  <Phone size={16} /> Phone
                </button>
                <button
                  type="button"
                  onClick={() => setLoginMethod('email')}
                  style={{
                    flex: 1,
                    padding: '10px',
                    border: 'none',
                    borderRadius: '8px',
                    background: loginMethod === 'email' ? COLORS.white : 'transparent',
                    color: loginMethod === 'email' ? COLORS.primary : COLORS.gray[600],
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    fontSize: '14px',
                    boxShadow: loginMethod === 'email' ? '0 2px 4px rgba(0,0,0,0.1)' : 'none'
                  }}
                >
                  <Mail size={16} /> Email
                </button>
              </div>
            </div>

            {/* Phone/Email Input */}
            {loginMethod === 'phone' ? (
              <div style={{ marginBottom: '20px' }}>
                <label htmlFor="login-phone" style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: COLORS.gray[700],
                  marginBottom: '8px'
                }}>
                  Phone Number
                </label>
                <div style={{
                  position: 'relative'
                }}>
                  <Phone size={20} style={{
                    position: 'absolute',
                    left: '16px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: COLORS.gray[400]
                  }} />
                  <input
                    id="login-phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Enter phone number"
                    autoComplete="tel"
                    aria-label="Phone number"
                    style={{
                      width: '100%',
                      padding: '14px 16px 14px 48px',
                      borderLeft: `2px solid ${COLORS.gray[200]}`,
                      borderRight: `2px solid ${COLORS.gray[200]}`,
                      borderTop: `2px solid ${COLORS.gray[200]}`,
                      borderBottom: `2px solid ${COLORS.gray[200]}`,
                      borderRadius: '12px',
                      fontSize: '16px',
                      outline: 'none',
                      transition: 'border-color 0.2s',
                      boxSizing: 'border-box',
                      background: COLORS.white,
                      color: COLORS.dark
                    }}
                    onFocus={(e) => { e.target.style.borderLeftColor = COLORS.primary; e.target.style.borderRightColor = COLORS.primary; e.target.style.borderTopColor = COLORS.primary; e.target.style.borderBottomColor = COLORS.primary }}
                    onBlur={(e) => { e.target.style.borderLeftColor = COLORS.gray[200]; e.target.style.borderRightColor = COLORS.gray[200]; e.target.style.borderTopColor = COLORS.gray[200]; e.target.style.borderBottomColor = COLORS.gray[200] }}
                  />
                </div>
              </div>
            ) : (
              <div style={{ marginBottom: '20px' }}>
                <label htmlFor="login-email" style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: COLORS.gray[700],
                  marginBottom: '8px'
                }}>
                  Email Address
                </label>
                <div style={{
                  position: 'relative'
                }}>
                  <Mail size={20} style={{
                    position: 'absolute',
                    left: '16px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: COLORS.gray[400]
                  }} />
                  <input
                    id="login-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter email address"
                    autoComplete="email"
                    aria-label="Email address"
                    style={{
                      width: '100%',
                      padding: '14px 16px 14px 48px',
                      borderLeft: `2px solid ${COLORS.gray[200]}`,
                      borderRight: `2px solid ${COLORS.gray[200]}`,
                      borderTop: `2px solid ${COLORS.gray[200]}`,
                      borderBottom: `2px solid ${COLORS.gray[200]}`,
                      borderRadius: '12px',
                      fontSize: '16px',
                      outline: 'none',
                      transition: 'border-color 0.2s',
                      boxSizing: 'border-box',
                      background: COLORS.white,
                      color: COLORS.dark
                    }}
                    onFocus={(e) => { e.target.style.borderLeftColor = COLORS.primary; e.target.style.borderRightColor = COLORS.primary; e.target.style.borderTopColor = COLORS.primary; e.target.style.borderBottomColor = COLORS.primary }}
                    onBlur={(e) => { e.target.style.borderLeftColor = COLORS.gray[200]; e.target.style.borderRightColor = COLORS.gray[200]; e.target.style.borderTopColor = COLORS.gray[200]; e.target.style.borderBottomColor = COLORS.gray[200] }}
                  />
                </div>
              </div>
            )}

            {/* Password Input */}
            <div style={{ marginBottom: '24px' }}>
              <label htmlFor="login-password" style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: 600,
                color: COLORS.gray[700],
                marginBottom: '8px'
              }}>
                Password
              </label>
              <div style={{
                position: 'relative'
              }}>
                <Lock size={20} style={{
                  position: 'absolute',
                  left: '16px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: COLORS.gray[400]
                }} />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  autoComplete="current-password"
                  aria-label="Password"
                  style={{
                    width: '100%',
                    padding: '14px 48px 14px 48px',
                    borderLeft: `2px solid ${COLORS.gray[200]}`,
                    borderRight: `2px solid ${COLORS.gray[200]}`,
                    borderTop: `2px solid ${COLORS.gray[200]}`,
                    borderBottom: `2px solid ${COLORS.gray[200]}`,
                    borderRadius: '12px',
                    fontSize: '16px',
                    outline: 'none',
                    transition: 'border-color 0.2s',
                    boxSizing: 'border-box',
                    background: COLORS.white,
                    color: COLORS.dark
                  }}
                  onFocus={(e) => { e.target.style.borderLeftColor = COLORS.primary; e.target.style.borderRightColor = COLORS.primary; e.target.style.borderTopColor = COLORS.primary; e.target.style.borderBottomColor = COLORS.primary }}
                  onBlur={(e) => { e.target.style.borderLeftColor = COLORS.gray[200]; e.target.style.borderRightColor = COLORS.gray[200]; e.target.style.borderTopColor = COLORS.gray[200]; e.target.style.borderBottomColor = COLORS.gray[200] }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '16px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: COLORS.gray[400]
                  }}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <motion.button
              type="submit"
              disabled={loading}
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
                transition: 'box-shadow 0.2s',
                boxShadow: `0 4px 12px ${roleConfig.primary}40`
              }}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </motion.button>
          </form>

          <p style={{
            marginTop: '24px',
            textAlign: 'center',
            fontSize: '14px',
            color: COLORS.gray[500],
            wordWrap: 'break-word',
            padding: '0 10px'
          }}>
            New landlord/property manager/maintenance?<br />
            <a href="/register" style={{ color: COLORS.primary, textDecoration: 'none', fontWeight: 500 }}>Register here</a>
          </p>
        </motion.div>
      </div>
      <style>{`
        @media (max-width: 768px) {
          .login-branding {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
};

export default Login;