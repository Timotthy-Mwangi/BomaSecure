const mongoose = require('mongoose');

const promotionalAdSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },
  images: [{
    type: String
  }],
  imageUrl: {
    type: String
  },
  activeImageIndex: {
    type: Number,
    default: 0
  },
  linkUrl: {
    type: String,
    trim: true
  },
  contactPhone: {
    type: String,
    trim: true
  },
  adType: {
    type: String,
    enum: ['building', 'unit', 'promotion', 'general'],
    default: 'general'
  },
  apartmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Apartment'
  },
  unitId: {
    type: String
  },
  price: {
    type: Number
  },
  postedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  duration: {
    type: String,
    enum: ['24h', '7d', '30d'],
    required: true
  },
  pricePaid: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'USD'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['mpesa', 'card', 'bank', 'free', 'pending'],
    default: 'pending'
  },
  paymentReference: {
    type: String
  },
  paymentMetadata: {
    type: mongoose.Schema.Types.Mixed
  },
  status: {
    type: String,
    enum: ['active', 'expired', 'paused'],
    default: 'active'
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  endDate: {
    type: Date,
    required: true
  },
  impressions: {
    type: Number,
    default: 0
  },
  clicks: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

promotionalAdSchema.index({ status: 1, endDate: 1 });
promotionalAdSchema.index({ postedBy: 1 });
promotionalAdSchema.index({ adType: 1 });

promotionalAdSchema.methods.isExpired = function() {
  return new Date() > this.endDate;
};

promotionalAdSchema.methods.isActive = function() {
  return this.status === 'active' && !this.isExpired();
};

const PromotionalAd = mongoose.model('PromotionalAd', promotionalAdSchema);

module.exports = PromotionalAd;
