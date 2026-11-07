const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const {
  getSubjects,
  getSubject,
  createSubject,
  updateSubject,
  deleteSubject,
  assignSubjectTeacher
} = require('../controllers/subjectController');

const router = express.Router();
const validId = (req, res, next) => /^[a-f\d]{24}$/i.test(req.params.id) ? next() : res.status(400).json({ success: false, error: 'Invalid subject ID' });
const validBody = (req, res, next) => {
  const { name, code, teacherId, classId, type, status } = req.body;
  const text = (value, max) => typeof value === 'string' && value.trim().length > 0 && value.length <= max;
  const id = value => value == null || (typeof value === 'string' && /^[a-f\d]{24}$/i.test(value));
  if ((name !== undefined && !text(name, 100)) || (code !== undefined && !text(code, 20)) || !id(teacherId) || !id(classId) || (type !== undefined && !['core', 'elective', 'practical'].includes(type)) || (status !== undefined && !['active', 'inactive'].includes(status)) || (req.method === 'POST' && !text(name, 100))) return res.status(400).json({ success: false, error: 'Invalid subject input' });
  next();
};

// All routes are protected
router.use(protect);

// Routes - School Admin only
router.get('/', authorize('school_admin', 'teacher'), getSubjects);
router.get('/:id', authorize('school_admin'), validId, getSubject);
router.post('/', authorize('school_admin'), validBody, createSubject);
router.put('/:id', authorize('school_admin'), validId, validBody, updateSubject);
router.put('/:id/assign-teacher', authorize('school_admin'), validId, validBody, assignSubjectTeacher);
router.delete('/:id', authorize('school_admin'), validId, deleteSubject);

module.exports = router;
