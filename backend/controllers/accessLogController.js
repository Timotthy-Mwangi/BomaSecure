const { AccessLog, User, Apartment } = require('../models');

// Get access logs
exports.getAccessLogs = async (req, res) => {
  try {
    const { apartmentId, personType, action, startDate, endDate, page = 1, limit = 50 } = req.query;
    const userRole = req.user.role;
    const userId = req.user.userId;

    const query = {};

    // Get user's apartment for filtering
    const currentUser = await User.findById(userId);
    const userApartmentId = currentUser?.apartmentId;
    
    // Get apartments owned by this admin for strict data isolation
    const userApartments = await Apartment.find({ adminId: userId }).select('_id');
    const userApartmentIds = userApartments.map(a => a._id);

    // Filter based on role - with STRICT data isolation
    if (userRole === 'tenant') {
      if (userApartmentId) {
        query.apartmentId = userApartmentId;
        query.roomNumber = currentUser.roomNumber;
      }
    } else if (userRole === 'guard') {
      // Guards can only see logs from their assigned property OR apartments they manage
      if (userApartmentIds.length > 0) {
        query.apartmentId = { $in: userApartmentIds };
      } else if (userApartmentId) {
        query.apartmentId = userApartmentId;
      }
    } else if (userRole === 'admin') {
      // Admins can only see logs from their property - STRICT
      if (userApartmentIds.length > 0) {
        query.apartmentId = { $in: userApartmentIds };
      } else if (userApartmentId) {
        query.apartmentId = userApartmentId;
      } else {
        // No apartments and no apartmentId - return empty
        return res.json({
          success: true,
          logs: [],
          totalPages: 0,
          currentPage: page,
          total: 0
        });
      }
    } else if (apartmentId) {
      query.apartmentId = apartmentId;
    }

    if (personType) query.personType = personType;
    if (action) query.action = action;

    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    const logs = await AccessLog.find(query)
      .populate('verifiedBy', 'name')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ timestamp: -1 });

    const count = await AccessLog.countDocuments(query);

    res.json({
      success: true,
      logs,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      total: count
    });
  } catch (error) {
    console.error('Get access logs error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get access log by ID
exports.getAccessLog = async (req, res) => {
  try {
    const { id } = req.params;
    const log = await AccessLog.findById(id)
      .populate('verifiedBy', 'name')
      .populate('relatedVisitorId')
      .populate('relatedDeliveryId');

    if (!log) {
      return res.status(404).json({ success: false, message: 'Access log not found' });
    }

    res.json({ success: true, log });
  } catch (error) {
    console.error('Get access log error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Create access log entry (manual or automatic)
exports.createAccessLog = async (req, res) => {
  try {
    const { personId, personType, personName, personPhone, action, apartmentId, roomNumber, gateNumber, method, notes } = req.body;
    const guardId = req.user?.userId;

    const log = new AccessLog({
      personId,
      personType,
      personName,
      personPhone,
      action,
      apartmentId,
      roomNumber,
      gateNumber: gateNumber || 'main',
      verifiedBy: guardId,
      method: method || 'manual',
      notes,
      timestamp: new Date()
    });

    await log.save();

    // Emit real-time event to guards and admins
    const io = req.app.get('io');
    if (io) {
      // Broadcast to all guards in the apartment
      io.to(`apartment-guards-${apartmentId}`).emit('access:new', {
        log,
        timestamp: new Date()
      });
      
      // Broadcast to all guards
      io.to('guards').emit('access:new', {
        log,
        timestamp: new Date()
      });
      
      // Broadcast to admins
      io.to('admins').emit('access:new', {
        log,
        timestamp: new Date()
      });

      // If it's a visitor or delivery, notify the tenant
      if (personType === 'visitor' || personType === 'delivery') {
        const { User } = require('../models');
        const tenant = await User.findOne({ apartmentId, roomNumber, role: 'tenant' });
        if (tenant) {
          io.to(`tenant-${tenant._id}`).emit('access:new', {
            log,
            timestamp: new Date()
          });
        }
      }
    }

    res.status(201).json({
      success: true,
      message: 'Access log created',
      log
    });
  } catch (error) {
    console.error('Create access log error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get real-time access events (for dashboard)
exports.getRealtimeEvents = async (req, res) => {
  try {
    const { apartmentId, limit = 20 } = req.query;
    const userRole = req.user.role;
    const userId = req.user.userId;

    let query = {};

    if (userRole === 'tenant') {
      const user = await User.findById(userId);
      if (user?.apartmentId) {
        query.apartmentId = user.apartmentId;
      }
    } else if (apartmentId) {
      query.apartmentId = apartmentId;
    }

    // Get last hour events
    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);
    query.timestamp = { $gte: oneHourAgo };

    const logs = await AccessLog.find(query)
      .populate('verifiedBy', 'name')
      .sort({ timestamp: -1 })
      .limit(limit);

    res.json({ success: true, logs });
  } catch (error) {
    console.error('Get realtime events error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get access statistics
exports.getAccessStats = async (req, res) => {
  try {
    const { apartmentId, period = 'today' } = req.query;
    const userRole = req.user.role;
    const userId = req.user.userId;

    let query = {};
    let startDate, endDate;

    const now = new Date();
    
    switch (period) {
      case 'today':
        startDate = new Date(now.setHours(0, 0, 0, 0));
        endDate = new Date(now.setHours(23, 59, 59, 999));
        break;
      case 'week':
        startDate = new Date(now.setDate(now.getDate() - 7));
        endDate = new Date();
        break;
      case 'month':
        startDate = new Date(now.setMonth(now.getMonth() - 1));
        endDate = new Date();
        break;
      default:
        startDate = new Date(now.setHours(0, 0, 0, 0));
        endDate = new Date(now.setHours(23, 59, 59, 999));
    }

    query.timestamp = { $gte: startDate, $lt: endDate };

    if (userRole === 'tenant') {
      const user = await User.findById(userId);
      if (user?.apartmentId) {
        query.apartmentId = user.apartmentId;
      }
    } else if (apartmentId) {
      query.apartmentId = apartmentId;
    }

    const logs = await AccessLog.find(query);
    
    const stats = {
      total: logs.length,
      entries: logs.filter(l => l.action === 'entry').length,
      exits: logs.filter(l => l.action === 'exit').length,
      denied: logs.filter(l => l.action === 'denied').length,
      byPersonType: {
        tenant: logs.filter(l => l.personType === 'tenant').length,
        visitor: logs.filter(l => l.personType === 'visitor').length,
        delivery: logs.filter(l => l.personType === 'delivery').length
      },
      byMethod: {
        qr: logs.filter(l => l.method === 'qr').length,
        manual: logs.filter(l => l.method === 'manual').length,
        remote: logs.filter(l => l.method === 'remote').length
      }
    };

    // Hourly distribution for today
    if (period === 'today') {
      const hourlyStats = {};
      logs.forEach(log => {
        const hour = new Date(log.timestamp).getHours();
        hourlyStats[hour] = (hourlyStats[hour] || 0) + 1;
      });
      stats.hourlyDistribution = hourlyStats;
    }

    res.json({ success: true, stats });
  } catch (error) {
    console.error('Get access stats error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Delete access log (admin only) - with data isolation
exports.deleteAccessLog = async (req, res) => {
  try {
    const { id } = req.params;
    const userRole = req.user.role;
    const userId = req.user.userId;

    // Get the log first to check ownership
    const log = await AccessLog.findById(id);

    if (!log) {
      return res.status(404).json({ success: false, message: 'Access log not found' });
    }

    // Get apartments owned by this admin for strict data isolation
    const { Apartment } = require('../models');
    const userApartments = await Apartment.find({ adminId: userId }).select('_id');
    const userApartmentIds = userApartments.map(a => a._id);

    // Apply data isolation based on role
    let canDelete = false;
    
    if (userRole === 'admin') {
      // Admins can only delete logs from their property
      if (userApartmentIds.length > 0) {
        canDelete = log.apartmentId && userApartmentIds.some(id => id.toString() === log.apartmentId.toString());
      } else {
        // No apartments - check if log belongs to admin's apartmentId from user record
        const { User } = require('../models');
        const currentUser = await User.findById(userId);
        canDelete = currentUser?.apartmentId && log.apartmentId?.toString() === currentUser.apartmentId.toString();
      }
    } else if (userRole === 'guard') {
      // Guards can only delete logs they created
      canDelete = log.verifiedBy?.toString() === userId;
    }

    if (!canDelete) {
      return res.status(403).json({ success: false, message: 'You can only delete access logs from your property' });
    }

    await AccessLog.findByIdAndDelete(id);

    res.json({ success: true, message: 'Access log deleted' });
  } catch (error) {
    console.error('Delete access log error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
