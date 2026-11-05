# scripts/kaynaklar/transfermarkt.py
# Transfermarkt'tan sakat ve cezalı oyuncu listesini çeker.
# 4 büyük kulüp: Galatasaray 141, Fenerbahçe 36, Beşiktaş 114, Trabzonspor 449
# URL: https://www.transfermarkt.com.tr/{kulup-adi}/sperrenundverletzungen/verein/{numara}
# Hiçbir sahte/static veri kullanılmayacak.

import json
import os
import re
import time
import random
import requests
from datetime import datetime, timezone
from bs4 import BeautifulSoup

KULUPLER = {
    "gs": {"ad": "galatasaray", "numara": 141, "takimAd": "Galatasaray"},
    "fb": {"ad": "fenerbahce", "numara": 36, "takimAd": "Fenerbahçe"},
    "bjk": {"ad": "besiktas", "numara": 114, "takimAd": "Beşiktaş"},
    "ts": {"ad": "trabzonspor", "numara": 449, "takimAd": "Trabzonspor"},
}

BASE_URL = "https://www.transfermarkt.com.tr"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
    "Accept-Language": "tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Referer": "https://www.transfermarkt.com.tr/",
}

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "data")


def ensuredir(path):
    os.makedirs(path, exist_ok=True)


def simdi_iso():
    return datetime.now(timezone.utc).isoformat()


def kaydet(dosya_adi, veri):
    ensuredir(DATA_DIR)
    yol = os.path.join(DATA_DIR, dosya_adi)
    with open(yol, "w", encoding="utf-8") as f:
        json.dump(veri, f, ensure_ascii=False, indent=2)


def oku(dosya_adi):
    yol = os.path.join(DATA_DIR, dosya_adi)
    if not os.path.exists(yol):
        return None
    with open(yol, "r", encoding="utf-8") as f:
        return json.load(f)


def rastgele_bekle(min_sn=5, max_sn=10):
    sure = random.uniform(min_sn, max_sn)
    time.sleep(sure)

def fetch_html(url, deneme=0):
    """HTML sayfasını çeker. Hata olursa artan beklemeyle 3 kez dener."""
    bekle = 5 * (2 ** deneme)
    try:
        cevap = requests.get(url, headers=HEADERS, timeout=20)
        if cevap.status_code in (202, 403, 429, 503):
            raise Exception(f"HTTP {cevap.status_code} (bot koruması veya sunucu meşgul)")
        if cevap.status_code != 200:
            raise Exception(f"HTTP {cevap.status_code}")

        html = cevap.text
        if "captcha" in html.lower() or "robot" in html.lower() or "blocked" in html.lower():
            raise Exception("Bot doğrulama sayfası tespit edildi")

        return html
    except Exception as hata:
        if deneme < 2:
            print(f"[Transfermarkt] Deneme {deneme + 1}/3 hata: {hata}. {bekle} sn bekleniyor...")
            time.sleep(bekle)
            return fetch_html(url, deneme + 1)
        raise hata


def sütun_bul(tablo, aranan_basliklar):
    baslik_satiri = tablo.find("tr")
    if not baslik_satiri:
        return -1

    hucreler = baslik_satiri.find_all(["th", "td"])
    for idx, hucre in enumerate(hucreler):
        metin = hucre.get_text(strip=True).lower()
        for aranan in aranan_basliklar:
            if aranan in metin:
                return idx
    return -1


def temizle_metin(metin):
    if not metin:
        return ""
    return re.sub(r"\s+", " ", metin).strip()


