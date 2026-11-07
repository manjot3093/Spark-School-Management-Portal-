const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { uploadStudentAvatar } = require('../utils/cloudinary');
const multer = require('multer');

// Configure multer for memory storage
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'));
        }
    }
});

// Upload student avatar
router.post('/student-avatar',
    protect,
    authorize('school_admin', 'admin'),
    upload.single('avatar'),
    async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    error: 'No file uploaded'
                });
            }

            const studentId = req.body.studentId || Date.now();
            const result = await uploadStudentAvatar(req.file.buffer, studentId);

            res.status(200).json({
                success: true,
                data: {
                    url: result.secure_url,
                    public_id: result.public_id
                }
            });
        } catch (error) {
            console.error('Upload error:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Upload failed'
            });
        }
    }
);

// Error handling middleware for multer errors
router.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                error: 'File too large. Maximum size is 10MB.'
            });
        }
        return res.status(400).json({
            success: false,
            error: error.message
        });
    }

    if (error.message === 'Only image files are allowed') {
        return res.status(400).json({
            success: false,
            error: error.message
        });
    }

    next(error);
});

module.exports = router;
