const express = require('express');
const multer = require('multer');
const rateLimit = require('express-rate-limit');
const { protect, authorize } = require('../middleware/auth');
const c = require('../controllers/staffAttendanceController');

const router = express.Router();
router.use(protect);

// Selfie stays in memory (max 3 MB, images only) and is streamed straight to Cloudinary.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 3 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) =>
    /^image\/(jpeg|png|webp)$/.test(file.mimetype) ? cb(null, true) : cb(new Error('Only JPEG/PNG/WEBP selfies are allowed'))
});

const punchLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false,
  keyGenerator: (req) => String(req.user?._id || 'anon'),
  message: { success: false, code: 'RATE_LIMIT', error: 'Too many attempts. Try again later.' }
});
const liveLimiter = rateLimit({
  windowMs: 60 * 1000, max: 10, standardHeaders: true, legacyHeaders: false,
  keyGenerator: (req) => String(req.user?._id || 'anon'),
  message: { success: false, code: 'RATE_LIMIT', error: 'Too many location updates. Try again shortly.' }
});

const staff = authorize('teacher', 'librarian', 'accountant');
const admin = authorize('school_admin');

// staff (self-service)
router.get('/me/today', staff, c.getMyToday);
router.get('/me/device', staff, c.getMyDevice);
router.post('/check-in', staff, punchLimiter, upload.single('selfie'), c.checkIn);
router.post('/check-out', staff, punchLimiter, upload.single('selfie'), c.checkOut);
router.put('/me/live-position', staff, liveLimiter, c.updateLivePosition);
router.delete('/me/live-position', staff, c.clearLivePosition);

// principal / admin
router.get('/settings', admin, c.getSettings);
router.put('/settings', admin, c.updateSettings);
router.get('/log', admin, c.getLog);
router.get('/map', admin, c.getMap);
router.get('/devices', admin, c.getDevices);
router.post('/devices', admin, c.registerDevice);
router.delete('/devices/:userId', admin, c.removeDevice);
router.post('/demo-position', admin, c.setDemoPosition);

module.exports = router;
