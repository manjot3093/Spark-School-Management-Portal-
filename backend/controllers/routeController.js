const Route = require('../models/Route');
const asyncHandler = require('../middleware/asyncHandler');
const mongoose = require('mongoose');
const validId = id => typeof id === 'string' && mongoose.isValidObjectId(id);
const fields = ['name', 'routeNumber', 'startPoint', 'endPoint', 'distance', 'estimatedTime', 'stops', 'status', 'description', 'fare'];
const input = body => Object.fromEntries(fields.filter(key => Object.prototype.hasOwnProperty.call(body, key)).map(key => [key, body[key]]));

// @desc    Get all routes for a school
// @route   GET /api/routes
// @access  Private
exports.getRoutes = asyncHandler(async (req, res) => {
  const schoolId = req.user.schoolId;
  
  const routes = await Route.find({ schoolId })
    .populate('studentCount')
    .sort({ createdAt: -1 });
  
  res.status(200).json({
    success: true,
    count: routes.length,
    data: routes
  });
});

// @desc    Get single route
// @route   GET /api/routes/:id
// @access  Private
exports.getRoute = asyncHandler(async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid route ID' });
  const route = await Route.findOne({ _id: req.params.id, schoolId: req.user.schoolId });
  
  if (!route) {
    return res.status(404).json({
      success: false,
      message: 'Route not found'
    });
  }
  
  res.status(200).json({
    success: true,
    data: route
  });
});

// @desc    Create new route
// @route   POST /api/routes
// @access  Private
exports.createRoute = asyncHandler(async (req, res) => {
  const route = await Route.create({ ...input(req.body), schoolId: req.user.schoolId });
  
  res.status(201).json({
    success: true,
    message: 'Route created successfully',
    data: route
  });
});

// @desc    Update route
// @route   PUT /api/routes/:id
// @access  Private
exports.updateRoute = asyncHandler(async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid route ID' });
  let route = await Route.findOne({ _id: req.params.id, schoolId: req.user.schoolId });
  
  if (!route) {
    return res.status(404).json({
      success: false,
      message: 'Route not found'
    });
  }
  
  route = await Route.findOneAndUpdate({ _id: req.params.id, schoolId: req.user.schoolId }, input(req.body), {
    new: true,
    runValidators: true
  });
  
  res.status(200).json({
    success: true,
    message: 'Route updated successfully',
    data: route
  });
});

// @desc    Delete route
// @route   DELETE /api/routes/:id
// @access  Private
exports.deleteRoute = asyncHandler(async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid route ID' });
  const route = await Route.findOne({ _id: req.params.id, schoolId: req.user.schoolId });
  
  if (!route) {
    return res.status(404).json({
      success: false,
      message: 'Route not found'
    });
  }
  
  // Check if route has assigned students
  const StudentTransport = require('../models/StudentTransport');
  const assignedStudents = await StudentTransport.countDocuments({ 
    schoolId: req.user.schoolId,
    routeId: req.params.id,
    status: 'active'
  });
  
  if (assignedStudents > 0) {
    return res.status(400).json({
      success: false,
      message: `Cannot delete route. ${assignedStudents} students are currently assigned to this route.`
    });
  }
  
  await route.deleteOne();
  
  res.status(200).json({
    success: true,
    message: 'Route deleted successfully',
    data: {}
  });
});

// @desc    Get active routes for a school
// @route   GET /api/routes/active
// @access  Private
exports.getActiveRoutes = asyncHandler(async (req, res) => {
  const schoolId = req.user.schoolId;
  
  const routes = await Route.getActiveRoutes(schoolId);
  
  res.status(200).json({
    success: true,
    count: routes.length,
    data: routes
  });
});

// @desc    Get route statistics
// @route   GET /api/routes/:id/stats
// @access  Private
exports.getRouteStats = asyncHandler(async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid route ID' });
  const route = await Route.findOne({ _id: req.params.id, schoolId: req.user.schoolId });
  
  if (!route) {
    return res.status(404).json({
      success: false,
      message: 'Route not found'
    });
  }
  
  const StudentTransport = require('../models/StudentTransport');
  const Vehicle = require('../models/Vehicle');
  
  const totalStudents = await StudentTransport.countDocuments({
    schoolId: req.user.schoolId,
    routeId: req.params.id,
    status: 'active'
  });
  
  const assignedVehicles = await Vehicle.countDocuments({
    schoolId: req.user.schoolId,
    routeId: req.params.id,
    status: 'active'
  });
  
  res.status(200).json({
    success: true,
    data: {
      route,
      totalStudents,
      assignedVehicles
    }
  });
});

