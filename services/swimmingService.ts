const SWIMMING_API_BASE = '/api/swimming';
const SWIMMING_API_FALLBACK_BASE = '/.netlify/functions/swimming-proxy';

const requestWithBase = async <T>(base: string, path: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  });

  if (!response.ok) {
    const rawText = await response.text();
    let detail = rawText;

    try {
      const parsed = JSON.parse(rawText);
      detail = parsed?.detail || parsed?.message || rawText;
    } catch {
      // Keep raw text as detail when response is not JSON.
    }

    throw new Error(`Swimming API request failed: ${response.status}${detail ? ` - ${detail}` : ''}`);
  }

  return response.json();
};

const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
  try {
    return await requestWithBase<T>(SWIMMING_API_BASE, path, init);
  } catch (err) {
    const message = err instanceof Error ? err.message : '';
    const canFallback =
      message.includes('404') ||
      message.includes('500') ||
      message.toLowerCase().includes('failed to fetch');

    if (!canFallback) {
      throw err;
    }

    return requestWithBase<T>(SWIMMING_API_FALLBACK_BASE, path, init);
  }
};

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

export const getSwimmingCities = async (): Promise<SwimCity[]> => {
  return request<SwimCity[]>('/city-list/1');
};

export const getSwimmingTowns = async (cityId: number): Promise<SwimTown[]> => {
  return request<SwimTown[]>(`/town-list?cityId=${cityId}&portalTypeId=1`);
};

export const searchSwimmingAreas = async (payload: SwimSearchPayload): Promise<SwimSearchResponse> => {
  const body: SwimSearchPayload = {
    portalTypeId: 1,
    skipCount: 0,
    resultCount: 24,
    ...payload,
  };

  return request<SwimSearchResponse>('/search-swimming-areas', {
    method: 'POST',
    body: JSON.stringify(body),
  });
};

export const getSwimmingAreaDetail = async (id: string): Promise<SwimAreaDetail> => {
  return request<SwimAreaDetail>(`/swimming-area-detail-by-id/${encodeURIComponent(id)}`);
};
