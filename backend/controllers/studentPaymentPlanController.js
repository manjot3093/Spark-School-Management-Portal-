const StudentPaymentPlan = require('../models/StudentPaymentPlan');
const Student = require('../models/Student');
const asyncHandler = require('../middleware/asyncHandler');

// @desc    Get payment plan(s) - by studentId and/or academicYear
// @route   GET /api/student-payment-plans
// @access  Private
exports.getPaymentPlans = asyncHandler(async (req, res) => {
  const { studentId, academicYear } = req.query;

  const query = {};

  if (req.user.role !== 'admin') {
    query.school = req.user.schoolId;
  }
  if (studentId) query.student = studentId;
  if (academicYear) query.academicYear = academicYear;

  const plans = await StudentPaymentPlan.find(query)
    .populate('student', 'name admissionNumber')
    .populate('updatedBy', 'name email')
    .sort({ academicYear: -1, student: 1 });

  res.status(200).json({
    success: true,
    count: plans.length,
    data: plans
  });
});

// @desc    Get single payment plan by id
// @route   GET /api/student-payment-plans/:id
// @access  Private
exports.getPaymentPlan = asyncHandler(async (req, res) => {
  const plan = await StudentPaymentPlan.findById(req.params.id)
    .populate('student', 'name admissionNumber')
    .populate('updatedBy', 'name email');

  if (!plan) {
    return res.status(404).json({
      success: false,
      error: 'Payment plan not found'
    });
  }

  if (req.user.role !== 'admin' && plan.school.toString() !== req.user.schoolId.toString()) {
    return res.status(403).json({
      success: false,
      error: 'Not authorized to access this plan'
    });
  }

  res.status(200).json({
    success: true,
    data: plan
  });
});

// @desc    Upsert student payment plan (create or update by student + academicYear)
// @route   PUT /api/student-payment-plans
// @access  Private
exports.upsertPaymentPlan = asyncHandler(async (req, res) => {
  const { studentId, academicYear, plan } = req.body;

  if (!studentId || !academicYear) {
    return res.status(400).json({
      success: false,
      error: 'studentId and academicYear are required'
    });
  }

  const validPlan = ['annual', 'monthly', 'quarterly'].includes(plan) ? plan : 'monthly';

  const school = req.user.role === 'admin' && req.body.school ? req.body.school : req.user.schoolId;

  const student = await Student.findOne({ _id: studentId, schoolId: school });
  if (!student) {
    return res.status(404).json({
      success: false,
      error: 'Student not found or does not belong to this school'
    });
  }

  const existing = await StudentPaymentPlan.findOne({
    school,
    student: studentId,
    academicYear: String(academicYear).trim()
  });

  if (existing) {
    existing.plan = validPlan;
    existing.updatedBy = req.user._id;
    await existing.save();
    await existing.populate('student', 'name admissionNumber');
    return res.status(200).json({
      success: true,
      message: 'Payment plan updated successfully',
      data: existing
    });
  }

  const newPlan = await StudentPaymentPlan.create({
    school,
    student: studentId,
    academicYear: String(academicYear).trim(),
    plan: validPlan,
    updatedBy: req.user._id
  });
  await newPlan.populate('student', 'name admissionNumber');

  res.status(201).json({
    success: true,
    message: 'Payment plan created successfully',
    data: newPlan
  });
});
