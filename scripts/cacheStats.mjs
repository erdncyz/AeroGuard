import fs from 'node:fs';

const p = 'public/swimming-cache-full.json';
const out = 'scripts/cache-stats.json';

if (!fs.existsSync(p)) {
  fs.writeFileSync(out, JSON.stringify({ exists: false }, null, 2));
  process.exit(0);
}

const j = JSON.parse(fs.readFileSync(p, 'utf8'));
const detailsById = j.detailsById || {};
const details = Object.values(detailsById);

const rich = details.filter((d) => d && (
  d.swimmingAreaAdress ||
  d.businessName ||
  d.businessPhone ||
  d.nearestHealthFacility ||
  d.numberOfShowers ||
  d.numberOfCabins ||
  d.numberOfLifeguards
)).length;

const stats = {
  exists: true,
  cities: (j.cities || []).length,
  areas: (j.areas || []).length,
  details: Object.keys(detailsById).length,
  detailsWithRichFields: rich,
  missingRichFields: Object.keys(detailsById).length - rich,
};

fs.writeFileSync(out, JSON.stringify(stats, null, 2));
