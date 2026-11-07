const Subject = require('../models/Subject');
const User = require('../models/User');
const Class = require('../models/Class');
const { validationResult } = require('express-validator');
const writableFields = ['name', 'code', 'teacherId', 'classId', 'type', 'status'];
const referencesBelongToSchool = async (schoolId, teacherId, classId) => {
  if (teacherId && !await User.exists({ _id: teacherId, schoolId, role: 'teacher' })) return false;
  if (classId && !await Class.exists({ _id: classId, schoolId })) return false;
  return true;
};

// @desc    Get all subjects
// @route   GET /api/subjects
// @access  Private (School Admin)
const getSubjects = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    
    if (!schoolId) return res.status(403).json({ success: false, error: 'Access denied' });
    const query = req.user.role === 'teacher' ? { schoolId, teacherId: req.user._id } : { schoolId };
    const subjects = await Subject.find(query)
      .populate('teacherId', 'name email')
      .populate('classId', 'name section')
      .sort({ name: 1 });

    res.status(200).json({
      success: true,
      count: subjects.length,
      data: subjects
    });
  } catch (error) {
    console.error('Get subjects error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while fetching subjects'
    });
  }
};

// @desc    Get subject by ID
// @route   GET /api/subjects/:id
// @access  Private (School Admin)
const getSubject = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    
    const subject = await Subject.findOne({ 
      _id: req.params.id,
      schoolId 
    })
      .populate('teacherId', 'name email')
      .populate('classId', 'name section');

    if (!subject) {
      return res.status(404).json({
        success: false,
        error: 'Subject not found'
      });
    }

    res.status(200).json({
      success: true,
      data: subject
    });
  } catch (error) {
    console.error('Get subject error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while fetching subject'
    });
  }
};

// @desc    Create new subject
// @route   POST /api/subjects
// @access  Private (School Admin)
const createSubject = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { name, code, teacherId, classId, type } = req.body;
    const schoolId = req.user.schoolId;
    if (!schoolId || !await referencesBelongToSchool(schoolId, teacherId, classId)) return res.status(400).json({ success: false, error: 'Teacher or class does not belong to this school' });

    // Allow same subject name with different teachers in the same class
    // Check if exact same subject (name + teacher + class) already exists
    if (classId && teacherId) {
      const exactDuplicate = await Subject.findOne({
        name,
        classId,
        teacherId,
        schoolId
      });

      if (exactDuplicate) {
        return res.status(400).json({
          success: false,
          error: 'This exact subject-teacher-class combination already exists'
        });
      }
    } else if (classId && !teacherId) {
      // If no teacher specified, check for same name + class without teacher
      const exactDuplicate = await Subject.findOne({
        name,
        classId,
        teacherId: null,
        schoolId
      });

      if (exactDuplicate) {
        return res.status(400).json({
          success: false,
          error: 'Subject with this name already exists in this class without a teacher'
        });
      }
    }

    // Check if code already exists in the same class
    if (code && classId) {
      const existingCode = await Subject.findOne({
        code: code.toUpperCase(),
        classId,
        schoolId
      });

      if (existingCode) {
        return res.status(400).json({
          success: false,
          error: 'Subject code already exists in this class. Please use a different code.'
        });
      }
    }

    // Verify teacher exists and belongs to the school
    if (teacherId) {
      const teacher = await User.findOne({ _id: teacherId, schoolId, role: 'teacher' });
      if (!teacher) {
        return res.status(400).json({
          success: false,
          error: 'Teacher not found or does not belong to your school'
        });
      }
    }

    // Create subject
    const subject = await Subject.create({
      name,
      code: code ? code.toUpperCase() : name.substring(0, 3).toUpperCase(),
      teacherId: teacherId || null,
      schoolId,
      classId: classId || null,
      type: type || 'core',
      createdBy: req.user._id
    });

    // Populate the created subject
    await subject.populate('teacherId', 'name email');
    await subject.populate('classId', 'name section');

    res.status(201).json({
      success: true,
      message: 'Subject created successfully',
      data: subject
    });
  } catch (error) {
    console.error('Create subject error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error during subject creation'
    });
  }
};

