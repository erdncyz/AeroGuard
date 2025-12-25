import WidgetKit
import SwiftUI

// MARK: - Widget Entry
struct AirQualityEntry: TimelineEntry {
    let date: Date
    let aqi: Int
    let city: String
    let status: String
    let pm25: Int?
    let temperature: Int?
}

// MARK: - Widget Provider
struct AirQualityProvider: TimelineProvider {
    func placeholder(in context: Context) -> AirQualityEntry {
        AirQualityEntry(
            date: Date(),
            aqi: 42,
            city: "İstanbul",
            status: "İyi",
            pm25: 12,
            temperature: 22
        )
    }
    
    func getSnapshot(in context: Context, completion: @escaping (AirQualityEntry) -> Void) {
        let entry = AirQualityEntry(
            date: Date(),
            aqi: 42,
            city: "İstanbul",
            status: "İyi",
            pm25: 12,
            temperature: 22
        )
        completion(entry)
    }
    
    func getTimeline(in context: Context, completion: @escaping (Timeline<AirQualityEntry>) -> Void) {
        // Fetch real data from API
        fetchAirQualityData { aqi, city, status, pm25, temp in
            let entry = AirQualityEntry(
                date: Date(),
                aqi: aqi,
                city: city,
                status: status,
                pm25: pm25,
                temperature: temp
            )
            
            // Update every 30 minutes
            let nextUpdate = Calendar.current.date(byAdding: .minute, value: 30, to: Date())!
            let timeline = Timeline(entries: [entry], policy: .after(nextUpdate))
            completion(timeline)
        }
    }
    
    private func fetchAirQualityData(completion: @escaping (Int, String, String, Int?, Int?) -> Void) {
        // Call WAQI API
        let url = URL(string: "https://api.waqi.info/feed/here/?token=YOUR_TOKEN")!
        
        URLSession.shared.dataTask(with: url) { data, response, error in
            guard let data = data,
                  let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                  let dataDict = json["data"] as? [String: Any],
                  let aqi = dataDict["aqi"] as? Int,
                  let city = (dataDict["city"] as? [String: Any])?["name"] as? String else {
                completion(42, "Unknown", "İyi", nil, nil)
                return
            }
            
            let iaqi = dataDict["iaqi"] as? [String: Any]
            let pm25 = (iaqi?["pm25"] as? [String: Any])?["v"] as? Int
            let temp = (iaqi?["t"] as? [String: Any])?["v"] as? Int
            
            let status = getAQIStatus(aqi: aqi)
            completion(aqi, city, status, pm25, temp)
        }.resume()
    }
    
    private func getAQIStatus(aqi: Int) -> String {
        switch aqi {
        case 0...50: return "İyi"
        case 51...100: return "Orta"
        case 101...150: return "Hassas"
        case 151...200: return "Sağlıksız"
        case 201...300: return "Çok Sağlıksız"
        default: return "Tehlikeli"
        }
    }
}

// MARK: - Widget Views

// Small Widget (Classic)
struct SmallWidgetView: View {
    let entry: AirQualityEntry
    
    var body: some View {
        ZStack {
            getAQIColor(aqi: entry.aqi)
            
            VStack(spacing: 8) {
                HStack {
                    Text("AEROGUARD")
                        .font(.system(size: 9, weight: .black))
                        .foregroundColor(.white.opacity(0.9))
                    Spacer()
                    Circle()
                        .fill(Color.white.opacity(0.4))
                        .frame(width: 8, height: 8)
                }
                
                Spacer()
                
                VStack(spacing: 4) {
                    Text("\(entry.aqi)")
                        .font(.system(size: 48, weight: .black))
                        .foregroundColor(.white)
                    Text("AQI")
                        .font(.system(size: 9, weight: .black))
                        .foregroundColor(.white.opacity(0.8))
                }
                
                Spacer()
                
                Text(entry.status.uppercased())
                    .font(.system(size: 9, weight: .black))
                    .foregroundColor(.white)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 6)
                    .background(Color.white.opacity(0.25))
                    .cornerRadius(12)
            }
            .padding(16)
        }
    }
    
    private func getAQIColor(aqi: Int) -> Color {
        switch aqi {
        case 0...50: return Color(red: 16/255, green: 185/255, blue: 129/255)
        case 51...100: return Color(red: 234/255, green: 179/255, blue: 8/255)
        case 101...150: return Color(red: 249/255, green: 115/255, blue: 22/255)
        case 151...200: return Color(red: 239/255, green: 68/255, blue: 68/255)
        case 201...300: return Color(red: 168/255, green: 85/255, blue: 247/255)
        default: return Color(red: 136/255, green: 19/255, blue: 55/255)
        }
    }
}

