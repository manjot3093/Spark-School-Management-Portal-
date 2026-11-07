const minutes = value => Number(value.slice(0, 2)) * 60 + Number(value.slice(3, 5));
const overlaps = (aStart, aEnd, bStart, bEnd) => minutes(aStart) < minutes(bEnd) && minutes(bStart) < minutes(aEnd);

function automaticTargets(subjects, classId, slotCount, activeTeacherIds) {
  const assigned = subjects.filter(subject => subject.classId && subject.teacherId && subject.status === 'active' && activeTeacherIds.has(String(subject.teacherId)));
  if (!assigned.length) return [];
  const weeklyPeriods = Math.max(1, Math.min(5, Math.floor(slotCount / assigned.length)));
  return assigned.map(subject => ({ classId, subjectId: subject._id, teacherId: subject.teacherId, weeklyPeriods }));
}

function generateTimetable({ classId, days, periods, targets, unavailable, occupied }) {
  const entries = [];
  const unmet = [];
  const slots = periods.flatMap(period => days.map(dayOfWeek => ({ dayOfWeek, ...period })));
  const sortedTargets = [...targets].sort((a, b) => b.weeklyPeriods - a.weeklyPeriods || String(a.subjectId).localeCompare(String(b.subjectId)));
  const counts = new Map(sortedTargets.map(target => [String(target.subjectId), 0]));
  let rotation = 0;
  for (const slot of slots) {
    for (let offset = 0; offset < sortedTargets.length; offset++) {
      const index = (rotation + offset) % sortedTargets.length;
      const target = sortedTargets[index];
      if (counts.get(String(target.subjectId)) >= target.weeklyPeriods) continue;
      const blocked = unavailable.some(item => String(item.teacherId) === String(target.teacherId) && item.dayOfWeek === slot.dayOfWeek && overlaps(item.startTime, item.endTime, slot.startTime, slot.endTime));
      const conflict = [...occupied, ...entries].some(item => item.dayOfWeek === slot.dayOfWeek && overlaps(item.startTime, item.endTime, slot.startTime, slot.endTime) && (String(item.classId) === String(classId) || String(item.teacherId) === String(target.teacherId)));
      if (blocked || conflict) continue;
      entries.push({ classId, subjectId: target.subjectId, teacherId: target.teacherId, ...slot });
      counts.set(String(target.subjectId), counts.get(String(target.subjectId)) + 1);
      rotation = (index + 1) % sortedTargets.length;
      break;
    }
  }
  for (const target of sortedTargets) {
    const remaining = target.weeklyPeriods - counts.get(String(target.subjectId));
    if (remaining > 0) unmet.push({ subjectId: target.subjectId, remaining });
  }
  return { entries, unmet };
}

module.exports = { generateTimetable, overlaps, automaticTargets };
