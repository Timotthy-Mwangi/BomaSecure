const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  userRole: {
    type: String,
    enum: ['admin', 'tenant', 'guard'],
    required: true,
  },
  apartmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Apartment',
    required: false, // Not all users (e.g., super admins) might have an apartmentId directly
  },
  subject: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100,
  },
  message: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000,
  },
  category: {
    type: String,
    enum: ['bug_report', 'feature_request', 'general_inquiry', 'complaint', 'suggestion', 'noise', 'cleanliness', 'security', 'parking', 'common_area', 'other'],
    default: 'general_inquiry',
  },
  status: {
    type: String,
    enum: ['new', 'in_progress', 'resolved', 'closed'],
    default: 'new',
  },
  adminNotes: {
    type: String,
    trim: true,
    maxlength: 500,
  },
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  resolvedAt: {
    type: Date,
  },
}, {
  timestamps: true,
});

feedbackSchema.index({ userId: 1, createdAt: -1 });
feedbackSchema.index({ apartmentId: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model('Feedback', feedbackSchema);