const Exam = require('../models/Exam');
const ExamMark = require('../models/ExamMark');
const Student = require('../models/Student');
const Class = require('../models/Class');
const Subject = require('../models/Subject');
const asyncHandler = require('../middleware/asyncHandler');
const mongoose = require('mongoose');

const school = req => req.user.schoolId;
const objectId = value => typeof value === 'string' && mongoose.isValidObjectId(value);
const invalidId = (res) => res.status(400).json({ success: false, error: 'Invalid identifier' });
const examFields = ['name', 'examType', 'subjectId', 'classId', 'startDate', 'endDate', 'examDate', 'examTime', 'duration', 'totalMarks', 'passingMarks', 'description', 'status', 'syllabusTopics', 'instructions'];
const pick = (input, fields) => Object.fromEntries(fields.filter(key => Object.prototype.hasOwnProperty.call(input, key)).map(key => [key, input[key]]));
const validFilters = (req, names) => names.every(name => req.query[name] === undefined || objectId(req.query[name]));
async function validExamRefs(data, schoolId) {
  if (!objectId(data.classId) || !objectId(data.subjectId)) return false;
  const [schoolClass, subject] = await Promise.all([Class.exists({ _id: data.classId, schoolId }), Subject.exists({ _id: data.subjectId, schoolId })]);
  return Boolean(schoolClass && subject);
}

// @desc    Get all exams
// @route   GET /api/exams
// @access  Private
exports.getExams = asyncHandler(async (req, res) => {
  const { classId, subjectId, status } = req.query;
  if (!validFilters(req, ['classId', 'subjectId'])) return invalidId(res);
  
  const filter = { schoolId: school(req) };
  if (classId) filter.classId = classId;
  if (subjectId) filter.subjectId = subjectId;
  if (typeof status === 'string' && ['upcoming', 'ongoing', 'completed', 'cancelled'].includes(status)) filter.status = status;
  
  const exams = await Exam.find(filter)
    .populate('classId', 'name section')
    .populate('subjectId', 'name code')
    .populate('createdBy', 'name email')
    .sort({ examDate: -1 });
  
  res.status(200).json({
    success: true,
    count: exams.length,
    data: exams
  });
});

// @desc    Get single exam
// @route   GET /api/exams/:id
// @access  Private
exports.getExam = asyncHandler(async (req, res) => {
  if (!objectId(req.params.id)) return invalidId(res);
  const exam = await Exam.findOne({ _id: req.params.id, schoolId: school(req) })
    .populate('classId', 'name section')
    .populate('subjectId', 'name code')
    .populate('createdBy', 'name email')
    .populate('updatedBy', 'name email');
  
  if (!exam) {
    return res.status(404).json({
      success: false,
      error: 'Exam not found'
    });
  }
  
  res.status(200).json({
    success: true,
    data: exam
  });
});

// @desc    Create new exam
// @route   POST /api/exams
// @access  Private
exports.createExam = asyncHandler(async (req, res) => {
  const data = pick(req.body, examFields);
  if (!await validExamRefs(data, school(req))) return invalidId(res);
  const exam = await Exam.create({ ...data, schoolId: school(req), createdBy: req.user._id });
  
  const populatedExam = await Exam.findById(exam._id)
    .populate('classId', 'name section')
    .populate('subjectId', 'name code')
    .populate('createdBy', 'name email');
  
  res.status(201).json({
    success: true,
    data: populatedExam
  });
});

// @desc    Update exam
// @route   PUT /api/exams/:id
// @access  Private
exports.updateExam = asyncHandler(async (req, res) => {
  if (!objectId(req.params.id)) return invalidId(res);
  let exam = await Exam.findOne({ _id: req.params.id, schoolId: school(req) });
  
  if (!exam) {
    return res.status(404).json({
      success: false,
      error: 'Exam not found'
    });
  }
  
  const data = pick(req.body, examFields);
  if (!await validExamRefs({ classId: data.classId || String(exam.classId), subjectId: data.subjectId || String(exam.subjectId) }, school(req))) return invalidId(res);
  exam = await Exam.findOneAndUpdate(
    { _id: req.params.id, schoolId: school(req) },
    { ...data, updatedBy: req.user._id },
    {
      new: true,
      runValidators: true
    }
  )
    .populate('classId', 'name section')
    .populate('subjectId', 'name code')
    .populate('updatedBy', 'name email');
  
  res.status(200).json({
    success: true,
    data: exam
  });
});

