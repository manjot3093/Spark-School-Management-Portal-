const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const mongoose = require('mongoose');
const { protect, authorize } = require('../middleware/auth');
// Diagnostic: Attempting to load controller and validation with detailed error logging
let studentController, studentValidation, studentUpdateValidation, loginValidation, cloudinaryUtils;

try {
  console.log('[DIAGNOSTIC] 🔍 Loading studentController...');
  studentController = require('../controllers/studentController');
  console.log('[DIAGNOSTIC] ✅ studentController loaded');

  console.log('[DIAGNOSTIC] 🔍 Loading studentValidation...');
  const validation = require('../middleware/studentValidation');
  studentValidation = validation.studentValidation;
  studentUpdateValidation = validation.studentUpdateValidation;
  loginValidation = validation.loginValidation;
  console.log('[DIAGNOSTIC] ✅ studentValidation loaded');

  console.log('[DIAGNOSTIC] 🔍 Loading cloudinaryUtils...');
  cloudinaryUtils = require('../utils/cloudinary');
  console.log('[DIAGNOSTIC] ✅ cloudinaryUtils loaded');
} catch (error) {
  console.error('[DIAGNOSTIC] ❌ CRITICAL LOAD ERROR in routes/students.js:', error.message);
  console.error('[DIAGNOSTIC] ❌ Error Code:', error.code);
  if (error.requireStack) {
    console.error('[DIAGNOSTIC] ❌ Require Stack:', error.requireStack.join(' -> '));
  }
  // Log the specific file that is being required if available
  const match = error.message.match(/Cannot find module '([^']+)'/);
  if (match) {
    console.error(`[DIAGNOSTIC] ❌ FAILED TO FIND MODULE: "${match[1]}"`);
  }
  // Continue despite error to prevent silent crash loop without logging
}

// Debugging: Check if controller functions are defined
const requiredFunctions = [
  'getStudents', 'getStudent', 'getStudentDocuments', 'uploadStudentDocument',
  'createStudent', 'updateStudent', 'deleteStudent', 'studentLogin', 'parentLogin',
  'getClassContacts', 'getStudentStats', 'assignStudentToClass', 'removeStudentFromClass',
  'getStudentProfile', 'getStudentClasses', 'getStudentSchedule', 'getStudentAssignments',
  'getStudentNotes', 'getStudentAttendance', 'getStudentPerformance',
  'getStudentPerformanceReport', 'getStudentExamMarks', 'toggleStudentStatus'
];

if (studentController) {
  requiredFunctions.forEach(func => {
    if (!studentController[func]) {
      console.error(`❌ Critical Error: ${func} is undefined in studentController`);
    }
  });
}

const {
  getStudents,
  getStudent,
  getStudentDocuments,
  uploadStudentDocument,
  createStudent,
  updateStudent,
  deleteStudent,
  studentLogin,
  parentLogin,
  getClassContacts,
  getStudentStats,
  assignStudentToClass,
  removeStudentFromClass,
  getStudentProfile,
  getStudentClasses,
  getStudentSchedule,
  getStudentAssignments,
  getStudentNotes,
  getStudentAttendance,
  getStudentPerformance,
  getStudentPerformanceReport,
  getStudentExamMarks,
  toggleStudentStatus
} = studentController || {};

if (cloudinaryUtils && !cloudinaryUtils.uploadDocument) {
  console.error('❌ Critical Error: uploadDocument is undefined in cloudinaryUtils');
}

const uploadDocument = cloudinaryUtils?.uploadDocument;
const handleUploadError = cloudinaryUtils?.handleUploadError;

const router = express.Router();

// Configure multer for file uploads (memory storage for temporary files)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
    files: 12 // Max 12 files (1 avatar + 1 photo + 10 documents) - allow both field names
  },
  fileFilter: (req, file, cb) => {
    // Allow both images (for avatar/photo) and PDFs (for documents)
    const allowedImageMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    const allowedDocMimes = ['application/pdf'];

    if (file.fieldname === 'avatar' || file.fieldname === 'photo') {
      if (allowedImageMimes.includes(file.mimetype.toLowerCase())) {
        cb(null, true);
      } else {
        cb(new Error(`Avatar/Photo must be an image (JPEG, PNG, GIF, or WebP). Received: ${file.mimetype}`));
      }
    } else if (file.fieldname === 'documents' || file.fieldname === 'document') {
      if (allowedDocMimes.includes(file.mimetype.toLowerCase())) cb(null, true);
      else cb(new Error('Student documents must be PDFs'));
    } else {
      // Allow other fields to pass through
      cb(null, true);
    }
  }
});

// Public routes (no authentication required)
router.post('/login', loginValidation, studentLogin);
router.post('/parents/login', loginValidation, parentLogin);

