import { API_BASE_URL } from './api';

export interface Geofence {
  latitude: number | null;
  longitude: number | null;
  radiusMeters: number;
  maxAccuracyMeters: number;
}

export interface AttendanceSettings {
  enabled: boolean;
  timezone: string;
  geofence: Geofence;
  requireSelfie: boolean;
  shiftStart: string;
  graceMinutes: number;
  halfDayMinHours: number;
}

export interface MyToday {
  schoolName: string;
  enabled: boolean;
  configured: boolean;
  geofence: Geofence | null;
  requireSelfie: boolean;
  timezone: string;
  shiftStart: string;
  dateKey: string;
  record: null | {
    status: string;
    source: string;
    checkInTime: string | null;
    checkOutTime: string | null;
    distanceIn: number | null;
  };
}

export interface LogRow {
  id: string;
  isDemo: boolean;
  staff: { _id: string; name: string; email: string; role: string } | null;
  status: string;
  source: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  distanceIn: number | null;
  distanceOut: number | null;
  accuracyIn: number | null;
  flags: string[];
  selfieInThumb: string | null;
  selfieInFull: string | null;
  selfieOutThumb: string | null;
  selfieOutFull: string | null;
  mapIn: string | null;
}

export interface DailyLog {
  date: string;
  timezone: string;
  rows: LogRow[];
  notMarked: { _id: string; name: string; email: string; role: string }[];
  summary: { present: number; late: number; halfDay: number; notMarked: number; totalStaff: number };
}

export interface MapPosition { latitude: number; longitude: number; accuracy: number; at: string }
export interface MapPerson {
  id: string; name: string; role: string; status: string | null; checkInTime: string | null;
  isDemo: boolean; presence: 'present' | 'absent' | 'offline'; distanceMeters: number | null;
  checkInPosition: MapPosition | null; livePosition: MapPosition | null;
}
export interface AttendanceMap {
  dateKey: string; timezone: string; geofence: Geofence; people: MapPerson[];
}
export interface StaffDeviceRow {
  id: string; name: string; role: string; registered: boolean;
  deviceId: string | null; isDemo: boolean; demoPosition: 'inside' | 'outside' | null;
}

export class StaffAttendanceError extends Error {
  code?: string;
  constructor(message: string, code?: string) {
    super(message);
    this.code = code;
  }
}

/** Staff log in at /teacher-login (teacher_token); librarian/accountant use the portal login (school_token). */
const staffToken = () => localStorage.getItem('teacher_token') || localStorage.getItem('school_token');
const adminToken = () => localStorage.getItem('school_token');

async function call<T>(path: string, token: string | null, init: RequestInit = {}): Promise<T> {
  const isForm = init.body instanceof FormData;
  const res = await fetch(`${API_BASE_URL}/staff-attendance${path}`, {
    ...init,
    cache: 'no-store',
    headers: {
      ...(isForm ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  let body: any = null;
  try { body = await res.json(); } catch { /* ignore */ }
  if (!res.ok || !body?.success) {
    throw new StaffAttendanceError(body?.error || `Request failed (${res.status})`, body?.code);
  }
  return body as T;
}

export const staffAttendanceAPI = {
  hasStaffToken: () => !!staffToken(),

  // ----- staff -----
  myToday: async (): Promise<MyToday> => (await call<any>('/me/today', staffToken())).data,
  myDevice: async (deviceId: string): Promise<{ registered: boolean }> =>
    (await call<{ success: boolean; data: { registered: boolean } }>(`/me/device?deviceId=${encodeURIComponent(deviceId)}`, staffToken())).data,

  punch: async (
    kind: 'check-in' | 'check-out',
    p: { latitude: number; longitude: number; accuracy: number; observedAt: string; deviceId: string; selfie?: Blob | null }
  ) => {
    const fd = new FormData();
    fd.append('latitude', String(p.latitude));
    fd.append('longitude', String(p.longitude));
    fd.append('accuracy', String(p.accuracy));
    fd.append('observedAt', p.observedAt);
    fd.append('deviceId', p.deviceId);
    if (p.selfie) fd.append('selfie', p.selfie, 'selfie.jpg');
    return call<any>(`/${kind}`, staffToken(), { method: 'POST', body: fd });
  },
  updateLivePosition: (p: { latitude: number; longitude: number; accuracy: number; observedAt: string; deviceId: string }) =>
    call<{ success: boolean }>('/me/live-position', staffToken(), { method: 'PUT', body: JSON.stringify(p) }),
  clearLivePosition: () => call<{ success: boolean }>('/me/live-position', staffToken(), { method: 'DELETE' }),

  // ----- principal / admin -----
  getSettings: async (): Promise<AttendanceSettings> => (await call<any>('/settings', adminToken())).data,
  saveSettings: async (s: AttendanceSettings) =>
    call<any>('/settings', adminToken(), { method: 'PUT', body: JSON.stringify(s) }),
  getLog: async (date?: string): Promise<DailyLog> =>
    (await call<any>(`/log${date ? `?date=${encodeURIComponent(date)}` : ''}`, adminToken())).data,
  getMap: async (): Promise<AttendanceMap> => (await call<{ success: boolean; data: AttendanceMap }>('/map', adminToken())).data,
  getDevices: async (): Promise<StaffDeviceRow[]> =>
    (await call<{ success: boolean; data: StaffDeviceRow[] }>('/devices', adminToken())).data,
  registerDevice: (userId: string, deviceId: string) =>
    call<{ success: boolean; message: string }>('/devices', adminToken(), { method: 'POST', body: JSON.stringify({ userId, deviceId }) }),
  removeDevice: (userId: string) =>
    call<{ success: boolean; message: string }>(`/devices/${encodeURIComponent(userId)}`, adminToken(), { method: 'DELETE' }),
  setDemoPosition: (userId: string, position: 'inside' | 'outside') =>
    call<{ success: boolean; message: string }>('/demo-position', adminToken(), { method: 'POST', body: JSON.stringify({ userId, position }) }),
};
