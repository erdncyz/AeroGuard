import Combine
import CoreLocation
import Foundation

class WebViewModel: NSObject, ObservableObject, CLLocationManagerDelegate {
    @Published var isLoading: Bool = true
    @Published var webUrl: URL = AppConfig.webAppURL

    private let locationManager = CLLocationManager()

    override init() {
        super.init()
        setupLocation()
    }

    private func setupLocation() {
        locationManager.delegate = self
        locationManager.requestWhenInUseAuthorization()
    }

    func locationManager(
        _ manager: CLLocationManager, didChangeAuthorization status: CLAuthorizationStatus
    ) {
        // Handle changes if needed
    }
}
