import Foundation
import CoreFoundation
#if canImport(FoundationNetworking)
import FoundationNetworking
#endif

enum WidgetStationRefresher {
    typealias Fetch = (URLRequest) async throws -> (Data, URLResponse)

    // The app owns the selected station. A widget refresh never acquires GPS or changes it.
    static func refreshLastStation(
        defaults: UserDefaults? = UserDefaults(suiteName: "group.com.aeroguardios.app"),
        apiToken: String? = Bundle.main.object(forInfoDictionaryKey: "WAQIAPIToken") as? String,
        now: Date = Date(),
        fetch: Fetch? = nil
    ) async {
        guard let defaults,
              let token = apiToken?.trimmingCharacters(in: .whitespacesAndNewlines), !token.isEmpty,
              let initial = defaults.dictionary(forKey: "currentAirQualityObservation"),
              let requestedID = positiveInteger(initial["stationId"])
        else { return }

        var components = URLComponents(string: "https://api.waqi.info/feed/@\(requestedID)/")!
        components.queryItems = [URLQueryItem(name: "token", value: token)]
        guard let url = components.url else { return }
        var request = URLRequest(url: url, cachePolicy: .reloadIgnoringLocalCacheData, timeoutInterval: 10)
        request.setValue("no-cache, no-store", forHTTPHeaderField: "Cache-Control")

        do {
            let result: (Data, URLResponse)
            if let fetch {
                result = try await fetch(request)
            } else {
                result = try await URLSession.shared.data(for: request)
            }
            guard let response = result.1 as? HTTPURLResponse, (200..<300).contains(response.statusCode),
                  let envelope = try? JSONDecoder().decode(Envelope.self, from: result.0),
                  envelope.status == "ok", envelope.data.idx == requestedID
            else { return }
            let station = envelope.data
            let name = station.city.name.trimmingCharacters(in: .whitespacesAndNewlines)
            guard !name.isEmpty, station.city.geo.count == 2,
                  (-90...90).contains(station.city.geo[0].value),
                  (-180...180).contains(station.city.geo[1].value),
                  let observationDate = observationDate(station.time),
                  observationDate.timeIntervalSince1970 > 0,
                  observationDate.timeIntervalSince(now) <= 5 * 60
            else { return }

            // Re-read after networking: the app may have selected a different station or
            // received a newer measurement while this request was in flight.
            defaults.synchronize()
            guard let current = defaults.dictionary(forKey: "currentAirQualityObservation"),
                  positiveInteger(current["stationId"]) == requestedID,
                  let currentTime = finiteNumber(current["observedAt"]),
                  observationDate.timeIntervalSince1970 >= currentTime
            else { return }
            if let previous = defaults.dictionary(forKey: "widgetAirQualityObservation"),
               positiveInteger(previous["stationId"]) == requestedID,
               let previousTime = finiteNumber(previous["observedAt"]),
               previousTime > observationDate.timeIntervalSince1970 { return }

            let record: [String: Any] = [
                "stationId": requestedID,
                "aqi": station.aqi.value,
                "location": name,
                "observedAt": observationDate.timeIntervalSince1970,
                "latitude": station.city.geo[0].value,
                "longitude": station.city.geo[1].value,
            ]
            // A separate atomic record cannot clobber an app update between check and save.
            // The provider also checks station ID and time when choosing between records.
            defaults.set(record, forKey: "widgetAirQualityObservation")
        } catch {
            // Keep the original measurement and its original age on network/parse failure.
        }
    }

    private struct Envelope: Decodable {
        let status: String
        let data: Station
    }

    private struct Station: Decodable {
        let idx: Int
        let aqi: AQI
        let city: City
        let time: ObservationTime
    }

    private struct City: Decodable {
        let name: String
        let geo: [NumericValue]
    }

    private struct ObservationTime: Decodable {
        let iso: String?
        let s: String?
        let tz: String?
    }

