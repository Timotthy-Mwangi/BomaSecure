import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, ChevronLeft, Check, Building, Users, Bell, Shield, Home, CreditCard, FileText, QrCode, AlertTriangle, Activity, BarChart3, Megaphone, UserCheck, Package } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

// Global tour trigger - use this to start tour from anywhere
export const startTour = () => {
  window.dispatchEvent(new CustomEvent('startUserTour'));
};

// Responsive hook
const useResponsive = () => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640);
  const [isTablet, setIsTablet] = useState(window.innerWidth >= 640 && window.innerWidth < 1024);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 640);
      setIsTablet(window.innerWidth >= 640 && window.innerWidth < 1024);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return { isMobile, isTablet };
};

const UserGuide = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { isMobile } = useResponsive();
  const [isVisible, setIsVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  // Function to show the tour
  const showTour = useCallback(() => {
    setDismissed(false);
    setCurrentStep(0);
    setIsVisible(true);
  }, []);

  // Check if user has seen the guide OR listen for global tour start event
  useEffect(() => {
    if (user?._id) {
      const hasSeenGuide = localStorage.getItem(`userGuide_${user._id}`);
      // Auto-show on first visit
      if (!hasSeenGuide) {
        setTimeout(() => showTour(), 1500); // Small delay for better UX
      }
      
      // Listen for global tour start event
      const handleStartTour = () => showTour();
      window.addEventListener('startUserTour', handleStartTour);
      return () => window.removeEventListener('startUserTour', handleStartTour);
    }
  }, [user?._id, showTour]);

  // Get role-specific steps
  const getGuideSteps = () => {
    const role = user?.role;
    
    const adminSteps = [
      {
        title: 'Welcome to BomaSecure!',
        description: 'Your complete property management solution. Click here to explore all features.',
        icon: Shield,
        color: '#3B82F6'
      },
      {
        title: 'Dashboard Overview',
        description: 'View key metrics, recent activities, and quick stats at a glance.',
        icon: BarChart3,
        color: '#3B82F6',
        action: () => navigate('/admin')
      },
      {
        title: 'User Management',
        description: 'Manage tenants, security guards, and user access levels.',
        icon: Users,
        color: '#8B5CF6',
        action: () => navigate('/admin/users')
      },
      {
        title: 'Manage Buildings',
        description: 'Add and manage buildings and rooms.',
        icon: Building,
        color: '#10B981',
        action: () => navigate('/admin/apartments')
      },
      {
        title: 'Access Logs',
        description: 'Track all visitor entries, exits, and security events in real-time.',
        icon: FileText,
        color: '#06B6D4',
        action: () => navigate('/admin/logs')
      },
      {
        title: 'Reports & Analytics',
        description: 'View detailed analytics, trends, and export security reports.',
        icon: BarChart3,
        color: '#F59E0B',
        action: () => navigate('/admin/reports')
      },
      {
        title: 'Emergency Management',
        description: 'Handle emergencies, trigger alarms, and coordinate responses.',
        icon: AlertTriangle,
        color: '#EF4444',
        action: () => navigate('/admin/emergency')
      },
      {
        title: 'Announcements',
        description: 'Send important updates and notices to all tenants.',
        icon: Megaphone,
        color: '#EC4899',
        action: () => navigate('/admin/announcements')
      },
      {
        title: 'Payment Tracking',
        description: 'Monitor rent payments and manage financial records.',
        icon: CreditCard,
        color: '#22C55E',
        action: () => navigate('/admin/payment')
      },
      {
        title: 'Notifications',
        description: 'Stay updated with real-time alerts and system messages.',
        icon: Bell,
        color: '#F97316',
        action: () => navigate('/admin/notifications')
      },
      {
        title: 'Settings',
        description: 'Configure system settings, security options, and preferences.',
        icon: Activity,
        color: '#64748B',
        action: () => navigate('/admin/settings')
      },
      {
        title: 'You\'re All Set!',
        description: 'Explore the sidebar for more features. Click Skip to close.',
        icon: Check,
        color: '#22C55E'
      }
    ];

    const guardSteps = [
      {
        title: 'Welcome to BomaSecure!',
        description: 'Your security command center. Click here to explore all features.',
        icon: Shield,
        color: '#3B82F6'
      },
      {
        title: 'Security Dashboard',
        description: 'View daily stats, recent activities, and quick actions.',
        icon: BarChart3,
        color: '#3B82F6',
        action: () => navigate('/guard')
      },
      {
        title: 'Check-In System',
        description: 'Process visitor and delivery check-ins efficiently.',
        icon: UserCheck,
        color: '#10B981',
        action: () => navigate('/guard/checkin')
      },
      {
        title: 'QR Code Scanner',
        description: 'Quickly verify pre-approved visitors and deliveries by scanning QR codes.',
        icon: QrCode,
        color: '#8B5CF6',
        action: () => navigate('/guard/qr')
      },
      {
        title: 'Pre-approved Visitors',
        description: 'View and manage visitors pre-approved by tenants.',
        icon: Users,
        color: '#06B6D4',
        action: () => navigate('/guard/visitors')
      },
      {
        title: 'Pre-approved Deliveries',
        description: 'Track and manage packages awaiting pickup.',
        icon: Package,
        color: '#F59E0B',
        action: () => navigate('/guard/deliveries')
      },
      {
        title: 'Access Logs',
        description: 'View complete history of all entries and exits.',
        icon: FileText,
        color: '#64748B',
        action: () => navigate('/guard/logs')
      },
      {
        title: 'Register Visitor',
        description: 'Manually register walk-in visitors and issue access passes.',
        icon: Shield,
        color: '#EF4444',
        action: () => navigate('/guard/register')
      },
      {
        title: 'Emergency Response',
        description: 'Handle emergencies, trigger building alarms, and contact authorities.',
        icon: AlertTriangle,
        color: '#DC2626',
        action: () => navigate('/guard/emergency')
      },
      {
        title: 'Staff Management',
        description: 'View and manage security staff schedules and information.',
        icon: Users,
        color: '#8B5CF6',
        action: () => navigate('/guard/staff')
      },
      {
        title: 'Notifications',
        description: 'Stay updated with real-time alerts and system messages.',
        icon: Bell,
        color: '#F97316',
        action: () => navigate('/guard/notifications')
      },
      {
        title: 'Profile Settings',
        description: 'Update your profile information and preferences.',
        icon: Activity,
        color: '#64748B',
        action: () => navigate('/guard/profile')
      },
      {
        title: 'You\'re All Set!',
        description: 'Explore the sidebar for more features. Click Skip to close.',
        icon: Check,
        color: '#22C55E'
      }
    ];

    const tenantSteps = [
      {
        title: 'Welcome to BomaSecure!',
        description: 'Your home management app. Click here to explore all features.',
        icon: Home,
        color: '#3B82F6'
      },
      {
        title: 'Tenant Dashboard',
        description: 'View your home overview, quick stats, and recent activities.',
        icon: BarChart3,
        color: '#3B82F6',
        action: () => navigate('/tenant')
      },
      {
        title: 'Manage Visitors',
        description: 'Add, pre-approve, and manage visitors for faster check-in.',
        icon: Users,
        color: '#10B981',
        action: () => navigate('/tenant/visitors')
      },
      {
        title: 'Pre-approve Visitor',
        description: 'Quickly add new visitors with QR code generation for easy access.',
        icon: QrCode,
        color: '#8B5CF6',
        action: () => navigate('/tenant/visitors/new')
      },
      {
        title: 'Track Deliveries',
        description: 'Get notified when packages arrive and manage delivery history.',
        icon: Package,
        color: '#F59E0B',
        action: () => navigate('/tenant/deliveries')
      },
      {
        title: 'Access History',
        description: 'View complete history of visitor entries and exits.',
        icon: FileText,
        color: '#06B6D4',
        action: () => navigate('/tenant/history')
      },
      {
        title: 'Emergency Services',
        description: 'Quick access to emergency services and building security alerts.',
        icon: AlertTriangle,
        color: '#EF4444',
        action: () => navigate('/tenant/emergency')
      },
      {
        title: 'Notifications',
        description: 'Stay updated with real-time alerts for visitors, deliveries, and announcements.',
        icon: Bell,
        color: '#F97316',
        action: () => navigate('/tenant/notifications')
      },
      {
        title: 'Profile & Settings',
        description: 'Update your profile, change password, and manage preferences.',
        icon: Activity,
        color: '#64748B',
        action: () => navigate('/tenant/profile')
      },
      {
        title: 'You\'re All Set!',
        description: 'Explore the sidebar for more features. Click Skip to close.',
        icon: Check,
        color: '#22C55E'
      }
    ];
    
    // Add UserCheck and Package to the import above

    switch (role) {
      case 'admin':
        return adminSteps;
      case 'guard':
        return guardSteps;
      case 'tenant':
        return tenantSteps;
      default:
        return adminSteps;
    }
  };

  const steps = getGuideSteps();

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleDismiss();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    setIsVisible(false);
    // Mark as seen
    if (user?._id) {
      localStorage.setItem(`userGuide_${user._id}`, 'true');
    }
  };

  const handleStepClick = (action) => {
    if (action) {
      handleDismiss();
      action();
    }
  };

  if (!isVisible || dismissed) return null;

  const CurrentIcon = steps[currentStep]?.icon;

  // Responsive styles
  const containerStyle = {
    position: 'fixed',
    bottom: isMobile ? '80px' : '24px',
    left: isMobile ? '12px' : '24px',
    right: isMobile ? '12px' : '24px',
    maxWidth: isMobile ? '100%' : '400px',
    width: isMobile ? 'auto' : '400px',
    margin: '0 auto',
    zIndex: 1000,
  };

  const innerPadding = isMobile ? '16px' : '24px';
  // eslint-disable-next-line no-unused-vars
  const titleSize = isMobile ? '18px' : '20px';
  // eslint-disable-next-line no-unused-vars
  const descSize = isMobile ? '13px' : '14px';
  // eslint-disable-next-line no-unused-vars
  const iconSize = isMobile ? '32px' : '40px';
  // eslint-disable-next-line no-unused-vars
  const buttonGap = isMobile ? '6px' : '12px';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 50 }}
        style={containerStyle}
      >
        <div style={{
          background: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)',
          borderRadius: isMobile ? '12px' : '16px',
          padding: innerPadding,
          boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
          border: '1px solid #334155',
        }}>
          {/* Header */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: steps[currentStep]?.color || '#3B82F6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {CurrentIcon && <CurrentIcon size={20} color="#fff" />}
              </div>
              <span style={{
                color: '#94A3B8',
                fontSize: '12px',
                textTransform: 'uppercase',
                letterSpacing: '1px'
              }}>
                Step {currentStep + 1} of {steps.length}
              </span>
            </div>
            <button
              onClick={handleDismiss}
              style={{
                background: 'none',
                border: 'none',
                color: '#64748B',
                cursor: 'pointer',
                padding: '4px'
              }}
            >
              <X size={20} />
            </button>
          </div>

          {/* Content */}
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
          >
            <h3 style={{
              margin: '0 0 8px',
              fontSize: '20px',
              fontWeight: '600',
              color: '#F8FAFC'
            }}>
              {steps[currentStep]?.title}
            </h3>
            <p style={{
              margin: '0 0 20px',
              fontSize: '14px',
              color: '#94A3B8',
              lineHeight: '1.6'
            }}>
              {steps[currentStep]?.description}
            </p>

            {steps[currentStep]?.action && (
              <button
                onClick={() => handleStepClick(steps[currentStep]?.action)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  background: steps[currentStep]?.color || '#3B82F6',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  marginBottom: '16px',
                  transition: 'transform 0.2s',
                }}
                onMouseOver={(e) => e.target.style.transform = 'scale(1.02)'}
                onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
              >
                Try it now
                <ChevronRight size={16} />
              </button>
            )}
          </motion.div>

          {/* Navigation */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <button
              onClick={handlePrev}
              disabled={currentStep === 0}
              style={{
                background: 'none',
                border: 'none',
                color: currentStep === 0 ? '#334155' : '#94A3B8',
                cursor: currentStep === 0 ? 'default' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '14px',
                padding: '8px'
              }}
            >
              <ChevronLeft size={16} />
              Back
            </button>

            {/* Progress dots */}
            <div style={{
              display: 'flex',
              gap: '6px'
            }}>
              {steps.map((_, idx) => (
                <div
                  key={idx}
                  style={{
                    width: idx === currentStep ? '24px' : '8px',
                    height: '8px',
                    borderRadius: '4px',
                    background: idx === currentStep 
                      ? steps[currentStep]?.color || '#3B82F6'
                      : idx < currentStep 
                        ? '#22C55E'
                        : '#334155',
                    transition: 'all 0.3s'
                  }}
                />
              ))}
            </div>

            <button
              onClick={handleNext}
              style={{
                background: '#3B82F6',
                border: 'none',
                color: '#fff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '14px',
                padding: '8px 16px',
                borderRadius: '6px',
                fontWeight: '600'
              }}
            >
              {currentStep === steps.length - 1 ? 'Done' : 'Next'}
              {currentStep < steps.length - 1 && <ChevronRight size={16} />}
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default UserGuide;
