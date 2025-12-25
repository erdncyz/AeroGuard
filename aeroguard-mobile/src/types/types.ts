
export type Language = 'en' | 'tr';

export interface Pollutant {
  v: number;
}

export interface Iaqi {
  co?: Pollutant;
  no2?: Pollutant;
  o3?: Pollutant;
  pm10?: Pollutant;
  pm25?: Pollutant;
  so2?: Pollutant;
  t?: Pollutant;
  w?: Pollutant;
  h?: Pollutant;
  p?: Pollutant;
}

export interface StationData {
  aqi: number;
  idx: number;
  attributions: Array<{ url: string; name: string }>;
  city: {
    geo: [number, number];
    name: string;
    url: string;
  };
  dominentpol: string;
  iaqi: Iaqi;
  time: {
    s: string;
    tz: string;
    v: number;
    iso: string;
  };
  forecast?: {
    daily?: {
      pm25: Array<{ avg: number; day: string; max: number; min: number }>;
      pm10: Array<{ avg: number; day: string; max: number; min: number }>;
      o3: Array<{ avg: number; day: string; max: number; min: number }>;
    }
  }
}

export interface SearchResult {
  uid: number;
  aqi: string;
  time: {
    tz: string;
    stime: string;
    vtime: number;
  };
  station: {
    name: string;
    geo: [number, number];
    url: string;
  };
}

export interface AqiLevel {
  label: string;
  color: string;
  textColor: string;
  description: string;
  healthAdvice: string;
}
