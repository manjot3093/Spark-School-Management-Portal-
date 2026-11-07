const TeacherAttendance = require('../models/TeacherAttendance');
const { cloudinary } = require('../utils/cloudinary');

const RETENTION_MS = 90 * 24 * 60 * 60 * 1000;

async function removeExpiredSelfies() {
  const cutoff = new Date(Date.now() - RETENTION_MS);
  let cursor = null;
  for (;;) {
    const query = { $or: [
      { 'checkInDetails.at': { $lt: cutoff }, 'checkInDetails.photoPublicId': { $exists: true, $ne: null } },
      { 'checkOutDetails.at': { $lt: cutoff }, 'checkOutDetails.photoPublicId': { $exists: true, $ne: null } }
    ] };
    if (cursor) query._id = { $gt: cursor };
    const records = await TeacherAttendance.find(query).sort({ _id: 1 }).limit(100);
    for (const record of records) {
      for (const field of ['checkInDetails', 'checkOutDetails']) {
        const details = record[field];
        if (!details?.photoPublicId || !details.at || details.at >= cutoff) continue;
        try {
          const publicId = details.photoPublicId;
          const result = await cloudinary.uploader.destroy(publicId, { type: 'authenticated', resource_type: 'image' });
          if (result.result === 'ok' || result.result === 'not found') {
            await TeacherAttendance.updateOne({ _id: record._id, [`${field}.photoPublicId`]: publicId },
              { $unset: { [`${field}.photoPublicId`]: '' } });
          }
        } catch (error) { console.error('Staff selfie deletion failed', record._id, error); }
      }
    }
    if (records.length < 100) break;
    cursor = records[records.length - 1]._id;
  }
}

function startStaffSelfieRetention() {
  const run = () => removeExpiredSelfies().catch((error) => console.error('Staff selfie retention failed', error));
  run();
  setInterval(run, 24 * 60 * 60 * 1000).unref();
}

module.exports = { removeExpiredSelfies, startStaffSelfieRetention };
