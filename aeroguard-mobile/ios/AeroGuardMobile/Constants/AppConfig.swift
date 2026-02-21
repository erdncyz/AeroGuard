import Foundation
import UIKit

struct AppConfig {
    static let webAppURL = URL(string: "https://aero-guard.netlify.app")!
    static let appGroupId = "group.com.aeroguardios.app"
    
    // MARK: - Google AdMob Configuration
    struct Ads {
        static let appId = "ca-app-pub-1271900948473545~6671318076"
        static let bannerAdUnitId = "ca-app-pub-1271900948473545/1772526176"
        static let appOpenAdUnitId = "ca-app-pub-1271900948473545/7764907893"
        static let testBannerAdUnitId = "ca-app-pub-3940256099942544/2435281174"
        static let testAppOpenAdUnitId = "ca-app-pub-3940256099942544/9257395921"

        // Only this device should see guaranteed Google test creatives.
        private static let forcedTestDeviceIdfvs: Set<String> = [
            "ecd9fecb-46f4-43f6-ba1a-44f87bc5fce8",
            "ecd9fecb46f443f6ba1a44f87bc5fce8"
        ]

        private static var shouldUseTestAdUnitsForThisDevice: Bool {
            guard let idfv = UIDevice.current.identifierForVendor?.uuidString.lowercased() else {
                return false
            }
            return forcedTestDeviceIdfvs.contains(idfv) ||
                forcedTestDeviceIdfvs.contains(idfv.replacingOccurrences(of: "-", with: ""))
        }
        
        static var activeBannerAdUnitId: String {
            shouldUseTestAdUnitsForThisDevice ? testBannerAdUnitId : bannerAdUnitId
        }
        
        static var activeAppOpenAdUnitId: String {
            shouldUseTestAdUnitsForThisDevice ? testAppOpenAdUnitId : appOpenAdUnitId
        }
    }
}
