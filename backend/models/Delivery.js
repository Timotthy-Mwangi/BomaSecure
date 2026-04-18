const mongoose = require('mongoose');

const deliverySchema = new mongoose.Schema({
  courierName: {
    type: String,
    required: true,
    trim: true
  },
  courierPhone: {
    type: String,
    required: true,
    trim: true
  },
  courierCompany: {
    type: String,
    trim: true
  },
  parcelDescription: {
    type: String,
    required: true
  },
  parcelWeight: {
    type: Number
  },
  trackingNumber: {
    type: String,
    trim: true
  },
  vehiclePlate: {
    type: String,
    trim: true
  },
  recipientTenantId: {
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
    enum: ['pending', 'received', 'ready_for_pickup', 'delivered', 'returned', 'failed'],
    default: 'pending'
  },
  receivedByGuardId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  receivedAt: {
    type: Date
  },
  deliveredToTenantAt: {
    type: Date
  },
  deliveryPhoto: {
    type: String
  },
  signature: {
    type: String
  },
  returnReason: {
    type: String
  },
  deliveryAttempts: {
    type: Number,
    default: 0
  },
  notes: {
    type: String
  }
}, {
  timestamps: true
});

deliverySchema.index({ recipientTenantId: 1 });
deliverySchema.index({ apartmentId: 1 });
deliverySchema.index({ status: 1 });
deliverySchema.index({ createdAt: -1 });

deliverySchema.pre('save', function(next) {
  if (!this.qrCode) {
    this.qrCode = `DEL-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  }
  next();
});

module.exports = mongoose.model('Delivery', deliverySchema);
