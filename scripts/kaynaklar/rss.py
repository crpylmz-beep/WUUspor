# scripts/kaynaklar/rss.py
# RSS haber akışlarını çeker, sabit kurallarla etiketler ve /data klasörüne JSON olarak kaydeder.
# Hiçbir sahte/static veri kullanılmayacak.

import json
import os
import re
import time
import hashlib
import difflib
import random
import requests
import feedparser
from datetime import datetime, timezone, timedelta

# --- RSS kaynakları (test edilen, çalışanlar) ---
RSS_KAYNAKLAR = [
    {"ad": "Fotomaç Ana Sayfa", "url": "https://www.fotomac.com.tr/rss/anasayfa.xml", "tur": "haber"},
    {"ad": "Fotomaç Transfer", "url": "https://www.fotomac.com.tr/rss/transfer.xml", "tur": "transfer"},
    {"ad": "Aspor Ana Sayfa", "url": "https://www.aspor.com.tr/rss/anasayfa.xml", "tur": "haber"},
    {"ad": "Sporx", "url": "https://www.sporx.com/_xml/rss.php", "tur": "haber", "encoding": "windows-1254"},
    {"ad": "Sabah Spor", "url": "https://www.sabah.com.tr/rss/spor.xml", "tur": "haber"},
    {"ad": "Hürriyet Spor", "url": "https://www.hurriyet.com.tr/rss/spor", "tur": "haber"},
]

# Çalışmayanlar (KULLANMA): NTV Spor RSS (boş), Fanatik RSS (404), TRT Spor (403).

HEADERS = {
    "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
    "Accept": "application/rss+xml, application/xml, text/xml, */*",
    "Accept-Language": "tr-TR,tr;q=0.9",
}

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "data")
KURALLAR_DOSYA = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "kurallar.json")


def ensuredir(path):
    os.makedirs(path, exist_ok=True)


def simdi_iso():
    return datetime.now(timezone.utc).isoformat()


def kaydet(dosya_adi, veri):
    ensuredir(DATA_DIR)
    yol = os.path.join(DATA_DIR, dosya_adi)
    with open(yol, "w", encoding="utf-8") as f:
        json.dump(veri, f, ensure_ascii=False, indent=2)


def oku_json(dosya_yolu):
    if not os.path.exists(dosya_yolu):
        return None
    with open(dosya_yolu, "r", encoding="utf-8") as f:
        return json.load(f)


def rastgele_bekle(min_sn=1, max_sn=3):
    sure = random.uniform(min_sn, max_sn)
    time.sleep(sure)
    return sure


def temizle_html(metin):
    """HTML etiketlerini, resim kodlarını ve gereksiz boşlukları temizler."""
    if not metin:
        return ""
    # HTML etiketlerini kaldır
    temiz = re.sub(r"<[^>]+>", " ", metin)
    # HTML varlıklarını (&amp; vb.) basitçe çöz
    temiz = temiz.replace("&amp;", "&").replace("&lt;", "<").replace("&gt;", ">")
    temiz = temiz.replace("&quot;", '"').replace("&#39;", "'").replace("&nbsp;", " ")
    # "devamı için tıklayın" gibi kalıpları temizle
    temiz = re.sub(r"devamı için.*?tıklayın", "", temiz, flags=re.IGNORECASE)
    temiz = re.sub(r"detaylı bilgi için.*", "", temiz, flags=re.IGNORECASE)
    # Fazla boşlukları tek boşluğa indir
    temiz = re.sub(r"\s+", " ", temiz).strip()
    return temiz


