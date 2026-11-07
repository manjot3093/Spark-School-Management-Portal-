import React, { useCallback, useEffect, useState } from 'react';
import { MapPin, Save, Crosshair, ExternalLink, Users, Clock, AlertCircle, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { staffAttendanceAPI, AttendanceSettings, DailyLog } from '../../services/staffAttendanceAPI';
import AttendanceMapView from './AttendanceMapView';
import DeviceRegistration from './DeviceRegistration';

const EMPTY: AttendanceSettings = {
  enabled: false, timezone: 'Asia/Kolkata',
  geofence: { latitude: null, longitude: null, radiusMeters: 100, maxAccuracyMeters: 100 },
  requireSelfie: true, shiftStart: '09:00', graceMinutes: 10, halfDayMinHours: 4,
};

const statusStyle: Record<string, string> = {
  present: 'bg-green-100 text-green-700',
  late: 'bg-amber-100 text-amber-700',
  'half-day': 'bg-orange-100 text-orange-700',
  absent: 'bg-red-100 text-red-700',
  excused: 'bg-blue-100 text-blue-700',
};

const dateOffset = (key: string, days: number) => {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
};

const StaffAttendanceAdmin: React.FC = () => {
  const [tab, setTab] = useState<'log' | 'map' | 'settings' | 'devices'>('map');

  // ---------- settings ----------
  const [s, setS] = useState<AttendanceSettings>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locationAccuracy, setLocationAccuracy] = useState<number | null>(null);

  useEffect(() => {
    staffAttendanceAPI.getSettings().then(setS).catch((e) => toast.error(e.message));
  }, []);

  const setGeo = (patch: Partial<AttendanceSettings['geofence']>) => setS((p) => ({ ...p, geofence: { ...p.geofence, ...patch } }));

  const useMyLocation = () => {
    if (!window.isSecureContext) return toast.error('Open the portal over HTTPS to capture the school location.');
    if (!navigator.geolocation) return toast.error('Location is not supported in this browser.');
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setGeo({ latitude: +p.coords.latitude.toFixed(6), longitude: +p.coords.longitude.toFixed(6) });
        setLocationAccuracy(p.coords.accuracy);
        toast.success(`Location captured (±${Math.round(p.coords.accuracy)} m). Stand at the centre of the campus for best results.`);
        setLocating(false);
      },
      () => { toast.error('Could not get location. Allow location permission.'); setLocating(false); },
      { enableHighAccuracy: true, timeout: 20000 }
    );
  };

  const save = async () => {
    setSaving(true);
    try { await staffAttendanceAPI.saveSettings(s); toast.success('Settings saved'); }
    catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  // ---------- log ----------
  const [date, setDate] = useState('');
  const [todayKey, setTodayKey] = useState('');
  const [log, setLog] = useState<DailyLog | null>(null);
  const [loadingLog, setLoadingLog] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const loadLog = useCallback(async (d?: string) => {
    setLoadingLog(true);
    try { const r = await staffAttendanceAPI.getLog(d); setLog(r); if (!d) { setDate(r.date); setTodayKey(r.date); } }
    catch (e: any) { toast.error(e.message); }
    finally { setLoadingLog(false); }
  }, []);
  useEffect(() => { loadLog(); }, [loadLog]);

  const t = (iso: string | null) =>
    iso ? new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone: log?.timezone }) : '—';

  const hasLoc = s.geofence.latitude != null && s.geofence.longitude != null;

  return (
    <div className="staff-attendance-page space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Staff attendance</h1>
        <p className="text-gray-600">Staff check in from inside the campus with live location and a selfie.</p>
      </div>

      <div className="flex gap-2 border-b">
        {(['map', 'log', 'devices', 'settings'] as const).map((k) => (
          <button key={k} onClick={() => setTab(k)}
            aria-pressed={tab === k}
            className={`px-4 py-2 -mb-px border-b-2 font-medium ${tab === k ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'}`}>
            {k === 'map' ? 'Campus map' : k === 'log' ? 'Daily log' : k === 'devices' ? 'Devices' : 'Campus & rules'}
          </button>
        ))}
      </div>

      {tab === 'map' && <AttendanceMapView />}
      {tab === 'devices' && <DeviceRegistration />}

      {tab === 'log' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <input type="date" aria-label="Attendance date" value={date} onChange={(e) => { setDate(e.target.value); loadLog(e.target.value); }}
              className="border rounded-lg px-3 py-2" />
            <button onClick={() => loadLog(date)} className="px-3 py-2 border rounded-lg">Refresh</button>
            <span className="text-sm text-gray-500">Staff link: <code className="bg-gray-100 px-1.5 py-0.5 rounded">{window.location.origin}/staff-checkin</code></span>
          </div>
          {todayKey && <div className="flex flex-wrap gap-2" role="group" aria-label="Demo log dates">
            {[[0, 'Today'], [-1, 'Yesterday'], [-2, '2 days ago'], [-3, '3 days ago']].map(([offset, label]) => {
              const key = dateOffset(todayKey, Number(offset));
              return <button key={key} type="button" onClick={() => { setDate(key); loadLog(key); }}
                aria-pressed={date === key}
                className={`px-3 py-1.5 rounded-lg border text-sm font-semibold ${date === key ? 'bg-blue-800 text-white border-blue-800' : 'bg-white text-blue-800 border-blue-200'}`}>{label}</button>;
            })}
          </div>}

          {log && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                ['Present', log.summary.present, 'text-green-600'],
                ['Late', log.summary.late, 'text-amber-600'],
                ['Half-day', log.summary.halfDay, 'text-orange-600'],
                ['Not marked', log.summary.notMarked, 'text-red-600'],
              ].map(([l, v, c]) => (
                <div key={l as string} className="bg-white border rounded-xl p-4">
                  <p className="text-sm text-gray-500">{l}</p>
                  <p className={`text-3xl font-bold ${c}`}>{v as number}</p>
                </div>
              ))}
            </div>
          )}

          <div className="bg-white border rounded-xl overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-gray-600">
                <tr>
                  <th className="p-3">Staff</th><th className="p-3">Status</th><th className="p-3">In</th><th className="p-3">Out</th>
                  <th className="p-3">Selfie in / out</th><th className="p-3">Distance</th><th className="p-3">Flags</th>
                </tr>
              </thead>
              <tbody>
                {loadingLog && <tr><td colSpan={7} className="p-6 text-center text-gray-500">Loading…</td></tr>}
                {!loadingLog && log?.rows.length === 0 && <tr><td colSpan={7} className="p-6 text-center text-gray-500">No attendance recorded for this date.</td></tr>}
                {log?.rows.map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="p-3">
                      <div className="font-medium">{r.staff?.name || '—'} {r.isDemo && <span className="ml-1 text-xs text-blue-700">Demo</span>}</div>
                      <div className="text-xs text-gray-500 capitalize">{r.staff?.role}</div>
                    </td>
                    <td className="p-3"><span className={`px-2 py-0.5 rounded-full text-xs capitalize ${statusStyle[r.status] || ''}`}>{r.status}</span>
                      {r.isDemo ? <span className="ml-1 text-xs text-gray-500">sample</span> : r.source === 'manual' && <span className="ml-1 text-xs text-gray-400">manual</span>}</td>
                    <td className="p-3">{t(r.checkInTime)}</td>
                    <td className="p-3">{t(r.checkOutTime)}</td>
                    <td className="p-3">
                      <div className="flex gap-1">
                        {r.selfieInThumb && <button aria-label={`View ${r.staff?.name || 'employee'} check-in selfie`} onClick={() => setPreview(r.selfieInFull)}><img src={r.selfieInThumb} className="w-10 h-10 rounded object-cover" alt="" /></button>}
                        {r.selfieOutThumb && <button aria-label={`View ${r.staff?.name || 'employee'} check-out selfie`} onClick={() => setPreview(r.selfieOutFull)}><img src={r.selfieOutThumb} className="w-10 h-10 rounded object-cover" alt="" /></button>}
                      </div>
                    </td>
                    <td className="p-3">
                      {r.distanceIn != null ? `${r.distanceIn} m` : '—'}
                      {r.mapIn && <a href={r.mapIn} target="_blank" rel="noreferrer" className="ml-1 text-blue-600 inline-block align-middle"><ExternalLink size={14} /></a>}
                    </td>
                    <td className="p-3">{r.flags.map((f) => (
                      <span key={f} className="inline-flex items-center gap-1 text-xs bg-red-50 text-red-700 px-1.5 py-0.5 rounded">
                        <AlertCircle size={12} />{f === 'new_device' ? 'new device' : f}
                      </span>))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {log && log.notMarked.length > 0 && (
            <div className="bg-white border rounded-xl p-4">
              <p className="font-medium flex items-center gap-2 mb-2"><Users size={16} /> Not marked yet ({log.notMarked.length})</p>
              <div className="flex flex-wrap gap-2">
                {log.notMarked.map((u) => <span key={u._id} className="bg-gray-100 rounded-full px-3 py-1 text-sm">{u.name}</span>)}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'settings' && (
        <div className="bg-white border rounded-xl p-5 space-y-5 max-w-2xl">
          <label className="flex items-center gap-3">
            <input type="checkbox" checked={s.enabled} onChange={(e) => setS({ ...s, enabled: e.target.checked })} className="w-5 h-5" />
            <span className="font-medium">Enable location + selfie attendance</span>
          </label>

          <div>
            <p className="font-medium flex items-center gap-2 mb-2"><MapPin size={16} /> School campus centre</p>
            <p className="text-sm text-gray-600">Use this laptop at the school campus to capture its location. Review the coordinates and accuracy before saving.</p>
            {hasLoc && <p className="mt-2 text-sm font-medium">{s.geofence.latitude}, {s.geofence.longitude}
              {locationAccuracy != null && ` · Accuracy ±${Math.round(locationAccuracy)} m`}</p>}
            <div className="flex gap-2 mt-2">
              <button onClick={useMyLocation} disabled={locating} className="px-3 py-2 border rounded-lg flex items-center gap-2">
                <Crosshair size={16} /> {locating ? 'Locating…' : 'Use my current location'}
              </button>
              {hasLoc && (
                <a className="px-3 py-2 border rounded-lg flex items-center gap-2 text-blue-600" target="_blank" rel="noreferrer"
                  href={`https://www.google.com/maps?q=${s.geofence.latitude},${s.geofence.longitude}`}><ExternalLink size={16} /> Verify on map</a>
              )}
            </div>
            {locationAccuracy != null && locationAccuracy > s.geofence.maxAccuracyMeters && <p role="alert" className="text-sm text-amber-700 mt-2">This fix is less accurate than the allowed limit. Move near a window and capture again.</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm">Allowed radius (metres)
              <input type="number" min={20} max={2000} value={s.geofence.radiusMeters}
                onChange={(e) => setGeo({ radiusMeters: Number(e.target.value) })} className="mt-1 w-full border rounded-lg px-3 py-2" />
            </label>
            <label className="text-sm">Reject GPS worse than (metres)
              <input type="number" min={10} max={500} value={s.geofence.maxAccuracyMeters}
                onChange={(e) => setGeo({ maxAccuracyMeters: Number(e.target.value) })} className="mt-1 w-full border rounded-lg px-3 py-2" />
            </label>
          </div>

          <div>
            <p className="font-medium flex items-center gap-2 mb-2"><Clock size={16} /> Timing rules</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <label className="text-sm">Shift starts
                <input type="time" value={s.shiftStart} onChange={(e) => setS({ ...s, shiftStart: e.target.value })} className="mt-1 w-full border rounded-lg px-3 py-2" />
              </label>
              <label className="text-sm">Grace (min)
                <input type="number" min={0} max={180} value={s.graceMinutes} onChange={(e) => setS({ ...s, graceMinutes: Number(e.target.value) })} className="mt-1 w-full border rounded-lg px-3 py-2" />
              </label>
              <label className="text-sm">Half-day if &lt; hours
                <input type="number" min={0} max={12} step={0.5} value={s.halfDayMinHours} onChange={(e) => setS({ ...s, halfDayMinHours: Number(e.target.value) })} className="mt-1 w-full border rounded-lg px-3 py-2" />
              </label>
              <label className="text-sm">Timezone
                <input value={s.timezone} onChange={(e) => setS({ ...s, timezone: e.target.value })} className="mt-1 w-full border rounded-lg px-3 py-2" />
              </label>
            </div>
          </div>

          <p className="text-sm text-gray-600">A fresh selfie is required for each check in and check out. Images are removed after 90 days.</p>

          <button onClick={save} disabled={saving || (locationAccuracy != null && locationAccuracy > s.geofence.maxAccuracyMeters)} className="px-5 py-2.5 bg-blue-600 text-white rounded-lg flex items-center gap-2 disabled:opacity-50">
            <Save size={16} /> {saving ? 'Saving…' : 'Save settings'}
          </button>
        </div>
      )}

      {preview && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={() => setPreview(null)}>
          <button aria-label="Close selfie preview" onClick={() => setPreview(null)} className="absolute top-4 right-4 text-white"><X /></button>
          <img src={preview} alt="selfie" className="max-h-[85vh] max-w-[90vw] rounded-lg" />
        </div>
      )}
    </div>
  );
};

export default StaffAttendanceAdmin;
