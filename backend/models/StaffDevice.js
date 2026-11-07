const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  deviceId: { type: String, required: true, minlength: 8, maxlength: 64 },
  isDemo: { type: Boolean, default: false },
  demoPosition: { type: String, enum: ['inside', 'outside'], default: 'inside' },
  registeredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

schema.index({ schoolId: 1, userId: 1 }, { unique: true });
schema.index({ schoolId: 1, deviceId: 1 }, { unique: true });

module.exports = mongoose.model('StaffDevice', schema);
