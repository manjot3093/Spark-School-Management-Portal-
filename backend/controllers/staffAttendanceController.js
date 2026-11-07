const School = require('../models/School');
const User = require('../models/User');
const TeacherAttendance = require('../models/TeacherAttendance');
const StaffPresence = require('../models/StaffPresence');
const StaffDevice = require('../models/StaffDevice');
const mongoose = require('mongoose');
const { cloudinary } = require('../utils/cloudinary');
const {
  haversineMeters, isValidCoord, isValidTimezone,
  schoolDay, dayRangeFromKey, hhmmToMinutes
} = require('../utils/geo');

const STAFF_ROLES = ['teacher', 'librarian', 'accountant'];
const LIVE_MS = 90 * 1000;
const room = (schoolId) => `staff_attendance_admin_${schoolId}`;
const broadcast = (schoolId) => global.io?.to(room(schoolId)).emit('staff_presence_changed', { schoolId: String(schoolId) });
const deviceCode = (value) => String(value || '').trim();
const hasRegisteredDevice = async (req) => {
  const code = deviceCode(req.body?.deviceId);
  if (!code) return false;
  return !!(await StaffDevice.exists({ schoolId: req.user.schoolId, userId: req.user._id, deviceId: code, isDemo: false }));
};

const DEFAULTS = {
  enabled: false,
  timezone: 'Asia/Kolkata',
  geofence: { latitude: null, longitude: null, radiusMeters: 100, maxAccuracyMeters: 100 },
  requireSelfie: true,
  shiftStart: '09:00',
  graceMinutes: 10,
  halfDayMinHours: 4 // checking out before this many hours => half-day (0 disables)
};

const withDefaults = (s = {}) => ({
  ...DEFAULTS, ...s,
  requireSelfie: true,
  geofence: { ...DEFAULTS.geofence, ...(s.geofence || {}) }
});
const attendanceForDay = (schoolId, userId, day) => ({
  schoolId, teacherId: userId, isActive: true,
  $or: [{ dateKey: day.dateKey }, { date: { $gte: day.start, $lte: day.end } }]
});

const fail = (res, status, code, error, extra = {}) =>
  res.status(status).json({ success: false, code, error, ...extra });

// ---------- selfie storage (private/authenticated delivery) ----------
function uploadSelfie(buffer, { schoolId, userId, dateKey, kind }) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: `school-portal/staff-attendance/${schoolId}/${dateKey}`,
        public_id: `${userId}-${kind}-${Date.now()}`,
        resource_type: 'image',
        type: 'authenticated', // not reachable without a signed URL
        transformation: [{ width: 640, height: 640, crop: 'limit', quality: 'auto' }],
        timeout: 60000
      },
      (err, result) => (err ? reject(err) : resolve(result))
    );
    stream.end(buffer);
  });
}

async function deleteSelfie(publicId) {
  if (publicId) await cloudinary.uploader.destroy(publicId, { type: 'authenticated', resource_type: 'image' });
}

const signedUrl = (publicId, thumb = false) =>
  publicId
    ? cloudinary.url(publicId, {
        type: 'authenticated', sign_url: true, secure: true, resource_type: 'image',
        ...(thumb ? { transformation: [{ width: 120, height: 120, crop: 'fill', gravity: 'face' }] } : {})
      })
    : null;

const looksLikeImage = (buf) =>
  buf && buf.length > 12 && (
    (buf[0] === 0xff && buf[1] === 0xd8) ||                       // JPEG
    (buf[0] === 0x89 && buf[1] === 0x50) ||                       // PNG
    (buf[0] === 0x52 && buf[1] === 0x49 && buf[8] === 0x57)       // WEBP (RIFF....WEBP)
  );

