const mongoose = require('mongoose');

const unitSchema = new mongoose.Schema({
  number: {
    type: String,
    required: true
  },
  floor: {
    type: Number,
    required: true
  },
  type: {
    type: String,
    enum: ['studio', 'bedsitter', '1bed', '2bed', '3bed', '4bed', 'penthouse'],
    default: '1bed'
  },
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  tenantIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  isOccupied: {
    type: Boolean,
    default: false
  },
  size: {
    type: Number // in square meters
  },
  rent: {
    type: Number
  },
  rentDueDay: {
    type: Number,
    default: 31,
    min: 1,
    max: 31
  }
});

const gateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['main', 'side', 'parking', 'service', 'emergency'],
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  cameraUrl: {
    type: String
  }
});

const apartmentSchema = new mongoose.Schema({
  buildingName: {
    type: String,
    required: true,
    trim: true
  },
  buildingCode: {
    type: String,
    unique: true,
    sparse: true
  },
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  location: {
    address: String,
    city: {
      type: String,
      default: 'Nairobi'
    },
    county: {
      type: String,
      default: 'Nairobi'
    },
    latitude: Number,
    longitude: Number
  },
  units: [unitSchema],
  totalUnits: {
    type: Number,
    default: 0
  },
  occupiedUnits: {
    type: Number,
    default: 0
  },
  securityGuards: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  managers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  gates: [gateSchema],
  amenities: [{
    name: String,
    available: Boolean
  }],
  rules: {
    visitorPolicy: String,
    checkInTime: String,
    checkOutTime: String,
    maxVisitors: Number
  },
  isActive: {
    type: Boolean,
    default: true
  },
  subscription: {
    plan: {
      type: String,
      enum: ['free', 'standard', 'premium'],
      default: 'free'
    },
    price: {
      type: Number,
      default: 0
    },
    billingCycle: {
      type: String,
      enum: ['monthly', 'yearly'],
      default: 'monthly'
    },
    startDate: Date,
    endDate: Date,
    isActive: {
      type: Boolean,
      default: true
    },
    paymentMethod: {
      type: String,
      default: ''
    },
    lastPaymentDate: Date,
    nextPaymentDate: Date,
    hasUsedFreePlan: {
      type: Boolean,
      default: false
    },
     freePlanUsedAt: Date
   },
   // Paystack Subaccount for automatic revenue splitting
   paystackSubaccountCode: {
     type: String,
     trim: true,
     default: ''
   },
   settings: {
    timezone: {
      type: String,
      default: 'Africa/Nairobi'
    },
    currency: {
      type: String,
      default: 'USD'
    },
    rentDueDay: {
      type: Number,
      default: 31,
      min: 1,
      max: 31
    },
    rentDueTime: {
      type: String,
      default: '00:00'
    },
    visitorAutoApprove: {
      type: Boolean,
      default: false
    },
    deliveryNotifications: {
      type: Boolean,
      default: true
    },
    visitorNotifications: {
      type: Boolean,
      default: true
    },
    accessLogRetention: {
      type: Number,
      default: 90
    },
    maxVisitorsPerDay: {
      type: Number,
      default: 10
    },
    requirePhoto: {
      type: Boolean,
      default: true
    },
    requireId: {
      type: Boolean,
      default: false
    }
  }
}, {
  timestamps: true
});

apartmentSchema.pre('save', function(next) {
  this.totalUnits = this.units.length;
  this.occupiedUnits = this.units.filter(u => u.isOccupied).length;
  next();
});

apartmentSchema.index({ 'location.city': 1 });

module.exports = mongoose.model('Apartment', apartmentSchema);
