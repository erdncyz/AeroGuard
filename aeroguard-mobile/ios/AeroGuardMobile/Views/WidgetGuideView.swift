import SwiftUI

struct WidgetGuideView: View {
    private enum Page: String, CaseIterable {
        case home = "Ana Ekran"
        case lock = "Kilit Ekranı"
        case information = "Bilgiler"
    }

    @State private var page: Page = .home
    private var lockScreen: Bool { page == .lock }

    private let ink = Color(red: 0.08, green: 0.15, blue: 0.26)

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                Picker("Widget sayfası", selection: $page) {
                    ForEach(Page.allCases, id: \.self) { destination in
                        Text(destination.rawValue).tag(destination)
                    }
                }
                .pickerStyle(.segmented)
                .padding(.horizontal, 20)
                .padding(.vertical, 12)

            ScrollView {
                VStack(alignment: .leading, spacing: 24) {
                    VStack(alignment: .leading, spacing: 12) {
                        Label("AEROGUARD WIDGET", systemImage: "square.stack.3d.up.fill")
                            .font(.caption.bold())
                            .tracking(2)
                            .foregroundStyle(.blue)
                        Text(page == .information ? "Widget hakkında." : (lockScreen ? "Kilit ekranınızda,\nbir bakışta." : "Ana ekranınızda,\nbir bakışta."))
                            .font(.largeTitle.bold())
                            .foregroundStyle(.primary)
                            .fixedSize(horizontal: false, vertical: true)
                        Text(page == .information ? "Konum, ölçüm zamanı ve güncellemeler hakkında bilmeniz gerekenler." : "Hava kalitesini görmek için telefonunuza bakmanız yeterli.")
                            .font(.body)
                            .foregroundStyle(.secondary)
                    }

                    if page != .information {
                    preview

                    VStack(alignment: .leading, spacing: 18) {
                        HStack(alignment: .firstTextBaseline) {
                            Text(lockScreen ? "Kilit ekranına ekleyin" : "Ana ekranınıza ekleyin")
                                .font(.title3.bold())
                            Spacer()
                            Text("3 ADIM")
                                .font(.caption.bold())
                                .foregroundStyle(.blue)
                        }
                        .accessibilityAddTraits(.isHeader)

                        if lockScreen {
                            GuideStep(number: 1, icon: "hand.tap", title: "Basılı tutun", description: "Telefonun kilidini açın, kilit ekranına basılı tutun. Özelleştir → Kilit Ekranı yolunu izleyin.")
                            Divider()
                            GuideStep(number: 2, icon: "plus.app", title: "AeroGuard'ı bulun", description: "Saatin altındaki Araç Takımı Ekle alanına dokunun. AeroGuard'ın dairesel veya dikdörtgen görünümünü seçin.")
                            Divider()
                            GuideStep(number: 3, icon: "checkmark", title: "Yerinizi seçin", description: "Widget'ı ekleyip Bitti'ye dokunun. Tek satırlık görünüm için saatin üstündeki tarih alanını kullanın.")
                        } else {
                            GuideStep(number: 1, icon: "hand.tap", title: "Basılı tutun", description: "Ana ekranda boş bir alana, uygulamalar titreyene kadar basılı tutun.")
                            Divider()
                            GuideStep(number: 2, icon: "plus.app", title: "Galeriyi açın", description: "Düzenle → Araç Takımı Ekle yolunu izleyin ve AeroGuard'ı arayın. Bazı iOS sürümlerinde (+) düğmesi görünür.")
                            Divider()
                            GuideStep(number: 3, icon: "checkmark", title: "Boyutunu seçin", description: "Küçük veya orta boyutu seçip Araç Takımı Ekle'ye dokunun. İstediğiniz yere taşıyıp Bitti ile kaydedin.")
                        }
                    }
                    .padding(20)
                    .background(.background, in: RoundedRectangle(cornerRadius: 24))

                    } else {
                    Label {
                        VStack(alignment: .leading, spacing: 6) {
                            Text("İlk ölçüm için uygulamayı açın")
                                .font(.subheadline.bold())
                            Text("Hava kalitesi verisinin yüklenmesini bekleyin. Widget bu istasyonu takip eder; konumunuz değiştiğinde uygulamadan yenileyin. IP konumu yaklaşık olabilir.")
                                .font(.subheadline)
                                .foregroundStyle(.secondary)
                        }
                    } icon: {
                        Image(systemName: "location.circle.fill")
                            .font(.title2)
                            .foregroundStyle(.blue)
                    }
                    .labelStyle(.titleAndIcon)
                    .padding(18)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(.blue.opacity(0.07), in: RoundedRectangle(cornerRadius: 20))

                    VStack(alignment: .leading, spacing: 12) {
                        Label("Güncel veriyi nasıl takip eder?", systemImage: "arrow.triangle.2.circlepath")
                            .font(.subheadline.bold())
                        Text("Uygulama kapalıyken de son istasyonun verisi yenilenebilir. Yaklaşık 30 dakikalık yenileme istenir; gerçek zamanlamayı iOS belirler.")
                        Text("Widget'taki saat, istasyonun ölçüm saatidir. Ölçüm 3 saatten eskiyse “Veri eski”, henüz ölçüm yoksa “Veri yok” görünür.")
                    }
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .padding(.horizontal, 4)
                    }
                }
                .padding(20)
                .frame(maxWidth: 620)
                .frame(maxWidth: .infinity)
            }
            .id(page)
            }
            .background(Color(uiColor: .secondarySystemBackground))
            .navigationTitle("Widget")
            .navigationBarTitleDisplayMode(.inline)
        }
    }

    private var preview: some View {
        VStack(spacing: 20) {
            HStack {
                Label(lockScreen ? "Kilit ekranı" : "Ana ekran", systemImage: lockScreen ? "lock" : "apps.iphone")
                    .font(.subheadline.bold())
                Spacer()
                Text("ÖRNEK")
                    .font(.caption.bold())
                    .tracking(1)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 6)
                    .background(.white.opacity(0.12), in: Capsule())
            }
            .foregroundStyle(.white.opacity(0.8))

            if lockScreen {
                VStack(spacing: 16) {
                    Text("Pazartesi, 21 Haziran")
                        .font(.subheadline)
                    Text("09:41")
                        .font(.largeTitle.bold().monospacedDigit())
                    ViewThatFits(in: .horizontal) {
                        HStack(spacing: 20) { circularSample; rectangularSample }
                        VStack(spacing: 16) { circularSample; rectangularSample }
                    }
                }
                .foregroundStyle(.white)
                .padding(.vertical, 8)
                .accessibilityElement(children: .ignore)
                .accessibilityLabel("Örnek kilit ekranı widget'ı. AQI 38, iyi. Canlı veri değildir.")
            } else {
                VStack(alignment: .leading, spacing: 14) {
                    Label("AeroGuard", systemImage: "wind")
                        .font(.subheadline.bold())
                        .foregroundStyle(ink)
                    HStack(alignment: .firstTextBaseline, spacing: 8) {
                        Text("38")
                            .font(.largeTitle.bold().monospacedDigit())
                        Text("AQI")
                            .font(.subheadline.bold())
                    }
                    .foregroundStyle(Color(red: 0.02, green: 0.48, blue: 0.33))
                    HStack {
                        Label("İyi", systemImage: "leaf.fill")
                            .font(.subheadline.bold())
                            .foregroundStyle(Color(red: 0.02, green: 0.48, blue: 0.33))
                        Spacer()
                        Text("Örnek istasyon")
                            .font(.caption)
                            .foregroundStyle(ink.opacity(0.65))
                    }
                }
                .padding(22)
                .background(.white, in: RoundedRectangle(cornerRadius: 24))
                .accessibilityElement(children: .ignore)
                .accessibilityLabel("Örnek ana ekran widget'ı. AQI 38, iyi. Canlı veri değildir.")
            }

            Text("Görünüm örneğidir; canlı ölçüm değildir.")
                .font(.caption)
                .foregroundStyle(.white.opacity(0.75))
        }
        .padding(22)
        .background {
            RoundedRectangle(cornerRadius: 28)
                .fill(LinearGradient(colors: [ink, Color(red: 0.08, green: 0.27, blue: 0.42)], startPoint: .topLeading, endPoint: .bottomTrailing))
        }
    }

    private var circularSample: some View {
        VStack(spacing: 2) {
            Text("AQI").font(.caption)
            Text("38").font(.title2.bold().monospacedDigit())
            Text("İyi").font(.caption)
        }
        .padding(14)
        .background(.white.opacity(0.1), in: Circle())
        .overlay(Circle().strokeBorder(.white.opacity(0.3), lineWidth: 1))
    }

    private var rectangularSample: some View {
        VStack(alignment: .leading, spacing: 5) {
            Label("AQI 38 · İyi", systemImage: "wind")
                .font(.headline)
            Text("Örnek istasyon").font(.subheadline)
            Text("Ölçüm 09:00").font(.caption)
        }
    }
}

private struct GuideStep: View {
    let number: Int
    let icon: String
    let title: String
    let description: String

    var body: some View {
        HStack(alignment: .top, spacing: 14) {
            Text(number, format: .number)
                .font(.subheadline.bold().monospacedDigit())
                .foregroundStyle(.blue)
                .frame(width: 32, height: 32)
                .background(.blue.opacity(0.08), in: RoundedRectangle(cornerRadius: 10))
                .accessibilityHidden(true)
            VStack(alignment: .leading, spacing: 6) {
                Label(title, systemImage: icon)
                    .font(.subheadline.bold())
                Text(description)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .accessibilityElement(children: .combine)
    }
}
