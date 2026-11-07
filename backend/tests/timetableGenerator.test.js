const test = require('node:test');
const assert = require('node:assert/strict');
const { generateTimetable, overlaps, automaticTargets } = require('../services/timetableGenerator');

test('automatic targets use active assigned subjects and fit available slots', () => {
  const subjects = [
    { _id: 'english', classId: 'class-1', teacherId: 'teacher-1', status: 'active' },
    { _id: 'science', classId: 'class-1', teacherId: 'teacher-2', status: 'active' },
    { _id: 'inactive', classId: 'class-1', teacherId: 'teacher-3', status: 'inactive' },
    { _id: 'unassigned', classId: 'class-1', teacherId: null, status: 'active' }
  ];
  const targets = automaticTargets(subjects, 'class-1', 8, new Set(['teacher-1', 'teacher-2']));
  assert.deepEqual(targets.map(target => [target.subjectId, target.teacherId, target.weeklyPeriods]), [
    ['english', 'teacher-1', 4], ['science', 'teacher-2', 4]
  ]);
});

test('automatic targets skip inactive teachers', () => {
  const targets = automaticTargets([{ _id: 'math', classId: 'class-1', teacherId: 'teacher-1', status: 'active' }], 'class-1', 30, new Set());
  assert.deepEqual(targets, []);
});

test('overlap requires actual shared minutes', () => {
  assert.equal(overlaps('08:00', '09:00', '09:00', '10:00'), false);
  assert.equal(overlaps('08:00', '09:00', '08:30', '09:30'), true);
});

test('generator respects teacher unavailability and other classes', () => {
  const result = generateTimetable({
    classId: 'class-1',
    days: ['Monday'],
    periods: [{ startTime: '08:00', endTime: '09:00' }, { startTime: '09:00', endTime: '10:00' }],
    targets: [{ subjectId: 'math', teacherId: 'teacher-1', weeklyPeriods: 1 }],
    unavailable: [{ teacherId: 'teacher-1', dayOfWeek: 'Monday', startTime: '08:00', endTime: '09:00' }],
    occupied: []
  });
  assert.equal(result.entries.length, 1);
  assert.equal(result.entries[0].startTime, '09:00');
  assert.deepEqual(result.unmet, []);
});

test('generator reports unmet targets instead of scheduling collisions', () => {
  const result = generateTimetable({
    classId: 'class-1', days: ['Monday'],
    periods: [{ startTime: '08:00', endTime: '09:00' }],
    targets: [{ subjectId: 'math', teacherId: 'teacher-1', weeklyPeriods: 2 }],
    unavailable: [], occupied: []
  });
  assert.equal(result.entries.length, 1);
  assert.equal(result.unmet[0].remaining, 1);
});

test('generator distributes subjects across periods', () => {
  const result = generateTimetable({
    classId: 'class-1', days: ['Monday'],
    periods: [{ startTime: '08:00', endTime: '09:00' }, { startTime: '09:00', endTime: '10:00' }, { startTime: '10:00', endTime: '11:00' }, { startTime: '11:00', endTime: '12:00' }],
    targets: [{ subjectId: 'math', teacherId: 'teacher-1', weeklyPeriods: 2 }, { subjectId: 'science', teacherId: 'teacher-2', weeklyPeriods: 2 }],
    unavailable: [], occupied: []
  });
  assert.deepEqual(result.entries.map(entry => entry.subjectId), ['math', 'science', 'math', 'science']);
});

test('automatic plan spreads one subject across school days', () => {
  const result = generateTimetable({
    classId: 'class-1', days: ['Monday', 'Tuesday', 'Wednesday'],
    periods: [{ startTime: '08:00', endTime: '09:00' }, { startTime: '09:00', endTime: '10:00' }],
    targets: [{ subjectId: 'english', teacherId: 'teacher-1', weeklyPeriods: 3 }],
    unavailable: [], occupied: []
  });
  assert.deepEqual(result.entries.map(entry => entry.dayOfWeek), ['Monday', 'Tuesday', 'Wednesday']);
});
