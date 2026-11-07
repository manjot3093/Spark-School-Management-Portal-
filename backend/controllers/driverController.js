const Driver = require('../models/Driver');
const asyncHandler = require('../middleware/asyncHandler');
const mongoose = require('mongoose');
const Vehicle = require('../models/Vehicle');
const Route = require('../models/Route');
const validId = id => typeof id === 'string' && mongoose.isValidObjectId(id);
const fields = ['name', 'email', 'phone', 'alternatePhone', 'licenseNumber', 'licenseType', 'licenseExpiryDate', 'dateOfBirth', 'gender', 'address', 'dateOfJoining', 'employeeId', 'salary', 'status', 'bloodGroup', 'emergencyContact', 'experienceYears'];
const input = body => Object.fromEntries(fields.filter(key => Object.prototype.hasOwnProperty.call(body, key)).map(key => [key, body[key]]));

// @desc    Get all drivers for a school
// @route   GET /api/drivers
// @access  Private
exports.getDrivers = asyncHandler(async (req, res) => {
  const schoolId = req.user.schoolId;
  
  const drivers = await Driver.find({ schoolId })
    .populate('vehicleId', 'vehicleNumber vehicleType registrationNumber')
    .populate('routeId', 'name routeNumber startPoint endPoint')
    .sort({ createdAt: -1 });
  
  res.status(200).json({
    success: true,
    count: drivers.length,
    data: drivers
  });
});

// @desc    Get single driver
// @route   GET /api/drivers/:id
// @access  Private
exports.getDriver = asyncHandler(async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid driver ID' });
  const driver = await Driver.findOne({ _id: req.params.id, schoolId: req.user.schoolId })
    .populate('vehicleId', 'vehicleNumber vehicleType registrationNumber')
    .populate('routeId', 'name routeNumber');
  
  if (!driver) {
    return res.status(404).json({
      success: false,
      message: 'Driver not found'
    });
  }
  
  res.status(200).json({
    success: true,
    data: driver
  });
});

// @desc    Create new driver
// @route   POST /api/drivers
// @access  Private
exports.createDriver = asyncHandler(async (req, res) => {
  const driver = await Driver.create({ ...input(req.body), schoolId: req.user.schoolId });
  
  res.status(201).json({
    success: true,
    message: 'Driver created successfully',
    data: driver
  });
});

// @desc    Update driver
// @route   PUT /api/drivers/:id
// @access  Private
exports.updateDriver = asyncHandler(async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid driver ID' });
  let driver = await Driver.findOne({ _id: req.params.id, schoolId: req.user.schoolId });
  
  if (!driver) {
    return res.status(404).json({
      success: false,
      message: 'Driver not found'
    });
  }
  
  driver = await Driver.findOneAndUpdate({ _id: req.params.id, schoolId: req.user.schoolId }, input(req.body), {
    new: true,
    runValidators: true
  }).populate('vehicleId', 'vehicleNumber vehicleType')
    .populate('routeId', 'name routeNumber');
  
  res.status(200).json({
    success: true,
    message: 'Driver updated successfully',
    data: driver
  });
});

// @desc    Delete driver
// @route   DELETE /api/drivers/:id
// @access  Private
exports.deleteDriver = asyncHandler(async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid driver ID' });
  const driver = await Driver.findOne({ _id: req.params.id, schoolId: req.user.schoolId });
  
  if (!driver) {
    return res.status(404).json({
      success: false,
      message: 'Driver not found'
    });
  }
  
  // Check if driver is assigned to a vehicle
  if (driver.vehicleId) {
    return res.status(400).json({
      success: false,
      message: 'Cannot delete driver. Driver is currently assigned to a vehicle. Please unassign first.'
    });
  }
  
  await driver.deleteOne();
  
  res.status(200).json({
    success: true,
    message: 'Driver deleted successfully',
    data: {}
  });
});

// @desc    Get active drivers for a school
// @route   GET /api/drivers/active
// @access  Private
exports.getActiveDrivers = asyncHandler(async (req, res) => {
  const schoolId = req.user.schoolId;
  
  const drivers = await Driver.getActiveDrivers(schoolId);
  
  res.status(200).json({
    success: true,
    count: drivers.length,
    data: drivers
  });
});

