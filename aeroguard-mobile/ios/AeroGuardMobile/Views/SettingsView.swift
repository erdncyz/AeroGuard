import SwiftUI

// MARK: - Custom Colors for Light Mode
extension Color {
    static let settingsDarkText = Color(red: 0.1, green: 0.1, blue: 0.1)
    static let settingsSecondaryText = Color(red: 0.4, green: 0.4, blue: 0.4)
}

struct SettingsView: View {
    var body: some View {
        NavigationView {
            ZStack {
                // White background
                Color.white
                    .ignoresSafeArea()

                List {
                    Section(
                        header: Text("Uygulama Hakkında").foregroundColor(.settingsSecondaryText)
                    ) {
                        HStack {
                            // Logo Placeholder: App Icon Style
                            ZStack {
                                RoundedRectangle(cornerRadius: 12)
                                    .fill(Color.blue.opacity(0.8))
                                    .frame(width: 60, height: 60)

                                Image(systemName: "wind")  // Hava kalitesi/Rüzgar ikonu
                                    .resizable()
                                    .aspectRatio(contentMode: .fit)
                                    .frame(width: 35, height: 35)
                                    .foregroundColor(.white)
                            }
                            .padding(.trailing, 10)

                            VStack(alignment: .leading) {
                                Text("AeroGuard")
                                    .font(.headline)
                                    .foregroundColor(.settingsDarkText)
                                Text("Sürüm 1.0.0")
                                    .font(.subheadline)
                                    .foregroundColor(.settingsSecondaryText)
                            }
                        }
                        .padding(.vertical, 10)
                        .listRowBackground(Color.white)
                    }

                    Section(header: Text("Yasal & Destek").foregroundColor(.settingsSecondaryText))
                    {
                        Button(action: {
                            if let url = URL(
                                string: "https://aero-guard.netlify.app/privacy-policy")
                            {
                                UIApplication.shared.open(url)
                            }
                        }) {
                            HStack {
                                Image(systemName: "hand.raised.fill")
                                    .foregroundColor(.blue)
                                Text("Gizlilik Politikası")
                                    .foregroundColor(.settingsDarkText)
                            }
                        }
                        .listRowBackground(Color.white)

                        Button(action: {
                            if let url = URL(string: "https://github.com/erdncyz/AeroGuard/issues")
                            {
                                UIApplication.shared.open(url)
                            }
                        }) {
                            HStack {
                                Image(systemName: "envelope.fill")
                                    .foregroundColor(.green)
                                Text("Destek / İletişim")
                                    .foregroundColor(.settingsDarkText)
                            }
                        }
                        .listRowBackground(Color.white)
                    }
                }
                .scrollContentBackground(.hidden)
                .background(Color.white)
            }
            .navigationTitle("Ayarlar")
        }
    }
}

struct SettingsView_Previews: PreviewProvider {
    static var previews: some View {
        SettingsView()
    }
}
