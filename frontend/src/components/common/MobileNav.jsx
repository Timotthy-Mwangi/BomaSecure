import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { 
  Home, 
  Users, 
  Package, 
  Settings, 
  Building, 
  ClipboardList, 
  UserCheck, 
  QrCode,
  Bell,
  LogOut,
  AlertTriangle,
  CreditCard,
  BarChart3,
  Megaphone,
  Shield,
  HelpingHand,
  Activity,
  FileText,
  Wrench,
  Search,
  DollarSign,
  Lock,
  Server,
  Clock
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import adsIcon from '../../assets/ads.png';

const menuItems = {
  tenant: [
    { path: '/tenant', icon: Home, label: 'Home' },
    { path: '/tenant/visitors', icon: Users, label: 'Visitors' },
    { path: '/tenant/visitors/new', icon: UserCheck, label: 'Pre-approve' },
    { path: '/tenant/deliveries', icon: Package, label: 'Packages' },
    { path: '/tenant/history', icon: FileText, label: 'History' },
    { path: '/tenant/emergency', icon: AlertTriangle, label: 'Emergency' },
    { path: '/tenant/complaints', icon: HelpingHand, label: 'Complaints' },
    { path: '/tenant/rent', icon: CreditCard, label: 'Rent' },
    { path: '/tenant/maintenance', icon: Wrench, label: 'Maint' },
    { path: '/tenant/maintenance-team', icon: Users, label: 'Team' },
    { path: '/tenant/directory', icon: Search, label: 'Directory' },
    { path: '/tenant/notifications', icon: Bell, label: 'Alerts' },
    { path: '/tenant/profile', icon: Settings, label: 'Profile' }
  ],
  guard: [
    { path: '/guard', icon: Home, label: 'Home' },
    { path: '/guard/checkin', icon: UserCheck, label: 'Check-In' },
    { path: '/guard/qr', icon: QrCode, label: 'QR' },
    { path: '/guard/visitors', icon: Users, label: 'Visitors' },
    { path: '/guard/deliveries', icon: Package, label: 'Packages' },
    { path: '/guard/logs', icon: ClipboardList, label: 'Logs' },
    { path: '/guard/register', icon: Shield, label: 'Register' },
    { path: '/guard/emergency', icon: AlertTriangle, label: 'Emergency' },
    { path: '/guard/maintenance', icon: Wrench, label: 'Portal' },
    { path: '/guard/maintenance-team', icon: Users, label: 'Team' },
    { path: '/guard/directory', icon: Search, label: 'Directory' },
    { path: '/guard/notifications', icon: Bell, label: 'Alerts' },
    { path: '/guard/profile', icon: Settings, label: 'Profile' }
  ],
  admin: [
    { path: '/admin', icon: Home, label: 'Home' },
    { path: '/admin/users', icon: Users, label: 'Users' },
    { path: '/admin/apartments', icon: Building, label: 'Properties' },
    { path: '/admin/logs', icon: Activity, label: 'Logs' },
    { path: '/admin/reports', icon: BarChart3, label: 'Reports' },
    { path: '/admin/emergency', icon: AlertTriangle, label: 'Emergency' },
    { path: '/admin/maintenance', icon: Wrench, label: 'Portal' },
    { path: '/admin/maintenance-team', icon: Users, label: 'Team' },
    { path: '/admin/directory', icon: Search, label: 'Directory' },
    { path: '/admin/announcements', icon: Megaphone, label: 'Announce' },
    { path: '/admin/promotions', icon: adsIcon, label: 'Promo' },
    { path: '/admin/complaints', icon: HelpingHand, label: 'Complaints' },
    { path: '/admin/payment', icon: CreditCard, label: 'Payment' },
    { path: '/admin/tenants-finance', icon: DollarSign, label: 'Tenant Pay' },
    { path: '/admin/notifications', icon: Bell, label: 'Alerts' },
    { path: '/admin/settings', icon: Settings, label: 'Settings' }
  ],
  maintenance: [
    { path: '/maintenance', icon: Home, label: 'Dashboard' },
    { path: '/maintenance/requests', icon: ClipboardList, label: 'Requests' },
    { path: '/maintenance/directory', icon: Users, label: 'Directory' },
    { path: '/maintenance/notifications', icon: Bell, label: 'Alerts' },
    { path: '/maintenance/profile', icon: Settings, label: 'Profile' }
  ],
  superadmin: [
    { path: '/superadmin', icon: Home, label: 'Dashboard' },
    { path: '/superadmin/users', icon: Users, label: 'All Users' },
    { path: '/superadmin/buildings', icon: Building, label: 'Buildings' },
    { path: '/superadmin/audit', icon: Clock, label: 'Audit Logs' },
    { path: '/superadmin/security', icon: Lock, label: 'Security' },
    { path: '/superadmin/servers', icon: Server, label: 'Servers' },
    { path: '/superadmin/settings', icon: Settings, label: 'Settings' },
    { path: '/superadmin/profile', icon: Settings, label: 'Profile' }
  ]
};

const MobileNav = () => {
  const { isTenant, isGuard, isAdmin, isMaintenance, isSuperAdmin, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const getMenuItems = () => {
    if (isSuperAdmin) return menuItems.superadmin;
    if (isAdmin) return menuItems.admin;
    if (isGuard) return menuItems.guard;
    if (isMaintenance) return menuItems.maintenance;
    if (isTenant) return menuItems.tenant;
    return [];
  };

  const items = getMenuItems();

  const renderNavIcon = (item, isActive) => {
    const isNotifications = item.label.toLowerCase().includes('alert') || item.path.includes('notification');
    if (isNotifications && unreadCount > 0) {
      return (
        <div style={{ position: 'relative' }}>
          <Bell size={20} color={isActive ? '#FFFFFF' : '#94A3B8'} />
          <span style={{
            position: 'absolute',
            top: '-6px',
            right: '-8px',
            background: '#EF4444',
            borderRadius: '10px',
            minWidth: '16px',
            height: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 3px',
            fontSize: '9px',
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
      <item.icon size={20} color={isActive ? '#FFFFFF' : '#94A3B8'} />
    );
  };

  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      height: '70px',
      background: '#1E293B',
      borderTop: '2px solid #3B82F6',
      display: 'flex',
      alignItems: 'center',
      padding: '0 4px',
      zIndex: 1000,
      boxShadow: '0 -4px 20px rgba(0,0,0,0.4)',
      overflowX: 'auto',
      overflowY: 'hidden',
      WebkitOverflowScrolling: 'touch',
      scrollbarWidth: 'none',
      msOverflowStyle: 'none'
    }}>
      <style>{`
        .mobile-nav::-webkit-scrollbar {
          display: none;
        }
      `}</style>
      <div className="mobile-nav" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-start',
        gap: '2px',
        padding: '0 4px',
        minWidth: 'min-content'
      }}>
        {items.map((item) => {
          const isActive = location.pathname === item.path || 
            (item.path !== '/tenant' && item.path !== '/guard' && item.path !== '/admin' && location.pathname.startsWith(item.path));
          
          return (
            <NavLink
              key={item.path}
              to={item.path}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '6px 10px',
                textDecoration: 'none',
                borderRadius: '10px',
                background: isActive ? '#3B82F6' : 'transparent',
                transition: 'all 0.2s ease',
                minWidth: '54px',
                flexShrink: 0
              }}
            >
              {renderNavIcon(item, isActive)}
              <span style={{
                fontSize: '10px',
                fontWeight: isActive ? 700 : 500,
                color: isActive ? '#FFFFFF' : '#94A3B8',
                marginTop: '3px',
                whiteSpace: 'nowrap'
              }}>
                {item.label}
              </span>
            </NavLink>
          );
        })}
        {/* Logout Button */}
        <button
          onClick={handleLogout}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '6px 10px',
            textDecoration: 'none',
            borderRadius: '10px',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            minWidth: '54px',
            flexShrink: 0
          }}
        >
          <LogOut 
            size={20} 
            color='#EF4444'
          />
          <span style={{
            fontSize: '10px',
            fontWeight: 600,
            color: '#EF4444',
            marginTop: '3px',
            whiteSpace: 'nowrap'
          }}>
            Logout
          </span>
        </button>
      </div>
    </div>
  );
};

export default MobileNav;
