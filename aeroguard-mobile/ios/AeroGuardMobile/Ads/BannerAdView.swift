import SwiftUI
import GoogleMobileAds

/// SwiftUI wrapper for Google AdMob Banner Ad
struct BannerAdView: UIViewRepresentable {
    let adUnitID: String
    
    init(adUnitID: String = AppConfig.Ads.activeBannerAdUnitId) {
        self.adUnitID = adUnitID
    }
    
    func makeUIView(context: Context) -> BannerView {
        let banner = BannerView()
        banner.adUnitID = adUnitID
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
        // Update if needed
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
    
    var body: some View {
        GeometryReader { geometry in
            BannerAdView()
                .frame(width: geometry.size.width, height: bannerHeight)
                .onAppear {
                    // Calculate adaptive banner height
                    let viewWidth = geometry.size.width
                    let adaptiveSize = currentOrientationAnchoredAdaptiveBanner(width: viewWidth)
                    bannerHeight = adaptiveSize.size.height
                }
        }
        .frame(height: bannerHeight)
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