def oyuncu_listesini_ayir(html, kulup_kodu):
    soup = BeautifulSoup(html, "html.parser")

    tablolar = soup.find_all("table")
    hedef_tablo = None

    for tablo in tablolar:
        sınıflar = " ".join(tablo.get("class", []))
        id_deger = tablo.get("id", "")
        if "items" in sınıflar or "zustand" in id_deger.lower() or "verletzten" in id_deger.lower():
            hedef_tablo = tablo
            break

    if not hedef_tablo:
        if tablolar:
            hedef_tablo = max(tablolar, key=lambda t: len(t.find_all("tr")))

    if not hedef_tablo:
        return [], "Tablo bulunamadı"

    oyuncu_idx = sütun_bul(hedef_tablo, ["oyuncu", "spieler", "ad", "name"])
    mevki_idx = sütun_bul(hedef_tablo, ["mevki", "position", "pos"])
    durum_idx = sütun_bul(hedef_tablo, ["durum", "status", "zustand"])
    sure_idx = sütun_bul(hedef_tablo, ["süre", "dauer", "sure"])
    dönüş_idx = sütun_bul(hedef_tablo, ["dönüş", "return", "rückkehr"])
    kaçırılan_idx = sütun_bul(hedef_tablo, ["kaçırılan", "verpasste", "games"])

    satırlar = hedef_tablo.find_all("tr")[1:]
    oyuncular = []

    for satır in satırlar:
        try:
            hucreler = satır.find_all(["td", "th"])
            if len(hucreler) < 2:
                continue

            def hucre_deger(idx):
                if idx < 0 or idx >= len(hucreler):
                    return ""
                return temizle_metin(hucreler[idx].get_text(" ", strip=True))

            oyuncu_adı = hucre_deger(oyuncu_idx) if oyuncu_idx >= 0 else ""
            mevki = hucre_deger(mevki_idx) if mevki_idx >= 0 else ""
            durum = hucre_deger(durum_idx) if durum_idx >= 0 else ""
            sakatlık_türü = hucre_deger(sure_idx) if sure_idx >= 0 else ""
            dönüş = hucre_deger(dönüş_idx) if dönüş_idx >= 0 else ""
            kaçırılan = hucre_deger(kaçırılan_idx) if kaçırılan_idx >= 0 else ""

            if not oyuncu_adı:
                continue

            durum_türü = "Diğer"
            durum_lower = durum.lower()
            if any(k in durum_lower for k in ["sakat", "verletzung", "injury"]):
                durum_türü = "Sakat"
            elif any(k in durum_lower for k in ["ceza", "sperre", "suspended", "kırmızı kart"]):
                durum_türü = "Cezalı"
            elif any(k in durum_lower for k in ["şüpheli", "doubtful", "fragezeichen"]):
                durum_türü = "Şüpheli"

            oyuncular.append({
                "ad": oyuncu_adı,
                "mevki": mevki or "Belirtilmemiş",
                "durum": durum_türü,
                "detay": durum or "",
                "sakatlıkTuru": sakatlık_türü or "",
                "dönüşTarihi": dönüş or "",
                "kaçırılanMaç": kaçırılan or "",
                "kulup": KULUPLER[kulup_kodu]["takimAd"],
                "kaynak": f"{BASE_URL}/{KULUPLER[kulup_kodu]['ad']}/sperrenundverletzungen/verein/{KULUPLER[kulup_kodu]['numara']}",
            })
        except Exception:
            continue

    return oyuncular, None


def kulup_verisini_cek(kulup_kodu):
    kulup = KULUPLER[kulup_kodu]
    url = f"{BASE_URL}/{kulup['ad']}/sperrenundverletzungen/verein/{kulup['numara']}"

    print(f"[Transfermarkt] {kulup['takimAd']} çekiliyor: {url}")

    html = fetch_html(url)
    oyuncular, hata = oyuncu_listesini_ayir(html, kulup_kodu)

    print(f"[Transfermarkt] {kulup['takimAd']}: {len(oyuncular)} oyuncu alındı.")
    return oyuncular, hata


def eski_listeyi_birlestir(yeni_listesi, dosya_adi):
    eski = oku(dosya_adi)
    if not yeni_listesi and eski:
        print(f"[Transfermarkt] Yeni liste boş, eski dosya korundu: {dosya_adi}")
        return eski.get("oyuncular", [])
    return yeni_listesi


def main():
    print("=" * 50)
    print("WUUspor — Transfermarkt Sakat/Cezalı Toplayıcı (Python)")
    print("=" * 50)

    tum_sonuc = {}
    hatalar = {}

    for kulup_kodu in KULUPLER:
        try:
            oyuncular, hata = kulup_verisini_cek(kulup_kodu)

            if hata and ("ayrıştırma" in hata.lower() or "tablo" in hata.lower()):
                oyuncular = eski_listeyi_birlestir(oyuncular, f"eksikler_{kulup_kodu}.json")

            tum_sonuc[kulup_kodu] = {
                "kulup": KULUPLER[kulup_kodu]["takimAd"],
                "oyuncuSayisi": len(oyuncular),
                "oyuncular": oyuncular,
                "hata": hata,
                "guncellendi": simdi_iso(),
            }

            if hata:
                hatalar[kulup_kodu] = hata

            if kulup_kodu != list(KULUPLER.keys())[-1]:
                beklenen = rastgele_bekle(5, 10)
                print(f"[Transfermarkt] {beklenen:.1f} sn bekleniyor...")

        except Exception as hata:
            msg = str(hata)
            print(f"[Transfermarkt] {KULUPLER[kulup_kodu]['takimAd']} HATA: {msg}")
            hatalar[kulup_kodu] = msg
            tum_sonuc[kulup_kodu] = {
                "kulup": KULUPLER[kulup_kodu]["takimAd"],
                "oyuncuSayisi": 0,
                "oyuncular": [],
                "hata": msg,
                "guncellendi": simdi_iso(),
            }

    for kulup_kodu, veri in tum_sonuc.items():
        kaydet(f"eksikler_{kulup_kodu}.json", veri)

    kaydet("eksikler.json", {
        "guncellendi": simdi_iso(),
        "kullanlar": tum_sonuc,
        "hatalar": hatalar,
    })

    kaynak_durumu = {
        "transfermarkt": {
            "sonBasari": simdi_iso(),
            "hata": "; ".join(hatalar.values()) if hatalar else None,
            "kulupSayisi": len(KULUPLER),
        },
        "guncellendi": simdi_iso(),
    }
    kaydet("kaynak_durumu.json", kaynak_durumu)

    print("=" * 50)
    print("İşlem tamamlandı.")
    for kulup_kodu, veri in tum_sonuc.items():
        print(f"  {veri['kulup']}: {veri['oyuncuSayisi']} oyuncu")


if __name__ == "__main__":
    main()