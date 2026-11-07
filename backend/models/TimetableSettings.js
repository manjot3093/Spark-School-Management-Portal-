const mongoose = require('mongoose');

const slot = { startTime: { type: String, required: true }, endTime: { type: String, required: true } };
const schema = new mongoose.Schema({
  schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, unique: true },
  days: [{ type: String, enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] }],
  periods: [slot],
  targets: [{ classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true }, subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true }, teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, weeklyPeriods: { type: Number, min: 1, max: 30, required: true } }],
  unavailable: [{ teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, dayOfWeek: { type: String, required: true }, ...slot }]
}, { timestamps: true });

module.exports = mongoose.model('TimetableSettings', schema);
