import SwiftUI
import WeatherKit

struct WeatherView: View {
    @StateObject private var viewModel = WeatherViewModel()

    var body: some View {
        NavigationView {
            ZStack {
                // White background
                Color.white
                    .ignoresSafeArea()

                if viewModel.isLoading {
                    VStack(spacing: 20) {
                        ProgressView()
                            .scaleEffect(1.5)
                            .tint(.blue)
                        Text("Hava durumu yükleniyor...")
                            .foregroundColor(.primary)
                            .font(.headline)
                            .fontWeight(.medium)
                    }
                } else if let error = viewModel.errorMessage {
                    VStack(spacing: 20) {
                        Image(systemName: "exclamationmark.triangle.fill")
                            .font(.system(size: 60))
                            .foregroundColor(.orange)
                        Text(error)
                            .foregroundColor(.primary)
                            .multilineTextAlignment(.center)
                            .font(.headline)
                            .padding(.horizontal, 32)
                    }
                } else if let weather = viewModel.currentWeather {
                    ScrollView(showsIndicators: false) {
                        VStack(spacing: 0) {
                            // Hero Section with Location and Main Weather
                            VStack(spacing: 16) {
                                // Location with icon
                                HStack(spacing: 8) {
                                    Image(systemName: "location.fill")
                                        .font(.system(size: 16))
                                        .foregroundColor(.blue)
                                    Text(viewModel.locationName)
                                        .font(.title3)
                                        .fontWeight(.semibold)
                                        .foregroundColor(.primary)
                                }
                                .padding(.top, 20)

                                // Main temperature with large display
                                VStack(spacing: 12) {
                                    // Weather icon
                                    Image(systemName: weather.symbolName)
                                        .font(.system(size: 100))
                                        .foregroundStyle(
                                            LinearGradient(
                                                colors: [.blue, .cyan],
                                                startPoint: .topLeading,
                                                endPoint: .bottomTrailing
                                            )
                                        )
                                        .symbolRenderingMode(.hierarchical)

                                    // Temperature
                                    HStack(alignment: .top, spacing: 4) {
                                        Text("\(Int(weather.temperature.value))")
                                            .font(.system(size: 84, weight: .thin, design: .rounded))
                                            .foregroundColor(.primary)
                                        Text("°")
                                            .font(.system(size: 48, weight: .thin))
                                            .foregroundColor(.primary)
                                            .padding(.top, 8)
                                    }

                                    // Condition description
                                    Text(weather.condition.description)
                                        .font(.title2)
                                        .fontWeight(.medium)
                                        .foregroundColor(.secondary)
                                        .padding(.top, 4)
                                }
                                .padding(.vertical, 24)

                                // Quick stats row
                                HStack(spacing: 20) {
                                    QuickStatView(
                                        icon: "thermometer",
                                        value: "\(Int(weather.apparentTemperature.value))°",
                                        label: "Hissedilen"
                                    )
                                    
                                    Divider()
                                        .frame(height: 40)
                                        .background(Color.gray.opacity(0.3))
                                    
                                    QuickStatView(
                                        icon: "humidity.fill",
                                        value: "\(Int(weather.humidity * 100))%",
                                        label: "Nem"
                                    )
                                    
                                    Divider()
                                        .frame(height: 40)
                                        .background(Color.gray.opacity(0.3))
                                    
                                    QuickStatView(
                                        icon: "wind",
                                        value: "\(Int(weather.wind.speed.value))",
                                        label: "km/s"
                                    )
                                }
                                .padding(.horizontal, 32)
                                .padding(.vertical, 20)
                                .background(
                                    RoundedRectangle(cornerRadius: 24)
                                        .fill(Color.gray.opacity(0.1))
                                        .shadow(color: .black.opacity(0.05), radius: 10, x: 0, y: 5)
                                )
                                .padding(.horizontal, 20)
                            }
                            .padding(.bottom, 32)

                            // Weather details grid with modern cards
                            LazyVGrid(
                                columns: [GridItem(.flexible(), spacing: 12), GridItem(.flexible(), spacing: 12)],
                                spacing: 12
                            ) {
                                ModernWeatherCard(
                                    icon: "eye.fill",
                                    title: "Görüş Mesafesi",
                                    value: "\(Int(weather.visibility.value / 1000)) km",
                                    color: .blue
                                )

                                ModernWeatherCard(
                                    icon: "gauge",
                                    title: "Basınç",
                                    value: "\(Int(weather.pressure.value)) mb",
                                    color: .purple
                                )

                                ModernWeatherCard(
                                    icon: "sun.max.fill",
                                    title: "UV İndeksi",
                                    value: "\(weather.uvIndex.value)",
                                    color: .orange,
                                    subtitle: getUVDescription(weather.uvIndex.value)
                                )

                                ModernWeatherCard(
                                    icon: "wind",
                                    title: "Rüzgar Hızı",
                                    value: "\(Int(weather.wind.speed.value)) km/s",
                                    color: .cyan
                                )
                            }
                            .padding(.horizontal, 20)
                            .padding(.bottom, 24)

                            // Hourly Forecast Section
                            if !viewModel.hourlyForecast.isEmpty {
                                VStack(alignment: .leading, spacing: 16) {
                                    HStack {
                                        Text("Saatlik Tahmin")
                                            .font(.title3)
                                            .fontWeight(.bold)
                                            .foregroundColor(.primary)
                                        Spacer()
                                    }
                                    .padding(.horizontal, 20)

                                    ScrollView(.horizontal, showsIndicators: false) {
                                        HStack(spacing: 12) {
                                            ForEach(viewModel.hourlyForecast.prefix(24), id: \.date) { hour in
                                                ModernHourlyCard(hourWeather: hour)
                                            }
                                        }
                                        .padding(.horizontal, 20)
                                    }
                                }
                                .padding(.bottom, 24)
                            }

                            // Daily Forecast Section
                            if !viewModel.dailyForecast.isEmpty {
                                VStack(alignment: .leading, spacing: 16) {
                                    HStack {
                                        Text("10 Günlük Tahmin")
                                            .font(.title3)
                                            .fontWeight(.bold)
                                            .foregroundColor(.primary)
                                        Spacer()
                                    }
                                    .padding(.horizontal, 20)

                                    VStack(spacing: 10) {
                                        ForEach(viewModel.dailyForecast, id: \.date) { day in
                                            ModernDailyCard(dayWeather: day)
                                        }
                                    }
                                    .padding(.horizontal, 20)
                                }
                                .padding(.bottom, 24)
                            }

                            // Apple Weather Attribution
                            VStack(spacing: 8) {
                                HStack(spacing: 4) {
                                    Image(systemName: "apple.logo")
                                        .font(.caption)
                                    Text("Weather")
                                        .font(.caption)
                                }
                                .foregroundColor(.secondary)

                                Link(
                                    "Hava Durumu Veri Kaynağı",
                                    destination: URL(string: "https://weatherkit.apple.com/legal-attribution.html")!
                                )
                                .font(.caption2)
                                .foregroundColor(.blue)
                                .underline()
                            }
                            .padding(.vertical, 20)
                            .padding(.bottom, 20)
                        }
                    }
                } else {
                    VStack(spacing: 20) {
                        Image(systemName: "cloud.fill")
                            .font(.system(size: 60))
                            .foregroundColor(.gray)
                        Text("Hava durumu verisi bekleniyor...")
                            .foregroundColor(.primary)
                            .font(.headline)
                    }
                }
            }
            .navigationTitle("Hava Durumu")
            .navigationBarTitleDisplayMode(.inline)
        }
    }

