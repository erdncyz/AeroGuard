import Combine
import CoreLocation
import Foundation

class WebViewModel: NSObject, ObservableObject, CLLocationManagerDelegate {
    @Published var isLoading: Bool = true
    @Published var webUrl: URL = AppConfig.webAppURL

    private let locationManager = CLLocationManager()

    override init() {
        super.init()
        print("DEBUG: WebViewModel initialized")
        setupLocation()
    }

    private func setupLocation() {
        DispatchQueue.main.async { [weak self] in
            print("DEBUG: Setting up location manager")
            self?.locationManager.delegate = self
            self?.locationManager.desiredAccuracy = kCLLocationAccuracyBest

            // Check current status
            self?.checkLocationAuthorization()
        }
    }

    private func checkLocationAuthorization() {
        let status = locationManager.authorizationStatus
        print("DEBUG: Current location authorization status: \(status.rawValue)")

        switch status {
        case .notDetermined:
            print("DEBUG: Requesting WhenInUse Authorization")
            locationManager.requestWhenInUseAuthorization()
        case .denied, .restricted:
            print("DEBUG: Location denied or restricted")
        case .authorizedAlways, .authorizedWhenInUse:
            print("DEBUG: Location authorized")
            locationManager.requestLocation()
        @unknown default:
            break
        }
    }

    func locationManager(
        _ manager: CLLocationManager, didChangeAuthorization status: CLAuthorizationStatus
    ) {
        print("DEBUG: Location authorization changed to: \(status.rawValue)")
        checkLocationAuthorization()
    }

    func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard let location = locations.last else { return }
        print(
            "DEBUG: Location updated: \(location.coordinate.latitude), \(location.coordinate.longitude)"
        )
        // Location received successfully
    }

    func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        print("DEBUG: Location error: \(error.localizedDescription)")
    }
}
