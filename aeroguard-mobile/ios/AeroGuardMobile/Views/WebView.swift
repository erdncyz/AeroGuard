import CoreLocation
import SwiftUI
import WebKit
import WidgetKit

struct WebView: UIViewRepresentable {
    let url: URL
    @Binding var isLoading: Bool

    func makeCoordinator() -> Coordinator {
        Coordinator(self)
    }

    func makeUIView(context: Context) -> WKWebView {
        let configuration = WKWebViewConfiguration()
        configuration.allowsInlineMediaPlayback = true
        configuration.mediaTypesRequiringUserActionForPlayback = []

        let preferences = WKWebpagePreferences()
        preferences.allowsContentJavaScript = true
        configuration.defaultWebpagePreferences = preferences

        // Keep concurrent geolocation requests separate and honor their timeouts.
        let scriptSource = """
            (() => {
                const pending = new Map();
                let nextId = 0;
                window.aeroGuardLocationResult = (ids, position, failure) => {
                    ids.forEach(id => {
                        const request = pending.get(id);
                        if (!request) return;
                        pending.delete(id);
                        clearTimeout(request.timer);
                        if (failure) {
                            if (request.error) request.error(failure);
                        } else {
                            request.success(position);
                        }
                    });
                };
                navigator.geolocation.getCurrentPosition = (success, error, options = {}) => {
                    if (typeof success !== 'function') throw new TypeError('Success callback required');
                    const id = String(++nextId);
                    const request = {success, error, timer: null};
                    pending.set(id, request);
                    const timeout = options.timeout === undefined ? Infinity : Math.max(0, Number(options.timeout));
                    if (Number.isFinite(timeout)) {
                        request.timer = setTimeout(() => {
                            if (!pending.delete(id)) return;
                            window.webkit.messageHandlers.locationHandler.postMessage({requestId: id, cancel: true});
                            if (error) error({code: 3, message: 'Location request timed out'});
                        }, timeout);
                    }
                    window.webkit.messageHandlers.locationHandler.postMessage({requestId: id});
                };
            })();
            """
        let userScript = WKUserScript(
            source: scriptSource, injectionTime: .atDocumentStart, forMainFrameOnly: true)
        configuration.userContentController.addUserScript(userScript)
        configuration.userContentController.add(context.coordinator, name: "locationHandler")
        configuration.userContentController.add(context.coordinator, name: "airQualityData")

        let webView = WKWebView(frame: .zero, configuration: configuration)
        webView.navigationDelegate = context.coordinator
        webView.uiDelegate = context.coordinator
        webView.scrollView.bounces = true
        webView.scrollView.contentInsetAdjustmentBehavior = .never

        // Pull to refresh
        let refreshControl = UIRefreshControl()
        refreshControl.addTarget(
            context.coordinator, action: #selector(Coordinator.refreshWebView(_:)),
            for: .valueChanged)
        webView.scrollView.addSubview(refreshControl)

        context.coordinator.webView = webView

        return webView
    }

    func updateUIView(_ webView: WKWebView, context: Context) {
        if webView.url == nil {
            let request = URLRequest(url: url, cachePolicy: .reloadIgnoringLocalAndRemoteCacheData)
            webView.load(request)
        }
    }

