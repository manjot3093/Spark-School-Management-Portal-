const mongoose = require('mongoose');
const Schedule = require('../models/Schedule');
const Class = require('../models/Class');
const Subject = require('../models/Subject');
const User = require('../models/User');
const Settings = require('../models/TimetableSettings');
const Draft = require('../models/TimetableDraft');
const { generateTimetable, overlaps, automaticTargets } = require('../services/timetableGenerator');

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const validId = value => typeof value === 'string' && mongoose.isValidObjectId(value);
const validSlot = slot => slot && TIME.test(slot.startTime) && TIME.test(slot.endTime) && slot.startTime < slot.endTime;
const year = () => { const y = new Date().getFullYear(); return `${y}-${y + 1}`; };

exports.getSettings = async (req, res) => {
  const data = await Settings.findOne({ schoolId: req.user.schoolId }).lean();
  res.json({ success: true, data: data || { days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], periods: [], targets: [], unavailable: [] } });
};

exports.saveSettings = async (req, res) => {
  const { days, periods, targets, unavailable } = req.body;
  if (!Array.isArray(days) || !days.length || new Set(days).size !== days.length || days.some(day => !DAYS.includes(day)) || !Array.isArray(periods) || !periods.length || periods.length > 12 || periods.some(slot => !validSlot(slot)) || !Array.isArray(targets) || !Array.isArray(unavailable)) return res.status(400).json({ error: 'Invalid timetable settings' });
  const ordered = [...periods].sort((a, b) => a.startTime.localeCompare(b.startTime));
  if (ordered.some((slot, i) => i > 0 && overlaps(ordered[i - 1].startTime, ordered[i - 1].endTime, slot.startTime, slot.endTime))) return res.status(400).json({ error: 'Periods overlap' });
  if (targets.some(t => !validId(t.classId) || !validId(t.subjectId) || !validId(t.teacherId) || !Number.isInteger(t.weeklyPeriods) || t.weeklyPeriods < 1 || t.weeklyPeriods > 30) || unavailable.some(u => !validId(u.teacherId) || !days.includes(u.dayOfWeek) || !validSlot(u))) return res.status(400).json({ error: 'Invalid targets or unavailable slots' });
  const schoolId = req.user.schoolId;
  const [classes, subjects, teachers] = await Promise.all([Class.find({ schoolId, _id: { $in: targets.map(t => t.classId) } }).select('_id').lean(), Subject.find({ schoolId, _id: { $in: targets.map(t => t.subjectId) } }).select('_id classId teacherId').lean(), User.find({ schoolId, role: 'teacher', _id: { $in: [...targets.map(t => t.teacherId), ...unavailable.map(u => u.teacherId)] } }).select('_id').lean()]);
  const classIds = new Set(classes.map(c => String(c._id))), teacherIds = new Set(teachers.map(t => String(t._id)));
  if (targets.some(t => { const subject = subjects.find(s => String(s._id) === t.subjectId); return !classIds.has(t.classId) || !teacherIds.has(t.teacherId) || !subject || String(subject.classId) !== t.classId || String(subject.teacherId) !== t.teacherId; }) || unavailable.some(u => !teacherIds.has(u.teacherId))) return res.status(400).json({ error: 'Settings reference records outside this school or an unassigned subject' });
  const data = await Settings.findOneAndUpdate({ schoolId }, { $set: { days, periods: ordered, targets, unavailable } }, { upsert: true, new: true, runValidators: true });
  res.json({ success: true, data });
};

exports.generate = async (req, res) => {
  const { classId } = req.body;
  const academicYear = typeof req.body.academicYear === 'string' && /^\d{4}-\d{4}$/.test(req.body.academicYear) ? req.body.academicYear : year();
  if (!validId(classId) || !await Class.exists({ _id: classId, schoolId: req.user.schoolId })) return res.status(400).json({ error: 'Invalid class' });
  const settings = await Settings.findOne({ schoolId: req.user.schoolId }).lean();
  const days = settings?.days?.length ? settings.days : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const periods = settings?.periods?.length ? settings.periods : Array.from({ length: 6 }, (_, i) => ({ startTime: `${String(8 + i).padStart(2, '0')}:00`, endTime: `${String(9 + i).padStart(2, '0')}:00` }));
  let targets = (settings?.targets || []).filter(t => String(t.classId) === classId);
  const automatic = targets.length === 0;
  if (automatic) {
    const subjects = await Subject.find({ schoolId: req.user.schoolId, classId, status: 'active', teacherId: { $ne: null } }).select('_id classId teacherId status').lean();
    const teachers = await User.find({ schoolId: req.user.schoolId, role: 'teacher', isActive: true, _id: { $in: subjects.map(subject => subject.teacherId) } }).select('_id').lean();
    targets = automaticTargets(subjects, classId, days.length * periods.length, new Set(teachers.map(teacher => String(teacher._id))));
  }
  if (!targets.length) return res.status(400).json({ error: 'Assign at least one active subject and active teacher to this class before generating a timetable' });
  const occupied = await Schedule.find({ schoolId: req.user.schoolId, academicYear, status: 'active', classId: { $ne: classId } }).select('classId teacherId dayOfWeek startTime endTime').lean();
  const result = generateTimetable({ classId, days, periods, targets, unavailable: settings?.unavailable || [], occupied });
  const draft = await Draft.create({ schoolId: req.user.schoolId, classId, academicYear, entries: result.entries, unmet: result.unmet, createdBy: req.user._id });
  res.status(201).json({ success: true, data: draft, automatic });
};

exports.getDraft = async (req, res) => {
  if (!validId(req.params.classId)) return res.status(400).json({ error: 'Invalid class' });
  const data = await Draft.findOne({ schoolId: req.user.schoolId, classId: req.params.classId }).sort({ createdAt: -1 }).lean();
  res.json({ success: true, data });
};

exports.publish = async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ error: 'Invalid draft' });
  const draft = await Draft.findOne({ _id: req.params.id, schoolId: req.user.schoolId });
  if (!draft) return res.status(404).json({ error: 'Draft not found' });
  if (draft.unmet.length) return res.status(409).json({ error: 'Resolve unmet subject targets before publishing' });
  const occupied = await Schedule.find({ schoolId: req.user.schoolId, academicYear: draft.academicYear, status: 'active', classId: { $ne: draft.classId } }).lean();
  if (draft.entries.some(entry => occupied.some(item => String(item.teacherId) === String(entry.teacherId) && item.dayOfWeek === entry.dayOfWeek && overlaps(item.startTime, item.endTime, entry.startTime, entry.endTime)))) return res.status(409).json({ error: 'A teacher conflict appeared since draft generation. Generate again.' });
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      await Schedule.deleteMany({ schoolId: req.user.schoolId, classId: draft.classId, academicYear: draft.academicYear, status: 'active' }).session(session);
      await Schedule.insertMany(draft.entries.map(entry => ({ schoolId: req.user.schoolId, classId: draft.classId, teacherId: entry.teacherId, subjectId: entry.subjectId, dayOfWeek: entry.dayOfWeek, startTime: entry.startTime, endTime: entry.endTime, academicYear: draft.academicYear, status: 'active', createdBy: req.user._id })), { session });
      await Draft.deleteOne({ _id: draft._id }).session(session);
    });
    res.json({ success: true, count: draft.entries.length });
  } catch (error) { res.status(500).json({ error: 'Could not publish timetable atomically; check MongoDB transaction support' }); }
  finally { await session.endSession(); }
};
