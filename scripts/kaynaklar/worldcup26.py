# scripts/kaynaklar/worldcup26.py
# WorldCup26'dan Süper Lig puan durumunu çeker ve /data klasörüne JSON olarak kaydeder.
# Adres: https://worldcup26.ir/get/soccer/tur.1/standings
# Hiçbir sahte/static veri kullanılmayacak.

import json
import os
import time
import requests
from datetime import datetime, timezone

URL = "https://worldcup26.ir/get/soccer/tur.1/standings"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15",
    "Accept": "application/json",
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


def fetch_json(url, deneme=0):
    try:
        cevap = requests.get(url, headers=HEADERS, timeout=15)
        if cevap.status_code != 200:
            raise Exception(f"HTTP {cevap.status_code}")
        return cevap.json()
    except Exception as hata:
        if deneme < 1:
            time.sleep(3)
            return fetch_json(url, deneme + 1)
        raise hata


def puanlari_normalize_et(veri):
    sonuc = {
        "lig": "tur1",
        "ad": "Süper Lig",
        "kaynak": "WorldCup26",
        "gruplar": [],
        "guncellendi": simdi_iso(),
    }
    if not veri:
        return sonuc

    try:
        rows = veri.get("standings") or veri.get("table") or veri.get("data") or []
        if isinstance(rows, dict):
            rows = rows.get("rows") or []

        for satir in rows:
            try:
                takim = satir.get("team") or satir.get("takim") or {}
                grup = {
                    "ad": "Süper Lig",
                    "sira": "Genel",
                    "takimlar": [],
                }

                grup["takimlar"].append({
                    "id": str(takim.get("id") or satir.get("teamId")),
                    "ad": takim.get("name") or satir.get("teamName") or "Bilinmiyor",
                    "kisaAd": takim.get("shortName") or satir.get("teamShortName") or "?",
                    "logo": takim.get("logo"),
                    "sira": int(satir.get("position") or satir.get("rank") or 0) or None,
                    "oynanmis": int(satir.get("played") or satir.get("oynanmis") or 0) or None,
                    "galibiyet": int(satir.get("won") or satir.get("galibiyet") or 0) or None,
                    "beraberlik": int(satir.get("drawn") or satir.get("beraberlik") or 0) or None,
                    "maglubiyet": int(satir.get("lost") or satir.get("maglubiyet") or 0) or None,
                    "atilanGol": int(satir.get("goalsFor") or satir.get("atilanGol") or 0) or None,
                    "yenenGol": int(satir.get("goalsAgainst") or satir.get("yenenGol") or 0) or None,
                    "puan": int(satir.get("points") or satir.get("puan") or 0) or None,
                })
                sonuc["gruplar"].append(grup)
            except Exception:
                continue
    except Exception:
        pass

    return sonuc


def main():
    print("=" * 50)
    print("WUUspor — WorldCup26 Veri Toplayıcı (Python)")
    print("=" * 50)

    try:
        veri = fetch_json(URL)
        sonuc = puanlari_normalize_et(veri)
        kaydet("puan_worldcup26.json", sonuc)
        print(f"[WorldCup26] {len(sonuc['gruplar'])} grup kaydedildi.")
    except Exception as hata:
        msg = str(hata)
        print(f"[WorldCup26] HATA: {msg}")
        kaydet("puan_worldcup26.json", {
            "lig": "tur1",
            "ad": "Süper Lig",
            "kaynak": "WorldCup26",
            "gruplar": [],
            "hata": msg,
            "guncellendi": simdi_iso(),
        })

    print("[WorldCup26] Puan durumu kaydedildi.")
    print("=" * 50)
    print("İşlem tamamlandı.")


if __name__ == "__main__":
    main()