const express = require('express');
const { body, param, validationResult } = require('express-validator');
const {
  getTeachers,
  getTeacherById,
  createTeacher,
  updateTeacher,
  deleteTeacher,
  getTeacherProfile,
  getTeacherStats
} = require('../controllers/teacherController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, error: 'Invalid input' });
  next();
};
const teacherFields = [
  body('name').isString().trim().notEmpty().isLength({ max: 100 }),
  body('email').isEmail().normalizeEmail(),
  body('phone').optional({ nullable: true }).isString().trim().isLength({ max: 30 })
];
const teacherUpdateFields = [
  body('name').optional().isString().trim().notEmpty().isLength({ max: 100 }),
  body('email').optional().isEmail().normalizeEmail(),
  body('phone').optional({ nullable: true }).isString().trim().isLength({ max: 30 })
];

// All routes are protected
router.use(protect);

// Routes - Teachers can access their own profile (must come before /:id route)
router.get('/profile', authorize('teacher'), getTeacherProfile);

// Routes - School Admin only
router.get('/', authorize('school_admin'), getTeachers);
router.get('/stats', authorize('school_admin'), getTeacherStats);
router.get('/:id', authorize('school_admin'), param('id').isMongoId(), validate, getTeacherById);
router.post('/', authorize('school_admin'), ...teacherFields, body('password').isString().isLength({ min: 12 }), validate, createTeacher);
router.put('/:id', authorize('school_admin'), param('id').isMongoId(), ...teacherUpdateFields, validate, updateTeacher);
router.delete('/:id', authorize('school_admin'), param('id').isMongoId(), validate, deleteTeacher);

module.exports = router;
