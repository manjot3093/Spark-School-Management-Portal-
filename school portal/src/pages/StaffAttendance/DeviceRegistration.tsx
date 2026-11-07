import { useCallback, useEffect, useState } from 'react';
import { staffAttendanceAPI, StaffDeviceRow } from '../../services/staffAttendanceAPI';

export default function DeviceRegistration() {
  const [staff, setStaff] = useState<StaffDeviceRow[]>([]);
  const [userId, setUserId] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    try { setStaff(await staffAttendanceAPI.getDevices()); setError(''); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not load staff devices.'); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const register = async () => {
    setBusy(true); setMessage('');
    try {
      const result = await staffAttendanceAPI.registerDevice(userId, code.trim());
      setMessage(result.message); setCode(''); await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not register device.'); }
    finally { setBusy(false); }
  };
  const remove = async (id: string) => {
    setBusy(true); setMessage('');
    try { const result = await staffAttendanceAPI.removeDevice(id); setMessage(result.message); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not remove device.'); }
    finally { setBusy(false); }
  };

  return <section className="staff-device-panel" aria-label="Register staff devices">
    <h2>Registered devices</h2>
    <p>Ask an employee to open “My attendance” on their device, then enter the code shown there. Each employee can have one registered device.</p>
    <div className="staff-device-form">
      <label>Employee
        <select value={userId} onChange={(e) => setUserId(e.target.value)}>
          <option value="">Choose an employee</option>
          {staff.filter((person) => !person.isDemo).map((person) =>
            <option key={person.id} value={person.id}>{person.name} · {person.role}</option>)}
        </select>
      </label>
      <label>Device code
        <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Code shown on employee device" autoComplete="off" />
      </label>
      <button disabled={busy || !userId || !/^[A-Za-z0-9-]{8,64}$/.test(code.trim())} onClick={register}>Register device</button>
    </div>
    {error && <p role="alert" className="staff-device-error">{error}</p>}
    {message && <p role="status" className="staff-device-success">{message}</p>}
    <div className="staff-device-list">
      {staff.filter((person) => person.registered).map((person) => <div key={person.id} className="staff-device-row">
        <div><strong>{person.name}</strong><span>{person.role} {person.isDemo ? '· demo device' : '· registered device'}</span></div>
        <code>{person.deviceId}</code>
        {!person.isDemo && <button disabled={busy} onClick={() => remove(person.id)}>Remove</button>}
      </div>)}
      {staff.every((person) => !person.registered) && <p>No devices registered yet.</p>}
    </div>
  </section>;
}
