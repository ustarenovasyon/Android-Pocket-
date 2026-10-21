# P🌀CKET LSR — Canlı web uygulaması (PWA)

Görünen son sürüm: **1.0.0**, 21 Ekim 2026.

Kullanıcının paylaştığı `01 P🌀CKET🎚️🔟 — Liquidity Structure Reaction` Pine Script v5 indikatöründen taşınan bağımsız JavaScript hesaplama motoru ve mobil uyumlu web sitesi. Grafik **sahte/simüle edilmiş piyasa mumları içermez**. Ana ekranda Binance Spot veya Binance USDⓈ-M Futures resmi halka açık REST ve WebSocket OHLCV servisleri üzerinden yüklenen kapanmış mumlar kullanılır. İndikatör değerleri yerel cihazda yeniden hesaplanır. Otomatik al/sat emri gönderilmez.

## Kullanım

- `index.html` dosyasını **HTTP(S) üzerinden** açın (örneğin yerelde `python3 -m http.server 8080`; ardından `http://localhost:8080`). `file://` yolu ile açmayın: JavaScript modülleri ve PWA için HTTP(S) gerekir.
- Spot veya USDⓈ-M Futures seçin, parite (`BTCUSDT` vb.) ve zaman periyodunu belirleyin, **Bağlan** düğmesine basın.
- Geçmiş veriler tamamlanıp doğrulandığında WebSocket üzerinden **yalnız `k.x=true` kapanmış mumlarla** yeni sinyal kesinleşir. Açık barın canlı fiyatı sinyal üretmek için kullanılmaz.
- Borsa bağlantısı kesilirse sinyal üretimi durur; geçmiş veri tekrar yüklenir, zaman boşlukları tespit edilir. Geçmişte sinyal üretimi hesaplaması yeniden yapılır; gerçek hayatta kaçırılan uyarı varmış gibi oynatılmaz.
- Ayarlar cihazın tarayıcı depolamasında saklanır. Mobil Chrome'da uygun HTTPS kurulumunda **Ana ekrana ekle / Yükle** üzerinden PWA olarak kullanılabilir. Yalnızca sayfa öndeyken aktif takibe güvenin; ekran kilitli veya tarayıcı uyutulurken çalışan kesintisiz servis vaat edilmez.

## GitHub Pages proje yayını

Bu proje klasörünün **içeriğini** yeni bir GitHub reposunun `main` dalına koyun. Repo > Settings > Pages > Build and deployment > **GitHub Actions** seçin. `.github/workflows/pages.yml`, her push'ta on iki adet deterministik regresyon testini, JS sözdizimi kontrollerini çalıştırıp başarılıysa siteyi yayınlamak için hazırdır. Site adresi GitHub Pages üzerinden oluşturulur. Hedef depo: `ustarenovasyon/Android-Pocket-`. Kodun bu depoya gönderilmesi ve Pages yayınlanmasının başarısı ayrıca doğrulanmalıdır. ZIP tek başına herkese açık adres değildir.

`npm test` veya `node --test tests/*.test.mjs` ile yerel testleri çalıştırın. Üretim sitesi bağımlılık kurulumu istemez; tarayıcı JS modülleri, HTML, CSS ve manifest yeterlidir. Test klasöründeki tamamen sentetik OHLCV örnekleri yalnız birim testlerinin içinde kalır, gerçek uygulamanın veri akışına veya grafiğine bağlanmaz.

## Kaynak kod eşleşmesinin kapsamı

