/**
 * Feature flags configuration for BomaSecure
 * Mirrors backend FEATURES config
 */

export const FEATURES = {
  plans: {
    free: {
      name: 'Free',
      price: 0,
      description: 'Basic property management'
    },
    standard: {
      name: 'Standard',
      price: 50,
      description: 'Enhanced features for growing properties'
    },
    premium: {
      name: 'Premium',
      price: 150,
      description: 'Full-featured solution for enterprises'
    }
  },

  // Feature flags per plan
  features: {
    // Limits
    maxUnits: { free: 20, standard: 100, premium: -1 },
    maxGuards: { free: 2, standard: 5, premium: -1 },
    maxTenants: { free: 50, standard: 200, premium: -1 },
    
    // Core Features
    visitorManagement: { free: true, standard: true, premium: true },
    deliveryManagement: { free: true, standard: true, premium: true },
    accessLogs: { free: true, standard: true, premium: true },
    qrCodeGeneration: { free: true, standard: true, premium: true },
    realTimeNotifications: { free: true, standard: true, premium: true },

    // Standard Features
    multipleApartments: { free: false, standard: true, premium: true },
    announcements: { free: false, standard: true, premium: true },
    reports: { free: false, standard: true, premium: true },
    analytics: { free: false, standard: true, premium: true },
    accessLogRetention: { free: 30, standard: 90, premium: 365 },

    // Premium Features
    smsNotifications: { free: false, standard: false, premium: true },
    emailNotifications: { free: false, standard: false, premium: true },
    apiAccess: { free: false, standard: false, premium: true },
    customBranding: { free: false, standard: false, premium: true },
    prioritySupport: { free: false, standard: false, premium: true },
    advancedSecurity: { free: false, standard: false, premium: true },
    multiAdmin: { free: false, standard: false, premium: true },
    exportData: { free: false, standard: true, premium: true }
  },

  // Check if a feature is available
  hasFeature(plan, feature) {
    const planFeatures = this.features[feature];
    if (!planFeatures) return false;
    return !!planFeatures[plan];
  },

  // Get numeric feature value
  getFeatureValue(plan, feature) {
    const planFeatures = this.features[feature];
    if (!planFeatures) return 0;
    return planFeatures[plan] ?? 0;
  },

  // Get limits for a plan
  getLimits(plan) {
    return {
      maxUnits: this.getFeatureValue(plan, 'maxUnits'),
      maxGuards: this.getFeatureValue(plan, 'maxGuards'),
      maxTenants: this.getFeatureValue(plan, 'maxTenants'),
      accessLogRetention: this.getFeatureValue(plan, 'accessLogRetention')
    };
  },

  // Get all features for a plan
  getPlanFeatures(plan) {
    const result = {};
    for (const feature in this.features) {
      result[feature] = this.features[feature][plan];
    }
    return result;
  },

  // Get upgrade message
  getUpgradeMessage(feature) {
    const messages = {
      multipleApartments: 'Upgrade to Standard to manage multiple properties',
      announcements: 'Upgrade to Standard to send announcements to tenants',
      reports: 'Upgrade to Standard to access reports and analytics',
      analytics: 'Upgrade to Standard to view analytics',
      smsNotifications: 'Upgrade to Premium for SMS notifications',
      emailNotifications: 'Upgrade to Premium for email notifications',
      apiAccess: 'Upgrade to Premium for API access',
      customBranding: 'Upgrade to Premium for custom branding',
      prioritySupport: 'Upgrade to Premium for priority support',
      advancedSecurity: 'Upgrade to Premium for advanced security features',
      multiAdmin: 'Upgrade to Premium for multiple admin accounts',
      exportData: 'Upgrade to Standard to export data'
    };
    return messages[feature] || 'Upgrade your plan to access this feature';
  }
};

// API functions
export const featuresAPI = {
  // Get current subscription and plans
  getSubscription: async () => {
    const response = await fetch('/api/apartments/subscription', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    return response.json();
  },

  // Check if a specific feature is accessible
  checkFeature: async (feature) => {
    const response = await fetch(`/api/apartments/subscription/check/${feature}`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    return response.json();
  },

  // Update subscription
  updateSubscription: async (plan, billingCycle = 'monthly') => {
    const response = await fetch('/api/apartments/subscription', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ plan, billingCycle })
    });
    return response.json();
  }
};

export default FEATURES;
