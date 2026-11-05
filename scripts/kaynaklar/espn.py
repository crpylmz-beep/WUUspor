# scripts/kaynaklar/espn.py
# ESPN API'den gerçek maç, puan ve fikstür verilerini çeker.
# Sonuçları /data klasörüne JSON olarak kaydeder.
# Hiçbir sahte/static veri kullanılmayacak.

import json
import os
import time
import requests
from datetime import datetime, timezone

BASE = "https://site.api.espn.com/apis/site/v2/sports/soccer"
STANDINGS_BASE = "https://site.api.espn.com/apis/v2/sports/soccer"

LIGLER = {
    "tur1": {"kod": "tur.1", "ad": "Süper Lig"},
    "ucl":  {"kod": "uefa.champions", "ad": "Şampiyonlar Ligi"},
    "uel":  {"kod": "uefa.europa", "ad": "Avrupa Ligi"},
    "uclconf": {"kod": "uefa.europa.conf", "ad": "Konferans Ligi"},
}

HEADERS = {
    "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15",
    "Accept": "application/json",
}

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "data")


def ensuredir(path):
    os.makedirs(path, exist_ok=True)


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


def simdi_iso():
    return datetime.now(timezone.utc).isoformat()


def bugun_yyyymmdd():
    simdi = datetime.now()
    return simdi.strftime("%Y%m%d")


def kaydet(dosya_adi, veri):
    ensuredir(DATA_DIR)
    yol = os.path.join(DATA_DIR, dosya_adi)
    with open(yol, "w", encoding="utf-8") as f:
        json.dump(veri, f, ensure_ascii=False, indent=2)

def maclari_normalize_et(veri, lig_kodu, lig_ad):
    maclar = []
    if not veri or not veri.get("events"):
        return maclar

    for olay in veri["events"]:
        try:
            comp = (olay.get("competitions") or [None])[0]
            if not comp:
                continue

            takimlar = comp.get("competitors") or []
            ev = dep = None
            for t in takimlar:
                tb = t.get("team") or {}
                bilgi = {
                    "id": str(tb.get("id")),
                    "ad": tb.get("displayName") or "Bilinmiyor",
                    "kisaAd": tb.get("shortName") or "?",
                    "logo": tb.get("logo"),
                    "puan": int(t.get("score")) if t.get("score") is not None else None,
                    "homeAway": t.get("homeAway"),
                }
                if t.get("homeAway") == "home":
                    ev = bilgi
                elif t.get("homeAway") == "away":
                    dep = bilgi

            if not ev or not dep:
                continue

            durum = comp.get("status") or {}
            durum_tip = durum.get("type") or {}
            canli = durum_tip.get("state") == "in"

            mac = {
                "id": str(olay.get("id")),
                "tarih": olay.get("date"),
                "hafta": (olay.get("week") or {}).get("text"),
                "turuvaKodu": lig_kodu,
                "turuvaAd": lig_ad,
                "evSahibi": ev,
                "deplasman": dep,
                "skorEv": ev["puan"],
                "skorDep": dep["puan"],
                "dakika": durum.get("displayClock"),
                "canli": canli,
                "durumKisaDetay": durum_tip.get("shortDetail") or "",
                "guncellendi": simdi_iso(),
            }
            maclar.append(mac)
        except Exception:
            continue

    return maclar


def cevrik_sirala(maclar):
    buyuk_idler = {"432", "436", "1895", "997"}

    def buyuk_mu(mac):
        return mac["evSahibi"]["id"] in buyuk_idler or mac["deplasman"]["id"] in buyuk_idler

    return sorted(maclar, key=buyuk_mu, reverse=True)


def tum_maclari_cek():
    tum_maclar = []
    hatalar = []

    for anahtar, lig in LIGLER.items():
        url = f"{BASE}/{lig['kod']}/scoreboard?dates={bugun_yyyymmdd()}"
        try:
            veri = fetch_json(url)
            maclar = maclari_normalize_et(veri, anahtar, lig["ad"])
            tum_maclar.extend(maclar)
            print(f"[ESPN] {lig['ad']}: {len(maclar)} maç alındı.")
        except Exception as hata:
            msg = f"{lig['ad']}: {hata}"
            print(f"[ESPN] HATA: {msg}")
            hatalar.append(msg)

    return cevrik_sirala(tum_maclar), hatalar

