import { assertCoordinates, nonNegativeNumber } from './dataValidation';

const OPEN_METEO_BASE = 'https://air-quality-api.open-meteo.com/v1/air-quality';

export interface PollenData {
  alder: number | null;
  birch: number | null;
  grass: number | null;
  mugwort: number | null;
  olive: number | null;
  ragweed: number | null;
  observedAt?: string; // Time of this hourly model forecast, not a sensor observation.
}

export interface PollenResponse {
  current: PollenData;
  hourly: {
    time: number[];
    alder_pollen: (number | null)[];
    birch_pollen: (number | null)[];
    grass_pollen: (number | null)[];
    mugwort_pollen: (number | null)[];
    olive_pollen: (number | null)[];
    ragweed_pollen: (number | null)[];
  } | null;
}

export const fetchPollenData = async (lat: number, lng: number): Promise<PollenResponse> => {
  assertCoordinates(lat, lng);
  const variables = 'alder_pollen,birch_pollen,grass_pollen,mugwort_pollen,olive_pollen,ragweed_pollen';
  const url = `${OPEN_METEO_BASE}?latitude=${lat}&longitude=${lng}&hourly=${variables}&forecast_days=1&timezone=auto&timeformat=unixtime`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(url, { cache: 'no-store', signal: controller.signal });
    if (!response.ok) throw new Error('Pollen data fetch failed');
    const data = await response.json();
    if (data?.error || !Array.isArray(data?.hourly?.time)) throw new Error('Invalid pollen forecast response');

    const now = Date.now() / 1000;
    let index = -1;
    let closestTime = -Infinity;
    data.hourly.time.forEach((time: unknown, i: number) => {
      // Never show a future hour or an old forecast as the current concentration.
      if (typeof time === 'number' && Number.isFinite(time) && time <= now && now - time < 3600 && time > closestTime) {
        index = i;
        closestTime = time;
      }
    });
    const value = (key: string) => index < 0 || !Array.isArray(data.hourly[key]) ? null : nonNegativeNumber(data.hourly[key][index]);
    return {
      current: {
        alder: value('alder_pollen'), birch: value('birch_pollen'), grass: value('grass_pollen'),
        mugwort: value('mugwort_pollen'), olive: value('olive_pollen'), ragweed: value('ragweed_pollen'),
        ...(index >= 0 ? { observedAt: new Date(closestTime * 1000).toISOString() } : {}),
      },
      hourly: data.hourly,
    };
  } finally {
    clearTimeout(timeout);
  }
};

export type PollenLevel = 'unknown' | 'none' | 'low' | 'moderate' | 'high' | 'veryHigh';

export const getPollenLevel = (value: number | null): PollenLevel => {
  if (value === null || !Number.isFinite(value) || value < 0) return 'unknown';
  if (value === 0) return 'none';
  if (value <= 10) return 'low';
  if (value <= 50) return 'moderate';
  if (value <= 100) return 'high';
  return 'veryHigh';
};

export const getPollenColor = (level: PollenLevel) => {
  switch (level) {
    case 'unknown':
    case 'none': return { bg: 'bg-slate-50', text: 'text-slate-400', border: 'border-slate-200', dot: 'bg-slate-300' };
    case 'low': return { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-400' };
    case 'moderate': return { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200', dot: 'bg-yellow-400' };
    case 'high': return { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', dot: 'bg-orange-400' };
    case 'veryHigh': return { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', dot: 'bg-red-400' };
  }
};
