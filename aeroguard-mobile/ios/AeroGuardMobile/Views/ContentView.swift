import SwiftUI
import GoogleMobileAds

struct ContentView: View {
    @StateObject private var viewModel = WebViewModel()
    @State private var selectedTab = 0

    var body: some View {
        TabView(selection: $selectedTab) {
            // Tab 1: Air Quality (WebView)
            VStack(spacing: 0) {
                ZStack {
                    WebView(url: viewModel.webUrl, isLoading: $viewModel.isLoading)
                        .ignoresSafeArea(edges: .top)

                    if viewModel.isLoading {
                        ZStack {
                            Color.white.opacity(0.8)
                            ProgressView()
                                .scaleEffect(1.5, anchor: .center)
                                .progressViewStyle(CircularProgressViewStyle(tint: .blue))
                        }
                        .ignoresSafeArea(edges: .top)
                    }
                }
                
                // Banner Ad above TabBar - only shows when ad is loaded
                AdaptiveBannerAdView()
            }
            .tabItem {
                Label("Hava Kalitesi", systemImage: "wind")
            }
            .tag(0)

            // Tab 2: Weather (Native WeatherKit)
            VStack(spacing: 0) {
                WeatherView()
                AdaptiveBannerAdView()
            }
            .tabItem {
                Label("Hava Durumu", systemImage: "cloud.sun.fill")
            }
            .tag(1)

            // Tab 3: Widget Guide (Native)
            VStack(spacing: 0) {
                WidgetGuideView()
                AdaptiveBannerAdView()
            }
            .tabItem {
                Label("Widget", systemImage: "apps.iphone")
            }
            .tag(2)

            // Tab 4: Settings (Native)
            VStack(spacing: 0) {
                SettingsView()
                AdaptiveBannerAdView()
            }
            .tabItem {
                Label("Ayarlar", systemImage: "gearshape.fill")
            }
            .tag(3)
        }
        .accentColor(.blue)  // Brand color
        .onAppear {
            AnalyticsManager.shared.trackTabSelected(.airQuality)
        }
        .onChange(of: selectedTab) { newValue in
            switch newValue {
            case 0:
                AnalyticsManager.shared.trackTabSelected(.airQuality)
            case 1:
                AnalyticsManager.shared.trackTabSelected(.weather)
            case 2:
                AnalyticsManager.shared.trackTabSelected(.widget)
            case 3:
                AnalyticsManager.shared.trackTabSelected(.settings)
            default:
                break
            }
        }
    }
}

struct ContentView_Previews: PreviewProvider {
    static var previews: some View {
        ContentView()
    }
}
