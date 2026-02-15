import CoreLocation
import Foundation
import WeatherKit

@MainActor
class WeatherViewModel: NSObject, ObservableObject {
    @Published var currentWeather: CurrentWeather?
    @Published var hourlyForecast: [HourWeather] = []
    @Published var dailyForecast: [DayWeather] = []
    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published var locationName: String = "Konum alınıyor..."
    @Published var locationDetail: String = ""
    @Published var coordinateText: String = ""
    @Published var lastUpdatedAt: Date?

    private let weatherService = WeatherService.shared
    private let locationManager = CLLocationManager()

    override init() {
        super.init()
        setupLocationManager()
    }

    private func setupLocationManager() {
        locationManager.delegate = self
        locationManager.desiredAccuracy = kCLLocationAccuracyBest

        // Check authorization status
        let status = locationManager.authorizationStatus
        if status == .notDetermined {
            locationManager.requestWhenInUseAuthorization()
        } else if status == .authorizedWhenInUse || status == .authorizedAlways {
            locationManager.requestLocation()
        }
    }

    func refreshWeather() {
        let status = locationManager.authorizationStatus
        if status == .authorizedWhenInUse || status == .authorizedAlways {
            locationManager.requestLocation()
        } else if status == .notDetermined {
            locationManager.requestWhenInUseAuthorization()
        }
    }

    func fetchWeather(for location: CLLocation) async {
        isLoading = true
        errorMessage = nil

        do {
            let weather = try await weatherService.weather(for: location)
            currentWeather = weather.currentWeather

            // Get hourly forecast for next 24 hours
            let hourlyWeather = try await weatherService.weather(
                for: location,
                including: .hourly
            )
            hourlyForecast = Array(hourlyWeather.prefix(24))

            // Get daily forecast for next 10 days
            let dailyWeather = try await weatherService.weather(
                for: location,
                including: .daily
            )
            dailyForecast = Array(dailyWeather.prefix(10))

            // Get location name
            let geocoder = CLGeocoder()
            if let placemark = try? await geocoder.reverseGeocodeLocation(location).first {
                let district = placemark.subLocality ?? placemark.subAdministrativeArea
                let city = placemark.locality ?? placemark.administrativeArea
                let country = placemark.country

                if let district, let city {
                    locationName = "\(district), \(city)"
                } else if let city {
                    locationName = city
                } else {
                    locationName = "Bilinmeyen Konum"
                }

                let locationParts = [district, city, country].compactMap { $0 }
                let dedupedParts = Array(NSOrderedSet(array: locationParts)) as? [String] ?? locationParts
                locationDetail = dedupedParts.joined(separator: " • ")
            } else {
                locationName = "Bilinmeyen Konum"
                locationDetail = ""
            }

            coordinateText = String(
                format: "%.4f, %.4f",
                location.coordinate.latitude,
                location.coordinate.longitude
            )
            lastUpdatedAt = Date()

            AnalyticsManager.shared.trackWeatherLoaded(
                city: locationName,
                temperatureC: weather.currentWeather.temperature.value
            )
        } catch {
            errorMessage = "Hava durumu alınamadı: \(error.localizedDescription)"
            AnalyticsManager.shared.trackWeatherError(error.localizedDescription)
        }

        isLoading = false
    }
}

extension WeatherViewModel {
    var lastUpdatedText: String {
        guard let lastUpdatedAt else { return "-" }
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "tr_TR")
        formatter.dateFormat = "d MMM HH:mm"
        return formatter.string(from: lastUpdatedAt)
    }
}

extension WeatherViewModel: CLLocationManagerDelegate {
    nonisolated func locationManager(
        _ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]
    ) {
        guard let location = locations.last else { return }

        Task { @MainActor in
            await fetchWeather(for: location)
        }
    }

    nonisolated func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        Task { @MainActor in
            errorMessage = "Konum alınamadı: \(error.localizedDescription)"
            isLoading = false
        }
    }

    nonisolated func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        let status = manager.authorizationStatus
        if status == .authorizedWhenInUse || status == .authorizedAlways {
            manager.requestLocation()
        }
    }
}
