import SwiftUI
import GoogleMobileAds

struct ContentView: View {
    @StateObject private var viewModel = WebViewModel()

    var body: some View {
        TabView {
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

            // Tab 2: Weather (Native WeatherKit)
            VStack(spacing: 0) {
                WeatherView()
                AdaptiveBannerAdView()
            }
            .tabItem {
                Label("Hava Durumu", systemImage: "cloud.sun.fill")
            }

            // Tab 3: Widget Guide (Native)
            VStack(spacing: 0) {
                WidgetGuideView()
                AdaptiveBannerAdView()
            }
            .tabItem {
                Label("Widget", systemImage: "apps.iphone")
            }

            // Tab 4: Settings (Native)
            VStack(spacing: 0) {
                SettingsView()
                AdaptiveBannerAdView()
            }
            .tabItem {
                Label("Ayarlar", systemImage: "gearshape.fill")
            }
        }
        .accentColor(.blue)  // Brand color
    }
}

struct ContentView_Previews: PreviewProvider {
    static var previews: some View {
        ContentView()
    }
}
