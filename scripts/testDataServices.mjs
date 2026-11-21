import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { createRequire } from 'node:module';
import test, { after } from 'node:test';
import ts from 'typescript';

// Compile the real services to an isolated CommonJS folder, without adding a runner dependency.
const compiled = await mkdtemp(join(tmpdir(), 'aeroguard-data-tests-'));
for (const file of ['types', 'constants', 'services/dataValidation', 'services/waqiService', 'services/pollenService', 'services/aqiHistoryService']) {
  const source = await readFile(resolve(`${file}.ts`), 'utf8');
  const output = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
  const destination = join(compiled, `${file}.js`);
  await mkdir(dirname(destination), { recursive: true });
  await writeFile(destination, output);
}
const require = createRequire(join(compiled, 'tests.cjs'));
const waqi = require('./services/waqiService.js');
const pollen = require('./services/pollenService.js');
const history = require('./services/aqiHistoryService.js');
const originalFetch = globalThis.fetch;
const originalNow = Date.now;
const now = Date.parse('2026-11-21T10:30:00Z');
Date.now = () => now;
after(async () => {
  globalThis.fetch = originalFetch;
  Date.now = originalNow;
  await rm(compiled, { recursive: true, force: true });
});

const station = (overrides = {}) => ({
  aqi: 42, idx: 1, city: { geo: [41, 29], name: 'Test sensor', url: '' },
  iaqi: { pm25: { v: 42 }, t: { v: -3 } },
  time: { iso: '2026-11-21T12:00:00+03:00', s: '2026-11-21 12:00:00', tz: '+03:00', v: 0 },
  attributions: [], dominentpol: 'pm25', ...overrides,
});
const response = data => ({ ok: true, json: async () => structuredClone(data) });
const feed = data => response({ status: 'ok', data });
const useFeed = data => { globalThis.fetch = async () => feed(data); };

test('WAQI preserves measured zero AQI, origin coordinates and negative temperature', async () => {
  useFeed(station({ aqi: '0', city: { geo: [0, 0], name: 'Origin' } }));
  const result = await waqi.fetchStationById(1);
  assert.equal(result.aqi, 0);
  assert.deepEqual(result.city.geo, [0, 0]);
  assert.equal(result.iaqi.t.v, -3);
});

test('WAQI rejects missing/blank/invalid AQI instead of converting it to clean air', async () => {
  for (const aqi of [null, undefined, '', ' ', '-', -1, NaN, Infinity, false, '0x10']) {
    useFeed(station({ aqi }));
    await assert.rejects(waqi.fetchStationById(1), /valid AQI/);
  }
});

test('invalid request coordinates and station identifiers never issue a network request', async () => {
  let calls = 0;
  globalThis.fetch = async () => { calls++; return feed(station()); };
  for (const pair of [[91, 29], [41, 181], [NaN, 1], [1, Infinity]]) {
    await assert.rejects(waqi.fetchByGeo(...pair), /coordinates/);
    await assert.rejects(pollen.fetchPollenData(...pair), /coordinates/);
    await assert.rejects(history.fetchAQIHistory(...pair), /coordinates/);
  }
  await assert.rejects(waqi.fetchStationById(0), /identifier/);
  assert.equal(calls, 0);
});

test('WAQI normalizes numeric strings and omits malformed optional pollutants', async () => {
  useFeed(station({ iaqi: { pm25: { v: '12.5' }, pm10: { v: null }, no2: { v: -4 }, h: { v: 101 }, co: { v: '' }, w: { v: 0 } } }));
  const result = await waqi.fetchStationById(1);
  assert.deepEqual(result.iaqi, { pm25: { v: 12.5 }, w: { v: 0 } });
});

test('station timestamps retain the station offset and never use the viewer timezone', async () => {
  useFeed(station({ time: { s: '2026-11-21 12:00:00', tz: '+03:00' } }));
  assert.equal((await waqi.fetchStationById(1)).time.iso, '2026-11-21T09:00:00.000Z');
  useFeed(station({ time: { s: '2026-11-20 12:00:00', tz: '-0500' } }));
  assert.equal((await waqi.fetchStationById(1)).time.iso, '2026-11-20T17:00:00.000Z');
  useFeed(station({ time: { iso: '2026-11-21T12:00:00+03:00' } }));
  assert.equal((await waqi.fetchStationById(1)).time.tz, '+03:00');
});

