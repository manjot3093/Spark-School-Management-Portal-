const Vehicle = require('../models/Vehicle');
const asyncHandler = require('../middleware/asyncHandler');
const mongoose = require('mongoose');
const Route = require('../models/Route');
const Driver = require('../models/Driver');
const writable = ['vehicleNumber', 'vehicleType', 'capacity', 'registrationNumber', 'manufacturer', 'model', 'year', 'color', 'status', 'nextMaintenanceDate'];
const pick = body => Object.fromEntries(writable.filter(key => Object.prototype.hasOwnProperty.call(body || {}, key)).map(key => [key, body[key]]));
const validId = value => typeof value === 'string' && mongoose.isValidObjectId(value);
const scalarValues = data => Object.values(data).every(value => value === null || ['string', 'number', 'boolean'].includes(typeof value));

// @desc    Get all vehicles for a school
// @route   GET /api/vehicles
// @access  Private
exports.getVehicles = asyncHandler(async (req, res) => {
  const schoolId = req.user.schoolId;
  
  const vehicles = await Vehicle.find({ schoolId })
    .populate('routeId', 'name routeNumber startPoint endPoint')
    .populate('driverId', 'name licenseNumber phone')
    .sort({ createdAt: -1 });
  
  res.status(200).json({
    success: true,
    count: vehicles.length,
    data: vehicles
  });
});

// @desc    Get single vehicle
// @route   GET /api/vehicles/:id
// @access  Private
exports.getVehicle = asyncHandler(async (req, res) => {
  if (!validId(req.params.id)) return res.sendStatus(400);
  const vehicle = await Vehicle.findOne({ _id: req.params.id, schoolId: req.user.schoolId })
    .populate('routeId', 'name routeNumber')
    .populate('driverId', 'name licenseNumber phone');
  
  if (!vehicle) {
    return res.status(404).json({
      success: false,
      message: 'Vehicle not found'
    });
  }
  
  res.status(200).json({
    success: true,
    data: vehicle
  });
});

// @desc    Create new vehicle
// @route   POST /api/vehicles
// @access  Private
exports.createVehicle = asyncHandler(async (req, res) => {
  const data = pick(req.body);
  if (!scalarValues(data)) return res.sendStatus(400);
  const vehicle = await Vehicle.create({ ...data, schoolId: req.user.schoolId });
  
  res.status(201).json({
    success: true,
    message: 'Vehicle created successfully',
    data: vehicle
  });
});

// @desc    Update vehicle
// @route   PUT /api/vehicles/:id
// @access  Private
exports.updateVehicle = asyncHandler(async (req, res) => {
  if (!validId(req.params.id)) return res.sendStatus(400);
  const data = pick(req.body);
  if (!scalarValues(data)) return res.sendStatus(400);
  let vehicle = await Vehicle.findOne({ _id: req.params.id, schoolId: req.user.schoolId });
  
  if (!vehicle) {
    return res.status(404).json({
      success: false,
      message: 'Vehicle not found'
    });
  }
  
  vehicle = await Vehicle.findOneAndUpdate({ _id: req.params.id, schoolId: req.user.schoolId }, { $set: data }, {
    new: true,
    runValidators: true
  }).populate('routeId', 'name routeNumber')
    .populate('driverId', 'name licenseNumber phone');
  
  res.status(200).json({
    success: true,
    message: 'Vehicle updated successfully',
    data: vehicle
  });
});

// @desc    Delete vehicle
// @route   DELETE /api/vehicles/:id
// @access  Private
exports.deleteVehicle = asyncHandler(async (req, res) => {
  if (!validId(req.params.id)) return res.sendStatus(400);
  const vehicle = await Vehicle.findOne({ _id: req.params.id, schoolId: req.user.schoolId });
  
  if (!vehicle) {
    return res.status(404).json({
      success: false,
      message: 'Vehicle not found'
    });
  }
  
  // Check if vehicle is assigned to a route
  if (vehicle.routeId) {
    return res.status(400).json({
      success: false,
      message: 'Cannot delete vehicle. It is currently assigned to a route. Please unassign it first.'
    });
  }
  
  // Check if vehicle is assigned to a driver
  if (vehicle.driverId) {
    return res.status(400).json({
      success: false,
      message: 'Cannot delete vehicle. It is currently assigned to a driver. Please unassign it first.'
    });
  }
  
  await vehicle.deleteOne();
  
  res.status(200).json({
    success: true,
    message: 'Vehicle deleted successfully',
    data: {}
  });
});

