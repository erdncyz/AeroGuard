# 🌍 AeroGuard Pro - Mobile App

**Gerçek zamanlı hava kalitesi izleme uygulaması** - iOS ve Android widget desteği ile!

## ✨ Özellikler

### 📱 Mobil Uygulama
- ✅ Gerçek zamanlı AQI (Hava Kalitesi İndeksi) gösterimi
- ✅ Konum bazlı hava kalitesi verileri
- ✅ Detaylı kirletici bilgileri (PM2.5, PM10, O₃, NO₂)
- ✅ Hava durumu koşulları (sıcaklık, nem, basınç)
- ✅ Modern ve premium UI tasarımı
- ✅ Pull-to-refresh desteği
- ✅ iOS ve Android desteği

### 🎨 Widget Desteği
- ✅ **iOS Widget** (Small & Medium)
  - Küçük widget: AQI değeri ve durum
  - Orta widget: AQI, şehir, PM2.5 ve sıcaklık
  - 30 dakikada bir otomatik güncelleme
  
- ✅ **Android Widget**
  - Ana ekran widget'ı
  - Gerçek zamanlı AQI gösterimi
  - Renkli durum göstergesi

## 🚀 Kurulum

### Gereksinimler
- Node.js 18+
- React Native CLI
- Xcode (iOS için)
- Android Studio (Android için)
- CocoaPods (iOS için)

### Adımlar

1. **Bağımlılıkları yükleyin:**
```bash
cd aeroguard-mobile
npm install
```

2. **iOS için CocoaPods:**
```bash
cd ios
bundle install
bundle exec pod install
cd ..
```

3. **iOS'ta çalıştırın:**
```bash
npx react-native run-ios
```

4. **Android'de çalıştırın:**
```bash
npx react-native run-android
```

## 📲 Widget Kurulumu

### iOS Widget Ekleme

1. Xcode'da projeyi açın:
```bash
cd ios
xed .
```

2. **File → New → Target** seçin
3. **Widget Extension** seçin
4. İsim: `AeroGuardWidget`
5. `AeroGuardWidget.swift` dosyasını widget target'ına ekleyin
6. Projeyi build edin ve çalıştırın
7. Ana ekranda uzun basın → **Widget ekle** → **AeroGuard** seçin

### Android Widget Ekleme

1. `AndroidManifest.xml` dosyasına widget receiver ekleyin:
```xml
<receiver
    android:name=".widget.AeroGuardWidget"
    android:exported="true">
    <intent-filter>
        <action android:name="android.appwidget.action.APPWIDGET_UPDATE" />
    </intent-filter>
    <meta-data
        android:name="android.appwidget.provider"
        android:resource="@xml/aeroguard_widget_info" />
</receiver>
```

2. Uygulamayı build edin ve yükleyin
3. Ana ekranda uzun basın → **Widget'lar** → **AeroGuard** seçin

## 🎨 Widget Tasarımları

### Küçük Widget (iOS & Android)
```
┌─────────────────┐
│ AEROGUARD    ● │
│                 │
│       42        │
│      AQI        │
│                 │
│     [İYİ]       │
└─────────────────┘
```

### Orta Widget (iOS)
```
┌──────────────────────────────────┐
│  42  │  İstanbul                 │
│ AQI  │  İYİ                      │
│      │  PM2.5: 12          22°   │
└──────────────────────────────────┘
```

## 🔧 Yapılandırma

### API Token
WAQI API token'ınızı ekleyin:

**iOS:** `AeroGuardWidget.swift` dosyasında:
```swift
let url = URL(string: "https://api.waqi.info/feed/here/?token=YOUR_TOKEN")!
```

**Android:** `AeroGuardWidget.kt` dosyasında:
```kotlin
val url = URL("https://api.waqi.info/feed/here/?token=YOUR_TOKEN")
```

Token almak için: https://aqicn.org/data-platform/token/

## 📱 Ekran Görüntüleri

### Ana Ekran
- Büyük AQI göstergesi
- Renkli durum badge'i
- Konum bilgisi
- Son güncelleme zamanı
- Baskın kirletici

### Kirletici Detayları
- PM 2.5
- PM 10
- Ozon (O₃)
- Azot (NO₂)

### Hava Koşulları
- Sıcaklık
- Nem
- Basınç

## 🎨 Renk Kodları (AQI Seviyeleri)

| AQI Aralığı | Seviye | Renk |
|-------------|--------|------|
| 0-50 | İyi | 🟢 #10b981 |
| 51-100 | Orta | 🟡 #eab308 |
| 101-150 | Hassas | 🟠 #f97316 |
| 151-200 | Sağlıksız | 🔴 #ef4444 |
| 201-300 | Çok Sağlıksız | 🟣 #a855f7 |
| 300+ | Tehlikeli | 🔴 #881337 |

## 🏗️ Proje Yapısı

```
aeroguard-mobile/
├── src/
│   ├── screens/
│   │   └── HomeScreen.tsx      # Ana ekran
│   ├── services/
│   │   └── waqiService.ts      # API servisi
│   ├── types/
│   │   └── types.ts            # TypeScript tipleri
│   └── constants/
│       └── constants.ts        # Sabitler
├── ios/
│   └── AeroGuardWidget/
│       └── AeroGuardWidget.swift  # iOS Widget
├── android/
│   └── app/src/main/
│       ├── java/com/aeroguardmobile/widget/
│       │   └── AeroGuardWidget.kt  # Android Widget
│       └── res/
│           ├── layout/
│           │   └── widget_small.xml
│           └── xml/
│               └── aeroguard_widget_info.xml
└── App.tsx                     # Ana uygulama
```

## 🔄 Güncelleme Sıklığı

- **Uygulama:** Pull-to-refresh ile manuel
- **iOS Widget:** 30 dakikada bir otomatik
- **Android Widget:** 30 dakikada bir otomatik

## 🐛 Sorun Giderme

### iOS Widget görünmüyor
1. Widget Extension'ın build edildiğinden emin olun
2. Scheme'de widget target'ının seçili olduğunu kontrol edin
3. Cihazı yeniden başlatın

### Android Widget çalışmıyor
1. `AndroidManifest.xml` dosyasında receiver tanımlı mı kontrol edin
2. Uygulamayı tamamen kaldırıp yeniden yükleyin
3. Widget'ı kaldırıp tekrar ekleyin

### API verisi gelmiyor
1. İnternet bağlantınızı kontrol edin
2. API token'ınızın geçerli olduğundan emin olun
3. WAQI API limitlerini kontrol edin

## 📄 Lisans

MIT License - Erdinç Yılmaz

## 🤝 Katkıda Bulunma

Pull request'ler memnuniyetle karşılanır!

## 📞 İletişim

- **Geliştirici:** Erdinç Yılmaz
- **Website:** https://erdincyilmaz.netlify.app/
- **GitHub:** https://github.com/erdncyz/AeroGuard

## 🙏 Teşekkürler

- **WAQI API:** Hava kalitesi verileri için
- **React Native:** Mobil uygulama framework'ü için
- **WidgetKit:** iOS widget desteği için

---

**Not:** Bu uygulama eğitim amaçlıdır. Üretim ortamında kullanmadan önce güvenlik ve performans testlerini yapın.
