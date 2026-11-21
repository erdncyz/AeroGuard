//
//  AeroGuardWidget.swift
//  AeroGuardWidget
//
//  Created by Erdinç Yılmaz on 8.01.2026.
//

import SwiftUI
import WidgetKit

struct Provider: AppIntentTimelineProvider {
    private let maximumObservationAge: TimeInterval = 3 * 60 * 60

    func placeholder(in context: Context) -> SimpleEntry {
        SimpleEntry(date: Date(), aqi: nil, status: "Veri yok", location: "Konum bekleniyor",
                    observedAt: nil, configuration: ConfigurationAppIntent())
    }

    func snapshot(for configuration: ConfigurationAppIntent, in context: Context) async -> SimpleEntry {
        entry(for: configuration, at: Date())
    }

    func timeline(for configuration: ConfigurationAppIntent, in context: Context) async -> Timeline<SimpleEntry> {
        await WidgetStationRefresher.refreshLastStation()
        let now = Date()
        let current = entry(for: configuration, at: now)
        var entries = [current]
        // Expire the displayed observation even if iOS delays the next network refresh.
        if current.aqi != nil, let observationDate = current.observedAt {
            let expiration = observationDate.addingTimeInterval(maximumObservationAge + 1)
            entries.append(SimpleEntry(date: expiration, aqi: nil, status: "Veri eski",
                                       location: current.location, observedAt: observationDate,
                                       configuration: configuration))
        }
        // This is a requested reload time; WidgetKit controls the actual schedule.
        return Timeline(entries: entries, policy: .after(now.addingTimeInterval(30 * 60)))
    }

    private struct CachedObservation: Decodable {
        let stationId: Int
        let aqi: Double
        let location: String
        let observedAt: Double
    }

    private func validObservation(_ record: [String: Any]?, at date: Date) -> CachedObservation? {
        guard let record, JSONSerialization.isValidJSONObject(record),
            let data = try? JSONSerialization.data(withJSONObject: record),
            let observation = try? JSONDecoder().decode(CachedObservation.self, from: data),
            observation.stationId > 0,
            observation.aqi.isFinite, observation.aqi >= 0, observation.aqi <= 10_000,
            !observation.location.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty,
            observation.observedAt.isFinite, observation.observedAt > 0,
            observation.observedAt <= date.timeIntervalSince1970 + 5 * 60
        else { return nil }
        return observation
    }

    private func entry(for configuration: ConfigurationAppIntent, at date: Date) -> SimpleEntry {
        let defaults = UserDefaults(suiteName: "group.com.aeroguardios.app")
        let appRecord = defaults?.dictionary(forKey: "currentAirQualityObservation")
        var observation = validObservation(appRecord, at: date)
        if let appObservation = observation,
            let widgetObservation = validObservation(defaults?.dictionary(forKey: "widgetAirQualityObservation"), at: date),
            widgetObservation.stationId == appObservation.stationId,
            widgetObservation.observedAt >= appObservation.observedAt
        {
            observation = widgetObservation
        }
        let location = observation?.location ?? "Konum bekleniyor"
        let observedAt = observation.map { Date(timeIntervalSince1970: $0.observedAt) }
        let fresh = observedAt.map { date.timeIntervalSince($0) <= maximumObservationAge } ?? false
        let aqi = fresh ? observation?.aqi : nil
        let status: String
        if let aqi {
            switch aqi {
            case ...50: status = "İyi"
            case ...100: status = "Orta"
            case ...150: status = "Hassas"
            case ...200: status = "Sağlıksız"
            case ...300: status = "Çok sağlıksız"
            default: status = "Tehlikeli"
            }
        } else {
            status = observedAt != nil ? "Veri eski" : "Veri yok"
        }
        return SimpleEntry(date: date, aqi: aqi, status: status, location: location,
                           observedAt: observedAt, configuration: configuration)
    }
}

struct SimpleEntry: TimelineEntry {
    let date: Date
    let aqi: Double?
    let status: String
    let location: String
    let observedAt: Date?
    let configuration: ConfigurationAppIntent
}

struct AeroGuardWidgetEntryView: View {
    let entry: Provider.Entry
    @Environment(\.widgetFamily) private var family

    private var aqiText: String {
        entry.aqi.map { $0.formatted(.number.precision(.fractionLength(0...1))) } ?? "—"
    }

    private var colorForAQI: Color {
        guard let aqi = entry.aqi else { return .secondary }
        switch aqi {
        case ...50: return .green
        case ...100: return .yellow
        case ...150: return .orange
        case ...200: return .red
        case ...300: return .purple
        default: return Color(red: 0.5, green: 0, blue: 0.15)
        }
    }

    private var accessibilityText: String {
        let reading = entry.aqi == nil ? "AQI verisi yok" : "AQI \(aqiText)"
        let time = entry.observedAt.map {
            "Ölçüm zamanı \($0.formatted(date: .abbreviated, time: .shortened))"
        } ?? "Ölçüm zamanı bilinmiyor"
        return "AeroGuard. \(reading). \(entry.status). İstasyon: \(entry.location). \(time)."
    }

