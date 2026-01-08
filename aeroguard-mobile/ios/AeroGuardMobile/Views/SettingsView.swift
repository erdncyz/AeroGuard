import SwiftUI

struct SettingsView: View {
    var body: some View {
        NavigationView {
            List {
                Section(header: Text("Uygulama Hakkında")) {
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
                            Text("Sürüm 1.0.0")
                                .font(.subheadline)
                                .foregroundColor(.gray)
                        }
                    }
                    .padding(.vertical, 10)
                }

                Section(header: Text("Yasal & Destek")) {
                    Button(action: {
                        if let url = URL(string: "https://aero-guard.netlify.app/privacy-policy") {
                            UIApplication.shared.open(url)
                        }
                    }) {
                        HStack {
                            Image(systemName: "hand.raised.fill")
                                .foregroundColor(.blue)
                            Text("Gizlilik Politikası")
                                .foregroundColor(.primary)
                        }
                    }

                    Button(action: {
                        if let url = URL(string: "https://github.com/erdncyz/AeroGuard/issues") {
                            UIApplication.shared.open(url)
                        }
                    }) {
                        HStack {
                            Image(systemName: "envelope.fill")
                                .foregroundColor(.green)
                            Text("Destek / İletişim")
                                .foregroundColor(.primary)
                        }
                    }
                }
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
