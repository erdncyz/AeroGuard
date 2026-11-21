import { assertCoordinates, nonNegativeNumber } from './dataValidation';

const OPEN_METEO_AIR_QUALITY = 'https://air-quality-api.open-meteo.com/v1/air-quality';

export interface DailyAQIHistory {
  date: string; // Location-local YYYY-MM-DD; model concentrations in µg/m³.
  pm25: number | null;
  pm10: number | null;
  o3: number | null;
}

export const fetchAQIHistory = async (lat: number, lng: number): Promise<DailyAQIHistory[]> => {
  assertCoordinates(lat, lng);
  const url = `${OPEN_METEO_AIR_QUALITY}?latitude=${lat}&longitude=${lng}&hourly=pm2_5,pm10,ozone&past_days=7&forecast_days=0&timezone=auto&timeformat=unixtime`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(url, { cache: 'no-store', signal: controller.signal });
    if (!response.ok) throw new Error('AQI history fetch failed');
    const data = await response.json();
    if (data?.error || !Array.isArray(data?.hourly?.time)) throw new Error('Invalid air quality history response');

    const times: number[] = data.hourly.time;
    const pm25Arr = Array.isArray(data.hourly.pm2_5) ? data.hourly.pm2_5 : [];
    const pm10Arr = Array.isArray(data.hourly.pm10) ? data.hourly.pm10 : [];
    const o3Arr = Array.isArray(data.hourly.ozone) ? data.hourly.ozone : [];
    const now = Date.now();
    const offset = Number.isFinite(data.utc_offset_seconds) && Math.abs(data.utc_offset_seconds) <= 86400 ? data.utc_offset_seconds : 0;
    const localDate = typeof data.timezone === 'string'
      ? new Intl.DateTimeFormat('en-CA', { timeZone: data.timezone, year: 'numeric', month: '2-digit', day: '2-digit' }) : null;
    const dayMap = new Map<string, { pm25: number[]; pm10: number[]; o3: number[] }>();
    times.forEach((time, i) => {
      if (typeof time !== 'number' || !Number.isFinite(time) || time * 1000 > now) return;
      // Group by the requested location's calendar day, not the viewer's timezone.
      const instant = new Date(time * 1000);
      if (!Number.isFinite(instant.getTime())) return;
      const parts = localDate?.formatToParts(instant);
      const day = parts
        ? ['year', 'month', 'day'].map(type => parts.find(part => part.type === type)!.value).join('-')
        : new Date((time + offset) * 1000).toISOString().slice(0, 10);
      if (!dayMap.has(day)) dayMap.set(day, { pm25: [], pm10: [], o3: [] });
      const entry = dayMap.get(day)!;
      const pm25 = nonNegativeNumber(pm25Arr[i]);
      const pm10 = nonNegativeNumber(pm10Arr[i]);
      const o3 = nonNegativeNumber(o3Arr[i]);
      if (pm25 !== null) entry.pm25.push(pm25);
      if (pm10 !== null) entry.pm10.push(pm10);
      if (o3 !== null) entry.o3.push(o3);
    });
    const average = (values: number[]): number | null =>
      values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
    return Array.from(dayMap.entries()).map(([date, day]) => ({
      date, pm25: average(day.pm25), pm10: average(day.pm10), o3: average(day.o3),
    })).sort((a, b) => a.date.localeCompare(b.date));
  } finally {
    clearTimeout(timeout);
  }
};
