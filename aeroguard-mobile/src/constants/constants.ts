
import { AqiLevel } from './types';

export const WAQI_TOKEN = '99e5ee3364bb3bc3023c91655ee7c8b6a697e288';
export const WAQI_BASE_URL = 'https://api.waqi.info';

export type AqiMetadata = {
  key: 'good' | 'moderate' | 'sensitive' | 'unhealthy' | 'veryUnhealthy' | 'hazardous';
  color: string;
  textColor: string;
};

export const AQI_METADATA: Record<number, AqiMetadata> = {
  0: { key: 'good', color: 'bg-emerald-500', textColor: 'text-emerald-700' },
  51: { key: 'moderate', color: 'bg-yellow-400', textColor: 'text-yellow-700' },
  101: { key: 'sensitive', color: 'bg-orange-500', textColor: 'text-orange-700' },
  151: { key: 'unhealthy', color: 'bg-rose-500', textColor: 'text-rose-700' },
  201: { key: 'veryUnhealthy', color: 'bg-purple-600', textColor: 'text-purple-700' },
  301: { key: 'hazardous', color: 'bg-red-900', textColor: 'text-red-950' }
};

export const getAqiMetadata = (aqi: number): AqiMetadata => {
  if (aqi <= 50) return AQI_METADATA[0];
  if (aqi <= 100) return AQI_METADATA[51];
  if (aqi <= 150) return AQI_METADATA[101];
  if (aqi <= 200) return AQI_METADATA[151];
  if (aqi <= 300) return AQI_METADATA[201];
  return AQI_METADATA[301];
};
