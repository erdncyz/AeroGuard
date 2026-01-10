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

        // Inject Geolocation Polyfill
        let scriptSource = """
              navigator.geolocation.getCurrentPosition = function(success, error, options) {
                window.locationCallbackSuccess = success;
                window.locationCallbackError = error;
                window.webkit.messageHandlers.locationHandler.postMessage('getLocation');
              };
            """
        let userScript = WKUserScript(
            source: scriptSource, injectionTime: .atDocumentStart, forMainFrameOnly: true)
        configuration.userContentController.addUserScript(userScript)
        configuration.userContentController.add(context.coordinator, name: "locationHandler")
        configuration.userContentController.add(context.coordinator, name: "aqiHandler")

        // Inject AQI Scanner Script
        let aqiScriptSource = """
            setInterval(function() {
                var location = "Bilinmeyen Konum";
                var aqi = null;
                
                // Strategy 1: Try to find location from page title or meta tags
                var titleMatch = document.title.match(/(.+?)\\s+(?:Air Quality|Hava Kalitesi)/i);
                if (titleMatch && titleMatch[1]) {
                    location = titleMatch[1].trim();
                }
                
                // Strategy 2: Look for location in specific DOM elements
                if (location === "Bilinmeyen Konum") {
                    // Try to find city name in h1, h2, or specific classes
                    var headers = document.querySelectorAll('h1, h2, .city-name, .location-name');
                    for (var i = 0; i < headers.length; i++) {
                        var text = headers[i].innerText.trim();
                        // Filter out common false positives
                        if (text && 
                            text.length > 2 && 
                            text.length < 50 && 
                            !text.match(/hPa|AQI|PM2\\.5|PM10|O3|NO2|SO2|CO|Hava Kalitesi|Air Quality|Dünyayı Keşfet|ÜLKE|ŞEHİR|İLÇE/i)) {
                            location = text;
                            break;
                        }
                    }
                }
                
                // Strategy 3: Parse from body text more carefully
                if (location === "Bilinmeyen Konum") {
                    var bodyText = document.body.innerText;
                    var lines = bodyText.split('\\n');
                    
                    for (var i = 0; i < lines.length; i++) {
                        var line = lines[i].trim();
                        
                        // Look for city, country pattern
                        var cityCountryMatch = line.match(/^([A-Za-zÇçĞğİıÖöŞşÜü\\s-]+),\\s*([A-Za-z]+)$/);
                        if (cityCountryMatch && 
                            !line.match(/hPa|AQI|PM2\\.5|PM10|O3|NO2|SO2|CO/i)) {
                            location = cityCountryMatch[1].trim();
                            break;
                        }
                        
                        // Look for standalone city name before AQI
                        if (line.includes('AQI') && i > 0) {
                            for (var j = Math.max(0, i - 3); j < i; j++) {
                                var prevLine = lines[j].trim();
                                if (prevLine.length > 2 && 
                                    prevLine.length < 50 && 
                                    !prevLine.match(/\\d|hPa|AQI|PM2\\.5|PM10|O3|NO2|SO2|CO|Hava Kalitesi|Air Quality|Dünyayı Keşfet|ÜLKE|ŞEHİR|İLÇE|DAHA FAZLA|Neden Önemli/i) &&
                                    prevLine.match(/[A-Za-zÇçĞğİıÖöŞşÜü]/)) {
                                    location = prevLine;
                                    break;
                                }
                            }
                            break;
                        }
                    }
                }
                
                // Find AQI value
                var text = document.body.innerText;
                var aqiMatch = text.match(/(\\d+)\\s*\\n*\\s*AQI ENDEKSİ/i);
                if (!aqiMatch) {
                    aqiMatch = text.match(/(\\d+)\\s*AQI/i);
                }
                
                if (aqiMatch && aqiMatch[1]) {
                    aqi = parseInt(aqiMatch[1]);
                }
                
                // Only send if we have valid AQI
                if (aqi !== null && aqi > 0) {
                    console.log('📊 AQI:', aqi, 'Location:', location);
                    window.webkit.messageHandlers.aqiHandler.postMessage({aqi: aqi, location: location});
                }
            }, 3000);
            """
        let aqiUserScript = WKUserScript(
            source: aqiScriptSource, injectionTime: .atDocumentEnd, forMainFrameOnly: true)
        configuration.userContentController.addUserScript(aqiUserScript)

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
            if message.name == "locationHandler" {
                if locationManager.authorizationStatus == .notDetermined {
                    locationManager.requestWhenInUseAuthorization()
                } else if locationManager.authorizationStatus == .authorizedWhenInUse
                    || locationManager.authorizationStatus == .authorizedAlways
                {
                    locationManager.requestLocation()
                } else {
                    evaluateJS(
                        "if(window.locationCallbackError) window.locationCallbackError({code: 1, message: 'Permission denied'})"
                    )
                }
            } else if message.name == "aqiHandler" {
                if let body = message.body as? [String: Any], let aqi = body["aqi"] as? Int {
                    let webLocation = body["location"] as? String ?? "Bilinmeyen Konum"
                    print("📍 DEBUG: Received AQI: \(aqi), Location from web: \(webLocation)")

                    if let userDefaults = UserDefaults(suiteName: AppConfig.appGroupId) {
                        // Always update AQI
                        userDefaults.set(aqi, forKey: "currentAQI")

                        // Only update location if we don't have a GPS-based location yet
                        let existingLocation = userDefaults.string(forKey: "currentLocation")
                        if existingLocation == nil || existingLocation == "Bilinmeyen Konum" {
                            userDefaults.set(webLocation, forKey: "currentLocation")
                            print("✅ DEBUG: Saved location from web: \(webLocation)")
                        } else {
                            print(
                                "ℹ️ DEBUG: Keeping GPS location: \(existingLocation ?? ""), ignoring web location: \(webLocation)"
                            )
                        }

                        userDefaults.synchronize()
                        print("✅ DEBUG: Saved AQI to App Group: \(aqi)")
                        WidgetCenter.shared.reloadAllTimelines()
                        print("🔄 DEBUG: Widget timeline reloaded")
                    }
                }
            }
        }

        // MARK: - CLLocationManagerDelegate
        func locationManager(
            _ manager: CLLocationManager, didChangeAuthorization status: CLAuthorizationStatus
        ) {
            if status == .authorizedWhenInUse || status == .authorizedAlways {
                manager.requestLocation()
            } else if status == .denied {
                evaluateJS(
                    "if(window.locationCallbackError) window.locationCallbackError({code: 1, message: 'Permission denied'})"
                )
            }
        }

        func locationManager(
            _ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]
        ) {
            guard let location = locations.last else { return }
            let lat = location.coordinate.latitude
            let lng = location.coordinate.longitude

            // Reverse geocode to get city name
            let geocoder = CLGeocoder()
            geocoder.reverseGeocodeLocation(location) { placemarks, error in
                if let placemark = placemarks?.first {
                    var cityName = "Bilinmeyen Konum"

                    if let city = placemark.locality {
                        cityName = city
                    } else if let area = placemark.administrativeArea {
                        cityName = area
                    } else if let subArea = placemark.subAdministrativeArea {
                        cityName = subArea
                    }

                    // Save to App Group immediately
                    if let userDefaults = UserDefaults(suiteName: AppConfig.appGroupId) {
                        userDefaults.set(cityName, forKey: "currentLocation")
                        userDefaults.synchronize()
                        print("📍 DEBUG: Saved location from GPS: \(cityName)")
                        WidgetCenter.shared.reloadAllTimelines()
                    }
                }
            }

            let json = """
                  {
                    coords: {
                      latitude: \(lat),
                      longitude: \(lng),
                      altitude: null,
                      accuracy: \(location.horizontalAccuracy),
                      altitudeAccuracy: null,
                      heading: null,
                      speed: null
                    },
                    timestamp: \(Date().timeIntervalSince1970 * 1000)
                  }
                """

            evaluateJS("if(window.locationCallbackSuccess) window.locationCallbackSuccess(\(json))")
        }

        func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
            evaluateJS(
                "if(window.locationCallbackError) window.locationCallbackError({code: 2, message: 'Position unavailable'})"
            )
        }

        private func evaluateJS(_ js: String) {
            DispatchQueue.main.async {
                self.webView?.evaluateJavaScript(js, completionHandler: nil)
            }
        }

        // MARK: - WKNavigationDelegate
        func webView(_ webView: WKWebView, didStartProvisionalNavigation navigation: WKNavigation!)
        {
            DispatchQueue.main.async {
                self.parent.isLoading = true
            }
        }

        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            DispatchQueue.main.async {
                self.parent.isLoading = false
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
