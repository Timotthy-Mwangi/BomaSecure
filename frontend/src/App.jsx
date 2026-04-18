import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { Header, Sidebar, MobileNav, LoadingSpinner, Profile, Notifications, HomePage, UserGuide, TermsPage, PrivacyPage, UserDirectory, MaintenanceDirectory } from './components/common';
import { Login, Register, InviteRegister } from './components/auth';
import { TenantDashboard, TenantVisitors, TenantDeliveries, TenantHistory, TenantNewVisitor, TenantEmergency, TenantAnnouncements, TenantMaintenance, TenantRentDashboard, TenantFinance, TenantPayments, GroupComplaints } from './components/tenant';
import { GuardDashboard, GuardCheckIn, GuardDeliveries, GuardLogs, GuardQRScanner, GuardRegister, GuardEmergency, GuardStaff, GuardVisitors, GuardAnnouncements, GuardMaintenance } from './components/guard';
import { AdminDashboard, AdminUsers, AdminApartments, AdminSettings, AdminPayment, AdminReports, AdminEmergency, AdminAnnouncements, AdminPromotions, AdminMaintenance, AdminTenantsFinance, AdminGroupComplaints } from './components/admin';
import { MaintenanceDashboard } from './components/maintenance';
import SuperAdminDashboard from './components/superadmin/SuperAdminDashboard';
import { COLORS } from './config';
import { AlertTriangle } from 'lucide-react';

// Protected Route Component
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading, isAuthenticated, maintenanceMode, isSuperAdmin } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingSpinner fullScreen />;
  }

  // Show maintenance page for non-superadmin users
  if (maintenanceMode && !isSuperAdmin) {
    return <MaintenancePage />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    // Allow superadmin access via isSuperAdmin flag
    if (user?.isSuperAdmin) {
      return children;
    }
    return <Navigate to="/" replace />;
  }

  return children;
};

// Layout Component
const Layout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const width = window.innerWidth;
      setIsMobile(width <= 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: '#0F172A' }}>
      {/* Header - only show on desktop */}
      {!isMobile && <Header toggleSidebar={() => setSidebarOpen(!sidebarOpen)} sidebarOpen={sidebarOpen} />}
      
      {/* Sidebar - only show on desktop (tablets and above) */}
      {!isMobile && <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />}
      
      <main style={{
        marginTop: isMobile ? '0' : '64px',
        marginLeft: (!isMobile && sidebarOpen) ? '260px' : 0,
        transition: 'margin-left 0.3s ease',
        minHeight: isMobile ? 'calc(100vh - 64px - 70px)' : 'calc(100vh - 64px)',
        padding: isMobile ? '12px' : '16px',
        paddingBottom: isMobile ? '80px' : '16px',
        width: '100%',
        maxWidth: '100%',
        overflowX: 'hidden'
      }} className="main-content">
        {children}
      </main>
      
      {/* Mobile Bottom Navigation */}
      {isMobile && <MobileNav />}
      
      <style>{`
        @media (max-width: 768px) {
          .main-content {
            margin-left: 0 !important;
            padding: 12px !important;
            padding-bottom: 80px !important;
          }
        }
        @media (max-width: 480px) {
          .main-content {
            padding: 10px !important;
          }
        }
        @media (min-width: 769px) and (max-width: 1024px) {
          .main-content {
            padding: 14px !important;
          }
        }
      `}</style>
    </div>
  );
};

// Maintenance Page for non-superadmin users
const MaintenancePage = () => {
  const { logout } = useAuth();
  
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
      padding: '20px'
    }}>
      <div style={{
        background: '#1E293B',
        padding: '48px',
        borderRadius: '24px',
        textAlign: 'center',
        maxWidth: '500px'
      }}>
        <AlertTriangle size={64} color="#F59E0B" style={{ marginBottom: '24px' }} />
        <h1 style={{ color: 'white', fontSize: '32px', marginBottom: '16px' }}>
          System Under Maintenance
        </h1>
        <p style={{ color: '#94A3B8', fontSize: '16px', marginBottom: '32px' }}>
          BomaSecure is currently under maintenance. We will be back shortly.
        </p>
        <button
          onClick={logout}
          style={{
            padding: '14px 32px',
            background: '#3B82F6',
            color: 'white',
            border: 'none',
            borderRadius: '10px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: 'pointer'
          }}
        >
          Logout
        </button>
      </div>
    </div>
  );
};

