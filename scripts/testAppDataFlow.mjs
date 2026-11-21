import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';

const compile = source => ts.transpileModule(source, { compilerOptions: {
  target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, esModuleInterop: true,
} }).outputText;
const source = await readFile(new URL('../App.tsx', import.meta.url), 'utf8');
// Expose the real component's closures to the harness without changing production code.
const marker = '  if (loading && !stationData) {';
assert.ok(source.includes(marker), 'App test harness insertion marker must exist');
const appCode = compile(source.replace(marker, `
  globalThis.__appTest = { loadLocationData, handleProvinceSelect, selectStation,
    stationData, locationContext, locationError, loading, searchResults,
    searchedStationData, nearbyStations, pollenData, aqiHistory };
${marker}`));
const translationCode = compile(await readFile(new URL('../translations.ts', import.meta.url), 'utf8'));
const constantsCode = compile(await readFile(new URL('../constants.ts', import.meta.url), 'utf8'));

const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};
const station = (idx, latitude = 41) => ({
  idx, aqi: 42, city: { geo: [latitude, 29], name: `Sensor ${idx}`, url: '' },
  time: { iso: new Date().toISOString(), tz: '+03:00' }, iaqi: {}, attributions: [], dominentpol: 'pm25',
});
const position = latitude => ({ coords: { latitude, longitude: 29, accuracy: 12 }, timestamp: Date.now() });
const textOf = node => node == null || typeof node === 'boolean' ? ''
  : typeof node === 'string' || typeof node === 'number' ? String(node)
  : Array.isArray(node) ? node.map(textOf).join(' ') : textOf(node.children);
const nodesOf = node => node == null || typeof node !== 'object' ? []
  : Array.isArray(node) ? node.flatMap(nodesOf) : [node, ...nodesOf(node.children)];

function harness(options = {}) {
  const cells = [];
  let cursor = 0, dirty = true, pending = [], tree, context;
  const equal = (left, right) => left && right && left.length === right.length && left.every((value, i) => Object.is(value, right[i]));
  const hooks = {
    useState(initial) {
      const i = cursor++;
      if (!cells[i]) {
        const cell = { value: typeof initial === 'function' ? initial() : initial };
        cell.set = value => { cell.value = typeof value === 'function' ? value(cell.value) : value; dirty = true; };
        cells[i] = cell;
      }
      return [cells[i].value, cells[i].set];
    },
    useRef(initial) {
      const i = cursor++;
      cells[i] ??= { value: { current: initial } };
      return cells[i].value;
    },
    useCallback(callback, dependencies) {
      const i = cursor++;
      if (!cells[i] || !equal(cells[i].dependencies, dependencies)) cells[i] = { value: callback, dependencies };
      return cells[i].value;
    },
    useEffect(callback, dependencies) {
      const i = cursor++;
      const cell = cells[i] ??= {};
      if (!equal(cell.dependencies, dependencies)) {
        cell.dependencies = dependencies;
        pending.push(() => { cell.cleanup?.(); cell.cleanup = callback(); });
      }
    },
  };
  const react = { ...hooks, createElement: (type, props, ...children) => ({ type, props: props ?? {}, children }), Fragment: Symbol('Fragment') };
  const waqi = {
    isValidCoordinates: (lat, lng) => Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180,
    getDistanceFromLatLonInKm: () => 1,
    fetchByGeo: async () => station(1), fetchByIP: async () => station(1),
    fetchNearbyStations: async () => [], searchStations: async () => [], fetchStationById: async id => station(id),
    ...options.waqi,
  };
  const modules = {
    react: { __esModule: true, default: react, ...hooks },
    './services/waqiService': waqi,
    './services/pollenService': { fetchPollenData: options.pollen ?? (async () => ({ current: null })) },
    './services/aqiHistoryService': { fetchAQIHistory: options.history ?? (async () => []) },
    './services/geminiService': { isGeminiConfigured: () => false },
    './services/shareCardService': { shareWithImage: () => {} },
  };
  let timerId = 0;
  const bridgeMessages = [];
  const window = {
    location: { hash: '' }, addEventListener() {}, removeEventListener() {},
    setTimeout: () => ++timerId, setInterval: () => ++timerId,
    webkit: { messageHandlers: { airQualityData: { postMessage: value => bridgeMessages.push(value) } } },
  };
  context = vm.createContext({
    console: { error() {}, warn() {}, log() {} }, Date, Intl, Map, Set, Number, Math,
    navigator: { geolocation: { getCurrentPosition: options.geolocation ?? (success => success(position(41))) } },
    window, document: { hidden: false, getElementById: () => null },
    localStorage: { setItem() {}, removeItem() {}, clear() {} },
    IntersectionObserver: class { observe() {} disconnect() {} },
    clearTimeout() {}, clearInterval() {},
  });
  const evaluate = (code, filename) => {
    const module = { exports: {} };
    const wrapped = new vm.Script(`(function(require, module, exports) { ${code}\n})`, { filename }).runInContext(context);
    wrapped(id => {
      if (id in modules) return modules[id];
      if (id.startsWith('./components/')) return { __esModule: true, default: function Component() {} };
      throw new Error(`Unmocked App dependency ${id}`);
    }, module, module.exports);
    return module.exports;
  };
  modules['./translations'] = evaluate(translationCode, 'translations.ts');
  modules['./constants'] = evaluate(constantsCode, 'constants.ts');
  const App = evaluate(appCode, 'App.tsx').default;
  function render() {
    cursor = 0;
    dirty = false;
    tree = App();
    const effects = pending;
    pending = [];
    effects.forEach(effect => effect());
  }
  render();
  return {
    get api() { return context.__appTest; },
    get text() { return textOf(tree); },
    get tree() { return tree; },
    bridgeMessages,
    async flush() {
      // Resolve promise continuations, then rerender changed hooks and their effects.
      for (let i = 0; i < 16; i++) {
        await Promise.resolve();
        if (dirty) render();
      }
    },
    dispose() { cells.forEach(cell => cell?.cleanup?.()); },
  };
}