test('missing or impossible station timestamps are rejected rather than replaced by now', async () => {
  for (const time of [{}, { iso: 'invalid' }, { iso: '2026-11-21T12:00:00' }, { iso: '2026-02-30T12:00:00Z' }, { iso: '2026-11-20T24:00:00Z' }, { iso: '2026-11-21T10:36:00Z' }]) {
    useFeed(station({ time }));
    await assert.rejects(waqi.fetchStationById(1), /observation time/);
  }
});

test('malformed station coordinates and HTTP errors are rejected', async () => {
  useFeed(station({ city: { geo: [null, 29], name: 'Invalid' } }));
  await assert.rejects(waqi.fetchStationById(1), /geographic/);
  globalThis.fetch = async () => ({ ok: false, status: 503 });
  await assert.rejects(waqi.fetchStationById(1), /503/);
  globalThis.fetch = async () => response({ status: 'error', data: 'provider unavailable' });
  await assert.rejects(waqi.fetchStationById(1), /provider unavailable/);
});

test('nearest selection skips unusable sensors and requests the next closest valid feed', async () => {
  const calls = [];
  globalThis.fetch = async url => {
    calls.push(url);
    if (url.includes('/map/bounds/')) return feed([
      { uid: 3, aqi: '30', lat: 41.1, lon: 29 },
      { uid: 1, aqi: '25', lat: 41.001, lon: 29 },
      { uid: 2, aqi: 0, lat: 41.01, lon: 29 },
      { uid: 4, aqi: null, lat: 41, lon: 29 },
    ]);
    if (url.includes('/@1/')) return feed(station({ idx: 1, aqi: '-' }));
    if (url.includes('/@2/')) return feed(station({ idx: 2, aqi: 0 }));
    throw new Error('Unexpected request');
  };
  const result = await waqi.fetchByGeo(41, 29);
  assert.equal(result.idx, 2);
  assert.equal(result.aqi, 0);
  assert.equal(calls.some(url => url.includes('/here/')), false);
});

test('nearby lists preserve zero while filtering invalid AQI/coordinates', async () => {
  useFeed([
    { uid: 1, aqi: 0, lat: 0, lon: 0, station: { name: 'Origin' } },
    { uid: 2, aqi: '', lat: 0, lon: 0 },
    { uid: 3, aqi: 50, lat: 100, lon: 0 },
    { uid: 4, aqi: -1, lat: 0, lon: 0 },
  ]);
  const result = await waqi.fetchNearbyStations(0, 0);
  assert.equal(result.length, 1);
  assert.equal(result[0].distance, 0);
  assert.equal(result[0].aqi, 0);
  assert.ok(Number.isFinite(waqi.getDistanceFromLatLonInKm(0, 0, 0, 180)));
});

test('dateline bounds split instead of sending out-of-range longitudes', async () => {
  const urls = [];
  globalThis.fetch = async url => { urls.push(url); return feed([]); };
  await waqi.fetchNearbyStations(0, 179.9);
  assert.equal(urls.length, 2);
  for (const url of urls) {
    const bounds = new URL(url).searchParams.get('latlng').split(',').map(Number);
    assert.ok(bounds[1] >= -180 && bounds[3] <= 180);
  }
});

test('pollen selects the current epoch hour and keeps missing values distinct from zero', async () => {
  let requested;
  globalThis.fetch = async url => {
    requested = new URL(url);
    return response({ hourly: {
      time: [now / 1000 - 5400, now / 1000 - 1800, now / 1000 + 1800],
      alder_pollen: [9, 0, 88], birch_pollen: [1, null, 99], grass_pollen: [1, 12.25, 100],
      mugwort_pollen: [1, -1, 100], olive_pollen: [1, '', 100], ragweed_pollen: [1, 4, 100],
    } });
  };
  const result = await pollen.fetchPollenData(41, 29);
  assert.equal(result.current.alder, 0);
  assert.equal(result.current.birch, null);
  assert.equal(result.current.grass, 12.25);
  assert.equal(result.current.mugwort, null);
  assert.equal(result.current.olive, null);
  assert.equal(result.current.observedAt, '2026-11-21T10:00:00.000Z');
  assert.equal(requested.searchParams.get('timeformat'), 'unixtime');
  assert.equal(requested.searchParams.has('current'), false);
  assert.equal(pollen.getPollenLevel(null), 'unknown');
  assert.equal(pollen.getPollenLevel(0), 'none');
});

