import SwiftUI

struct ContentView: View {
    @StateObject private var viewModel = WebViewModel()

    var body: some View {
        TabView {
            // Tab 1: Air Quality (WebView)
            ZStack {
                WebView(url: viewModel.webUrl, isLoading: $viewModel.isLoading)
                    .ignoresSafeArea()

                if viewModel.isLoading {
                    ZStack {
                        Color.white.opacity(0.8)
                        ProgressView()
                            .scaleEffect(1.5, anchor: .center)
                            .progressViewStyle(CircularProgressViewStyle(tint: .blue))
                    }
                    .ignoresSafeArea()
                }
            }
            .tabItem {
                Label("Hava Kalitesi", systemImage: "wind")
            }

            // Tab 2: Weather (Native WeatherKit)
            WeatherView()
                .tabItem {
                    Label("Hava Durumu", systemImage: "cloud.sun.fill")
                }

            // Tab 3: Widget Guide (Native)
            WidgetGuideView()
                .tabItem {
                    Label("Widget", systemImage: "apps.iphone")
                }

            // Tab 4: Settings (Native)
            SettingsView()
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
