# AeroGuard iOS Reklam Entegrasyonu

## Kurulum Adımları

### 1. CocoaPods ile Google Mobile Ads SDK'yı Kurun

Terminal'de `ios` klasörüne gidin ve aşağıdaki komutu çalıştırın:

```bash
cd /Users/erdincyilmaz/Desktop/AeroGuard/aeroguard-mobile/ios
pod install
```

### 2. Xcode Workspace'i Açın

Pod kurulumundan sonra, **AeroGuardMobile.xcworkspace** dosyasını açın (`.xcodeproj` değil):

```bash
open AeroGuardMobile.xcworkspace
```

### 3. Reklam Yapılandırması

Reklam ID'leri `AppConfig.swift` dosyasında tanımlanmıştır:

- **App ID:** `ca-app-pub-1271900948473545~6671318076`
- **Banner Ad Unit ID:** `ca-app-pub-1271900948473545/9419742674`
- **App Open Ad Unit ID:** `ca-app-pub-1271900948473545/7764907893`

### 4. Test Modunu Değiştirme

Geliştirme sırasında test reklamları kullanmak için `AppConfig.swift` dosyasında:

```swift
static let useTestAds = true  // Test için true, production için false
```

### 5. Eklenen Özellikler

#### Banner Reklamlar
- Uygulamanın alt kısmında sürekli görüntülenen adaptive banner reklam
- TabView'ın altında gösterilir

#### App Open Reklamlar
- Uygulama ilk açıldığında gösterilir
- Uygulama arka planda 30 saniyeden fazla kaldıktan sonra ön plana geldiğinde gösterilir

### 6. Dosya Yapısı

```
AeroGuardMobile/
├── Ads/
│   ├── AdManager.swift      # Reklam yönetimi ve App Open reklamlar
│   └── BannerAdView.swift   # SwiftUI Banner reklam bileşeni
├── App/
│   └── AeroGuardApp.swift   # Güncellenmiş - AdMob başlatma
├── Views/
│   └── ContentView.swift    # Güncellenmiş - Banner reklam eklendi
└── Constants/
    └── AppConfig.swift      # Güncellenmiş - Reklam ID'leri eklendi
```

### 7. Önemli Notlar

1. **Info.plist** dosyasına `GADApplicationIdentifier` ve `SKAdNetworkItems` eklendi
2. Projeyi **pod install** çalıştırmadan build edemezsiniz
3. Gerçek cihazda test etmeden önce AdMob hesabınızda uygulamayı kaydedin
4. App Store'a göndermeden önce `useTestAds = false` olduğundan emin olun

### 8. Sorun Giderme

Eğer "No such module 'GoogleMobileAds'" hatası alırsanız:
1. `pod deintegrate` çalıştırın
2. `pod install` tekrar çalıştırın
3. Xcode'u kapatıp `.xcworkspace` dosyasını açın
4. Product > Clean Build Folder yapın