// ---------- shared verification used by check-in and check-out ----------
async function verifyPresence(req, res, settings) {
  if (!settings.enabled) { fail(res, 403, 'DISABLED', 'Biometric attendance is not enabled for this school.'); return null; }
  if (!(await hasRegisteredDevice(req))) { fail(res, 403, 'DEVICE_NOT_REGISTERED', 'Ask the school admin to register this device code.'); return null; }
  const g = settings.geofence;
  if (!isValidCoord(g.latitude, g.longitude)) {
    fail(res, 400, 'NOT_CONFIGURED', 'School location is not configured yet. Ask the principal to set it.'); return null;
  }

  const lat = Number(req.body.latitude);
  const lng = Number(req.body.longitude);
  const accuracy = Number(req.body.accuracy);
  const observedAt = new Date(req.body.observedAt);
  if (!Number.isFinite(observedAt.getTime()) || Math.abs(Date.now() - observedAt.getTime()) > 60000) {
    fail(res, 422, 'STALE_LOCATION', 'Get a fresh location and try again.'); return null;
  }
  if (!isValidCoord(lat, lng) || !Number.isFinite(accuracy) || accuracy < 0) {
    fail(res, 400, 'BAD_LOCATION', 'A valid GPS location is required.'); return null;
  }
  if (accuracy > g.maxAccuracyMeters) {
    fail(res, 422, 'LOW_ACCURACY',
      `GPS accuracy is too low (${Math.round(accuracy)} m). Move near a window / go outside and try again.`,
      { accuracy: Math.round(accuracy), maxAccuracy: g.maxAccuracyMeters });
    return null;
  }
  const distance = haversineMeters(lat, lng, g.latitude, g.longitude);
  if (distance > g.radiusMeters) {
    fail(res, 403, 'OUTSIDE_GEOFENCE',
      `You are about ${Math.round(distance)} m from school. You must be within ${g.radiusMeters} m.`,
      { distance: Math.round(distance), radius: g.radiusMeters });
    return null;
  }

  if (!req.file || !looksLikeImage(req.file.buffer)) {
    fail(res, 400, 'SELFIE_REQUIRED', 'A live selfie is required.'); return null;
  }
  return { lat, lng, accuracy, distance };
}

const detailsFrom = (req, v, photoPublicId, flags, at) => ({
  at,
  latitude: v.lat, longitude: v.lng,
  accuracy: Math.round(v.accuracy),
  distanceMeters: Math.round(v.distance),
  photoPublicId,
  deviceId: String(req.body.deviceId || '').slice(0, 64) || null,
  flags
});

// ============ STAFF: today's state ============
// GET /api/staff-attendance/me/today
exports.getMyToday = async (req, res) => {
  try {
    const school = await School.findById(req.user.schoolId).select('name attendanceSettings').lean();
    if (!school) return fail(res, 404, 'NO_SCHOOL', 'School not found');
    const s = withDefaults(school.attendanceSettings);
    const day = schoolDay(s.timezone);
    const rec = await TeacherAttendance.findOne(attendanceForDay(req.user.schoolId, req.user._id, day)).lean();
    res.json({
      success: true,
      data: {
        schoolName: school.name,
        enabled: s.enabled,
        configured: isValidCoord(s.geofence.latitude, s.geofence.longitude),
        geofence: s.enabled ? s.geofence : null,
        requireSelfie: s.requireSelfie,
        timezone: s.timezone,
        shiftStart: s.shiftStart,
        dateKey: day.dateKey,
        record: rec && {
          status: rec.status, source: rec.source || 'manual', checkInTime: rec.checkInTime, checkOutTime: rec.checkOutTime,
          distanceIn: rec.checkInDetails?.distanceMeters ?? null
        }
      }
    });
  } catch (e) {
    console.error('getMyToday error', e);
    fail(res, 500, 'SERVER', 'Server error');
  }
};

exports.getMyDevice = async (req, res) => {
  try {
    const device = await StaffDevice.findOne({ schoolId: req.user.schoolId, userId: req.user._id }).select('deviceId').lean();
    res.json({ success: true, data: { registered: !!device && device.deviceId === deviceCode(req.query.deviceId) } });
  } catch (e) { console.error('getMyDevice error', e); fail(res, 500, 'SERVER', 'Could not check device.'); }
};

