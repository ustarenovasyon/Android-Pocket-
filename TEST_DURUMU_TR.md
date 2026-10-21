# Test durumu — 21.10.2026

**Kod sürümü:** Web v1.0.0 (PWA kaynak, staging doğrulaması)

## Doğrulanan

- [x] Pine v5 formüllerinden port edilen JavaScript engine için 12 birim/regresyon testi geçti.
- [x] Sinyal zinciri (70. mum SWEEP, 71. mum BOS+OB/FVG, 72. mum CORE, 73. mum +1 gecikmeli LONG) testi geçti.
- [x] Kazanç hesabı kaynak Pine beklenen sonuç: 10.000$ → 10.085$ (100$ stake, %85 sanal payout) geçti.
- [x] Sonraki mumlara bakarak geçmiş sinyalin değişmemesi test edildi.
- [x] Kapanmış OHLCV biçimi / duplicate / timestamp gap kontrolleri test edildi.
- [x] 2025 tarih filtresi nedeniyle 2027 örnek mumlarında işlem oluşmaması test edildi.
- [x] Kotlin eski motoruna karşı 7 ayar senaryosu × 250 mum = 1750 satır (durum, yön, skor yönü, wins/losses, zone, bakiye) karşılaştırması; 0 uyumsuzluk.
- [x] Tüm JS dosyalarında `node --check` başarılı.
- [x] GitHub Pages CI pipeline ve PWA manifest/service-worker kaynakları hazırlandı.

## Henüz doğrulanmayan

- [ ] Gerçek TradingView Pine grafik geçmişi/sinyal CSV'siyle farklı bar sayısında parity kontrolü.
- [ ] Gerçek borsanın çalışma zamanında canlı WebSocket bağlantısı ve REST CORS erişimi.
- [ ] Mobil Chrome üzerinde ekran/kurulum testi (bu ortamda Chromium headless ekran görüntüsü alınamadı).
- [ ] Son kullanıcı GitHub hesabında **yeni repo oluşturulması ve GitHub Pages canlı adrese yayın**. Repo `ustarenovasyon/Android-Pocket-` oluşturulmuş; yayın başarısı ayrıca kontrol edilir.
- [ ] 7/24 çalışmanın veya Android ekran kilitliyken bildirimlerin doğrulanması; böyle bir garanti verilmez.

## Üretim güvenlik yaklaşımı

Canlı veri doğrulanamıyorsa gerçek fiyat, sinyal veya kazanma oranı uydurulmaz. Sinyal gücü geçmişte performans/gelecekte getiri garantisi değildir. Fiziksel al/sat API anahtarı alınmaz ve emir gönderilmez.