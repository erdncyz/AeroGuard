# AeroGuard Android WebView App

Bu Android uygulaması, AeroGuard web uygulamasını doğrudan bir WebView içinde gösterir. Bu sayede web uygulamasıyla %100 özellik uyumluluğu sağlanır.

## Özellikler

- ✅ Web uygulamasıyla tam uyumluluk
- ✅ Pull-to-refresh (swipe to refresh) desteği
- ✅ Progress bar ile yükleme göstergesi
- ✅ Geri tuşu ile sayfa içi navigasyon
- ✅ Konum izinleri desteği
- ✅ Hardware acceleration
- ✅ Tam ekran deneyim

## Kurulum ve Çalıştırma

### 1. Android Studio ile Açın

```bash
cd /Users/erdincyilmaz/Downloads/aeroguard-pro---global-air-quality-monitor/aeroguard-mobile/android
```

Android Studio'da: **File > Open** > `android` klasörünü seçin

### 2. Gradle Sync

Android Studio otomatik olarak Gradle sync yapacaktır. Eğer yapmazsa:
- **File > Sync Project with Gradle Files**

### 3. Build ve Run

1. Bir emulator veya gerçek cihaz bağlayın
2. **Run > Run 'app'** veya Shift+F10 tuşlarına basın

### Komut Satırından Build

```bash
# Debug APK oluştur
./gradlew assembleDebug

# Release APK oluştur
./gradlew assembleRelease

# APK yükle ve çalıştır
./gradlew installDebug
```

## Değişiklikler

### Önceki Durum
- React Native tabanlı mobil uygulama
- Web ile senkronizasyon sorunları
- Eksik özellikler
- Büyük APK boyutu

### Yeni Durum
- Native Android WebView
- Web uygulamasıyla %100 uyumluluk
- Tüm özellikler otomatik olarak senkronize
- Çok daha küçük APK boyutu

## Teknik Detaylar

### Bağımlılıklar
- AndroidX Core KTX
- AndroidX AppCompat
- SwipeRefreshLayout
- Material Design Components

### İzinler
- `INTERNET` - Web içeriği yüklemek için
- `ACCESS_FINE_LOCATION` - Konum tabanlı hava kalitesi için
- `ACCESS_COARSE_LOCATION` - Konum tabanlı hava kalitesi için
- `ACCESS_NETWORK_STATE` - Ağ durumunu kontrol için

### WebView Ayarları
- JavaScript etkin
- DOM Storage etkin
- Geolocation etkin
- Hardware acceleration etkin
- Zoom kontrolleri etkin
- Mixed content izinli

## URL Değiştirme

Farklı bir URL kullanmak için `MainActivity.kt` dosyasındaki `webAppUrl` değişkenini güncelleyin:

```kotlin
private val webAppUrl = "https://your-url.com"
```

## Sorun Giderme

### Gradle sync hatası
```bash
cd android
./gradlew clean
./gradlew build
```

### APK boyutu küçültme
Release build için ProGuard etkinleştirin:
```gradle
minifyEnabled true
```

### Konum izni çalışmıyor
- Cihaz ayarlarından konum izninin verildiğinden emin olun
- AndroidManifest.xml'de izinlerin tanımlı olduğunu kontrol edin

## APK Konumu

Build sonrası APK dosyası:
```
app/build/outputs/apk/debug/app-debug.apk
app/build/outputs/apk/release/app-release.apk
```
