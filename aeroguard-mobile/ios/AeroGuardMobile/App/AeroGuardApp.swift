import SwiftUI
import GoogleMobileAds
import AppTrackingTransparency

@main
struct AeroGuardApp: App {
    @StateObject private var appLifecycleObserver = AppLifecycleObserver()
    @UIApplicationDelegateAdaptor(AppDelegate.self) var appDelegate
    
    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(appLifecycleObserver)
                .onReceive(NotificationCenter.default.publisher(for: UIApplication.didBecomeActiveNotification)) { _ in
                    // Request ATT permission when app becomes active
                    requestTrackingPermission()
                }
        }
    }
    
    private func requestTrackingPermission() {
        // Wait a moment for the UI to be ready
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) {
            ATTrackingManager.requestTrackingAuthorization { status in
                switch status {
                case .authorized:
                    print("ATT: Kullanıcı izin verdi")
                case .denied:
                    print("ATT: Kullanıcı reddetti")
                case .restricted:
                    print("ATT: Kısıtlı")
                case .notDetermined:
                    print("ATT: Henüz belirlenmedi")
                @unknown default:
                    print("ATT: Bilinmeyen durum")
                }
                
                // Show App Open Ad after ATT dialog
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
                    AdManager.shared.showAppOpenAdIfAvailable()
                }
            }
        }
    }
}

// MARK: - App Delegate for AdMob initialization
class AppDelegate: NSObject, UIApplicationDelegate {
    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey : Any]? = nil) -> Bool {
        // Initialize Google Mobile Ads SDK
        AdManager.shared.initialize()
        
        return true
    }
}
