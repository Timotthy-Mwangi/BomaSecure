const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  apartmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Apartment'
  },
  unitId: {
    type: String
  },
  paymentType: {
    type: String,
    enum: ['subscription', 'rent', 'deposit', 'utility', 'fine', 'other'],
    default: 'rent'
  },
  rentPeriod: {
    month: {
      type: Number,
      min: 1,
      max: 12
    },
    year: {
      type: Number
    }
  },
  dueDate: {
    type: Date
  },
  amount: {
    type: Number,
    required: true
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
  balance: {
    type: Number,
    default: 0
  },
  previousBalance: {
    type: Number,
    default: 0
  },
  currency: {
    type: String,
    default: 'KES'
  },
  paymentMethod: {
    type: String,
    enum: ['mpesa', 'bank', 'card', 'cash', 'cheque'],
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'cancelled', 'partial'],
    default: 'pending'
  },
  transactionId: {
    type: String,
    unique: true,
    sparse: true
  },
  mpesaReceiptNumber: {
    type: String
  },
  phoneNumber: {
    type: String
  },
  bankReference: {
    type: String
  },
  bankName: {
    type: String
  },
  accountNumber: {
    type: String
  },
  description: {
    type: String
  },
  subscription: {
    plan: {
      type: String,
      enum: ['free', 'basic', 'premium', 'enterprise'],
      default: 'basic'
    },
    startDate: Date,
    endDate: Date,
    months: {
      type: Number,
      default: 1
    }
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed
  },
  // Paystack subaccount for revenue splitting
  subaccountCode: {
    type: String,
    trim: true,
    default: ''
  },
  paidAt: {
    type: Date
  },
  revenueSplit: {
    platformFeePercent: {
      type: Number,
      default: 0
    },
    platformFeeAmount: {
      type: Number,
      default: 0
    },
    adminEarning: {
      type: Number,
      default: 0
    },
    tenantSharePercent: {
      type: Number,
      default: 0
    },
    tenantShareAmount: {
      type: Number,
      default: 0
    },
    payoutStatus: {
      type: String,
      enum: ['pending', 'processing', 'paid', 'failed'],
      default: 'pending'
    },
    payoutDate: {
      type: Date
    },
    planType: {
      type: String,
      enum: ['free', 'standard', 'premium', 'trial'],
      default: 'standard'
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Generate transaction ID
paymentSchema.pre('save', function(next) {
  if (!this.transactionId) {
    const prefix = this.paymentMethod === 'mpesa' ? 'MPE' : this.paymentMethod === 'bank' ? 'BNK' : 'CRD';
    this.transactionId = `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  }
  this.updatedAt = new Date();
  next();
});

// Index for faster queries
paymentSchema.index({ userId: 1, status: 1 });
paymentSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Payment', paymentSchema);