// Serve only documents belonging to this school, after authentication.
router.get('/documents/:filename', protect, authorize('school_admin'), async (req, res) => {
  try {
    const requestedFilename = req.params.filename;
    if (!/^[a-zA-Z0-9._-]+$/.test(requestedFilename)) return res.sendStatus(400);
    const Student = require('../models/Student');
    const owned = await Student.exists({ schoolId: req.user.schoolId, pdfs: `/uploads/documents/${requestedFilename}` });
    if (!owned) return res.sendStatus(404);
    const documentsPath = path.join(__dirname, '../uploads/documents');
    const filePath = path.join(documentsPath, requestedFilename);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: 'File not found'
      });
    }

    // Set content type for PDF
    res.setHeader('Content-Type', 'application/pdf');
    // Send the file
    res.sendFile(path.resolve(filePath));
  } catch (error) {
    console.error('Error serving PDF:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to serve PDF'
    });
  }
});

// Protected routes (authentication required)
router.use(protect);

// Resolve student IDs once for every protected record route. Controllers must not
// be able to bypass the authenticated school (or a parent's student link).
router.param('id', async (req, res, next, value) => {
  try {
    if (!mongoose.isValidObjectId(value)) return res.status(400).json({ success: false, error: 'Invalid student ID' });
    const Student = require('../models/Student');
    const student = await Student.findById(value).select('schoolId classId');
    if (!student) return res.status(404).json({ success: false, error: 'Student not found' });
    if (req.user.role !== 'admin' && String(student.schoolId) !== String(req.user.schoolId)) return res.status(404).json({ success: false, error: 'Student not found' });
    if (req.user.role === 'parent') {
      const Parent = require('../models/Parent');
      const linked = await Parent.exists({ _id: req.user._id, schoolId: student.schoolId, $or: [{ studentId: student._id }, { studentIds: student._id }] });
      if (!linked) return res.status(403).json({ success: false, error: 'Access denied' });
    }
    if (req.user.role === 'teacher') {
      const Subject = require('../models/Subject');
      const teachesClass = await Subject.exists({ schoolId: student.schoolId, teacherId: req.user._id, classId: student.classId, status: 'active' });
      if (!teachesClass) return res.status(403).json({ success: false, error: 'Access denied' });
    }
    req.scopedStudent = student;
    next();
  } catch (error) { next(error); }
});

// Student-specific routes (for students themselves)
router.get('/profile', authorize('student'), getStudentProfile);
router.get('/classes', authorize('student'), getStudentClasses);
router.get('/schedule', authorize('student'), getStudentSchedule);
router.get('/assignments', authorize('student'), getStudentAssignments);
router.get('/notes', authorize('student'), getStudentNotes);
router.get('/attendance', authorize('student'), getStudentAttendance);
router.get('/exam-marks', authorize('student'), getStudentExamMarks);
router.get('/class-contacts', authorize('student'), getClassContacts);

// Student management routes (Admin, School Admin, Teachers, and Librarians for library operations)
router.get('/', authorize('admin', 'school_admin', 'teacher', 'librarian'), getStudents);
router.get('/stats', authorize('school_admin'), getStudentStats);
router.get('/performance-report', authorize('school_admin', 'teacher'), getStudentPerformanceReport);

// Upload PDFs for student - must be before /:id route to avoid conflicts
router.post('/upload-pdfs', authorize('school_admin'), uploadDocument.array('pdfs', 10), handleUploadError, (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No files uploaded'
      });
    }

    // Verify files are saved correctly and can be accessed
    const fileUrls = req.files.map(file => {
      const filePath = path.join(__dirname, '../uploads/documents', file.filename);
      const fileUrl = `/uploads/documents/${file.filename}`;

      // Verify file exists and is readable
      if (fs.existsSync(filePath)) {
        console.log(`✅ PDF saved successfully: ${file.filename}`);
        console.log(`   Path: ${filePath}`);
        console.log(`   URL: ${fileUrl}`);
        console.log(`   Size: ${file.size} bytes`);
      } else {
        console.error(`❌ PDF file not found after upload: ${filePath}`);
      }

      return fileUrl;
    });

    res.status(200).json({
      success: true,
      data: fileUrls
    });
  } catch (error) {
    console.error('PDF upload error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to upload PDFs'
    });
  }
});

router.post('/', authorize('school_admin'), upload.fields([
  { name: 'avatar', maxCount: 1 },
  { name: 'photo', maxCount: 1 },  // Support both 'avatar' and 'photo' field names
  { name: 'documents', maxCount: 10 }
]), createStudent);
router.get('/:id', authorize('school_admin', 'teacher', 'parent'), getStudent);
router.get('/:id/documents', authorize('school_admin', 'teacher', 'parent'), getStudentDocuments);
router.post('/:id/documents', authorize('school_admin', 'teacher', 'parent'), upload.single('document'), uploadStudentDocument);
router.get('/:id/performance', authorize('school_admin', 'teacher', 'parent'), getStudentPerformance);
// @route   PATCH /api/students/:id/status
// @desc    Toggle student active/inactive status with update timestamp
// @access  Private (Admin, School Admin)
router.patch('/:id/status', authorize('admin', 'school_admin'), toggleStudentStatus);

router.put('/:id', authorize('school_admin'), upload.fields([{ name: 'avatar', maxCount: 1 }]), studentUpdateValidation, updateStudent);
router.put('/:id/assign-class', authorize('school_admin'), assignStudentToClass);
router.put('/:id/remove-class', authorize('school_admin'), removeStudentFromClass);
router.delete('/:id', authorize('school_admin'), deleteStudent);

module.exports = router;
