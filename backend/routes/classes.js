const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const {
  getClasses,
  getClass,
  createClass,
  updateClass,
  deleteClass,
  getClassStats
} = require('../controllers/classController');
const {
  classValidation,
  classUpdateValidation
} = require('../middleware/classValidation');

const router = express.Router();
const validId = (req, res, next) => /^[a-f\d]{24}$/i.test(req.params.id) ? next() : res.status(400).json({ success: false, error: 'Invalid class ID' });

// All routes are protected
router.use(protect);

// Class management routes (School Admin only)
router.get('/', authorize('school_admin', 'teacher'), getClasses);
router.get('/stats', authorize('school_admin'), getClassStats);
router.get('/:id', authorize('school_admin', 'teacher'), validId, getClass);
router.post('/', authorize('school_admin'), classValidation, createClass);
router.put('/:id', authorize('school_admin'), validId, classUpdateValidation, updateClass);
router.delete('/:id', authorize('school_admin'), validId, deleteClass);

module.exports = router;
