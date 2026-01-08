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
                var text = document.body.innerText;
                var match = text.match(/(\\d+)\\s*\\n*\\s*AQI ENDEKSİ/i);
                if (match && match[1]) {
                    var aqi = parseInt(match[1]);
                    window.webkit.messageHandlers.aqiHandler.postMessage({aqi: aqi});
                }
            }, 5000);
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
                    // print("DEBUG: Received AQI from Web: \(aqi)")
                    if let userDefaults = UserDefaults(suiteName: AppConfig.appGroupId) {
                        userDefaults.set(aqi, forKey: "currentAQI")
                        WidgetCenter.shared.reloadAllTimelines()
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