    class Coordinator: NSObject, WKNavigationDelegate, WKUIDelegate, WKScriptMessageHandler,
        CLLocationManagerDelegate
    {
        var parent: WebView
        let locationManager = CLLocationManager()
        weak var webView: WKWebView?
        private var pendingLocationRequests = Set<String>()

        init(_ parent: WebView) {
            self.parent = parent
            super.init()
            setupLocationManager()
        }

        func setupLocationManager() {
            locationManager.delegate = self
            locationManager.desiredAccuracy = kCLLocationAccuracyBest
        }

        @objc func refreshWebView(_ sender: UIRefreshControl) {
            webView?.reload()
            sender.endRefreshing()
        }

        // MARK: - WKScriptMessageHandler
        func userContentController(
            _ userContentController: WKUserContentController, didReceive message: WKScriptMessage
        ) {
            let origin = message.frameInfo.securityOrigin
            guard message.frameInfo.isMainFrame,
                origin.protocol == "https",
                origin.host == AppConfig.webAppURL.host,
                (origin.port == 0 || origin.port == 443)
            else { return }

            if message.name == "locationHandler" {
                guard let body = message.body as? [String: Any],
                    let requestId = body["requestId"] as? String
                else { return }
                if body["cancel"] as? Bool == true {
                    pendingLocationRequests.remove(requestId)
                    return
                }
                pendingLocationRequests.insert(requestId)
                switch locationManager.authorizationStatus {
                case .notDetermined:
                    locationManager.requestWhenInUseAuthorization()
                case .authorizedWhenInUse, .authorizedAlways:
                    if pendingLocationRequests.count == 1 { locationManager.requestLocation() }
                default:
                    completeLocationRequests(error: ["code": 1, "message": "Permission denied"])
                }
            } else if message.name == "airQualityData" {
                saveAirQuality(message.body)
            }
        }

        private struct AirQualityMessage: Decodable {
            let aqi: Double
            let stationId: Int
            let location: String
            let observedAt: String
            let latitude: Double
            let longitude: Double
        }

        private func saveAirQuality(_ body: Any) {
            guard let body = body as? [String: Any], JSONSerialization.isValidJSONObject(body),
                let data = try? JSONSerialization.data(withJSONObject: body),
                let measurement = try? JSONDecoder().decode(AirQualityMessage.self, from: data),
                measurement.aqi.isFinite, measurement.aqi >= 0, measurement.aqi <= 10_000,
                measurement.stationId > 0,
                CLLocationCoordinate2DIsValid(CLLocationCoordinate2D(
                    latitude: measurement.latitude, longitude: measurement.longitude))
            else { return }

            let formatter = ISO8601DateFormatter()
            formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
            var observationDate = formatter.date(from: measurement.observedAt)
            if observationDate == nil {
                formatter.formatOptions = [.withInternetDateTime]
                observationDate = formatter.date(from: measurement.observedAt)
            }
            let stationName = measurement.location.trimmingCharacters(in: .whitespacesAndNewlines)
            guard !stationName.isEmpty,
                let observationDate,
                observationDate.timeIntervalSince1970 > 0,
                observationDate.timeIntervalSinceNow <= 5 * 60,
                let defaults = UserDefaults(suiteName: AppConfig.appGroupId)
            else { return }

            // One record prevents a station name and an AQI from different observations mixing.
            let record: [String: Any] = [
                "aqi": measurement.aqi,
                "stationId": measurement.stationId,
                "location": stationName,
                "observedAt": observationDate.timeIntervalSince1970,
                "latitude": measurement.latitude,
                "longitude": measurement.longitude,
            ]
            if let previous = defaults.dictionary(forKey: "currentAirQualityObservation"),
                NSDictionary(dictionary: previous).isEqual(to: record)
            { return }
            defaults.set(record, forKey: "currentAirQualityObservation")
            defaults.set(stationName, forKey: "currentLocation")
            AnalyticsManager.shared.trackAQIUpdated(aqi: Int(measurement.aqi.rounded()), city: stationName)
            AnalyticsManager.shared.trackCityUpdated(city: stationName, source: "station")
            NotificationCenter.default.post(name: .aeroGuardCityUpdated, object: nil)
            WidgetCenter.shared.reloadAllTimelines()
        }

        // MARK: - CLLocationManagerDelegate
        func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
            let status = manager.authorizationStatus
            AnalyticsManager.shared.trackLocationPermission(status: status)
            guard !pendingLocationRequests.isEmpty else { return }
            if status == .authorizedWhenInUse || status == .authorizedAlways {
                manager.requestLocation()
            } else if status == .denied || status == .restricted {
                completeLocationRequests(error: ["code": 1, "message": "Permission denied"])
            }
        }

        func locationManager(
            _ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]
        ) {
            guard let location = locations.last,
                CLLocationCoordinate2DIsValid(location.coordinate),
                location.horizontalAccuracy.isFinite, location.horizontalAccuracy >= 0,
                location.timestamp.timeIntervalSinceNow >= -120,
                location.timestamp.timeIntervalSinceNow <= 5
            else {
                completeLocationRequests(error: ["code": 2, "message": "No recent valid location fix"])
                return
            }
            completeLocationRequests(position: [
                "coords": [
                    "latitude": location.coordinate.latitude,
                    "longitude": location.coordinate.longitude,
                    "accuracy": location.horizontalAccuracy,
                    "altitude": NSNull(),
                    "altitudeAccuracy": NSNull(),
                    "heading": NSNull(),
                    "speed": NSNull(),
                ],
                "timestamp": location.timestamp.timeIntervalSince1970 * 1000,
            ])
        }

        func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
            completeLocationRequests(error: ["code": 2, "message": "Position unavailable"])
        }

        private func completeLocationRequests(
            position: [String: Any]? = nil, error: [String: Any]? = nil
        ) {
            guard !pendingLocationRequests.isEmpty else { return }
            let arguments: [Any] = [Array(pendingLocationRequests), position as Any? ?? NSNull(), error as Any? ?? NSNull()]
            pendingLocationRequests.removeAll()
            guard let data = try? JSONSerialization.data(withJSONObject: arguments),
                let json = String(data: data, encoding: .utf8)
            else { return }
            evaluateJS("if(window.aeroGuardLocationResult) window.aeroGuardLocationResult(...\(json))")
        }

        private func evaluateJS(_ js: String) {
            DispatchQueue.main.async {
                self.webView?.evaluateJavaScript(js, completionHandler: nil)
            }
        }

        // MARK: - WKNavigationDelegate
        func webView(_ webView: WKWebView, didStartProvisionalNavigation navigation: WKNavigation!)
        {
            pendingLocationRequests.removeAll()
            DispatchQueue.main.async {
                self.parent.isLoading = true
            }
        }

        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            DispatchQueue.main.async {
                self.parent.isLoading = false
                webView.evaluateJavaScript("window.dispatchEvent(new Event('airQualityBridgeReady'))", completionHandler: nil)
            }
        }

        func webView(
            _ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error
        ) {
            DispatchQueue.main.async {
                self.parent.isLoading = false
            }
            print("Failed to load: \(error.localizedDescription)")
        }

        func webView(
            _ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!,
            withError error: Error
        ) {
            DispatchQueue.main.async {
                self.parent.isLoading = false
            }
            print("Failed to load: \(error.localizedDescription)")
        }

        func webView(
            _ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration,
            for navigationAction: WKNavigationAction, windowFeatures: WKWindowFeatures
        ) -> WKWebView? {
            if navigationAction.targetFrame == nil {
                webView.load(navigationAction.request)
            }
            return nil
        }
    }
}

struct WebView_Previews: PreviewProvider {
    static var previews: some View {
        WebView(url: URL(string: "https://www.google.com")!, isLoading: .constant(false))
    }
}
