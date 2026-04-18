const { Notification, User } = require('../models');
const mongoose = require('mongoose');

// Helper function to validate MongoDB ObjectId
const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id) && new mongoose.Types.ObjectId(id).toString() === id;
};

// Create bulk notifications for announcement (broadcast to users in admin's property)
exports.broadcastAnnouncement = async (req, res) => {
  try {
    const { title, message, target } = req.body;
    const senderId = req.user.userId;
    const senderRole = req.user.role;
    
    if (!title || !message) {
      return res.status(400).json({ success: false, message: 'title and message are required' });
    }

    const io = req.app.get('io');

    // Determine property context based on sender role
    let targetApartmentIds = [];
    if (senderRole === 'admin') {
      const { Apartment } = require('../models');
      const adminApartments = await Apartment.find({ adminId: senderId }).select('_id');
      targetApartmentIds = adminApartments.map(a => a._id);
    } else {
      // For tenants and guards, use their assigned apartmentId
      const sender = await User.findById(senderId).select('apartmentId');
      if (sender?.apartmentId) {
        targetApartmentIds = [sender.apartmentId];
      }
    }
    
    if (targetApartmentIds.length === 0) {
      return res.status(400).json({ success: false, message: 'No property context found for sender' });
    }

    // Create notifications for users based on target - filtered by property context
    let users = [];
    const baseQuery = { apartmentId: { $in: targetApartmentIds } };

    if (target === 'all') {
      users = await User.find(baseQuery);
    } else if (target === 'tenants') {
      users = await User.find({ ...baseQuery, role: 'tenant' });
    } else if (target === 'guards') {
      users = await User.find({ ...baseQuery, role: 'guard' });
    } else if (target === 'admins') {
      users = await User.find({ ...baseQuery, role: 'admin' });
    }

    // Create notification records with adminId for tracking
    const bulkNotifications = users.map(user => {
      return {
        userId: user._id,
        adminId: senderRole === 'admin' ? senderId : null,
        title,
        message,
        type: 'announcement',
        isRead: false,
        senderRole: senderRole
      };
    });

    if (bulkNotifications.length > 0) {
      await Notification.insertMany(bulkNotifications);
    }

    // Emit socket event for real-time update (only to users in same property)
    if (io) {
      io.to(`apartment-${targetApartmentIds[0]}`).emit('announcement:new', {
        announcement: { title, message, target, createdAt: new Date(), senderId, senderRole },
        timestamp: new Date(),
        senderId,
        senderRole
      });
    }

    res.status(201).json({ 
      success: true, 
      message: `Announcement sent to ${bulkNotifications.length} users`,
      recipientCount: bulkNotifications.length
    });
  } catch (error) {
    console.error('Broadcast announcement error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Create notification (for internal use and API)
exports.createNotification = async (req, res) => {
  try {
    const { userId, title, message, type, data } = req.body;
    
    if (!userId || !title || !message) {
      return res.status(400).json({ success: false, message: 'userId, title, and message are required' });
    }

    const notification = new Notification({
      userId,
      title,
      message,
      type: type || 'general',
      data,
      isRead: false
    });

    await notification.save();

    res.status(201).json({ success: true, notification });
  } catch (error) {
    console.error('Create notification error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get notifications for current user - with data isolation
exports.getNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 20, unreadOnly } = req.query;
    const userId = req.user.userId;
    const userRole = req.user.role;

    const query = { userId };
    
    // For admins, also filter by their adminId to show only their own announcements
    if (userRole === 'admin') {
      // Include adminId in query for announcements, OR show user's own notifications
      query.$or = [
        { userId: userId },  // User's own notifications
        { adminId: userId }  // Announcements created by this admin
      ];
    }
    
    if (unreadOnly === 'true') {
      query.isRead = false;
    }

    const notifications = await Notification.find(query)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    // Count total (respecting the query)
    let countQuery;
    if (userRole === 'admin') {
      countQuery = { 
        $or: [
          { userId: userId },
          { adminId: userId }
        ]
      };
    } else {
      countQuery = { userId };
    }
    const count = await Notification.countDocuments(countQuery);
    
    // Build unread query properly (especially for admins with $or)
    let unreadQuery;
    if (userRole === 'admin') {
      unreadQuery = { 
        $or: [
          { userId: userId, isRead: false },
          { adminId: userId, isRead: false }
        ]
      };
    } else {
      unreadQuery = { userId, isRead: false };
    }
    const unreadCount = await Notification.countDocuments(unreadQuery);

    res.json({
      success: true,
      notifications,
      unreadCount,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      total: count
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Mark notification as read
exports.markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    // Validate the ID format
    if (!id || !isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid notification ID' });
    }

    const notification = await Notification.findOneAndUpdate(
      { _id: id, userId },
      { isRead: true, readAt: new Date() },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    res.json({ success: true, message: 'Notification marked as read', notification });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Mark all notifications as read
exports.markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.userId;

    await Notification.updateMany(
      { userId, isRead: false },
      { isRead: true, readAt: new Date() }
    );

    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Mark all as read error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Delete notification
exports.deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    // Validate the ID format
    if (!id || !isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid notification ID' });
    }

    const notification = await Notification.findOneAndDelete({ _id: id, userId });

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    res.json({ success: true, message: 'Notification deleted' });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get unread count
exports.getUnreadCount = async (req, res) => {
  try {
    const userId = req.user.userId;
    const userRole = req.user.role;
    
    let query;
    if (userRole === 'admin') {
      query = { 
        $or: [
          { userId: userId, isRead: false },
          { adminId: userId, isRead: false }
        ]
      };
    } else {
      query = { userId, isRead: false };
    }
    
    const count = await Notification.countDocuments(query);

    res.json({ success: true, count });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
