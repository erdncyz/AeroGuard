import SwiftUI
import GoogleMobileAds

@main
struct AeroGuardApp: App {
    @StateObject private var appLifecycleObserver = AppLifecycleObserver()
    @UIApplicationDelegateAdaptor(AppDelegate.self) var appDelegate
    
    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(appLifecycleObserver)
        }
    }
}

// MARK: - App Delegate for AdMob initialization
class AppDelegate: NSObject, UIApplicationDelegate {
    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey : Any]? = nil) -> Bool {
        // Initialize Google Mobile Ads SDK
        AdManager.shared.initialize()
        
        // Show App Open Ad on first launch
        DispatchQueue.main.asyncAfter(deadline: .now() + 2.0) {
            AdManager.shared.showAppOpenAdIfAvailable()
        }
        
        return true
    }
}
