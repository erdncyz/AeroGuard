import SwiftUI

struct WidgetGuideView: View {
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {

                    // Header Image
                    HStack {
                        Spacer()
                        Image(systemName: "apps.iphone")
                            .resizable()
                            .aspectRatio(contentMode: .fit)
                            .frame(height: 100)
                            .foregroundColor(.blue)
                        Spacer()
                    }
                    .padding(.vertical, 20)

                    Text("Ana Ekranınıza AeroGuard Widget'ı Ekleyin")
                        .font(.title2)
                        .fontWeight(.bold)
                        .multilineTextAlignment(.center)
                        .frame(maxWidth: .infinity)

                    Text(
                        "Hava kalitesini uygulamayı açmadan anında görmek için widget'ımızı kullanabilirsiniz."
                    )
                    .font(.body)
                    .foregroundColor(.secondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal)

                    Divider()
                        .padding(.vertical)

                    // Step 1
                    GuideStep(
                        icon: "hand.tap.fill", title: "1. Basılı Tutun",
                        description:
                            "Ana ekranda boş bir alana uygulamalar titreyene kadar basılı tutun.")

                    // Step 2
                    GuideStep(
                        icon: "plus.circle.fill", title: "2. Ekle Butonuna Basın",
                        description: "Sol üst köşede çıkan (+) butonuna dokunun.")

                    // Step 3
                    GuideStep(
                        icon: "magnifyingglass", title: "3. AeroGuard'ı Bulun",
                        description: "Arama çubuğuna 'AeroGuard' yazın ve seçin.")

                    // Step 4
                    GuideStep(
                        icon: "checkmark.circle.fill", title: "4. Widget'ı Ekleyin",
                        description: "İstediğiniz boyutu seçip 'Widget Ekle' butonuna basın.")

                    Spacer()
                }
                .padding()
            }
            .navigationTitle("Widget Rehberi")
        }
    }
}

struct GuideStep: View {
    let icon: String
    let title: String
    let description: String

    var body: some View {
        HStack(alignment: .top, spacing: 15) {
            Image(systemName: icon)
                .font(.title)
                .foregroundColor(.blue)
                .frame(width: 40)

            VStack(alignment: .leading, spacing: 5) {
                Text(title)
                    .font(.headline)
                Text(description)
                    .font(.subheadline)
                    .foregroundColor(.secondary)
            }
        }
    }
}

struct WidgetGuideView_Previews: PreviewProvider {
    static var previews: some View {
        WidgetGuideView()
    }
}