    private struct NumericValue: Decodable {
        let value: Double

        init(from decoder: Decoder) throws {
            let container = try decoder.singleValueContainer()
            let number: Double?
            if let numeric = try? container.decode(Double.self) {
                number = numeric
            } else if let string = try? container.decode(String.self),
                      string.trimmingCharacters(in: .whitespacesAndNewlines).range(
                        of: #"^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$"#,
                        options: .regularExpression) != nil {
                number = Double(string.trimmingCharacters(in: .whitespacesAndNewlines))
            } else {
                number = nil
            }
            guard let number, number.isFinite else {
                throw DecodingError.dataCorruptedError(in: container, debugDescription: "Invalid numeric observation")
            }
            value = number
        }
    }

    private struct AQI: Decodable {
        let value: Double

        init(from decoder: Decoder) throws {
            let number = try NumericValue(from: decoder).value
            guard number >= 0, number <= 10_000 else {
                throw DecodingError.dataCorruptedError(in: try decoder.singleValueContainer(), debugDescription: "Invalid AQI observation")
            }
            value = number
        }
    }

    private static func finiteNumber(_ raw: Any?) -> Double? {
        guard let number = raw as? NSNumber, CFGetTypeID(number) != CFBooleanGetTypeID(), number.doubleValue.isFinite else { return nil }
        return number.doubleValue
    }

    private static func positiveInteger(_ raw: Any?) -> Int? {
        guard let value = finiteNumber(raw), value > 0, value.rounded() == value, value < Double(Int.max) else { return nil }
        return Int(value)
    }

    private static func observationDate(_ time: ObservationTime) -> Date? {
        let timestamp: String
        if let iso = time.iso {
            timestamp = iso
        } else if let local = time.s, let offset = time.tz {
            timestamp = local.replacingOccurrences(of: " ", with: "T") + offset
        } else {
            return nil
        }
        let pattern = #"^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?(Z|[+-]\d{2}:?\d{2})$"#
        guard let regex = try? NSRegularExpression(pattern: pattern, options: .caseInsensitive),
              let match = regex.firstMatch(in: timestamp, range: NSRange(timestamp.startIndex..., in: timestamp)),
              match.range.length == timestamp.utf16.count
        else { return nil }
        func part(_ index: Int) -> String? {
            guard let range = Range(match.range(at: index), in: timestamp) else { return nil }
            return String(timestamp[range])
        }
        guard let year = part(1).flatMap(Int.init), let month = part(2).flatMap(Int.init),
              let day = part(3).flatMap(Int.init), let hour = part(4).flatMap(Int.init),
              let minute = part(5).flatMap(Int.init), let suffix = part(7)
        else { return nil }
        let second = part(6).flatMap(Int.init) ?? 0
        guard (0...23).contains(hour), (0...59).contains(minute), (0...59).contains(second) else { return nil }
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone(secondsFromGMT: 0)!
        let expected = DateComponents(year: year, month: month, day: day, hour: hour, minute: minute, second: second)
        guard let calendarDate = calendar.date(from: expected),
              calendar.dateComponents([.year, .month, .day, .hour, .minute, .second], from: calendarDate) == expected
        else { return nil }

        var normalized = timestamp
        if suffix.uppercased() != "Z" {
            let digits = suffix.dropFirst().replacingOccurrences(of: ":", with: "")
            guard let offsetHours = Int(digits.prefix(2)), let offsetMinutes = Int(digits.suffix(2)),
                  offsetHours <= 14, offsetMinutes < 60, offsetHours < 14 || offsetMinutes == 0
            else { return nil }
            if !suffix.contains(":") {
                normalized = String(timestamp.dropLast(suffix.count)) + String(suffix.prefix(3)) + ":" + String(suffix.suffix(2))
            }
        }
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let date = formatter.date(from: normalized) { return date }
        formatter.formatOptions = [.withInternetDateTime]
        return formatter.date(from: normalized)
    }
}