def puan_durumu_cek(lig_kodu):
    lig = LIGLER.get(lig_kodu)
    if not lig:
        return None, f"Lig bulunamadı: {lig_kodu}"

    url = f"{STANDINGS_BASE}/{lig['kod']}/standings"
    try:
        veri = fetch_json(url)
        return veri, None
    except Exception as hata:
        return None, str(hata)


def puanlari_normalize_et(veri, lig_kodu):
    sonuc = {
        "lig": lig_kodu,
        "gruplar": [],
        "guncellendi": simdi_iso(),
    }
    if not veri:
        return sonuc

    try:
        children = veri.get("children") or []
        for child in children:
            standings = child.get("standings") or []
            for st in standings:
                grup = {
                    "ad": st.get("name") or "Genel",
                    "sira": (st.get("type") or {}).get("text"),
                    "takimlar": [],
                }
                entries = st.get("entries") or []
                for entry in entries:
                    takim = entry.get("team") or {}
                    stats = entry.get("stats") or []
                    stat_map = {}
                    for s in stats:
                        stat_map[s.get("name")] = s.get("value")

                    grup["takimlar"].append({
                        "id": str(takim.get("id")),
                        "ad": takim.get("displayName") or "Bilinmiyor",
                        "kisaAd": takim.get("shortName") or "?",
                        "logo": takim.get("logo"),
                        "sira": int(entry.get("position")) if entry.get("position") else None,
                        "oynanmis": int(stat_map.get("playedGames")) if stat_map.get("playedGames") else None,
                        "galibiyet": int(stat_map.get("wins")) if stat_map.get("wins") else None,
                        "beraberlik": int(stat_map.get("draws")) if stat_map.get("draws") else None,
                        "maglubiyet": int(stat_map.get("losses")) if stat_map.get("losses") else None,
                        "atilanGol": int(stat_map.get("pointsFor")) if stat_map.get("pointsFor") else None,
                        "yenenGol": int(stat_map.get("pointsAgainst")) if stat_map.get("pointsAgainst") else None,
                        "puan": int(stat_map.get("points")) if stat_map.get("points") else None,
                    })
                sonuc["gruplar"].append(grup)
    except Exception:
        pass

    return sonuc


def tum_puanlari_cek():
    tum_standings = {}
    hatalar = []

    for anahtar in LIGLER:
        veri, hata = puan_durumu_cek(anahtar)
        if hata:
            hatalar.append(f"{anahtar}: {hata}")
            tum_standings[anahtar] = {"gruplar": [], "hata": hata, "guncellendi": simdi_iso()}
        else:
            tum_standings[anahtar] = puanlari_normalize_et(veri, anahtar)
            print(f"[ESPN] {anahtar} puan durumu alındı.")

    return tum_standings, hatalar

def main():
    print("=" * 50)
    print("WUUspor — ESPN Veri Toplayıcı (Python)")
    print("=" * 50)

    maclar, mac_hatalari = tum_maclari_cek()
    kaydet("mac_verileri.json", {
        "toplam": len(maclar),
        "canli": sum(1 for m in maclar if m["canli"]),
        "guncellendi": simdi_iso(),
        "maclar": maclar,
    })
    print(f"[ESPN] Toplam {len(maclar)} maç kaydedildi.")

    standings, puan_hatalari = tum_puanlari_cek()
    kaydet("puan_durumu.json", {
        "guncellendi": simdi_iso(),
        "turler": standings,
    })
    print("[ESPN] Puan durumu kaydedildi.")

    kaynak_durumu = {
        "espn": {
            "sonBasari": simdi_iso(),
            "hata": "; ".join(mac_hatalari + puan_hatalari) if (mac_hatalari or puan_hatalari) else None,
            "macSayisi": len(maclar),
        },
        "guncellendi": simdi_iso(),
    }
    kaydet("kaynak_durumu.json", kaynak_durumu)
    print("[ESPN] Kaynak durumu kaydedildi.")
    print("=" * 50)
    print("İşlem tamamlandı.")


if __name__ == "__main__":
    main()