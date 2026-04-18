import React from 'react';
import { NavLink } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { COLORS } from '../../config';
import logo from "../../assets/bomasecure.png";
import adsIcon from "../../assets/ads.png";
import {
  Home,
  Users,
  Package,
  FileText,
  Settings,
  Building,
  ClipboardList,
  UserCheck,
  QrCode,
  Activity,
  CreditCard,
  AlertTriangle,
  Megaphone,
  BarChart3,
  HelpingHand,
  Shield,
  Wrench,
  Search,
  DollarSign,
  Bell,
  Lock,
  Server,
  Clock
} from 'lucide-react';

const menuItems = {
  tenant: [
    { path: '/tenant', icon: Home, label: 'Dashboard' },
    { path: '/tenant/visitors', icon: Users, label: 'Visitors' },
    { path: '/tenant/visitors/new', icon: UserCheck, label: 'Pre-approve Visitor' },
    { path: '/tenant/deliveries', icon: Package, label: 'Deliveries' },
    { path: '/tenant/history', icon: FileText, label: 'History' },
    { path: '/tenant/emergency', icon: AlertTriangle, label: 'Emergency' },
    { path: '/tenant/complaints', icon: HelpingHand, label: 'Group Complaints' },
    { path: '/tenant/maintenance', icon: Wrench, label: 'Maintenance' },
    { path: '/tenant/maintenance-team', icon: Wrench, label: 'Maintenance Team' },
    { path: '/tenant/directory', icon: Search, label: 'Directory' },
    { path: '/tenant/rent', icon: DollarSign, label: 'Rent Payment' },
    { path: '/tenant/notifications', icon: Activity, label: 'Notifications' },
    { path: '/tenant/profile', icon: Settings, label: 'Profile' }
  ],
  guard: [
    { path: '/guard', icon: Home, label: 'Dashboard' },
    { path: '/guard/checkin', icon: UserCheck, label: 'Check-In' },
    { path: '/guard/qr', icon: QrCode, label: 'QR Scanner' },
    { path: '/guard/visitors', icon: Users, label: 'Pre-approved Visitors' },
    { path: '/guard/deliveries', icon: Package, label: 'Pre-approved Deliveries' },
    { path: '/guard/logs', icon: ClipboardList, label: 'Access Logs' },
    { path: '/guard/register', icon: Shield, label: 'Register Visitor' },
    { path: '/guard/emergency', icon: AlertTriangle, label: 'Emergency' },
    { path: '/guard/staff', icon: Users, label: 'Staff' },
    { path: '/guard/maintenance', icon: Wrench, label: 'Maintenance' },
    { path: '/guard/maintenance-team', icon: Wrench, label: 'Maintenance Team' },
    { path: '/guard/directory', icon: Search, label: 'Directory' },
    { path: '/guard/notifications', icon: Activity, label: 'Notifications' },
    { path: '/guard/profile', icon: Settings, label: 'Profile' }
  ],
  maintenance: [
    { path: '/maintenance', icon: Home, label: 'Dashboard' },
    { path: '/maintenance/requests', icon: Wrench, label: 'Requests' },
    { path: '/maintenance/directory', icon: Search, label: 'Directory' },
    { path: '/maintenance/notifications', icon: Activity, label: 'Notifications' },
    { path: '/maintenance/profile', icon: Settings, label: 'Profile' }
  ],
  admin: [
    { path: '/admin', icon: Home, label: 'Dashboard' },
    { path: '/admin/users', icon: Users, label: 'Users' },
    { path: '/admin/apartments', icon: Building, label: 'Buildings' },
    { path: '/admin/logs', icon: Activity, label: 'Access Logs' },
    { path: '/admin/reports', icon: BarChart3, label: 'Reports' },
    { path: '/admin/emergency', icon: AlertTriangle, label: 'Emergency' },
    { path: '/admin/maintenance', icon: Wrench, label: 'Maintenance' },
    { path: '/admin/maintenance-team', icon: Wrench, label: 'Maintenance Team' },
    { path: '/admin/directory', icon: Search, label: 'Directory' },
    { path: '/admin/announcements', icon: Megaphone, label: 'Announcements' },
    { path: '/admin/promotions', icon: adsIcon, label: 'Promotions' },
    { path: '/admin/complaints', icon: HelpingHand, label: 'Group Complaints' },
    { path: '/admin/notifications', icon: Activity, label: 'Notifications' },
    { path: '/admin/payment', icon: CreditCard, label: 'Payment' },
    { path: '/admin/tenants-finance', icon: DollarSign, label: 'Tenant Payments' },
    { path: '/admin/settings', icon: Settings, label: 'Settings' }
  ],
  superadmin: [
    { path: '/superadmin', icon: Home, label: 'Dashboard' },
    { path: '/superadmin/users', icon: Users, label: 'All Users' },
    { path: '/superadmin/buildings', icon: Building, label: 'Buildings' },
    { path: '/superadmin/audit', icon: Clock, label: 'Audit Logs' },
    { path: '/superadmin/security', icon: Lock, label: 'Security' },
    { path: '/superadmin/servers', icon: Server, label: 'Servers' },
    { path: '/superadmin/settings', icon: Settings, label: 'Settings' }
  ]
};