test('a known GPS position with an API failure never silently falls back to IP', async () => {
  let geoCalls = 0, ipCalls = 0;
  const h = harness({ waqi: {
    fetchByGeo: async () => { geoCalls++; throw new Error('sensor unavailable'); },
    fetchByIP: async () => { ipCalls++; return station(9); },
  } });
  await h.flush();
  assert.equal(geoCalls, 1);
  assert.equal(ipCalls, 0);
  assert.equal(h.api.locationError, true);
  assert.equal(h.api.stationData, null);
  assert.equal(h.api.loading, false);
  h.dispose();
});

test('a later location request wins when the earlier feed resolves last', async () => {
  const first = deferred(), second = deferred();
  let locationCount = 0;
  const h = harness({
    geolocation: success => success(position(++locationCount)),
    waqi: { fetchByGeo: lat => lat === 1 ? first.promise : second.promise },
  });
  await h.flush();
  const latestRequest = h.api.loadLocationData();
  await h.flush();
  second.resolve(station(2, 2));
  await latestRequest;
  await h.flush();
  assert.equal(h.api.stationData.idx, 2);
  first.resolve(station(1, 1));
  await h.flush();
  assert.equal(h.api.stationData.idx, 2);
  assert.equal(h.api.locationContext.lat, 2);
  h.dispose();
});

test('explicit station selection fetches its exact UID without ambiguous name lookup', async () => {
  const ids = [];
  let searches = 0;
  const h = harness({ waqi: {
    fetchStationById: async id => { ids.push(id); return station(id); },
    searchStations: async () => { searches++; return []; },
  } });
  await h.flush();
  await h.api.selectStation(87);
  await h.flush();
  assert.deepEqual(ids, [87]);
  assert.equal(searches, 0);
  assert.equal(h.api.searchedStationData.idx, 87);
  h.dispose();
});

test('ambiguous province results require a station choice instead of displaying the first match', async () => {
  let stationCalls = 0;
  const matches = [{ uid: 10, station: { name: 'First sensor' } }, { uid: 11, station: { name: 'Second sensor' } }];
  const h = harness({ waqi: {
    searchStations: async () => matches,
    fetchStationById: async id => { stationCalls++; return station(id); },
  } });
  await h.flush();
  await h.api.handleProvinceSelect('Istanbul');
  await h.flush();
  assert.equal(stationCalls, 0);
  assert.equal(h.api.searchedStationData, null);
  assert.equal(h.api.searchResults.length, 2);
  h.dispose();
});

