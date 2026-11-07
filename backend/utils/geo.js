// Geo + school-timezone helpers for staff attendance.
const EARTH_RADIUS_M = 6371000;
const toRad = (d) => (d * Math.PI) / 180;

/** Great-circle distance in metres between two lat/lng points (Haversine). */
function haversineMeters(lat1, lon1, lat2, lon2) {
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(a)));
}

function isValidCoord(lat, lng) {
  return (
    Number.isFinite(lat) && Number.isFinite(lng) &&
    lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180 &&
    !(lat === 0 && lng === 0) // classic "no fix" value
  );
}

function isValidTimezone(tz) {
  try { new Intl.DateTimeFormat('en-US', { timeZone: tz }); return true; } catch { return false; }
}

function zonedParts(tz, date) {
  const p = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  }).formatToParts(date).reduce((a, x) => { a[x.type] = x.value; return a; }, {});
  return {
    y: +p.year, m: +p.month, d: +p.day,
    hh: +p.hour, mm: +p.minute, ss: +p.second
  };
}

/** Local "school day" in the given timezone: { dateKey:'YYYY-MM-DD', start, end, minutesOfDay } */
function schoolDay(tz, now = new Date()) {
  const p = zonedParts(tz, now);
  const pad = (n) => String(n).padStart(2, '0');
  const dateKey = `${p.y}-${pad(p.m)}-${pad(p.d)}`;
  const { start, end } = dayRangeFromKey(tz, dateKey);
  return {
    dateKey, start, end,
    minutesOfDay: p.hh * 60 + p.mm
  };
}

/** Day range for an explicit 'YYYY-MM-DD' in tz. */
function dayRangeFromKey(tz, dateKey) {
  const [y, m, d] = dateKey.split('-').map(Number);
  const zonedMidnight = (year, month, day) => {
    const target = Date.UTC(year, month - 1, day);
    let instant = target;
    for (let i = 0; i < 3; i++) {
      const p = zonedParts(tz, new Date(instant));
      const rendered = Date.UTC(p.y, p.m - 1, p.d, p.hh, p.mm, p.ss);
      instant -= rendered - target;
    }
    return instant;
  };
  return {
    dateKey,
    start: new Date(zonedMidnight(y, m, d)),
    end: new Date(zonedMidnight(y, m, d + 1) - 1)
  };
}

const hhmmToMinutes = (s) => {
  const [h, m] = String(s).split(':').map(Number);
  return h * 60 + m;
};

module.exports = {
  haversineMeters, isValidCoord, isValidTimezone,
  schoolDay, dayRangeFromKey, hhmmToMinutes
};
