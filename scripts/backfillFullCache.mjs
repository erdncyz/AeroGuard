import fs from 'node:fs';

const filePath = 'public/swimming-cache-full.json';
const envPath = '.env.local';

if (fs.existsSync(envPath)) {
  const envRaw = fs.readFileSync(envPath, 'utf8');
  for (const line of envRaw.split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i <= 0) continue;
    const k = t.slice(0, i).trim();
    const v = t.slice(i + 1).trim();
    if (!(k in process.env)) process.env[k] = v;
  }
}

const API_BASE = process.env.SWIMMING_API_BASE_URL || 'https://csbsapi.saglik.gov.tr/api/app/portal-public';
const API_USER = process.env.SWIMMING_API_USER;
const API_PASSWORD = process.env.SWIMMING_API_PASSWORD;

if (!API_USER || !API_PASSWORD) {
  console.error('Missing API credentials');
  process.exit(1);
}

if (!fs.existsSync(filePath)) {
  console.error('Missing full cache file');
  process.exit(1);
}

const auth = Buffer.from(`${API_USER}:${API_PASSWORD}`).toString('base64');
const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
const detailsById = data.detailsById || {};

const isRich = (d) => Boolean(
  d?.swimmingAreaAdress ||
  d?.businessName ||
  d?.businessPhone ||
  d?.nearestHealthFacility ||
  d?.numberOfShowers ||
  d?.numberOfCabins ||
  d?.numberOfLifeguards
);

const missingIds = Object.keys(detailsById).filter((id) => !isRich(detailsById[id]));

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

const requestDetail = async (id, retries = 2) => {
  const endpoint = `${API_BASE}/swimming-area-detail-by-id/${encodeURIComponent(id)}`;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(endpoint, {
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${auth}`,
      },
    });
    clearTimeout(timeout);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch {
    if (retries > 0) return requestDetail(id, retries - 1);
    return null;
  }
};

console.log(`Missing before: ${missingIds.length}`);

let recovered = 0;
for (let i = 0; i < missingIds.length; i += 1) {
  const id = missingIds[i];
  const detail = await requestDetail(id);
  if (detail?.id) {
    detailsById[id] = pickDetailFields(detail);
    recovered += 1;
  }
  if ((i + 1) % 10 === 0 || i === missingIds.length - 1) {
    console.log(`Retried ${i + 1}/${missingIds.length}`);
  }
}

data.detailsById = detailsById;
fs.writeFileSync(filePath, JSON.stringify(data));

const remaining = Object.values(detailsById).filter((d) => !isRich(d)).length;
console.log(`Recovered: ${recovered}`);
console.log(`Missing after: ${remaining}`);
