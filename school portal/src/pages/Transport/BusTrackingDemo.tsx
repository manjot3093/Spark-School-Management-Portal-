import { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

type Stop = { name: string; latitude?: number; longitude?: number };
type Route = { _id: string; name: string; routeNumber: string; status: string; stops?: Stop[] };
type Vehicle = { _id: string; vehicleNumber: string; status: string; routeId?: { _id?: string } | string };

const tileUrl = import.meta.env.VITE_MAP_TILE_URL || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const tileAttribution = import.meta.env.VITE_MAP_TILE_ATTRIBUTION || '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>';
const validPoint = (stop: Stop): stop is Stop & { latitude: number; longitude: number } =>
  typeof stop.latitude === 'number' && Number.isFinite(stop.latitude) && Math.abs(stop.latitude) <= 90 &&
  typeof stop.longitude === 'number' && Number.isFinite(stop.longitude) && Math.abs(stop.longitude) <= 180;
const sampleRoute: Route = {
  _id: 'demo-sample-route', name: 'Sample campus route', routeNumber: 'DEMO', status: 'active',
  stops: [
    { name: 'Sample campus', latitude: 28.6139, longitude: 77.2090 },
    { name: 'Sample library stop', latitude: 28.6181, longitude: 77.2152 },
    { name: 'Sample neighborhood stop', latitude: 28.6216, longitude: 77.2202 }
  ]
};
const sampleRoutes = [sampleRoute];

export default function BusTrackingDemo({ routes, vehicles }: { routes: Route[]; vehicles: Vehicle[] }) {
  const savedRoutes = useMemo(() => routes.filter(route => route.status === 'active' && (route.stops || []).filter(validPoint).length >= 2), [routes]);
  const usingSample = savedRoutes.length === 0;
  const eligible = usingSample ? sampleRoutes : savedRoutes;
  const [routeId, setRouteId] = useState('');
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const host = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);
  const selected = eligible.find(route => route._id === routeId) || eligible[0];
  const points = (selected?.stops || []).filter(validPoint);
  const vehicle = vehicles.find(item => item.status === 'active' && (typeof item.routeId === 'string' ? item.routeId : item.routeId?._id) === selected?._id);

  useEffect(() => { if (!eligible.some(route => route._id === routeId)) setRouteId(eligible[0]?._id || ''); }, [eligible, routeId]);
  useEffect(() => { setRunning(false); setProgress(0); setUpdatedAt(null); }, [selected?._id]);
  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => {
      setProgress(value => (value + 0.02) % 1);
      setUpdatedAt(new Date());
    }, 1000);
    return () => window.clearInterval(timer);
  }, [running]);

  const segment = Math.min(Math.floor(progress * (points.length - 1)), Math.max(points.length - 2, 0));
  const fraction = progress * (points.length - 1) - segment;
  const position: L.LatLngExpression | null = points.length >= 2 ? [
    points[segment].latitude + (points[segment + 1].latitude - points[segment].latitude) * fraction,
    points[segment].longitude + (points[segment + 1].longitude - points[segment].longitude) * fraction
  ] : null;

  useEffect(() => {
    if (!host.current || !position) return;
    if (!map.current) {
      map.current = L.map(host.current, { scrollWheelZoom: false }).setView(position, 14);
      L.tileLayer(tileUrl, { attribution: tileAttribution, maxZoom: 19 }).addTo(map.current);
      layer.current = L.layerGroup().addTo(map.current);
    }
    const group = layer.current!;
    group.clearLayers();
    const path = points.map(point => [point.latitude, point.longitude] as L.LatLngTuple);
    L.polyline(path, { color: '#235b88', weight: 5 }).addTo(group);
    points.forEach(point => {
      const stop = L.circleMarker([point.latitude, point.longitude], { radius: 5, color: '#235b88', fillColor: '#fff', fillOpacity: 1 });
      stop.bindTooltip(point.name);
      stop.addTo(group);
    });
    const bus = L.circleMarker(position, { radius: 11, color: '#fff', weight: 3, fillColor: '#ee742b', fillOpacity: 1 }).addTo(group);
    const label = document.createElement('span');
    label.textContent = `Demo bus ${vehicle?.vehicleNumber || selected.routeNumber}`;
    bus.bindTooltip(label, { permanent: true, direction: 'top', offset: [0, -12] });
    map.current.invalidateSize();
    if (progress === 0) map.current.fitBounds(L.latLngBounds(path).pad(0.18), { animate: false });
  }, [selected?._id, progress, vehicle?.vehicleNumber]);
  useEffect(() => () => { map.current?.remove(); map.current = null; }, []);

  return <section className="mt-6 rounded-xl border border-blue-100 bg-[#edf3ff] p-4 sm:p-6" aria-labelledby="bus-demo-title">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><h3 id="bus-demo-title" className="text-lg font-semibold text-[#1d3568]">Bus tracking demo</h3>
        <p className="mt-1 text-sm text-slate-700">Simulated movement along saved route stops. This is not a live GPS position.</p></div>
      <strong className="rounded-full bg-[#ee742b] px-3 py-1 text-sm text-white">Demo</strong>
    </div>
    {usingSample && <p className="mt-4 rounded-lg bg-white p-4 text-sm text-slate-700">Showing a sample route near Delhi for demonstration only. Add latitude and longitude to at least two stops on an active school route to use your own route.</p>}
    <>
      <div className="mt-4 flex flex-wrap items-end gap-3">
        <label className="text-sm font-medium text-[#1d3568]">Route
          <select className="mt-1 block rounded-lg border border-slate-400 bg-white px-3 py-2" value={selected._id} onChange={event => setRouteId(event.target.value)}>
            {eligible.map(route => <option key={route._id} value={route._id}>{route.name} ({route.routeNumber})</option>)}
          </select>
        </label>
        <button className="rounded-lg bg-[#1d3568] px-4 py-2 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2" onClick={() => { setRunning(value => !value); setUpdatedAt(new Date()); }}>{running ? 'Pause demo' : 'Start demo'}</button>
        <button className="rounded-lg border border-[#1d3568] bg-white px-4 py-2 text-[#1d3568] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2" onClick={() => { setRunning(false); setProgress(0); setUpdatedAt(null); }}>Reset</button>
      </div>
      <div className="mt-4 overflow-hidden rounded-lg border border-blue-200 bg-white"><div ref={host} className="h-72 w-full sm:h-96" aria-label={`Demo map of ${selected.name}`} /></div>
      <p className="mt-3 text-sm text-slate-700" aria-live="polite">Demo {vehicle?.vehicleNumber || 'bus'} on {selected.name}. {running ? 'Simulation running.' : 'Simulation paused.'} {updatedAt ? `Updated ${updatedAt.toLocaleTimeString()}.` : 'No simulated update yet.'}</p>
    </>
  </section>;
}