// Role-based Dashboard Router
const DashboardRouter = () => {
  const { user, isAuthenticated, maintenanceMode, isSuperAdmin } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Show maintenance page for non-superadmin users when maintenance mode is on
  if (maintenanceMode && !isSuperAdmin) {
    return <MaintenancePage />;
  }

  switch (user?.role) {
    case 'tenant':
      return <TenantDashboard />;
    case 'guard':
      return <GuardDashboard />;
    case 'admin':
      return <AdminDashboard />;
    case 'maintenance':
      return <MaintenanceDashboard />;
    default:
      return <Navigate to="/login" replace />;
  }
};

// Home Page
const Home = () => {
  const { isAuthenticated, user } = useAuth();

  if (isAuthenticated) {
    return <Navigate to={user?.role === 'tenant' ? '/tenant' : 
                              user?.role === 'guard' ? '/guard' : 
                              user?.role === 'admin' ? '/admin' : 
                              user?.role === 'superadmin' ? '/superadmin' :
                              user?.role === 'maintenance' ? '/maintenance' : '/login'} replace />;
  }

  return <HomePage />;
};

// Main App
function App() {
  return (
    <Router
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <AuthProvider>
        <NotificationProvider>
          <UserGuide />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/invite" element={<InviteRegister />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            
            {/* Tenant Routes */}
            <Route
              path="/tenant"
              element={
                <ProtectedRoute allowedRoles={['tenant', 'admin']}>
                  <Layout>
                    <TenantDashboard />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/tenant/visitors"
              element={
                <ProtectedRoute allowedRoles={['tenant', 'admin']}>
                  <Layout>
                    <TenantVisitors />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/tenant/deliveries"
              element={
                <ProtectedRoute allowedRoles={['tenant', 'admin']}>
                  <Layout>
                    <TenantDeliveries />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/tenant/history"
              element={
                <ProtectedRoute allowedRoles={['tenant', 'admin']}>
                  <Layout>
                    <TenantHistory />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/tenant/profile"
              element={
                <ProtectedRoute allowedRoles={['tenant', 'admin']}>
                  <Layout>
                    <Profile />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/tenant/notifications"
              element={
                <ProtectedRoute allowedRoles={['tenant', 'admin']}>
                  <Layout>
                    <Notifications />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/tenant/emergency"
              element={
                <ProtectedRoute allowedRoles={['tenant']}>
                  <Layout>
                    <TenantEmergency />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/tenant/visitors/new"
              element={
                <ProtectedRoute allowedRoles={['tenant', 'admin']}>
                  <Layout>
                    <TenantNewVisitor />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/tenant/visitors/:id"
              element={
                <ProtectedRoute allowedRoles={['tenant', 'admin']}>
                  <Layout>
                    <TenantVisitors />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/tenant/announcements"
              element={
                <ProtectedRoute allowedRoles={['tenant', 'admin']}>
                  <Layout>
                    <TenantAnnouncements />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/tenant/maintenance"
              element={
                <ProtectedRoute allowedRoles={['tenant']}>
                  <Layout>
                    <TenantMaintenance />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/tenant/maintenance-team"
              element={
                <ProtectedRoute allowedRoles={['tenant']}>
                  <Layout>
                    <MaintenanceDirectory />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/tenant/directory"
              element={
                <ProtectedRoute allowedRoles={['tenant']}>
                  <Layout>
                    <UserDirectory />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/tenant/rent"
              element={
                <ProtectedRoute allowedRoles={['tenant']}>
                  <Layout>
                    <TenantRentDashboard />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/tenant/finance"
              element={
                <ProtectedRoute allowedRoles={['tenant']}>
                  <Layout>
                    <TenantFinance />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/tenant/payments"
              element={
                <ProtectedRoute allowedRoles={['tenant']}>
                  <Layout>
                    <TenantPayments />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/tenant/complaints"
              element={
                <ProtectedRoute allowedRoles={['tenant']}>
                  <Layout>
                    <GroupComplaints />
                  </Layout>
                </ProtectedRoute>
              }
            />
            
            {/* Guard Routes */}
            <Route
              path="/guard"
              element={
                <ProtectedRoute allowedRoles={['guard', 'admin']}>
                  <Layout>
                    <GuardDashboard />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/guard/checkin"
              element={
                <ProtectedRoute allowedRoles={['guard', 'admin']}>
                  <Layout>
                    <GuardCheckIn />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/guard/deliveries"
              element={
                <ProtectedRoute allowedRoles={['guard', 'admin']}>
                  <Layout>
                    <GuardDeliveries />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/guard/logs"
              element={
                <ProtectedRoute allowedRoles={['guard', 'admin']}>
                  <Layout>
                    <GuardLogs />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/guard/visitors"
              element={
                <ProtectedRoute allowedRoles={['guard', 'admin']}>
                  <Layout>
                    <GuardVisitors />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/guard/qr"
              element={
                <ProtectedRoute allowedRoles={['guard', 'admin']}>
                  <Layout>
                    <GuardQRScanner />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/guard/profile"
              element={
                <ProtectedRoute allowedRoles={['guard', 'admin']}>
                  <Layout>
                    <Profile />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/guard/notifications"
              element={
                <ProtectedRoute allowedRoles={['guard', 'admin']}>
                  <Layout>
                    <Notifications />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/guard/register"
              element={
                <ProtectedRoute allowedRoles={['guard', 'admin']}>
                  <Layout>
                    <GuardRegister />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/guard/emergency"
              element={
                <ProtectedRoute allowedRoles={['guard']}>
                  <Layout>
                    <GuardEmergency />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/guard/staff"
              element={
                <ProtectedRoute allowedRoles={['guard']}>
                  <Layout>
                    <GuardStaff />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/guard/announcements"
              element={
                <ProtectedRoute allowedRoles={['guard', 'admin']}>
                  <Layout>
                    <GuardAnnouncements />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/guard/maintenance"
              element={
                <ProtectedRoute allowedRoles={['guard']}>
                  <Layout>
                    <GuardMaintenance />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/guard/maintenance-team"
              element={
                <ProtectedRoute allowedRoles={['guard']}>
                  <Layout>
                    <MaintenanceDirectory />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/guard/directory"
              element={
                <ProtectedRoute allowedRoles={['guard']}>
                  <Layout>
                    <UserDirectory />
                  </Layout>
                </ProtectedRoute>
              }
            />
            
            {/* Admin Routes */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <Layout>
                    <AdminDashboard />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/profile"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <Layout>
                    <Profile />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/notifications"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <Layout>
                    <Notifications />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/users"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <Layout>
                    <AdminUsers />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/apartments"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <Layout>
                    <AdminApartments />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/apartments/new"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <Layout>
                    <AdminApartments showNewModal={true} />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/settings"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <Layout>
                    <AdminSettings />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/payment"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <Layout>
                    <AdminPayment />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/reports"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <Layout>
                    <AdminReports />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/emergency"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <Layout>
                    <AdminEmergency />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/announcements"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <Layout>
                    <AdminAnnouncements />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/promotions"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <Layout>
                    <AdminPromotions />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/maintenance"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <Layout>
                    <AdminMaintenance />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/maintenance-team"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <Layout>
                    <MaintenanceDirectory />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/tenants-finance"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <Layout>
                    <AdminTenantsFinance />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/complaints"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <Layout>
                    <AdminGroupComplaints />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/directory"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <Layout>
                    <UserDirectory />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/*"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <Layout>
                    <AdminDashboard />
                  </Layout>
                </ProtectedRoute>
              }
            />

            {/* Maintenance Routes */}
            <Route
              path="/maintenance"
              element={
                <ProtectedRoute allowedRoles={['maintenance']}>
                  <Layout>
                    <MaintenanceDashboard />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/maintenance/requests"
              element={
                <ProtectedRoute allowedRoles={['maintenance']}>
                  <Layout>
                    <MaintenanceDashboard />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/maintenance/profile"
              element={
                <ProtectedRoute allowedRoles={['maintenance']}>
                  <Layout>
                    <Profile />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/maintenance/notifications"
              element={
                <ProtectedRoute allowedRoles={['maintenance']}>
                  <Layout>
                    <Notifications />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/maintenance/directory"
              element={
                <ProtectedRoute allowedRoles={['maintenance']}>
                  <Layout>
                    <MaintenanceDirectory />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/maintenance/*"
              element={
                <ProtectedRoute allowedRoles={['maintenance']}>
                  <Layout>
                    <MaintenanceDashboard />
                  </Layout>
                </ProtectedRoute>
              }
            />

            
            {/* Dashboard Router */}
            <Route path="/dashboard" element={<DashboardRouter />} />
            
            {/* Superadmin Routes */}
            <Route
              path="/superadmin"
              element={
                <ProtectedRoute allowedRoles={['superadmin']}>
                  <Layout>
                    <SuperAdminDashboard />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/superadmin/*"
              element={
                <ProtectedRoute allowedRoles={['superadmin']}>
                  <Layout>
                    <SuperAdminDashboard />
                  </Layout>
                </ProtectedRoute>
              }
            />
            
            {/* 404 */}
            <Route path="*" element={
              <div style={{
                minHeight: '100vh',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                background: COLORS.gray[50]
              }}>
                <h1 style={{ fontSize: '72px', fontWeight: 700, color: COLORS.dark, margin: 0 }}>404</h1>
                <p style={{ fontSize: '18px', color: COLORS.gray[500], margin: '16px 0' }}>Page not found</p>
                <a href="/" style={{ color: COLORS.primary, textDecoration: 'none' }}>Go back home</a>
              </div>
            } />
          </Routes>
        </NotificationProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
