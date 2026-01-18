import Foundation
import GoogleMobileAds
import SwiftUI

/// Manages Google AdMob initialization and App Open ads
class AdManager: NSObject, ObservableObject {
    static let shared = AdManager()
    
    @Published var isAdReady = false
    @Published var appOpenAdLoaded = false
    
    private var appOpenAd: AppOpenAd?
    private var loadTime: Date?
    private let fourHoursInSeconds: TimeInterval = 4 * 60 * 60
    private var showAdOnLoad = false  // Flag to show ad when loaded
    
    private override init() {
        super.init()
    }
    
    /// Initialize Google Mobile Ads SDK
    func initialize() {
        MobileAds.shared.start { status in
            print("AdMob SDK initialized")
            // Load App Open Ad after initialization
            self.loadAppOpenAd()
        }
    }
    
    // MARK: - App Open Ad
    
    /// Load App Open Ad
    func loadAppOpenAd() {
        let adUnitId = AppConfig.Ads.activeAppOpenAdUnitId
        print("Loading App Open Ad with ID: \(adUnitId)")
        
        let request = Request()
        AppOpenAd.load(with: adUnitId, request: request) { [weak self] ad, error in
            guard let self = self else { return }
            
            if let error = error {
                print("Failed to load App Open Ad: \(error.localizedDescription)")
                self.appOpenAdLoaded = false
                return
            }
            
            self.appOpenAd = ad
            self.loadTime = Date()
            self.appOpenAdLoaded = true
            print("App Open Ad loaded successfully")
            
            // If we should show ad on load (first launch), show it now
            if self.showAdOnLoad {
                self.showAdOnLoad = false
                DispatchQueue.main.async {
                    self.presentAppOpenAd()
                }
            }
        }
    }
    
    /// Check if the loaded ad is still valid (within 4 hours)
    private func wasLoadTimeLessThanFourHoursAgo() -> Bool {
        guard let loadTime = loadTime else { return false }
        return Date().timeIntervalSince(loadTime) < fourHoursInSeconds
    }
    
    /// Present the App Open Ad
    private func presentAppOpenAd() {
        guard let appOpenAd = appOpenAd else {
            print("No App Open Ad to present")
            return
        }
        
        // Get the root view controller
        guard let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
              let rootViewController = windowScene.windows.first?.rootViewController else {
            print("No root view controller found")
            return
        }
        
        appOpenAd.present(from: rootViewController)
        print("App Open Ad presented successfully")
        
        // Load next ad
        self.appOpenAd = nil
        self.loadAppOpenAd()
    }
    
    /// Show App Open Ad if available and valid
    func showAppOpenAdIfAvailable() {
        // If ad is already loaded, show it
        if appOpenAd != nil && wasLoadTimeLessThanFourHoursAgo() {
            presentAppOpenAd()
        } else {
            // Ad not ready, set flag to show when loaded
            print("App Open Ad not ready, will show when loaded")
            showAdOnLoad = true
            loadAppOpenAd()
        }
    }
}

// MARK: - App Lifecycle Observer
class AppLifecycleObserver: ObservableObject {
    private var lastBackgroundTime: Date?
    private let minimumBackgroundDuration: TimeInterval = 30 // Show ad if app was in background for at least 30 seconds
    
    init() {
        setupNotifications()
    }
    
    private func setupNotifications() {
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(appDidEnterBackground),
            name: UIApplication.didEnterBackgroundNotification,
            object: nil
        )
        
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(appWillEnterForeground),
            name: UIApplication.willEnterForegroundNotification,
            object: nil
        )
    }
    
    @objc private func appDidEnterBackground() {
        lastBackgroundTime = Date()
    }
    
    @objc private func appWillEnterForeground() {
        guard let lastBackgroundTime = lastBackgroundTime else { return }
        
        let backgroundDuration = Date().timeIntervalSince(lastBackgroundTime)
        if backgroundDuration >= minimumBackgroundDuration {
            AdManager.shared.showAppOpenAdIfAvailable()
        }
    }
    
    deinit {
        NotificationCenter.default.removeObserver(self)
    }
}
