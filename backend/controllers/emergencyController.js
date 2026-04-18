const { Emergency, User, Apartment, Notification } = require('../models');

// Get all emergencies (admin) - with data isolation
exports.getAllEmergencies = async (req, res) => {
  try {
    const { status, severity, page = 1, limit = 20 } = req.query;
    const adminId = req.user.userId;
    const adminRole = req.user.role;
    const userApartmentId = req.user.apartmentId; // Directly from JWT token
    
    // Get apartments owned by this admin for strict data isolation
    const adminApartments = await Apartment.find({ adminId }).select('_id');
    const adminApartmentIds = adminApartments.map(a => a._id);
    
    const query = {};
    if (status) query.status = status;
    if (severity) query.severity = severity;
    
    // STRICT Data isolation: Only show emergencies from admin's property
    // Priority: 1) apartments owned by admin, 2) user's apartmentId, 3) nothing
    if (adminApartmentIds.length > 0) {
      query.apartmentId = { $in: adminApartmentIds };
    } else if (userApartmentId) {
      query.apartmentId = userApartmentId;
    } else {
      // Admin has no apartments and no apartmentId - return empty
      return res.json({
        success: true,
        emergencies: [],
        totalPages: 0,
        currentPage: page,
        total: 0,
        stats: {
          active: 0,
          resolvedToday: 0,
          total: 0
        }
      });
    }

    const emergencies = await Emergency.find(query)
      .populate('reportedBy', 'name phone email')
      .populate('assignedTo', 'name phone email')
      .populate('apartmentId', 'buildingName')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const count = await Emergency.countDocuments(query);

    // Get stats (filtered by admin's property)
    const statsQuery = { ...query };
    const activeCount = await Emergency.countDocuments({ ...statsQuery, status: 'active' });
    const resolvedToday = await Emergency.countDocuments({ 
      ...statsQuery,
      status: 'resolved',
      resolvedAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) }
    });

    res.json({
      success: true,
      emergencies,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      total: count,
      stats: {
        active: activeCount,
        resolvedToday,
        total: count
      }
    });
  } catch (error) {
    console.error('Get emergencies error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get emergencies for a specific apartment/guard
exports.getEmergenciesByApartment = async (req, res) => {
  try {
    const { apartmentId } = req.params;
    const { status } = req.query;
    
    const query = { apartmentId };
    if (status) query.status = status;

    const emergencies = await Emergency.find(query)
      .populate('reportedBy', 'name phone')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      emergencies
    });
  } catch (error) {
    console.error('Get apartment emergencies error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get single emergency - with data isolation
exports.getEmergency = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const userRole = req.user.role;
    const userApartmentId = req.user.apartmentId;
    
    const emergency = await Emergency.findById(id)
      .populate('reportedBy', 'name phone email')
      .populate('assignedTo', 'name phone email')
      .populate('apartmentId', 'buildingName');

    if (!emergency) {
      return res.status(404).json({ success: false, message: 'Emergency not found' });
    }

    // Data isolation: Verify the emergency belongs to admin's property
    if (userRole === 'admin') {
      const { Apartment } = require('../models');
      const adminApartments = await Apartment.find({ adminId: userId }).select('_id');
      const adminApartmentIds = adminApartments.map(a => a._id);
      
      const belongsToAdmin = adminApartmentIds.length > 0 
        ? emergency.apartmentId && adminApartmentIds.some(id => id.toString() === emergency.apartmentId.toString())
        : emergency.apartmentId?.toString() === userApartmentId?.toString();
      
      if (!belongsToAdmin) {
        return res.status(403).json({ success: false, message: 'You can only view emergencies from your property' });
      }
    }

    res.json({ success: true, emergency });
  } catch (error) {
    console.error('Get emergency error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Report new emergency
exports.reportEmergency = async (req, res) => {
  try {
    const { type, severity, location, description, apartmentId } = req.body;
    const userId = req.user.userId;

    // Handle uploaded photos
    const photos = req.files ? req.files.map(file => `/uploads/emergencies/${file.filename}`) : [];

    // DIAGNOSTIC LOG: Log received emergency data
    console.log('[EmergencyController] Received emergency report:', {
      type,
      severity,
      location,
      description,
      apartmentId,
      userId,
      photos: photos.length
    });

    const emergency = new Emergency({
      type,
      severity: severity || 'medium',
      location,
      description,
      reportedBy: userId,
      apartmentId,
      status: 'active',
      attachments: photos
    });

    await emergency.save();
    await emergency.populate('reportedBy', 'name phone email');

    // Notify admins and guards of THIS property only (Data Isolation)
    const admins = await User.find({ 
      role: 'admin', 
      $or: [
        { apartmentId },
        { _id: req.user.userId } // Include the reporter if they are an admin
      ]
    });
    const guards = await User.find({ 
      role: 'guard', 
      apartmentId 
    });
    
    // Get tenants in the apartment if applicable
    let tenants = []; 
    if (apartmentId) {
      tenants = await User.find({ role: 'tenant', apartmentId });
    }
    
    const allRecipients = [...admins, ...guards, ...tenants];
    const notifications = allRecipients.map(user => ({
      userId: user._id,
      title: `Emergency: ${type}`,
      message: `${description} - Reported by ${emergency.reportedBy.name}`,
      type: 'emergency',
      isRead: false
    }));
    
    if (notifications.length > 0) {
      await Notification.insertMany(notifications);
    }

    // Emit socket event for real-time notification
    const io = req.app.get('io');
    if (io) {
      // DIAGNOSTIC LOG: Log socket event emission
      console.log('[EmergencyController] Emitting socket event:', {
        apartmentId,
        hasApartmentId: !!apartmentId,
        roomName: apartmentId ? `apartment-${apartmentId}` : 'none',
        emergencyId: emergency._id
      });
      
      // Emit to specific apartment if applicable
      if (apartmentId) {
        io.to(`apartment-${apartmentId}`).emit('emergency:new', { emergency });
        console.log(`[EmergencyController] Emitted emergency:new to apartment-${apartmentId}`);
      } else {
        console.log('[EmergencyController] No apartmentId - socket event NOT emitted to apartment room');
      }
    }

    res.status(201).json({
      success: true,
      message: 'Emergency reported successfully',
      emergency
    });
  } catch (error) {
    console.error('Report emergency error:', error);
    // Handle Mongoose validation errors specifically (e.g., invalid enum value)
    if (error.name === 'ValidationError') {
      return res.status(400).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Update emergency status - with data isolation
exports.updateEmergency = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, assignedTo, resolutionNotes } = req.body;
    const userId = req.user.userId;
    const userRole = req.user.role;
    const userApartmentId = req.user.apartmentId;

    const emergency = await Emergency.findById(id);

    if (!emergency) {
      return res.status(404).json({ success: false, message: 'Emergency not found' });
    }

    // Data isolation: Verify the emergency belongs to admin's property
    if (userRole === 'admin') {
      const { Apartment } = require('../models');
      const adminApartments = await Apartment.find({ adminId: userId }).select('_id');
      const adminApartmentIds = adminApartments.map(a => a._id);
      
      const belongsToAdmin = adminApartmentIds.length > 0 
        ? emergency.apartmentId && adminApartmentIds.some(id => id.toString() === emergency.apartmentId.toString())
        : emergency.apartmentId?.toString() === userApartmentId?.toString();
      
      if (!belongsToAdmin) {
        return res.status(403).json({ success: false, message: 'You can only update emergencies from your property' });
      }
    }

    if (status) emergency.status = status;
    if (assignedTo) emergency.assignedTo = assignedTo;
    if (resolutionNotes) emergency.resolutionNotes = resolutionNotes;
    
    if (status === 'resolved') {
      emergency.resolvedAt = new Date();
      emergency.resolvedBy = userId;
    }

    await emergency.save();
    await emergency.populate('reportedBy', 'name phone email');
    await emergency.populate('assignedTo', 'name phone email');

    // Emit socket event for real-time update
    const io = req.app.get('io');
    if (io) {
      if (status === 'resolved') {
        io.to('admins').emit('emergency:resolved', { emergency, emergencyId: emergency._id });
        io.to('guards').emit('emergency:resolved', { emergency, emergencyId: emergency._id });
        io.to('tenants').emit('emergency:resolved', { emergency, emergencyId: emergency._id });
      }
      io.to('admins').emit('emergency:updated', { emergency });
      io.to('guards').emit('emergency:updated', { emergency });
    }

    res.json({
      success: true,
      message: 'Emergency updated successfully',
      emergency
    });
  } catch (error) {
    console.error('Update emergency error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Resolve emergency - with data isolation
exports.resolveEmergency = async (req, res) => {
  try {
    const { id } = req.params;
    const { resolutionNotes } = req.body;
    const userId = req.user.userId;
    const userRole = req.user.role;
    const userApartmentId = req.user.apartmentId;

    const emergency = await Emergency.findById(id);

    if (!emergency) {
      return res.status(404).json({ success: false, message: 'Emergency not found' });
    }

    // Data isolation: Verify the emergency belongs to admin's property
    if (userRole === 'admin') {
      const { Apartment } = require('../models');
      const adminApartments = await Apartment.find({ adminId: userId }).select('_id');
      const adminApartmentIds = adminApartments.map(a => a._id);
      
      const belongsToAdmin = adminApartmentIds.length > 0 
        ? emergency.apartmentId && adminApartmentIds.some(id => id.toString() === emergency.apartmentId.toString())
        : emergency.apartmentId?.toString() === userApartmentId?.toString();
      
      if (!belongsToAdmin) {
        return res.status(403).json({ success: false, message: 'You can only resolve emergencies from your property' });
      }
    }

    emergency.status = 'resolved';
    emergency.resolvedAt = new Date();
    emergency.resolvedBy = userId;
    emergency.resolutionNotes = resolutionNotes;

    await emergency.save();
    await emergency.populate('reportedBy', 'name phone email');

    // Emit socket event for real-time update
    const io = req.app.get('io');
    if (io) {
      io.to('admins').emit('emergency:resolved', { emergency, emergencyId: emergency._id });
      io.to('guards').emit('emergency:resolved', { emergency, emergencyId: emergency._id });
      io.to('tenants').emit('emergency:resolved', { emergency, emergencyId: emergency._id });
      if (emergency.apartmentId) {
        io.to(`apartment-${emergency.apartmentId}`).emit('emergency:resolved', { emergency, emergencyId: emergency._id });
      }
    }

    res.json({
      success: true,
      message: 'Emergency resolved successfully',
      emergency
    });
  } catch (error) {
    console.error('Resolve emergency error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get emergency stats - with data isolation
exports.getEmergencyStats = async (req, res) => {
  try {
    const { apartmentId } = req.query;
    const userRole = req.user.role;
    const userId = req.user.userId;
    const userApartmentId = req.user.apartmentId;
    
    // Get apartments owned by this admin for strict data isolation
    const adminApartments = await Apartment.find({ adminId: userId }).select('_id');
    const adminApartmentIds = adminApartments.map(a => a._id);
    
    // Build query with data isolation
    let query = {};
    
    if (userRole === 'admin') {
      // Admins can only see stats from their property
      if (adminApartmentIds.length > 0) {
        query.apartmentId = { $in: adminApartmentIds };
      } else if (userApartmentId) {
        query.apartmentId = userApartmentId;
      } else {
        // No apartments - return empty stats
        return res.json({
          success: true,
          stats: {
            active: 0,
            critical: 0,
            resolvedToday: 0,
            totalToday: 0,
            total: 0,
            securityStaff: 0
          }
        });
      }
    } else if (userRole === 'guard') {
      // Guards can see stats from their assigned property
      if (adminApartmentIds.length > 0) {
        query.apartmentId = { $in: adminApartmentIds };
      } else if (userApartmentId) {
        query.apartmentId = userApartmentId;
      }
    } else if (apartmentId) {
      // Allow specific apartmentId for tenants
      query.apartmentId = apartmentId;
    }

    const activeCount = await Emergency.countDocuments({ ...query, status: 'active' });
    const criticalCount = await Emergency.countDocuments({ ...query, status: 'active', severity: 'critical' });
    const resolvedToday = await Emergency.countDocuments({
      ...query,
      status: 'resolved',
      resolvedAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) }
    });
    const totalToday = await Emergency.countDocuments({
      ...query,
      createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) }
    });
    const totalCount = await Emergency.countDocuments(query);

    // Get security staff count - filtered by admin's property
    let guardQuery = { role: 'guard', isActive: true };
    if (adminApartmentIds.length > 0) {
      guardQuery.apartmentId = { $in: adminApartmentIds };
    } else if (userApartmentId) {
      guardQuery.apartmentId = userApartmentId;
    }
    const securityCount = await User.countDocuments(guardQuery);

    res.json({
      success: true,
      stats: {
        active: activeCount,
        critical: criticalCount,
        resolvedToday,
        totalToday,
        total: totalCount,
        securityStaff: securityCount
      }
    });
  } catch (error) {
    console.error('Get emergency stats error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
