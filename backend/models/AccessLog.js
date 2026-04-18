const mongoose = require('mongoose');

const accessLogSchema = new mongoose.Schema({
  personId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  personType: {
    type: String,
    enum: ['tenant', 'visitor', 'delivery', 'guard', 'admin'],
    required: true
  },
  personName: {
    type: String,
    required: true
  },
  personPhone: {
    type: String
  },
  action: {
    type: String,
    enum: ['entry', 'exit', 'denied', 'approved', 'rejected'],
    required: true
  },
  apartmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Apartment'
  },
  roomNumber: {
    type: String
  },
  gateNumber: {
    type: String,
    enum: ['main', 'side', 'parking', 'service', 'emergency'],
    default: 'main'
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  method: {
    type: String,
    enum: ['qr', 'manual', 'face_recognition', 'phone', 'remote'],
    default: 'manual'
  },
  ipAddress: {
    type: String
  },
  deviceInfo: {
    type: String
  },
  photo: {
    type: String
  },
  notes: {
    type: String
  },
  relatedVisitorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Visitor'
  },
  relatedDeliveryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Delivery'
  },
  smsLog: {
    sent: { type: Boolean, default: false },
    recipient: String,
    attempts: { type: Number, default: 0 },
    lastAttemptAt: Date,
    error: String
  }
}, {
  timestamps: true
});

accessLogSchema.index({ apartmentId: 1, timestamp: -1 });
accessLogSchema.index({ personId: 1, timestamp: -1 });
accessLogSchema.index({ timestamp: -1 });
accessLogSchema.index({ action: 1 });

module.exports = mongoose.model('AccessLog', accessLogSchema);
