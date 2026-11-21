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
    private var requestID = UUID()
    private var locationRetryCount = 0
    private var locationRetryTask: Task<Void, Never>?

    override init() {
        super.init()
        locationManager.delegate = self
        locationManager.desiredAccuracy = kCLLocationAccuracyBest
        refreshWeather()
    }

    func refreshWeather() {
        locationRetryTask?.cancel()
        locationRetryTask = nil
        locationRetryCount = 0
        // Invalidate older requests before waiting for a new GPS fix.
        requestID = UUID()
        errorMessage = nil
        isLoading = true
        switch locationManager.authorizationStatus {
        case .authorizedWhenInUse, .authorizedAlways:
            locationManager.requestLocation()
        case .notDetermined:
            locationManager.requestWhenInUseAuthorization()
        default:
            errorMessage = "Konum izni kapalı. Ayarlar'dan konum erişimini açın."
            isLoading = false
        }
    }

    func fetchWeather(for location: CLLocation) async {
        locationRetryTask?.cancel()
        locationRetryTask = nil
        locationRetryCount = 0
        let activeRequest = UUID()
        requestID = activeRequest
        isLoading = true
        errorMessage = nil
        guard CLLocationCoordinate2DIsValid(location.coordinate),
            location.horizontalAccuracy.isFinite, location.horizontalAccuracy >= 0,
            location.timestamp.timeIntervalSinceNow >= -120,
            location.timestamp.timeIntervalSinceNow <= 5
        else {
            errorMessage = "Güncel ve geçerli bir konum alınamadı. Yenilemeyi deneyin."
            isLoading = false
            return
        }

        do {
            // Current, hourly and daily values belong to the same WeatherKit response.
            let weather = try await weatherService.weather(for: location)
            let placemark = try? await CLGeocoder().reverseGeocodeLocation(location).first
            guard requestID == activeRequest else { return }
            guard weather.currentWeather.date.timeIntervalSinceNow >= -3 * 60 * 60,
                weather.currentWeather.date.timeIntervalSinceNow <= 5 * 60
            else {
                errorMessage = "Hava durumu ölçümü güncel değil. Yenilemeyi deneyin."
                isLoading = false
                return
            }

            let district = placemark?.subLocality ?? placemark?.subAdministrativeArea
            let city = placemark?.locality ?? placemark?.administrativeArea
            let parts = [district, city, placemark?.country].compactMap { $0 }
            let dedupedParts = Array(NSOrderedSet(array: parts)) as? [String] ?? parts
            let nameParts = [district, city].compactMap { $0 }
            let dedupedName = Array(NSOrderedSet(array: nameParts)) as? [String] ?? nameParts
            let name = dedupedName.isEmpty ? "Bilinmeyen Konum" : dedupedName.joined(separator: ", ")

            var calendar = Calendar.current
            if let timeZone = placemark?.timeZone { calendar.timeZone = timeZone }
            let now = Date()
            let currentHour = calendar.dateInterval(of: .hour, for: now)?.start ?? now
            let currentDay = calendar.startOfDay(for: now)

            // Commit all displayed values together, only for the newest request.
            currentWeather = weather.currentWeather
            hourlyForecast = Array(weather.hourlyForecast.filter { $0.date >= currentHour }.prefix(24))
            dailyForecast = Array(weather.dailyForecast.filter { $0.date >= currentDay }.prefix(10))
            locationName = name
            locationDetail = dedupedParts.joined(separator: " • ")
            coordinateText = String(format: "%.4f, %.4f (±%.0f m)",
                                    location.coordinate.latitude, location.coordinate.longitude,
                                    location.horizontalAccuracy)
            lastUpdatedAt = weather.currentWeather.date
            AnalyticsManager.shared.trackWeatherLoaded(
                city: name, temperatureC: weather.currentWeather.temperature.converted(to: .celsius).value)
        } catch {
            guard requestID == activeRequest else { return }
            errorMessage = "Hava durumu alınamadı: \(error.localizedDescription)"
            AnalyticsManager.shared.trackWeatherError(error.localizedDescription)
        }
        isLoading = false
    }

    private func handleLocationError(_ error: Error) {
        let failure = error as NSError
        if failure.domain == kCLErrorDomain,
            failure.code == CLError.locationUnknown.rawValue,
            locationRetryTask != nil { return }
        // A one-shot request can fail temporarily while Core Location obtains a fix.
        if failure.domain == kCLErrorDomain,
            failure.code == CLError.locationUnknown.rawValue,
            locationRetryCount < 2
        {
            locationRetryCount += 1
            let activeRequest = requestID
            let delay = UInt64(locationRetryCount) * 2_000_000_000
            isLoading = true
            errorMessage = nil
            locationRetryTask = Task { [weak self] in
                do { try await Task.sleep(nanoseconds: delay) } catch { return }
                guard let self, !Task.isCancelled, self.requestID == activeRequest else { return }
                self.locationRetryTask = nil
                self.locationManager.requestLocation()
            }
            return
        }
        locationRetryTask?.cancel()
        locationRetryTask = nil
        requestID = UUID()
        if failure.domain == kCLErrorDomain && failure.code == CLError.denied.rawValue {
            errorMessage = "Konum izni kapalı. Ayarlar'dan konum erişimini açın."
        } else if failure.domain == kCLErrorDomain && failure.code == CLError.locationUnknown.rawValue {
            #if targetEnvironment(simulator)
            errorMessage = "Simülatör konum üretemedi. Simulator menüsünde Features → Location → Custom Location ile test koordinatlarını seçin; ardından yenileyin."
            #else
            errorMessage = "Konum şu anda belirlenemiyor. Açık bir alanda yeniden deneyin ve Konum Servisleri'nin açık olduğunu kontrol edin."
            #endif
        } else {
            errorMessage = "Konum alınamadı. Ağ bağlantısını ve Konum Servisleri'ni kontrol edip yeniden deneyin."
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
            handleLocationError(error)
        }
    }

    nonisolated func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        Task { @MainActor in
            refreshWeather()
        }
    }
}