    private func getUVDescription(_ index: Int) -> String {
        switch index {
        case 0...2: return "Düşük"
        case 3...5: return "Orta"
        case 6...7: return "Yüksek"
        case 8...10: return "Çok Yüksek"
        default: return "Aşırı"
        }
    }
}

// MARK: - Quick Stat View
struct QuickStatView: View {
    let icon: String
    let value: String
    let label: String

    var body: some View {
        VStack(spacing: 6) {
            Image(systemName: icon)
                .font(.system(size: 18))
                .foregroundColor(.blue)
            Text(value)
                .font(.title3)
                .fontWeight(.bold)
                .foregroundColor(.primary)
            Text(label)
                .font(.caption2)
                .foregroundColor(.secondary)
        }
    }
}

// MARK: - Modern Weather Card
struct ModernWeatherCard: View {
    let icon: String
    let title: String
    let value: String
    let color: Color
    var subtitle: String? = nil

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: icon)
                    .font(.title2)
                    .foregroundColor(color)
                    .frame(width: 32, height: 32)
                Spacer()
            }

            VStack(alignment: .leading, spacing: 4) {
                Text(value)
                    .font(.title2)
                    .fontWeight(.bold)
                    .foregroundColor(.primary)

                Text(title)
                    .font(.caption)
                    .foregroundColor(.secondary)
                    .lineLimit(2)

                if let subtitle = subtitle {
                    Text(subtitle)
                        .font(.caption2)
                        .foregroundColor(.secondary)
                        .padding(.top, 2)
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(16)
        .background(
            RoundedRectangle(cornerRadius: 20)
                .fill(Color.gray.opacity(0.05))
                .shadow(color: .black.opacity(0.05), radius: 8, x: 0, y: 4)
        )
    }
}

