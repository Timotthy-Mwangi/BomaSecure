const mongoose = require('mongoose');

const visitorSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  idNumber: {
    type: String,
    trim: true
  },
  vehiclePlate: {
    type: String,
    trim: true
  },
  purpose: {
    type: String,
    enum: ['guest', 'delivery', 'maintenance', 'official', 'other'],
    default: 'guest'
  },
  hostTenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  apartmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Apartment',
    required: true
  },
  roomNumber: {
    type: String,
    required: true
  },
  qrCode: {
    type: String,
    unique: true
  },
  qrCodeImage: {
    type: String // Base64 QR code image for frontend display
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'denied', 'checked-in', 'checked-out', 'cancelled'],
    default: 'pending'
  },
  expectedArrival: {
    type: Date
  },
  checkInTime: {
    type: Date
  },
  checkOutTime: {
    type: Date
  },
  checkInPhoto: {
    type: String
  },
  checkOutPhoto: {
    type: String
  },
  visitDate: {
    type: Date,
    default: Date.now
  },
  visitDuration: {
    type: Number, // in minutes
    default: 0
  },
  notes: {
    type: String
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: {
    type: Date
  },
  deniedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  deniedAt: {
    type: Date
  },
  denialReason: {
    type: String
  }
}, {
  timestamps: true
});

visitorSchema.index({ hostTenantId: 1 });
visitorSchema.index({ apartmentId: 1 });
visitorSchema.index({ status: 1 });
visitorSchema.index({ visitDate: -1 });

visitorSchema.pre('save', function(next) {
  if (!this.qrCode) {
    this.qrCode = `VIS-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  }
  next();
});

module.exports = mongoose.model('Visitor', visitorSchema);
