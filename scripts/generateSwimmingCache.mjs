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
    // .env.local is optional.
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
    throw new Error(`Request failed ${res.status} for ${endpoint}: ${text.slice(0, 200)}`);
  }

  return res.json();
};

const normalize = (value) =>
  String(value || '')
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ı/g, 'i');

const runConcurrent = async (items, limit, task) => {
  const out = new Array(items.length);
  let index = 0;

  const worker = async () => {
    while (index < items.length) {
      const current = index++;
      out[current] = await task(items[current], current);
    }
  };

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
  return out;
};

const pickDetailFields = (detail) => ({
  id: detail.id,
  cityName: detail.cityName,
  townName: detail.townName,
  name: detail.name,
  code: detail.code,
  swimmingAreaAdress: detail.swimmingAreaAdress,
  businessName: detail.businessName,
  businessPhone: detail.businessPhone,
  nearestHealthFacility: detail.nearestHealthFacility,
  waterTypeName: detail.waterTypeName,
  qualityClass: detail.qualityClass,
  sampleResultExplanation: detail.sampleResultExplanation,
  numberOfShowers: detail.numberOfShowers,
  numberOfCabins: detail.numberOfCabins,
  numberOfLifeguards: detail.numberOfLifeguards,
  hasBlueFlag: detail.hasBlueFlag,
  isProhibited: detail.isProhibited,
  prohibitions: detail.prohibitions,
  swimmingSeasonStartDate: detail.swimmingSeasonStartDate,
  swimmingSeasonEndDate: detail.swimmingSeasonEndDate,
});

const main = async () => {
  console.log('Fetching cities...');
  const cities = await request('/city-list/1');

  console.log('Fetching towns...');
  const townLists = await runConcurrent(cities, 6, async (city) => {
    try {
      const towns = await request(`/town-list?cityId=${city.id}&portalTypeId=1`);
      return [String(city.id), towns];
    } catch {
      return [String(city.id), []];
    }
  });

  const townsByCity = Object.fromEntries(townLists);

  console.log('Fetching areas (paged)...');
  const pageSize = 250;
  let skipCount = 0;
  let totalCount = 0;
  const areas = [];

  while (true) {
    const page = await request('/search-swimming-areas', {
      method: 'POST',
      body: JSON.stringify({
        portalTypeId: 1,
        skipCount,
        resultCount: pageSize,
      }),
    });

    totalCount = page.totalCount || 0;
    const items = page.items || [];
    areas.push(...items);

    skipCount += items.length;
    if (skipCount % 100 === 0 || skipCount >= totalCount) {
      console.log(`Areas fetched: ${skipCount}/${totalCount}`);
    }

    if (!items.length || skipCount >= totalCount) {
      break;
    }
  }

  console.log('Fetching details...');
  const details = await runConcurrent(areas, 8, async (area, i) => {
    const endpoint = `/swimming-area-detail-by-id/${encodeURIComponent(area.id)}`;
    try {
      const detail = await request(endpoint);
      if ((i + 1) % 100 === 0) {
        console.log(`Details fetched: ${i + 1}/${areas.length}`);
      }
      return [area.id, pickDetailFields(detail)];
    } catch {
      return [area.id, pickDetailFields(area)];
    }
  });

  const detailsById = Object.fromEntries(details);

  const cityNameById = new Map(cities.map((city) => [city.id, city.name]));
  const townNameById = new Map();

  for (const [cityId, towns] of Object.entries(townsByCity)) {
    for (const town of towns) {
      townNameById.set(`${cityId}:${town.id}`, town.name);
    }
  }

  const enrichedAreas = areas.map((area) => ({
    ...area,
    cityNameNormalized: normalize(area.cityName),
    townNameNormalized: normalize(area.townName),
  }));

  const data = {
    generatedAt: new Date().toISOString(),
    cities,
    townsByCity,
    areas: enrichedAreas,
    detailsById,
    indexes: {
      cityNameById: Object.fromEntries(cityNameById),
      townNameByCompositeId: Object.fromEntries(townNameById),
    },
  };

  const outPath = path.resolve(process.cwd(), 'public/swimming-cache-full.json');
  await fs.writeFile(outPath, JSON.stringify(data));

  console.log(`Done. Wrote ${areas.length} areas to public/swimming-cache-full.json`);
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
