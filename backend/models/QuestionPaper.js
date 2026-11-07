const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  text: { type: String, required: true, maxlength: 3000 },
  marks: { type: Number, required: true, min: 1, max: 100 },
  answer: { type: String, required: true, maxlength: 5000 },
}, { _id: true });

const questionPaperSchema = new mongoose.Schema({
  schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
  classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
  subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  title: { type: String, required: true, maxlength: 200 },
  topics: [{ type: String, maxlength: 200 }],
  instructions: { type: String, maxlength: 2000, default: '' },
  totalMarks: { type: Number, required: true, min: 1, max: 500 },
  questions: { type: [questionSchema], validate: value => value.length > 0 && value.length <= 50 },
  status: { type: String, enum: ['draft', 'approved'], default: 'draft' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedAt: Date,
}, { timestamps: true });

questionPaperSchema.index({ schoolId: 1, createdAt: -1 });
module.exports = mongoose.model('QuestionPaper', questionPaperSchema);