def kisa_ozet_olustur(metin, max_cumle=3, max_karakter=280):
    """Özeti en fazla max_cumle cümle ve max_karakter karakterle kısaltır."""
    if not metin:
        return ""

    metin = temizle_html(metin)
    if not metin:
        return ""

    # Cümleleri ayır (nokta, ünlem, soru işaretine göre)
    cumleler = re.split(r"(?<=[.!?])\s+", metin)
    secilen = []
    toplam = 0

    for cumle in cumleler:
        cumle = cumle.strip()
        if not cumle:
            continue
        if len(secilen) >= max_cumle:
            break
        yeni_uzunluk = toplam + len(cumle) + (1 if secilen else 0)
        if yeni_uzunluk > max_karakter and secilen:
            break
        secilen.append(cumle)
        toplam = yeni_uzunluk

    ozet = " ".join(secilen)
    # Kelimenin ortasında kesilmemiş olsun, sonuna "…" ekle
    if len(ozet) < len(metin):
        ozet = ozet.rstrip() + "…"

    return ozet


def turkce_duzelt(metin):
    """Türkçe karakterleri büyük/küçük harf duyarsız karşılaştırma için normalize eder."""
    if not metin:
        return ""
    haritalama = str.maketrans("çğıöşüÇĞİÖŞÜ", "cgiosuCGIOSU")
    return metin.lower().translate(haritalama)


def takim_etiketle(baslik, ozet, kurallar):
    """Başlık ve özet içinde takım kelimelerini arar. Birden fazla takım çıkabilir."""
    metin = turkce_duzelt((baslik or "") + " " + (ozet or ""))
    bulunan = []

    for takim_kodu, kelimeler in kurallar.get("takimlar", {}).items():
        for kelime in kelimeler:
            kelime_duzelt = turkce_duzelt(kelime)
            # Tam kelime eşleşmesi (kelime sınırları)
            if re.search(r"\b" + re.escape(kelime_duzelt) + r"\b", metin):
                if takim_kodu not in bulunan:
                    bulunan.append(takim_kodu)
                break

    return bulunan if bulunan else ["diğer"]


def kategori_etiketle(baslik, ozet, kurallar):
    """Haberin kategorisini belirler: transfer, sakatlık-ceza, maç, yoksa genel."""
    metin = turkce_duzelt((baslik or "") + " " + (ozet or ""))

    for kategori, kelimeler in kurallar.get("kategoriler", {}).items():
        for kelime in kelimeler:
            kelime_duzelt = turkce_duzelt(kelime)
            if re.search(r"\b" + re.escape(kelime_duzelt) + r"\b", metin):
                return kategori

    return "genel"


def transfer_durumu_etiketle(baslik, ozet, kurallar):
    """Haberin transfer durumunu belirler: RESMİ / SÖYLENTİ."""
    metin = turkce_duzelt((baslik or "") + " " + (ozet or ""))
    durumlar = kurallar.get("transferDurumu", {})

    resmi_var = False
    for kelime in durumlar.get("resmi", []):
        kelime_duzelt = turkce_duzelt(kelime)
        if re.search(r"\b" + re.escape(kelime_duzelt) + r"\b", metin):
            resmi_var = True
            break

    soylenti_var = False
    for kelime in durumlar.get("soylenti", []):
        kelime_duzelt = turkce_duzelt(kelime)
        if re.search(r"\b" + re.escape(kelime_duzelt) + r"\b", metin):
            soylenti_var = True
            break

    if resmi_var and not soylenti_var:
        return "RESMİ"
    elif soylenti_var and not resmi_var:
        return "SÖYLENTİ"
    else:
        # İkisi birden geçiyorsa veya hiçbiri yoksa SÖYLENTİ sayılır (güvenli taraf)
        return "SÖYLENTİ"


def benzer_mi(baslik1, baslik2, oran=0.8):
    """İki başlık arasındaki benzerlik oranını hesaplar."""
    if not baslik1 or not baslik2:
        return 0.0
    return difflib.SequenceMatcher(None, turkce_duzelt(baslik1), turkce_duzelt(baslik2)).ratio()