// ============ STAFF: check-in ============
// POST /api/staff-attendance/check-in   (multipart: latitude, longitude, accuracy, deviceId, selfie)
exports.checkIn = async (req, res) => {
  try {
    const school = await School.findById(req.user.schoolId).select('attendanceSettings settings.academicYear').lean();
    if (!school) return fail(res, 404, 'NO_SCHOOL', 'School not found');
    const settings = withDefaults(school.attendanceSettings);

    const v = await verifyPresence(req, res, settings);
    if (!v) return;

    const now = new Date();
    const day = schoolDay(settings.timezone, now);

    const existing = await TeacherAttendance.findOne(attendanceForDay(req.user.schoolId, req.user._id, day));
    if (existing?.checkInTime) return fail(res, 409, 'ALREADY_CHECKED_IN', 'You have already checked in today.');
    if (existing) return fail(res, 409, 'MANUAL_RECORD', 'Attendance was already marked manually. Ask your school admin to resolve it.');

    // late?
    const lateAfter = hhmmToMinutes(settings.shiftStart) + settings.graceMinutes;
    const status = day.minutesOfDay > lateAfter ? 'late' : 'present';

    // flag: different device than last time
    const flags = [];
    const last = await TeacherAttendance.findOne({
      teacherId: req.user._id, 'checkInDetails.deviceId': { $ne: null }
    }).sort({ createdAt: -1 }).select('checkInDetails.deviceId').lean();
    const dev = String(req.body.deviceId || '');
    if (last && dev && last.checkInDetails.deviceId !== dev) flags.push('new_device');

    let photoPublicId = null;
  if (settings.requireSelfie) {
      const up = await uploadSelfie(req.file.buffer, {
        schoolId: req.user.schoolId, userId: req.user._id, dateKey: day.dateKey, kind: 'in'
      });
      photoPublicId = up.public_id;
    }

    const details = detailsFrom(req, v, photoPublicId, flags, now);
    const doc = new TeacherAttendance({
        schoolId: req.user.schoolId, teacherId: req.user._id,
        date: day.start, dateKey: day.dateKey,
        status, checkInTime: now, source: 'geo-selfie',
        checkInDetails: details, markedBy: req.user._id,
        academicYear: school.settings?.academicYear || String(day.dateKey.slice(0, 4))
      });
    try { await doc.save(); } catch (error) { await deleteSelfie(photoPublicId).catch(() => {}); throw error; }
    broadcast(req.user.schoolId);

    res.status(201).json({
      success: true,
      message: status === 'late' ? 'Checked in (late).' : 'Checked in successfully.',
      data: { status, checkInTime: now, distance: Math.round(v.distance) }
    });
  } catch (e) {
    if (e?.code === 11000) return fail(res, 409, 'ALREADY_CHECKED_IN', 'You have already checked in today.');
    console.error('checkIn error', e);
    fail(res, 500, 'SERVER', 'Server error while marking attendance');
  }
};

