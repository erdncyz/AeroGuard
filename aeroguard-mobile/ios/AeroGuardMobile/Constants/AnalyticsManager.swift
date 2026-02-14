import Foundation
import CoreLocation
#if canImport(FirebaseAnalytics)
import FirebaseAnalytics
#endif

enum AppTab: String {
    case airQuality = "hava_kalitesi"
    case weather = "hava_durumu"
    case widget = "widget"
    case settings = "ayarlar"
}

final class AnalyticsManager {
    static let shared = AnalyticsManager()

    private var lastAQIValue: Int?

    private init() {}

    func trackAppOpened() {
        logEvent("uygulama_acildi")
    }

    func trackTabSelected(_ tab: AppTab) {
        logEvent("sekme_secildi", parameters: ["sekme": tab.rawValue])
    }

    func trackPushPermission(granted: Bool) {
        logEvent("push_izin_durumu", parameters: ["izin_verildi": granted ? 1 : 0])
    }

    func trackPushReceived(source: String) {
        logEvent("push_alindi", parameters: ["kaynak": source])
    }

    func trackPushOpened() {
        logEvent("push_acildi")
    }

    func trackTokenAndCity(city: String, source: String) {
        #if canImport(FirebaseAnalytics)
        Analytics.setUserProperty(city, forName: "il")
        #endif
        logEvent("kullanici_token_il", parameters: [
            "il": city,
            "kaynak": source,
        ])
    }

    func trackLocationPermission(status: CLAuthorizationStatus) {
        let mappedStatus: String
        switch status {
        case .authorizedAlways:
            mappedStatus = "authorized_always"
        case .authorizedWhenInUse:
            mappedStatus = "authorized_when_in_use"
        case .denied:
            mappedStatus = "denied"
        case .restricted:
            mappedStatus = "restricted"
        case .notDetermined:
            mappedStatus = "not_determined"
        @unknown default:
            mappedStatus = "unknown"
        }
        logEvent("konum_izin_durumu", parameters: ["durum": mappedStatus])
    }

    func trackCityUpdated(city: String, source: String) {
        #if canImport(FirebaseAnalytics)
        Analytics.setUserProperty(city, forName: "il")
        #endif
        logEvent("il_guncellendi", parameters: ["il": city, "kaynak": source])
    }

    func trackAQIUpdated(aqi: Int, city: String) {
        guard lastAQIValue != aqi else { return }
        lastAQIValue = aqi

        let level: String
        switch aqi {
        case ..<51:
            level = "iyi"
        case 51..<101:
            level = "orta"
        case 101..<151:
            level = "hassas"
        case 151..<201:
            level = "sagliksiz"
        case 201..<301:
            level = "cok_sagliksiz"
        default:
            level = "tehlikeli"
        }

        logEvent("aqi_guncellendi", parameters: [
            "aqi_degeri": aqi,
            "aqi_seviye": level,
            "il": city,
        ])
    }

    func trackWeatherLoaded(city: String, temperatureC: Double) {
        logEvent("hava_durumu_yuklendi", parameters: [
            "il": city,
            "sicaklik_c": temperatureC,
        ])
    }

    func trackWeatherError(_ message: String) {
        logEvent("hava_durumu_hatasi", parameters: ["hata": message])
    }

    private func logEvent(_ name: String, parameters: [String: Any]? = nil) {
        #if canImport(FirebaseAnalytics)
        Analytics.logEvent(name, parameters: parameters)
        #endif
    }
}