def tekrar_ayikla(haberler, oran=0.8):
    """Aynı gün içinde %80 ve üzeri benzer başlıkları tek habere indirir."""
    benzersiz = []

    for haber in haberler:
        found = False
        for mevcut in benzersiz:
            if benzer_mi(haber["baslik"], mevcut["baslik"], oran):
                # Kaynak bilgisini birleştir
                mevcut_kaynaklar = mevcut.get("kaynaklar", [])
                yeni_kaynak = haber.get("kaynak", "")
                if yeni_kaynak and yeni_kaynak not in mevcut_kaynaklar:
                    mevcut_kaynaklar.append(yeni_kaynak)
                mevcut["kaynaklar"] = mevcut_kaynaklar
                # Kaynak sayısını güncelle
                mevcut["kaynakSayisi"] = len(mevcut_kaynaklar)
                found = True
                break
        if not found:
            haber["kaynaklar"] = [haber.get("kaynak", "")]
            haber["kaynakSayisi"] = 1
            benzersiz.append(haber)

    return benzersiz


def rss_cek(kaynak):
    """Tek bir RSS kaynağını çeker ve haber listesini döndürür."""
    url = kaynak["url"]
    kaynak_adi = kaynak["ad"]
    encoding = kaynak.get("encoding")

    try:
        cevap = requests.get(url, headers=HEADERS, timeout=20)
        if cevap.status_code != 200:
            print(f"[RSS] {kaynak_adi}: HTTP {cevap.status_code}")
            return [], f"HTTP {cevap.status_code}"

        icerik = cevap.content

        # Sporx için windows-1254 kodlaması
        if encoding:
            icerik = cevap.content.decode(encoding, errors="replace").encode("utf-8")

        # feedparser ile parse et
        beslenme = feedparser.parse(icerik)

        if beslenme.bozo and not beslenme.entries:
            print(f"[RSS] {kaynak_adi}: Geçersiz RSS (bozo={beslenme.bozo})")
            return [], "Geçersiz RSS"

        haberler = []
        for giris in beslenme.entries:
            baslik = giris.get("title", "").strip()
            link = giris.get("link", "")
            aciklama = giris.get("description", "") or giris.get("summary", "") or ""
            yayin_tarihi = giris.get("published", "") or giris.get("updated", "")

            if not baslik:
                continue

            ozet = kisa_ozet_olustur(aciklama)
            if not ozet and not aciklama:
                # Açıklama yoksa sadece başlık gösterilir, özet uydurulmaz
                ozet = ""

            haberler.append({
                "baslik": baslik,
                "ozet": ozet,
                "link": link,
                "kaynak": kaynak_adi,
                "yayinTarihi": yayin_tarihi,
                "guncellendi": simdi_iso(),
            })

        print(f"[RSS] {kaynak_adi}: {len(haberler)} haber alındı.")
        return haberler, None

    except Exception as hata:
        msg = str(hata)
        print(f"[RSS] {kaynak_adi}: HATA - {msg}")
        return [], msg


def tum_haberleri_cek(kurallar):
    """Tüm RSS kaynaklarından haberleri çeker ve birleştirir."""
    tum_haberler = []
    hatalar = {}

    for kaynak in RSS_KAYNAKLAR:
        try:
            haberler, hata = rss_cek(kaynak)
            if hata:
                hatalar[kaynak["ad"]] = hata
            tum_haberler.extend(haberler)
            rastgele_bekle(1, 3)
        except Exception as hata:
            msg = str(hata)
            print(f"[RSS] {kaynak['ad']}: BEKLENMEDİK HATA - {msg}")
            hatalar[kaynak["ad"]] = msg

    return tum_haberler, hatalar


def haberleri_etiketle(haberler, kurallar):
    """Her habere takım, kategori ve transfer durumu etiketleri ekler."""
    etiketlenmis = []

    for haber in haberler:
        takimlar = takim_etiketle(haber["baslik"], haber["ozet"], kurallar)
        kategori = kategori_etiketle(haber["baslik"], haber["ozet"], kurallar)
        transfer_durumu = transfer_durumu_etiketle(haber["baslik"], haber["ozet"], kurallar)

        # x dk önce hesapla
        try:
            yayin = datetime.fromisoformat(haber["yayinTarihi"].replace("Z", "+00:00"))
            simdi = datetime.now(timezone.utc)
            fark = simdi - yayin
            dakika = int(fark.total_seconds() / 60)
            if dakika < 1:
                zaman = "az önce"
            elif dakika < 60:
                zaman = f"{dakika} dk önce"
            else:
                saat = dakika // 60
                zaman = f"{saat} sa önce"
        except Exception:
            zaman = ""

        etiketlenmis.append({
            "baslik": haber["baslik"],
            "ozet": haber["ozet"],
            "link": haber["link"],
            "kaynak": haber["kaynak"],
            "yayinTarihi": haber["yayinTarihi"],
            "zaman": zaman,
            "takimlar": takimlar,
            "kategori": kategori,
            "transferDurumu": transfer_durumu if kategori == "transfer" else "",
            "guncellendi": haber["guncellendi"],
        })

    return etiketlenmis


