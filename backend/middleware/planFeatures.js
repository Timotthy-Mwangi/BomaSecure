const FEATURES = require('../config/features');
const Apartment = require('../models/Apartment');

/**
 * Middleware to check if a feature is available for the user's subscription plan
 * @param {string} feature - The feature name to check
 */
const checkFeature = (feature) => {
  return async (req, res, next) => {
    try {
      // Get apartment ID from user or request
      const apartmentId = req.user.apartmentId || req.apartment?._id;
      
      if (!apartmentId) {
        return res.status(400).json({ 
          success: false, 
          message: 'Apartment not found',
          feature 
        });
      }

      // Fetch apartment to get subscription plan
      const apartment = await Apartment.findById(apartmentId);
      
      if (!apartment) {
        return res.status(404).json({ 
          success: false, 
          message: 'Apartment not found',
          feature 
        });
      }

      const plan = apartment.subscription?.plan || 'free';
      
      // Check if feature is available
      if (!FEATURES.canAccess(plan, feature)) {
        return res.status(403).json({
          success: false,
          message: FEATURES.getUpgradeMessage(feature),
          feature,
          currentPlan: plan,
          requiredPlan: getRequiredPlan(feature)
        });
      }

      // Attach apartment and plan info to request for downstream use
      req.apartment = apartment;
      req.planFeatures = FEATURES.getPlanFeatures(plan);
      req.planLimits = FEATURES.getLimits(plan);
      
      next();
    } catch (error) {
      console.error('Feature check error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error checking feature access' 
      });
    }
  };
};

/**
 * Middleware to enforce plan limits (e.g., max units, max guards)
 * @param {string} limitType - The limit type to check (maxUnits, maxGuards, maxTenants)
 */
const checkLimit = (limitType) => {
  return async (req, res, next) => {
    try {
      const apartmentId = req.user.apartmentId || req.apartment?._id;
      
      if (!apartmentId) {
        return res.status(400).json({ 
          success: false, 
          message: 'Apartment not found' 
        });
      }

      const apartment = await Apartment.findById(apartmentId);
      
      if (!apartment) {
        return res.status(404).json({ 
          success: false, 
          message: 'Apartment not found' 
        });
      }

      const plan = apartment.subscription?.plan || 'free';
      const limit = FEATURES.getFeatureValue(plan, limitType);
      
      // -1 means unlimited
      if (limit === -1) {
        req.apartment = apartment;
        req.planFeatures = FEATURES.getPlanFeatures(plan);
        req.planLimits = FEATURES.getLimits(plan);
        return next();
      }

      // Check current usage
      let currentCount = 0;
      switch (limitType) {
        case 'maxUnits':
          currentCount = apartment.units?.length || 0;
          break;
        case 'maxGuards':
          currentCount = apartment.securityGuards?.length || 0;
          break;
        case 'maxTenants':
          currentCount = apartment.occupiedUnits || 0;
          break;
      }

      if (currentCount >= limit) {
        return res.status(403).json({
          success: false,
          message: `You've reached the ${limitType.replace('max', '')} limit for your ${plan} plan. Upgrade to add more.`,
          currentCount,
          limit,
          currentPlan: plan,
          feature: limitType
        });
      }

      req.apartment = apartment;
      req.planFeatures = FEATURES.getPlanFeatures(plan);
      req.planLimits = FEATURES.getLimits(plan);
      req.remainingLimit = limit - currentCount;
      
      next();
    } catch (error) {
      console.error('Limit check error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error checking limit' 
      });
    }
  };
};

/**
 * Helper to get required plan for a feature
 */
function getRequiredPlan(feature) {
  const plans = ['free', 'standard', 'premium'];
  const featurePlans = {
    // Standard features
    multipleApartments: 'standard',
    announcements: 'standard',
    reports: 'standard',
    analytics: 'standard',
    exportData: 'standard',
    
    // Premium features
    smsNotifications: 'premium',
    emailNotifications: 'premium',
    apiAccess: 'premium',
    customBranding: 'premium',
    prioritySupport: 'premium',
    advancedSecurity: 'premium',
    multiAdmin: 'premium'
  };
  
  return featurePlans[feature] || 'premium';
}

/**
 * Get subscription info for an apartment
 */
const getSubscriptionInfo = async (apartmentId) => {
  try {
    const apartment = await Apartment.findById(apartmentId);
    if (!apartment) return null;
    
    const plan = apartment.subscription?.plan || 'free';
    return {
      plan,
      features: FEATURES.getPlanFeatures(plan),
      limits: FEATURES.getLimits(plan),
      subscription: apartment.subscription
    };
  } catch (error) {
    console.error('Error getting subscription info:', error);
    return null;
  }
};

module.exports = {
  checkFeature,
  checkLimit,
  getSubscriptionInfo,
  FEATURES
};