// @desc    Delete exam
// @route   DELETE /api/exams/:id
// @access  Private
exports.deleteExam = asyncHandler(async (req, res) => {
  if (!objectId(req.params.id)) return invalidId(res);
  const exam = await Exam.findOne({ _id: req.params.id, schoolId: school(req) });
  
  if (!exam) {
    return res.status(404).json({
      success: false,
      error: 'Exam not found'
    });
  }
  
  // Delete associated marks
  await ExamMark.deleteMany({ examId: req.params.id, schoolId: school(req) });
  
  await exam.deleteOne();
  
  res.status(200).json({
    success: true,
    data: {}
  });
});

// @desc    Get exam statistics for overview
// @route   GET /api/exams/stats/overview
// @access  Private
exports.getExamStats = asyncHandler(async (req, res) => {
  const schoolId = school(req);
  
  // Total exams
  const totalExams = await Exam.countDocuments({ schoolId });
  
  // Active exams (upcoming and ongoing)
  const activeExams = await Exam.countDocuments({
    schoolId,
    status: { $in: ['upcoming', 'ongoing'] }
  });
  
  // Total students
  const totalStudents = await Student.countDocuments({ schoolId, isActive: true });
  
  // Average score (from exam marks)
  const avgScoreResult = await ExamMark.aggregate([
    { $match: { schoolId: new mongoose.Types.ObjectId(schoolId) } },
    { $group: {
      _id: null,
      avgPercentage: { $avg: '$percentage' }
    }}
  ]);
  
  const avgScore = avgScoreResult.length > 0 ? Math.round(avgScoreResult[0].avgPercentage) : 0;
  
  // Upcoming exams
  const upcomingExams = await Exam.find({
    schoolId,
    status: 'upcoming'
  })
    .populate('classId', 'name section')
    .populate('subjectId', 'name')
    .sort({ examDate: 1 })
    .limit(5);
  
  // Recent results by class
  const recentResults = await ExamMark.aggregate([
    { $match: { schoolId: new mongoose.Types.ObjectId(schoolId) } },
    {
      $group: {
        _id: '$classId',
        avgPercentage: { $avg: '$percentage' }
      }
    },
    {
      $lookup: {
        from: 'classes',
        localField: '_id',
        foreignField: '_id',
        as: 'classInfo'
      }
    },
    { $unwind: '$classInfo' },
    {
      $project: {
        className: '$classInfo.name',
        avgPercentage: { $round: ['$avgPercentage', 0] }
      }
    },
    { $sort: { avgPercentage: -1 } },
    { $limit: 5 }
  ]);
  
  res.status(200).json({
    success: true,
    data: {
      totalExams,
      activeExams,
      totalStudents,
      avgScore,
      upcomingExams,
      recentResults
    }
  });
});

// @desc    Get exam marks for a specific exam
// @route   GET /api/exams/:id/marks
// @access  Private
exports.getExamMarks = asyncHandler(async (req, res) => {
  if (!objectId(req.params.id)) return invalidId(res);
  const exam = await Exam.exists({ _id: req.params.id, schoolId: school(req) });
  if (!exam) return res.status(404).json({ success: false, error: 'Exam not found' });
  const marks = await ExamMark.find({ examId: req.params.id, schoolId: school(req) })
    .populate('studentId', 'name rollNumber')
    .populate('subjectId', 'name')
    .sort({ 'studentId.rollNumber': 1 });
  
  res.status(200).json({
    success: true,
    count: marks.length,
    data: marks
  });
});