// @desc    Update subject
// @route   PUT /api/subjects/:id
// @access  Private (School Admin)
const updateSubject = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const schoolId = req.user.schoolId;
    const { name, classId, teacherId } = req.body;
    if (!schoolId || !await referencesBelongToSchool(schoolId, teacherId, classId)) return res.status(400).json({ success: false, error: 'Teacher or class does not belong to this school' });
    
    const subject = await Subject.findOne({ 
      _id: req.params.id,
      schoolId 
    });

    if (!subject) {
      return res.status(404).json({
        success: false,
        error: 'Subject not found'
      });
    }

    // Check for conflicts when updating name/class/teacher
    if (name && classId && teacherId) {
      const exactDuplicate = await Subject.findOne({
        name,
        classId,
        teacherId,
        schoolId,
        _id: { $ne: req.params.id } // Exclude current subject
      });

      if (exactDuplicate) {
        return res.status(400).json({
          success: false,
          error: 'This exact subject-teacher-class combination already exists'
        });
      }
    } else if (name && classId && !teacherId) {
      const exactDuplicate = await Subject.findOne({
        name,
        classId,
        teacherId: null,
        schoolId,
        _id: { $ne: req.params.id }
      });

      if (exactDuplicate) {
        return res.status(400).json({
          success: false,
          error: 'Subject with this name already exists in this class without a teacher'
        });
      }
    }

    // Update subject
    const updates = Object.fromEntries(writableFields.filter(field => Object.prototype.hasOwnProperty.call(req.body, field)).map(field => [field, req.body[field]]));
    if (updates.code) updates.code = updates.code.toUpperCase();
    const updatedSubject = await Subject.findOneAndUpdate(
      { _id: req.params.id, schoolId },
      updates,
      { new: true, runValidators: true }
    )
      .populate('teacherId', 'name email')
      .populate('classId', 'name section');

    res.status(200).json({
      success: true,
      message: 'Subject updated successfully',
      data: updatedSubject
    });
  } catch (error) {
    console.error('Update subject error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error during subject update'
    });
  }
};

// @desc    Delete subject (hard delete)
// @route   DELETE /api/subjects/:id
// @access  Private (School Admin)
const deleteSubject = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    
    const subject = await Subject.findOne({ 
      _id: req.params.id,
      schoolId 
    });

    if (!subject) {
      return res.status(404).json({
        success: false,
        error: 'Subject not found'
      });
    }

    // Hard delete - remove from database
    await Subject.deleteOne({ _id: req.params.id, schoolId });

    res.status(200).json({
      success: true,
      message: 'Subject deleted successfully'
    });
  } catch (error) {
    console.error('Delete subject error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error during subject deletion'
    });
  }
};

// @desc    Assign subject to teacher
// @route   PUT /api/subjects/:id/assign-teacher
// @access  Private (School Admin)
const assignSubjectTeacher = async (req, res) => {
  try {
    const { teacherId } = req.body;
    const subjectId = req.params.id;
    const schoolId = req.user.schoolId;
    if (!schoolId || (teacherId && (typeof teacherId !== 'string' || !/^[a-f\d]{24}$/i.test(teacherId)))) return res.status(400).json({ success: false, error: 'Invalid teacher' });

    // Find the subject
    const subject = await Subject.findOne({ _id: subjectId, schoolId });
    if (!subject) {
      return res.status(404).json({
        success: false,
        error: 'Subject not found'
      });
    }

    // Verify teacher exists and belongs to the school
    if (teacherId) {
      const teacher = await User.findOne({ _id: teacherId, schoolId, role: 'teacher' });
      if (!teacher) {
        return res.status(400).json({
          success: false,
          error: 'Teacher not found or does not belong to your school'
        });
      }
    }

    // Update subject's teacher
    const updatedSubject = await Subject.findOneAndUpdate(
      { _id: subjectId, schoolId },
      { teacherId: teacherId || null },
      { new: true, runValidators: true }
    ).populate('teacherId', 'name email').populate('classId', 'name section');

    res.status(200).json({
      success: true,
      message: 'Subject assigned to teacher successfully',
      data: updatedSubject
    });
  } catch (error) {
    console.error('Assign subject to teacher error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error during subject assignment'
    });
  }
};

module.exports = {
  getSubjects,
  getSubject,
  createSubject,
  updateSubject,
  deleteSubject,
  assignSubjectTeacher
};

