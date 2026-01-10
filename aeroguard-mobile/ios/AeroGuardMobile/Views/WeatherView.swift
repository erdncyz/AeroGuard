import SwiftUI
import WeatherKit

struct WeatherView: View {
    @StateObject private var viewModel = WeatherViewModel()

    var body: some View {
        NavigationView {
            ZStack {
                // Background gradient
                LinearGradient(
                    gradient: Gradient(colors: [Color.blue.opacity(0.6), Color.cyan.opacity(0.4)]),
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
                .ignoresSafeArea()

                if viewModel.isLoading {
                    VStack(spacing: 20) {
                        ProgressView()
                            .scaleEffect(1.5)
                            .tint(.white)
                        Text("Hava durumu yükleniyor...")
                            .foregroundColor(.white)
                            .font(.subheadline)
                    }
                } else if let error = viewModel.errorMessage {
                    VStack(spacing: 16) {
                        Image(systemName: "exclamationmark.triangle.fill")
                            .font(.system(size: 50))
                            .foregroundColor(.white.opacity(0.8))
                        Text(error)
                            .foregroundColor(.white)
                            .multilineTextAlignment(.center)
                            .padding(.horizontal)
                    }
                } else if let weather = viewModel.currentWeather {
                    ScrollView {
                        VStack(spacing: 24) {
                            // Location
                            Text(viewModel.locationName)
                                .font(.title2)
                                .fontWeight(.semibold)
                                .foregroundColor(.white)
                                .padding(.top, 20)

                            // Main temperature
                            VStack(spacing: 8) {
                                Image(systemName: weather.symbolName)
                                    .font(.system(size: 80))
                                    .foregroundColor(.white)
                                    .symbolRenderingMode(.hierarchical)

                                Text("\(Int(weather.temperature.value))°")
                                    .font(.system(size: 72, weight: .thin))
                                    .foregroundColor(.white)

                                Text(weather.condition.description)
                                    .font(.title3)
                                    .foregroundColor(.white.opacity(0.9))
                            }
                            .padding(.vertical)

                            // Weather details grid
                            LazyVGrid(
                                columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 16
                            ) {
                                WeatherDetailCard(
                                    icon: "thermometer",
                                    title: "Hissedilen",
                                    value: "\(Int(weather.apparentTemperature.value))°"
                                )

                                WeatherDetailCard(
                                    icon: "humidity.fill",
                                    title: "Nem",
                                    value: "\(Int(weather.humidity * 100))%"
                                )

                                WeatherDetailCard(
                                    icon: "wind",
                                    title: "Rüzgar",
                                    value: "\(Int(weather.wind.speed.value)) km/s"
                                )

                                WeatherDetailCard(
                                    icon: "eye.fill",
                                    title: "Görüş",
                                    value: "\(Int(weather.visibility.value / 1000)) km"
                                )

                                WeatherDetailCard(
                                    icon: "gauge",
                                    title: "Basınç",
                                    value: "\(Int(weather.pressure.value)) mb"
                                )

                                WeatherDetailCard(
                                    icon: "sun.max.fill",
                                    title: "UV İndeksi",
                                    value: "\(weather.uvIndex.value)"
                                )
                            }
                            .padding(.horizontal)

                            // Hourly Forecast Section
                            if !viewModel.hourlyForecast.isEmpty {
                                VStack(alignment: .leading, spacing: 12) {
                                    Text("Saatlik Tahmin")
                                        .font(.headline)
                                        .foregroundColor(.white)
                                        .padding(.horizontal)

                                    ScrollView(.horizontal, showsIndicators: false) {
                                        HStack(spacing: 16) {
                                            ForEach(viewModel.hourlyForecast, id: \.date) { hour in
                                                HourlyWeatherCard(hourWeather: hour)
                                            }
                                        }
                                        .padding(.horizontal)
                                    }
                                }
                                .padding(.top, 8)
                            }

                            // Daily Forecast Section
                            if !viewModel.dailyForecast.isEmpty {
                                VStack(alignment: .leading, spacing: 12) {
                                    Text("10 Günlük Tahmin")
                                        .font(.headline)
                                        .foregroundColor(.white)
                                        .padding(.horizontal)

                                    VStack(spacing: 12) {
                                        ForEach(viewModel.dailyForecast, id: \.date) { day in
                                            DailyWeatherCard(dayWeather: day)
                                        }
                                    }
                                    .padding(.horizontal)
                                }
                                .padding(.top, 8)
                            }

                            // Apple Weather Attribution (Required by Apple)
                            VStack(spacing: 8) {
                                HStack(spacing: 4) {
                                    Image(systemName: "apple.logo")
                                        .font(.caption)
                                    Text("Weather")
                                        .font(.caption)
                                }
                                .foregroundColor(.white.opacity(0.7))

                                Link(
                                    "Hava Durumu Veri Kaynağı",
                                    destination: URL(
                                        string:
                                            "https://weatherkit.apple.com/legal-attribution.html")!
                                )
                                .font(.caption2)
                                .foregroundColor(.white.opacity(0.6))
                                .underline()
                            }
                            .padding(.vertical, 16)

                            Spacer(minLength: 20)
                        }
                    }
                } else {
                    VStack(spacing: 16) {
                        Image(systemName: "cloud.fill")
                            .font(.system(size: 50))
                            .foregroundColor(.white.opacity(0.8))
                        Text("Hava durumu verisi bekleniyor...")
                            .foregroundColor(.white)
                    }
                }
            }
            .navigationTitle("Hava Durumu")
            .navigationBarTitleDisplayMode(.inline)
        }
    }
}

struct WeatherDetailCard: View {
    let icon: String
    let title: String
    let value: String

