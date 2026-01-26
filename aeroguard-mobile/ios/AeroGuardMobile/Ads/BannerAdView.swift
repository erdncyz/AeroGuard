import SwiftUI
import GoogleMobileAds

/// Coordinator to handle banner ad delegate callbacks
class BannerAdCoordinator: NSObject, BannerViewDelegate {
    var onAdLoaded: (Bool) -> Void
    
    init(onAdLoaded: @escaping (Bool) -> Void) {
        self.onAdLoaded = onAdLoaded
    }
    
    func bannerViewDidReceiveAd(_ bannerView: BannerView) {
        // Ad loaded successfully
        DispatchQueue.main.async {
            self.onAdLoaded(true)
        }
    }
    
    func bannerView(_ bannerView: BannerView, didFailToReceiveAdWithError error: Error) {
        // Ad failed to load
        print("Banner ad failed to load: \(error.localizedDescription)")
        DispatchQueue.main.async {
            self.onAdLoaded(false)
        }
    }
    
    func bannerViewDidRecordImpression(_ bannerView: BannerView) {
        // Ad impression recorded
    }
    
    func bannerViewWillPresentScreen(_ bannerView: BannerView) {
        // Ad will present full screen
    }
    
    func bannerViewWillDismissScreen(_ bannerView: BannerView) {
        // Ad will dismiss full screen
    }
    
    func bannerViewDidDismissScreen(_ bannerView: BannerView) {
        // Ad dismissed full screen
    }
}

/// SwiftUI wrapper for Google AdMob Banner Ad
struct BannerAdView: UIViewRepresentable {
    let adUnitID: String
    let onAdLoaded: (Bool) -> Void
    
    init(adUnitID: String = AppConfig.Ads.activeBannerAdUnitId, onAdLoaded: @escaping (Bool) -> Void = { _ in }) {
        self.adUnitID = adUnitID
        self.onAdLoaded = onAdLoaded
    }
    
    func makeCoordinator() -> BannerAdCoordinator {
        BannerAdCoordinator(onAdLoaded: onAdLoaded)
    }
    
    func makeUIView(context: Context) -> BannerView {
        let banner = BannerView()
        banner.adUnitID = adUnitID
        banner.delegate = context.coordinator
        banner.translatesAutoresizingMaskIntoConstraints = false
        
        // Get the root view controller
        if let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
           let rootViewController = windowScene.windows.first?.rootViewController {
            banner.rootViewController = rootViewController
        }
        
        // Set adaptive banner size
        let frame = UIScreen.main.bounds
        let viewWidth = frame.size.width
        banner.adSize = currentOrientationAnchoredAdaptiveBanner(width: viewWidth)
        
        // Load the ad
        let request = Request()
        banner.load(request)
        
        return banner
    }
    
    func updateUIView(_ uiView: BannerView, context: Context) {
        // Update coordinator's callback
        context.coordinator.onAdLoaded = onAdLoaded
    }
}

/// A container view that shows banner ad at the bottom
struct BannerAdContainerView<Content: View>: View {
    let content: Content
    let showAd: Bool
    
    init(showAd: Bool = true, @ViewBuilder content: () -> Content) {
        self.showAd = showAd
        self.content = content()
    }
    
    var body: some View {
        VStack(spacing: 0) {
            content
            
            if showAd {
                BannerAdView()
                    .frame(height: 50)
                    .background(Color(UIColor.systemBackground))
            }
        }
    }
}

/// Adaptive banner height based on device
struct AdaptiveBannerAdView: View {
    @State private var bannerHeight: CGFloat = 50
    @State private var isAdLoaded: Bool = false
    
    private var screenWidth: CGFloat {
        UIScreen.main.bounds.width
    }
    
    var body: some View {
        Group {
            if isAdLoaded {
                // Show banner only when ad is loaded
                BannerAdView(onAdLoaded: { loaded in
                    isAdLoaded = loaded
                    if loaded {
                        // Calculate adaptive banner height when ad loads
                        let adaptiveSize = currentOrientationAnchoredAdaptiveBanner(width: screenWidth)
                        bannerHeight = adaptiveSize.size.height
                    }
                })
                .frame(width: screenWidth, height: bannerHeight)
                .onAppear {
                    // Calculate adaptive banner height
                    let adaptiveSize = currentOrientationAnchoredAdaptiveBanner(width: screenWidth)
                    bannerHeight = adaptiveSize.size.height
                }
            } else {
                // Try to load ad in background (takes zero space)
                BannerAdView(onAdLoaded: { loaded in
                    isAdLoaded = loaded
                    if loaded {
                        // Calculate adaptive banner height when ad loads
                        let adaptiveSize = currentOrientationAnchoredAdaptiveBanner(width: screenWidth)
                        bannerHeight = adaptiveSize.size.height
                    }
                })
                .frame(width: 0, height: 0)
                .opacity(0)
                .allowsHitTesting(false)
            }
        }
    }
}

#Preview {
    VStack {
        Spacer()
        Text("Content Area")
        Spacer()
        AdaptiveBannerAdView()
    }
}
