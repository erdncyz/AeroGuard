# Widget güncellemesi ve kilit ekranı

Widget artık iOS bir zaman çizelgesi istediğinde, uygulamada en son kullanılan istasyonun WAQI verisini kendisi sorgular. Uygulamanın açık olması gerekmez. İlk kullanımda uygulama açılmalı ve geçerli bir istasyon ölçümü alınmalıdır. Widget arka planda yeni GPS konumu belirlemez; başka bir yere geçildiğinde uygulama açılarak konum yenilenmelidir.

Yaklaşık 30 dakika sonrası için yenileme talebi verilir. Gerçek çalışma zamanını iOS; görünürlük, pil ve sistem bütçesine göre belirler. Her 30 dakikada kesin yenileme veya saniyelik canlı veri vaat edilmez. [Apple: Widget güncellemeleri](https://developer.apple.com/documentation/widgetkit/keeping-a-widget-up-to-date).

Uygulama yeni ölçüm aldığında widget zaman çizelgelerinin yenilenmesini de ister. İstasyonun kaynak ölçüm saati korunur. İnternet/API hatasında eski verinin tarihi değiştirilmez; 3 saatten eski ölçüm güncel AQI olarak gösterilmez. Arka plan yanıtları ayrı kayda yazılır; farklı istasyonun veya daha eski bir ölçümün uygulamanın seçimini ezmesi engellenir.

## Kilit ekranına ekleme

1. Yeni uygulama sürümünü açıp hava kalitesi verisinin yüklenmesini bekleyin.
2. Kilit ekranına basılı tutun; **Özelleştir → Kilit Ekranı** yolunu izleyin.
3. Saatin altındaki **Widget Ekle** alanından **AeroGuard** seçin. Dairesel veya dikdörtgen görünümü ekleyin.
4. Tek satırlık görünüm için saatin üstündeki tarih alanına dokunup AeroGuard'ı seçin.
5. **Bitti** ile kaydedin.

Ana ekrandaki küçük ve orta boyutlar da desteklenmeye devam eder. Yerleşik Widget Rehberi bu adımları açıklar.

## Geliştirme kontrolü

```sh
npm --prefix aeroguard-mobile run test:data
```

Kontroller geçti: GPS köprüsü ve gerçek widget sağlayıcısının veri/zaman çizelgesi testleri; ayrıca gerçek Swift yenileme koduyla **11 kontrollü API senaryosu**. Bunlar sıfır/eksik/eski ölçüm ayrımını, zaman çizelgesi yenilemesini, ayrı istasyon kayıtlarının karışmamasını ve ağ hatalarını sınar. Yeni görünümler, yapılandırma, rehber ve yenileme servisi iOS 18.6 hedefiyle SDK tip kontrolünden geçti. Gerçek cihazdaki kilit ekranı yerleşimi ve iOS'un fiilî yenileme zamanlaması ayrıca doğrulanmalıdır.

Değişiklikler yerel kaynak kodundadır. Kullanıcı cihazlarına gelmesi için önceki web veri köprüsü değişikliğiyle birlikte web ve iOS sürümleri yayınlanmalıdır.
