const mongoose = require('mongoose');

const rentLedgerSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  apartmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Apartment'
  },
  unitNumber: {
    type: String
  },
  period: {
    month: {
      type: Number,
      min: 1,
      max: 12,
      required: true
    },
    year: {
      type: Number,
      required: true
    }
  },
  rentAmount: {
    type: Number,
    required: true
  },
  amountPaid: {
    type: Number,
    default: 0
  },
  balance: {
    type: Number,
    default: 0
  },
  lateFee: {
    type: Number,
    default: 0
  },
  lateFeeApplied: {
    type: Boolean,
    default: false
  },
  dueDate: {
    type: Date,
    required: true
  },
  paidDate: {
    type: Date
  },
  paymentMethod: {
    type: String,
    enum: ['mpesa', 'bank', 'cash', 'cheque', 'manual', 'other'],
    default: 'manual'
  },
  reference: {
    type: String
  },
  notes: {
    type: String
  },
  status: {
    type: String,
    enum: ['paid', 'partial', 'overdue', 'pending'],
    default: 'pending'
  },
  recordedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  recordedAt: {
    type: Date,
    default: Date.now
  },
  isManual: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

rentLedgerSchema.index({ tenantId: 1, 'period.year': 1, 'period.month': 1 });
rentLedgerSchema.index({ status: 1 });
rentLedgerSchema.index({ dueDate: 1 });

const RentLedger = mongoose.model('RentLedger', rentLedgerSchema);

module.exports = RentLedger;