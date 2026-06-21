import fs from 'node:fs/promises';
import path from 'node:path';

const loadEnvLocal = async () => {
  try {
    const envPath = path.resolve(process.cwd(), '.env.local');
    const raw = await fs.readFile(envPath, 'utf8');

    for (const line of raw.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) {
        continue;
      }

      const idx = trimmed.indexOf('=');
      if (idx <= 0) {
        continue;
      }

      const key = trimmed.slice(0, idx).trim();
      const value = trimmed.slice(idx + 1).trim();

      if (!(key in process.env)) {
        process.env[key] = value;
      }
    }
  } catch {
    // .env.local is optional; rely on existing environment variables.
  }
};

await loadEnvLocal();

const API_BASE = process.env.SWIMMING_API_BASE_URL || 'https://csbsapi.saglik.gov.tr/api/app/portal-public';
const API_USER = process.env.SWIMMING_API_USER;
const API_PASSWORD = process.env.SWIMMING_API_PASSWORD;

if (!API_USER || !API_PASSWORD) {
  console.error('Missing SWIMMING_API_USER or SWIMMING_API_PASSWORD');
  process.exit(1);
}

const auth = Buffer.from(`${API_USER}:${API_PASSWORD}`).toString('base64');

const request = async (endpoint, init = {}) => {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${auth}`,
      ...(init.headers || {}),
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Request failed ${res.status} for ${endpoint}: ${text.slice(0, 150)}`);
  }

  return res.json();
};

const normalize = (value) =>
  String(value || '')
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ı/g, 'i');

const toLiteDetail = (item) => ({
  id: item.id,
  cityName: item.cityName || '',
  townName: item.townName || '',
  name: item.name || '',
  code: '',
  swimmingAreaAdress: '',
  businessName: '',
  businessPhone: '',
  nearestHealthFacility: '',
  waterTypeName: '',
  qualityClass: item.qualityClass || '',
  sampleResultExplanation: item.sampleResultExplanation || '',
  numberOfShowers: 0,
  numberOfCabins: 0,
  numberOfLifeguards: 0,
  hasBlueFlag: item.hasBlueFlag || false,
  isProhibited: item.isProhibited || false,
  prohibitions: item.prohibitions || [],
  swimmingSeasonStartDate: '',
  swimmingSeasonEndDate: '',
});

const main = async () => {
  console.log('1/3 cities');
  const cities = await request('/city-list/1');

  console.log('2/3 towns + sampled areas');
  const townsByCity = {};
  const sampledAreas = [];

  for (let i = 0; i < cities.length; i += 1) {
    const city = cities[i];

    try {
      const towns = await request(`/town-list?cityId=${city.id}&portalTypeId=1`);
      townsByCity[String(city.id)] = towns;
    } catch {
      townsByCity[String(city.id)] = [];
    }

    try {
      const result = await request('/search-swimming-areas', {
        method: 'POST',
        body: JSON.stringify({
          cityId: city.id,
          portalTypeId: 1,
          skipCount: 0,
          resultCount: 10,
        }),
      });

      sampledAreas.push(...(result.items || []));
    } catch {
      // Skip city on failure
    }

    if ((i + 1) % 5 === 0 || i === cities.length - 1) {
      console.log(`city progress ${i + 1}/${cities.length}`);
    }
  }

  const dedupMap = new Map();
  for (const area of sampledAreas) {
    if (!dedupMap.has(area.id)) {
      dedupMap.set(area.id, {
        ...area,
        cityNameNormalized: normalize(area.cityName),
        townNameNormalized: normalize(area.townName),
      });
    }
  }

  const areas = [...dedupMap.values()];
  const detailsById = Object.fromEntries(areas.map((a) => [a.id, toLiteDetail(a)]));

  const data = {
    generatedAt: new Date().toISOString(),
    mode: 'lite',
    cities,
    townsByCity,
    areas,
    detailsById,
  };

  const outPath = path.resolve(process.cwd(), 'public/swimming-cache-lite.json');
  await fs.writeFile(outPath, JSON.stringify(data));

  console.log(`3/3 done -> ${outPath}`);
  console.log(`cities=${cities.length}, areas=${areas.length}`);
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
