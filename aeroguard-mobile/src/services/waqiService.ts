
import { WAQI_BASE_URL, WAQI_TOKEN } from '../constants';
import { StationData, SearchResult } from '../types';

export const fetchByGeo = async (lat: number, lng: number): Promise<StationData> => {
  const response = await fetch(`${WAQI_BASE_URL}/feed/geo:${lat};${lng}/?token=${WAQI_TOKEN}`);
  const data = await response.json();
  if (data.status !== 'ok') throw new Error(data.data);
  return data.data;
};

export const fetchByIP = async (): Promise<StationData> => {
  const response = await fetch(`${WAQI_BASE_URL}/feed/here/?token=${WAQI_TOKEN}`);
  const data = await response.json();
  if (data.status !== 'ok') throw new Error(data.data);
  return data.data;
};

export const searchStations = async (keyword: string): Promise<SearchResult[]> => {
  const response = await fetch(`${WAQI_BASE_URL}/search/?token=${WAQI_TOKEN}&keyword=${encodeURIComponent(keyword)}`);
  const data = await response.json();
  if (data.status !== 'ok') throw new Error(data.data);
  return data.data;
};

export const fetchStationById = async (idx: number): Promise<StationData> => {
  const response = await fetch(`${WAQI_BASE_URL}/feed/@${idx}/?token=${WAQI_TOKEN}`);
  const data = await response.json();
  if (data.status !== 'ok') throw new Error(data.data);
  return data.data;
};