// @desc    Add or update exam marks
// @route   POST /api/exams/:id/marks
// @access  Private
exports.addExamMarks = asyncHandler(async (req, res) => {
  const { studentId, marksObtained, remarks, isAbsent } = req.body;
  if (!objectId(req.params.id) || !objectId(studentId)) return invalidId(res);
  const exam = await Exam.findOne({ _id: req.params.id, schoolId: school(req) });
  if (!exam) {
    return res.status(404).json({
      success: false,
      error: 'Exam not found'
    });
  }
  const student = await Student.exists({ _id: studentId, schoolId: school(req), classId: exam.classId });
  if (!student || typeof marksObtained !== 'number' || !Number.isFinite(marksObtained) || marksObtained < 0 || marksObtained > exam.totalMarks || typeof isAbsent !== 'boolean' || (remarks !== undefined && typeof remarks !== 'string')) {
    return res.status(400).json({ success: false, error: 'Invalid student or marks' });
  }
  
  // Check if marks already exist
  let examMark = await ExamMark.findOne({
    examId: req.params.id,
    schoolId: school(req),
    studentId
  });
  
  if (examMark) {
    // Update existing marks
    examMark.marksObtained = marksObtained;
    examMark.remarks = remarks?.slice(0, 1000);
    examMark.isAbsent = isAbsent;
    examMark.updatedBy = req.user.id;
    await examMark.save();
  } else {
    // Create new marks entry
    examMark = await ExamMark.create({
      schoolId: exam.schoolId,
      examId: req.params.id,
      studentId,
      classId: exam.classId,
      subjectId: exam.subjectId,
      marksObtained,
      totalMarks: exam.totalMarks,
      remarks: remarks?.slice(0, 1000),
      isAbsent,
      enteredBy: req.user.id
    });
  }
  
  const populatedMark = await ExamMark.findById(examMark._id)
    .populate('studentId', 'name rollNumber')
    .populate('subjectId', 'name');
  
  res.status(200).json({
    success: true,
    data: populatedMark
  });
});

// @desc    Get all exam marks with filters
// @route   GET /api/exams/marks
// @access  Private
exports.getAllExamMarks = asyncHandler(async (req, res) => {
  const { classId, studentId, examId } = req.query;
  if (!validFilters(req, ['classId', 'studentId', 'examId'])) return invalidId(res);
  
  const filter = { schoolId: school(req) };
  if (classId) filter.classId = classId;
  if (studentId) filter.studentId = studentId;
  if (examId) filter.examId = examId;
  
  const marks = await ExamMark.find(filter)
    .populate('studentId', 'name rollNumber')
    .populate('examId', 'name examType examDate')
    .populate('subjectId', 'name code')
    .populate('classId', 'name section')
    .sort({ createdAt: -1 });
  
  res.status(200).json({
    success: true,
    count: marks.length,
    data: marks
  });
});

// @desc    Update exam mark
// @route   PUT /api/exams/marks/:id
// @access  Private
exports.updateExamMark = asyncHandler(async (req, res) => {
  if (!objectId(req.params.id)) return invalidId(res);
  let mark = await ExamMark.findOne({ _id: req.params.id, schoolId: school(req) });
  
  if (!mark) {
    return res.status(404).json({
      success: false,
      error: 'Exam mark not found'
    });
  }
  
  const data = pick(req.body, ['marksObtained', 'remarks', 'isAbsent']);
  if (data.marksObtained !== undefined && (typeof data.marksObtained !== 'number' || !Number.isFinite(data.marksObtained) || data.marksObtained < 0 || data.marksObtained > mark.totalMarks)) return res.status(400).json({ success: false, error: 'Invalid marks' });
  if (data.remarks !== undefined && typeof data.remarks !== 'string') return res.status(400).json({ success: false, error: 'Invalid remarks' });
  if (data.isAbsent !== undefined && typeof data.isAbsent !== 'boolean') return res.status(400).json({ success: false, error: 'Invalid absence flag' });
  if (data.remarks) data.remarks = data.remarks.slice(0, 1000);
  mark = await ExamMark.findOneAndUpdate(
    { _id: req.params.id, schoolId: school(req) },
    { ...data, updatedBy: req.user._id },
    {
      new: true,
      runValidators: true
    }
  )
    .populate('studentId', 'name rollNumber')
    .populate('examId', 'name examType')
    .populate('subjectId', 'name');
  
  res.status(200).json({
    success: true,
    data: mark
  });
});

