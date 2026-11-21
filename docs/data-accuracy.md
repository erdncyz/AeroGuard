# Konum ve veri doğruluğu incelemesi

İnceleme tarihi: 21 Kasım 2026. Değişiklikler yerel kaynak kodundadır; web sitesi ve mobil uygulama yayınlanmadı.

## Düzeltilen sorunlar

- WAQI `iaqi` kirletici değerleri AQI alt indeksidir. Ana ekran, arama sonucu, tahmin, paylaşım kartı ve AI bağlamı artık bu değerleri konsantrasyon (`µg/m³`, `ppb`, `ppm`) gibi sunmaz. Renkler AQI eşiklerini kullanır. Kaynak: [WAQI API](https://aqicn.org/api/).
- Koordinatlar, AQI, istasyon kimliği, HTTP yanıtı ve ölçüm zamanı doğrulanır. Eksik, boş, negatif veya geçersiz değerler temiz hava sayılmaz; gerçek sıfır korunur. İleri tarihli ölçümler reddedilir, eski ölçümün gerçek tarihi gösterilir.
- GPS erişilemezse IP konumu açıkça yaklaşık olarak gösterilir. GPS konumu bilinirken istasyon isteği başarısız olursa başka bir şehrin IP verisine sessizce geçilmez. Konum doğruluk yarıçapı ve istasyon uzaklığı görünür.
- En yakın geçerli istasyon mesafeye göre seçilir. Yakın istasyon mesafeleri GPS varsa cihazdan, IP durumunda ana istasyondan hesaplanır. Aramalarda açık istasyon kimliği kullanılır; çoklu sonuçlarda ilk istasyon rastgele seçilmez. Ülke/şehir bilgisi istasyon adını virgülden bölerek tahmin edilmez.
- Geç gelen konum, istasyon, polen, geçmiş ve AI yanıtları yeni konumun verisini ezmez. Yakın istasyon seçimi arama detayını açar; ana konum ve widget kaydıyla karışmaz.
- Open-Meteo geçmiş grafikleri arşivlenmiş model verisidir; istasyon ölçümü veya AQI olarak adlandırılmaz. Ozon dahil konsantrasyonlar `µg/m³` olarak gösterilir. Eksik günler sıfıra dönüşmez; gelecekteki UV değerleri geçmiş grafiğine eklenmez. Yerel günler ve yaz/kış saati geçişleri korunur. Kaynak: [Open-Meteo Air Quality API](https://open-meteo.com/en/docs/air-quality-api).
- Polen güncel saate ait model tahmininden alınır. Eksik veri “Veri yok” olarak gösterilir. Renk skalası kişisel alerji riski olarak sunulmaz. UV tahminleri geçerli günün günlük maksimumunu kullanır; AQI tahminindeki ana değer günlük ortalamadır.
- iOS widget verisizken AQI 42 üretmez. AQI, istasyon adı, koordinatlar ve kaynak ölçüm zamanı tek kayıt olarak aktarılır. Gerçek sıfır gösterilir; 3 saatten eski değer kullanılabilir güncel ölçüm gibi sunulmaz.
- Widget için son istasyonun API verisini uygulama kapalıyken yenileme ve kilit ekranında dairesel/dikdörtgen/tek satırlık gösterim eklendi. iOS'un yenileme zamanını belirlemesi ve ilk kurulum adımları [widget açıklamasında](widget-refresh.md) yer alır.
- Native GPS köprüsü eşzamanlı istekleri ve zaman aşımını yönetir, cihazın gerçek konum zamanını/doğruluğunu korur. WeatherKit birimleri açıkça dönüştürülür; rüzgâr `km/sa`, güncelleme zamanı ölçüm zamanıdır. Android WebView konumu için uygulama izni ve doğru HTTPS kaynağı kontrol edilir.
- Yüzme suyu dosyası **21 Haziran 2026** tarihli bir arşiv kaydıdır. Tarih ekranda gösterilir; dosya tarihi numune tarihi gibi sunulmaz. Dosya yenilenmedi. Güncel kalite ve yasaklar için paneldeki resmî sistem bağlantısı kullanılmalıdır.

## Doğrulama

```sh
npm test
npm run typecheck
npm run build
npm --prefix aeroguard-mobile run test:data
```

**32 web testi**, TypeScript kontrolü, üretim derlemesi ve native veri kontrolleri geçti. Web testleri gerçek servis/bileşen/uygulama kodunu kontrollü API ve konum yanıtlarıyla sınar: eksik/sıfır ayrımı, koordinatlar, zaman dilimleri, yaz/kış saati, yanıt sırası, açık istasyon seçimi, eski veri, UV maksimumu ve AI bağlamı. Native veri kontrolü Mac üzerinde Swift derleyicisini de kullanır.

Canlı tarayıcı kontrolünde IP üzerinden yüklenen ana istasyon ile İstanbul/Kadıköy arama sonucunun ayrı kaldığı, AQI birimleri ve tarihlerin gösterildiği doğrulandı. iOS kaynakları ayrıca SDK ile tip kontrolünden geçirildi. Tam iOS derlemesinde GitHub paketlerinin indirilmesi ağ/DNS nedeniyle tamamlanamadı; Android derlemesi için bu ortamda Java bulunmuyor.

## Doğruluk sınırı

Bu düzeltmeler verinin yanlış yorumlanmasını ve konumların karışmasını önler; sensör kalibrasyonunu doğrulamaz. İstasyon AQI'si kullanıcının bulunduğu noktada yapılmış ölçüm değildir. Polen/geçmiş/tahminler model verisidir. Fiziksel cihazda GPS, izinler, WeatherKit ve widget birlikte ayrıca sınanmalıdır.
