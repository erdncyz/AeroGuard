import UIKit
import WebKit

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

class WebViewController: UIViewController, WKNavigationDelegate, WKUIDelegate {
  private var webView: WKWebView!
  private var activityIndicator: UIActivityIndicatorView!

  // Web uygulamanızın URL'si
  private let webAppURL = "https://aero-guard.netlify.app"

  override func viewDidLoad() {
    super.viewDidLoad()

    setupWebView()
    setupActivityIndicator()
    loadWebApp()
  }

  private func setupWebView() {
    let configuration = WKWebViewConfiguration()
    configuration.allowsInlineMediaPlayback = true
    configuration.mediaTypesRequiringUserActionForPlayback = []

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
