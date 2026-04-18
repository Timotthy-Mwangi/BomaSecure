const { Visitor, User, AccessLog, Notification, Apartment } = require('../models');
const { qrCodeService, smsService } = require('../services');
const crypto = require('crypto');

// Create new visitor (by guard or tenant pre-approval)
exports.createVisitor = async (req, res) => {
  try {
    const qrToken = crypto.randomBytes(24).toString('base64url');
    const { name, phone, email, idNumber, vehiclePlate, purpose, hostTenantId, roomNumber, expectedArrival, notes, sendNotification } = req.body;

    // Verify host tenant exists
    const host = await User.findById(hostTenantId);
    if (!host || host.role !== 'tenant') {
      return res.status(400).json({ success: false, message: 'Invalid host tenant' });
    }

    let apartment = host.apartmentId ? await Apartment.findById(host.apartmentId) : null;
    if (!apartment) {
      // Fallback: find apartment created by the same admin who created this tenant
      apartment = await Apartment.findOne(
        host.createdBy ? { adminId: host.createdBy } : {}
      );
    }
    if (!apartment) {
      return res.status(400).json({ success: false, message: 'Apartment not found' });
    }

    const visitor = new Visitor({
      name,
      phone,
      idNumber,
      vehiclePlate,
      purpose,
      hostTenantId,
      apartmentId: apartment._id,
      roomNumber: roomNumber || host.roomNumber,
      expectedArrival,
      notes,
      createdBy: req.user?.userId,
      status: 'pending',
      qrCode: qrToken
    });

    await visitor.save();

    // Generate QR code for the visitor
    const qrData = await qrCodeService.generateVisitorQR(visitor);
    
    // Update visitor with QR code image data (for frontend display)
    visitor.qrCodeImage = qrData.qrImage;
    await visitor.save();

    // Create notification for tenant
    const notification = new Notification({
      userId: hostTenantId,
      type: 'visitor_arrival',
      title: 'New Visitor Request',
      message: `${name} is requesting to visit you. Purpose: ${purpose}`,
      data: {
        visitorId: visitor._id,
        apartmentId: apartment._id,
        actionUrl: `/tenant/visitors/${visitor._id}`,
        qrCode: qrData
      },
      priority: 'high'
    });
    await notification.save();

    // Emit socket events
    const io = req.app.get('io');
    if (io) {
      // Emit visitor arrival event to tenant
      io.to(`tenant-${hostTenantId}`).emit('visitor:arrived', {
        visitor,
        notification: notification.toJSON(),
        qrCode: qrData
      });
      
      // Emit generic notification event for real-time updates
      io.to(`user-${hostTenantId}`).emit('notification:new', notification.toJSON());
      
      // Emit to all guards for real-time updates
      io.to('guards').emit('visitor:arrived', {
        visitor,
        notification: notification.toJSON(),
        qrCode: qrData,
        timestamp: new Date()
      });
      io.to('guards').emit('visitor:created', {
        visitor,
        notification: notification.toJSON(),
        qrCode: qrData,
        timestamp: new Date()
      });
      console.log(`[VISITOR] Emitted visitor:arrived and visitor:created to guards for visitor ${visitor._id}`);
      
      // Also broadcast to admins for live activity feed
      io.to('admins').emit('visitor:arrived', {
        visitor,
        notification: notification.toJSON(),
        qrCode: qrData,
        timestamp: new Date()
      });
      
      // Broadcast to guards in the apartment
      if (apartment) {
        io.to(`apartment-guards-${apartment._id}`).emit('visitor:arrived', {
          visitor,
          notification: notification.toJSON(),
          qrCode: qrData,
          timestamp: new Date()
        });
      }
    }

    // Send QR code via Email to VISITOR
    let notificationResult = null;
    if (email && sendNotification !== false) {
      notificationResult = await smsService.sendVisitorQRCode(
        email,
        name,
        visitor.roomNumber,
        visitor.qrCode,
        qrData.backupCode
      );
      if (!notificationResult.success) {
        console.error(`Failed to send visitor notification email:`, notificationResult.error);
      }
    }

    // Send Direct Call notification to TENANT (host) about visitor arrival
    let tenantNotificationResult = null;
    if (host.phone) {
      try {
        tenantNotificationResult = await smsService.sendVisitorNotification(
          host.phone,
          name,
          purpose
        );
      } catch (err) {
        console.error('Failed to send tenant notification call:', err);
      }
    }

    // Log SMS result for audit trail
    const smsAccessLog = new AccessLog({
      personId: visitor._id,
      personType: 'visitor',
      personName: name,
      personPhone: phone,
      action: 'approved',
      apartmentId: apartment._id,
      roomNumber: visitor.roomNumber,
      verifiedBy: req.user?.userId || hostTenantId,
      method: 'remote',
      notes: `Visitor registered. Email sent: ${!!notificationResult?.success}. Call made: ${!!tenantNotificationResult?.success}.`,
      relatedVisitorId: visitor._id,
    });
    await smsAccessLog.save();

    res.status(201).json({
      success: true,
      message: 'Visitor registered successfully',
      visitor,
      qrCode: qrData,
      emailSent: !!notificationResult?.success,
      tenantCalled: !!tenantNotificationResult?.success
    });
  } catch (error) {
    console.error('Create visitor error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Bulk create visitors (by tenant pre-approving multiple at once)
exports.createBulkVisitors = async (req, res) => {
  try {
    const { visitors } = req.body;
    const hostTenantId = req.user.userId;
    
    // Validate input
    if (!visitors || !Array.isArray(visitors) || visitors.length === 0) {
      return res.status(400).json({ success: false, message: 'No visitors provided' });
    }
    
    // Limit to 20 visitors at a time
    if (visitors.length > 20) {
      return res.status(400).json({ success: false, message: 'Maximum 20 visitors allowed at once' });
    }
    
    // Verify host tenant exists
    const host = await User.findById(hostTenantId);
    if (!host || host.role !== 'tenant') {
      return res.status(400).json({ success: false, message: 'Invalid tenant' });
    }
    
    let apartment = host.apartmentId ? await Apartment.findById(host.apartmentId) : null;
    if (!apartment) {
      apartment = await Apartment.findOne(
        host.createdBy ? { adminId: host.createdBy } : {}
      );
    }
    if (!apartment) {
      return res.status(400).json({ success: false, message: 'Apartment not found' });
    }
    
    const createdVisitors = [];
    const notificationsToCreate = [];
    const io = req.app.get('io');
    
    // Process each visitor
    for (const v of visitors) {
      const { name, phone, idNumber, vehiclePlate, purpose, expectedArrival, notes } = v;
      
      if (!name || !phone) continue; // Skip invalid entries
      
      // Cryptographically secure token
      const qrCode = crypto.randomBytes(24).toString('base64url');
      
      const visitor = new Visitor({
        name,
        phone,
        idNumber: idNumber || '',
        vehiclePlate: vehiclePlate || '',
        purpose: purpose || 'guest',
        hostTenantId,
        apartmentId: apartment._id,
        roomNumber: v.roomNumber || host.roomNumber,
        expectedArrival: expectedArrival || null,
        notes: notes || '',
        createdBy: hostTenantId,
        status: 'approved',
        qrCode
      });
      
      // Pre-generate QR metadata
      const qrData = await qrCodeService.generateVisitorQR(visitor);
      visitor.qrCodeImage = qrData.qrImage;
      
      const notification = {
        userId: hostTenantId,
        type: 'visitor_arrival',
        title: 'Visitor Pre-approved',
        message: `${name} has been pre-approved. QR code generated.`,
        data: { visitorId: visitor._id, apartmentId: apartment._id },
        priority: 'normal'
      };
      notificationsToCreate.push(notification);
      
      createdVisitors.push({
        visitor,
        qrCode: qrData,
        notification
      });
    }

    // Optimized Batch Insert
    if (createdVisitors.length > 0) {
      const visitorDocs = createdVisitors.map(cv => cv.visitor);
      await Visitor.insertMany(visitorDocs);
      await Notification.insertMany(notificationsToCreate);
    }

    // Emit events after batch insertion
    for (const cv of createdVisitors) {
      const { visitor, qrCode, notification } = cv;
      
      // Emit real-time event
      if (io) {
        io.to(`tenant-${hostTenantId}`).emit('visitor:created', {
          visitor,
          qrCode,
          notification
        });
        
        io.to('guards').emit('visitor:created', {
          visitor,
          qrCode,
          notification,
          timestamp: new Date()
        });
        
        io.to('guards').emit('visitor:arrived', {
          visitor,
          qrCode,
          notification,
          timestamp: new Date()
        });
        
        io.to('admins').emit('visitor:created', {
          visitor,
          qrCode,
          notification,
          timestamp: new Date()
        });
      }
    }
    
    res.json({
      success: true,
      message: `${createdVisitors.length} visitors pre-approved successfully`,
      visitors: createdVisitors,
      count: createdVisitors.length
    });
  } catch (error) {
    console.error('Bulk create visitors error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get visitors (filter by role)
exports.getVisitors = async (req, res) => {
  try {
    const { status, apartmentId, hostTenantId, page = 1, limit = 20, startDate, endDate } = req.query;
    const userRole = req.user.role;
    const userId = req.user.userId;

    const query = {};

    // Get user's apartment for filtering
    const currentUser = await User.findById(userId);
    const userApartmentId = currentUser?.apartmentId;
    
    // Get apartments owned by this user for strict data isolation
    const userApartments = await Apartment.find({ adminId: userId }).select('_id');
    const userApartmentIds = userApartments.map(a => a._id);

    // Filter based on role - with STRICT data isolation
    if (userRole === 'tenant') {
      query.hostTenantId = userId;
    } else if (userRole === 'guard') {
      // Guards can only see visitors from their assigned property OR apartments they manage
      if (userApartmentIds.length > 0) {
        query.apartmentId = { $in: userApartmentIds };
      } else if (userApartmentId) {
        query.apartmentId = userApartmentId;
      }
    } else if (userRole === 'admin') {
      // Admins can only see visitors from their property - STRICT
      if (userApartmentIds.length > 0) {
        query.apartmentId = { $in: userApartmentIds };
      } else if (userApartmentId) {
        query.apartmentId = userApartmentId;
      } else {
        // No apartments and no apartmentId - return empty
        return res.json({
          success: true,
          visitors: [],
          totalPages: 0,
          currentPage: page,
          total: 0
        });
      }
    } else if (hostTenantId) {
      query.hostTenantId = hostTenantId;
    } else if (apartmentId) {
      query.apartmentId = apartmentId;
    }

    if (status) query.status = status;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const visitors = await Visitor.find(query)
      .populate('hostTenantId', 'name roomNumber phone')
      .populate('createdBy', 'name')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const count = await Visitor.countDocuments(query);

    res.json({
      success: true,
      visitors,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      total: count
    });
  } catch (error) {
    console.error('Get visitors error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get single visitor
exports.getVisitor = async (req, res) => {
  try {
    const { id } = req.params;
    const visitor = await Visitor.findById(id)
      .populate('hostTenantId', 'name roomNumber phone email')
      .populate('apartmentId', 'buildingName buildingCode')
      .populate('createdBy', 'name')
      .populate('approvedBy', 'name')
      .populate('deniedBy', 'name');

    if (!visitor) {
      return res.status(404).json({ success: false, message: 'Visitor not found' });
    }

    res.json({ success: true, visitor });
  } catch (error) {
    console.error('Get visitor error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Approve visitor
exports.approveVisitor = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const visitor = await Visitor.findById(id);
    if (!visitor) {
      return res.status(404).json({ success: false, message: 'Visitor not found' });
    }

    if (visitor.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Visitor is not in pending status' });
    }

    visitor.status = 'approved';
    visitor.approvedBy = userId;
    visitor.approvedAt = new Date();
    await visitor.save();

    // Create access log
    const accessLog = new AccessLog({
      personId: visitor._id,
      personType: 'visitor',
      personName: visitor.name,
      personPhone: visitor.phone,
      action: 'approved',
      apartmentId: visitor.apartmentId,
      roomNumber: visitor.roomNumber,
      verifiedBy: userId,
      method: 'remote',
      relatedVisitorId: visitor._id
    });
    await accessLog.save();

    // Notify guard
    const apartment = await Apartment.findById(visitor.apartmentId);
    
    // Emit to all guards room for real-time updates
    const io = req.app.get('io');
    if (io) {
      io.to('guards').emit('visitor:approved', {
        visitor,
        accessLog,
        timestamp: new Date()
      });
    }
    
    if (apartment?.securityGuards) {
      for (const guardId of apartment.securityGuards) {
        const notification = new Notification({
          userId: guardId,
          type: 'access_granted',
          title: 'Visitor Approved',
          message: `${visitor.name} has been approved to visit unit ${visitor.roomNumber}`,
          data: {
            visitorId: visitor._id,
            apartmentId: visitor.apartmentId
          },
          priority: 'normal'
        });
        await notification.save();
        
        if (io) {
          io.to(`guard-${guardId}`).emit('access:granted', {
            visitor,
            accessLog
          });
          io.to(`user-${guardId}`).emit('notification:new', notification.toJSON());
        }
      }
    }

    res.json({ success: true, message: 'Visitor approved', visitor });
  } catch (error) {
    console.error('Approve visitor error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Deny visitor
exports.denyVisitor = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const userId = req.user.userId;

    const visitor = await Visitor.findById(id);
    if (!visitor) {
      return res.status(404).json({ success: false, message: 'Visitor not found' });
    }

    if (visitor.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Visitor is not in pending status' });
    }

    visitor.status = 'denied';
    visitor.deniedBy = userId;
    visitor.deniedAt = new Date();
    visitor.denialReason = reason || 'Denied by host';
    await visitor.save();

    // Create access log
    const accessLog = new AccessLog({
      personId: visitor._id,
      personType: 'visitor',
      personName: visitor.name,
      personPhone: visitor.phone,
      action: 'denied',
      apartmentId: visitor.apartmentId,
      roomNumber: visitor.roomNumber,
      verifiedBy: userId,
      method: 'remote',
      notes: reason,
      relatedVisitorId: visitor._id
    });
    await accessLog.save();

    // Notify guard
    const apartment = await Apartment.findById(visitor.apartmentId);
    if (apartment?.securityGuards) {
      for (const guardId of apartment.securityGuards) {
        const notification = new Notification({
          userId: guardId,
          type: 'access_denied',
          title: 'Visitor Denied',
          message: `${visitor.name} has been denied access to unit ${visitor.roomNumber}`,
          data: { visitorId: visitor._id },
          priority: 'normal'
        });
        await notification.save();
        
        const io = req.app.get('io');
        if (io) {
          io.to(`guard-${guardId}`).emit('access:denied', {
            visitor,
            accessLog
          });
          io.to(`user-${guardId}`).emit('notification:new', notification.toJSON());
        }
      }
    }

    res.json({ success: true, message: 'Visitor denied', visitor });
  } catch (error) {
    console.error('Deny visitor error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Check in visitor (by guard)
exports.checkInVisitor = async (req, res) => {
  try {
    const { id } = req.params;
    const { checkInPhoto } = req.body;
    const guardId = req.user.userId;

    const visitor = await Visitor.findById(id);
    if (!visitor) {
      return res.status(404).json({ success: false, message: 'Visitor not found' });
    }

    if (visitor.status !== 'approved' && visitor.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Visitor cannot be checked in' });
    }

    visitor.status = 'checked-in';
    visitor.checkInTime = new Date();
    if (checkInPhoto) visitor.checkInPhoto = checkInPhoto;
    await visitor.save();

    // Create access log
    const accessLog = new AccessLog({
      personId: visitor._id,
      personType: 'visitor',
      personName: visitor.name,
      personPhone: visitor.phone,
      action: 'entry',
      apartmentId: visitor.apartmentId,
      roomNumber: visitor.roomNumber,
      gateNumber: 'main',
      verifiedBy: guardId,
      method: 'manual',
      photo: checkInPhoto,
      relatedVisitorId: visitor._id
    });
    await accessLog.save();

    // Update visitor if it was pending to approved
    if (visitor.status === 'checked-in' && !visitor.approvedBy) {
      visitor.status = 'approved';
      visitor.approvedBy = guardId;
      visitor.approvedAt = new Date();
      await visitor.save();
    }

    // Emit real-time event
    const io = req.app.get('io');
    if (io) {
      // Emit to all guards for real-time updates
      io.to('guards').emit('visitor:checked_in', {
        visitor,
        accessLog,
        timestamp: new Date()
      });
      io.to(`apartment-guards-${visitor.apartmentId}`).emit('visitor:checked_in', {
        visitor,
        accessLog,
        timestamp: new Date()
      });
      io.to('admins').emit('visitor:checked_in', {
        visitor,
        accessLog,
        timestamp: new Date()
      });
      io.to(`tenant-${visitor.hostTenantId}`).emit('visitor:checked_in', {
        visitor,
        accessLog,
        timestamp: new Date()
      });
    }

    res.json({ success: true, message: 'Visitor checked in', visitor, accessLog });
  } catch (error) {
    console.error('Check in visitor error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Check out visitor (by guard)
exports.checkOutVisitor = async (req, res) => {
  try {
    const { id } = req.params;
    const { checkOutPhoto, notes } = req.body;
    const guardId = req.user.userId;

    const visitor = await Visitor.findById(id);
    if (!visitor) {
      return res.status(404).json({ success: false, message: 'Visitor not found' });
    }

    if (visitor.status !== 'checked-in') {
      return res.status(400).json({ success: false, message: 'Visitor is not checked in' });
    }

    visitor.status = 'checked-out';
    visitor.checkOutTime = new Date();
    if (checkOutPhoto) visitor.checkOutPhoto = checkOutPhoto;
    
    // Calculate visit duration
    if (visitor.checkInTime) {
      visitor.visitDuration = Math.round((visitor.checkOutTime - visitor.checkInTime) / 60000);
    }
    
    await visitor.save();

    // Create access log
    const accessLog = new AccessLog({
      personId: visitor._id,
      personType: 'visitor',
      personName: visitor.name,
      personPhone: visitor.phone,
      action: 'exit',
      apartmentId: visitor.apartmentId,
      roomNumber: visitor.roomNumber,
      gateNumber: 'main',
      verifiedBy: guardId,
      method: 'manual',
      photo: checkOutPhoto,
      notes,
      relatedVisitorId: visitor._id
    });
    await accessLog.save();

    // Emit real-time event
    const io = req.app.get('io');
    if (io) {
      io.to(`apartment-guards-${visitor.apartmentId}`).emit('visitor:checked_out', {
        visitor,
        accessLog,
        timestamp: new Date()
      });
      io.to('admins').emit('visitor:checked_out', {
        visitor,
        accessLog,
        timestamp: new Date()
      });
    }

    res.json({ success: true, message: 'Visitor checked out', visitor, accessLog });
  } catch (error) {
    console.error('Check out visitor error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Verify visitor by QR code
exports.verifyByQR = async (req, res) => {
  try {
    const { qrCode } = req.body;
    const guardId = req.user.userId;

    // Parse QR data to extract code
    let codeToVerify = qrCode;
    try {
      const parsed = JSON.parse(qrCode);
      // If QR contains JSON with code, extract it
      if (parsed.code) {
        codeToVerify = parsed.code;
      }
      // Check expiry from QR data
      if (parsed.validUntil && Date.now() > parsed.validUntil) {
        return res.status(400).json({ success: false, message: 'QR code has expired' });
      }
    } catch (e) {
      // Not JSON, use as-is
    }

    const visitor = await Visitor.findOne({ qrCode: codeToVerify });
    if (!visitor) {
      return res.status(404).json({ success: false, message: 'Invalid QR code' });
    }

    // Check if already used (one-time use)
    if (visitor.status === 'checked-in') {
      return res.status(400).json({ success: false, message: 'QR code has already been used' });
    }

    // If visitor is approved, auto check-in
    if (visitor.status === 'approved') {
      visitor.status = 'checked-in';
      visitor.checkInTime = new Date();
      await visitor.save();

      // Create access log for entry
      const accessLog = new AccessLog({
        personId: visitor._id,
        personType: 'visitor',
        personName: visitor.name,
        personPhone: visitor.phone,
        action: 'entry',
        apartmentId: visitor.apartmentId,
        roomNumber: visitor.roomNumber,
        gateNumber: 'main',
        verifiedBy: guardId,
        method: 'qr',
        relatedVisitorId: visitor._id
      });
      await accessLog.save();

      // Emit real-time event
      const io = req.app.get('io');
      if (io) {
        io.to(`apartment-guards-${visitor.apartmentId}`).emit('visitor:checked_in', {
          visitor,
          accessLog,
          timestamp: new Date()
        });
        io.to('admins').emit('visitor:checked_in', {
          visitor,
          accessLog,
          timestamp: new Date()
        });
        io.to(`tenant-${visitor.hostTenantId}`).emit('visitor:checked_in', {
          visitor,
          accessLog,
          timestamp: new Date()
        });
      }

      return res.json({
        success: true,
        visitor,
        accessLog,
        canAccess: true,
        action: 'checked_in',
        message: `Welcome, ${visitor.name}! Checked in successfully.`
      });
    }

    // If visitor is pending, return that they need approval
    if (visitor.status === 'pending') {
      return res.json({
        success: false,
        visitor,
        canAccess: false,
        action: 'pending_approval',
        message: 'Visitor is pending approval from tenant'
      });
    }

    // If visitor is denied or already checked in/out
    const action = visitor.status === 'denied' ? 'denied' : 
                   visitor.status === 'checked-in' ? 'already_checked_in' : 
                   visitor.status === 'checked-out' ? 'already_checked_out' : 'unknown';

    // Create access log for the attempt
    const accessLog = new AccessLog({
      personId: visitor._id,
      personType: 'visitor',
      personName: visitor.name,
      personPhone: visitor.phone,
      action: visitor.status === 'denied' ? 'denied' : 'entry',
      apartmentId: visitor.apartmentId,
      roomNumber: visitor.roomNumber,
      gateNumber: 'main',
      verifiedBy: guardId,
      method: 'qr',
      relatedVisitorId: visitor._id
    });
    await accessLog.save();

    res.json({
      success: false,
      visitor,
      accessLog,
      canAccess: false,
      action,
      message: visitor.status === 'denied' 
        ? 'Access denied' 
        : visitor.status === 'checked-in' 
          ? 'Already checked in'
          : visitor.status === 'checked-out'
            ? 'Already checked out'
            : 'Cannot access'
    });
  } catch (error) {
    console.error('Verify by QR error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get pending visitor requests (for tenants)
exports.getPendingRequests = async (req, res) => {
  try {
    const userId = req.user.userId;

    const visitors = await Visitor.find({
      hostTenantId: userId,
      status: 'pending'
    }).sort({ createdAt: -1 });

    res.json({ success: true, visitors });
  } catch (error) {
    console.error('Get pending requests error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get today's visitors for apartment
exports.getTodayVisitors = async (req, res) => {
  try {
    const { apartmentId } = req.query;
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const query = {
      apartmentId,
      createdAt: { $gte: startOfDay, $lte: endOfDay }
    };

    const visitors = await Visitor.find(query)
      .populate('hostTenantId', 'name roomNumber')
      .sort({ createdAt: -1 });

    const stats = {
      total: visitors.length,
      pending: visitors.filter(v => v.status === 'pending').length,
      approved: visitors.filter(v => v.status === 'approved').length,
      checkedIn: visitors.filter(v => v.status === 'checked-in').length,
      checkedOut: visitors.filter(v => v.status === 'checked-out').length,
      denied: visitors.filter(v => v.status === 'denied').length
    };

    res.json({ success: true, visitors, stats });
  } catch (error) {
    console.error('Get today visitors error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Generate QR code for visitor
exports.generateQR = async (req, res) => {
  try {
    const { id } = req.params;
    
    const visitor = await Visitor.findById(id)
      .populate('hostTenantId', 'name roomNumber phone');
    
    if (!visitor) {
      return res.status(404).json({ success: false, message: 'Visitor not found' });
    }

    // Generate QR code
    const qrData = await qrCodeService.generateVisitorQR(visitor);
    
    res.json({
      success: true,
      qrCode: qrData
    });
  } catch (error) {
    console.error('Generate visitor QR error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
