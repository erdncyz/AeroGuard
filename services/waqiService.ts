import { WAQI_BASE_URL, WAQI_TOKEN } from '../constants';
import { Iaqi, StationData, SearchResult } from '../types';
import { assertCoordinates, finiteNumber, isCalendarDate, isValidCoordinates, nonNegativeNumber } from './dataValidation';

export { isValidCoordinates } from './dataValidation';

export const getDistanceFromLatLonInKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  assertCoordinates(lat1, lon1);
  assertCoordinates(lat2, lon2);
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const a = Math.sin(radians(lat2 - lat1) / 2) ** 2 +
    Math.cos(radians(lat1)) * Math.cos(radians(lat2)) * Math.sin(radians(lon2 - lon1) / 2) ** 2;
  // Floating point error near antipodal points can otherwise make sqrt negative.
  return 6371 * 2 * Math.asin(Math.sqrt(Math.min(1, Math.max(0, a))));
};

const request = async (path: string): Promise<unknown> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(`${WAQI_BASE_URL}${path}${path.includes('?') ? '&' : '?'}token=${WAQI_TOKEN}`, { cache: 'no-store', signal: controller.signal });
    if (!response.ok) throw new Error(`WAQI request failed (${response.status})`);
    const body = await response.json();
    if (body?.status !== 'ok') throw new Error(typeof body?.data === 'string' ? body.data : 'Invalid WAQI response');
    return body.data;
  } finally {
    clearTimeout(timeout);
  }
};

const stationId = (value: unknown): number | null => {
  const id = nonNegativeNumber(value);
  return id !== null && Number.isInteger(id) && id > 0 ? id : null;
};

const validOffset = (value: unknown): string | null => {
  if (typeof value !== 'string' || !/^[+-]\d{2}:?\d{2}$/.test(value)) return null;
  const normalized = value.replace(/^([+-]\d{2})(\d{2})$/, '$1:$2');
  const hours = Number(normalized.slice(1, 3));
  const minutes = Number(normalized.slice(4, 6));
  return hours <= 14 && minutes < 60 && (hours < 14 || minutes === 0) ? normalized : null;
};

const observationTime = (time: any): { iso: string; tz: string } => {
  // WAQI's `s` is station-local. Parsing it without `tz` uses the user's timezone.
  const offset = validOffset(time?.tz);
  const local = typeof time?.s === 'string' ? time.s.replace(' ', 'T') : '';
  const timestamp = typeof time?.iso === 'string' && /(?:Z|[+-]\d{2}:?\d{2})$/i.test(time.iso)
    ? time.iso : offset ? `${local}${offset}` : '';
  const clock = timestamp.match(/T(\d{2}):(\d{2})(?::(\d{2}))?/);
  const suffix = timestamp.match(/(Z|[+-]\d{2}:?\d{2})$/i)?.[1];
  const sourceOffset = suffix?.toUpperCase() === 'Z' ? '+00:00' : validOffset(suffix);
  const instant = Date.parse(timestamp);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})$/i.test(timestamp) ||
      !isCalendarDate(timestamp.slice(0, 10)) || !clock || Number(clock[1]) > 23 || Number(clock[2]) > 59 ||
      Number(clock[3] ?? 0) > 59 || !sourceOffset || !Number.isFinite(instant) || instant > Date.now() + 5 * 60 * 1000) {
    throw new Error('Station observation time is unavailable');
  }
  return { iso: new Date(instant).toISOString(), tz: offset ?? sourceOffset };
};

const normalizeStation = (raw: any): StationData => {
  const aqi = nonNegativeNumber(raw?.aqi);
  const idx = stationId(raw?.idx);
  const lat = finiteNumber(raw?.city?.geo?.[0]);
  const lng = finiteNumber(raw?.city?.geo?.[1]);
  if (aqi === null || idx === null || !isValidCoordinates(lat, lng) || typeof raw?.city?.name !== 'string' || !raw.city.name.trim()) {
    throw new Error('Station has no valid AQI or geographic information');
  }

  const iaqi: Iaqi = {};
  for (const key of ['pm25', 'pm10', 'o3', 'no2', 'co', 'so2', 't', 'w', 'h', 'p'] as const) {
    const value = key === 't' ? finiteNumber(raw.iaqi?.[key]?.v) : nonNegativeNumber(raw.iaqi?.[key]?.v);
    if (value !== null && (key !== 'h' || value <= 100)) iaqi[key] = { v: value };
  }

  const daily: NonNullable<NonNullable<StationData['forecast']>['daily']> = {};
  for (const key of ['pm25', 'pm10', 'o3', 'uvi'] as const) {
    if (!Array.isArray(raw.forecast?.daily?.[key])) continue;
    daily[key] = raw.forecast.daily[key].flatMap((day: any) => {
      const avg = nonNegativeNumber(day?.avg);
      const min = nonNegativeNumber(day?.min);
      const max = nonNegativeNumber(day?.max);
      return isCalendarDate(day?.day) && avg !== null && min !== null && max !== null && min <= avg && avg <= max
        ? [{ day: day.day, avg, min, max }] : [];
    }).sort((a: { day: string }, b: { day: string }) => a.day.localeCompare(b.day));
  }

  return {
    aqi, idx,
    city: { name: raw.city.name.trim(), geo: [lat!, lng!], url: typeof raw.city.url === 'string' ? raw.city.url : '' },
    attributions: Array.isArray(raw.attributions) ? raw.attributions.filter((source: any) => typeof source?.name === 'string' && typeof source?.url === 'string') : [],
    dominentpol: typeof raw.dominentpol === 'string' ? raw.dominentpol : '',
    iaqi,
    time: { ...raw.time, ...observationTime(raw.time) },
    ...(Object.keys(daily).length ? { forecast: { daily } } : {}),
  };
};