// ============ STAFF: check-out ============
// POST /api/staff-attendance/check-out
exports.checkOut = async (req, res) => {
  try {
    const school = await School.findById(req.user.schoolId).select('attendanceSettings settings.academicYear').lean();
    if (!school) return fail(res, 404, 'NO_SCHOOL', 'School not found');
    const settings = withDefaults(school.attendanceSettings);

    const v = await verifyPresence(req, res, settings);
    if (!v) return;

    const now = new Date();
    const day = schoolDay(settings.timezone, now);
    const doc = await TeacherAttendance.findOne(attendanceForDay(req.user.schoolId, req.user._id, day));
    if (!doc?.checkInTime) return fail(res, 409, 'NOT_CHECKED_IN', 'Check in first.');
    if (doc.source !== 'geo-selfie') return fail(res, 409, 'MANUAL_RECORD', 'This record was marked manually. Ask your school admin to resolve it.');
    if (doc.checkOutTime) return fail(res, 409, 'ALREADY_CHECKED_OUT', 'You have already checked out today.');
    if (now - doc.checkInTime < 60 * 1000) return fail(res, 409, 'TOO_SOON', 'Please wait a minute before checking out.');

    let photoPublicId = null;
    if (settings.requireSelfie) {
      const up = await uploadSelfie(req.file.buffer, {
        schoolId: req.user.schoolId, userId: req.user._id, dateKey: day.dateKey, kind: 'out'
      });
      photoPublicId = up.public_id;
    }

    const hours = (now - doc.checkInTime) / 3600000;
    if (settings.halfDayMinHours > 0 && hours < settings.halfDayMinHours && ['present', 'late'].includes(doc.status)) {
      doc.status = 'half-day';
    }
    doc.checkOutTime = now;
    doc.checkOutDetails = detailsFrom(req, v, photoPublicId, [], now);
    try { await doc.save(); } catch (error) { await deleteSelfie(photoPublicId).catch(() => {}); throw error; }
    await StaffPresence.deleteOne({ schoolId: req.user.schoolId, userId: req.user._id })
      .catch((error) => console.error('Could not clear presence after checkout', error));
    broadcast(req.user.schoolId);

    res.json({
      success: true,
      message: 'Checked out successfully.',
      data: { status: doc.status, checkOutTime: now, hoursWorked: Math.round(hours * 100) / 100 }
    });
  } catch (e) {
    console.error('checkOut error', e);
    fail(res, 500, 'SERVER', 'Server error while checking out');
  }
};

// ============ ADMIN: settings ============
// GET /api/staff-attendance/settings
exports.getSettings = async (req, res) => {
  try {
    const school = await School.findById(req.user.schoolId).select('attendanceSettings').lean();
    if (!school) return fail(res, 404, 'NO_SCHOOL', 'School not found');
    res.json({ success: true, data: withDefaults(school.attendanceSettings) });
  } catch (e) {
    console.error('getSettings error', e);
    fail(res, 500, 'SERVER', 'Server error');
  }
};

// PUT /api/staff-attendance/settings
exports.updateSettings = async (req, res) => {
  try {
    const b = req.body || {};
    const g = b.geofence || {};
    const next = {
      enabled: !!b.enabled,
      timezone: String(b.timezone || DEFAULTS.timezone),
      geofence: {
        latitude: Number(g.latitude), longitude: Number(g.longitude),
        radiusMeters: Number(g.radiusMeters), maxAccuracyMeters: Number(g.maxAccuracyMeters)
      },
      requireSelfie: true,
      shiftStart: String(b.shiftStart || DEFAULTS.shiftStart),
      graceMinutes: Number(b.graceMinutes),
      halfDayMinHours: Number(b.halfDayMinHours)
    };
    const hasCoord = isValidCoord(next.geofence.latitude, next.geofence.longitude);
    const bad =
      (!isValidTimezone(next.timezone) && 'Invalid timezone') ||
      (!/^([01]\d|2[0-3]):[0-5]\d$/.test(next.shiftStart) && 'Shift start must be HH:MM') ||
      (!(next.graceMinutes >= 0 && next.graceMinutes <= 180) && 'Grace minutes must be 0-180') ||
      (!(next.halfDayMinHours >= 0 && next.halfDayMinHours <= 12) && 'Half-day hours must be 0-12') ||
      (!(next.geofence.radiusMeters >= 20 && next.geofence.radiusMeters <= 2000) && 'Radius must be 20-2000 m') ||
      (!(next.geofence.maxAccuracyMeters >= 10 && next.geofence.maxAccuracyMeters <= 500) && 'Max GPS accuracy must be 10-500 m') ||
      (next.enabled && !hasCoord && 'Set a valid school location before enabling');
    if (bad) return fail(res, 400, 'VALIDATION', bad);

    if (!hasCoord) { next.geofence.latitude = null; next.geofence.longitude = null; }
    await School.updateOne({ _id: req.user.schoolId }, { $set: { attendanceSettings: next } });
    res.json({ success: true, message: 'Attendance settings saved', data: next });
  } catch (e) {
    console.error('updateSettings error', e);
    fail(res, 500, 'SERVER', 'Server error');
  }
};

