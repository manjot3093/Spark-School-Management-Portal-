const mongoose = require('mongoose');

const studentPaymentPlanSchema = new mongoose.Schema({
  school: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'School',
    required: [true, 'School ID is required']
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: [true, 'Student ID is required']
  },
  academicYear: {
    type: String,
    required: [true, 'Academic year is required'],
    trim: true
  },
  // annual = 1 payment; monthly = 12 installments; quarterly = 4 installments (for recurring fees only)
  plan: {
    type: String,
    enum: ['annual', 'monthly', 'quarterly'],
    default: 'monthly'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, {
  timestamps: true
});

// One plan per student per academic year
studentPaymentPlanSchema.index({ school: 1, student: 1, academicYear: 1 }, { unique: true });
studentPaymentPlanSchema.index({ student: 1, academicYear: 1 });

module.exports = mongoose.model('StudentPaymentPlan', studentPaymentPlanSchema);
