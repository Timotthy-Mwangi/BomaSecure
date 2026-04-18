const { Notification, User } = require('../models');
const { emitToUser } = require('./websocketService');

const createNotification = async (io, userId, title, message, type, data = {}) => {
  try {
    const notification = new Notification({
      userId,
      title,
      message,
      type,
      isRead: false,
      data
    });

    await notification.save();

    if (io) {
      emitToUser(io, userId, 'notification:new', notification);
    }

    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    return null;
  }
};

const notifyMaintenanceStatusChange = async (io, request) => {
  const { _id, category, status, reportedBy, apartmentId, assignedTo } = request;
  
  const statusMessages = {
    pending: {
      title: 'New Maintenance Request',
      type: 'maintenance_received',
      socketEvent: 'maintenance:created'
    },
    in_progress: {
      title: 'Maintenance Started',
      type: 'maintenance_in_progress',
      socketEvent: 'maintenance:updated'
    },
    resolved: {
      title: 'Maintenance Resolved',
      type: 'maintenance_resolved',
      socketEvent: 'maintenance:updated'
    }
  };

  const statusInfo = statusMessages[status];
  if (!statusInfo) return;

  const categoryCapitalized = category.charAt(0).toUpperCase() + category.slice(1);
  
  const messages = {
    pending: `${categoryCapitalized} request received and pending assignment`,
    in_progress: `Your ${categoryCapitalized} request is now in progress`,
    resolved: `Your ${categoryCapitalized} request has been resolved`
  };

  const message = messages[status];

  if (status === 'pending') {
    let targetAdmins = [];
    
    if (apartmentId) {
      const { Apartment } = require('../models');
      const apartment = await Apartment.findById(apartmentId);
      if (apartment?.adminId) {
        const admin = await User.findOne({ _id: apartment.adminId, role: 'admin', isActive: true });
        if (admin) targetAdmins = [admin];
      }
    }
    
    if (targetAdmins.length === 0) {
      targetAdmins = await User.find({ role: 'admin', isActive: true });
    }
    
    for (const admin of targetAdmins) {
      await createNotification(io, admin._id, statusInfo.title, message, 'maintenance_created', { requestId: _id, apartmentId, status: 'pending' });
    }
    
    const maintenanceStaff = await User.find({ 
      role: 'maintenance', 
      isActive: true,
      isVerified: true,
      $or: [
        { serviceType: category },
        { serviceType: { $in: ['general', 'other'] } }
      ]
    });
    for (const staff of maintenanceStaff) {
      await createNotification(io, staff._id, statusInfo.title, message, 'maintenance_created', { requestId: _id, apartmentId, status: 'pending' });
    }

    if (io) {
      io.emit('maintenance:created', { requestId: _id, category, status: 'pending', apartmentId });
    }
  } else {
    if (reportedBy) {
      await createNotification(io, reportedBy, statusInfo.title, message, statusInfo.type, { requestId: _id, status });
    }

    if (assignedTo) {
      await createNotification(io, assignedTo, statusInfo.title, `You have been assigned a ${categoryCapitalized} request - ${status === 'in_progress' ? 'started working' : status}`, 'maintenance_assigned', { requestId: _id, status });
    }

    if (io) {
      io.emit('maintenance:updated', { requestId: _id, category, status, apartmentId });
    }
  }

  const guardUsers = await User.find({ role: 'guard', isActive: true });
  for (const guard of guardUsers) {
    await createNotification(io, guard._id, statusInfo.title, message, statusInfo.type, { requestId: _id, status });
  }
  
  const allMaintenanceStaff = await User.find({ 
    role: 'maintenance', 
    isActive: true,
    isVerified: true
  });
  for (const staff of allMaintenanceStaff) {
    await createNotification(io, staff._id, statusInfo.title, message, 'maintenance_notification', { requestId: _id, status });
  }
};

module.exports = {
  createNotification,
  notifyMaintenanceStatusChange
};