// ============ ADMIN: daily log with selfies ============
// GET /api/staff-attendance/log?date=YYYY-MM-DD
exports.getLog = async (req, res) => {
  try {
    const school = await School.findById(req.user.schoolId).select('attendanceSettings').lean();
    if (!school) return fail(res, 404, 'NO_SCHOOL', 'School not found');
    const s = withDefaults(school?.attendanceSettings);
    if (req.query.date && !/^\d{4}-\d{2}-\d{2}$/.test(req.query.date)) return fail(res, 400, 'BAD_DATE', 'Use a date in YYYY-MM-DD format.');
    const key = req.query.date || schoolDay(s.timezone).dateKey;
    const day = dayRangeFromKey(s.timezone, key);

    const [records, staff, demoDevices] = await Promise.all([
      TeacherAttendance.find({
        schoolId: req.user.schoolId, isActive: true,
        $or: [{ dateKey: key }, { date: { $gte: day.start, $lte: day.end } }]
      }).populate('teacherId', 'name email role phone').lean(),
      User.find({ schoolId: req.user.schoolId, role: { $in: STAFF_ROLES }, isActive: true })
        .select('name email role phone').sort({ name: 1 }).lean(),
      StaffDevice.find({ schoolId: req.user.schoolId, isDemo: true }).select('userId').lean()
    ]);
    const demoIds = new Set(demoDevices.map((device) => String(device.userId)));

    const rows = records.map((r) => ({
      id: r._id,
      staff: r.teacherId,
      isDemo: demoIds.has(String(r.teacherId?._id)),
      status: r.status,
      source: r.source || 'manual',
      checkInTime: r.checkInTime,
      checkOutTime: r.checkOutTime,
      distanceIn: r.checkInDetails?.distanceMeters ?? null,
      distanceOut: r.checkOutDetails?.distanceMeters ?? null,
      accuracyIn: r.checkInDetails?.accuracy ?? null,
      flags: r.checkInDetails?.flags || [],
      selfieInThumb: signedUrl(r.checkInDetails?.photoPublicId, true),
      selfieInFull: signedUrl(r.checkInDetails?.photoPublicId),
      selfieOutThumb: signedUrl(r.checkOutDetails?.photoPublicId, true),
      selfieOutFull: signedUrl(r.checkOutDetails?.photoPublicId),
      mapIn: r.checkInDetails?.latitude != null
        ? `https://www.google.com/maps?q=${r.checkInDetails.latitude},${r.checkInDetails.longitude}` : null
    }));

    const marked = new Set(records.map((r) => String(r.teacherId?._id)));
    const notMarked = staff.filter((u) => !marked.has(String(u._id)));

    res.json({
      success: true,
      data: {
        date: key, timezone: s.timezone, rows, notMarked,
        summary: {
          present: rows.filter((r) => r.status === 'present').length,
          late: rows.filter((r) => r.status === 'late').length,
          halfDay: rows.filter((r) => r.status === 'half-day').length,
          notMarked: notMarked.length,
          totalStaff: staff.length
        }
      }
    });
  } catch (e) {
    console.error('getLog error', e);
    fail(res, 500, 'SERVER', 'Server error');
  }
};

