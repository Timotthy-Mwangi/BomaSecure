const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  phone: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  email: {
    type: String,
    required: false,
    unique: true,
    sparse: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  role: {
    type: String,
    enum: ['tenant', 'guard', 'admin', 'delivery', 'maintenance', 'superadmin'],
    default: 'tenant'
  },
  isSuperAdmin: {
    type: Boolean,
    default: false
  },
  superAdminToken: {
    type: String,
    sparse: true
  },
  superAdminTokenExpires: {
    type: Date
  },
  superAdmin2FAEnabled: {
    type: Boolean,
    default: false
  },
  superAdmin2FASecret: {
    type: String
  },
  superAdminIPWhitelist: [{
    type: String
  }],
  superAdminLastActivity: {
    type: Date
  },
  superAdminLoginHistory: [{
    ip: String,
    userAgent: String,
    timestamp: { type: Date, default: Date.now },
    success: Boolean
  }],
  apartmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Apartment'
  },
  roomNumber: {
    type: String,
    trim: true
  },
  idNumber: {
    type: String,
    trim: true
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  profilePhoto: {
    type: String
  },
  fcmToken: {
    type: String
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
  },
  subscription: {
    plan: {
      type: String,
      enum: ['free', 'standard', 'premium', 'trial'],
      default: 'free'
    },
    startDate: Date,
    endDate: Date,
    isActive: {
      type: Boolean,
      default: false
    },
    planType: {
      type: String,
      enum: ['free', 'standard', 'premium'],
      default: 'free'
    },
    isTrial: {
      type: Boolean,
      default: false
    }
  },
  payoutSettings: {
    isEnabled: {
      type: Boolean,
      default: false
    },
    payoutPercent: {
      type: Number,
      default: 0
    },
    bankName: String,
    accountNumber: String,
    accountName: String,
    mpesaPhone: String,
    lastPayoutDate: Date,
    totalEarnings: {
      type: Number,
      default: 0
    },
    pendingPayout: {
      type: Number,
      default: 0
    }
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  rentAmount: {
    type: Number,
    default: 0
  },
  rentDueDate: {
    type: Date
  },
  rentDueDay: {
    type: Number,
    default: 31,
    min: 1,
    max: 31
  },
  rentDueTime: {
    type: String
  },
  depositAmount: {
    type: Number,
    default: 0
  },
  depositPaid: {
    type: Boolean,
    default: false
  },
  depositPaidAt: {
    type: Date
  },
  rentBalance: {
    type: Number,
    default: 0
  },
  rentStatus: {
    type: String,
    enum: ['paid', 'pending', 'overdue', 'partial'],
    default: 'pending'
  },
  currentPeriodStart: {
    type: Date
  },
  currentPeriodEnd: {
    type: Date
  },
  paymentHistory: [{
    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payment'
    },
    amount: Number,
    paidAt: Date,
    status: String
  }],
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  ratingCount: {
    type: Number,
    default: 0
  },
  serviceType: {
    type: String,
    enum: ['plumbing', 'electrical', 'carpentry', 'painting', 'hvac', 'general', 'appliance', 'other'],
    default: 'general'
  }
}, {
  timestamps: true
});

userSchema.index({ apartmentId: 1 });
userSchema.index({ role: 1 });
userSchema.index({ 'payoutSettings.isEnabled': 1 });

userSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.password;
  return user;
};

module.exports = mongoose.model('User', userSchema);
