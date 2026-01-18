import Foundation

struct AppConfig {
    static let webAppURL = URL(string: "https://aero-guard.netlify.app")!
    static let appGroupId = "group.com.aeroguardios.app"
    
    // MARK: - Google AdMob Configuration
    struct Ads {
        static let appId = "ca-app-pub-1271900948473545~6671318076"
        static let bannerAdUnitId = "ca-app-pub-1271900948473545/9419742674"
        static let appOpenAdUnitId = "ca-app-pub-1271900948473545/7764907893"
        
        // Production mode - always use real ads
        static let useTestAds = false
        
        static var activeBannerAdUnitId: String {
            bannerAdUnitId
        }
        
        static var activeAppOpenAdUnitId: String {
            appOpenAdUnitId
        }
    }
}