test('stale pollen hours are unavailable rather than reused as current values', async () => {
  globalThis.fetch = async () => response({ hourly: { time: [now / 1000 - 3600], grass_pollen: [45] } });
  const result = await pollen.fetchPollenData(41, 29);
  assert.equal(result.current.grass, null);
  assert.equal(result.current.observedAt, undefined);
});

test('history retains fractions/nulls, groups station-local dates and excludes future hours', async () => {
  globalThis.fetch = async () => response({ utc_offset_seconds: 10800, hourly: {
    time: [Date.parse('2026-11-20T20:00:00Z') / 1000, Date.parse('2026-11-20T21:00:00Z') / 1000, Date.parse('2026-11-20T22:00:00Z') / 1000, now / 1000 + 3600],
    pm2_5: [null, 1.2, 1.3, 999], pm10: ['', -1, null, 999], ozone: [0, 80, 82, 999],
  } });
  const result = await history.fetchAQIHistory(41, 29);
  assert.deepEqual(result, [
    { date: '2026-11-20', pm25: null, pm10: null, o3: 0 },
    { date: '2026-11-21', pm25: 1.25, pm10: null, o3: 81 },
  ]);
});

test('forecast normalization omits invalid values and dates', async () => {
  useFeed(station({ forecast: { daily: { pm25: [
    { day: '2026-11-22', min: 10, avg: 15, max: 20 },
    { day: '2026-11-21', min: 0, avg: null, max: 20 },
    { day: '2026-02-30', min: 0, avg: 1, max: 2 },
    { day: '2026-11-23', min: 10, avg: 5, max: 20 },
  ] } } }));
  assert.deepEqual((await waqi.fetchStationById(1)).forecast.daily.pm25, [{ day: '2026-11-22', min: 10, avg: 15, max: 20 }]);
});

test('history uses each date\'s IANA timezone offset across a DST change', async () => {
  globalThis.fetch = async () => response({ timezone: 'Europe/Berlin', utc_offset_seconds: 3600, hourly: {
    time: [Date.parse('2026-10-24T22:30:00Z') / 1000, Date.parse('2026-10-25T23:30:00Z') / 1000, -1e100],
    pm2_5: [12, 24, 999], pm10: [], ozone: [],
  } });
  const result = await history.fetchAQIHistory(52.5, 13.4);
  assert.deepEqual(result.map(day => [day.date, day.pm25]), [['2026-10-25', 12], ['2026-10-26', 24]]);
});

test('network requests abort when their bounded timeout elapses', async () => {
  const originalSetTimeout = globalThis.setTimeout;
  globalThis.setTimeout = (callback, delay, ...args) => originalSetTimeout(callback, Math.min(delay, 1), ...args);
  globalThis.fetch = (_url, options) => new Promise((_resolve, reject) => {
    options.signal.addEventListener('abort', () => reject(new Error('request aborted')), { once: true });
  });
  try {
    await assert.rejects(waqi.fetchByIP(), /aborted/);
    await assert.rejects(pollen.fetchPollenData(41, 29), /aborted/);
    await assert.rejects(history.fetchAQIHistory(41, 29), /aborted/);
  } finally {
    globalThis.setTimeout = originalSetTimeout;
  }
});

test('nearest station priority survives a farther feed resolving faster', async () => {
  let resolveNearest;
  const nearestReady = new Promise(resolve => { resolveNearest = resolve; });
  globalThis.fetch = async url => {
    if (url.includes('/map/bounds/')) return feed([
      { uid: 2, aqi: 25, lat: 41.1, lon: 29 },
      { uid: 1, aqi: 42, lat: 41.001, lon: 29 },
    ]);
    if (url.includes('/@1/')) { await nearestReady; return feed(station({ idx: 1 })); }
    if (url.includes('/@2/')) return feed(station({ idx: 2 }));
    throw new Error('Unexpected request');
  };
  let settled = false;
  const selection = waqi.fetchByGeo(41, 29).then(result => { settled = true; return result; });
  for (let i = 0; i < 12; i++) await Promise.resolve();
  assert.equal(settled, false);
  resolveNearest();
  assert.equal((await selection).idx, 1);
});
