import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = join(root, 'ios/AeroGuardWidget/WidgetStationRefresher.swift');
const temporary = mkdtempSync(join(tmpdir(), 'aeroguard-widget-refresh-'));
const tests = String.raw`
import Foundation

final class MemoryDefaults: UserDefaults {
    var records: [String: Any] = [:]
    override func dictionary(forKey key: String) -> [String: Any]? { records[key] as? [String: Any] }
    override func set(_ value: Any?, forKey key: String) { records[key] = value }
    override func synchronize() -> Bool { true }
}

@main
struct Checks {
    static let appKey = "currentAirQualityObservation"
    static let widgetKey = "widgetAirQualityObservation"
    static let now = Date(timeIntervalSince1970: 1_795_257_000) // 2026-11-21 10:30 UTC
    static var count = 0

    static func expect(_ value: @autoclosure () -> Bool, _ message: String) {
        guard value() else { fatalError(message) }
    }

    static func saved(id: Int = 1, time: Double = 1_795_251_600, aqi: Double = 40) -> [String: Any] {
        ["stationId": id, "aqi": aqi, "location": "Original station", "observedAt": time, "latitude": 41.0, "longitude": 29.0]
    }

    static func storage() -> MemoryDefaults {
        let defaults = MemoryDefaults(suiteName: "widget-tests-\(UUID().uuidString)")!
        defaults.set(saved(), forKey: appKey)
        return defaults
    }

    static func payload(aqi: Any = 0, id: Int = 1, timestamp: String = "2026-11-21T13:00:00+03:00", geo: [Any] = [41.0, 29.0], name: String = "Updated station", status: String = "ok", time: [String: Any]? = nil) -> Data {
        try! JSONSerialization.data(withJSONObject: [
            "status": status,
            "data": ["idx": id, "aqi": aqi, "city": ["name": name, "geo": geo], "time": time ?? ["iso": timestamp]],
        ])
    }

    static func response(_ request: URLRequest, status: Int = 200) -> HTTPURLResponse {
        HTTPURLResponse(url: request.url!, statusCode: status, httpVersion: nil, headerFields: nil)!
    }

    static func run(_ name: String, _ check: () async -> Void) async {
        await check()
        count += 1
        print("PASS \(name)")
    }

    static func main() async {
        await run("success accepts zero and preserves source timestamp in a separate record") {
            let defaults = storage()
            let before = NSDictionary(dictionary: defaults.dictionary(forKey: appKey)!)
            await WidgetStationRefresher.refreshLastStation(defaults: defaults, apiToken: "test-key", now: now) { request in
                expect(request.url?.path.trimmingCharacters(in: CharacterSet(charactersIn: "/")) == "feed/@1", "Must fetch exact saved station")
                expect(URLComponents(url: request.url!, resolvingAgainstBaseURL: false)?.queryItems?.first?.value == "test-key", "Missing token query")
                expect(request.timeoutInterval == 10, "Network timeout must be bounded")
                expect(request.cachePolicy == .reloadIgnoringLocalCacheData, "Cached response could masquerade as fresh")
                expect(request.value(forHTTPHeaderField: "Cache-Control") == "no-cache, no-store", "Must request fresh data")
                return (payload(), response(request))
            }
            let update = defaults.dictionary(forKey: widgetKey)!
            expect(update["aqi"] as? Double == 0, "Measured zero must remain zero")
            expect(update["observedAt"] as? Double == 1_795_255_200, "Must preserve 10:00 UTC source time")
            expect(update["location"] as? String == "Updated station", "Name and value must share the same record")
            expect(before.isEqual(to: defaults.dictionary(forKey: appKey)!), "Widget must never overwrite authoritative app record")
        }

        await run("no saved station or API key makes no network request") {
            let defaults = storage()
            defaults.records.removeAll()
            var requests = 0
            let fetch: WidgetStationRefresher.Fetch = { request in
                requests += 1
                return (payload(), response(request))
            }
            await WidgetStationRefresher.refreshLastStation(defaults: defaults, apiToken: "test-key", now: now, fetch: fetch)
            defaults.set(saved(), forKey: appKey)
            await WidgetStationRefresher.refreshLastStation(defaults: defaults, apiToken: " ", now: now, fetch: fetch)
            expect(requests == 0, "Initialization must not invent a station")
        }

        await run("HTTP and transport failures preserve existing observation age") {
            let defaults = storage()
            defaults.set(saved(aqi: 12), forKey: widgetKey)
            let previous = NSDictionary(dictionary: defaults.dictionary(forKey: widgetKey)!)
            await WidgetStationRefresher.refreshLastStation(defaults: defaults, apiToken: "test-key", now: now) { request in
                (payload(), response(request, status: 503))
            }
            await WidgetStationRefresher.refreshLastStation(defaults: defaults, apiToken: "test-key", now: now) { _ in
                throw URLError(.timedOut)
            }
            expect(previous.isEqual(to: defaults.dictionary(forKey: widgetKey)!), "Errors must not create fresh-looking data")
        }

        await run("invalid AQI and provider errors remain unavailable") {
            for aqi: Any in [NSNull(), "", "-", -1, true, "NaN", "Infinity", "0x10"] {
                let defaults = storage()
                await WidgetStationRefresher.refreshLastStation(defaults: defaults, apiToken: "test-key", now: now) { request in
                    (payload(aqi: aqi), response(request))
                }
                expect(defaults.dictionary(forKey: widgetKey) == nil, "Invalid AQI was accepted: \(aqi)")
            }
            let defaults = storage()
            await WidgetStationRefresher.refreshLastStation(defaults: defaults, apiToken: "test-key", now: now) { request in
                (payload(status: "error"), response(request))
            }
            expect(defaults.dictionary(forKey: widgetKey) == nil, "Error envelope was accepted")
        }

        await run("future and impossible timestamps are rejected") {
            for timestamp in ["2026-11-21T10:36:00Z", "2026-02-30T10:00:00Z", "2026-11-20T24:00:00Z", "2026-11-21T10:00:00", "2026-11-21T10:00:00+99:00"] {
                let defaults = storage()
                await WidgetStationRefresher.refreshLastStation(defaults: defaults, apiToken: "test-key", now: now) { request in
                    (payload(timestamp: timestamp), response(request))
                }
                expect(defaults.dictionary(forKey: widgetKey) == nil, "Invalid source timestamp was accepted: \(timestamp)")
            }
        }

        await run("station-local source time requires and preserves explicit offset") {
            let defaults = storage()
            await WidgetStationRefresher.refreshLastStation(defaults: defaults, apiToken: "test-key", now: now) { request in
                (payload(aqi: "0", time: ["s": "2026-11-21 13:00:00", "tz": "+0300"]), response(request))
            }
            expect(defaults.dictionary(forKey: widgetKey)?["observedAt"] as? Double == 1_795_255_200, "Station timezone was lost")
        }

        await run("old sensor observations do not replace newer app or widget observations") {
            let defaults = storage()
            defaults.set(saved(time: 1_795_256_400), forKey: appKey) // 10:20 UTC
            await WidgetStationRefresher.refreshLastStation(defaults: defaults, apiToken: "test-key", now: now) { request in
                (payload(), response(request))
            }
            expect(defaults.dictionary(forKey: widgetKey) == nil, "Older feed replaced newer app observation")
            defaults.set(saved(), forKey: appKey)
            defaults.set(saved(time: 1_795_256_400), forKey: widgetKey)
            await WidgetStationRefresher.refreshLastStation(defaults: defaults, apiToken: "test-key", now: now) { request in
                (payload(), response(request))
            }
            expect(defaults.dictionary(forKey: widgetKey)?["observedAt"] as? Double == 1_795_256_400, "Older feed replaced newer widget observation")
        }

        await run("response station ID, geographic coordinates and name must be valid") {
            for body in [payload(id: 2), payload(geo: [91, 29]), payload(geo: [41, 181]), payload(geo: [41]), payload(geo: [true, 29]), payload(geo: ["", 29]), payload(geo: ["NaN", 29]), payload(geo: ["Infinity", 29]), payload(name: "  ")] {
                let defaults = storage()
                await WidgetStationRefresher.refreshLastStation(defaults: defaults, apiToken: "test-key", now: now) { request in
                    (body, response(request))
                }
                expect(defaults.dictionary(forKey: widgetKey) == nil, "Wrong station/geography/name was accepted")
            }
        }

        await run("numeric-string coordinates, negative coordinates and origin are preserved") {
            for geo in [["-33.86", "151.2"], ["0", "0"]] {
                let defaults = storage()
                await WidgetStationRefresher.refreshLastStation(defaults: defaults, apiToken: "test-key", now: now) { request in
                    (payload(geo: geo), response(request))
                }
                let record = defaults.dictionary(forKey: widgetKey)
                expect(record?["latitude"] as? Double == Double(geo[0]), "Valid numeric-string latitude was lost")
                expect(record?["longitude"] as? Double == Double(geo[1]), "Valid numeric-string longitude was lost")
            }
        }

        await run("station change during request cannot overwrite app selection") {
            let defaults = storage()
            await WidgetStationRefresher.refreshLastStation(defaults: defaults, apiToken: "test-key", now: now) { request in
                defaults.set(saved(id: 2), forKey: appKey)
                return (payload(), response(request))
            }
            expect(defaults.dictionary(forKey: widgetKey) == nil, "Late response for old station was persisted")
            expect(defaults.dictionary(forKey: appKey)?["stationId"] as? Int == 2, "App station selection was overwritten")
        }

        await run("newer app observation received during request wins") {
            let defaults = storage()
            await WidgetStationRefresher.refreshLastStation(defaults: defaults, apiToken: "test-key", now: now) { request in
                defaults.set(saved(time: 1_795_256_400, aqi: 77), forKey: appKey)
                return (payload(), response(request))
            }
            expect(defaults.dictionary(forKey: widgetKey) == nil, "Late response replaced newer app data")
            expect(defaults.dictionary(forKey: appKey)?["aqi"] as? Double == 77, "App measurement was overwritten")
        }
        print("Widget refresh accuracy: \(count) scenarios passed")
    }
}
`;

try {
  readFileSync(source); // Fail clearly before invoking the compiler if the production source is missing.
  const testPath = join(temporary, 'WidgetRefreshChecks.swift');
  writeFileSync(testPath, tests);
  const compile = spawnSync('xcrun', ['swiftc', '-swift-version', '5', '-parse-as-library', '-module-cache-path', join(temporary, 'modules'), source, testPath, '-o', join(temporary, 'check')], { encoding: 'utf8' });
  if (compile.status !== 0) throw new Error(compile.stderr || compile.stdout || String(compile.error));
  const result = spawnSync(join(temporary, 'check'), [], { encoding: 'utf8' });
  if (result.status !== 0) throw new Error(result.stderr || result.stdout || String(result.error));
  process.stdout.write(result.stdout);
} finally {
  rmSync(temporary, { recursive: true, force: true });
}
