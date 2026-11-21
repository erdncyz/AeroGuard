// API values must not turn missing observations into a measured zero.
export const finiteNumber = (value: unknown): number | null => {
  if (typeof value !== 'number' && typeof value !== 'string') return null;
  if (typeof value === 'string' && !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(value.trim())) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

export const nonNegativeNumber = (value: unknown): number | null => {
  const number = finiteNumber(value);
  return number !== null && number >= 0 ? number : null;
};

export const isValidCoordinates = (lat: unknown, lng: unknown): boolean =>
  typeof lat === 'number' && Number.isFinite(lat) && lat >= -90 && lat <= 90 &&
  typeof lng === 'number' && Number.isFinite(lng) && lng >= -180 && lng <= 180;

export const assertCoordinates = (lat: number, lng: number): void => {
  if (!isValidCoordinates(lat, lng)) throw new Error('Invalid geographic coordinates');
};

export const isCalendarDate = (value: unknown): value is string => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
};
