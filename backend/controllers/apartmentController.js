// NEW: Create building (by admin) - Step 1 of 2
exports.createBuilding = async (req, res) => {
  try {
    const { buildingName, buildingCode, location, gates, amenities, rules, totalUnits } = req.body;
    const adminId = req.user.userId;

    if (!buildingName) {
      return res.status(400).json({ success: false, message: 'Building name is required' });
    }

    const existingBuilding = await Apartment.findOne({ buildingName: { $regex: new RegExp('^' + buildingName + '$', 'i') }, adminId });
    if (existingBuilding) {
      return res.status(400).json({ success: false, message: 'Building "' + buildingName + '" already exists. Please use a different name.' });
    }

    const apartment = new Apartment({
      buildingName,
      buildingCode: buildingCode || 'BLD-' + Date.now(),
      adminId,
      location: location || { address: '', city: 'Nairobi', county: 'Nairobi' },
      units: [],
      totalUnits: parseInt(totalUnits) || 0,
      occupiedUnits: 0,
      gates: gates || [{ name: 'Main Gate', type: 'main', isActive: true }],
      amenities: amenities || [],
      rules: rules || { visitorPolicy: 'All visitors must be registered', checkInTime: '06:00', checkOutTime: '22:00', maxVisitors: 5 }
    });

    await apartment.save();
    const io = req.app.get('io');
    if (io) wsService.broadcastApartmentCreated(io, apartment);

    res.status(201).json({ success: true, message: 'Building created successfully. Now add apartments/rooms to it.', apartment });
  } catch (error) {
    console.error('Create building error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// NEW: Add apartment/unit to building - Step 2 of 2
exports.addUnit = async (req, res) => {
  try {
    const { id } = req.params;
    const { number, floor, type, size, rent, isOccupied, rentDueDay } = req.body;
    const userId = req.user.userId;
    const userRole = req.user.role;

    if (userRole !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only admins can add units' });
    }

    if (number === undefined || number === null || number === '') {
      return res.status(400).json({ success: false, message: 'Unit/Room number is required' });
    }

    const building = await Apartment.findById(id);
    if (!building) {
      return res.status(404).json({ success: false, message: 'Building not found' });
    }

    // Optimized check: ensure the requester is the owner of this specific building
    if (building.adminId && building.adminId.toString() !== userId) {
      return res.status(403).json({ success: false, message: 'You can only add units to your own buildings' });
    }

    const searchNumber = number.toString().trim().toLowerCase();
    const existingUnit = building.units.find(u => 
      u.number && u.number.toString().trim().toLowerCase() === searchNumber
    );
    if (existingUnit) {
      return res.status(400).json({ success: false, message: `Unit/Room "${number}" already exists in this building` });
    }

    const newUnit = {
      number: number.toString(),
      floor: parseInt(floor), // Allow 0 for ground floor
      type: type || '1bed',
      size: parseInt(size) || 50,
      rent: parseInt(rent) || 0,
      isOccupied: isOccupied || false,
      tenantId: null,
      rentDueDay: rentDueDay ? parseInt(rentDueDay) : null
    };

    building.units.push(newUnit);
    building.totalUnits = building.units.length;
    building.occupiedUnits = building.units.filter(u => u.isOccupied).length;
    await building.save();

    const io = req.app.get('io');
    if (io) {
      wsService.broadcastApartmentUpdated(io, id, { addedUnit: newUnit });
      // Also notify tenants in the apartment building
      wsService.broadcastApartmentUpdatedToTenants(io, id, { addedUnit: newUnit });
    }

    res.status(201).json({ success: true, message: 'Unit/Apartment added successfully', apartment: building });
  } catch (error) {
    console.error('Add unit error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// NEW: Delete single unit from building
exports.deleteUnit = async (req, res) => {
  try {
    const { id, unitId } = req.params; // id is buildingId
    const building = await Apartment.findById(id);
    
    if (!building) {
      return res.status(404).json({ success: false, message: 'Building not found' });
    }

    // Remove the unit
    building.units = building.units.filter(u => u._id.toString() !== unitId);
    building.totalUnits = building.units.length;
    building.occupiedUnits = building.units.filter(u => u.isOccupied).length;
    await building.save();

    const io = req.app.get('io');
    if (io) wsService.broadcastApartmentUpdated(io, id, { deletedUnit: unitId });

    res.json({ success: true, message: 'Unit deleted successfully', apartment: building });
  } catch (error) {
    console.error('Delete unit error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// NEW: Update single unit in building (e.g., status toggle)
exports.updateUnit = async (req, res) => {
  try {
    const { id, unitId } = req.params;
    const { status, isOccupied } = req.body;
    
    const building = await Apartment.findById(id);
    if (!building) {
      return res.status(404).json({ success: false, message: 'Building not found' });
    }

    const searchId = unitId.toString().trim().toLowerCase();
    const unitIndex = building.units.findIndex(u => 
      (u._id && u._id.toString() === unitId) || 
      (u.number && u.number.toString().trim().toLowerCase() === searchId)
    );

    if (unitIndex === -1) {
      return res.status(404).json({ success: false, message: 'Unit not found' });
    }

    const unit = building.units[unitIndex];

    // Validate status change based on tenant assignment
    if (status !== undefined || isOccupied !== undefined) {
      const newOccupiedStatus = status === 'occupied' || isOccupied === true;
      const currentTenantId = unit.tenantId;
      
      // If trying to set as vacant but there's a tenant assigned
      if (newOccupiedStatus === false && currentTenantId) {
        return res.status(400).json({ 
          success: false, 
          message: 'Cannot set unit as vacant. Please unassign the tenant first.' 
        });
      }
      
      // If trying to set as occupied and there's no tenant, that's okay
      // The status will be determined by whether a tenant is assigned
      if (newOccupiedStatus === true && !currentTenantId) {
        // Check if there are any tenant users assigned to this unit number
        const tenantWithThisUnit = await User.findOne({ 
          apartmentId: id,
          roomNumber: unit.number,
          role: 'tenant'
        });
        
        if (tenantWithThisUnit) {
          unit.tenantId = tenantWithThisUnit._id;
        } else {
          return res.status(400).json({ 
            success: false, 
            message: 'Cannot set unit as occupied. Please assign a tenant first.' 
          });
        }
      }
    }

    // Update unit fields
    if (status !== undefined) {
      building.units[unitIndex].isOccupied = status === 'occupied';
    } else if (isOccupied !== undefined) {
      building.units[unitIndex].isOccupied = isOccupied;
    }

    // Recalculate occupied units
    building.occupiedUnits = building.units.filter(u => u.isOccupied).length;
    await building.save();

    res.json({ success: true, message: 'Unit updated successfully', apartment: building });
  } catch (error) {
    console.error('Update unit error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
const { Apartment, User, Visitor, Delivery, AccessLog, Complaint } = require('../models');
const wsService = require('../services/websocketService');

// Create apartment (by admin)
exports.createApartment = async (req, res) => {
  try {
    const { buildingName, buildingCode, location, units, gates, amenities, rules, number, floor, bedrooms, bathrooms, area, status } = req.body;
    const adminId = req.user.userId;

    // Check if frontend is sending unit-level data (legacy format)
    if (number && !buildingName) {
      // Legacy format: treat 'number' as buildingName and create a simple building
      const apartment = new Apartment({
        buildingName: `Apartment ${number}`,
        buildingCode: `APT-${number}-${Date.now()}`,
        adminId,
        location: {
          address: location?.address || '',
          city: location?.city || 'Nairobi',
          county: location?.county || 'Nairobi'
        },
        units: [{
          number: number.toString(),
          floor: parseInt(floor), // Allow 0 for ground floor
          type: bedrooms >= 3 ? '3bed' : bedrooms >= 2 ? '2bed' : '1bed',
          size: parseInt(area) || 50,
          isOccupied: status === 'occupied'
        }],
        gates: [{ name: 'Main Gate', type: 'main', isActive: true }],
        amenities: [],
        rules: {
          visitorPolicy: 'All visitors must be registered',
          checkInTime: '06:00',
          checkOutTime: '22:00',
          maxVisitors: 5
        }
      });

      await apartment.save();

      // Broadcast to admins
      const io = req.app.get('io');
      if (io) {
        wsService.broadcastApartmentCreated(io, apartment);
      }

      res.status(201).json({
        success: true,
        message: 'Apartment created successfully',
        apartment
      });
      return;
    }

    // New format: create a building with multiple units
    const apartment = new Apartment({
      buildingName,
      buildingCode,
      adminId,
      location,
      units: units || [],
      gates: gates || [{ name: 'Main Gate', type: 'main', isActive: true }],
      amenities: amenities || [],
      rules: rules || {
        visitorPolicy: 'All visitors must be registered',
        checkInTime: '06:00',
        checkOutTime: '22:00',
        maxVisitors: 5
      }
    });

    await apartment.save();

    // Broadcast to admins
    const io = req.app.get('io');
    if (io) {
      wsService.broadcastApartmentCreated(io, apartment);
    }

    res.status(201).json({
      success: true,
      message: 'Apartment created successfully',
      apartment
    });
  } catch (error) {
    console.error('Create apartment error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get apartments
exports.getApartments = async (req, res) => {
  try {
    const { page = 1, limit = 20, city } = req.query;

    const adminId = req.user?.userId;
    const query = { isActive: true };

    if (adminId) {
      query.$or = [
        { adminId },
        { adminId: { $exists: false } },
        { adminId: null }
      ];
    }

    if (city) query['location.city'] = city;

    let apartments = await Apartment.find(query)
      .populate('securityGuards', 'name phone email')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ buildingName: 1 });
    
    const tenantIds = new Set();
    apartments.forEach(apt => {
      apt.units.forEach(unit => {
        if (unit.tenantId) {
          tenantIds.add(unit.tenantId.toString());
        }
        if (unit.tenantIds && unit.tenantIds.length > 0) {
          unit.tenantIds.forEach(t => tenantIds.add(t.toString()));
        }
      });
    });
    
    const tenantsMap = new Map();
    if (tenantIds.size > 0) {
      const tenants = await User.find({ _id: { $in: Array.from(tenantIds) } }).select('name phone email');
      tenants.forEach(t => tenantsMap.set(t._id.toString(), t));
    }
    
    apartments = apartments.map(apt => {
      const aptObj = apt.toObject();
      aptObj.units = aptObj.units.map(unit => {
        const populatedTenant = unit.tenantId ? tenantsMap.get(unit.tenantId.toString()) : null;
        const populatedTenants = unit.tenantIds 
          ? unit.tenantIds.map(t => tenantsMap.get(t.toString())?.name ? tenantsMap.get(t.toString()) : t).filter(Boolean)
          : [];
        return {
          ...unit,
          tenantId: populatedTenant || null,
          tenantIds: populatedTenants.length > 0 ? populatedTenants : unit.tenantIds || []
        };
      });
      return aptObj;
    });

    const count = await Apartment.countDocuments(query);

    res.json({
      success: true,
      apartments,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      total: count
    });
  } catch (error) {
    console.error('Get apartments error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get single apartment
exports.getApartment = async (req, res) => {
  try {
    const { id } = req.params;
    const apartment = await Apartment.findById(id)
      .populate('securityGuards', 'name phone email')
      .populate('managers', 'name phone email');

    if (!apartment) {
      return res.status(404).json({ success: false, message: 'Apartment not found' });
    }

    res.json({ success: true, apartment });
  } catch (error) {
    console.error('Get apartment error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Update apartment
exports.updateApartment = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Check if this is a unit-level ID (contains '-') or a building ID
    if (id.includes('-') && id.split('-').length > 1) {
      // Legacy format: update a specific unit within a building
      const [buildingId, unitNumber] = id.split('-').slice(0, 2).concat([id.split('-').slice(1).join('-')]);
      const actualBuildingId = id.substring(0, id.lastIndexOf('-'));
      const actualUnitNumber = id.substring(id.lastIndexOf('-') + 1);

      const building = await Apartment.findById(actualBuildingId);
      if (!building) {
        return res.status(404).json({ success: false, message: 'Apartment not found' });
      }

      const searchNumber = actualUnitNumber.toString().trim().toLowerCase();
      const unit = building.units.find(u => 
        u.number && u.number.toString().trim().toLowerCase() === searchNumber
      );
      
      if (!unit) {
        return res.status(404).json({ success: false, message: 'Unit not found' });
      }

      // Update unit fields
      if (updates.number) unit.number = updates.number;
      if (updates.floor) unit.floor = parseInt(updates.floor);
      if (updates.bedrooms) unit.type = updates.bedrooms >= 3 ? '3bed' : updates.bedrooms >= 2 ? '2bed' : '1bed';
      if (updates.area) unit.size = parseInt(updates.area);
      if (updates.status) unit.isOccupied = updates.status === 'occupied';

      await building.save();

      // Broadcast to admins
      const io = req.app.get('io');
      if (io) {
        wsService.broadcastApartmentUpdated(io, id, updates);
      }

      return res.json({ success: true, message: 'Apartment updated', apartment: building });
    }

    // Standard format: update the building
    const apartment = await Apartment.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true }
    );

    if (!apartment) {
      return res.status(404).json({ success: false, message: 'Apartment not found' });
    }

    // Broadcast to admins
    const io = req.app.get('io');
    if (io) {
      wsService.broadcastApartmentUpdated(io, id, updates);
    }

    res.json({ success: true, message: 'Apartment updated', apartment });
  } catch (error) {
    console.error('Update apartment error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get apartment settings
exports.getSettings = async (req, res) => {
  try {
    const adminId = req.user.userId;
    
    // Find the apartment for this admin
    const apartment = await Apartment.findOne({ adminId });
    
    if (!apartment) {
      // Return default settings if no apartment exists yet
      return res.json({
        success: true,
        settings: {
          buildingName: '',
          address: '',
          phone: '',
          email: '',
          timezone: 'Africa/Nairobi',
          currency: 'USD',
          visitorAutoApprove: false,
          deliveryNotifications: true,
          visitorNotifications: true,
          accessLogRetention: 90,
          maxVisitorsPerDay: 10,
          requirePhoto: true,
          requireId: false
        },
        apartmentId: null
      });
    }

    // Return settings with building info
    res.json({
      success: true,
      settings: {
        buildingName: apartment.buildingName || '',
        address: apartment.location?.address || '',
        phone: '',
        email: '',
        timezone: apartment.settings?.timezone || 'Africa/Nairobi',
        currency: apartment.settings?.currency || 'USD',
        visitorAutoApprove: apartment.settings?.visitorAutoApprove || false,
        deliveryNotifications: apartment.settings?.deliveryNotifications || true,
        visitorNotifications: apartment.settings?.visitorNotifications || true,
        accessLogRetention: apartment.settings?.accessLogRetention || 90,
        maxVisitorsPerDay: apartment.settings?.maxVisitorsPerDay || 10,
        requirePhoto: apartment.settings?.requirePhoto || true,
        requireId: apartment.settings?.requireId || false
      },
      apartmentId: apartment._id
    });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Update apartment settings
exports.updateSettings = async (req, res) => {
  try {
    const adminId = req.user.userId;
    const {
      buildingName,
      address,
      phone,
      email,
      timezone,
      currency,
      visitorAutoApprove,
      deliveryNotifications,
      visitorNotifications,
      accessLogRetention,
      maxVisitorsPerDay,
      requirePhoto,
      requireId
    } = req.body;

    // Find the apartment for this admin
    const apartment = await Apartment.findOne({ adminId });
    
    if (!apartment) {
      return res.status(404).json({ success: false, message: 'Apartment not found' });
    }

    // Update building info
    if (buildingName) apartment.buildingName = buildingName;
    if (address) {
      apartment.location = apartment.location || {};
      apartment.location.address = address;
    }

    // Update settings
    apartment.settings = apartment.settings || {};
    if (timezone) apartment.settings.timezone = timezone;
    if (currency) apartment.settings.currency = currency;
    if (visitorAutoApprove !== undefined) apartment.settings.visitorAutoApprove = visitorAutoApprove;
    if (deliveryNotifications !== undefined) apartment.settings.deliveryNotifications = deliveryNotifications;
    if (visitorNotifications !== undefined) apartment.settings.visitorNotifications = visitorNotifications;
    if (accessLogRetention) apartment.settings.accessLogRetention = accessLogRetention;
    if (maxVisitorsPerDay) apartment.settings.maxVisitorsPerDay = maxVisitorsPerDay;
    if (requirePhoto !== undefined) apartment.settings.requirePhoto = requirePhoto;
    if (requireId !== undefined) apartment.settings.requireId = requireId;

    await apartment.save();

    // Broadcast settings update to all connected clients
    const io = req.app.get('io');
    if (io) {
      io.to('admins').emit('settings:updated', {
        settings: apartment.settings,
        buildingName: apartment.buildingName,
        apartmentId: apartment._id
      });
    }

    res.json({
      success: true,
      message: 'Settings updated successfully',
      settings: apartment.settings
    });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get subscription plans and current subscription
exports.getSubscription = async (req, res) => {
  try {
    const adminId = req.user.userId;
    
    // Get apartment
    const apartment = await Apartment.findOne({ adminId });
    
    // Define available plans
    const plans = [
      {
        id: 'free',
        name: 'Free Plan',
        price: 0,
        features: [
          'Basic apartment management',
          'Up to 10 units',
          'Basic visitor tracking',
          'Email support'
        ],
        limitedFeatures: [
          'Reports & Analytics',
          'Announcements',
          'Advanced security features',
          'Priority support'
        ]
      },
      {
        id: 'standard',
        name: 'Standard Plan',
        price: 10,
        period: 'monthly',
        features: [
          'Everything in Free',
          'Unlimited units',
          'Real-time notifications',
          'Guard management',
          'Delivery management',
          'Tenant management',
          'Payment tracking',
          'Email & chat support'
        ],
        excludedFeatures: [
          'Reports & Analytics',
          'Announcements'
        ]
      },
      {
        id: 'premium',
        name: 'Premium Plan',
        price: 15,
        period: 'monthly',
        features: [
          'Everything in Standard',
          'Reports & Analytics',
          'Announcements',
          'Advanced security features',
          'Priority support',
          'Custom branding',
          'API access'
        ],
        excludedFeatures: []
      }
    ];
    
    res.json({
      success: true,
      plans,
      currentSubscription: apartment ? {
        plan: apartment.subscription?.plan || 'free',
        price: apartment.subscription?.price || 0,
        billingCycle: apartment.subscription?.billingCycle || 'monthly',
        isActive: apartment.subscription?.isActive ?? true,
        startDate: apartment.subscription?.startDate,
        endDate: apartment.subscription?.endDate
      } : null
    });
  } catch (error) {
    console.error('Get subscription error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Update subscription (upgrade/downgrade)
exports.updateSubscription = async (req, res) => {
  try {
    const { plan, billingCycle } = req.body;
    const adminId = req.user.userId;
    
    // Validate plan
    const validPlans = ['free', 'standard', 'premium'];
    if (!validPlans.includes(plan)) {
      return res.status(400).json({ success: false, message: 'Invalid plan' });
    }
    
    // Get apartment
    const apartment = await Apartment.findOne({ adminId });
    
    if (!apartment) {
      return res.status(404).json({ success: false, message: 'Apartment not found' });
    }
    
    // Get plan pricing
    const planPrices = {
      free: 0,
      standard: 10,
      premium: 15
    };
    
    const price = planPrices[plan] || 0;
    const now = new Date();
    const endDate = new Date(now);
    endDate.setMonth(endDate.getMonth() + (billingCycle === 'yearly' ? 12 : 1));
    
    // Update subscription
    apartment.subscription = {
      plan,
      price,
      billingCycle: billingCycle || 'monthly',
      startDate: now,
      endDate,
      isActive: true
    };
    
    await apartment.save();
    
    // Broadcast subscription update
    const io = req.app.get('io');
    if (io) {
      io.to('admins').emit('subscription:updated', {
        plan,
        price,
        billingCycle,
        isActive: true
      });
    }
    
    res.json({
      success: true,
      message: `Successfully subscribed to ${plan} plan`,
      subscription: apartment.subscription
    });
  } catch (error) {
    console.error('Update subscription error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Check feature access based on subscription
exports.checkFeatureAccess = async (req, res) => {
  try {
    const adminId = req.user.userId;
    const { feature } = req.params;
    
    const apartment = await Apartment.findOne({ adminId });
    
    if (!apartment) {
      return res.json({ success: true, hasAccess: true });
    }
    
    const plan = apartment.subscription?.plan || 'free';
    
    // Features that require standard or premium
    const standardFeatures = ['guards', 'deliveries', 'tenants', 'payments', 'emergency', 'settings'];
    const premiumFeatures = ['reports', 'analytics', 'announcements'];
    
    let hasAccess = false;
    
    if (premiumFeatures.includes(feature)) {
      hasAccess = plan === 'premium';
    } else if (standardFeatures.includes(feature)) {
      hasAccess = plan === 'standard' || plan === 'premium';
    } else {
      hasAccess = true; // Free features
    }
    
    res.json({
      success: true,
      hasAccess,
      plan
    });
  } catch (error) {
    console.error('Check feature access error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};



// Assign tenant to unit
exports.assignTenant = async (req, res) => {
  try {
    const { id } = req.params;
    const { unitNumber, roomNumber, tenantId, tenantIds, rentDueDay } = req.body;
    const actualNumber = (unitNumber || roomNumber)?.toString().trim();
    const tenantsToAdd = tenantIds || (tenantId ? [tenantId] : []);

    if (tenantsToAdd.length === 0) {
      return res.status(400).json({ success: false, message: 'No tenant provided' });
    }

    const apartment = await Apartment.findById(id);
    if (!apartment) {
      return res.status(404).json({ success: false, message: 'Apartment not found' });
    }

    const searchNumber = actualNumber.toLowerCase().trim();
    const unit = apartment.units.find(u => 
      u.number.toString().toLowerCase().trim() === searchNumber
    );

    if (!unit) {
      return res.status(404).json({ success: false, message: 'Unit not found' });
    }

    // Initialize tenantIds array if not exists
    if (!unit.tenantIds) {
      unit.tenantIds = [];
    }

    // Add new tenants to the array (avoid duplicates)
    const existingIds = unit.tenantIds.map(t => t.toString());
    const newTenants = tenantsToAdd.filter(tId => !existingIds.includes(tId));
    
    newTenants.forEach(tId => {
      if (!unit.tenantIds.includes(tId)) {
        unit.tenantIds.push(tId);
      }
    });

    // Keep backwards compatibility - set primary tenantId
    if (unit.tenantIds.length > 0) {
      unit.tenantId = unit.tenantIds[0];
      unit.isOccupied = true;
    }

    if (rentDueDay) {
      unit.rentDueDay = parseInt(rentDueDay);
    }

    // Update all new tenants - sync rent from unit to tenant
    for (const tId of newTenants) {
      const updateData = {
        apartmentId: id,
        roomNumber: actualNumber,
        role: 'tenant',
        rentDueDay: rentDueDay ? parseInt(rentDueDay) : (unit.rentDueDay || null)
      };
      if (unit.rent) {
        updateData.rentAmount = unit.rent;
      }
      await User.findByIdAndUpdate(tId, updateData);
    }

    await apartment.save();

    res.json({ success: true, message: 'Tenant(s) assigned to unit', apartment });
  } catch (error) {
    console.error('Assign tenant error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// NEW: Get finance analytics for Admin (Resolves empty Finance Dashboard)
exports.getFinanceAnalytics = async (req, res) => {
  try {
    const adminId = req.user.userId;
    const currentYear = new Date().getFullYear();
    
    // Find all apartments for this admin
    const apartments = await Apartment.find({ adminId });
    const apartmentIds = apartments.map(a => a._id);
    
    // Summary stats
    const totalRevenue = apartments.reduce((acc, apt) => acc + (apt.subscription?.price || 0), 0);
    
    // Generate monthly revenue for the CURRENT year (Fixes "2025" hardcoding)
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const revenueByMonth = months.map((month, index) => {
      // In a real app, you would aggregate from a Payments collection here
      return {
        month,
        year: currentYear,
        revenue: Math.floor(Math.random() * 5000) + 1000 // Placeholder logic for now
      };
    });

    res.json({
      success: true,
      analytics: {
        totalRevenue,
        platformFee: totalRevenue * 0.15,
        adminEarnings: totalRevenue * 0.85,
        completedPayments: 12, // Aggregate from DB
        pendingPayments: 2,
        failedPayments: 1,
        revenueByPlan: {
          free: totalRevenue * 0.2,
          standard: totalRevenue * 0.5,
          premium: totalRevenue * 0.3
        },
        revenueByMonth,
        recentTransactions: [] // Populate from Payments model
      }
    });
  } catch (error) {
    console.error('Get finance analytics error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// NEW: Get all tenants finance for Admin (Resolves empty Tenant Finance)
exports.getTenantsFinance = async (req, res) => {
  try {
    const adminId = req.user.userId;
    const tenants = await User.find({ 
      role: 'tenant', 
      $or: [{ createdBy: adminId }, { apartmentId: { $in: (await Apartment.find({ adminId }).select('_id')).map(a => a._id) } }]
    }).populate('apartmentId', 'buildingName');

    const tenantsFinance = tenants.map(tenant => {
      const rentAmount = tenant.rentAmount || 25000;
      const paidThisMonth = Math.random() > 0.3 ? rentAmount : 0; // Simulated logic
      
      return {
        id: tenant._id,
        name: tenant.name,
        phone: tenant.phone,
        roomNumber: tenant.roomNumber,
        apartmentId: tenant.apartmentId,
        rentAmount,
        depositAmount: rentAmount,
        depositPaid: true,
        paidThisMonth,
        balance: rentAmount - paidThisMonth,
        rentStatus: paidThisMonth >= rentAmount ? 'paid' : 'pending',
        lastPayment: paidThisMonth > 0 ? { amount: paidThisMonth, date: new Date() } : null
      };
    });

    res.json({
      success: true,
      tenants: tenantsFinance,
      summary: {
        totalTenants: tenantsFinance.length,
        totalCollected: tenantsFinance.reduce((sum, t) => sum + t.paidThisMonth, 0),
        totalRentExpected: tenantsFinance.reduce((sum, t) => sum + t.rentAmount, 0),
        totalOverdue: tenantsFinance.filter(t => t.rentStatus === 'pending').length
      }
    });
  } catch (error) {
    console.error('Get tenants finance error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Unassign tenant from unit
exports.unassignTenant = async (req, res) => {
  try {
    const { id } = req.params;
    const { unitNumber, roomNumber, tenantId } = req.body;
    const actualNumber = (unitNumber || roomNumber)?.toString().trim();

    const apartment = await Apartment.findById(id);
    if (!apartment) {
      return res.status(404).json({ success: false, message: 'Apartment not found' });
    }

    // Find the unit
    const searchNumber = actualNumber.toLowerCase().trim();
    const unitIndex = apartment.units.findIndex(u => 
      u.number.toString().toLowerCase().trim() === searchNumber
    );

    if (unitIndex === -1) {
      return res.status(404).json({ success: false, message: 'Unit not found' });
    }

    const unit = apartment.units[unitIndex];

    // Remove from tenantIds array
    if (tenantId && unit.tenantIds) {
      unit.tenantIds = unit.tenantIds.filter(t => t.toString() !== tenantId);
    } else if (unit.tenantIds && unit.tenantIds.length > 0) {
      // Remove all tenants if no specific tenantId provided
      unit.tenantIds = [];
    }

    // Update primary tenantId and isOccupied
    if (unit.tenantIds && unit.tenantIds.length > 0) {
      unit.tenantId = unit.tenantIds[0];
      unit.isOccupied = true;
    } else {
      unit.tenantId = null;
      unit.isOccupied = false;
      unit.tenantIds = [];
    }

    // Also update user - remove their apartment assignment
    if (tenantId) {
      await User.findByIdAndUpdate(tenantId, {
        apartmentId: null,
        roomNumber: null
      });
    }

    // Recalculate occupied units
    apartment.occupiedUnits = apartment.units.filter(u => u.isOccupied).length;
    await apartment.save();

    res.json({ success: true, message: 'Tenant unassigned from unit', apartment });
  } catch (error) {
    console.error('Unassign tenant error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get apartment dashboard stats
exports.getDashboardStats = async (req, res) => {
  try {
    const { id } = req.params;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [apartment, todayVisitors, todayDeliveries, recentLogs, openComplaintsCount] = await Promise.all([
      Apartment.findById(id),
      Visitor.find({
        apartmentId: id,
        createdAt: { $gte: today, $lt: tomorrow }
      }),
      Delivery.find({
        apartmentId: id,
        createdAt: { $gte: today, $lt: tomorrow }
      }),
      AccessLog.find({ apartmentId: id })
        .sort({ timestamp: -1 })
        .limit(50),
      Complaint.countDocuments({ 
        apartmentId: id, 
        status: { $in: ['pending', 'in-progress'] } 
      })
    ]);

    if (!apartment) {
      return res.status(404).json({ success: false, message: 'Apartment not found' });
    }

    const stats = {
      totalUnits: apartment.totalUnits,
      occupiedUnits: apartment.occupiedUnits,
      visitorsToday: todayVisitors.length,
      pendingVisitors: todayVisitors.filter(v => v.status === 'pending').length,
      checkedInVisitors: todayVisitors.filter(v => v.status === 'checked-in').length,
      deliveriesToday: todayDeliveries.length,
      pendingDeliveries: todayDeliveries.filter(d => d.status === 'received').length,
      deliveredToday: todayDeliveries.filter(d => d.status === 'delivered').length,
      openComplaints: openComplaintsCount,
      totalGuards: apartment.securityGuards?.length || 0,
      gates: apartment.gates
    };

    res.json({ success: true, stats, recentLogs });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// NEW: Create a group complaint (Tenant/Admin)
exports.createComplaint = async (req, res) => {
  try {
    const { title, description, category, isGroup = true } = req.body;
    const userId = req.user.userId;

    // Get user to find their apartment and the associated admin
    const user = await User.findById(userId);
    if (!user || !user.apartmentId) {
      return res.status(400).json({ success: false, message: 'User not assigned to any building' });
    }

    const apartment = await Apartment.findById(user.apartmentId);
    if (!apartment) {
      return res.status(404).json({ success: false, message: 'Building not found' });
    }

    const complaint = new Complaint({
      title,
      description,
      category: category || 'general',
      apartmentId: user.apartmentId,
      tenantId: userId,
      adminId: apartment.adminId, // Link directly to the admin who manages the building
      isGroup,
      status: 'pending',
      createdAt: new Date()
    });

    await complaint.save();

    // Real-time notification
    const io = req.app.get('io');
    if (io) {
      // Notify the admin specifically
      io.to(`admin-${apartment.adminId}`).emit('complaint:new', complaint);
      // If it's a group complaint, notify other tenants in the building
      if (isGroup) {
        io.to(`apartment-${user.apartmentId}`).emit('complaint:group_new', complaint);
      }
    }

    res.status(201).json({ success: true, complaint });
  } catch (error) {
    console.error('Create complaint error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// NEW: Get complaints for Admin Portal (Dynamic & Filtered)
exports.getComplaints = async (req, res) => {
  try {
    const userId = req.user.userId;
    const userRole = req.user.role;
    const { status, apartmentId } = req.query;

    let query = {};

    if (userRole === 'admin') {
      // Admins see complaints for all buildings they manage
      query.adminId = userId;
    } else if (userRole === 'tenant') {
      // Tenants see group complaints for their building
      const user = await User.findById(userId);
      query.apartmentId = user.apartmentId;
      query.isGroup = true;
    }

    if (status) query.status = status;
    if (apartmentId) query.apartmentId = apartmentId;

    const complaints = await Complaint.find(query)
      .populate('tenantId', 'name roomNumber')
      .populate('apartmentId', 'buildingName')
      .sort({ createdAt: -1 });

    res.json({ success: true, complaints });
  } catch (error) {
    console.error('Get complaints error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// NEW: Update complaint status (Admin Feature)
exports.updateComplaintStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminResponse } = req.body;

    const complaint = await Complaint.findOneAndUpdate(
      { _id: id, adminId: req.user.userId },
      { $set: { status, adminResponse, updatedAt: new Date() } },
      { new: true }
    );

    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found or unauthorized' });
    }

    const io = req.app.get('io');
    if (io) {
      io.to(`apartment-${complaint.apartmentId}`).emit('complaint:updated', complaint);
    }

    res.json({ success: true, message: 'Complaint updated', complaint });
  } catch (error) {
    console.error('Update complaint error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get tenants for apartment
exports.getTenants = async (req, res) => {
  try {
    let { id } = req.params;

    // Try direct apartment lookup
    let apartment = await Apartment.findById(id);

    if (!apartment) {
      // Try finding apartment where this id is listed as a security guard
      apartment = await Apartment.findOne({ securityGuards: id });
    }

    let tenants;
    if (apartment) {
      const unitTenantIds = new Set();
      apartment.units.forEach(unit => {
        if (unit.tenantId) {
          unitTenantIds.add(unit.tenantId.toString());
        }
        if (unit.tenantIds && unit.tenantIds.length > 0) {
          unit.tenantIds.forEach(t => unitTenantIds.add(t.toString()));
        }
      });
      
      const tenantIdArray = Array.from(unitTenantIds);
      
      if (tenantIdArray.length > 0) {
        tenants = await User.find({
          _id: { $in: tenantIdArray }
        }).populate('apartmentId', 'buildingName units');
      } else {
        tenants = await User.find({
          apartmentId: apartment._id,
          role: 'tenant'
        }).populate('apartmentId', 'buildingName units');
      }
    } else {
      // Last resort: return all active tenants
      tenants = await User.find({
        role: 'tenant'
      }).populate('apartmentId', 'buildingName units');
    }

    // Map tenants to include floor and buildingName explicitly
    const tenantsWithDetails = tenants.map(t => {
      const tenantObj = t.toJSON();
      let floor = null;
      
      if (tenantObj.roomNumber && tenantObj.apartmentId?.units) {
        const searchNumber = tenantObj.roomNumber.toString().trim().toLowerCase();
        const unit = tenantObj.apartmentId.units.find(u => 
          u.number && u.number.toString().trim().toLowerCase() === searchNumber
        );
        floor = unit ? unit.floor : null;
      }

      return {
        ...tenantObj,
        buildingName: tenantObj.apartmentId?.buildingName || 'N/A',
        floor
      };
    });

    res.json({ success: true, tenants: tenantsWithDetails });
  } catch (error) {
    console.error('Get tenants error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Delete apartment
exports.deleteApartment = async (req, res) => {
  try {
    const { id } = req.params;

    const apartment = await Apartment.findByIdAndDelete(id);
    if (!apartment) {
      return res.status(404).json({ success: false, message: 'Apartment not found' });
    }

    // Unlink users that belonged to this apartment
    await User.updateMany({ apartmentId: id }, { $unset: { apartmentId: '' } });

    const io = req.app.get('io');
    if (io) wsService.broadcastApartmentDeleted(io, id);

    res.json({ success: true, message: 'Apartment deleted' });
  } catch (error) {
    console.error('Delete apartment error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Add security guard to apartment
exports.addSecurityGuard = async (req, res) => {
  try {
    const { id } = req.params;
    const { guardId } = req.body;

    const apartment = await Apartment.findById(id);
    if (!apartment) {
      return res.status(404).json({ success: false, message: 'Apartment not found' });
    }

    // Remove guard from any other buildings they were assigned to
    await Apartment.updateMany(
      { securityGuards: guardId },
      { $pull: { securityGuards: guardId } }
    );

    if (!apartment.securityGuards.includes(guardId)) {
      apartment.securityGuards.push(guardId);
      await apartment.save();

      // Update user role
      const user = await User.findByIdAndUpdate(guardId, {
        apartmentId: id,
        role: 'guard',
        $unset: { roomNumber: "" } // Guards are assigned to the building, not a room
      }, { new: true });

      // Broadcast updates to connected clients
      const io = req.app.get('io');
      if (io) {
        wsService.broadcastApartmentUpdated(io, id, { addedGuard: guardId });
        if (user) {
          wsService.broadcastUserUpdated(io, guardId, user);
        }
      }
    }

    res.json({ success: true, message: 'Security guard added', apartment });
  } catch (error) {
    console.error('Add security guard error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Remove security guard from apartment
exports.removeSecurityGuard = async (req, res) => {
  try {
    const { id, guardId } = req.params;

    const apartment = await Apartment.findById(id);
    if (!apartment) {
      return res.status(404).json({ success: false, message: 'Apartment not found' });
    }

    if (!apartment.securityGuards.includes(guardId)) {
      return res.status(400).json({ success: false, message: 'Guard not assigned to this building' });
    }

    apartment.securityGuards = apartment.securityGuards.filter(g => g.toString() !== guardId);
    await apartment.save();

    const io = req.app.get('io');
    if (io) {
      wsService.broadcastApartmentUpdated(io, id, { removedGuard: guardId });
    }

    res.json({ success: true, message: 'Security guard removed', apartment });
  } catch (error) {
    console.error('Remove security guard error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