const Sidebar = ({ isOpen, onClose }) => {
  const { user, isTenant, isGuard, isAdmin, isMaintenance, isSuperAdmin } = useAuth();
  const { unreadCount } = useNotifications();

  const getMenuItems = () => {
    if (isSuperAdmin) return menuItems.superadmin;
    if (isMaintenance) return menuItems.maintenance;
    if (isAdmin) return menuItems.admin;
    if (isGuard) return menuItems.guard;
    if (isTenant) return menuItems.tenant;
    return [];
  };

  const items = getMenuItems();

  const renderNavIcon = (item) => {
    const isNotifications = item.label.toLowerCase().includes('notification');
    if (isNotifications && unreadCount > 0) {
      return (
        <div style={{ position: 'relative' }}>
          <Bell size={20} color="#94A3B8" />
          <span style={{
            position: 'absolute',
            top: '-6px',
            right: '-8px',
            background: '#EF4444',
            borderRadius: '10px',
            minWidth: '18px',
            height: '18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 4px',
            fontSize: '10px',
            fontWeight: 600,
            color: '#FFFFFF'
          }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        </div>
      );
    }
    return typeof item.icon === 'string' && item.icon.endsWith('.png') ? (
      <img src={item.icon} alt={item.label} style={{ width: 20, height: 20, objectFit: 'contain' }} />
    ) : (
      <item.icon size={20} color="#94A3B8" />
    );
  };

  const renderActiveIcon = (item) => {
    const isNotifications = item.label.toLowerCase().includes('notification');
    if (isNotifications && unreadCount > 0) {
      return (
        <div style={{ position: 'relative' }}>
          <Bell size={20} color="#FFFFFF" />
          <span style={{
            position: 'absolute',
            top: '-6px',
            right: '-8px',
            background: '#EF4444',
            borderRadius: '10px',
            minWidth: '18px',
            height: '18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 4px',
            fontSize: '10px',
            fontWeight: 600,
            color: '#FFFFFF'
          }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        </div>
      );
    }
    return typeof item.icon === 'string' && item.icon.endsWith('.png') ? (
      <img src={item.icon} alt={item.label} style={{ width: 20, height: 20, objectFit: 'contain' }} />
    ) : (
      <item.icon size={20} color="#FFFFFF" />
    );
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: COLORS.dark,
                zIndex: 999
              }}
            />
            
            {/* Sidebar */}
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                bottom: 0,
                width: '260px',
                background: '#1E293B',
                boxShadow: '2px 0 10px rgba(0,0,0,0.3)',
                zIndex: 1001,
                overflowY: 'auto'
              }}
              className="sidebar"
            >
            {/* Logo */}
            <div style={{
              padding: '20px',
              borderBottom: `1px solid #334155`
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                <img 
                  src={logo} 
                  alt="BomaSecure Logo" 
                  style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '12px',
                    objectFit: 'contain'
                  }}
                />
                <div>
                  <h2 style={{
                    margin: 0,
                    fontSize: '22px',
                    fontWeight: 700,
                    color: '#F1F5F9',
                    fontFamily: 'Poppins, sans-serif'
                  }}>
                    BomaSecure
                  </h2>
                  <span style={{
                    fontSize: '12px',
                    color: '#94A3B8',
                    textTransform: 'capitalize'
                  }}>
                    {user?.role} Portal
                  </span>
                </div>
              </div>
            </div>

            {/* Navigation */}
            <nav style={{ padding: '16px 12px' }}>
              {items.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={onClose}
                  style={({ isActive }) => ({
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px 16px',
                    borderRadius: '10px',
                    textDecoration: 'none',
                    marginBottom: '4px',
                    background: isActive ? '#3B82F6' : 'transparent',
                    color: isActive ? '#FFFFFF' : '#CBD5E1',
                    fontWeight: isActive ? 600 : 500,
                    transition: 'all 0.2s ease'
                  })}
                >
                  {({ isActive }) => (
                    <>
                      {isActive ? renderActiveIcon(item) : renderNavIcon(item)}
                      <span style={{
                        fontSize: '14px',
                        color: isActive ? '#FFFFFF' : '#CBD5E1'
                      }}>
                        {item.label}
                      </span>
                    </>
                  )}
                </NavLink>
              ))}
            </nav>

            {/* Apartment Info */}
            {user?.apartmentId && (
              <div style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                padding: '16px',
                borderTop: `1px solid #334155`,
                background: '#0F172A'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: '#94A3B8'
                }}>
                  <Building size={16} />
                  <span style={{ fontSize: '12px' }}>
                    {user.apartmentId?.buildingName || 'Apartment'}
                  </span>
                </div>
                {user.roomNumber && (
                  <div style={{
                    fontSize: '12px',
                    color: '#64748B',
                    marginTop: '4px',
                    paddingLeft: '24px'
                  }}>
                    Room: {user.roomNumber}
                  </div>
                )}
              </div>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
    <style>{`
      @media (max-width: 768px) {
        .sidebar {
          width: 280px !important;
        }
      }
      @media (max-width: 480px) {
        .sidebar {
          width: 85vw !important;
          max-width: 300px;
        }
      }
    `}</style>
    </>
  );
};

export default Sidebar;
