// Idempotent demo setup for the existing SPARK01 school. It does not change real staff records.
require('dotenv').config({ path: require('path').join(__dirname, '..', 'config.env') });
const crypto = require('crypto');
const mongoose = require('mongoose');
const School = require('../models/School');
const User = require('../models/User');
const StaffDevice = require('../models/StaffDevice');
const TeacherAttendance = require('../models/TeacherAttendance');
const { schoolDay, dayRangeFromKey } = require('../utils/geo');

const offsetKey = (key, days) => {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
};

async function main() {
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
  const school = await School.findOne({ code: 'SPARK01' });
  if (!school) throw new Error('SPARK01 school not found');
  const admin = await User.findOne({ schoolId: school._id, role: 'school_admin', isActive: true });
  if (!admin) throw new Error('An active school admin is required');

  school.attendanceSettings = {
    enabled: true, timezone: 'Asia/Kolkata',
    geofence: { latitude: 23.396895, longitude: 85.380353, radiusMeters: 250, maxAccuracyMeters: 500 },
    requireSelfie: true, shiftStart: '09:00', graceMinutes: 10, halfDayMinHours: 4
  };
  await school.save();

  const demos = [
    { name: 'Demo Asha', email: 'attendance-demo-asha@demo.spark.edu', role: 'librarian', deviceId: 'DEMO-CAMPUS-ASHA', demoPosition: 'inside' },
    { name: 'Demo Ravi', email: 'attendance-demo-ravi@demo.spark.edu', role: 'accountant', deviceId: 'DEMO-CAMPUS-RAVI', demoPosition: 'outside' }
  ];
  const today = schoolDay('Asia/Kolkata').dateKey;
  const history = [
    ['present', 'absent'],
    ['late', 'present'],
    ['half-day', 'late'],
    ['present', 'absent']
  ];
  for (const [personIndex, person] of demos.entries()) {
    let user = await User.findOne({ email: person.email });
    if (user && String(user.schoolId) !== String(school._id)) throw new Error('Demo email belongs to another school');
    if (!user) {
      user = await User.create({ name: person.name, email: person.email, role: person.role,
        schoolId: school._id, isActive: true, password: crypto.randomBytes(24).toString('base64url') });
    }
    await StaffDevice.findOneAndUpdate({ schoolId: school._id, userId: user._id },
      { $set: { deviceId: person.deviceId, isDemo: true, demoPosition: person.demoPosition, registeredBy: admin._id } },
      { upsert: true, new: true, runValidators: true });
    for (let daysBack = 0; daysBack < history.length; daysBack++) {
      const dateKey = offsetKey(today, -daysBack);
      const day = dayRangeFromKey('Asia/Kolkata', dateKey);
      const existing = await TeacherAttendance.exists({ schoolId: school._id, teacherId: user._id,
        $or: [{ dateKey }, { date: { $gte: day.start, $lte: day.end } }] });
      if (existing) continue;
      const status = history[daysBack][personIndex];
      const checkInTime = status === 'absent' ? null : new Date(day.start.getTime() + (status === 'late' ? 10 : 9) * 3600000 + 15 * 60000);
      const checkOutTime = checkInTime && daysBack > 0
        ? new Date(checkInTime.getTime() + (status === 'half-day' ? 3 : 7) * 3600000) : null;
      await TeacherAttendance.create({ schoolId: school._id, teacherId: user._id,
        date: day.start, dateKey, status, checkInTime, checkOutTime,
        source: 'manual', remarks: 'Examiner demo record — sample attendance', markedBy: admin._id,
        academicYear: school.settings?.academicYear || dateKey.slice(0, 4) });
    }
  }
  console.log(`Attendance demo configured for SPARK01 with two demo devices and daily logs from ${offsetKey(today, -3)} to ${today}.`);
}

main().catch((error) => { console.error('Attendance demo setup failed:', error.message); process.exitCode = 1; })
  .finally(() => mongoose.disconnect());
