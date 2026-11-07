const test = require('node:test');
const assert = require('node:assert/strict');
const { haversineMeters, schoolDay, dayRangeFromKey } = require('../utils/geo');

test('school day follows the configured timezone across UTC midnight', () => {
  const day = schoolDay('Asia/Kolkata', new Date('2026-11-04T19:00:00.000Z'));
  assert.equal(day.dateKey, '2026-11-05');
  assert.equal(day.start.toISOString(), '2026-11-04T18:30:00.000Z');
  assert.equal(day.end.toISOString(), '2026-11-05T18:29:59.999Z');
  assert.equal(dayRangeFromKey('Asia/Kolkata', '2026-11-05').start.getTime(), day.start.getTime());
});

test('geofence distance is zero at the school and grows with separation', () => {
  assert.equal(haversineMeters(28.6, 77.2, 28.6, 77.2), 0);
  assert.ok(haversineMeters(28.6, 77.2, 28.601, 77.2) > 100);
});

test('registered device shares inside or outside position; stale and inaccurate fixes fail', async () => {
  const School = require('../models/School');
  const StaffDevice = require('../models/StaffDevice');
  const StaffPresence = require('../models/StaffPresence');
  const controller = require('../controllers/staffAttendanceController');
  const original = { school: School.findById, device: StaffDevice.exists, update: StaffPresence.updateOne };
  const saved = [];
  School.findById = () => ({ select: () => ({ lean: async () => ({ attendanceSettings: {
    enabled: true, timezone: 'Asia/Kolkata', geofence: { latitude: 28.6, longitude: 77.2, radiusMeters: 150, maxAccuracyMeters: 100 }
  } }) }) });
  StaffDevice.exists = async () => ({ _id: 'device-a' });
  StaffPresence.updateOne = async (...args) => { saved.push(args); };
  const invoke = async (body) => {
    let status = 200, json;
    const res = { status(code) { status = code; return this; }, json(value) { json = value; return this; } };
    await controller.updateLivePosition({ user: { schoolId: 'school-a', _id: 'staff-a' }, body }, res);
    return { status, json };
  };
  try {
    const fresh = { latitude: 28.6, longitude: 77.2, accuracy: 15, observedAt: new Date().toISOString(), deviceId: 'device-123' };
    assert.equal((await invoke(fresh)).status, 200);
    assert.equal(saved.length, 1);
    assert.deepEqual(saved[0][0], { schoolId: 'school-a', userId: 'staff-a' });
    assert.equal((await invoke({ ...fresh, observedAt: '2020-01-01T00:00:00Z' })).json.code, 'STALE_LOCATION');
    assert.equal((await invoke({ ...fresh, accuracy: 301 })).json.code, 'LOW_ACCURACY');
    assert.equal((await invoke({ ...fresh, latitude: 28.61 })).json.data.presence, 'absent');
    StaffDevice.exists = async () => null;
    assert.equal((await invoke(fresh)).json.code, 'DEVICE_NOT_REGISTERED');
    assert.equal(saved.length, 2);
  } finally {
    School.findById = original.school;
    StaffDevice.exists = original.device;
    StaffPresence.updateOne = original.update;
  }
});

test('map snapshot queries and returns only the authenticated school', async () => {
  const School = require('../models/School');
  const TeacherAttendance = require('../models/TeacherAttendance');
  const StaffPresence = require('../models/StaffPresence');
  const StaffDevice = require('../models/StaffDevice');
  const controller = require('../controllers/staffAttendanceController');
  const original = { school: School.findById, attendance: TeacherAttendance.find, presence: StaffPresence.find, device: StaffDevice.find };
  let attendanceQuery, presenceQuery, deviceQuery;
  School.findById = () => ({ select: () => ({ lean: async () => ({ attendanceSettings: { timezone: 'Asia/Kolkata', geofence: { latitude: 28.6, longitude: 77.2, radiusMeters: 150 } } }) }) });
  TeacherAttendance.find = (query) => { attendanceQuery = query; return { select: () => ({ lean: async () => [] }) }; };
  StaffPresence.find = (query) => { presenceQuery = query; return { lean: async () => [{ userId: 'staff-a', latitude: 28.6, longitude: 77.2, accuracy: 12, observedAt: new Date() }] }; };
  StaffDevice.find = (query) => { deviceQuery = query; return { populate: () => ({ lean: async () => [{ userId: { _id: 'staff-a', name: 'Asha', role: 'teacher', isActive: true }, isDemo: false }] }) }; };
  let response;
  try {
    await controller.getMap({ user: { schoolId: 'school-a' } }, { json(value) { response = value; return this; }, status() { return this; } });
    assert.equal(attendanceQuery.schoolId, 'school-a');
    assert.equal(presenceQuery.schoolId, 'school-a');
    assert.equal(deviceQuery.schoolId, 'school-a');
    assert.equal(response.data.people[0].name, 'Asha');
    assert.equal(response.data.people[0].presence, 'present');
  } finally {
    School.findById = original.school;
    TeacherAttendance.find = original.attendance;
    StaffPresence.find = original.presence;
    StaffDevice.find = original.device;
  }
});

test('selfie retention deletes only images older than 90 days and keeps the attendance record', async () => {
  const TeacherAttendance = require('../models/TeacherAttendance');
  const { cloudinary } = require('../utils/cloudinary');
  const { removeExpiredSelfies } = require('../services/staffSelfieRetention');
  const original = { find: TeacherAttendance.find, update: TeacherAttendance.updateOne, destroy: cloudinary.uploader.destroy };
  const old = new Date(Date.now() - 91 * 86400000), recent = new Date();
  const deleted = [], updated = [];
  TeacherAttendance.find = () => ({ sort: () => ({ limit: async () => [{
    _id: 'record-a', checkInDetails: { at: old, photoPublicId: 'old-photo' },
    checkOutDetails: { at: recent, photoPublicId: 'recent-photo' }
  }] }) });
  TeacherAttendance.updateOne = async (...args) => { updated.push(args); };
  cloudinary.uploader.destroy = async (id) => { deleted.push(id); return { result: 'ok' }; };
  try {
    await removeExpiredSelfies();
    assert.deepEqual(deleted, ['old-photo']);
    assert.equal(updated.length, 1);
    assert.deepEqual(updated[0][1], { $unset: { 'checkInDetails.photoPublicId': '' } });
  } finally {
    TeacherAttendance.find = original.find;
    TeacherAttendance.updateOne = original.update;
    cloudinary.uploader.destroy = original.destroy;
  }
});
