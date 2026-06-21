const SWIMMING_STATIC_CACHE_URL = '/swimming-cache-lite.json';

export interface SwimCity {
  id: number;
  name: string;
}

export interface SwimTown {
  id: number;
  name: string;
}

export interface SwimArea {
  id: string;
  name: string;
  cityName: string;
  townName: string;
  qualityClass: string;
  sampleResultExplanation: string;
  hasBlueFlag: boolean;
  isProhibited: boolean;
  prohibitions: string[];
}

export interface SwimAreaDetail {
  id: string;
  cityName: string;
  townName: string;
  name: string;
  code: string;
  swimmingAreaAdress: string;
  businessName: string;
  businessPhone: string;
  nearestHealthFacility: string;
  waterTypeName: string;
  qualityClass: string;
  sampleResultExplanation?: string;
  numberOfShowers?: number;
  numberOfCabins?: number;
  numberOfLifeguards?: number;
  hasBlueFlag?: boolean;
  isProhibited?: boolean;
  prohibitions?: string[];
  swimmingSeasonStartDate?: string;
  swimmingSeasonEndDate?: string;
}

interface SwimSearchResponse {
  totalCount: number;
  items: SwimArea[];
}

interface SwimSearchPayload {
  cityId?: number;
  townId?: number;
  portalTypeId?: number;
  skipCount?: number;
  resultCount?: number;
}

interface SwimStaticCache {
  cities: SwimCity[];
  townsByCity: Record<string, SwimTown[]>;
  areas: (SwimArea & { cityNameNormalized?: string; townNameNormalized?: string })[];
  detailsById: Record<string, SwimAreaDetail>;
}

let staticCachePromise: Promise<SwimStaticCache> | null = null;

const normalize = (value: string): string =>
  String(value || '')
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ı/g, 'i');

const getStaticCache = async (): Promise<SwimStaticCache> => {
  if (!staticCachePromise) {
    staticCachePromise = fetch(SWIMMING_STATIC_CACHE_URL)
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(`Static cache fetch failed: ${res.status}`);
        }
        return res.json() as Promise<SwimStaticCache>;
      })
      .catch((err) => {
        staticCachePromise = null;
        throw err;
      });
  }

  return staticCachePromise;
};

export const getSwimmingCities = async (): Promise<SwimCity[]> => {
  const cache = await getStaticCache();
  return cache.cities;
};

export const getSwimmingTowns = async (cityId: number): Promise<SwimTown[]> => {
  const cache = await getStaticCache();
  return cache.townsByCity[String(cityId)] || [];
};

export const searchSwimmingAreas = async (payload: SwimSearchPayload): Promise<SwimSearchResponse> => {
  const body: SwimSearchPayload = {
    portalTypeId: 1,
    skipCount: 0,
    resultCount: 24,
    ...payload,
  };

  const cache = await getStaticCache();
  let filtered = cache.areas;

  if (body.cityId) {
    const city = cache.cities.find((c) => c.id === body.cityId);
    const cityNorm = normalize(city?.name || '');
    filtered = filtered.filter((area) => {
      const value = area.cityNameNormalized || normalize(area.cityName);
      return value === cityNorm;
    });
  }

  if (body.townId && body.cityId) {
    const town = (cache.townsByCity[String(body.cityId)] || []).find((t) => t.id === body.townId);
    const townNorm = normalize(town?.name || '');
    filtered = filtered.filter((area) => {
      const value = area.townNameNormalized || normalize(area.townName);
      return value === townNorm;
    });
  }

  const skip = body.skipCount || 0;
  const take = body.resultCount || 24;

  return {
    totalCount: filtered.length,
    items: filtered.slice(skip, skip + take),
  };
};

export const getSwimmingAreaDetail = async (id: string): Promise<SwimAreaDetail> => {
  const cache = await getStaticCache();
  const detail = cache.detailsById[id];

  if (detail) {
    return detail;
  }

  const area = cache.areas.find((item) => item.id === id);
  if (area) {
    return {
      id: area.id,
      cityName: area.cityName,
      townName: area.townName,
      name: area.name,
      code: '',
      swimmingAreaAdress: '',
      businessName: '',
      businessPhone: '',
      nearestHealthFacility: '',
      waterTypeName: '',
      qualityClass: area.qualityClass,
      sampleResultExplanation: area.sampleResultExplanation,
      hasBlueFlag: area.hasBlueFlag,
      isProhibited: area.isProhibited,
      prohibitions: area.prohibitions,
    };
  }

  throw new Error('Swimming area detail not found in static cache');
};
