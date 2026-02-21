import Foundation

struct AppConfig {
    static let webAppURL = URL(string: "https://aero-guard.netlify.app")!
    static let appGroupId = "group.com.aeroguardios.app"
    
    // MARK: - Google AdMob Configuration
    struct Ads {
        static let appId = "ca-app-pub-1271900948473545~6671318076"
        static let bannerAdUnitId = "ca-app-pub-1271900948473545/9419742674"
        static let appOpenAdUnitId = "ca-app-pub-1271900948473545/7764907893"
        
        // Google's official test ad unit IDs
        static let testBannerAdUnitId = "ca-app-pub-3940256099942544/2435281174"
        static let testAppOpenAdUnitId = "ca-app-pub-3940256099942544/5575463023"
        
        // Automatically use test ads on simulator, real ads on device
        static var isSimulator: Bool {
            #if targetEnvironment(simulator)
            return true
            #else
            return false
            #endif
        }
        
        static var activeBannerAdUnitId: String {
            isSimulator ? testBannerAdUnitId : bannerAdUnitId
        }
        
        static var activeAppOpenAdUnitId: String {
            isSimulator ? testAppOpenAdUnitId : appOpenAdUnitId
        }
    }
}
