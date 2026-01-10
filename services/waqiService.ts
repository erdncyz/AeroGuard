
import { WAQI_BASE_URL, WAQI_TOKEN } from '../constants';
import { StationData, SearchResult } from '../types';

// Helper to calculate distance between two coordinates in km
const getDistanceFromLatLonInKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return d;
};

const deg2rad = (deg: number) => {
  return deg * (Math.PI / 180);
};

export const fetchByGeo = async (lat: number, lng: number): Promise<StationData> => {
  // First, try to find stations within a bounding box to get the absolute nearest
  // Box size approx 20km
  const diff = 0.5;
  const latMin = lat - diff;
  const latMax = lat + diff;
  const lngMin = lng - diff;
  const lngMax = lng + diff;

  try {
    const boundsUrl = `${WAQI_BASE_URL}/map/bounds/?token=${WAQI_TOKEN}&latlng=${latMin},${lngMin},${latMax},${lngMax}`;

    const boundsResponse = await fetch(boundsUrl);
    const boundsData = await boundsResponse.json();

    if (boundsData.status === 'ok' && boundsData.data && boundsData.data.length > 0) {
      // Find the closest station from the list
      let minDistance = Infinity;
      let closestStation = null;

      for (const station of boundsData.data) {
        const dist = getDistanceFromLatLonInKm(lat, lng, station.lat, station.lon);
        if (dist < minDistance) {
          minDistance = dist;
          closestStation = station;
        }
      }

      if (closestStation) {
        return await fetchStationById(closestStation.uid);
      }
    }
  } catch (err) {
    console.warn('Smart nearest station search failed, falling back to default geo feed:', err);
  }

  // Fallback to default behavior if smart search fails
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
