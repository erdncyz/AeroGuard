import SwiftUI
import GoogleMobileAds

/// Coordinator to handle banner ad delegate callbacks
class BannerAdCoordinator: NSObject, BannerViewDelegate {
    var onAdLoaded: (Bool) -> Void
    private var retryCount = 0
    private let maxRetries = 5
    private weak var bannerView: BannerView?
    
    init(onAdLoaded: @escaping (Bool) -> Void) {
        self.onAdLoaded = onAdLoaded
    }
    
    func setBannerView(_ banner: BannerView) {
        self.bannerView = banner
    }
    
    func bannerViewDidReceiveAd(_ bannerView: BannerView) {
        print("Banner ad loaded successfully")
        retryCount = 0
        DispatchQueue.main.async {
            self.onAdLoaded(true)
        }
    }
    
    func bannerView(_ bannerView: BannerView, didFailToReceiveAdWithError error: Error) {
        print("Banner ad failed to load: \(error.localizedDescription)")
        DispatchQueue.main.async {
            self.onAdLoaded(false)
        }
        
        // Retry with exponential backoff
        if retryCount < maxRetries {
            retryCount += 1
            let delay = Double(retryCount) * 30.0 // 30s, 60s, 90s, 120s, 150s
            print("Banner ad retry \(retryCount)/\(maxRetries) in \(delay)s")
            DispatchQueue.main.asyncAfter(deadline: .now() + delay) { [weak self] in
                guard let self = self, let banner = self.bannerView else { return }
                banner.load(Request())
            }
        }
    }
    
    func bannerViewDidRecordImpression(_ bannerView: BannerView) {}
    func bannerViewWillPresentScreen(_ bannerView: BannerView) {}
    func bannerViewWillDismissScreen(_ bannerView: BannerView) {}
    func bannerViewDidDismissScreen(_ bannerView: BannerView) {}
}

/// UIView wrapper that keeps BannerView at proper dimensions regardless of SwiftUI frame
class BannerContainerView: UIView {
    let bannerView = BannerView()
    private var hasLoadedInitialRequest = false
    
    override init(frame: CGRect) {
        super.init(frame: frame)
        clipsToBounds = true
    }
    
    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }
    
    func configure(adUnitID: String, delegate: BannerAdCoordinator) {
        bannerView.adUnitID = adUnitID
        bannerView.delegate = delegate
        delegate.setBannerView(bannerView)

        // Set adaptive banner size using the SCREEN width (not the container width)
        let screenWidth = UIScreen.main.bounds.width
        bannerView.adSize = currentOrientationAnchoredAdaptiveBanner(width: screenWidth)

        // Use explicit frame (not auto layout) so SwiftUI constraints don't affect banner size
        bannerView.frame = CGRect(
            x: 0,
            y: 0,
            width: screenWidth,
            height: bannerView.adSize.size.height
        )

        if bannerView.superview == nil {
            addSubview(bannerView)
        }

        print("Banner configured: size=\(bannerView.adSize.size), adUnitID=\(adUnitID)")

        loadAdIfPossible()
    }

    override func didMoveToWindow() {
        super.didMoveToWindow()
        loadAdIfPossible()
    }

    private func loadAdIfPossible() {
        guard !hasLoadedInitialRequest else { return }

        guard let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
              let rootViewController = windowScene.windows.first?.rootViewController else {
            print("Banner waiting for rootViewController before loading")
            return
        }

        bannerView.rootViewController = rootViewController
        hasLoadedInitialRequest = true
        bannerView.load(Request())
    }
    
    override var intrinsicContentSize: CGSize {
        let screenWidth = UIScreen.main.bounds.width
        let adSize = currentOrientationAnchoredAdaptiveBanner(width: screenWidth)
        return adSize.size
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
    
    func makeUIView(context: Context) -> BannerContainerView {
        let container = BannerContainerView()
        container.configure(adUnitID: adUnitID, delegate: context.coordinator)
        return container
    }
    
    func updateUIView(_ uiView: BannerContainerView, context: Context) {
        context.coordinator.onAdLoaded = onAdLoaded
        // Update root view controller if needed
        if let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
           let rootViewController = windowScene.windows.first?.rootViewController {
            uiView.bannerView.rootViewController = rootViewController
        }
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
                AdaptiveBannerAdView()
            }
        }
    }
}

/// Adaptive banner height based on device
struct AdaptiveBannerAdView: View {
    @State private var bannerHeight: CGFloat = 60
    @State private var isAdLoaded: Bool = false
    
    private var screenWidth: CGFloat {
        UIScreen.main.bounds.width
    }
    
    var body: some View {
        // Always give the BannerAdView full dimensions so AdMob gets a valid frame.
        // The outer container clips to 0 height until the ad loads.
        BannerAdView(onAdLoaded: { loaded in
            withAnimation(.easeInOut(duration: 0.25)) {
                isAdLoaded = loaded
            }
        })
        .frame(width: screenWidth, height: bannerHeight)
        .frame(maxHeight: isAdLoaded ? bannerHeight : 0)
        .clipped()
        .onAppear {
            let adaptiveSize = currentOrientationAnchoredAdaptiveBanner(width: screenWidth)
            bannerHeight = adaptiveSize.size.height
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
