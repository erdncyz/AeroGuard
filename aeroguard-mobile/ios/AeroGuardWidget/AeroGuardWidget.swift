//
//  AeroGuardWidget.swift
//  AeroGuardWidget
//
//  Created by Erdinç Yılmaz on 8.01.2026.
//

import SwiftUI
import WidgetKit

struct Provider: AppIntentTimelineProvider {
    func placeholder(in context: Context) -> SimpleEntry {
        SimpleEntry(
            date: Date(), aqi: 45, status: "İyi", location: "San Francisco",
            configuration: ConfigurationAppIntent())
    }

    func snapshot(for configuration: ConfigurationAppIntent, in context: Context) async
        -> SimpleEntry
    {
        // Mock data for snapshot
        SimpleEntry(
            date: Date(), aqi: 32, status: "İyi", location: "San Francisco",
            configuration: configuration)
    }

    func timeline(for configuration: ConfigurationAppIntent, in context: Context) async -> Timeline<
        SimpleEntry
    > {
        var entries: [SimpleEntry] = []
        let currentDate = Date()

        // Read real data from App Group
        let userDefaults = UserDefaults(suiteName: "group.com.aeroguardios.app")
        let realAQI = userDefaults?.integer(forKey: "currentAQI") ?? 0
        let realLocation = userDefaults?.string(forKey: "currentLocation") ?? "Bilinmeyen Konum"

        // Define status based on AQI
        let status: String
        let colorAQI: Int

        if realAQI > 0 {
            colorAQI = realAQI
            if realAQI <= 50 {
                status = "İyi"
            } else if realAQI <= 100 {
                status = "Orta"
            } else if realAQI <= 150 {
                status = "Hassas"
            } else {
                status = "Kötü"
            }
        } else {
            // MOCK DATA (Fallback if no data yet)
            colorAQI = 42
            status = "İyi"
        }

        // Create the entry with real location
        let entry = SimpleEntry(
            date: currentDate, aqi: colorAQI, status: status, location: realLocation,
            configuration: configuration)
        entries.append(entry)

        return Timeline(entries: entries, policy: .after(Date().addingTimeInterval(15 * 60)))  // Refresh every 15 mins
    }
}

struct SimpleEntry: TimelineEntry {
    let date: Date
    let aqi: Int
    let status: String
    let location: String
    let configuration: ConfigurationAppIntent
}

struct AeroGuardWidgetEntryView: View {
    var entry: Provider.Entry

    var colorForAQI: Color {
        switch entry.aqi {
        case 0...50: return Color.green
        case 51...100: return Color.yellow
        case 101...150: return Color.orange
        case 151...200: return Color.red
        default: return Color.purple
        }
    }

    var textColor: Color {
        // Yellow/Green might need dark text, Red/Purple light text.
        // For simplicity, let's use white for darker, black for lighter.
        if entry.aqi > 50 && entry.aqi <= 100 { return .black }  // Yellow background
        return .white
    }

    var body: some View {
        ZStack {
            // Background
            ContainerRelativeShape()
                .fill(
                    LinearGradient(
                        gradient: Gradient(colors: [colorForAQI.opacity(0.8), colorForAQI]),
                        startPoint: .topLeading, endPoint: .bottomTrailing))

            VStack(alignment: .leading) {
                HStack {
                    Image(systemName: "wind")
                        .font(.caption)
                    Text("AeroGuard")
                        .font(.caption)
                        .bold()
                }
                .foregroundColor(textColor.opacity(0.8))

                Spacer()

                HStack(alignment: .lastTextBaseline) {
                    Text("\(entry.aqi)")
                        .font(.system(size: 34, weight: .heavy, design: .rounded))
                    Text("AQI")
                        .font(.caption)
                        .fontWeight(.bold)
                        .padding(.bottom, 4)
                }
                .foregroundColor(textColor)

                Text(entry.status)
                    .font(.headline)
                    .foregroundColor(textColor)

                Text(entry.location)
                    .font(.caption2)
                    .foregroundColor(textColor.opacity(0.8))
            }
            .padding()
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
                .containerBackground(.fill.tertiary, for: .widget)
        }
        .configurationDisplayName("Hava Kalitesi Widget'ı")
        .description("Ana ekranınıza ekleyerek hava kalitesini anında görün.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

// Preview
#Preview(as: .systemSmall) {
    AeroGuardWidget()
} timeline: {
    SimpleEntry(
        date: .now, aqi: 42, status: "İyi", location: "San Francisco",
        configuration: ConfigurationAppIntent())
    SimpleEntry(
        date: .now, aqi: 75, status: "Orta", location: "San Francisco",
        configuration: ConfigurationAppIntent())
}