    var body: some View {
        familyContent
            .containerBackground(for: .widget) {
                if family == .systemSmall || family == .systemMedium {
                    Color(uiColor: .systemBackground)
                }
            }
            .accessibilityElement(children: .ignore)
            .accessibilityLabel(accessibilityText)
    }

    @ViewBuilder
    private var familyContent: some View {
        switch family {
        case .accessoryCircular:
            circularAccessory
        case .accessoryRectangular:
            rectangularAccessory
        case .accessoryInline:
            Label("AQI \(aqiText) · \(entry.status) · \(entry.location)",
                  systemImage: entry.aqi == nil ? "exclamationmark.circle" : "wind")
        case .systemMedium:
            mediumHome
        default:
            smallHome
        }
    }

    private var circularAccessory: some View {
        ZStack {
            AccessoryWidgetBackground()
            VStack(spacing: 0) {
                Text("AQI")
                    .font(.caption2)
                Text(aqiText)
                    .font(.title3.bold())
                    .monospacedDigit()
                    .minimumScaleFactor(0.6)
                Text(entry.status)
                    .font(.caption2)
                    .lineLimit(1)
                    .minimumScaleFactor(0.6)
            }
        }
    }

    private var rectangularAccessory: some View {
        VStack(alignment: .leading, spacing: 2) {
            Label("AQI \(aqiText) · \(entry.status)",
                  systemImage: entry.aqi == nil ? "exclamationmark.circle" : "wind")
                .font(.headline)
                .lineLimit(1)
                .minimumScaleFactor(0.7)
            Text(entry.location)
                .font(.caption)
                .lineLimit(1)
            observationTime
                .font(.caption2)
        }
    }

    private var smallHome: some View {
        VStack(alignment: .leading, spacing: 3) {
            Label("AeroGuard", systemImage: "wind")
                .font(.caption)
                .foregroundStyle(.secondary)
            Spacer(minLength: 3)
            HStack(alignment: .firstTextBaseline, spacing: 4) {
                Text(aqiText)
                    .font(.largeTitle.bold())
                    .monospacedDigit()
                    .foregroundStyle(colorForAQI)
                    .minimumScaleFactor(0.6)
                Text("AQI")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }
            Text(entry.status)
                .font(.headline)
                .foregroundStyle(colorForAQI)
                .lineLimit(1)
                .minimumScaleFactor(0.7)
            Text(entry.location)
                .font(.caption2)
                .lineLimit(1)
            observationTime
                .font(.caption2)
                .foregroundStyle(.secondary)
        }
    }

    private var mediumHome: some View {
        HStack(spacing: 16) {
            VStack(alignment: .leading, spacing: 4) {
                Label("AeroGuard", systemImage: "wind")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                HStack(alignment: .firstTextBaseline, spacing: 4) {
                    Text(aqiText)
                        .font(.largeTitle.bold())
                        .monospacedDigit()
                        .minimumScaleFactor(0.6)
                    Text("AQI")
                        .font(.caption2)
                }
                .foregroundStyle(colorForAQI)
                Text(entry.status)
                    .font(.headline)
                    .foregroundStyle(colorForAQI)
                    .lineLimit(1)
                    .minimumScaleFactor(0.7)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            VStack(alignment: .leading, spacing: 6) {
                Text(entry.location)
                    .font(.subheadline.bold())
                    .lineLimit(3)
                Text("İstasyon ölçümü")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
                observationTime
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
    }

    @ViewBuilder
    private var observationTime: some View {
        if let observedAt = entry.observedAt {
            Text(observedAt, format: .dateTime.day().month(.twoDigits).hour().minute())
                .lineLimit(1)
                .minimumScaleFactor(0.75)
        } else {
            Text("Ölçüm bekleniyor")
                .lineLimit(1)
        }
    }
}

struct AeroGuardWidget: Widget {
    let kind: String = "AeroGuardWidget"

    var body: some WidgetConfiguration {
        AppIntentConfiguration(
            kind: kind, intent: ConfigurationAppIntent.self, provider: Provider()
        ) { entry in
            AeroGuardWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("AeroGuard Hava Kalitesi")
        .description("Uygulamada belirlenen son istasyonu ana ekranınızda ve kilit ekranınızda izleyin.")
        .supportedFamilies([.systemSmall, .systemMedium, .accessoryCircular, .accessoryRectangular, .accessoryInline])
    }
}

// Preview
#Preview(as: .systemSmall) {
    AeroGuardWidget()
} timeline: {
    SimpleEntry(date: .now, aqi: nil, status: "Veri yok", location: "Konum bekleniyor",
                observedAt: nil, configuration: ConfigurationAppIntent())
    SimpleEntry(date: .now, aqi: 75, status: "Orta", location: "İstanbul",
                observedAt: .now, configuration: ConfigurationAppIntent())
}