// @desc    Get available drivers (not assigned)
// @route   GET /api/drivers/available
// @access  Private
exports.getAvailableDrivers = asyncHandler(async (req, res) => {
  const schoolId = req.user.schoolId;
  
  const drivers = await Driver.getAvailableDrivers(schoolId);
  
  res.status(200).json({
    success: true,
    count: drivers.length,
    data: drivers
  });
});

// @desc    Assign vehicle to driver
// @route   PUT /api/drivers/:id/assign-vehicle
// @access  Private
exports.assignVehicle = asyncHandler(async (req, res) => {
  const { vehicleId } = req.body;
  if (!validId(req.params.id) || !validId(vehicleId)) return res.status(400).json({ success: false, message: 'Invalid assignment ID' });
  const driver = await Driver.findOne({ _id: req.params.id, schoolId: req.user.schoolId });
  const vehicle = await Vehicle.findOne({ _id: vehicleId, schoolId: req.user.schoolId });
  if (!vehicle) return res.status(404).json({ success: false, message: 'Vehicle not found' });
  
  if (!driver) {
    return res.status(404).json({
      success: false,
      message: 'Driver not found'
    });
  }
  
  // Check if vehicle is already assigned to another driver
  const existingAssignment = await Driver.findOne({ 
    schoolId: req.user.schoolId,
    vehicleId, 
    _id: { $ne: req.params.id } 
  });
  
  if (existingAssignment) {
    return res.status(400).json({
      success: false,
      message: 'This vehicle is already assigned to another driver'
    });
  }
  
  driver.vehicleId = vehicleId;
  await driver.save();
  
  // Update vehicle's driverId
  await Vehicle.findOneAndUpdate({ _id: vehicleId, schoolId: req.user.schoolId }, { driverId: req.params.id });
  
  res.status(200).json({
    success: true,
    message: 'Vehicle assigned successfully',
    data: driver
  });
});

// @desc    Assign route to driver
// @route   PUT /api/drivers/:id/assign-route
// @access  Private
exports.assignRoute = asyncHandler(async (req, res) => {
  const { routeId } = req.body;
  if (!validId(req.params.id) || !validId(routeId)) return res.status(400).json({ success: false, message: 'Invalid assignment ID' });
  const driver = await Driver.findOne({ _id: req.params.id, schoolId: req.user.schoolId });
  const route = await Route.exists({ _id: routeId, schoolId: req.user.schoolId });
  if (!route) return res.status(404).json({ success: false, message: 'Route not found' });
  
  if (!driver) {
    return res.status(404).json({
      success: false,
      message: 'Driver not found'
    });
  }
  
  driver.routeId = routeId;
  await driver.save();
  
  res.status(200).json({
    success: true,
    message: 'Route assigned successfully',
    data: driver
  });
});

// @desc    Add training certificate
// @route   POST /api/drivers/:id/training
// @access  Private
exports.addTrainingCertificate = asyncHandler(async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid driver ID' });
  const driver = await Driver.findOne({ _id: req.params.id, schoolId: req.user.schoolId });
  
  if (!driver) {
    return res.status(404).json({
      success: false,
      message: 'Driver not found'
    });
  }
  
  driver.trainingCertificates.push({ name: req.body.name, issueDate: req.body.issueDate, expiryDate: req.body.expiryDate, documentUrl: req.body.documentUrl });
  await driver.save();
  
  res.status(200).json({
    success: true,
    message: 'Training certificate added successfully',
    data: driver
  });
});

// @desc    Add disciplinary record
// @route   POST /api/drivers/:id/disciplinary
// @access  Private
exports.addDisciplinaryRecord = asyncHandler(async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid driver ID' });
  const driver = await Driver.findOne({ _id: req.params.id, schoolId: req.user.schoolId });
  
  if (!driver) {
    return res.status(404).json({
      success: false,
      message: 'Driver not found'
    });
  }
  
  driver.disciplinaryRecords.push({ date: req.body.date, incident: req.body.incident, action: req.body.action });
  await driver.save();
  
  res.status(200).json({
    success: true,
    message: 'Disciplinary record added successfully',
    data: driver
  });
});