// MARK: - Modern Hourly Card
struct ModernHourlyCard: View {
    let hourWeather: HourWeather

    private var timeString: String {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "tr_TR")
        let calendar = Calendar.current
        if calendar.isDateInToday(hourWeather.date) {
            formatter.dateFormat = "HH:mm"
        } else {
            formatter.dateFormat = "E HH:mm"
        }
        return formatter.string(from: hourWeather.date)
    }

    var body: some View {
        VStack(spacing: 10) {
            Text(timeString)
                .font(.caption)
                .fontWeight(.semibold)
                .foregroundColor(.primary)

            Image(systemName: hourWeather.symbolName)
                .font(.title3)
                .foregroundStyle(
                    LinearGradient(
                        colors: [.blue, .cyan],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
                .symbolRenderingMode(.hierarchical)
                .frame(height: 28)

            Text("\(Int(hourWeather.temperature.value))°")
                .font(.headline)
                .fontWeight(.bold)
                .foregroundColor(.primary)
        }
        .frame(width: 75)
        .padding(.vertical, 16)
        .padding(.horizontal, 12)
        .background(
            RoundedRectangle(cornerRadius: 18)
                .fill(Color.gray.opacity(0.05))
                .shadow(color: .black.opacity(0.05), radius: 5, x: 0, y: 2)
        )
    }
}

// MARK: - Modern Daily Card
struct ModernDailyCard: View {
    let dayWeather: DayWeather

    private var dayString: String {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "tr_TR")
        let calendar = Calendar.current
        if calendar.isDateInToday(dayWeather.date) {
            return "Bugün"
        } else if calendar.isDateInTomorrow(dayWeather.date) {
            return "Yarın"
        } else {
            formatter.dateFormat = "EEEE"
            return formatter.string(from: dayWeather.date).capitalized
        }
    }

    var body: some View {
        HStack(spacing: 16) {
            // Day name
            Text(dayString)
                .font(.subheadline)
                .fontWeight(.semibold)
                .foregroundColor(.primary)
                .frame(width: 80, alignment: .leading)

            // Weather icon
            Image(systemName: dayWeather.symbolName)
                .font(.title3)
                .foregroundStyle(
                    LinearGradient(
                        colors: [.blue, .cyan],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
                .symbolRenderingMode(.hierarchical)
                .frame(width: 32)

            Spacer()

            // Temperature range with visual bar
            HStack(spacing: 12) {
                Text("\(Int(dayWeather.lowTemperature.value))°")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                    .frame(width: 35, alignment: .trailing)

                // Temperature bar
                GeometryReader { geometry in
                    ZStack(alignment: .leading) {
                        // Background
                        RoundedRectangle(cornerRadius: 3)
                            .fill(Color.gray.opacity(0.2))
                            .frame(height: 6)

                        // Temperature indicator - visual bar showing temperature range
                        let width = max(geometry.size.width * 0.6, 30)

                        RoundedRectangle(cornerRadius: 3)
                            .fill(
                                LinearGradient(
                                    gradient: Gradient(colors: [
                                        Color.blue.opacity(0.6),
                                        Color.orange.opacity(0.6)
                                    ]),
                                    startPoint: .leading,
                                    endPoint: .trailing
                                )
                            )
                            .frame(width: width, height: 6)
                            .offset(x: geometry.size.width * 0.2)
                    }
                }
                .frame(width: 60, height: 6)

                Text("\(Int(dayWeather.highTemperature.value))°")
                    .font(.subheadline)
                    .fontWeight(.bold)
                    .foregroundColor(.primary)
                    .frame(width: 35, alignment: .leading)
            }
        }
        .padding(16)
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(Color.gray.opacity(0.05))
                .shadow(color: .black.opacity(0.05), radius: 5, x: 0, y: 2)
        )
    }
}

struct WeatherView_Previews: PreviewProvider {
    static var previews: some View {
        WeatherView()
    }
}
