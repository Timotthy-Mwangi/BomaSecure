import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { authAPI } from '../../services/api';
import socketService from '../../services/socket';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  Users, Building, Shield, RefreshCw, Search, X, 
  CheckCircle, XCircle, Settings, Activity, 
  Lock, BarChart3, Clock, Zap, Server, Trash2, PauseCircle,
  PlayCircle, Download, Wifi, WifiOff, ShieldCheck, ShieldAlert, AlertTriangle
} from 'lucide-react';

const POLL_INTERVAL = 30000;

const SuperAdminDashboard = ({ isMobile: propIsMobile }) => {
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);
  const isMobile = propIsMobile !== undefined ? propIsMobile : windowWidth <= 768;
  const location = useLocation();
  const navigate = useNavigate();
  
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  useEffect(() => {
    const path = location.pathname;
    if (path === '/superadmin' || path === '/superadmin/') {
      setActiveTab('dashboard');
    } else if (path.includes('/superadmin/users')) {
      setActiveTab('users');
    } else if (path.includes('/superadmin/buildings')) {
      setActiveTab('buildings');
    } else if (path.includes('/superadmin/audit')) {
      setActiveTab('audit');
    } else if (path.includes('/superadmin/security')) {
      setActiveTab('security');
    } else if (path.includes('/superadmin/servers')) {
      setActiveTab('servers');
    } else if (path.includes('/superadmin/settings')) {
      setActiveTab('settings');
    } else if (path.includes('/superadmin/profile')) {
      setActiveTab('profile');
    }
  }, [location.pathname]);
  
  const { user, logout, token } = useAuth();
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [servers, setServers] = useState([
    { id: 1, name: 'API Server', status: 'online', cpu: 45, memory: 62, uptime: '99.9%' },
    { id: 2, name: 'Database Primary', status: 'online', cpu: 38, memory: 55, uptime: '99.98%' },
    { id: 3, name: 'Database Replica', status: 'online', cpu: 22, memory: 41, uptime: '99.95%' },
    { id: 4, name: 'Socket Server', status: 'online', cpu: 15, memory: 28, uptime: '99.99%' },
    { id: 5, name: 'File Storage', status: 'online', cpu: 8, memory: 35, uptime: '100%' },
  ]);
  const [securityAlerts, setSecurityAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [error, setError] = useState(null);
  const [isOnline, setIsOnline] = useState(true);
  const [systemSettings, setSystemSettings] = useState(null);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [localSettings, setLocalSettings] = useState({
    systemName: 'BomaSecure',
    adminEmail: 'superadmin@bomasecure.com',
    maintenanceMode: false,
    sessionTimeout: 30,
    twoFactorEnabled: false,
    ipWhitelistEnabled: false
  });

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([
        fetchStats(),
        fetchUsers(),
        fetchBuildings(),
        fetchAuditLogs(),
        fetchSecurityAlerts(),
        fetchServers(),
        fetchSystemSettings()
      ]);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) return;
    
    socketService.connect(token);
    socketService.joinSuperAdmin();
    
    const handleUserCreated = (data) => {
      console.log('User created:', data);
      fetchUsers();
      fetchStats();
    };
    
    const handleUserUpdated = (data) => {
      console.log('User updated:', data);
      if (data.user?._id) {
        setUsers(prev => prev.map(u => u._id === data.user._id ? data.user : u));
      }
      fetchStats();
    };
    
    const handleUserDeleted = (data) => {
      console.log('User deleted:', data);
      fetchUsers();
      fetchStats();
    };
    
    const handleAccountDeactivated = (data) => {
      console.log('Account deactivated:', data);
      fetchUsers();
      fetchStats();
    };
    
    socketService.onUserCreated(handleUserCreated);
    socketService.onUserUpdated(handleUserUpdated);
    socketService.onUserDeleted(handleUserDeleted);
    socketService.onAccountDeactivated(handleAccountDeactivated);
    
    const handleConnect = () => setIsOnline(true);
    const handleDisconnect = () => setIsOnline(false);
    
    socketService.getSocket()?.on('connect', handleConnect);
    socketService.getSocket()?.on('disconnect', handleDisconnect);
    
    const pollInterval = setInterval(() => {
      if (socketService.isConnected()) {
        fetchData();
      }
    }, POLL_INTERVAL);
    
    return () => {
      clearInterval(pollInterval);
      socketService.removeAllListeners();
    };
  }, [token, fetchData]);

  // Real-time server polling - refresh every 10 seconds when on servers tab
  useEffect(() => {
    if (!token || activeTab !== 'servers') return;
    
    const serverPollInterval = setInterval(async () => {
      try {
        await fetchServers();
      } catch (err) {
        console.error('Error fetching servers:', err);
      }
    }, 10000);
    
    return () => clearInterval(serverPollInterval);
  }, [token, activeTab]);

  useEffect(() => {
    if (systemSettings) {
      setLocalSettings({
        systemName: systemSettings.systemName || 'BomaSecure',
        adminEmail: systemSettings.adminEmail || user?.email || 'superadmin@bomasecure.com',
        maintenanceMode: systemSettings.maintenanceMode || false,
        sessionTimeout: systemSettings.sessionTimeout || 30,
        twoFactorEnabled: systemSettings.twoFactorEnabled || false,
        ipWhitelistEnabled: systemSettings.ipWhitelistEnabled || false
      });
    }
  }, [systemSettings, user]);

  const fetchStats = async () => {
    try {
      const response = await authAPI.getSuperAdminStats();
      if (response.data?.data) {
        setStats(response.data.data);
      } else if (response.data) {
        setStats(response.data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await authAPI.getAllUsersSystemWide({ limit: 100 });
      let usersData = [];
      if (response.data?.users) {
        usersData = response.data.users;
      } else if (response.users) {
        usersData = response.users;
      } else if (Array.isArray(response.data)) {
        usersData = response.data;
      }
      setUsers(usersData);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchBuildings = async () => {
    try {
      const response = await authAPI.getAllBuildingsSystemWide({ limit: 50 });
      let buildingsData = [];
      if (response.data?.buildings) {
        buildingsData = response.data.buildings;
      } else if (response.buildings) {
        buildingsData = response.buildings;
      } else if (Array.isArray(response.data)) {
        buildingsData = response.data;
      }
      setBuildings(buildingsData);
    } catch (error) {
      console.error('Error fetching buildings:', error);
      setBuildings([]);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const response = await authAPI.getAuditLogs({ limit: 50 });
      if (response.data?.logs) {
        setAuditLogs(response.data.logs);
      } else if (response.data) {
        setAuditLogs(Array.isArray(response.data) ? response.data : []);
      }
    } catch (error) {
      console.error('Error fetching audit logs:', error);
    }
  };

  const fetchSecurityAlerts = async () => {
    try {
      const response = await authAPI.getSecurityAlerts({ limit: 20 });
      if (response.data?.alerts) {
        setSecurityAlerts(response.data.alerts);
      } else if (response.data) {
        setSecurityAlerts(Array.isArray(response.data) ? response.data : []);
      }
    } catch (error) {
      console.error('Error fetching security alerts:', error);
    }
  };

  const fetchServers = async () => {
    try {
      const response = await authAPI.getSystemServers({ limit: 20 });
      if (response.data?.servers) {
        setServers(response.data.servers);
      } else if (response.data && Array.isArray(response.data)) {
        setServers(response.data);
      }
    } catch (error) {
      console.error('Error fetching servers:', error);
    }
  };

  const fetchSystemSettings = async () => {
    try {
      const response = await authAPI.getSystemSettings();
      if (response.data?.success) {
        setSystemSettings(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching system settings:', error);
    }
  };

  const updateSystemSettings = async (newSettings) => {
    setSettingsLoading(true);
    try {
      const response = await authAPI.updateSystemSettings(newSettings);
      if (response.data?.success) {
        setSystemSettings(response.data.data);
        alert('Settings saved successfully');
      }
    } catch (error) {
      console.error('Error updating system settings:', error);
      alert('Failed to save settings');
    } finally {
      setSettingsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const handleSuspend = async (userId) => {
    if (!window.confirm('Are you sure you want to suspend this user?')) return;
    setActionLoading(true);
    try {
      await authAPI.suspendUser(userId, 'Suspended by superadmin');
      fetchUsers();
      setSelectedUser(null);
    } catch (error) {
      alert('Error suspending user');
    }
    setActionLoading(false);
  };

  const handleUnsuspend = async (userId) => {
    setActionLoading(true);
    try {
      await authAPI.unsuspendUser(userId);
      fetchUsers();
      setSelectedUser(null);
    } catch (error) {
      alert('Error reactivating user');
    }
    setActionLoading(false);
  };

  const handleDiscontinue = async (userId) => {
    if (!window.confirm('WARNING: This will permanently delete the user. Are you sure?')) return;
    setActionLoading(true);
    try {
      await authAPI.discontinueUser(userId, 'Discontinued by superadmin');
      fetchUsers();
      setSelectedUser(null);
    } catch (error) {
      alert('Error deleting user');
    }
    setActionLoading(false);
  };

  const filteredUsers = users.filter(u => 
    u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.phone?.includes(searchTerm)
  );

  const activeUsersCount = users.filter(u => u.isActive).length;
  const suspendedUsersCount = users.filter(u => !u.isActive).length;

  const getStatCards = () => [
    { label: 'Total Users', value: stats?.users?.total || users.length || 0, icon: Users, color: '#3B82F6', bgColor: '#EFF6FF' },
    { label: 'Tenants', value: stats?.users?.tenants || 0, icon: Users, color: '#10B981', bgColor: '#ECFDF5' },
    { label: 'Guards', value: stats?.users?.guards || 0, icon: Shield, color: '#8B5CF6', bgColor: '#F5F3FF' },
    { label: 'Admins', value: stats?.users?.admins || 0, icon: Building, color: '#F59E0B', bgColor: '#FFFBEB' },
    { label: 'Active', value: stats?.status?.active || activeUsersCount, icon: CheckCircle, color: '#22C55E', bgColor: '#F0FDF4' },
    { label: 'Suspended', value: stats?.status?.inactive || suspendedUsersCount, icon: XCircle, color: '#EF4444', bgColor: '#FEF2F2' },
  ];

  const statCards = getStatCards();

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3, path: '/superadmin' },
    { id: 'users', label: 'Users', icon: Users, path: '/superadmin/users' },
    { id: 'buildings', label: 'Buildings', icon: Building, path: '/superadmin/buildings' },
    { id: 'audit', label: 'Audit', icon: Clock, path: '/superadmin/audit' },
    { id: 'security', label: 'Security', icon: ShieldAlert, path: '/superadmin/security' },
    { id: 'servers', label: 'Servers', icon: Server, path: '/superadmin/servers' },
    { id: 'settings', label: 'Settings', icon: Settings, path: '/superadmin/settings' },
  ];

  const getResponsiveStyles = () => ({
    container: {
      padding: isMobile ? '12px' : '24px',
      maxWidth: isMobile ? '100%' : '1400px',
      margin: isMobile ? '0' : '0 auto',
    },
    header: {
      padding: isMobile ? '16px' : '24px',
      borderRadius: isMobile ? '12px' : '20px',
      flexDirection: isMobile ? 'column' : 'row',
      gap: isMobile ? '16px' : '0',
    },
    statCard: {
      padding: isMobile ? '14px' : '20px',
      borderRadius: isMobile ? '12px' : '16px',
    },
    statGrid: {
      gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: isMobile ? '12px' : '16px',
    },
    sectionGrid: {
      gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(350px, 1fr))',
    },
    title: isMobile ? '20px' : '28px',
    searchInput: {
      width: isMobile ? '100%' : '250px',
    },
    tabButton: {
      padding: isMobile ? '8px 12px' : '12px 20px',
      fontSize: isMobile ? '11px' : '14px',
    },
    actionButtons: {
      flexDirection: isMobile ? 'row' : 'row',
      width: isMobile ? '100%' : 'auto',
      justifyContent: isMobile ? 'space-between' : 'flex-end',
    },
    modal: {
      maxWidth: isMobile ? '100%' : '480px',
      borderRadius: isMobile ? '16px' : '20px',
    },
    tabsContainer: {
      display: 'flex',
      gap: isMobile ? '6px' : '8px',
      marginBottom: isMobile ? '16px' : '24px',
      padding: isMobile ? '6px' : '8px',
      background: '#1E293B',
      borderRadius: isMobile ? '10px' : '12px',
      width: '100%',
      overflowX: 'auto',
      flexWrap: isMobile ? 'nowrap' : 'wrap',
    }
  });

  const styles = getResponsiveStyles();

  const renderDashboard = () => (
    <div style={{ display: 'grid', gap: '24px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: styles.statGrid.gridTemplateColumns, gap: styles.statGrid.gap }}>
        {statCards.map((stat, index) => (
          <div key={index} style={{ 
            background: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)', 
            padding: styles.statCard.padding, 
            borderRadius: styles.statCard.borderRadius, 
            border: '1px solid #334155',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{ position: 'absolute', top: '-10px', right: '-10px', width: '60px', height: '60px', borderRadius: '50%', background: stat.bgColor, opacity: 0.3 }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <div style={{ padding: '10px', borderRadius: '10px', background: stat.bgColor }}>
                <stat.icon size={20} color={stat.color} />
              </div>
            </div>
            <p style={{ color: '#94A3B8', fontSize: '13px', margin: '0 0 4px 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{stat.label}</p>
            <p style={{ fontSize: '28px', fontWeight: 'bold', margin: 0, color: 'white' }}>{stat.value}</p>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: styles.sectionGrid.gridTemplateColumns, gap: '16px' }}>
        <div style={{ 
          background: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)', 
          padding: '24px', 
          borderRadius: '16px', 
          border: '1px solid #334155' 
        }}>
          <h3 style={{ color: 'white', fontSize: '16px', fontWeight: '600', margin: '0 0 20px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={18} color="#3B82F6" /> System Overview
          </h3>
          <div style={{ display: 'grid', gap: '16px' }}>
            {[
              { label: 'Total Buildings', value: stats?.apartments || buildings.length || 0, change: buildings.length > 0 ? '+' + buildings.length : '0', up: true },
              { label: 'Total Units', value: buildings.reduce((acc, b) => acc + (b.totalUnits || 0), 0), change: '+0', up: true },
              { label: 'Verified Users', value: stats?.verification?.verified || users.filter(u => u.isVerified).length, change: '+0', up: true },
              { label: 'Pending Verification', value: stats?.verification?.unverified || users.filter(u => !u.isVerified).length, change: '-0', up: false },
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: '#0F172A', borderRadius: '10px' }}>
                <span style={{ color: '#94A3B8', fontSize: '14px' }}>{item.label}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: 'white', fontWeight: '600', fontSize: '16px' }}>{item.value}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ 
          background: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)', 
          padding: '24px', 
          borderRadius: '16px', 
          border: '1px solid #334155' 
        }}>
          <h3 style={{ color: 'white', fontSize: '16px', fontWeight: '600', margin: '0 0 20px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Server size={18} color="#8B5CF6" /> Buildings Summary
          </h3>
          <div style={{ display: 'grid', gap: '12px', maxHeight: '240px', overflowY: 'auto' }}>
            {buildings.length === 0 ? (
              <p style={{ color: '#64748B', textAlign: 'center', padding: '20px' }}>No buildings found</p>
            ) : (
              buildings.slice(0, 5).map((building, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: '#0F172A', borderRadius: '10px' }}>
                  <div>
                    <span style={{ color: 'white', fontSize: '14px' }}>{building.name}</span>
                    <p style={{ color: '#64748B', fontSize: '12px', margin: '2px 0 0 0' }}>{building.buildingCode}</p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ color: '#22C55E', fontSize: '14px', fontWeight: '600' }}>{building.occupancy || 0}%</span>
                    <span style={{ 
                      padding: '4px 10px', 
                      borderRadius: '20px', 
                      fontSize: '11px', 
                      fontWeight: '500',
                      background: (building.occupancy || 0) >= 80 ? '#22C55E20' : '#F59E0B20',
                      color: (building.occupancy || 0) >= 80 ? '#22C55E' : '#F59E0B'
                    }}>
                      {building.occupiedUnits || 0}/{building.totalUnits || 0}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderUsers = () => (
    <div style={{ 
      background: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)', 
      borderRadius: '16px', 
      border: '1px solid #334155',
      overflow: 'hidden'
    }}>
      <div style={{ padding: '20px', borderBottom: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <h3 style={{ color: 'white', fontSize: '18px', fontWeight: '600', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Users size={20} color="#3B82F6" /> System Users ({users.length})
        </h3>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748B' }} />
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ 
                padding: '10px 12px 10px 40px', 
                border: '1px solid #334155', 
                borderRadius: '8px', 
                width: styles.searchInput.width, 
                fontSize: '14px',
                background: '#0F172A',
                color: 'white'
              }}
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '60px', textAlign: 'center', color: '#64748B' }}>
          Loading users...
        </div>
      ) : users.length === 0 ? (
        <div style={{ padding: '60px', textAlign: 'center', color: '#64748B' }}>
          No users found
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#0F172A', borderBottom: '1px solid #334155' }}>
                <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#64748B', textTransform: 'uppercase' }}>USER</th>
                <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#64748B', textTransform: 'uppercase' }}>ROLE</th>
                <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#64748B', textTransform: 'uppercase' }}>STATUS</th>
                <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#64748B', textTransform: 'uppercase' }}>VERIFIED</th>
                <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#64748B', textTransform: 'uppercase' }}>CREATED</th>
                <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#64748B', textTransform: 'uppercase' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((u) => (
                <tr key={u._id} style={{ borderBottom: '1px solid #1E293B' }}>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ 
                        width: '40px', 
                        height: '40px', 
                        borderRadius: '10px', 
                        background: 'linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontWeight: '600',
                        fontSize: '14px'
                      }}>
                        {u.name?.charAt(0).toUpperCase() || 'U'}
                      </div>
                      <div>
                        <p style={{ color: 'white', fontSize: '14px', fontWeight: '500', margin: 0 }}>{u.name}</p>
                        <p style={{ color: '#64748B', fontSize: '12px', margin: '2px 0 0 0' }}>{u.email || u.phone || '-'}</p>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{ 
                      padding: '6px 12px', 
                      borderRadius: '20px', 
                      fontSize: '12px', 
                      fontWeight: '600',
                      background: u.role === 'admin' ? '#FEF3C7' : 
                                  u.role === 'superadmin' ? '#DBEAFE' : 
                                  u.role === 'guard' ? '#F5F3FF' : '#F0FDF4',
                      color: u.role === 'admin' ? '#92400E' : 
                             u.role === 'superadmin' ? '#1E40AF' : 
                             u.role === 'guard' ? '#6D28D9' : '#166534',
                      textTransform: 'capitalize'
                    }}>
                      {u.role}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    {u.isActive ? (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#22C55E', fontSize: '13px' }}>
                        <CheckCircle size={14} /> Active
                      </span>
                    ) : (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#EF4444', fontSize: '13px' }}>
                        <XCircle size={14} /> Suspended
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    {u.isVerified ? (
                      <span style={{ color: '#22C55E', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <CheckCircle size={14} /> Verified
                      </span>
                    ) : (
                      <span style={{ color: '#F59E0B', fontSize: '13px' }}>Pending</span>
                    )}
                  </td>
                  <td style={{ padding: '14px 16px', color: '#64748B', fontSize: '13px' }}>
                    {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '-'}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <button 
                      onClick={() => setSelectedUser(u)} 
                      style={{ 
                        padding: '8px 14px', 
                        background: '#3B82F6', 
                        color: 'white', 
                        border: 'none', 
                        borderRadius: '8px', 
                        fontSize: '13px', 
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <Settings size={14} /> Manage
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  const renderBuildings = () => (
    <div style={{ display: 'grid', gap: '16px' }}>
      {buildings.length === 0 ? (
        <div style={{ 
          background: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)', 
          padding: '40px', 
          borderRadius: '16px', 
          border: '1px solid #334155',
          textAlign: 'center'
        }}>
          <Building size={48} color="#334155" style={{ marginBottom: '16px' }} />
          <p style={{ color: '#64748B', fontSize: '16px' }}>No buildings found</p>
        </div>
      ) : (
        buildings.map((building, i) => (
          <div key={i} style={{ 
            background: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)', 
            padding: '24px', 
            borderRadius: '16px', 
            border: '1px solid #334155',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '20px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ 
                width: '50px', 
                height: '50px', 
                borderRadius: '12px', 
                background: 'linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Building size={24} color="white" />
              </div>
              <div>
                <h4 style={{ color: 'white', fontSize: '16px', fontWeight: '600', margin: 0 }}>{building.name}</h4>
                <p style={{ color: '#64748B', fontSize: '13px', margin: '4px 0 0 0' }}>{building.buildingCode} • {building.totalUnits || 0} Units</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '40px', alignItems: 'center' }}>
              <div style={{ textAlign: 'center' }}>
                <p style={{ color: '#64748B', fontSize: '12px', margin: '0 0 4px 0' }}>Occupancy</p>
                <p style={{ color: 'white', fontSize: '20px', fontWeight: '600', margin: 0 }}>{building.occupancy || 0}%</p>
              </div>
              <div style={{ textAlign: 'center' }}>
                <p style={{ color: '#64748B', fontSize: '12px', margin: '0 0 4px 0' }}>Tenants</p>
                <p style={{ color: 'white', fontSize: '20px', fontWeight: '600', margin: 0 }}>{building.tenants || 0}</p>
              </div>
              <span style={{ 
                padding: '6px 14px', 
                borderRadius: '20px', 
                fontSize: '12px', 
                fontWeight: '600',
                background: (building.occupancy || 0) >= 80 ? '#22C55E20' : '#3B82F620',
                color: (building.occupancy || 0) >= 80 ? '#22C55E' : '#3B82F6'
              }}>
                {(building.occupancy || 0) >= 80 ? 'Full' : 'Available'}
              </span>
            </div>
          </div>
        ))
      )}
    </div>
  );

  const renderAuditLogs = () => (
    <div style={{ 
      background: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)', 
      borderRadius: '16px', 
      border: '1px solid #334155',
      overflow: 'hidden'
    }}>
      <div style={{ padding: '20px', borderBottom: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <h3 style={{ color: 'white', fontSize: '18px', fontWeight: '600', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Clock size={20} color="#F59E0B" /> System Audit Logs
        </h3>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: '#334155', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', cursor: 'pointer' }}>
            <Download size={14} /> Export
          </button>
        </div>
      </div>
      <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
        {auditLogs.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#64748B' }}>
            <Clock size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
            <p>No audit logs available</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#0F172A', borderBottom: '1px solid #334155' }}>
                <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#64748B', textTransform: 'uppercase' }}>TIMESTAMP</th>
                <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#64748B', textTransform: 'uppercase' }}>ACTION</th>
                <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#64748B', textTransform: 'uppercase' }}>USER</th>
                <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#64748B', textTransform: 'uppercase' }}>DETAILS</th>
                <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#64748B', textTransform: 'uppercase' }}>IP ADDRESS</th>
              </tr>
            </thead>
            <tbody>
              {auditLogs.map((log, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #1E293B' }}>
                  <td style={{ padding: '14px 16px', color: '#94A3B8', fontSize: '13px' }}>
                    {log.timestamp ? new Date(log.timestamp).toLocaleString() : '-'}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{ 
                      padding: '4px 10px', 
                      borderRadius: '20px', 
                      fontSize: '12px', 
                      fontWeight: '600',
                      background: log.action?.includes('create') ? '#22C55E20' : 
                                  log.action?.includes('update') ? '#3B82F620' : 
                                  log.action?.includes('delete') ? '#EF444420' : '#F59E0B20',
                      color: log.action?.includes('create') ? '#22C55E' : 
                             log.action?.includes('update') ? '#3B82F6' : 
                             log.action?.includes('delete') ? '#EF4444' : '#F59E0B'
                    }}>
                      {log.action || 'N/A'}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px', color: '#FFFFFF', fontSize: '13px' }}>
                    {log.userName || log.userEmail || 'System'}
                  </td>
                  <td style={{ padding: '14px 16px', color: '#94A3B8', fontSize: '13px', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {log.details || '-'}
                  </td>
                  <td style={{ padding: '14px 16px', color: '#64748B', fontSize: '13px', fontFamily: 'monospace' }}>
                    {log.ipAddress || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );

  const renderSecurity = () => (
    <div style={{ display: 'grid', gap: '24px' }}>
      <div style={{ 
        background: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)', 
        padding: '24px', 
        borderRadius: '16px', 
        border: '1px solid #334155' 
      }}>
        <h3 style={{ color: 'white', fontSize: '18px', fontWeight: '600', margin: '0 0 20px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShieldAlert size={20} color="#EF4444" /> Security Alerts
        </h3>
        {securityAlerts.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748B' }}>
            <ShieldCheck size={48} style={{ marginBottom: '16px', color: '#22C55E', opacity: 0.5 }} />
            <p>No security alerts - System is secure</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '12px' }}>
            {securityAlerts.map((alert, i) => (
              <div key={i} style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '16px', 
                padding: '16px', 
                background: '#0F172A', 
                borderRadius: '12px',
                borderLeft: `4px solid ${alert.severity === 'high' ? '#EF4444' : alert.severity === 'medium' ? '#F59E0B' : '#22C55E'}`
              }}>
                <AlertTriangle size={20} color={alert.severity === 'high' ? '#EF4444' : alert.severity === 'medium' ? '#F59E0B' : '#22C55E'} />
                <div style={{ flex: 1 }}>
                  <p style={{ color: 'white', fontSize: '14px', fontWeight: '500', margin: '0 0 4px 0' }}>{alert.title || alert.message}</p>
                  <p style={{ color: '#64748B', fontSize: '12px', margin: 0 }}>{alert.timestamp ? new Date(alert.timestamp).toLocaleString() : 'Just now'}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ 
        background: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)', 
        padding: '24px', 
        borderRadius: '16px', 
        border: '1px solid #334155' 
      }}>
        <h3 style={{ color: 'white', fontSize: '18px', fontWeight: '600', margin: '0 0 20px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Lock size={20} color="#8B5CF6" /> Security Settings
        </h3>
        <div style={{ display: 'grid', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: '#0F172A', borderRadius: '10px' }}>
            <div>
              <p style={{ color: 'white', fontSize: '14px', fontWeight: '500', margin: '0' }}>Two-Factor Authentication</p>
              <p style={{ color: '#64748B', fontSize: '12px', margin: '4px 0 0 0' }}>Enforce 2FA for all admins</p>
            </div>
            <div style={{ width: '48px', height: '28px', borderRadius: '14px', background: '#22C55E', position: 'relative', cursor: 'pointer' }}>
              <div style={{ position: 'absolute', right: '4px', top: '4px', width: '20px', height: '20px', borderRadius: '50%', background: 'white' }} />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: '#0F172A', borderRadius: '10px' }}>
            <div>
              <p style={{ color: 'white', fontSize: '14px', fontWeight: '500', margin: '0' }}>Session Timeout</p>
              <p style={{ color: '#64748B', fontSize: '12px', margin: '4px 0 0 0' }}>Auto logout after inactivity</p>
            </div>
            <span style={{ padding: '6px 12px', background: '#3B82F620', color: '#3B82F6', borderRadius: '6px', fontSize: '13px', fontWeight: '500' }}>30 min</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: '#0F172A', borderRadius: '10px' }}>
            <div>
              <p style={{ color: 'white', fontSize: '14px', fontWeight: '500', margin: '0' }}>IP Whitelisting</p>
              <p style={{ color: '#64748B', fontSize: '12px', margin: '4px 0 0 0' }}>Restrict access by IP</p>
            </div>
            <div style={{ width: '48px', height: '28px', borderRadius: '14px', background: '#334155', position: 'relative', cursor: 'pointer' }}>
              <div style={{ position: 'absolute', left: '4px', top: '4px', width: '20px', height: '20px', borderRadius: '50%', background: '#94A3B8' }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderServers = () => (
    <div style={{ 
      background: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)', 
      borderRadius: '16px', 
      border: '1px solid #334155',
      overflow: 'hidden'
    }}>
      <div style={{ padding: '20px', borderBottom: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <h3 style={{ color: 'white', fontSize: '18px', fontWeight: '600', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Server size={20} color="#8B5CF6" /> System Servers
        </h3>
        <button 
          onClick={handleRefresh}
          disabled={refreshing}
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '6px', 
            padding: '8px 16px', 
            background: '#334155', 
            color: 'white', 
            border: 'none', 
            borderRadius: '8px', 
            fontSize: '13px', 
            cursor: 'pointer' 
          }}>
            <RefreshCw size={14} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
            Refresh
          </button>
      </div>
      <div style={{ padding: '20px', display: 'grid', gap: '16px' }}>
        {servers.map((server, i) => (
          <div key={i} style={{ 
            background: '#0F172A', 
            borderRadius: '12px', 
            padding: '20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ 
                width: '48px', 
                height: '48px', 
                borderRadius: '12px', 
                background: server.status === 'online' ? '#22C55E20' : '#EF444420',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {server.status === 'online' ? (
                  <Zap size={24} color="#22C55E" />
                ) : (
                  <AlertTriangle size={24} color="#EF4444" />
                )}
              </div>
              <div>
                <p style={{ color: 'white', fontSize: '16px', fontWeight: '600', margin: '0 0 4px 0' }}>{server.name}</p>
                <p style={{ color: '#64748B', fontSize: '13px', margin: 0 }}>{server.ip || 'Server ID: ' + server.id}</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
              <div style={{ textAlign: 'center' }}>
                <p style={{ color: '#64748B', fontSize: '11px', margin: '0 0 4px 0', textTransform: 'uppercase' }}>CPU</p>
                <p style={{ color: server.cpu > 80 ? '#EF4444' : server.cpu > 50 ? '#F59E0B' : '#22C55E', fontSize: '18px', fontWeight: '600', margin: 0 }}>
                  {server.cpu || 0}%
                </p>
              </div>
              <div style={{ textAlign: 'center' }}>
                <p style={{ color: '#64748B', fontSize: '11px', margin: '0 0 4px 0', textTransform: 'uppercase' }}>Memory</p>
                <p style={{ color: server.memory > 80 ? '#EF4444' : server.memory > 50 ? '#F59E0B' : '#22C55E', fontSize: '18px', fontWeight: '600', margin: 0 }}>
                  {server.memory || 0}%
                </p>
              </div>
              <div style={{ textAlign: 'center' }}>
                <p style={{ color: '#64748B', fontSize: '11px', margin: '0 0 4px 0', textTransform: 'uppercase' }}>Uptime</p>
                <p style={{ color: '#22C55E', fontSize: '18px', fontWeight: '600', margin: 0 }}>{server.uptime || '99.9%'}</p>
              </div>
              <span style={{ 
                padding: '6px 14px', 
                borderRadius: '20px', 
                fontSize: '12px', 
                fontWeight: '600',
                background: server.status === 'online' ? '#22C55E20' : '#EF444420',
                color: server.status === 'online' ? '#22C55E' : '#EF4444',
                textTransform: 'capitalize'
              }}>
                {server.status || 'online'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderSettings = () => {
    const handleToggle = (key) => {
      setLocalSettings(prev => ({
        ...prev,
        [key]: !prev[key]
      }));
    };

    const handleSave = () => {
      updateSystemSettings(localSettings);
    };

    return (
      <div style={{ display: 'grid', gap: '24px' }}>
        <div style={{ 
          background: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)', 
          padding: '24px', 
          borderRadius: '16px', 
          border: '1px solid #334155' 
        }}>
          <h3 style={{ color: 'white', fontSize: '18px', fontWeight: '600', margin: '0 0 20px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Settings size={20} color="#3B82F6" /> System Settings
          </h3>
          <div style={{ display: 'grid', gap: '16px' }}>
            <div style={{ padding: '16px', background: '#0F172A', borderRadius: '10px' }}>
              <p style={{ color: 'white', fontSize: '14px', fontWeight: '500', margin: '0 0 8px 0' }}>System Name</p>
              <input 
                type="text" 
                value={localSettings.systemName}
                onChange={(e) => setLocalSettings(prev => ({ ...prev, systemName: e.target.value }))}
                style={{ 
                  width: '100%', 
                  padding: '12px', 
                  background: '#1E293B', 
                  border: '1px solid #334155', 
                  borderRadius: '8px', 
                  color: 'white', 
                  fontSize: '14px' 
                }} 
              />
            </div>
            <div style={{ padding: '16px', background: '#0F172A', borderRadius: '10px' }}>
              <p style={{ color: 'white', fontSize: '14px', fontWeight: '500', margin: '0 0 8px 0' }}>Admin Email</p>
              <input 
                type="email" 
                value={localSettings.adminEmail}
                onChange={(e) => setLocalSettings(prev => ({ ...prev, adminEmail: e.target.value }))}
                style={{ 
                  width: '100%', 
                  padding: '12px', 
                  background: '#1E293B', 
                  border: '1px solid #334155', 
                  borderRadius: '8px', 
                  color: 'white', 
                  fontSize: '14px' 
                }} 
              />
            </div>
            <div style={{ padding: '16px', background: '#0F172A', borderRadius: '10px' }}>
              <p style={{ color: 'white', fontSize: '14px', fontWeight: '500', margin: '0 0 8px 0' }}>Maintenance Mode</p>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748B', fontSize: '13px' }}>Enable system-wide maintenance mode</span>
                <div 
                  onClick={() => handleToggle('maintenanceMode')}
                  style={{ 
                    width: '48px', 
                    height: '28px', 
                    borderRadius: '14px', 
                    background: localSettings.maintenanceMode ? '#22C55E' : '#334155', 
                    position: 'relative', 
                    cursor: 'pointer',
                    transition: 'background 0.2s'
                  }}>
                  <div style={{ 
                    position: 'absolute', 
                    left: localSettings.maintenanceMode ? '26px' : '4px', 
                    top: '4px', 
                    width: '20px', 
                    height: '20px', 
                    borderRadius: '50%', 
                    background: 'white',
                    transition: 'left 0.2s'
                  }} />
                </div>
              </div>
            </div>
            <div style={{ padding: '16px', background: '#0F172A', borderRadius: '10px' }}>
              <p style={{ color: 'white', fontSize: '14px', fontWeight: '500', margin: '0 0 8px 0' }}>Session Timeout</p>
              <select 
                value={localSettings.sessionTimeout}
                onChange={(e) => setLocalSettings(prev => ({ ...prev, sessionTimeout: parseInt(e.target.value) }))}
                style={{ 
                  width: '100%', 
                  padding: '12px', 
                  background: '#1E293B', 
                  border: '1px solid #334155', 
                  borderRadius: '8px', 
                  color: 'white', 
                  fontSize: '14px' 
                }}
              >
                <option value={15}>15 minutes</option>
                <option value={30}>30 minutes</option>
                <option value={60}>1 hour</option>
                <option value={120}>2 hours</option>
              </select>
            </div>
            <div style={{ padding: '16px', background: '#0F172A', borderRadius: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <p style={{ color: 'white', fontSize: '14px', fontWeight: '500', margin: 0 }}>Two-Factor Authentication</p>
                  <p style={{ color: '#64748B', fontSize: '12px', margin: '4px 0 0 0' }}>Enforce 2FA for all admins</p>
                </div>
                <div 
                  onClick={() => handleToggle('twoFactorEnabled')}
                  style={{ 
                    width: '48px', 
                    height: '28px', 
                    borderRadius: '14px', 
                    background: localSettings.twoFactorEnabled ? '#22C55E' : '#334155', 
                    position: 'relative', 
                    cursor: 'pointer',
                    transition: 'background 0.2s'
                  }}>
                  <div style={{ 
                    position: 'absolute', 
                    left: localSettings.twoFactorEnabled ? '26px' : '4px', 
                    top: '4px', 
                    width: '20px', 
                    height: '20px', 
                    borderRadius: '50%', 
                    background: 'white',
                    transition: 'left 0.2s'
                  }} />
                </div>
              </div>
            </div>
            <div style={{ padding: '16px', background: '#0F172A', borderRadius: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <p style={{ color: 'white', fontSize: '14px', fontWeight: '500', margin: 0 }}>IP Whitelisting</p>
                  <p style={{ color: '#64748B', fontSize: '12px', margin: '4px 0 0 0' }}>Restrict access by IP</p>
                </div>
                <div 
                  onClick={() => handleToggle('ipWhitelistEnabled')}
                  style={{ 
                    width: '48px', 
                    height: '28px', 
                    borderRadius: '14px', 
                    background: localSettings.ipWhitelistEnabled ? '#22C55E' : '#334155', 
                    position: 'relative', 
                    cursor: 'pointer',
                    transition: 'background 0.2s'
                  }}>
                  <div style={{ 
                    position: 'absolute', 
                    left: localSettings.ipWhitelistEnabled ? '26px' : '4px', 
                    top: '4px', 
                    width: '20px', 
                    height: '20px', 
                    borderRadius: '50%', 
                    background: 'white',
                    transition: 'left 0.2s'
                  }} />
                </div>
              </div>
            </div>
          </div>
          <button 
            onClick={handleSave}
            disabled={settingsLoading}
            style={{ 
              marginTop: '20px',
              padding: '14px 24px', 
              background: settingsLoading ? '#64748B' : '#3B82F6', 
              color: 'white', 
              border: 'none', 
              borderRadius: '10px', 
              fontSize: '14px', 
              fontWeight: '600', 
              cursor: settingsLoading ? 'not-allowed' : 'pointer',
              width: '100%'
            }}
          >
            {settingsLoading ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    );
  };

  if (loading && !users.length && !buildings.length) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        background: '#0F172A', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        flexDirection: 'column',
        gap: '16px'
      }}>
        <div style={{ 
          width: '48px', 
          height: '48px', 
          border: '4px solid #334155',
          borderTopColor: '#8B5CF6',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <p style={{ color: '#64748B', fontSize: '14px' }}>Loading superadmin dashboard...</p>
        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0F172A', padding: styles.container.padding, maxWidth: styles.container.maxWidth, margin: styles.container.margin }}>
      {error && (
        <div style={{ 
          padding: '16px', 
          background: '#EF444420', 
          border: '1px solid #EF4444', 
          borderRadius: '12px', 
          marginBottom: '20px',
          color: '#EF4444',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <span>{error}</span>
          <button onClick={fetchData} style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', textDecoration: 'underline' }}>Retry</button>
        </div>
      )}

      {/* Header */}
      <div style={{ 
        background: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)', 
        padding: styles.header.padding, 
        borderRadius: styles.header.borderRadius, 
        border: '1px solid #334155',
        marginBottom: '24px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', flexDirection: styles.header.flexDirection }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ 
              width: isMobile ? '48px' : '60px', 
              height: isMobile ? '48px' : '60px', 
              borderRadius: isMobile ? '12px' : '16px', 
              background: 'linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 32px rgba(139, 92, 246, 0.3)'
            }}>
              <Shield size={isMobile ? 22 : 28} color="white" />
            </div>
            <div>
              <h1 style={{ fontSize: styles.title, fontWeight: 'bold', color: 'white', margin: 0 }}>Superadmin</h1>
              <p style={{ color: '#64748B', margin: '4px 0 0 0', fontSize: isMobile ? '12px' : '14px' }}>System-wide management & control</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexDirection: 'row', width: '100%', justifyContent: 'flex-start', flexWrap: 'wrap' }}>
            <button 
              onClick={handleRefresh}
              disabled={refreshing}
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '6px', 
                padding: isMobile ? '10px 14px' : '12px 20px', 
                background: '#334155', 
                color: 'white', 
                border: 'none', 
                borderRadius: '10px', 
                cursor: refreshing ? 'not-allowed' : 'pointer',
                fontSize: isMobile ? '12px' : '14px',
                fontWeight: '500',
                opacity: refreshing ? 0.7 : 1
              }}
            >
              <RefreshCw size={isMobile ? 14 : 16} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
              {isMobile ? '' : (refreshing ? 'Refreshing...' : 'Refresh')}
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: isMobile ? '8px 12px' : '10px 14px', background: isOnline ? '#22C55E20' : '#EF444420', borderRadius: '8px' }}>
              {isOnline ? <Wifi size={14} color="#22C55E" /> : <WifiOff size={14} color="#EF4444" />}
              <span style={{ fontSize: '12px', color: isOnline ? '#22C55E' : '#EF4444' }}>
                {isOnline ? 'Live' : 'Offline'}
              </span>
            </div>
            <button 
              onClick={logout}
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '6px', 
                padding: isMobile ? '10px 14px' : '12px 20px', 
                background: '#EF4444', 
                color: 'white', 
                border: 'none', 
                borderRadius: '10px', 
                cursor: 'pointer',
                fontSize: isMobile ? '12px' : '14px',
                fontWeight: '500'
              }}
            >
              <Lock size={isMobile ? 14 : 16} /> Logout
            </button>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: isMobile ? '12px' : '20px', padding: '12px 16px', background: '#0F172A', borderRadius: '10px', width: 'fit-content' }}>
          <div style={{ 
            width: isMobile ? '32px' : '36px', 
            height: isMobile ? '32px' : '36px', 
            borderRadius: '10px', 
            background: 'linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: '600',
            fontSize: isMobile ? '12px' : '14px'
          }}>
            {user?.name?.charAt(0).toUpperCase() || 'S'}
          </div>
          <div>
            <p style={{ color: 'white', fontSize: isMobile ? '13px' : '14px', fontWeight: '500', margin: 0 }}>{user?.name || 'Superadmin'}</p>
            <p style={{ color: '#64748B', fontSize: '12px', margin: 0 }}>{user?.email || 'superadmin@bomasecure.com'}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={styles.tabsContainer}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id);
              if (tab.path) {
                navigate(tab.path);
              }
            }}
            style={{
              padding: styles.tabButton.padding,
              background: activeTab === tab.id ? 'linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)' : 'transparent',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: styles.tabButton.fontSize,
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s',
              whiteSpace: 'nowrap',
              flexShrink: 0
            }}
          >
            <tab.icon size={isMobile ? 14 : 16} /> 
            <span style={{ display: isMobile ? 'none' : 'inline' }}>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === 'dashboard' && renderDashboard()}
      {activeTab === 'users' && renderUsers()}
      {activeTab === 'buildings' && renderBuildings()}
      {activeTab === 'audit' && renderAuditLogs()}
      {activeTab === 'security' && renderSecurity()}
      {activeTab === 'servers' && renderServers()}
      {activeTab === 'settings' && renderSettings()}

      {/* User Management Modal */}
      {selectedUser && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: isMobile ? '12px' : '20px' }}>
          <div style={{ 
            background: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)', 
            borderRadius: isMobile ? '16px' : '20px', 
            maxWidth: isMobile ? '100%' : '480px', 
            width: '100%', 
            maxHeight: '90vh', 
            overflow: 'auto',
            border: '1px solid #334155'
          }}>
            <div style={{ padding: isMobile ? '16px' : '24px', borderBottom: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: isMobile ? '18px' : '20px', fontWeight: '600', margin: 0, color: 'white' }}>Manage User</h3>
              <button onClick={() => setSelectedUser(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
                <X size={isMobile ? 20 : 24} color="#64748B" />
              </button>
            </div>
            <div style={{ padding: isMobile ? '16px' : '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: isMobile ? '16px' : '24px', padding: '12px', background: '#0F172A', borderRadius: '12px' }}>
                <div style={{ 
                  width: isMobile ? '44px' : '56px', 
                  height: isMobile ? '44px' : '56px', 
                  borderRadius: '14px', 
                  background: 'linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontWeight: '600',
                  fontSize: isMobile ? '16px' : '20px'
                }}>
                  {selectedUser.name?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div>
                  <p style={{ color: 'white', fontSize: isMobile ? '16px' : '18px', fontWeight: '600', margin: 0 }}>{selectedUser.name}</p>
                  <p style={{ color: '#64748B', fontSize: isMobile ? '12px' : '14px', margin: '4px 0 0 0' }}>{selectedUser.email || selectedUser.phone || 'No contact'}</p>
                </div>
              </div>

              <div style={{ display: 'grid', gap: '12px', marginBottom: isMobile ? '16px' : '24px' }}>
                <div style={{ padding: '12px', background: '#0F172A', borderRadius: '10px' }}>
                  <p style={{ color: '#64748B', fontSize: '11px', margin: '0 0 4px 0', textTransform: 'uppercase' }}>Role</p>
                  <p style={{ color: 'white', fontSize: '14px', fontWeight: '500', margin: 0, textTransform: 'capitalize' }}>{selectedUser.role}</p>
                </div>
                <div style={{ padding: '12px', background: '#0F172A', borderRadius: '10px' }}>
                  <p style={{ color: '#64748B', fontSize: '11px', margin: '0 0 4px 0', textTransform: 'uppercase' }}>Status</p>
                  <p style={{ color: selectedUser.isActive ? '#22C55E' : '#EF4444', fontSize: '14px', fontWeight: '500', margin: 0 }}>
                    {selectedUser.isActive ? 'Active' : 'Suspended'}
                  </p>
                </div>
                <div style={{ padding: '12px', background: '#0F172A', borderRadius: '10px' }}>
                  <p style={{ color: '#64748B', fontSize: '11px', margin: '0 0 4px 0', textTransform: 'uppercase' }}>Verified</p>
                  <p style={{ color: selectedUser.isVerified ? '#22C55E' : '#F59E0B', fontSize: '14px', fontWeight: '500', margin: 0 }}>
                    {selectedUser.isVerified ? 'Verified' : 'Pending'}
                  </p>
                </div>
              </div>
              
              <div style={{ display: 'grid', gap: '10px' }}>
                {selectedUser.isActive ? (
                  <button
                    onClick={() => handleSuspend(selectedUser._id)}
                    disabled={actionLoading || selectedUser._id === user._id}
                    style={{ 
                      padding: isMobile ? '12px' : '14px', 
                      background: '#FEF3C7', 
                      color: '#92400E', 
                      border: 'none', 
                      borderRadius: '10px', 
                      fontSize: isMobile ? '13px' : '14px', 
                      fontWeight: '600', 
                      cursor: selectedUser._id === user._id ? 'not-allowed' : 'pointer',
                      opacity: selectedUser._id === user._id ? 0.5 : 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}
                  >
                    <PauseCircle size={isMobile ? 16 : 18} />
                    {actionLoading ? 'Processing...' : 'Suspend User'}
                  </button>
                ) : (
                  <button
                    onClick={() => handleUnsuspend(selectedUser._id)}
                    disabled={actionLoading}
                    style={{ 
                      padding: isMobile ? '12px' : '14px', 
                      background: '#F0FDF4', 
                      color: '#166534', 
                      border: 'none', 
                      borderRadius: '10px', 
                      fontSize: isMobile ? '13px' : '14px', 
                      fontWeight: '600', 
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}
                  >
                    <PlayCircle size={isMobile ? 16 : 18} />
                    {actionLoading ? 'Processing...' : 'Reactivate User'}
                  </button>
                )}
                <button
                  onClick={() => handleDiscontinue(selectedUser._id)}
                  disabled={actionLoading || selectedUser._id === user._id}
                  style={{ 
                    padding: isMobile ? '12px' : '14px', 
                    background: '#FEF2F2', 
                    color: '#DC2626', 
                    border: 'none', 
                    borderRadius: '10px', 
                    fontSize: isMobile ? '13px' : '14px', 
                    fontWeight: '600', 
                    cursor: selectedUser._id === user._id ? 'not-allowed' : 'pointer',
                    opacity: selectedUser._id === user._id ? 0.5 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  <Trash2 size={isMobile ? 16 : 18} />
                  {actionLoading ? 'Processing...' : 'Delete User'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default SuperAdminDashboard;