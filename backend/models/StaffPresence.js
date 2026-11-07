const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
  accuracy: { type: Number, required: true },
  observedAt: { type: Date, required: true },
  expiresAt: { type: Date, required: true }
}, { versionKey: false });

schema.index({ schoolId: 1, userId: 1 }, { unique: true });
schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('StaffPresence', schema);
