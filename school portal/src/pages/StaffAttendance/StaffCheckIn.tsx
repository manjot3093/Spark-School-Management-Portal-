import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../../config/firebase';
import { Camera, MapPin, LogIn, LogOut, RefreshCw, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { staffAttendanceAPI, MyToday, StaffAttendanceError } from '../../services/staffAttendanceAPI';

/* UX-only distance estimate. The server recomputes everything and is the only authority. */
const toRad = (d: number) => (d * Math.PI) / 180;
const distanceM = (a: number, b: number, c: number, d: number) => {
  const dLat = toRad(c - a), dLon = toRad(d - b);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a)) * Math.cos(toRad(c)) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.min(1, Math.sqrt(x)));
};

const getDeviceId = () => {
  let id = localStorage.getItem('staff_device_id');
  if (!id) {
    id = (crypto as any).randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2);
    localStorage.setItem('staff_device_id', id);
  }
  return id;
};

type Fix = { latitude: number; longitude: number; accuracy: number; observedAt: string };

const StaffCheckIn: React.FC = () => {
  const navigate = useNavigate();
  const [info, setInfo] = useState<MyToday | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [registered, setRegistered] = useState(false);
  const [deviceError, setDeviceError] = useState('');
  const [fix, setFix] = useState<Fix | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [camOn, setCamOn] = useState(false);
  const [camError, setCamError] = useState<string | null>(null);
  const [shot, setShot] = useState<{ blob: Blob; url: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(new Date());

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const load = useCallback(async () => {
    try {
      setInfo(await staffAttendanceAPI.myToday()); setLoadError('');
    } catch (e: any) {
      setLoadError(e.message || 'Could not load attendance');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  const refreshDevice = useCallback(async () => {
    try { const result = await staffAttendanceAPI.myDevice(getDeviceId()); setRegistered(result.registered); setDeviceError(''); }
    catch (error) { setDeviceError(error instanceof Error ? error.message : 'Could not check device registration.'); }
  }, []);
  useEffect(() => { refreshDevice(); }, [refreshDevice]);
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);

  // live GPS
  useEffect(() => {
    if (!navigator.geolocation) { setGeoError('This browser does not support location.'); return; }
    const id = navigator.geolocation.watchPosition(
      (p) => { setGeoError(null); setFix({ latitude: p.coords.latitude, longitude: p.coords.longitude, accuracy: p.coords.accuracy, observedAt: new Date(p.timestamp).toISOString() }); },
      (err) => { setFix(null); setGeoError(err.code === 1 ? 'Location permission denied. Allow location for this site and reload.' : 'Unable to get your location. Check GPS and try again.'); },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 }
    );
    return () => navigator.geolocation.clearWatch(id);
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCamOn(false);
  }, []);
  useEffect(() => stopCamera, [stopCamera]);

  const startCamera = async () => {
    setCamError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 640 } }, audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
      setCamOn(true);
    } catch {
      setCamError('Camera access is needed for the selfie. Allow camera permission and try again.');
    }
  };

  const capture = () => {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return;
    const size = 640;
    const scale = Math.min(1, size / Math.max(v.videoWidth, v.videoHeight));
    const c = document.createElement('canvas');
    c.width = Math.round(v.videoWidth * scale);
    c.height = Math.round(v.videoHeight * scale);
    c.getContext('2d')!.drawImage(v, 0, 0, c.width, c.height);
    c.toBlob((b) => {
      if (!b) return;
      if (shot) URL.revokeObjectURL(shot.url);
      setShot({ blob: b, url: URL.createObjectURL(b) });
      stopCamera();
    }, 'image/jpeg', 0.7);
  };

  const retake = () => { if (shot) URL.revokeObjectURL(shot.url); setShot(null); startCamera(); };

  const rec = info?.record;
  const mode: 'check-in' | 'check-out' | 'done' = !rec?.checkInTime ? 'check-in' : !rec.checkOutTime ? 'check-out' : 'done';
  const manualConflict = !!rec && rec.source !== 'geo-selfie';

  useEffect(() => {
    if (!registered || !info?.enabled || !info.configured) return;
    let active = true;
    const publish = () => {
      if (document.hidden || !navigator.geolocation) return;
      navigator.geolocation.getCurrentPosition((p) => {
        if (!active) return;
        staffAttendanceAPI.updateLivePosition({ latitude: p.coords.latitude, longitude: p.coords.longitude,
          accuracy: p.coords.accuracy, observedAt: new Date(p.timestamp).toISOString(), deviceId: getDeviceId() }).catch(() => {});
      }, () => { staffAttendanceAPI.clearLivePosition().catch(() => {}); }, { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 });
    };
    publish();
    const timer = window.setInterval(publish, 30000);
    const onVisibility = () => { if (document.hidden) staffAttendanceAPI.clearLivePosition().catch(() => {}); else publish(); };
    document.addEventListener('visibilitychange', onVisibility);
    return () => { active = false; window.clearInterval(timer); document.removeEventListener('visibilitychange', onVisibility);
      staffAttendanceAPI.clearLivePosition().catch(() => {}); };
  }, [registered, info?.enabled, info?.configured]);

  const dist = fix && info?.geofence?.latitude != null
    ? distanceM(fix.latitude, fix.longitude, info.geofence.latitude, info.geofence.longitude as number) : null;
  const radius = info?.geofence?.radiusMeters ?? 0;
  const inside = dist !== null && dist <= radius;
  const accOk = fix && info?.geofence ? fix.accuracy <= info.geofence.maxAccuracyMeters : false;
  const needSelfie = !!info?.requireSelfie;
  const canSubmit = registered && !!fix && inside && accOk && !!shot && mode !== 'done' && !manualConflict && !busy;

  const submit = async () => {
    if (!fix || mode === 'done' || !shot) return;
    setBusy(true);
    try {
      const current = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 }));
      const r = await staffAttendanceAPI.punch(mode, { latitude: current.coords.latitude, longitude: current.coords.longitude,
        accuracy: current.coords.accuracy, observedAt: new Date(current.timestamp).toISOString(),
        deviceId: getDeviceId(), selfie: shot.blob });
      toast.success(r.message || 'Done');
      if (shot) URL.revokeObjectURL(shot.url);
      setShot(null);
      await load();
    } catch (e) {
      const err = e as StaffAttendanceError;
      toast.error(err.message || 'Failed');
    } finally {
      setBusy(false);
    }
  };

  const fmt = (iso: string | null | undefined) =>
    iso ? new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone: info?.timezone }) : '—';

  if (!staffAttendanceAPI.hasStaffToken()) return <Navigate to="/teacher-login" replace />;
  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;
  if (loadError) return <div className="min-h-screen grid place-items-center p-5"><div role="alert" className="bg-white rounded-xl p-6 max-w-md"><p>{loadError}</p><button onClick={load} className="mt-3 text-blue-700">Try again</button></div></div>;

  return (
    <div className="staff-checkin-page min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-md mx-auto space-y-4">
        <div className="flex justify-end"><button className="text-sm text-blue-800 underline" onClick={async () => {
          await staffAttendanceAPI.clearLivePosition().catch(() => {});
          localStorage.removeItem('teacher_token'); localStorage.removeItem('school_token');
          await signOut(auth).catch(() => {}); navigate('/teacher-login', { replace: true });
        }}>Sign out</button></div>
        <div className="bg-white rounded-2xl shadow p-5 text-center">
          <p className="text-sm text-gray-500">{info?.schoolName}</p>
          <p className="text-4xl font-bold text-gray-900 mt-1">
            {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: info?.timezone })}
          </p>
          <p className="text-sm text-gray-500">{info?.dateKey} · shift starts {info?.shiftStart}</p>
        </div>

        <div className="bg-white rounded-xl border p-4 text-sm">
          <p className="font-semibold text-gray-900">This device: {registered ? 'Registered' : 'Awaiting admin registration'}</p>
          <p className="mt-1 text-gray-600">Give this code to your school admin:</p>
          <code className="block break-all mt-1 font-semibold select-all">{getDeviceId()}</code>
          {deviceError && <p role="alert" className="text-red-700 mt-2">{deviceError}</p>}
          <button onClick={refreshDevice} className="mt-2 text-blue-700 underline">Refresh registration</button>
        </div>

        {!info?.enabled && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-4 text-sm">
            Location and selfie attendance is not enabled for your school yet.
          </div>
        )}
        {info?.enabled && !info.configured && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-4 text-sm">
            The school location has not been set. Please ask the principal.
          </div>
        )}

        {info?.enabled && info.configured && (
          <>
            {manualConflict && <div role="alert" className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-4">Attendance was marked manually today. Ask your school admin to resolve it.</div>}
            {/* location card */}
            <div className={`rounded-2xl p-4 border ${inside && accOk ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'}`}>
              <div className="flex items-center gap-2 font-medium">
                <MapPin className={inside && accOk ? 'text-green-600' : 'text-gray-500'} size={18} />
                {geoError ? <span className="text-red-600">{geoError}</span>
                  : !fix ? <span className="text-gray-600">Getting your location…</span>
                  : inside && accOk ? <span className="text-green-700">Inside campus · present on live map</span>
                  : <span className="text-red-700">Outside campus · absent on live map</span>}
              </div>
              {fix && dist !== null && (
                <p className="text-sm text-gray-600 mt-1">
                  ~{Math.round(dist)} m from school (allowed {radius} m) · GPS accuracy ±{Math.round(fix.accuracy)} m
                  {!accOk && <span className="text-amber-700"> — accuracy too low, move near a window</span>}
                </p>
              )}
            </div>

            {/* selfie card */}
            {needSelfie && mode !== 'done' && (
              <div className="bg-white rounded-2xl shadow p-4">
                <div className="aspect-square bg-gray-900 rounded-xl overflow-hidden relative">
                  <video ref={videoRef} playsInline muted
                    className={`w-full h-full object-cover ${camOn ? '' : 'hidden'}`} style={{ transform: 'scaleX(-1)' }} />
                  {shot && <img src={shot.url} alt="Your selfie" className="w-full h-full object-cover" style={{ transform: 'scaleX(-1)' }} />}
                  {!camOn && !shot && (
                    <div className="absolute inset-0 flex items-center justify-center text-gray-400"><Camera size={48} /></div>
                  )}
                </div>
                {camError && <p className="text-sm text-red-600 mt-2">{camError}</p>}
                <div className="mt-3 flex gap-2">
                  {!camOn && !shot && (
                    <button onClick={startCamera} className="flex-1 bg-gray-900 text-white rounded-lg py-2.5 flex items-center justify-center gap-2">
                      <Camera size={18} /> Open camera
                    </button>
                  )}
                  {camOn && (
                    <button onClick={capture} className="flex-1 bg-blue-600 text-white rounded-lg py-2.5">Take selfie</button>
                  )}
                  {shot && (
                    <button onClick={retake} className="flex-1 border border-gray-300 rounded-lg py-2.5 flex items-center justify-center gap-2">
                      <RefreshCw size={16} /> Retake
                    </button>
                  )}
                </div>
              </div>
            )}

            {mode !== 'done' ? (
              <button
                disabled={!canSubmit}
                onClick={submit}
                className={`w-full rounded-2xl py-4 text-lg font-semibold flex items-center justify-center gap-2 text-white transition
                  ${canSubmit ? (mode === 'check-in' ? 'bg-green-600 hover:bg-green-700' : 'bg-orange-600 hover:bg-orange-700') : 'bg-gray-300 cursor-not-allowed'}`}
              >
                {busy ? <Loader2 className="animate-spin" /> : mode === 'check-in' ? <LogIn /> : <LogOut />}
                {mode === 'check-in' ? 'Check in' : 'Check out'}
              </button>
            ) : (
              <div className="bg-green-50 border border-green-200 rounded-2xl p-4 text-green-800 flex items-center gap-2">
                <CheckCircle2 /> You have completed attendance for today.
              </div>
            )}

            {rec && (
              <div className="bg-white rounded-2xl shadow p-4 text-sm text-gray-700 space-y-1">
                <div className="flex justify-between"><span>Status</span><b className="capitalize">{rec.status}</b></div>
                <div className="flex justify-between"><span>Check-in</span><b>{fmt(rec.checkInTime)}</b></div>
                <div className="flex justify-between"><span>Check-out</span><b>{fmt(rec.checkOutTime)}</b></div>
              </div>
            )}

            <p className="text-xs text-gray-500 flex gap-1.5">
              <AlertTriangle size={14} className="shrink-0 mt-0.5" />
              Your selfie and check-in position are saved with attendance. While this page stays open on a registered device, your recent location is shared with school administration. Selfies are removed after 90 days.
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default StaffCheckIn;