    var body: some View {
        VStack(spacing: 8) {
            Image(systemName: icon)
                .font(.title2)
                .foregroundColor(.white.opacity(0.9))

            Text(title)
                .font(.caption)
                .foregroundColor(.white.opacity(0.7))

            Text(value)
                .font(.title3)
                .fontWeight(.semibold)
                .foregroundColor(.white)
        }
        .frame(maxWidth: .infinity)
        .padding()
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(Color.white.opacity(0.2))
                .shadow(color: Color.black.opacity(0.1), radius: 5, x: 0, y: 2)
        )
    }
}

// MARK: - Hourly Weather Card
struct HourlyWeatherCard: View {
    let hourWeather: HourWeather

    private var timeString: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "HH:mm"
        return formatter.string(from: hourWeather.date)
    }

    var body: some View {
        VStack(spacing: 8) {
            Text(timeString)
                .font(.caption)
                .foregroundColor(.white.opacity(0.8))

            Image(systemName: hourWeather.symbolName)
                .font(.title2)
                .foregroundColor(.white)
                .symbolRenderingMode(.hierarchical)

            Text("\(Int(hourWeather.temperature.value))°")
                .font(.headline)
                .foregroundColor(.white)
        }
        .frame(width: 70)
        .padding(.vertical, 12)
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(Color.white.opacity(0.2))
        )
    }
}

// MARK: - Daily Weather Card
struct DailyWeatherCard: View {
    let dayWeather: DayWeather

    private var dayString: String {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "tr_TR")
        formatter.dateFormat = "EEEE"
        return formatter.string(from: dayWeather.date)
    }

    var body: some View {
        HStack(spacing: 16) {
            // Day name
            Text(dayString.capitalized)
                .font(.subheadline)
                .foregroundColor(.white)
                .frame(width: 100, alignment: .leading)

            // Weather icon
            Image(systemName: dayWeather.symbolName)
                .font(.title3)
                .foregroundColor(.white)
                .symbolRenderingMode(.hierarchical)
                .frame(width: 30)

            Spacer()

            // Temperature range
            HStack(spacing: 8) {
                Text("\(Int(dayWeather.lowTemperature.value))°")
                    .font(.subheadline)
                    .foregroundColor(.white.opacity(0.7))

                Rectangle()
                    .fill(
                        LinearGradient(
                            gradient: Gradient(colors: [
                                Color.blue.opacity(0.5),
                                Color.orange.opacity(0.5),
                            ]),
                            startPoint: .leading,
                            endPoint: .trailing
                        )
                    )
                    .frame(width: 50, height: 4)
                    .cornerRadius(2)

                Text("\(Int(dayWeather.highTemperature.value))°")
                    .font(.subheadline)
                    .fontWeight(.semibold)
                    .foregroundColor(.white)
            }
        }
        .padding()
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(Color.white.opacity(0.15))
        )
    }
}

struct WeatherView_Previews: PreviewProvider {
    static var previews: some View {
        WeatherView()
    }
}
