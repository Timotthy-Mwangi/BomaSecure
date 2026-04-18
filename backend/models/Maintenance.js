const mongoose = require('mongoose');

const maintenanceSchema = new mongoose.Schema({
  category: {
    type: String,
    enum: ['plumbing', 'electrical', 'hvac', 'appliance', 'structural', 'pest', 'other'],
    required: true
  },
  description: {
    type: String,
    required: true
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'emergency'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'resolved', 'cancelled'],
    default: 'pending'
  },
  reportedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  apartmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Apartment'
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  photos: [{
    type: String
  }],
  resolvedAt: {
    type: Date
  },
  resolutionNotes: {
    type: String
  },
  isGuestSubmission: {
    type: Boolean,
    default: false
  },
  guestInfo: {
    name: String,
    phone: String,
    unitNumber: String
  }
}, {
  timestamps: true
});

maintenanceSchema.index({ status: 1, createdAt: -1 });
maintenanceSchema.index({ reportedBy: 1 });
maintenanceSchema.index({ apartmentId: 1 });

module.exports = mongoose.model('Maintenance', maintenanceSchema);