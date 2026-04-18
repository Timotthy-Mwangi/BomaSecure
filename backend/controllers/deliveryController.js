const { Delivery, User, AccessLog, Notification, Apartment } = require('../models');
const { qrCodeService, smsService } = require('../services');
const crypto = require('crypto');

// Receive delivery (by guard)
exports.receiveDelivery = async (req, res) => {
  try {
    const qrToken = crypto.randomBytes(24).toString('base64url');
    const { courierName, courierPhone, courierCompany, parcelDescription, parcelWeight, trackingNumber, vehiclePlate, recipientTenantId, roomNumber, notes, sendNotification } = req.body;
    const guardId = req.user.userId;

    // Verify recipient tenant exists
    const recipient = await User.findById(recipientTenantId);
    if (!recipient || recipient.role !== 'tenant') {
      return res.status(400).json({ success: false, message: 'Invalid recipient tenant' });
    }

    const apartment = await Apartment.findById(recipient.apartmentId);
    if (!apartment) {
      return res.status(400).json({ success: false, message: 'Apartment not found' });
    }

    const delivery = new Delivery({
      courierName,
      courierPhone,
      courierCompany,
      parcelDescription,
      parcelWeight,
      trackingNumber,
      vehiclePlate,
      recipientTenantId,
      apartmentId: apartment._id,
      roomNumber: roomNumber || recipient.roomNumber,
      status: 'received',
      receivedByGuardId: guardId,
      receivedAt: new Date(),
      notes,
      qrCode: qrToken
    });

    await delivery.save();

    // Generate QR code for the delivery
    const qrData = await qrCodeService.generateDeliveryQR(delivery);
    
    // Update delivery with QR code image data (for frontend display)
    delivery.qrCodeImage = qrData.qrImage;
    await delivery.save();

    // Create access log
    const accessLog = new AccessLog({
      personId: courierPhone,
      personType: 'delivery',
      personName: courierName,
      personPhone: courierPhone,
      action: 'entry',
      apartmentId: apartment._id,
      roomNumber: delivery.roomNumber,
      gateNumber: 'main',
      verifiedBy: guardId,
      method: 'manual',
      relatedDeliveryId: delivery._id
    });
    await accessLog.save();

    // Create notification for tenant
    const notification = new Notification({
      userId: recipientTenantId,
      type: 'delivery_arrival',
      title: 'Delivery Received',
      message: `${courierCompany || 'A courier'} has dropped a package for you: ${parcelDescription}`,
      data: {
        deliveryId: delivery._id,
        apartmentId: apartment._id,
        actionUrl: `/tenant/deliveries/${delivery._id}`,
        qrCode: qrData
      },
      priority: 'normal'
    });
    await notification.save();

    // Emit socket events
    const io = req.app.get('io');
    if (io) {
      io.to(`tenant-${recipientTenantId}`).emit('delivery:arrived', {
        delivery,
        notification: notification.toJSON(),
        qrCode: qrData
      });
      io.to(`user-${recipientTenantId}`).emit('notification:new', notification.toJSON());
      
      // Emit to all guards for real-time updates
      io.to('guards').emit('delivery:arrived', {
        delivery,
        notification: notification.toJSON(),
        qrCode: qrData,
        timestamp: new Date()
      });
      console.log(`[DELIVERY] Emitted delivery:arrived to guards for delivery ${delivery._id}`);
      
      // Also broadcast to admins for live activity feed
      io.to('admins').emit('delivery:arrived', {
        delivery,
        notification: notification.toJSON(),
        qrCode: qrData,
        timestamp: new Date()
      });
      
      // Broadcast to guards in the apartment
      if (apartment) {
        io.to(`apartment-guards-${apartment._id}`).emit('delivery:arrived', {
          delivery,
          notification: notification.toJSON(),
          qrCode: qrData,
          timestamp: new Date()
        });
      }
    }

    // Send Email notification to courier (if provided)
    let notificationResult = null;
    if (sendNotification !== false) {
      try {
        // Assuming courier might have an email in the future, for now we log
        console.log(`Initiating direct call to courier ${courierName} at ${courierPhone}`);
        notificationResult = await smsService.sendDeliveryQRCode(
          recipient.phone,
          recipient.email,
          recipient.name,
          delivery.roomNumber,
          delivery.qrCode,
          qrData.backupCode,
          courierCompany
        );
        if (!notificationResult.success) {
          console.error(`Failed to send delivery notification:`, notificationResult.error);
        }
      } catch (err) {
        console.error('Failed to send delivery notification:', err);
      }
    }

    // Send Direct Call and Email notification to TENANT about delivery arrival
    let tenantNotificationResult = null;
    if (recipient.phone || recipient.email) {
      try {
        tenantNotificationResult = await smsService.sendDeliveryNotification(
          recipient.phone,
          recipient.email,
          courierCompany,
          parcelDescription
        );
      } catch (err) {
        console.error('Failed to send tenant delivery notification:', err);
      }
    }

    res.status(201).json({
      success: true,
      message: 'Delivery received successfully',
      delivery,
      qrCode: qrData,
      notificationsSent: !!notificationResult?.success,
      tenantNotified: !!tenantNotificationResult?.success
    });
  } catch (error) {
    console.error('Receive delivery error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get deliveries
exports.getDeliveries = async (req, res) => {
  try {
    const { status, apartmentId, recipientTenantId, page = 1, limit = 20 } = req.query;
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
      query.recipientTenantId = userId;
    } else if (userRole === 'guard') {
      // Guards can only see deliveries from their assigned property OR apartments they manage
      if (userApartmentIds.length > 0) {
        query.apartmentId = { $in: userApartmentIds };
      } else if (userApartmentId) {
        query.apartmentId = userApartmentId;
      }
    } else if (userRole === 'admin') {
      // Admins can only see deliveries from their property - STRICT
      if (userApartmentIds.length > 0) {
        query.apartmentId = { $in: userApartmentIds };
      } else if (userApartmentId) {
        query.apartmentId = userApartmentId;
      } else {
        // No apartments and no apartmentId - return empty
        return res.json({
          success: true,
          deliveries: [],
          totalPages: 0,
          currentPage: page,
          total: 0
        });
      }
    } else if (recipientTenantId) {
      query.recipientTenantId = recipientTenantId;
    } else if (apartmentId) {
      query.apartmentId = apartmentId;
    }

    if (status) query.status = status;

    const deliveries = await Delivery.find(query)
      .populate('recipientTenantId', 'name roomNumber phone')
      .populate('receivedByGuardId', 'name')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const count = await Delivery.countDocuments(query);

    res.json({
      success: true,
      deliveries,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      total: count
    });
  } catch (error) {
    console.error('Get deliveries error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get single delivery
exports.getDelivery = async (req, res) => {
  try {
    const { id } = req.params;
    const delivery = await Delivery.findById(id)
      .populate('recipientTenantId', 'name roomNumber phone email')
      .populate('apartmentId', 'buildingName buildingCode')
      .populate('receivedByGuardId', 'name');

    if (!delivery) {
      return res.status(404).json({ success: false, message: 'Delivery not found' });
    }

    res.json({ success: true, delivery });
  } catch (error) {
    console.error('Get delivery error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Confirm delivery (by tenant)
exports.confirmDelivery = async (req, res) => {
  try {
    const { id } = req.params;
    const { signature } = req.body;
    const userId = req.user.userId;

    const delivery = await Delivery.findById(id);
    if (!delivery) {
      return res.status(404).json({ success: false, message: 'Delivery not found' });
    }

    // Verify the tenant is the recipient
    if (delivery.recipientTenantId.toString() !== userId) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    if (delivery.status !== 'received' && delivery.status !== 'ready_for_pickup') {
      return res.status(400).json({ success: false, message: 'Delivery cannot be confirmed' });
    }

    delivery.status = 'delivered';
    delivery.deliveredToTenantAt = new Date();
    if (signature) delivery.signature = signature;
    await delivery.save();

    // Create access log
    const accessLog = new AccessLog({
      personId: userId,
      personType: 'tenant',
      personName: 'Tenant',
      action: 'approved',
      apartmentId: delivery.apartmentId,
      roomNumber: delivery.roomNumber,
      verifiedBy: userId,
      method: 'remote',
      relatedDeliveryId: delivery._id
    });
    await accessLog.save();

    // Notify guard
    if (delivery.receivedByGuardId) {
      const notification = new Notification({
        userId: delivery.receivedByGuardId,
        type: 'delivery_confirmed',
        title: 'Delivery Confirmed',
        message: `Package for unit ${delivery.roomNumber} has been confirmed received`,
        data: { deliveryId: delivery._id },
        priority: 'low'
      });
      await notification.save();

      const io = req.app.get('io');
      if (io) {
        // Emit to all guards for real-time updates
        io.to('guards').emit('delivery:confirmed', {
          delivery,
          timestamp: new Date()
        });
        io.to(`guard-${delivery.receivedByGuardId}`).emit('delivery:confirmed', {
          delivery
        });
        io.to(`user-${delivery.receivedByGuardId}`).emit('notification:new', notification.toJSON());
      }
    }

    res.json({ success: true, message: 'Delivery confirmed', delivery });
  } catch (error) {
    console.error('Confirm delivery error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Mark delivery as ready for pickup (by tenant)
exports.markReadyForPickup = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const delivery = await Delivery.findById(id);
    if (!delivery) {
      return res.status(404).json({ success: false, message: 'Delivery not found' });
    }

    if (delivery.recipientTenantId.toString() !== userId) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    delivery.status = 'ready_for_pickup';
    await delivery.save();

    // Notify guard
    if (delivery.receivedByGuardId) {
      req.app.get('io')?.to(`guard-${delivery.receivedByGuardId}`).emit('delivery:ready_for_pickup', {
        delivery
      });
    }

    res.json({ success: true, message: 'Delivery marked for pickup', delivery });
  } catch (error) {
    console.error('Mark ready for pickup error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Return delivery (by guard)
exports.returnDelivery = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const guardId = req.user.userId;

    const delivery = await Delivery.findById(id);
    if (!delivery) {
      return res.status(404).json({ success: false, message: 'Delivery not found' });
    }

    if (delivery.status === 'delivered') {
      return res.status(400).json({ success: false, message: 'Already delivered' });
    }

    delivery.status = 'returned';
    delivery.returnReason = reason;
    delivery.deliveryAttempts += 1;
    await delivery.save();

    // Create access log
    const accessLog = new AccessLog({
      personId: delivery.courierPhone,
      personType: 'delivery',
      personName: delivery.courierName,
      personPhone: delivery.courierPhone,
      action: 'exit',
      apartmentId: delivery.apartmentId,
      gateNumber: 'main',
      verifiedBy: guardId,
      method: 'manual',
      notes: reason,
      relatedDeliveryId: delivery._id
    });
    await accessLog.save();

    // Emit real-time event
    const io = req.app.get('io');
    if (io) {
      // Emit to all guards for real-time updates
      io.to('guards').emit('delivery:returned', {
        delivery,
        accessLog,
        timestamp: new Date()
      });
      io.to(`apartment-guards-${delivery.apartmentId}`).emit('delivery:returned', {
        delivery,
        accessLog,
        timestamp: new Date()
      });
      io.to('admins').emit('delivery:returned', {
        delivery,
        accessLog,
        timestamp: new Date()
      });
      io.to(`tenant-${delivery.recipientTenantId}`).emit('delivery:returned', {
        delivery,
        timestamp: new Date()
      });
    }

    res.json({ success: true, message: 'Delivery returned', delivery });
  } catch (error) {
    console.error('Return delivery error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get today's deliveries for apartment
exports.getTodayDeliveries = async (req, res) => {
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

    const deliveries = await Delivery.find(query)
      .populate('recipientTenantId', 'name roomNumber')
      .sort({ createdAt: -1 });

    const stats = {
      total: deliveries.length,
      pending: deliveries.filter(d => d.status === 'pending').length,
      received: deliveries.filter(d => d.status === 'received').length,
      readyForPickup: deliveries.filter(d => d.status === 'ready_for_pickup').length,
      delivered: deliveries.filter(d => d.status === 'delivered').length,
      returned: deliveries.filter(d => d.status === 'returned').length
    };

    res.json({ success: true, deliveries, stats });
  } catch (error) {
    console.error('Get today deliveries error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get pending deliveries for tenant
exports.getPendingDeliveries = async (req, res) => {
  try {
    const userId = req.user.userId;

    const deliveries = await Delivery.find({
      recipientTenantId: userId,
      status: { $in: ['received', 'ready_for_pickup'] }
    }).sort({ createdAt: -1 });

    res.json({ success: true, deliveries });
  } catch (error) {
    console.error('Get pending deliveries error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Generate QR code for delivery
exports.generateQR = async (req, res) => {
  try {
    const { id } = req.params;
    
    const delivery = await Delivery.findById(id)
      .populate('recipientTenantId', 'name roomNumber phone');
    
    if (!delivery) {
      return res.status(404).json({ success: false, message: 'Delivery not found' });
    }

    // Generate QR code
    const qrData = await qrCodeService.generateDeliveryQR(delivery);
    
    res.json({
      success: true,
      qrCode: qrData
    });
  } catch (error) {
    console.error('Generate delivery QR error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Verify delivery by QR code (for pickup)
exports.verifyByQR = async (req, res) => {
  try {
    const { qrCode } = req.body;
    const guardId = req.user.userId;

    // Parse QR data to extract code
    let codeToVerify = qrCode;
    let validUntil = null;
    try {
      const parsed = JSON.parse(qrCode);
      if (parsed.code) {
        codeToVerify = parsed.code;
      }
      // Check expiry from QR data
      if (parsed.validUntil) {
        validUntil = parsed.validUntil;
        if (Date.now() > validUntil) {
          return res.status(400).json({ success: false, message: 'QR code has expired' });
        }
      }
    } catch (e) {
      // Not JSON, use as-is
    }

    const delivery = await Delivery.findOne({ qrCode: codeToVerify });
    if (!delivery) {
      return res.status(404).json({ success: false, message: 'Invalid QR code' });
    }

    // Check if already collected (one-time use)
    if (delivery.status === 'delivered') {
      return res.status(400).json({ success: false, message: 'QR code has already been used' });
    }

    // If delivery is ready for pickup or received, mark as picked up
    if (delivery.status === 'ready_for_pickup' || delivery.status === 'received') {
      delivery.status = 'delivered';
      delivery.deliveredToTenantAt = new Date();
      await delivery.save();

      // Create access log
      const accessLog = new AccessLog({
        personId: delivery.courierPhone,
        personType: 'delivery',
        personName: delivery.courierName,
        personPhone: delivery.courierPhone,
        action: 'delivery_collected',
        apartmentId: delivery.apartmentId,
        roomNumber: delivery.roomNumber,
        gateNumber: 'main',
        verifiedBy: guardId,
        method: 'qr',
        relatedDeliveryId: delivery._id
      });
      await accessLog.save();

      // Emit real-time event
      const io = req.app.get('io');
      if (io) {
        // Emit to all guards for real-time updates
        io.to('guards').emit('delivery:collected', {
          delivery,
          accessLog,
          timestamp: new Date()
        });
        io.to(`apartment-guards-${delivery.apartmentId}`).emit('delivery:collected', {
          delivery,
          accessLog,
          timestamp: new Date()
        });
        io.to('admins').emit('delivery:collected', {
          delivery,
          accessLog,
          timestamp: new Date()
        });
        io.to(`tenant-${delivery.recipientTenantId}`).emit('delivery:collected', {
          delivery,
          accessLog,
          timestamp: new Date()
        });
      }

      return res.json({
        success: true,
        delivery,
        accessLog,
        canAccess: true,
        action: 'collected',
        message: `Package collected successfully by ${delivery.courierName}`
      });
    }

    // If already delivered
    if (delivery.status === 'delivered') {
      return res.json({
        success: false,
        delivery,
        canAccess: false,
        action: 'already_collected',
        message: 'Package already collected'
      });
    }

    // If returned or failed
    const action = delivery.status === 'returned' ? 'returned' : 
                   delivery.status === 'failed' ? 'failed' : 'unknown';

    // Create access log for the attempt
    const accessLog = new AccessLog({
      personId: delivery.courierPhone,
      personType: 'delivery',
      personName: delivery.courierName,
      personPhone: delivery.courierPhone,
      action: 'delivery_denied',
      apartmentId: delivery.apartmentId,
      roomNumber: delivery.roomNumber,
      gateNumber: 'main',
      verifiedBy: guardId,
      method: 'qr',
      relatedDeliveryId: delivery._id
    });
    await accessLog.save();

    res.json({
      success: false,
      delivery,
      accessLog,
      canAccess: false,
      action,
      message: delivery.status === 'returned' 
        ? 'Package was returned' 
        : delivery.status === 'failed'
          ? 'Delivery failed'
          : 'Cannot access'
    });
  } catch (error) {
    console.error('Verify delivery by QR error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