export const fetchStationById = async (idx: number): Promise<StationData> => {
  if (stationId(idx) === null) throw new Error('Invalid station identifier');
  return normalizeStation(await request(`/feed/@${idx}/`));
};

export const fetchByIP = async (): Promise<StationData> => normalizeStation(await request('/feed/here/'));

export interface NearbyStation {
  uid: number;
  aqi: number;
  lat: number;
  lon: number;
  name: string;
  distance: number;
}

const stationsInBounds = async (lat: number, lng: number, span: number): Promise<NearbyStation[]> => {
  assertCoordinates(lat, lng);
  const south = Math.max(-90, lat - span);
  const north = Math.min(90, lat + span);
  const longitudeSpan = Math.min(180, span / Math.max(0.001, Math.cos(lat * Math.PI / 180)));
  const west = lng - longitudeSpan;
  const east = lng + longitudeSpan;
  const longitudeRanges = longitudeSpan === 180 ? [[-180, 180]] : west < -180
    ? [[west + 360, 180], [-180, east]] : east > 180 ? [[west, 180], [-180, east - 360]] : [[west, east]];
  const results = await Promise.all(longitudeRanges.map(([left, right]) => request(`/map/bounds/?latlng=${south},${left},${north},${right}`)));
  if (results.some(result => !Array.isArray(result))) throw new Error('Invalid station list');
  const stations = new Map<number, NearbyStation>();
  for (const raw of results.flat() as any[]) {
    const aqi = nonNegativeNumber(raw?.aqi);
    const uid = stationId(raw?.uid);
    const stationLat = finiteNumber(raw?.lat);
    const stationLng = finiteNumber(raw?.lon);
    if (aqi === null || uid === null || !isValidCoordinates(stationLat, stationLng)) continue;
    stations.set(uid, { uid, aqi, lat: stationLat!, lon: stationLng!, name: typeof raw.station?.name === 'string' ? raw.station.name : `Station #${uid}`,
      distance: getDistanceFromLatLonInKm(lat, lng, stationLat!, stationLng!) });
  }
  return [...stations.values()].sort((a, b) => a.distance - b.distance);
};

export const fetchByGeo = async (lat: number, lng: number): Promise<StationData> => {
  assertCoordinates(lat, lng);
  let candidates: NearbyStation[] = [];
  try {
    candidates = await stationsInBounds(lat, lng, 0.5);
  } catch {
    // The provider's geo feed can still work when the map endpoint fails.
  }
  // Preserve distance priority while bounding the batch to one request timeout.
  const feeds = await Promise.allSettled(candidates.slice(0, 5).map(candidate => fetchStationById(candidate.uid)));
  for (const feed of feeds) {
    if (feed.status === 'fulfilled') return feed.value;
  }
  return normalizeStation(await request(`/feed/geo:${lat};${lng}/`));
};

export const fetchNearbyStations = async (lat: number, lng: number, limit = 5): Promise<NearbyStation[]> => {
  const stations = await stationsInBounds(lat, lng, 1);
  return stations.slice(0, Number.isInteger(limit) && limit >= 0 ? limit : 5);
};

export const searchStations = async (keyword: string): Promise<SearchResult[]> => {
  if (!keyword.trim()) return [];
  const results = await request(`/search/?keyword=${encodeURIComponent(keyword.trim())}`);
  if (!Array.isArray(results)) throw new Error('Invalid station search response');
  return results.flatMap((raw: any) => {
    const uid = stationId(raw?.uid);
    const aqi = nonNegativeNumber(raw?.aqi);
    const lat = finiteNumber(raw?.station?.geo?.[0]);
    const lng = finiteNumber(raw?.station?.geo?.[1]);
    return uid !== null && aqi !== null && isValidCoordinates(lat, lng) && typeof raw?.station?.name === 'string'
      ? [{ ...raw, uid, aqi: String(aqi), station: { ...raw.station, geo: [lat, lng] } }] : [];
  });
};
