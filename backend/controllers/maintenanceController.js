const mongoose = require('mongoose');
const { Maintenance, User, Apartment } = require('../models');
const { smsService, websocketClusterService: wsService } = require('../services');
const { notifyMaintenanceStatusChange } = require('../services/notificationService');

// Get all maintenance requests (admin/guard view)
exports.getAllRequests = async (req, res) => {
  try {
    const { status, category, apartmentId, limit = 50, offset = 0 } = req.query;
    const userId = req.user.userId;
    const userRole = req.user.role;
    
    let query = {};
    if (status && status !== 'all') query.status = status;
    if (category && category !== 'all') query.category = category;

    console.log('[getAllRequests] userId:', userId, 'userRole:', userRole, 'status:', status);

    // --- Data Isolation Logic ---
    if (userRole === 'admin') {
      const adminApartments = await Apartment.find({ adminId: userId }).select('_id');
      const adminApartmentIds = adminApartments.map(a => a._id);
      
      if (apartmentId) {
        query.apartmentId = apartmentId;
      } else if (adminApartmentIds.length > 0) {
        query.apartmentId = { $in: adminApartmentIds };
      }
    } else if (userRole === 'guard') {
      const user = await User.findById(userId).select('apartmentId');
      if (user?.apartmentId) {
        query.apartmentId = user.apartmentId;
      }
    } else if (userRole === 'tenant') {
      query.reportedBy = userId;
    } else if (userRole === 'maintenance') {
      const maintenanceUser = await User.findById(userId).select('serviceType');
      const userServiceType = maintenanceUser?.serviceType?.toLowerCase();
      console.log('[getAllRequests] maintenance userServiceType:', userServiceType);
      
      if (userServiceType && userServiceType !== 'general' && userServiceType !== 'other') {
        query.$or = [
          { assignedTo: new mongoose.Types.ObjectId(userId) },
          { category: userServiceType, assignedTo: null },
          { category: userServiceType, assignedTo: { $exists: false } }
        ];
      } else {
        query.$or = [
          { assignedTo: new mongoose.Types.ObjectId(userId) }
        ];
      }
      // Use $and to combine status filter with $or
      if (status && status !== 'all') {
        query = {
          $and: [
            { status: status },
            query
          ]
        };
      }
    }

    console.log('[getAllRequests] Final query:', JSON.stringify(query));
    const requests = await Maintenance.find(query)
      .populate('reportedBy', 'name email phone')
      .populate('apartmentId', 'buildingName')
      .populate('assignedTo', 'name email rating ratingCount')
      .sort({ createdAt: -1 })
      .skip(parseInt(offset))
      .limit(parseInt(limit));

    console.log('[getAllRequests] Found requests:', requests.length);

    const total = await Maintenance.countDocuments(query);

    res.json({ success: true, requests, total });
  } catch (err) {
    console.error('Error fetching maintenance requests:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get my maintenance requests (tenant view)
exports.getMyRequests = async (req, res) => {
  try {
    const userId = req.user?.userId;
    
    const requests = await Maintenance.find({ reportedBy: userId })
      .populate('assignedTo', 'name email rating ratingCount')
      .sort({ createdAt: -1 });

    res.json({ success: true, requests });
  } catch (err) {
    console.error('Error fetching my maintenance requests:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get single maintenance request
exports.getOneRequest = async (req, res) => {
  try {
    const request = await Maintenance.findById(req.params.id)
      .populate('reportedBy', 'name email phone')
      .populate('apartmentId', 'buildingName')
      .populate('assignedTo', 'name email rating ratingCount');

    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    res.json({ success: true, request });
  } catch (err) {
    console.error('Error fetching maintenance request:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Create new maintenance request (tenant)
exports.createRequest = async (req, res) => {
  try {
    const { category, description, priority } = req.body;
    const userId = req.user?.userId;
    
    const photos = req.files?.photos 
      ? req.files.photos.map(f => `/uploads/${f.filename}`)
      : [];

    // Get user's apartment
    
    let apartmentId = null;
    const user = await User.findById(userId);
    if (user?.apartmentId) {
      apartmentId = user.apartmentId;
    } else {
      // Try to find apartment by admin
      const apartment = await Apartment.findOne({ adminId: user?.createdBy });
      if (apartment) {
        apartmentId = apartment._id;
      }
    }

    const request = new Maintenance({
      category,
      description,
      priority: priority || 'medium',
      reportedBy: userId,
      apartmentId,
      photos: photos || []
    });

    await request.save();

    // Populate for response
    await request.populate('reportedBy', 'name email phone');
    await request.populate('apartmentId', 'buildingName');

    // Emit targeted socket event via cluster service
    wsService.broadcastMaintenanceCreated(request.toJSON());

    // Create notifications for admins and maintenance staff
    const io = req.app.get('io');
    if (io) {
      await notifyMaintenanceStatusChange(io, request);
    }

    res.status(201).json({ success: true, request });
  } catch (err) {
    console.error('Error creating maintenance request:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Update maintenance request (admin/guard)
exports.updateRequest = async (req, res) => {
  try {
    const { category, description, priority, assignedTo, status, resolutionNotes } = req.body;
    
    const request = await Maintenance.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    if (category) request.category = category;
    if (description) request.description = description;
    if (priority) request.priority = priority;
    if (assignedTo !== undefined) request.assignedTo = assignedTo;
    if (status) {
      request.status = status;
      if (status === 'resolved') {
        request.resolvedAt = new Date();
      }
    }
    if (resolutionNotes) request.resolutionNotes = resolutionNotes;

    await request.save();

    // Populate for response
    await request.populate('reportedBy', 'name email phone');
    await request.populate('apartmentId', 'buildingName');
    await request.populate('assignedTo', 'name email rating ratingCount');

    // Emit targeted socket event via cluster service
    wsService.broadcastMaintenanceUpdated(request._id, request.toJSON());

    // Create notifications for status changes
    const io = req.app.get('io');
    if (io) {
      await notifyMaintenanceStatusChange(io, request);
    }

    res.json({ success: true, request });
  } catch (err) {
    console.error('Error updating maintenance request:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Update maintenance request status (admin/guard)
exports.updateStatus = async (req, res) => {
  try {
    const { status, resolutionNotes } = req.body;
    
    const request = await Maintenance.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    request.status = status;
    if (status === 'resolved') {
      request.resolvedAt = new Date();
    }
    if (resolutionNotes) {
      request.resolutionNotes = resolutionNotes;
    }

    await request.save();

    // Populate for response
    await request.populate('reportedBy', 'name email phone');
    await request.populate('apartmentId', 'buildingName');
    await request.populate('assignedTo', 'name email rating ratingCount');

    // Emit targeted socket event via cluster service
    wsService.broadcastMaintenanceUpdated(request._id, request.toJSON());

    // Create notifications for status changes
    const io = req.app.get('io');
    if (io) {
      await notifyMaintenanceStatusChange(io, request);
    }

    res.json({ success: true, request });
  } catch (err) {
    console.error('Error updating maintenance status:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Delete maintenance request (admin)
exports.deleteRequest = async (req, res) => {
  try {
    const request = await Maintenance.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    const requestId = request._id;
    await request.deleteOne();

    // Emit targeted socket event
    wsService.broadcastMaintenanceDeleted(requestId.toString());

    res.json({ success: true, message: 'Request deleted successfully' });
  } catch (err) {
    console.error('Error deleting maintenance request:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get maintenance staff (for directory)
exports.getStaff = async (req, res) => {
  try {
    const { User } = require('../models');
    
    const staff = await User.find({ role: 'maintenance', isVerified: true })
      .select('name email phone serviceType isActive rating ratingCount')
      .sort({ name: 1 });

    // Map serviceType to specialization for frontend compatibility
    const staffWithSpecialization = staff.map(s => ({
      ...s.toObject(),
      specialization: s.serviceType ? s.serviceType.charAt(0).toUpperCase() + s.serviceType.slice(1) : 'General'
    }));

    res.json({ success: true, staff: staffWithSpecialization });
  } catch (err) {
    console.error('Error fetching maintenance staff:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Contact maintenance staff - send message
exports.contactStaff = async (req, res) => {
  try {
    const { message, from, role } = req.body;
    const staffId = req.params.id;
    
    console.log('[contactStaff] HIT! staffId:', staffId, 'message:', message, 'from:', from);
    
    if (!mongoose.Types.ObjectId.isValid(staffId)) {
      return res.status(400).json({ success: false, message: 'Invalid staff ID' });
    }
    
    const { User } = require('../models');
    const staff = await User.findById(staffId);
    console.log('[contactStaff] staff found:', staff?.name, 'role:', staff?.role);
    
    if (!staff || staff.role !== 'maintenance') {
      return res.status(404).json({ success: false, message: 'Maintenance staff not found' });
    }

    // Get user's apartment
    let apartmentId = null;
    const senderUser = await User.findById(req.user.userId);
    
    if (senderUser) {
      if (senderUser.apartmentId) {
        apartmentId = senderUser.apartmentId;
      } else if (senderUser.createdBy) {
        try {
          const apartment = await Apartment.findOne({ adminId: senderUser.createdBy });
          if (apartment) apartmentId = apartment._id;
        } catch (aptError) {
          console.error('[contactStaff] Apartment lookup error:', aptError.message);
        }
      }
    } else {
      console.error('[contactStaff] Sender user not found:', req.user.userId);
    }

    // Create a maintenance request from the message
    const request = new Maintenance({
      category: 'message',
      description: message,
      priority: 'medium',
      reportedBy: req.user.userId,
      apartmentId: apartmentId,
      assignedTo: new mongoose.Types.ObjectId(staffId),
      status: 'pending',
      photos: []
    });
    await request.save();
    console.log('[contactStaff] Created request:', request._id);

    // Populate for socket emission
    await request.populate('reportedBy', 'name email phone');
    await request.populate('apartmentId', 'buildingName');
    await request.populate('assignedTo', 'name email');

    // Emit maintenance:created event so dashboards update
    const io = req.app.get('io');
    console.log('[CONTACT] Emitting to maintenance-staff room, staffId:', staffId);
    if (io) {
      io.to('maintenance-staff').emit('maintenance:created', { request: request.toJSON() });
      console.log('[contactStaff] Emitted maintenance:created');

      io.to(`maintenance-${staffId}`).emit('maintenance:contact', {
        from: from || req.user?.name,
        role: role || req.user?.role,
        message: message,
        timestamp: new Date()
      });
      console.log('[CONTACT] Emitted to specific room maintenance-', staffId);
      io.to('maintenance-staff').emit('maintenance:contact', {
        from: from || req.user?.name,
        role: role || req.user?.role,
        message: message,
        timestamp: new Date()
      });
      console.log('[CONTACT] Emitted to maintenance-staff broadcast room');
    }

    // Contact staff via direct voice call and email (Replacing SMS)
    if (staff.phone || staff.email) {
      const contactMsg = `BomaSecure: Hello ${staff.name}, you have a new maintenance message from ${from || 'a user'}: ${message}`;
      try {
        if (staff.phone) await smsService.makeDirectCall(staff.phone, contactMsg);
      } catch (callErr) {
        console.error('[contactStaff] Call error:', callErr.message);
      }
      try {
        if (staff.email) await smsService.sendEmail(staff.email, 'Maintenance Contact', `<p>${contactMsg}</p>`);
      } catch (emailErr) {
        console.error('[contactStaff] Email error:', emailErr.message);
      }
    }
    
    res.json({ success: true, message: 'Message sent successfully' });
  } catch (err) {
    console.error('Error contacting maintenance staff:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Contact maintenance staff - send image
exports.sendImageToStaff = async (req, res) => {
  try {
    const staffId = req.params.id;
    const { User } = require('../models');
    
    if (!mongoose.Types.ObjectId.isValid(staffId)) {
      return res.status(400).json({ success: false, message: 'Invalid staff ID' });
    }
    
    const staff = await User.findById(staffId);
    
    if (!staff || staff.role !== 'maintenance') {
      return res.status(404).json({ success: false, message: 'Maintenance staff not found' });
    }

    // Handle uploaded image
    let imageUrl = null;
    if (req.file) {
      // Store the image path - adjust based on your upload setup
      imageUrl = `/uploads/${req.file.filename}`;
    }

    // Get user's apartment
    let apartmentId = null;
    const senderUser = await User.findById(req.user.userId);
    
    if (senderUser) {
      if (senderUser.apartmentId) {
        apartmentId = senderUser.apartmentId;
      } else if (senderUser.createdBy) {
        try {
          const apartment = await Apartment.findOne({ adminId: senderUser.createdBy });
          if (apartment) apartmentId = apartment._id;
        } catch (aptError) {
          console.error('[sendImageToStaff] Apartment lookup error:', aptError.message);
        }
      }
    } else {
      console.error('[sendImageToStaff] Sender user not found:', req.user.userId);
    }

    // Create a maintenance request from the image
    const request = new Maintenance({
      category: 'image',
      description: 'Image sent via contact',
      priority: 'medium',
      reportedBy: req.user.userId,
      apartmentId: apartmentId,
      assignedTo: new mongoose.Types.ObjectId(staffId),
      status: 'pending',
      photos: imageUrl ? [imageUrl] : []
    });
    await request.save();
    console.log('[sendImageToStaff] Created request:', request._id);

    // Populate for socket emission
    await request.populate('reportedBy', 'name email phone');
    await request.populate('apartmentId', 'buildingName');
    await request.populate('assignedTo', 'name email');

    // Emit maintenance:created event so dashboards update
    const io = req.app.get('io');
    console.log('[IMAGE] Emitting to maintenance-staff room, staffId:', staffId);
    if (io) {
      io.to('maintenance-staff').emit('maintenance:created', { request: request.toJSON() });
      console.log('[sendImageToStaff] Emitted maintenance:created');

      io.to(`maintenance-${staffId}`).emit('maintenance:image', {
        from: req.body.from || req.user?.name,
        role: req.body.role || req.user?.role,
        imageUrl: imageUrl,
        timestamp: new Date()
      });
      console.log('[IMAGE] Emitted to specific room maintenance-', staffId);
      io.to('maintenance-staff').emit('maintenance:image', {
        from: req.body.from || req.user?.name,
        role: req.body.role || req.user?.role,
        imageUrl: imageUrl,
        timestamp: new Date()
      });
      console.log('[IMAGE] Emitted to maintenance-staff broadcast room');
    }

    res.json({ success: true, message: 'Image sent successfully' });
  } catch (err) {
    console.error('Error sending image to maintenance staff:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};