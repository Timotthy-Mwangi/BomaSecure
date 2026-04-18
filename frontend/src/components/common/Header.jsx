import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { APP_NAME, COLORS } from '../../config';
import { Menu, Bell, LogOut, Home } from 'lucide-react';
import logo from "../../assets/bomasecure.png";

const Header = ({ toggleSidebar, showMenu = true, sidebarOpen = false }) => {
  const { user, logout, isTenant, isGuard, isAdmin, isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Get notification path based on role
  const getNotificationPath = () => {
    if (isSuperAdmin) return '/superadmin/notifications';
    if (isAdmin) return '/admin/notifications';
    if (isGuard) return '/guard/notifications';
    if (isTenant) return '/tenant/notifications';
    return '/notifications';
  };

  // Get profile path based on role
  const getProfilePath = () => {
    if (isSuperAdmin) return '/superadmin/profile';
    if (isAdmin) return '/admin/profile';
    if (isGuard) return '/guard/profile';
    if (isTenant) return '/tenant/profile';
    return '/profile';
  };

  return (
    <header style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      height: '64px',
      background: '#1E293B',
      boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 20px',
      zIndex: 1000
    }} className="header">
      {/* Left Section */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }} className="header-left">
        {showMenu && !isMobile && (
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={toggleSidebar}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '8px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            aria-label="Toggle menu"
          >
            <Menu size={24} color="#F1F5F9" />
          </motion.button>
        )}
        
        <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '10px' }} className="header-logo">
          {(!sidebarOpen) && (
            <>
              <img 
                src={logo} 
                alt="BomaSecure Logo" 
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '10px',
                  objectFit: 'contain'
                }}
              />
              <span style={{
                fontFamily: 'Poppins, sans-serif',
                fontWeight: 700,
                fontSize: '20px',
                color: '#F1F5F9'
              }} className="header-title">
                {APP_NAME}
              </span>
            </>
          )}
        </Link>
      </div>

      {/* Right Section */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }} className="header-right">
        <Link to="/" className="header-home-btn">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            style={{
              background: '#334155',
              border: 'none',
              padding: '8px 12px',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              color: '#CBD5E1'
            }}
          >
            <Home size={18} />
            <span style={{ fontSize: '14px' }} className="header-home-text">Home</span>
          </motion.button>
        </Link>

        <Link to={getNotificationPath()} className="header-notif-btn">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            style={{
              background: 'none',
              border: 'none',
              padding: '8px',
              cursor: 'pointer',
              position: 'relative'
            }}
            aria-label="Notifications"
          >
            <Bell size={24} color="#94A3B8" />
          </motion.button>
        </Link>

        <div style={{
          width: '1px',
          height: '32px',
          background: '#334155'
        }} className="header-divider" />

        <Link to={getProfilePath()} style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }} className="header-profile">
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            background: COLORS.primary,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: COLORS.white,
            fontWeight: 600
          }}>
            {user?.name?.charAt(0).toUpperCase() || 'U'}
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column' }} className="header-user-info">
            <span style={{
              fontSize: '14px',
              fontWeight: 600,
              color: '#F1F5F9',
              lineHeight: 1.2
            }}>
              {user?.name || 'User'}
            </span>
            <span style={{
              fontSize: '12px',
              color: '#94A3B8',
              textTransform: 'capitalize'
            }}>
              {user?.role || 'Guest'}
            </span>
          </div>
        </Link>

        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={handleLogout}
          style={{
            background: 'none',
            border: 'none',
            padding: '8px',
            cursor: 'pointer',
            marginLeft: '8px'
          }}
          title="Logout"
          aria-label="Logout"
        >
          <LogOut size={20} color={COLORS.accent} />
        </motion.button>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .header-title {
            display: none !important;
          }
          .header-home-text {
            display: none !important;
          }
          .header-divider {
            display: none !important;
          }
          .header-user-info {
            display: none !important;
          }
          .header-home-btn {
            display: none !important;
          }
        }
        @media (max-width: 480px) {
          .header-logo {
            gap: 6px !important;
          }
        }
      `}</style>
    </header>
  );
};

export default Header;
