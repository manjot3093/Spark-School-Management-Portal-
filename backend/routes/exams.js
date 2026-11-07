const express = require('express');
const router = express.Router();
const {
  getExams,
  getExam,
  createExam,
  updateExam,
  deleteExam,
  getExamStats,
  getExamMarks,
  addExamMarks,
  getAllExamMarks,
  updateExamMark,
  deleteExamMark,
  getExamSchedule,
  getDateSheet,
  bulkCreateExams
} = require('../controllers/examController');
const { protect, authorize } = require('../middleware/auth');
const papers = require('../controllers/questionPaperController');

router.get('/papers', protect, authorize('school_admin', 'teacher'), papers.list);
router.post('/papers/generate', protect, authorize('school_admin', 'teacher'), papers.generate);
router.get('/papers/:id', protect, authorize('school_admin', 'teacher'), papers.get);
router.put('/papers/:id', protect, authorize('school_admin', 'teacher'), papers.update);
router.post('/papers/:id/approve', protect, authorize('school_admin', 'teacher'), papers.approve);

// School exam administration, marks and schedules are restricted to school admins.
router.use(protect, authorize('school_admin'));

// Stats and overview routes (before :id routes)
router.get('/stats/overview', protect, getExamStats);
router.get('/schedule', protect, getExamSchedule);
router.get('/date-sheet', protect, getDateSheet);

// Bulk operations
router.post('/bulk', protect, bulkCreateExams);

// Exam marks routes
router.route('/marks')
  .get(protect, getAllExamMarks);

router.route('/marks/:id')
  .put(protect, updateExamMark)
  .delete(protect, deleteExamMark);

// Individual exam marks routes
router.route('/:id/marks')
  .get(protect, getExamMarks)
  .post(protect, addExamMarks);

// Main exam CRUD routes
router.route('/')
  .get(protect, getExams)
  .post(protect, createExam);

router.route('/:id')
  .get(protect, getExam)
  .put(protect, updateExam)
  .delete(protect, deleteExam);

module.exports = router;

