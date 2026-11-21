import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { buildSync } from 'esbuild';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const tempDirectory = mkdtempSync(join(tmpdir(), 'aeroguard-display-tests-'));
const outputFile = join(tempDirectory, 'components.cjs');
// Bundle the actual components and React renderer. No browser or new test dependencies required.
buildSync({
  stdin: {
    contents: `
      import React from 'react';
      import { renderToStaticMarkup } from 'react-dom/server';
      import Pollutant from './components/PollutantCard';
      import History from './components/AQIHistoryChart';
      import Forecast from './components/ForecastChart';
      import UV from './components/UVIndexCard';
      import Pollen from './components/PollenCard';
      export { getHealthAdvice, askHealthQuestion } from './services/geminiService';
      export const renderPollutant = props => renderToStaticMarkup(React.createElement(Pollutant, props));
      export const renderHistory = props => renderToStaticMarkup(React.createElement(History, props));
      export const renderForecast = props => renderToStaticMarkup(React.createElement(Forecast, props));
      export const renderUV = props => renderToStaticMarkup(React.createElement(UV, props));
      export const renderPollen = props => renderToStaticMarkup(React.createElement(Pollen, props));
    `,
    resolveDir: projectRoot,
    loader: 'js',
  },
  define: {
    'import.meta.env.VITE_GEMINI_API_KEY': '""',
    'import.meta.env.VITE_GROQ_API_KEY': '"test-provider-key"',
    'process.env.GEMINI_API_KEY': '""',
    'process.env.API_KEY': '""',
  },
  bundle: true,
  platform: 'node',
  format: 'cjs',
  outfile: outputFile,
  logLevel: 'silent',
});
const render = createRequire(import.meta.url)(outputFile);
after(() => rmSync(tempDirectory, { recursive: true, force: true }));

const atTime = (isoTime, callback) => {
  const OriginalDate = globalThis.Date;
  const now = OriginalDate.parse(isoTime);
  globalThis.Date = class extends OriginalDate {
    constructor(...args) { super(...(args.length ? args : [now])); }
    static now() { return now; }
  };
  try { return callback(); } finally { globalThis.Date = OriginalDate; }
};

test('WAQI pollutant subindices use common AQI boundaries, including true zero', () => {
  const cases = [[0, 'emerald'], [40, 'emerald'], [50, 'emerald'], [51, 'yellow'], [100, 'yellow'],
    [101, 'orange'], [150, 'orange'], [151, 'rose'], [200, 'rose'], [201, 'purple'], [300, 'purple'], [301, 'red']];
  for (const [value, color] of cases) {
    const html = render.renderPollutant({ label: 'PM2.5', value, unit: 'AQI', description: 'Individual AQI' });
    assert.match(html, new RegExp(`bg-${color}-50`), `${value} AQI`);
    assert.ok(html.includes(`>${value}</span>`), `${value} is displayed`);
  }
  for (const value of [undefined, null, NaN, Infinity, -1]) {
    const html = render.renderPollutant({ label: 'CO', value, unit: 'AQI', description: '' });
    assert.match(html, /bg-slate-50/);
    assert.match(html, />—<\/span>/);
  }
});

test('history preserves missing gaps and real zero, without fabricated UV history or health classes', () => {
  const html = render.renderHistory({
    lang: 'en',
    history: [
      { date: '2026-11-18', pm25: 0, pm10: null, o3: null },
      { date: '2026-11-19', pm25: null, pm10: null, o3: null },
      { date: '2026-11-20', pm25: 22.51666666666667, pm10: null, o3: null },
    ],
    uviForecast: [7, 8, 9],
  });
  assert.ok(html.includes('2026-11-18: 0 µg/m³'));
  assert.ok(html.includes('2026-11-19: No data'));
  assert.ok(html.includes('2026-11-20: 22.5 µg/m³'));
  assert.equal((html.match(/fill="#3b82f6"/g) || []).length, 1);
  assert.ok(!html.includes('22.516666'));
  assert.ok(!html.includes('Concentration trend:'));
  assert.ok(!html.includes('ppb'));
  assert.ok(!html.includes('>UV<'));
  assert.ok(!html.includes('Air is clean'));
  assert.ok(html.includes('archived Open-Meteo / CAMS'));
});

