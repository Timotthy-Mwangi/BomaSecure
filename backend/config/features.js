/**
 * Feature Configuration for BomaSecure
 * Maps subscription plans to available features
 */

const FEATURES = {
  // Plan definitions
  plans: {
    free: {
      name: 'Free',
      price: 0,
      description: 'Basic property management'
    },
    trial: {
      name: 'Trial',
      price: 0,
      description: '14-day free trial with all features'
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
    // User & Room Limits
    maxUnits: {
      free: 20,
      standard: 100,
      premium: -1 // unlimited
    },
    maxGuards: {
      free: 2,
      standard: 5,
      premium: -1 // unlimited
    },
    maxTenants: {
      free: 50,
      standard: 200,
      premium: -1 // unlimited
    },

    // Core Features
    visitorManagement: {
      free: true,
      standard: true,
      premium: true
    },
    deliveryManagement: {
      free: true,
      standard: true,
      premium: true
    },
    accessLogs: {
      free: true,
      standard: true,
      premium: true
    },

    // Advanced Features
    qrCodeGeneration: {
      free: true,
      standard: true,
      premium: true
    },
    realTimeNotifications: {
      free: true,
      standard: true,
      premium: true
    },

    // Standard Features
    multipleApartments: {
      free: false,
      standard: true,
      premium: true
    },
    announcements: {
      free: false,
      standard: true,
      premium: true
    },
    reports: {
      free: false,
      standard: true,
      premium: true
    },
    analytics: {
      free: false,
      standard: true,
      premium: true
    },
    accessLogRetention: {
      free: 30, // days
      standard: 90,
      premium: 365
    },

    // Premium Features
    smsNotifications: {
      free: false,
      standard: false,
      premium: true
    },
    emailNotifications: {
      free: false,
      standard: false,
      premium: true
    },
    apiAccess: {
      free: false,
      standard: false,
      premium: true
    },
    customBranding: {
      free: false,
      standard: false,
      premium: true
    },
    prioritySupport: {
      free: false,
      standard: false,
      premium: true
    },
    advancedSecurity: {
      free: false,
      standard: false,
      premium: true
    },
    multiAdmin: {
      free: false,
      standard: false,
      premium: true
    },
    exportData: {
      free: false,
      standard: true,
      premium: true
    }
  },

  // Helper to check if a feature is available
  hasFeature: function(plan, feature) {
    // Trial plan gets same features as free (with trial period)
    const effectivePlan = plan === 'trial' ? 'free' : plan;
    const planFeatures = this.features[feature];
    if (!planFeatures) {
      console.warn(`Unknown feature: ${feature}`);
      return false;
    }
    return !!planFeatures[effectivePlan];
  },

  // Get numeric feature value (for limits)
  getFeatureValue: function(plan, feature) {
    // Trial plan gets same features as free (with trial period)
    const effectivePlan = plan === 'trial' ? 'free' : plan;
    const planFeatures = this.features[feature];
    if (!planFeatures) {
      return 0;
    }
    return planFeatures[effectivePlan] ?? 0;
  },

  // Check if user can access a feature
  canAccess: function(subscriptionPlan, feature) {
    const plan = subscriptionPlan || 'free';
    return this.hasFeature(plan, feature);
  },

  // Get plan limits
  getLimits: function(subscriptionPlan) {
    const plan = subscriptionPlan || 'free';
    return {
      maxUnits: this.getFeatureValue(plan, 'maxUnits'),
      maxGuards: this.getFeatureValue(plan, 'maxGuards'),
      maxTenants: this.getFeatureValue(plan, 'maxTenants'),
      accessLogRetention: this.getFeatureValue(plan, 'accessLogRetention')
    };
  },

  // Get all features for a plan
  getPlanFeatures: function(subscriptionPlan) {
    // Trial plan gets same features as premium
    const plan = (subscriptionPlan === 'trial' ? 'free' : subscriptionPlan) || 'free';
    const result = {};
    for (const feature in this.features) {
      result[feature] = this.features[feature][plan];
    }
    return result;
  },

  // Get upgrade message for a feature
  getUpgradeMessage: function(feature) {
    const messages = {
      multipleApartments: 'Upgrade to Standard to manage multiple properties',
      announcements: 'Upgrade to Standard to send announcements to tenants',
      reports: 'Upgrade to Standard to access reports and analytics',
      analytics: 'Upgrade to Standard to view analytics',
      smsNotifications: 'Upgrade to Premium for SMS notifications',
      emailNotifications: 'Upgrade to Premium for email notifications',
      customBranding: 'Upgrade to Premium for custom branding',
      prioritySupport: 'Upgrade to Premium for priority support',
      advancedSecurity: 'Upgrade to Premium for advanced security features',
      multiAdmin: 'Upgrade to Premium for multiple admin accounts',
      exportData: 'Upgrade to Standard to export data'
    };
    return messages[feature] || 'Upgrade your plan to access this feature';
  }
};

module.exports = FEATURES;