test('old pollen and history requests cannot overwrite data for a newer location', async () => {
  const pollenFirst = deferred(), pollenSecond = deferred(), historyFirst = deferred(), historySecond = deferred();
  const pollenCoordinates = [], historyCoordinates = [];
  let locationCount = 0;
  const h = harness({
    geolocation: success => success(position(++locationCount)),
    waqi: { fetchByGeo: async lat => station(lat, lat + 10) },
    pollen: (lat, lng) => { pollenCoordinates.push([lat, lng]); return lat === 1 ? pollenFirst.promise : pollenSecond.promise; },
    history: (lat, lng) => { historyCoordinates.push([lat, lng]); return lat === 1 ? historyFirst.promise : historySecond.promise; },
  });
  await h.flush();
  await h.api.loadLocationData();
  await h.flush();
  pollenSecond.resolve({ current: { grass: 22 } });
  historySecond.resolve([{ date: '2026-11-20', pm25: 22 }]);
  await h.flush();
  pollenFirst.resolve({ current: { grass: 999 } });
  historyFirst.resolve([{ date: '2026-11-19', pm25: 999 }]);
  await h.flush();
  assert.equal(h.api.pollenData.grass, 22);
  assert.equal(h.api.aqiHistory[0].pm25, 22);
  // Model data uses the real device point, even when the reporting station is elsewhere.
  assert.deepEqual(pollenCoordinates, [[1, 29], [2, 29]]);
  assert.deepEqual(historyCoordinates, [[1, 29], [2, 29]]);
  h.dispose();
});

test('IP fallback is explicitly presented as approximate location', async () => {
  const h = harness({ geolocation: (_success, failure) => failure({ code: 1 }) });
  await h.flush();
  assert.equal(h.api.locationContext.source, 'ip');
  assert.match(h.text, /IP üzerinden yaklaşık konum/);
  assert.match(h.text, /VPN/);
  h.dispose();
});

test('choosing a nearby station opens its detail without overwriting primary location or widget data', async () => {
  const h = harness({ waqi: {
    fetchNearbyStations: async () => [{ uid: 2, aqi: 60, name: 'Nearby sensor', distance: 3, lat: 42, lon: 29 }],
  } });
  await h.flush();
  const section = nodesOf(h.tree).find(node => node.props?.id === 'section-nearby');
  assert.ok(section);
  const button = nodesOf(section).find(node => node.type === 'button');
  assert.ok(button);
  button.props.onClick();
  await h.flush();
  assert.equal(h.api.searchedStationData.idx, 2);
  assert.equal(h.api.stationData.idx, 1);
  assert.equal(h.api.locationContext.lat, 41);
  assert.ok(h.bridgeMessages.length >= 1);
  assert.ok(h.bridgeMessages.every(message => message.stationId === 1));
  h.dispose();
});

test('country station choices preserve exact UIDs despite ambiguous comma-separated names', async () => {
  const searchQueries = [], ids = [];
  const h = harness({ waqi: {
    searchStations: async query => {
      searchQueries.push(query);
      return [
        { uid: 17, aqi: '12', station: { name: 'Same name, Misleading city', geo: [52, 13] } },
        { uid: 18, aqi: '14', station: { name: 'Same name, Misleading city', geo: [53, 14] } },
      ];
    },
    fetchStationById: async id => { ids.push(id); return station(id); },
  } });
  await h.flush();
  let section = nodesOf(h.tree).find(node => node.props?.id === 'section-explore');
  const country = nodesOf(section).filter(node => node.type === 'select')[0];
  await country.props.onChange({ target: { value: 'Germany' } });
  await h.flush();
  section = nodesOf(h.tree).find(node => node.props?.id === 'section-explore');
  const stationSelect = nodesOf(section).filter(node => node.type === 'select')[1];
  const options = nodesOf(stationSelect).filter(node => node.type === 'option').map(node => node.props.value);
  assert.deepEqual(options, ['', '17', '18']);
  await stationSelect.props.onChange({ target: { value: '18' } });
  await h.flush();
  section = nodesOf(h.tree).find(node => node.props?.id === 'section-explore');
  const searchButton = nodesOf(section).find(node => node.type === 'button');
  searchButton.props.onClick();
  await h.flush();
  assert.deepEqual(searchQueries, ['Germany']);
  assert.deepEqual(ids, [18]);
  assert.equal(h.api.searchedStationData.idx, 18);
  h.dispose();
});