test('forecast selects a nonempty series and respects the station day at UTC midnight boundaries', () => {
  const html = atTime('2026-11-21T22:30:00Z', () => render.renderForecast({
    lang: 'en', timezoneOffset: '+03:00',
    forecast: { daily: { pm25: [], pm10: [
      { day: '2026-11-21', avg: 499, min: 499, max: 499 },
      { day: '2026-11-22', avg: 52.1234567, min: 31.2345, max: 89.1234 },
    ] } },
  }));
  assert.ok(html.includes('PM10'));
  assert.ok(html.includes('Today'));
  assert.ok(html.includes('>22</p>'));
  assert.ok(html.includes('>52.1</span>'));
  assert.ok(!html.includes('499'));
  assert.ok(!html.includes('52.1234567'));
  assert.ok(!html.includes('µg/m³') && !html.includes('ppb'));
  assert.ok(html.includes('AQI subindices'));
});

test('UV shows valid daily maxima for the station date and filters stale or invalid days', () => {
  const html = atTime('2026-11-21T22:30:00Z', () => render.renderUV({
    lang: 'en', timezoneOffset: '+03:00', uviForecast: [
      { day: '2026-11-21', avg: 99, min: 99, max: 99 },
      { day: '2026-11-22', avg: 1, min: 0, max: 2.234567 },
      { day: '2026-11-23', avg: 0, min: 0, max: NaN },
    ],
  }));
  assert.ok(html.includes('>2.2</span>'));
  assert.ok(html.includes('Daily maximum UV forecast'));
  assert.ok(html.includes('Today'));
  assert.ok(!html.includes('>99<') && !html.includes('NaN') && !html.includes('2.234567'));
  assert.ok(html.includes('>Low</div>') || html.includes('Low'));
});

test('missing pollen is unknown while measured zero remains none', () => {
  const pollenData = { alder: null, birch: null, grass: 0, mugwort: null, olive: null, ragweed: null };
  const html = render.renderPollen({ lang: 'en', pollenData });
  assert.ok(html.includes('>0</span>'));
  assert.ok(html.includes('No data'));
  assert.ok(html.includes('>None</p>'));
  assert.ok(html.includes('Indicative concentration scale'));
  assert.ok(html.includes('not allergy risk'));
  const unknown = render.renderPollen({ lang: 'en', pollenData: { ...pollenData, grass: null } });
  assert.ok(unknown.includes('No data'));
  assert.equal((unknown.match(/margin-left:-6px/g) || []).length, 0);
});


test('the main UV forecast displays the daily maximum, not its mean', () => {
  const html = atTime('2026-11-21T22:30:00Z', () => render.renderForecast({
    lang: 'en', timezoneOffset: '+03:00',
    forecast: { daily: { uvi: [{ day: '2026-11-22', avg: 1.234, min: 0, max: 6.789 }] } },
  }));
  assert.ok(html.includes('Daily Maximum UV Forecast'));
  assert.ok(html.includes('Daily maximum UV'));
  assert.ok(html.includes('>6.8</span>'));
  assert.ok(!html.includes('>1.2</span>'));
});

test('AI context identifies station time, stale age and index units without a real provider call', async () => {
  const originalFetch = globalThis.fetch;
  const prompts = [];
  globalThis.fetch = async (_url, options) => {
    prompts.push(JSON.parse(options.body).messages[0].content);
    return { ok: true, json: async () => ({ choices: [{ message: { content: 'Fixture advice' } }] }) };
  };
  const station = {
    aqi: 52, idx: 1, city: { name: 'Test station', geo: [41, 29], url: '' },
    iaqi: { pm25: { v: 52 }, pm10: { v: 40 } }, attributions: [], dominentpol: 'pm25',
    time: { iso: '2026-11-21T18:00:00.000Z', s: '2026-11-21 21:00:00', tz: '+03:00', v: 0 },
  };
  try {
    await atTime('2026-11-21T22:30:00Z', () => render.getHealthAdvice(station, 'tr'));
    await atTime('2026-11-21T22:30:00Z', () => render.askHealthQuestion(station, 'Ölçüm saati nedir?', 'tr'));
  } finally {
    globalThis.fetch = originalFetch;
  }
  assert.equal(prompts.length, 2);
  for (const prompt of prompts) {
    assert.ok(prompt.includes('Station-local observation timestamp: 2026-11-21 21:00:00 UTC+03:00'));
    assert.ok(prompt.includes('Observation age in minutes: 270'));
    assert.ok(prompt.includes('Freshness: STALE'));
    assert.ok(prompt.includes('PM2.5 individual AQI: 52'));
    assert.ok(prompt.includes('not a measurement at the user'));
  }
  assert.ok(prompts[0].includes('Do not repeat numeric readings, dates, or times'));
  assert.ok(prompts[1].includes('use the station-local observation timestamp and state its UTC offset'));
});
