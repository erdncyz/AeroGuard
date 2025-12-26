# AeroGuard iOS WebView App

Bu iOS uygulaması, AeroGuard web uygulamasını doğrudan bir WebView içinde gösterir. Bu sayede web uygulamasıyla %100 özellik uyumluluğu sağlanır.

## Özellikler

- ✅ Web uygulamasıyla tam uyumluluk
- ✅ Pull-to-refresh desteği
- ✅ Hata yönetimi ve yeniden deneme
- ✅ Yükleme göstergesi
- ✅ Tam ekran deneyim

## Kurulum ve Çalıştırma

### 1. Web Uygulamasını Deploy Edin

Önce web uygulamanızı Netlify'a deploy edin:

```bash
cd /Users/erdincyilmaz/Downloads/aeroguard-pro---global-air-quality-monitor
npm run build
netlify deploy --prod
```

Deploy sonrası size verilen URL'i not alın (örn: `https://aeroguard-xyz.netlify.app`)

### 2. iOS Uygulamasını Yapılandırın

`AppDelegate.swift` dosyasındaki `webAppURL` değişkenini kendi Netlify URL'inizle güncelleyin:

```swift
private let webAppURL = "https://your-actual-url.netlify.app"
```

### 3. Xcode ile Açın

```bash
cd aeroguard-mobile/ios
open AeroGuardMobile.xcworkspace
```

### 4. Build ve Run

Xcode'da:
1. Bir simulator veya gerçek cihaz seçin
2. ⌘+R tuşlarına basarak uygulamayı çalıştırın

## Değişiklikler

### Önceki Durum
- React Native tabanlı mobil uygulama
- Web ile senkronizasyon sorunları
- Eksik özellikler

### Yeni Durum
- Native iOS WebView
- Web uygulamasıyla %100 uyumluluk
- Tüm özellikler otomatik olarak senkronize

## Notlar

- WebView, web uygulamanızın tüm özelliklerini destekler
- Konum izinleri Info.plist'te zaten tanımlı
- HTTPS bağlantılarına izin verildi
- React Native bağımlılıkları kaldırıldı

## Sorun Giderme

### "Invalid URL" hatası
- `AppDelegate.swift` dosyasındaki URL'in doğru olduğundan emin olun
- URL'in `https://` ile başladığından emin olun

### Sayfa yüklenmiyor
- İnternet bağlantınızı kontrol edin
- Web uygulamanızın Netlify'da çalıştığından emin olun
- Safari'de URL'i açarak test edin
