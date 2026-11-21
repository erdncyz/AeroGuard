import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import vm from 'node:vm';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const webView = readFileSync(join(root, 'ios/AeroGuardMobile/Views/WebView.swift'), 'utf8');
const script = webView.split('let scriptSource = """')[1].split('"""')[0];
const messages = [];
const timers = new Map();
let nextTimer = 0;
const context = {
  navigator: { geolocation: {} },
  window: { webkit: { messageHandlers: { locationHandler: { postMessage: message => messages.push(message) } } } },
  setTimeout(callback) { const id = ++nextTimer; timers.set(id, callback); return id; },
  clearTimeout(id) { timers.delete(id); },
};
vm.runInNewContext(script, context);
const getPosition = context.navigator.geolocation.getCurrentPosition;
const results = [];
getPosition(position => results.push(['first', position]), undefined, { timeout: 1000 });
getPosition(position => results.push(['second', position]), undefined, { timeout: 1000 });
assert.notEqual(messages[0].requestId, messages[1].requestId);
const position = { coords: { latitude: 41, longitude: 29, accuracy: 12 }, timestamp: 123456 };
context.window.aeroGuardLocationResult([messages[0].requestId, messages[1].requestId], position, null);
assert.deepEqual(results, [['first', position], ['second', position]]);
assert.equal(timers.size, 0);

let timedOut = false;
getPosition(() => assert.fail('An expired request received a late GPS result'), error => {
  timedOut = error.code === 3;
}, { timeout: 1 });
const expiredId = messages.at(-1).requestId;
[...timers.values()][0]();
assert.equal(timedOut, true);
assert.equal(messages.at(-1).cancel, true);
context.window.aeroGuardLocationResult([expiredId], position, null);
let denial;
getPosition(() => assert.fail('Denied GPS request succeeded'), error => { denial = error.code; });
context.window.aeroGuardLocationResult([messages.at(-1).requestId], null, { code: 1, message: 'Permission denied' });
assert.equal(denial, 1);
console.log('PASS: native GPS bridge concurrency, timeout, late-result suppression and denial');

// Compile the actual widget provider against small host-side WidgetKit/storage stand-ins.
// This executes the same freshness and missing-data logic without a simulator or app-group writes.
const widget = readFileSync(join(root, 'ios/AeroGuardWidget/AeroGuardWidget.swift'), 'utf8');
const provider = widget.slice(widget.indexOf('struct Provider:'), widget.indexOf('struct AeroGuardWidgetEntryView:'))
  .replaceAll('UserDefaults', 'MemoryDefaults');
const temp = mkdtempSync(join(tmpdir(), 'aeroguard-native-data-test-'));
const swift = `import Foundation
struct Context {}
protocol AppIntentTimelineProvider {}
protocol TimelineEntry {}
struct ConfigurationAppIntent {}
enum WidgetStationRefresher {
    static var calls = 0
    static func refreshLastStation() async { calls += 1 }
}
enum TimelinePolicy { case after(Date) }
struct Timeline<T> { let entries: [T]; let policy: TimelinePolicy }
final class MemoryDefaults {
    static var record: [String: Any]?
    static var widgetRecord: [String: Any]?
    init?(suiteName: String) {}
    func dictionary(forKey key: String) -> [String: Any]? {
        key == "widgetAirQualityObservation" ? Self.widgetRecord : Self.record
    }
}
${provider}
@main struct Check {
    static func main() async {
        let provider = Provider()
        let config = ConfigurationAppIntent()
        let context = Context()
        MemoryDefaults.record = nil
        var entry = await provider.snapshot(for: config, in: context)
        precondition(entry.aqi == nil && entry.status == "Veri yok")
        MemoryDefaults.record = ["stationId": 1, "aqi": 0.0, "location": "İstanbul", "observedAt": Date().timeIntervalSince1970]
        entry = await provider.snapshot(for: config, in: context)
        precondition(entry.aqi == 0 && entry.status == "İyi" && entry.location == "İstanbul")
        let timeline = await provider.timeline(for: config, in: context)
        precondition(timeline.entries.count == 2 && timeline.entries[1].aqi == nil && timeline.entries[1].status == "Veri eski")
        precondition(WidgetStationRefresher.calls == 1)
        if case .after(let reload) = timeline.policy {
            precondition(reload.timeIntervalSinceNow > 29 * 60 && reload.timeIntervalSinceNow <= 30 * 60)
        }
        MemoryDefaults.record = ["stationId": 1, "aqi": 45.0, "location": "Ankara", "observedAt": Date().addingTimeInterval(-4 * 3600).timeIntervalSince1970]
        entry = await provider.snapshot(for: config, in: context)
        precondition(entry.aqi == nil && entry.status == "Veri eski" && entry.observedAt != nil)
        MemoryDefaults.record = ["stationId": 1, "aqi": 45.0, "location": "Ankara"]
        entry = await provider.snapshot(for: config, in: context)
        precondition(entry.aqi == nil && entry.status == "Veri yok")
        MemoryDefaults.record = ["stationId": 1, "aqi": -1.0, "observedAt": Date().timeIntervalSince1970]
        entry = await provider.snapshot(for: config, in: context)
        precondition(entry.aqi == nil && entry.status == "Veri yok")
        let freshTime = Date().addingTimeInterval(-60).timeIntervalSince1970
        MemoryDefaults.record = ["stationId": 1, "aqi": 45.0, "location": "İstanbul", "observedAt": freshTime - 3600]
        MemoryDefaults.widgetRecord = ["stationId": 1, "aqi": 0.0, "location": "İstanbul", "observedAt": freshTime]
        entry = await provider.snapshot(for: config, in: context)
        precondition(entry.aqi == 0 && entry.location == "İstanbul" && entry.observedAt?.timeIntervalSince1970 == freshTime)
        MemoryDefaults.widgetRecord = ["stationId": 2, "aqi": 190.0, "location": "Ankara", "observedAt": freshTime]
        entry = await provider.snapshot(for: config, in: context)
        precondition(entry.aqi == 45 && entry.location == "İstanbul")
        MemoryDefaults.widgetRecord = ["stationId": 1, "aqi": -1.0, "location": "İstanbul", "observedAt": freshTime]
        entry = await provider.snapshot(for: config, in: context)
        precondition(entry.aqi == 45)
        MemoryDefaults.widgetRecord = ["stationId": 1, "aqi": 99.0, "location": "İstanbul", "observedAt": freshTime - 7200]
        entry = await provider.snapshot(for: config, in: context)
        precondition(entry.aqi == 45)
        precondition(WidgetStationRefresher.calls == 1, "Snapshots must not request the network")
        print("PASS: widget missing/zero/stale/invalid data, source timestamp and scheduled expiry")
        print("PASS: timeline requests independent refresh; snapshots preserve the latest valid matching-station observation")
    }
}
`;
writeFileSync(join(temp, 'WidgetDataCheck.swift'), swift);
const compile = spawnSync('xcrun', ['swiftc', '-parse-as-library', '-module-cache-path', join(temp, 'modules'), join(temp, 'WidgetDataCheck.swift'), '-o', join(temp, 'check')], { encoding: 'utf8' });
if (compile.status !== 0) {
  process.stderr.write(compile.stderr || compile.error?.message || 'Swift compiler unavailable\n');
  process.exit(1);
}
const check = spawnSync(join(temp, 'check'), [], { encoding: 'utf8' });
process.stdout.write(check.stdout);
process.stderr.write(check.stderr);
if (check.status !== 0) process.exit(check.status ?? 1);
