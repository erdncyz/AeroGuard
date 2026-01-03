import UIKit
import WebKit
import CoreLocation

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
  var window: UIWindow?

  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {

    window = UIWindow(frame: UIScreen.main.bounds)

    let webViewController = WebViewController()
    window?.rootViewController = webViewController
    window?.makeKeyAndVisible()

    return true
  }
}

class WebViewController: UIViewController, WKNavigationDelegate, WKUIDelegate, WKScriptMessageHandler, CLLocationManagerDelegate {
  private var webView: WKWebView!
  private var activityIndicator: UIActivityIndicatorView!
  private let locationManager = CLLocationManager()
  
  // Web uygulamanızın URL'si
  private let webAppURL = "https://aero-guard.netlify.app"

  override func viewDidLoad() {
    super.viewDidLoad()
    
    setupLocationManager()
    setupWebView()
    setupActivityIndicator()
    loadWebApp()
  }
  
  private func setupLocationManager() {
    locationManager.delegate = self
    locationManager.desiredAccuracy = kCLLocationAccuracyBest
  }

  private func setupWebView() {
    let configuration = WKWebViewConfiguration()
    configuration.allowsInlineMediaPlayback = true
    configuration.mediaTypesRequiringUserActionForPlayback = []

    // Inject Geolocation Polyfill
    let scriptSource = """
      navigator.geolocation.getCurrentPosition = function(success, error, options) {
        window.locationCallbackSuccess = success;
        window.locationCallbackError = error;
        window.webkit.messageHandlers.locationHandler.postMessage('getLocation');
      };
    """
    let userScript = WKUserScript(source: scriptSource, injectionTime: .atDocumentStart, forMainFrameOnly: true)
    configuration.userContentController.addUserScript(userScript)
    configuration.userContentController.add(self, name: "locationHandler")

    // Preferences
    let preferences = WKWebpagePreferences()
    preferences.allowsContentJavaScript = true
    configuration.defaultWebpagePreferences = preferences

    webView = WKWebView(frame: view.bounds, configuration: configuration)
    webView.navigationDelegate = self
    webView.uiDelegate = self
    webView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
    webView.scrollView.contentInsetAdjustmentBehavior = .never

    // Enable pull-to-refresh
    let refreshControl = UIRefreshControl()
    refreshControl.addTarget(self, action: #selector(refreshWebView), for: .valueChanged)
    webView.scrollView.addSubview(refreshControl)
    webView.scrollView.bounces = true

    view.addSubview(webView)
  }

  private func setupActivityIndicator() {
    activityIndicator = UIActivityIndicatorView(style: .large)
    activityIndicator.center = view.center
    activityIndicator.hidesWhenStopped = true
    activityIndicator.color = .systemBlue
    view.addSubview(activityIndicator)
  }

  private func loadWebApp() {
    guard let url = URL(string: webAppURL) else {
      showError(message: "Invalid URL")
      return
    }

    var request = URLRequest(url: url)
    request.cachePolicy = .reloadIgnoringLocalAndRemoteCacheData

    activityIndicator.startAnimating()
    webView.load(request)
  }

  @objc private func refreshWebView(_ sender: UIRefreshControl) {
    webView.reload()
    sender.endRefreshing()
  }

  private func showError(message: String) {
    let alert = UIAlertController(
      title: "Error",
      message: message,
      preferredStyle: .alert
    )
    alert.addAction(
      UIAlertAction(title: "Retry", style: .default) { [weak self] _ in
        self?.loadWebApp()
      })
    alert.addAction(UIAlertAction(title: "Cancel", style: .cancel))
    present(alert, animated: true)
  }
  
  // MARK: - WKScriptMessageHandler
  func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
    if message.name == "locationHandler" {
      if locationManager.authorizationStatus == .notDetermined {
        locationManager.requestWhenInUseAuthorization()
      } else if locationManager.authorizationStatus == .authorizedWhenInUse || locationManager.authorizationStatus == .authorizedAlways {
        locationManager.requestLocation()
      } else {
        // Denied
         evaluateJS("if(window.locationCallbackError) window.locationCallbackError({code: 1, message: 'Permission denied'})")
      }
    }
  }

  // MARK: - CLLocationManagerDelegate
  func locationManager(_ manager: CLLocationManager, didChangeAuthorization status: CLAuthorizationStatus) {
    if status == .authorizedWhenInUse || status == .authorizedAlways {
      manager.requestLocation()
    } else if status == .denied {
      evaluateJS("if(window.locationCallbackError) window.locationCallbackError({code: 1, message: 'Permission denied'})")
    }
  }

  func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
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
     evaluateJS("if(window.locationCallbackError) window.locationCallbackError({code: 2, message: 'Position unavailable'})")
  }
  
  private func evaluateJS(_ js: String) {
    DispatchQueue.main.async {
      self.webView.evaluateJavaScript(js, completionHandler: nil)
    }
  }

  // MARK: - WKNavigationDelegate

  func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
    activityIndicator.stopAnimating()
  }

  func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
    activityIndicator.stopAnimating()
    showError(message: "Failed to load: \(error.localizedDescription)")
  }

  func webView(
    _ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!,
    withError error: Error
  ) {
    activityIndicator.stopAnimating()
    showError(message: "Failed to load: \(error.localizedDescription)")
  }

  // MARK: - WKUIDelegate

  func webView(
    _ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration,
    for navigationAction: WKNavigationAction, windowFeatures: WKWindowFeatures
  ) -> WKWebView? {
    // Handle links that try to open in new window
    if navigationAction.targetFrame == nil {
      webView.load(navigationAction.request)
    }
    return nil
  }
}