// @desc    Delete exam mark
// @route   DELETE /api/exams/marks/:id
// @access  Private
exports.deleteExamMark = asyncHandler(async (req, res) => {
  if (!objectId(req.params.id)) return invalidId(res);
  const mark = await ExamMark.findOne({ _id: req.params.id, schoolId: school(req) });
  
  if (!mark) {
    return res.status(404).json({
      success: false,
      error: 'Exam mark not found'
    });
  }
  
  await mark.deleteOne();
  
  res.status(200).json({
    success: true,
    data: {}
  });
});

// @desc    Get exam schedule
// @route   GET /api/exams/schedule
// @access  Private
exports.getExamSchedule = asyncHandler(async (req, res) => {
  const { classId, startDate, endDate } = req.query;
  if (!validFilters(req, ['classId'])) return invalidId(res);
  
  const filter = { schoolId: school(req) };
  if (classId) filter.classId = classId;
  
  if (startDate && endDate) {
    if (typeof startDate !== 'string' || typeof endDate !== 'string' || Number.isNaN(Date.parse(startDate)) || Number.isNaN(Date.parse(endDate))) return res.status(400).json({ success: false, error: 'Invalid date range' });
    filter.examDate = {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    };
  }
  
  const schedule = await Exam.find(filter)
    .populate('classId', 'name section')
    .populate('subjectId', 'name code')
    .sort({ examDate: 1, examTime: 1 });
  
  res.status(200).json({
    success: true,
    count: schedule.length,
    data: schedule
  });
});

// @desc    Get date sheet (class-wise exam schedule)
// @route   GET /api/exams/date-sheet
// @access  Private
exports.getDateSheet = asyncHandler(async (req, res) => {
  const { classId } = req.query;
  if (!validFilters(req, ['classId'])) return invalidId(res);
  
  const filter = { schoolId: school(req), status: { $in: ['upcoming', 'ongoing'] } };
  if (classId) filter.classId = classId;
  
  const dateSheet = await Exam.find(filter)
    .populate('classId', 'name section')
    .populate('subjectId', 'name code')
    .sort({ examDate: 1, examTime: 1 });
  
  // Group by class if no specific class is requested
  let groupedDateSheet = {};
  if (!classId) {
    dateSheet.forEach(exam => {
      const className = exam.classId?.name || 'Unknown';
      if (!groupedDateSheet[className]) {
        groupedDateSheet[className] = [];
      }
      groupedDateSheet[className].push(exam);
    });
  } else {
    groupedDateSheet = { [dateSheet[0]?.classId?.name || 'Class']: dateSheet };
  }
  
  res.status(200).json({
    success: true,
    data: groupedDateSheet
  });
});

// @desc    Bulk create exams
// @route   POST /api/exams/bulk
// @access  Private
exports.bulkCreateExams = asyncHandler(async (req, res) => {
  const { exams } = req.body;
  
  if (!Array.isArray(exams) || exams.length === 0 || exams.length > 50) {
    return res.status(400).json({
      success: false,
      error: 'Exams array is required'
    });
  }
  
  // Add creator info to all exams
  const examsWithCreator = exams.map(exam => ({ ...pick(exam, examFields), schoolId: school(req), createdBy: req.user._id }));
  for (const exam of examsWithCreator) {
    if (!await validExamRefs(exam, school(req))) return invalidId(res);
  }
  
  const createdExams = await Exam.insertMany(examsWithCreator);
  
  res.status(201).json({
    success: true,
    count: createdExams.length,
    data: createdExams
  });
});

module.exports = exports;

