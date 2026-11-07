const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
  classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
  academicYear: { type: String, required: true },
  entries: [{ teacherId: mongoose.Schema.Types.ObjectId, subjectId: mongoose.Schema.Types.ObjectId, dayOfWeek: String, startTime: String, endTime: String }],
  unmet: [{ subjectId: mongoose.Schema.Types.ObjectId, remaining: Number }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

module.exports = mongoose.model('TimetableDraft', schema);