exports.updateLivePosition = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const school = await School.findById(schoolId).select('attendanceSettings').lean();
    if (!school) return fail(res, 404, 'NO_SCHOOL', 'School not found');
    const settings = withDefaults(school.attendanceSettings);
    if (!settings.enabled || !isValidCoord(settings.geofence.latitude, settings.geofence.longitude))
      return fail(res, 403, 'DISABLED', 'Attendance is not configured.');
    if (!(await hasRegisteredDevice(req)))
      return fail(res, 403, 'DEVICE_NOT_REGISTERED', 'Ask the school admin to register this device code.');
    const latitude = Number(req.body.latitude), longitude = Number(req.body.longitude);
    const accuracy = Number(req.body.accuracy), observedAt = new Date(req.body.observedAt);
    if (!isValidCoord(latitude, longitude) || !Number.isFinite(accuracy) || accuracy < 0 || accuracy > settings.geofence.maxAccuracyMeters)
      return fail(res, 422, 'LOW_ACCURACY', 'Get a more accurate location.');
    if (!Number.isFinite(observedAt.getTime()) || Math.abs(Date.now() - observedAt.getTime()) > 60000)
      return fail(res, 422, 'STALE_LOCATION', 'Get a fresh location.');
    const distanceMeters = haversineMeters(latitude, longitude, settings.geofence.latitude, settings.geofence.longitude);
    await StaffPresence.updateOne({ schoolId, userId: req.user._id }, {
      $set: { latitude, longitude, accuracy, observedAt, expiresAt: new Date(Date.now() + LIVE_MS) }
    }, { upsert: true });
    broadcast(schoolId);
    res.json({ success: true, data: { presence: distanceMeters <= settings.geofence.radiusMeters ? 'present' : 'absent', distanceMeters: Math.round(distanceMeters) } });
  } catch (e) { console.error('updateLivePosition error', e); fail(res, 500, 'SERVER', 'Could not update location.'); }
};

exports.clearLivePosition = async (req, res) => {
  try {
    await StaffPresence.deleteOne({ schoolId: req.user.schoolId, userId: req.user._id });
    broadcast(req.user.schoolId);
    res.json({ success: true });
  } catch (e) { console.error('clearLivePosition error', e); fail(res, 500, 'SERVER', 'Could not clear location.'); }
};

exports.getMap = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const school = await School.findById(schoolId).select('attendanceSettings').lean();
    if (!school) return fail(res, 404, 'NO_SCHOOL', 'School not found');
    const settings = withDefaults(school.attendanceSettings);
    const day = schoolDay(settings.timezone);
    const [devices, records, presences] = await Promise.all([
      StaffDevice.find({ schoolId }).populate('userId', 'name role isActive').lean(),
      TeacherAttendance.find({ schoolId, isActive: true,
        $or: [{ dateKey: day.dateKey }, { date: { $gte: day.start, $lte: day.end } }]
      }).select('teacherId status checkInTime checkOutTime checkInDetails').lean(),
      StaffPresence.find({ schoolId, observedAt: { $gte: new Date(Date.now() - LIVE_MS) } }).lean()
    ]);
    const byUser = new Map(presences.map((p) => [String(p.userId), p]));
    const attendanceByUser = new Map(records.map((r) => [String(r.teacherId), r]));
    const people = devices.filter((d) => d.userId?.isActive && STAFF_ROLES.includes(d.userId.role)).map((d) => {
      const userId = String(d.userId._id);
      const record = attendanceByUser.get(userId);
      const observed = byUser.get(userId);
      const live = d.isDemo ? {
        latitude: settings.geofence.latitude + (d.demoPosition === 'outside' ? 0.005 : 0.00025),
        longitude: settings.geofence.longitude + (d.demoPosition === 'outside' ? 0.001 : 0.0002),
        accuracy: 8, observedAt: d.updatedAt
      } : observed;
      const distanceMeters = live ? haversineMeters(live.latitude, live.longitude, settings.geofence.latitude, settings.geofence.longitude) : null;
      const presence = distanceMeters == null ? 'offline' : distanceMeters <= settings.geofence.radiusMeters ? 'present' : 'absent';
      return {
        id: userId, name: d.userId.name, role: d.userId.role, isDemo: d.isDemo,
        presence, distanceMeters: distanceMeters == null ? null : Math.round(distanceMeters),
        status: record?.status || null, checkInTime: record?.checkInTime || null,
        checkInPosition: record?.checkInDetails?.latitude == null ? null : {
          latitude: record.checkInDetails.latitude, longitude: record.checkInDetails.longitude,
          accuracy: record.checkInDetails.accuracy, at: record.checkInTime
        },
        livePosition: live ? { latitude: live.latitude, longitude: live.longitude, accuracy: live.accuracy, at: live.observedAt } : null
      };
    });
    res.json({ success: true, data: { dateKey: day.dateKey, timezone: settings.timezone, geofence: settings.geofence, people } });
  } catch (e) { console.error('getMap error', e); fail(res, 500, 'SERVER', 'Could not load map.'); }
};

