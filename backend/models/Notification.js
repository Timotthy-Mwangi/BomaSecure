const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Track which admin created the notification (for data isolation)
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  type: {
    type: String,
    enum: [
      'visitor_arrival',
      'visitor_approved',
      'visitor_denied',
      'delivery_arrival',
      'delivery_confirmed',
      'access_granted',
      'access_denied',
      'security_alert',
      'emergency',
      'system',
      'reminder',
      'announcement',
      'subscription',
      'maintenance_created',
      'maintenance_received',
      'maintenance_in_progress',
      'maintenance_resolved'
    ],
    required: true
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  isRead: {
    type: Boolean,
    default: false
  },
  readAt: {
    type: Date
  },
  data: {
    visitorId: mongoose.Schema.Types.ObjectId,
    deliveryId: mongoose.Schema.Types.ObjectId,
    apartmentId: mongoose.Schema.Types.ObjectId,
    actionUrl: String
  },
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },
  channel: {
    type: String,
    enum: ['in_app', 'call', 'push', 'email', 'all'],
    default: 'in_app'
  },
  sentVia: {
    call: { type: Boolean, default: false },
    push: { type: Boolean, default: false },
    email: { type: Boolean, default: false }
  }
}, {
  timestamps: true
});

notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, isRead: 1 });
notificationSchema.index({ type: 1 });

module.exports = mongoose.model('Notification', notificationSchema);
