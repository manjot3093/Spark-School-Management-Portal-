const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const {
  getSyllabus,
  getSyllabusById,
  createSyllabus,
  updateSyllabus,
  deleteSyllabus,
  getSyllabusByClassAndSubject,
  getTeacherSyllabus
} = require('../controllers/syllabusController');
const { uploadSyllabusFiles, handleUploadError } = require('../utils/cloudinary');
const mongoose = require('mongoose');
const path = require('path');
const Syllabus = require('../models/Syllabus');

const router = express.Router();

// All routes are protected
router.use(protect);

// Routes - Teachers can access their own syllabus
router.get('/teacher', authorize('teacher'), getTeacherSyllabus);
router.get('/:id/documents/:documentId', authorize('school_admin'), async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id) || !mongoose.isValidObjectId(req.params.documentId)) return res.sendStatus(400);
    const syllabus = await Syllabus.findOne({ _id: req.params.id, schoolId: req.user.schoolId }).select('documents');
    const document = syllabus?.documents.id(req.params.documentId);
    if (!document?.url?.startsWith('/uploads/documents/')) return res.sendStatus(404);
    const filename = document.url.slice('/uploads/documents/'.length);
    if (!/^[a-zA-Z0-9._-]+$/.test(filename)) return res.sendStatus(404);
    res.sendFile(path.join(__dirname, '../uploads/documents', filename));
  } catch (error) { next(error); }
});

// Routes - School Admin only
router.get('/', authorize('school_admin'), getSyllabus);
router.get('/class/:classId/subject/:subjectId', authorize('school_admin'), getSyllabusByClassAndSubject);
router.get('/:id', authorize('school_admin', 'teacher'), getSyllabusById);

// Create syllabus - supports both JSON and FormData with file uploads
router.post('/', 
  authorize('school_admin'), 
  uploadSyllabusFiles.array('files', 10), 
  handleUploadError, 
  createSyllabus
);

// Update syllabus - supports both JSON and FormData with file uploads
router.put('/:id', 
  authorize('school_admin'), 
  uploadSyllabusFiles.array('files', 10), 
  handleUploadError, 
  updateSyllabus
);

router.delete('/:id', authorize('school_admin'), deleteSyllabus);

module.exports = router;

