import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { io } from 'socket.io-client';
import { AttendanceMap, staffAttendanceAPI } from '../../services/staffAttendanceAPI';
import { API_BASE_URL } from '../../services/api';

const tileUrl = import.meta.env.VITE_MAP_TILE_URL || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const tileAttribution = import.meta.env.VITE_MAP_TILE_ATTRIBUTION || '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>';

export default function AttendanceMapView() {
  const [data, setData] = useState<AttendanceMap | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [layer, setLayer] = useState<'live' | 'checked-in'>('live');
  const host = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const markers = useRef<L.LayerGroup | null>(null);
  const moveDemo = async (userId: string, position: 'inside' | 'outside') => {
    try { await staffAttendanceAPI.setDemoPosition(userId, position); setData(await staffAttendanceAPI.getMap()); setError(''); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not move the demo device.'); }
  };

  useEffect(() => {
    let active = true;
    const load = async () => {
      try { const result = await staffAttendanceAPI.getMap(); if (active) { setData(result); setError(''); setLoading(false); } }
      catch (e) { if (active) { setError(e instanceof Error ? e.message : 'Could not load the campus map.'); setLoading(false); } }
    };
    load();
    const base = API_BASE_URL.startsWith('http') ? API_BASE_URL.replace(/\/api\/?$/, '') : window.location.origin;
    const socket = io(base, { auth: { token: localStorage.getItem('school_token') }, transports: ['polling', 'websocket'] });
    socket.on('staff_presence_changed', load);
    socket.on('connect', load);
    const timer = window.setInterval(load, 30000);
    return () => { active = false; window.clearInterval(timer); socket.disconnect(); };
  }, []);

  useEffect(() => {
    if (!host.current || !data?.geofence.latitude || !data.geofence.longitude) return;
    const center: L.LatLngExpression = [data.geofence.latitude, data.geofence.longitude];
    if (!map.current) {
      map.current = L.map(host.current, { scrollWheelZoom: false }).setView(center, 17);
      L.tileLayer(tileUrl, { attribution: tileAttribution, maxZoom: 19 }).addTo(map.current);
      markers.current = L.layerGroup().addTo(map.current);
    }
    const view = map.current;
    const group = markers.current!;
    group.clearLayers();
    const boundary = L.circle(center, { radius: data.geofence.radiusMeters, color: '#235b88', fillColor: '#68a9d0', fillOpacity: 0.09, weight: 2 }).addTo(group);
    const visibleBounds = boundary.getBounds();
    const now = Date.now();
    for (const person of data.people) {
      const position = layer === 'live' ? person.livePosition : person.checkInPosition;
      if (!position || (layer === 'live' && !person.isDemo && now - new Date(position.at).getTime() > 90000)) continue;
      const point = L.circleMarker([position.latitude, position.longitude], {
        radius: 10, color: '#fff', weight: 3,
        fillColor: layer === 'live' ? (person.presence === 'present' ? '#17a57a' : '#d14835') : '#ed792f', fillOpacity: 1
      }).addTo(group);
      visibleBounds.extend([position.latitude, position.longitude]);
      const label = document.createElement('span');
      label.textContent = person.name;
      point.bindTooltip(label, { permanent: true, direction: 'top', offset: [0, -12], className: 'staff-map-name' });
      const details = document.createElement('span');
      details.textContent = `${person.name} · ${layer === 'live' ? `${person.presence}${person.isDemo ? ' (demo)' : ''}` : 'Check-in position'} · ±${Math.round(position.accuracy)} m · ${new Date(position.at).toLocaleTimeString()}`;
      point.bindPopup(details);
    }
    view.invalidateSize();
    view.fitBounds(visibleBounds.pad(0.15), { maxZoom: 17, animate: false });
  }, [data, layer]);

  useEffect(() => () => { map.current?.remove(); map.current = null; }, []);

  const liveCount = data?.people.filter((p) => p.presence !== 'offline').length || 0;
  const presentCount = data?.people.filter((p) => p.presence === 'present').length || 0;
  const absentCount = data?.people.filter((p) => p.presence === 'absent').length || 0;
  return <section className="staff-map-panel" aria-label="Campus attendance map">
    <div className="staff-map-heading">
      <div><h2>Campus map</h2><p>{presentCount} present inside · {absentCount} absent outside · {liveCount} positioned</p></div>
      <div className="staff-map-switch" role="group" aria-label="Map view">
        <button aria-pressed={layer === 'live'} onClick={() => setLayer('live')}>Live positions</button>
        <button aria-pressed={layer === 'checked-in'} onClick={() => setLayer('checked-in')}>Check-in positions</button>
      </div>
    </div>
    {error && <p role="alert" className="staff-map-error">{error}</p>}
    {loading ? <p className="staff-map-empty">Loading campus map…</p> : !data?.geofence.latitude || !data.geofence.longitude ?
      <p className="staff-map-empty">Set the campus center in Campus & rules to show the map.</p> :
      <div className="staff-map-grid"><div ref={host} className="staff-map-canvas" aria-label="Map of campus and employee positions" />
        <div className="staff-map-roster">
          {data.people.length === 0 ? <p>No devices are registered. Register a device in the Devices tab.</p> : data.people.map((person) => {
            return <div key={person.id} className="staff-map-person">
              <strong>{person.name} {person.isDemo && <small>Demo</small>}</strong>
              <span className={`staff-presence-${person.presence}`}>{person.presence === 'present' ? 'Present · inside boundary' : person.presence === 'absent' ? 'Absent · outside boundary' : 'Offline · no recent position'}</span>
              <small>{person.distanceMeters != null ? `${person.distanceMeters} m from center` : 'No location'}{person.checkInTime && ` · Checked in ${new Date(person.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone: data.timezone })}`}</small>
              {person.isDemo && <div className="staff-demo-controls"><button onClick={() => moveDemo(person.id, 'inside')}>Move inside</button><button onClick={() => moveDemo(person.id, 'outside')}>Move outside</button></div>}
            </div>;
          })}
        </div>
      </div>}
  </section>;
}
