import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { apiRequest } from '../../services/api';

type Period = { startTime: string; endTime: string };
type Target = { classId: string; subjectId: string; teacherId: string; weeklyPeriods: number };
type Unavailable = { teacherId: string; dayOfWeek: string; startTime: string; endTime: string };
type Settings = { days: string[]; periods: Period[]; targets: Target[]; unavailable: Unavailable[] };
type Entry = { subjectId: string; teacherId: string; dayOfWeek: string; startTime: string; endTime: string };
type Draft = { _id: string; entries: Entry[]; unmet: { subjectId: string; remaining: number }[]; academicYear: string };
type Entity = { _id: string; name: string; teacherId?: string | { _id: string }; classId?: string | { _id: string } };

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DEFAULT_PERIODS = Array.from({ length: 6 }, (_, i) => ({ startTime: `${String(8 + i).padStart(2, '0')}:00`, endTime: `${String(9 + i).padStart(2, '0')}:00` }));
const id = (value?: string | { _id: string }) => typeof value === 'string' ? value : value?._id || '';

export default function TimetableGenerator({ selectedClass, teachers, subjects, onPublished }: { selectedClass: string; teachers: Entity[]; subjects: Entity[]; onPublished: () => void }) {
  const [settings, setSettings] = useState<Settings>({ days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], periods: [{ startTime: '08:00', endTime: '09:00' }], targets: [], unavailable: [] });
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    apiRequest('/schedules/settings').then(response => setSettings({ ...response.data, periods: response.data.periods?.length ? response.data.periods : DEFAULT_PERIODS })).catch(() => toast.error('Could not load timetable settings'));
  }, []);
  useEffect(() => {
    if (!selectedClass) { setDraft(null); return; }
    apiRequest(`/schedules/drafts/class/${selectedClass}`).then(response => setDraft(response.data)).catch(() => setDraft(null));
  }, [selectedClass]);

  const classSubjects = subjects.filter(subject => id(subject.classId) === selectedClass && id(subject.teacherId));
  const save = async () => {
    try { setBusy(true); const response = await apiRequest('/schedules/settings', { method: 'PUT', body: JSON.stringify(settings) }); setSettings(response.data); toast.success('Scheduling rules saved'); }
    catch (error) { toast.error(error instanceof Error ? error.message : 'Could not save rules'); }
    finally { setBusy(false); }
  };
  const generate = async () => {
    try { setBusy(true); const response = await apiRequest('/schedules/generate', { method: 'POST', body: JSON.stringify({ classId: selectedClass }) }); setDraft(response.data); toast.success(response.automatic ? 'Automatic draft ready using assigned subjects and teachers' : 'Draft ready for review'); }
    catch (error) { toast.error(error instanceof Error ? error.message : 'Could not generate draft'); }
    finally { setBusy(false); }
  };
  const publish = async () => {
    if (!draft || !window.confirm('Replace this class timetable with the reviewed draft?')) return;
    try { setBusy(true); await apiRequest(`/schedules/drafts/${draft._id}/publish`, { method: 'POST' }); setDraft(null); onPublished(); toast.success('Timetable published'); }
    catch (error) { toast.error(error instanceof Error ? error.message : 'Could not publish timetable'); }
    finally { setBusy(false); }
  };

  return <section className="rounded-xl border border-blue-200 bg-white p-4 space-y-4" aria-label="Generate timetable">
    <div className="flex flex-wrap items-center justify-between gap-2"><div><h2 className="text-lg font-bold text-[#1d3568]">Generate timetable</h2><p className="text-sm text-slate-600">Select a class to draft from its assigned subjects and teachers. Edit rules for custom periods and weekly targets, then review before publishing.</p></div><button type="button" className="rounded border px-3 py-2 text-sm focus-visible:ring-2" onClick={() => setOpen(!open)} aria-expanded={open}>{open ? 'Hide rules' : 'Edit rules'}</button></div>
    {open && <div className="space-y-4">
      <fieldset><legend className="font-semibold text-sm">School days</legend><div className="flex flex-wrap gap-3">{DAYS.map(day => <label key={day} className="text-sm"><input type="checkbox" checked={settings.days.includes(day)} onChange={event => setSettings({ ...settings, days: event.target.checked ? [...settings.days, day].sort((a, b) => DAYS.indexOf(a) - DAYS.indexOf(b)) : settings.days.filter(d => d !== day) })} /> {day}</label>)}</div></fieldset>
      <div><h3 className="font-semibold text-sm">Periods and breaks</h3><p className="text-xs text-slate-500">Gaps between periods are breaks.</p><div className="flex flex-wrap gap-2">{settings.periods.map((period, index) => <div key={index} className="flex items-center gap-1"><label className="text-xs">Period {index + 1} <input type="time" aria-label={`Period ${index + 1} start`} value={period.startTime} onChange={event => setSettings({ ...settings, periods: settings.periods.map((p, i) => i === index ? { ...p, startTime: event.target.value } : p) })} className="border rounded p-1" /></label><span>–</span><input type="time" aria-label={`Period ${index + 1} end`} value={period.endTime} onChange={event => setSettings({ ...settings, periods: settings.periods.map((p, i) => i === index ? { ...p, endTime: event.target.value } : p) })} className="border rounded p-1" /><button type="button" aria-label={`Remove period ${index + 1}`} onClick={() => setSettings({ ...settings, periods: settings.periods.filter((_, i) => i !== index) })}>×</button></div>)}</div><button type="button" className="mt-2 rounded border px-2 py-1 text-sm" onClick={() => { const last = settings.periods[settings.periods.length - 1]?.endTime || '08:00'; const end = `${String(Math.min(23, Number(last.slice(0, 2)) + 1)).padStart(2, '0')}:${last.slice(3)}`; setSettings({ ...settings, periods: [...settings.periods, { startTime: last, endTime: end }] }); }}>Add period</button></div>
      {selectedClass && <div><h3 className="font-semibold text-sm">Weekly subject targets</h3><div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">{classSubjects.map(subject => { const target = settings.targets.find(t => t.classId === selectedClass && t.subjectId === subject._id); return <label key={subject._id} className="text-sm flex items-center gap-2">{subject.name}<input type="number" min="0" max="30" aria-label={`${subject.name} periods per week`} value={target?.weeklyPeriods || 0} onChange={event => { const count = Number(event.target.value); setSettings({ ...settings, targets: [...settings.targets.filter(t => !(t.classId === selectedClass && t.subjectId === subject._id)), ...(count > 0 ? [{ classId: selectedClass, subjectId: subject._id, teacherId: id(subject.teacherId), weeklyPeriods: count }] : [])] }); }} className="w-16 border rounded p-1" /></label>; })}</div></div>}
      <div><h3 className="font-semibold text-sm">Teacher unavailable slots</h3>{settings.unavailable.map((slot, index) => <div key={index} className="flex flex-wrap gap-1 my-1"><select aria-label={`Unavailable teacher ${index + 1}`} value={slot.teacherId} onChange={event => setSettings({ ...settings, unavailable: settings.unavailable.map((s, i) => i === index ? { ...s, teacherId: event.target.value } : s) })} className="border rounded p-1"><option value="">Teacher</option>{teachers.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}</select><select aria-label={`Unavailable day ${index + 1}`} value={slot.dayOfWeek} onChange={event => setSettings({ ...settings, unavailable: settings.unavailable.map((s, i) => i === index ? { ...s, dayOfWeek: event.target.value } : s) })} className="border rounded p-1">{settings.days.map(day => <option key={day}>{day}</option>)}</select><input type="time" aria-label={`Unavailable start ${index + 1}`} value={slot.startTime} onChange={event => setSettings({ ...settings, unavailable: settings.unavailable.map((s, i) => i === index ? { ...s, startTime: event.target.value } : s) })} className="border rounded p-1" /><input type="time" aria-label={`Unavailable end ${index + 1}`} value={slot.endTime} onChange={event => setSettings({ ...settings, unavailable: settings.unavailable.map((s, i) => i === index ? { ...s, endTime: event.target.value } : s) })} className="border rounded p-1" /><button type="button" aria-label={`Remove unavailable slot ${index + 1}`} onClick={() => setSettings({ ...settings, unavailable: settings.unavailable.filter((_, i) => i !== index) })}>×</button></div>)}<button type="button" className="rounded border px-2 py-1 text-sm" onClick={() => setSettings({ ...settings, unavailable: [...settings.unavailable, { teacherId: teachers[0]?._id || '', dayOfWeek: settings.days[0] || 'Monday', startTime: '08:00', endTime: '09:00' }] })}>Add unavailable slot</button></div>
      <button type="button" disabled={busy} onClick={save} className="rounded bg-[#1d3568] px-3 py-2 text-white disabled:opacity-50">Save rules</button>
    </div>}
    <button type="button" disabled={!selectedClass || busy} onClick={generate} className="rounded bg-[#235b88] px-3 py-2 text-white disabled:opacity-50">Generate draft for selected class</button>
    {draft && <div className="rounded border p-3" aria-live="polite"><h3 className="font-semibold">Draft for {draft.academicYear}: {draft.entries.length} periods</h3>{draft.unmet.length > 0 && <p className="text-red-700 text-sm">Unmet targets: {draft.unmet.map(item => `${subjects.find(s => s._id === item.subjectId)?.name || 'Subject'} (${item.remaining})`).join(', ')}</p>}<div className="max-h-48 overflow-auto"><ul className="text-sm list-disc pl-5">{draft.entries.map((entry, index) => <li key={index}>{entry.dayOfWeek} {entry.startTime}–{entry.endTime}: {subjects.find(s => s._id === entry.subjectId)?.name || 'Subject'} — {teachers.find(t => t._id === entry.teacherId)?.name || 'Teacher'}</li>)}</ul></div><button type="button" disabled={busy || draft.unmet.length > 0} onClick={publish} className="mt-2 rounded bg-emerald-700 px-3 py-2 text-white disabled:opacity-50">Publish reviewed draft</button></div>}
  </section>;
}
