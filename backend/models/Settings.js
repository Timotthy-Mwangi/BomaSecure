const mongoose = require('mongoose');

const bankAccountSchema = new mongoose.Schema({
  bankName: {
    type: String,
    required: true,
    trim: true
  },
  accountName: {
    type: String,
    required: true,
    trim: true
  },
  accountNumber: {
    type: String,
    required: true,
    trim: true
  },
  branch: {
    type: String,
    trim: true
  },
  swiftCode: {
    type: String,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isDefault: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

const settingsSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  value: {
    type: mongoose.Schema.Types.Mixed
  },
  category: {
    type: String,
    enum: ['payment', 'general', 'sms', 'email', 'notification'],
    default: 'general'
  },
  description: {
    type: String
  }
}, {
  timestamps: true
});

const Settings = mongoose.model('Settings', settingsSchema);
const BankAccount = mongoose.model('BankAccount', bankAccountSchema);

module.exports = { Settings, BankAccount };