def son_30_gunu_tut(haberler):
    """Haber arşivi son 30 günü tutar."""
    simdi = datetime.now(timezone.utc)
    sinir = simdi - timedelta(days=30)
    sonuc = []

    for haber in haberler:
        try:
            tarih = datetime.fromisoformat(haber["yayinTarihi"].replace("Z", "+00:00"))
            if tarih >= sinir:
                sonuc.append(haber)
        except Exception:
            # Tarih parse edilemezse haberi tut
            sonuc.append(haber)

    return sonuc


def main():
    print("=" * 50)
    print("WUUspor — RSS Haber Toplayıcı (Python)")
    print("=" * 50)

    # Kuralları yükle
    kurallar = oku_json(KURALLAR_DOSYA)
    if not kurallar:
        print("[RSS] HATA: kurallar.json dosyası bulunamadı!")
        return

    # Tüm kaynaklardan haberleri çek
    tum_haberler, hatalar = tum_haberleri_cek(kurallar)

    if not tum_haberler:
        print("[RSS] Hiç haber alınamadı.")
        kaydet("haberler.json", {
            "toplam": 0,
            "guncellendi": simdi_iso(),
            "haberler": [],
            "hatalar": hatalar,
        })
        kaydet("transferler.json", {
            "toplam": 0,
            "guncellendi": simdi_iso(),
            "transferler": [],
            "hatalar": hatalar,
        })
        return

    # Haberleri etiketle (takım, kategori, transfer durumu)
    etiketlenmis = haberleri_etiketle(tum_haberler, kurallar)

    # Tekrar ayıkla (%80 üzeri benzer başlıklar tek habere indirilir)
    benzersiz = tekrar_ayikla(etiketlenmis, oran=0.8)

    # Son 30 günü tut
    arsiv = son_30_gunu_tut(benzersiz)

    # Haberleri ve transferleri ayır
    haberler_listesi = [h for h in arsiv if h["kategori"] != "transfer"]
    transferler_listesi = [h for h in arsiv if h["kategori"] == "transfer"]

    # Haberleri kaydet
    kaydet("haberler.json", {
        "toplam": len(haberler_listesi),
        "guncellendi": simdi_iso(),
        "haberler": haberler_listesi,
        "hatalar": hatalar,
    })
    print(f"[RSS] {len(haberler_listesi)} haber kaydedildi.")

    # Transferleri kaydet
    kaydet("transferler.json", {
        "toplam": len(transferler_listesi),
        "guncellendi": simdi_iso(),
        "transferler": transferler_listesi,
        "hatalar": hatalar,
    })
    print(f"[RSS] {len(transferler_listesi)} transfer haberi kaydedildi.")

    # Kaynak durumu raporu
    kaynak_durumu = {}
    for kaynak in RSS_KAYNAKLAR:
        adi = kaynak["ad"]
        hata = hatalar.get(adi)
        kaynak_durumu[adi.lower().replace(" ", "_")] = {
            "sonBasari": simdi_iso(),
            "hata": hata,
            "durum": "boş" if hata else "aktif",
        }

    kaynak_durumu["guncellendi"] = simdi_iso()
    kaydet("kaynak_durumu.json", kaynak_durumu)
    print("[RSS] Kaynak durumu kaydedildi.")

    print("=" * 50)
    print("İşlem tamamlandı.")


if __name__ == "__main__":
    main()