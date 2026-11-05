# WUUspor — Kişisel Premium Futbol Uygulaması

Sıfır maliyetle, yapay zeka kullanmadan, Windows bilgisayarda geliştirip iPhone 15 Pro Max'te Safari üzerinden ana ekrana eklenerek kullanabileceğiniz bir PWA (Progressive Web App) futbol uygulamasıdır.

## Özellikler

- **Canlı skor:** Süper Lig, Şampiyonlar Ligi, Avrupa Ligi ve Konferans Ligi maçları
- **Puan durumu:** 4 turnuvadaki tüm takımlar
- **Maç detayı:** Kadro, istatistik, olaylar
- **Haberler:** RSS akışlarından sabit kurallar ile etiketleme (takım, kategori, resmi/söylenti)
- **Transfer:** Resmi ve söylenti transferler
- **Sakat / Cezalı oyuncular:** Transfermarkt verileri
- **PWA:** Safari'den "Ana Ekrana Ekle" ile bağımsız uygulama gibi kullanılır
- **Sıfır maliyet:** Hiçbir ücretli API, servis veya kredi kartı gerektirmez
- **Yapay zeka yok:** Tüm veri işleme sabit kurallarla yapılır

## Klasör Yapısı

```
WUUspor/
├── index.html              # Tek sayfa uygulama (tüm ekranlar)
├── manifest.webmanifest    # PWA manifest dosyası
├── sw.js                   # Service Worker (önbellek + güncelleme)
├── .gitignore              # Gitignore (gizli bilgiler hariç tutulur)
├── requirements.txt        # Python bağımlılıkları (Gelecek aşamalar)
├── README.md               # Bu dosya
├── css/                    # Stil dosyaları
│   ├── variables.css       # Tasarım değişkenleri (renk, boşluk, yazı)
│   ├── layout.css          # App kabuğu, safe-area, alt sekme
│   ├── components.css      # Kartlar, butonlar, maç listesi, haber kartı
│   ├── screens.css         # Ekran özel stilleri
│   └── pwa.css             # PWA özel stilleri
├── js/                     # JavaScript dosyaları
│   ├── data.js             # Veri yapıları (boş, Aşama 2'de doldurulur)
│   ├── app.js              # Navigasyon ve durum yönetimi
│   ├── tabs.js             # Alt sekme menüsü
│   ├── first-launch.js     # İlk açılış / onboarding
│   └── pwa.js              # Service Worker kayıt ve standalone kontrol
├── fonts/                  # Yazı tipleri (Barlow Condensed, Manrope)
├── icons/                  # Uygulama simgeleri (PNG, 72-512 piksel)
├── data/                   # Actions tarafından üretilen JSON dosyaları
├── scripts/                # Python betikleri (Gelecek aşamalar)
│   └── kaynaklar/          # Kaynak betikleri (espn.py, mackolik.py, vb.)
└── .github/workflows/      # GitHub Actions (Aşama 1'de boş bırakılır)
```

## Kurulum (Bilgisayar)

1. Bu klasörü VS Code'da açın.
2. Terminalde (PowerShell) şu komutu çalıştırın:

```powershell
python -m http.server 8080
```

3. Tarayıcıda açın: `http://localhost:8080`
4. Chrome'da F12 → Cihaz simgesi → iPhone 14 Pro Max (430x932) seçin.
5. Ana Sayfa'nın kaymadığını, tüm bölümlerin sığdığını kontrol edin.

## GitHub'a Yükleme ve GitHub Pages

1. [GitHub](https://github.com) hesabınızda yeni bir **PUBLIC** depo oluşturun: `WUUspor`
2. Aşağıdaki komutları sırayla çalıştırın (PowerShell, WUUspor klasöründe):

```powershell
git init
git add .
git commit -m "İlk sürüm: WUUspor PWA iskeleti"
git remote add origin https://github.com/KULLANICIADI/WUUspor.git
git branch -M main
git push -u origin main
```

3. GitHub deposunda: **Settings → Pages** sekmesine gidin.
4. **Source:** `Deploy from a branch` → **Branch:** `main` → **Folder:** `/ (root)` seçin ve kaydedin.
5. Uygulamanız şu adreste yayınlanır: `https://KULLANICIADI.github.io/WUUspor/`

## iPhone'da Kullanım

1. Safari'de `https://KULLANICIADI.github.io/WUUspor/` adresini açın.
2. Paylaş simgesine (kare+yukarı ok) tıklayın.
3. **"Ana Ekrana Ekle"** seçeneğini seçin.
4. Uygulama ana ekranınızda simgeyle görünecektir.

## Sınırlamalar ve Dürüst Notlar

- **GitHub Actions zamanlama:** GitHub, 60 gün hiç işlem olmayan public depolarda zamanlanmış görevleri durdurabilir. Yeniden açmak için Actions sekmesi → Enable workflow.
- **Canlı skor:** Telefon ESPN'den doğrudan veri çeker (CORS açık). Maç yoksa 2 dakikada bir, varSA 20 saniyede bir yeniler.
- **Yedek kaynak:** ESPN cevap vermezse Actions'ın yazdığı `/data/mac_yedek.json` dosyası kullanılır. Üstte şeritle "Yedek kaynak" bildirilir.
- **Bildirimler:** iPhone'da sadece ana ekrana eklenmiş PWA'da çalışır (iOS 16.4+). Golden 5-15 dakika gecikebilir.
- **Sahte veri yok:** Hiçbir sabit/static veri kullanılmaz. Veri yoksa "Şu an veri yok" mesajı gösterilir.
- **Yapay zeka yok:** Hiçbir AI servisi veya API anahtarı kullanılmaz.

## Lisans

Kişisel kullanım için ücretsiz.