# scripts/kaynaklar/mackolik.py
# Maçkolik canlı skor JSON'unu çeker ve /data/mac_yedek.json olarak kaydeder.
# Süper Lig turnuva kimliği: 482ofyysbdbeoxauk19yg7tdt
# Hiçbir sahte/static veri kullanılmayacak.

import json
import os
import time
import requests
from datetime import datetime, timezone

URL = "https://www.mackolik.com/perform/p0/ajax/components/competition/livescores/json"
TURNUVA_ID = "482ofyysbdbeoxauk19yg7tdt"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15",
    "Accept": "application/json",
    "Content-Type": "application/json",
    "Origin": "https://www.mackolik.com",
    "Referer": "https://www.mackolik.com/",
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


def fetch_json_post(url, payload, deneme=0):
    try:
        cevap = requests.post(url, json=payload, headers=HEADERS, timeout=15)
        if cevap.status_code != 200:
            raise Exception(f"HTTP {cevap.status_code}")
        return cevap.json()
    except Exception as hata:
        if deneme < 1:
            time.sleep(3)
            return fetch_json_post(url, payload, deneme + 1)
        raise hata


def maclari_normalize_et(veri):
    maclar = []
    if not veri:
        return maclar

    try:
        content = veri.get("content") or veri
        matches = content.get("matches") or content.get("fixtures") or []
        if isinstance(matches, dict):
            matches = matches.get("list") or []

        for mac in matches:
            try:
                ev = mac.get("homeTeam") or mac.get("evSahibi") or {}
                dep = mac.get("awayTeam") or mac.get("deplasman") or {}

                mac_verisi = {
                    "id": str(mac.get("id") or mac.get("matchId")),
                    "tarih": mac.get("startDate") or mac.get("matchDateTime"),
                    "turuvaKodu": "tur1",
                    "turuvaAd": "Süper Lig",
                    "evSahibi": {
                        "id": str(ev.get("id")),
                        "ad": ev.get("name") or "Bilinmiyor",
                        "kisaAd": ev.get("shortName") or "?",
                        "logo": ev.get("logo"),
                        "puan": int(ev.get("score")) if ev.get("score") is not None else None,
                        "homeAway": "home",
                    },
                    "deplasman": {
                        "id": str(dep.get("id")),
                        "ad": dep.get("name") or "Bilinmiyor",
                        "kisaAd": dep.get("shortName") or "?",
                        "logo": dep.get("logo"),
                        "puan": int(dep.get("score")) if dep.get("score") is not None else None,
                        "homeAway": "away",
                    },
                    "skorEv": int(ev.get("score")) if ev.get("score") is not None else None,
                    "skorDep": int(dep.get("score")) if dep.get("score") is not None else None,
                    "dakika": mac.get("minute") or mac.get("statusTime"),
                    "canli": mac.get("isLive") or mac.get("status") == "live",
                    "durumKisaDetay": mac.get("statusText") or "",
                    "guncellendi": simdi_iso(),
                    "kaynak": "Maçkolik",
                }
                maclar.append(mac_verisi)
            except Exception:
                continue
    except Exception:
        pass

    return maclar


def tum_maclari_cek():
    try:
        veri = fetch_json_post(URL, {"competitionId": TURNUVA_ID})
        maclar = maclari_normalize_et(veri)
        print(f"[Maçkolik] {len(maclar)} maç alındı.")
        return maclar, None
    except Exception as hata:
        msg = str(hata)
        print(f"[Maçkolik] HATA: {msg}")
        return [], msg


def main():
    print("=" * 50)
    print("WUUspor — Maçkolik Veri Toplayıcı (Python)")
    print("=" * 50)

    maclar, hata = tum_maclari_cek()
    kaydet("mac_yedek.json", {
        "toplam": len(maclar),
        "canli": sum(1 for m in maclar if m["canli"]),
        "guncellendi": simdi_iso(),
        "kaynak": "Maçkolik",
        "maclar": maclar,
    })

    if hata:
        print(f"[Maçkolik] Hata oluştu: {hata}")

    kaynak_durumu = {
        "mackolik": {
            "sonBasari": simdi_iso(),
            "hata": hata,
            "macSayisi": len(maclar),
        },
        "guncellendi": simdi_iso(),
    }
    kaydet("kaynak_durumu.json", kaynak_durumu)

    print("[Maçkolik] Kaynak durumu kaydedildi.")
    print("=" * 50)
    print("İşlem tamamlandı.")


if __name__ == "__main__":
    main()