// Medium Widget (Wide)
struct MediumWidgetView: View {
    let entry: AirQualityEntry
    
    var body: some View {
        ZStack {
            getAQIColor(aqi: entry.aqi)
            
            HStack(spacing: 20) {
                // AQI Circle
                VStack(spacing: 4) {
                    Text("\(entry.aqi)")
                        .font(.system(size: 36, weight: .black))
                        .foregroundColor(.white)
                    Text("AQI")
                        .font(.system(size: 9, weight: .black))
                        .foregroundColor(.white.opacity(0.8))
                }
                .frame(width: 80)
                
                Rectangle()
                    .fill(Color.white.opacity(0.2))
                    .frame(width: 1)
                
                // Info
                VStack(alignment: .leading, spacing: 8) {
                    Text(entry.city)
                        .font(.system(size: 14, weight: .black))
                        .foregroundColor(.white)
                    Text(entry.status.uppercased())
                        .font(.system(size: 10, weight: .black))
                        .foregroundColor(.white.opacity(0.8))
                    
                    if let pm25 = entry.pm25 {
                        HStack {
                            Text("PM2.5:")
                                .font(.system(size: 9, weight: .bold))
                                .foregroundColor(.white.opacity(0.7))
                            Text("\(pm25)")
                                .font(.system(size: 11, weight: .black))
                                .foregroundColor(.white)
                        }
                    }
                }
                
                Spacer()
                
                // Temperature
                if let temp = entry.temperature {
                    VStack {
                        Text("\(temp)°")
                            .font(.system(size: 24, weight: .black))
                            .foregroundColor(.white)
                    }
                    .padding(12)
                    .background(Color.white.opacity(0.2))
                    .cornerRadius(16)
                }
            }
            .padding(20)
        }
    }
    
    private func getAQIColor(aqi: Int) -> Color {
        switch aqi {
        case 0...50: return Color(red: 16/255, green: 185/255, blue: 129/255)
        case 51...100: return Color(red: 234/255, green: 179/255, blue: 8/255)
        case 101...150: return Color(red: 249/255, green: 115/255, blue: 22/255)
        case 151...200: return Color(red: 239/255, green: 68/255, blue: 68/255)
        case 201...300: return Color(red: 168/255, green: 85/255, blue: 247/255)
        default: return Color(red: 136/255, green: 19/255, blue: 55/255)
        }
    }
}

// MARK: - Widget Configuration
struct AeroGuardWidget: Widget {
    let kind: String = "AeroGuardWidget"
    
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: AirQualityProvider()) { entry in
            if #available(iOS 17.0, *) {
                AeroGuardWidgetEntryView(entry: entry)
                    .containerBackground(.fill.tertiary, for: .widget)
            } else {
                AeroGuardWidgetEntryView(entry: entry)
                    .padding()
                    .background()
            }
        }
        .configurationDisplayName("AeroGuard")
        .description("Hava kalitesi bilgilerini görüntüleyin")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

struct AeroGuardWidgetEntryView: View {
    @Environment(\.widgetFamily) var family
    var entry: AirQualityProvider.Entry
    
    var body: some View {
        switch family {
        case .systemSmall:
            SmallWidgetView(entry: entry)
        case .systemMedium:
            MediumWidgetView(entry: entry)
        default:
            SmallWidgetView(entry: entry)
        }
    }
}

#Preview(as: .systemSmall) {
    AeroGuardWidget()
} timeline: {
    AirQualityEntry(date: .now, aqi: 42, city: "İstanbul", status: "İyi", pm25: 12, temperature: 22)
    AirQualityEntry(date: .now, aqi: 156, city: "Ankara", status: "Sağlıksız", pm25: 89, temperature: 18)
}
