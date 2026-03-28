const OPEN_METEO_BASE = 'https://air-quality-api.open-meteo.com/v1/air-quality';

export interface PollenData {
  alder: number | null;
  birch: number | null;
  grass: number | null;
  mugwort: number | null;
  olive: number | null;
  ragweed: number | null;
}

export interface PollenResponse {
  current: PollenData;
  hourly: {
    time: string[];
    alder_pollen: (number | null)[];
    birch_pollen: (number | null)[];
    grass_pollen: (number | null)[];
    mugwort_pollen: (number | null)[];
    olive_pollen: (number | null)[];
    ragweed_pollen: (number | null)[];
  } | null;
}

export const fetchPollenData = async (lat: number, lng: number): Promise<PollenResponse> => {
  const url = `${OPEN_METEO_BASE}?latitude=${lat}&longitude=${lng}&current=alder_pollen,birch_pollen,grass_pollen,mugwort_pollen,olive_pollen,ragweed_pollen&hourly=alder_pollen,birch_pollen,grass_pollen,mugwort_pollen,olive_pollen,ragweed_pollen&forecast_days=1&timezone=auto`;

  const response = await fetch(url);
  if (!response.ok) throw new Error('Pollen data fetch failed');
  const data = await response.json();

  return {
    current: {
      alder: data.current?.alder_pollen ?? null,
      birch: data.current?.birch_pollen ?? null,
      grass: data.current?.grass_pollen ?? null,
      mugwort: data.current?.mugwort_pollen ?? null,
      olive: data.current?.olive_pollen ?? null,
      ragweed: data.current?.ragweed_pollen ?? null,
    },
    hourly: data.hourly ?? null,
  };
};

export type PollenLevel = 'none' | 'low' | 'moderate' | 'high' | 'veryHigh';

export const getPollenLevel = (value: number | null): PollenLevel => {
  if (value === null || value === 0) return 'none';
  if (value <= 10) return 'low';
  if (value <= 50) return 'moderate';
  if (value <= 100) return 'high';
  return 'veryHigh';
};

export const getPollenColor = (level: PollenLevel) => {
  switch (level) {
    case 'none': return { bg: 'bg-slate-50', text: 'text-slate-400', border: 'border-slate-200', dot: 'bg-slate-300' };
    case 'low': return { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-400' };
    case 'moderate': return { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200', dot: 'bg-yellow-400' };
    case 'high': return { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', dot: 'bg-orange-400' };
    case 'veryHigh': return { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', dot: 'bg-red-400' };
  }
};