exports.getDevices = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const [staff, devices] = await Promise.all([
      User.find({ schoolId, role: { $in: STAFF_ROLES }, isActive: true }).select('name role').sort({ name: 1 }).lean(),
      StaffDevice.find({ schoolId }).select('userId deviceId isDemo demoPosition updatedAt').lean()
    ]);
    const byUser = new Map(devices.map((d) => [String(d.userId), d]));
    res.json({ success: true, data: staff.map((u) => {
      const device = byUser.get(String(u._id));
      return { id: String(u._id), name: u.name, role: u.role, registered: !!device,
        deviceId: device?.deviceId || null, isDemo: !!device?.isDemo, demoPosition: device?.demoPosition || null };
    }) });
  } catch (e) { console.error('getDevices error', e); fail(res, 500, 'SERVER', 'Could not load devices.'); }
};

exports.registerDevice = async (req, res) => {
  try {
    const { userId } = req.body || {};
    const deviceId = deviceCode(req.body?.deviceId);
    if (!mongoose.isValidObjectId(userId) || !/^[A-Za-z0-9-]{8,64}$/.test(deviceId))
      return fail(res, 400, 'VALIDATION', 'Choose a staff member and enter their device code.');
    const schoolId = req.user.schoolId;
    const user = await User.findOne({ _id: userId, schoolId, role: { $in: STAFF_ROLES }, isActive: true }).select('_id').lean();
    if (!user) return fail(res, 404, 'STAFF_NOT_FOUND', 'Staff member not found in this school.');
    const existingCode = await StaffDevice.findOne({ schoolId, deviceId }).select('userId').lean();
    if (existingCode && String(existingCode.userId) !== String(userId))
      return fail(res, 409, 'DEVICE_IN_USE', 'This device is already registered to another staff member.');
    await StaffDevice.findOneAndUpdate({ schoolId, userId },
      { $set: { deviceId, isDemo: false, registeredBy: req.user._id } },
      { upsert: true, new: true, runValidators: true });
    await StaffPresence.deleteOne({ schoolId, userId });
    broadcast(schoolId);
    res.json({ success: true, message: 'Device registered.' });
  } catch (e) {
    if (e?.code === 11000) return fail(res, 409, 'DEVICE_IN_USE', 'This device is already registered.');
    console.error('registerDevice error', e); fail(res, 500, 'SERVER', 'Could not register device.');
  }
};

exports.removeDevice = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!mongoose.isValidObjectId(userId)) return fail(res, 400, 'VALIDATION', 'Invalid staff member.');
    const schoolId = req.user.schoolId;
    await Promise.all([StaffDevice.deleteOne({ schoolId, userId }), StaffPresence.deleteOne({ schoolId, userId })]);
    broadcast(schoolId);
    res.json({ success: true, message: 'Device removed.' });
  } catch (e) { console.error('removeDevice error', e); fail(res, 500, 'SERVER', 'Could not remove device.'); }
};

exports.setDemoPosition = async (req, res) => {
  try {
    const { userId, position } = req.body || {};
    if (!mongoose.isValidObjectId(userId) || !['inside', 'outside'].includes(position))
      return fail(res, 400, 'VALIDATION', 'Choose a demo staff member and position.');
    const result = await StaffDevice.updateOne({ schoolId: req.user.schoolId, userId, isDemo: true }, { $set: { demoPosition: position } });
    if (!result.matchedCount) return fail(res, 404, 'DEMO_NOT_FOUND', 'Demo device not found.');
    broadcast(req.user.schoolId);
    res.json({ success: true, message: `Demo employee moved ${position}.` });
  } catch (e) { console.error('setDemoPosition error', e); fail(res, 500, 'SERVER', 'Could not move demo employee.'); }
};