- Korunan: 1–10 katılık eşikleri, pivot gecikmesi, sweep, BOS/CHoCH, FVG/OB tespiti ve örtüşme sıralaması, bölge invalidation, reaksiyon puanı, EMA context, beş preset, açılabilir yardımcı EMA/RSI/ATR/Stoch/MACD/CCI/Keltner/Ichimoku/PSAR/MFI/OBV/HA/TR Shock vb. filtreler, işlem gecikmesi, mum sayısıyla sonlandırma, kazanma/kaybetme ve sanal bakiye hesabı.
- TradingView'in `barstate.isconfirmed` davranışına uymak için sinyal hesapları **sadece kapanmış mumlarla** yeniden oynatılır.
- Kaynak Pine'ın tarih alanı 25 Mayıs–25 Eylül **2025** ile sınırlıydı; bugünün canlı sinyalini engelleyeceği için web sürümünde `useHistoricalDates=false` varsayılanı kullanılır. Doğrulamada geri açılabilir.
- Kaynak Pine'da `evalBars`, `stochD` gibi bazı mevcut girdiler kullanılmıyordu. Webde de orijinal hesap dışına yeni etkiler eklenmedi.
- `manualPayout` ve kazanma/kaybetme istatistiği **opsiyon/expiry mantıklı sanal defterdir**, Spot/Futures gerçek işlem getirisi değildir; komisyon, fonlama, kayma ve emir gerçekleşmesi içermez.
- `multiplierLost` ve sonraki stake miktarı kaynak Pine'daki zarar-kurtarma/martingale davranışını korur. Gerçek para için önerilmez.
- Her açılışta borsadan en fazla 3000 gerçek mum yüklenip tekrar hesaplanır. Pine'ın daha uzun/başka bir geçmişinden başlatılması yüzünden EMA/RSI/state farklılaşabilir. Tarih filtresi `true` olduğunda 2025 tarihli sinyalleri görmek için o tarihleri kapsayan gerçek geçmiş veriyi ayrıca yüklemek gerekir; mevcut sunucu sorgusu son mumları getirir.

## Kontrol edilenler ve kontrol edilmeyenler

**Yerelde geçti:** on iki Node testi; sweep→BOS→retest→core trigger→bar gecikmesi→işlem sonucu, beş preset, EMA/RMA/SMA seed, eski sinyallerin gelecekte değişmemesi, eski tarih filtresi, gerçek mum formatı, mükerrer/gap kontrolü. Ayrıca Android Kotlin kaynak motoruyla bağımsız testlerde **7 ayrı ayar düzeninde, 1.750 mum-snapshot satırı** birebir karşılaştırıldı; incelenen state, core, sinyal, kazanç/kayıp, bakiye ve zone alanlarında fark olmadı.

**Henüz kontrol edilmedi:** TradingView'in kendisinden dışa aktarılmış sinyallerle **birebir Pine eşliği**, gerçek Binance bağlantısının ülke/ağ/tarayıcı üzerinde uçtan uca çalışması, Android Chrome PWA cihaz testi, PSAR ve kısa geçmişteki bütün Pine edge-case'leri, çok uzun süreli WebSocket oturumları. Ortamda dış ağ ve kullanıcının Chrome kontrol oturumu doğrulanamadığı için bunlar tamamlandı gibi sunulmuyor.

## Ticari / teknik sınırlamalar

- Veri **Binance Spot** ve **Binance USDⓈ-M Futures** içindir. Başka borsa, TradingView endeks grafiği, Pocket Option OTC veya farklı kline üreticisi ile aynı fiyat/sinyal garantisi yoktur.
- Binance Spot `1s` mumları destekler; burada Futures için `1s` seçimi engellenir. Binance doğal `5s` aralığı bu uygulamada yoktur.
- Tarayıcı CORS, ağ/ülke bölgesel kısıtlaması, borsa API limitleri veya mobil enerji tasarrufu engellerse canlı veri gelmeyebilir. Bağlantı yokken uygulama **sahte bir fiyat çizmez**.
- PWA kabuk dosyaları (HTML/CSS/JS) çevrimdışı önbelleğe alınabilir; **hiçbir piyasa verisi service worker tarafından çevrimdışı uydurulmaz/önbelleğe alınmaz**. Geçmiş mumlar sayfa yenilemede resmi servisten tekrar alınır.
- Kaynak Pine ile karşılaştırmak için aynı **exchange:BINANCE, market Spot/Perp, regular candles, timezone/interval, minimum tick, başlangıç tarihi** kullanılmalıdır. Uygulamanın *Doğrulama* ekranındaki CSV işlemi destek sunar ancak kendi başına parity sertifikası değildir.