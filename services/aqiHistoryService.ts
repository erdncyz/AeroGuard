const OPEN_METEO_AIR_QUALITY = 'https://air-quality-api.open-meteo.com/v1/air-quality';

export interface DailyAQIHistory {
  date: string; // YYYY-MM-DD
  pm25: number | null;
  pm10: number | null;
  o3: number | null;
}

export const fetchAQIHistory = async (lat: number, lng: number): Promise<DailyAQIHistory[]> => {
  const url = `${OPEN_METEO_AIR_QUALITY}?latitude=${lat}&longitude=${lng}&hourly=pm2_5,pm10,ozone&past_days=7&forecast_days=0&timezone=auto`;

  const response = await fetch(url);
  if (!response.ok) throw new Error('AQI history fetch failed');
  const data = await response.json();

  const times: string[] = data.hourly?.time ?? [];
  const pm25Arr: (number | null)[] = data.hourly?.pm2_5 ?? [];
  const pm10Arr: (number | null)[] = data.hourly?.pm10 ?? [];
  const o3Arr: (number | null)[] = data.hourly?.ozone ?? [];

  // Group hourly data by day
  const dayMap = new Map<string, { pm25: number[]; pm10: number[]; o3: number[] }>();
  times.forEach((t, i) => {
    const day = t.split('T')[0];
    if (!dayMap.has(day)) dayMap.set(day, { pm25: [], pm10: [], o3: [] });
    const entry = dayMap.get(day)!;
    const v25 = pm25Arr[i];
    const v10 = pm10Arr[i];
    const vo3 = o3Arr[i];
    if (v25 !== null && v25 !== undefined) entry.pm25.push(v25);
    if (v10 !== null && v10 !== undefined) entry.pm10.push(v10);
    if (vo3 !== null && vo3 !== undefined) entry.o3.push(vo3);
  });

  const avg = (arr: number[]): number | null =>
    arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : null;

  return Array.from(dayMap.entries()).map(([date, d]) => ({
    date,
    pm25: avg(d.pm25),
    pm10: avg(d.pm10),
    o3: avg(d.o3),
  }));
};
