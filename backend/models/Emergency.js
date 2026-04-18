const mongoose = require('mongoose');

const emergencySchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: ['fire', 'medical', 'security', 'security_alert', 'intruder', 'natural_disaster', 'other']
  },
  severity: {
    type: String,
    required: true,
    enum: ['critical', 'high', 'medium', 'low'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['active', 'resolved', 'investigating'],
    default: 'active'
  },
  location: {
    building: String,
    floor: String,
    room: String,
    description: String
  },
  description: {
    type: String,
    required: true
  },
  reportedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  apartmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Apartment'
  },
  resolvedAt: Date,
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  resolutionNotes: String,
  attachments: [String],
  isEmergency: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for faster queries
emergencySchema.index({ status: 1, createdAt: -1 });
emergencySchema.index({ apartmentId: 1, status: 1 });

module.exports = mongoose.model('Emergency', emergencySchema);
