import SwiftUI

struct ContentView: View {
    @StateObject private var viewModel = WebViewModel()

    var body: some View {
        TabView {
            // Tab 1: Home (WebView)
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
                Label("Ana Sayfa", systemImage: "map.fill")
            }

            // Tab 2: Settings (Native)
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