// @desc    Get active vehicles for a school
// @route   GET /api/vehicles/active
// @access  Private
exports.getActiveVehicles = asyncHandler(async (req, res) => {
  const schoolId = req.user.schoolId;
  
  const vehicles = await Vehicle.getActiveVehicles(schoolId);
  
  res.status(200).json({
    success: true,
    count: vehicles.length,
    data: vehicles
  });
});

// @desc    Get available vehicles (not assigned)
// @route   GET /api/vehicles/available
// @access  Private
exports.getAvailableVehicles = asyncHandler(async (req, res) => {
  const schoolId = req.user.schoolId;
  
  const vehicles = await Vehicle.getAvailableVehicles(schoolId);
  
  res.status(200).json({
    success: true,
    count: vehicles.length,
    data: vehicles
  });
});

// @desc    Assign vehicle to route
// @route   PUT /api/vehicles/:id/assign-route
// @access  Private
exports.assignRoute = asyncHandler(async (req, res) => {
  const { routeId } = req.body;
  
  if (!validId(req.params.id) || !validId(routeId)) return res.sendStatus(400);
  const [vehicle, route] = await Promise.all([
    Vehicle.findOne({ _id: req.params.id, schoolId: req.user.schoolId }),
    Route.findOne({ _id: routeId, schoolId: req.user.schoolId })
  ]);
  if (!route) return res.sendStatus(404);
  
  if (!vehicle) {
    return res.status(404).json({
      success: false,
      message: 'Vehicle not found'
    });
  }
  
  vehicle.routeId = routeId;
  await vehicle.save();
  
  res.status(200).json({
    success: true,
    message: 'Route assigned successfully',
    data: vehicle
  });
});

// @desc    Assign driver to vehicle
// @route   PUT /api/vehicles/:id/assign-driver
// @access  Private
exports.assignDriver = asyncHandler(async (req, res) => {
  const { driverId } = req.body;
  
  if (!validId(req.params.id) || !validId(driverId)) return res.sendStatus(400);
  const [vehicle, driver] = await Promise.all([
    Vehicle.findOne({ _id: req.params.id, schoolId: req.user.schoolId }),
    Driver.findOne({ _id: driverId, schoolId: req.user.schoolId })
  ]);
  if (!driver) return res.sendStatus(404);
  
  if (!vehicle) {
    return res.status(404).json({
      success: false,
      message: 'Vehicle not found'
    });
  }
  
  vehicle.driverId = driverId;
  await vehicle.save();
  
  // Update driver's vehicleId
  await Driver.updateOne({ _id: driverId, schoolId: req.user.schoolId }, { $set: { vehicleId: req.params.id } });
  
  res.status(200).json({
    success: true,
    message: 'Driver assigned successfully',
    data: vehicle
  });
});

// @desc    Add maintenance record
// @route   POST /api/vehicles/:id/maintenance
// @access  Private
exports.addMaintenanceRecord = asyncHandler(async (req, res) => {
  if (!validId(req.params.id)) return res.sendStatus(400);
  const vehicle = await Vehicle.findOne({ _id: req.params.id, schoolId: req.user.schoolId });
  
  if (!vehicle) {
    return res.status(404).json({
      success: false,
      message: 'Vehicle not found'
    });
  }
  
  const { date, description, cost, performedBy } = req.body || {};
  if (typeof description !== 'string' || description.length > 1000 || typeof performedBy !== 'string' ||
      !Number.isFinite(Number(cost)) || Number(cost) < 0 || !date || Number.isNaN(Date.parse(date))) return res.sendStatus(400);
  vehicle.maintenanceHistory.push({ date, description, cost: Number(cost), performedBy });
  vehicle.lastMaintenanceDate = date;
  await vehicle.save();
  
  res.status(200).json({
    success: true,
    message: 'Maintenance record added successfully',
    data: vehicle
  });
});

