# scripts/push_gonder.py
# GitHub Actions'da çalışır. Favori takımın maçına ve golüne bildirim gönderir.
# Zaten gönderilen bildirimleri /data/gonderilen_bildirimler.json ile takip eder.
# Hiçbir sahte/static veri kullanılmayacak.

import json
import os
from datetime import datetime, timezone

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "data")

VAPID_PRIVATE_KEY = os.environ.get("VAPID_PRIVATE_KEY")
PUSH_SUBSCRIPTION_ENV = os.environ.get("PUSH_SUBSCRIPTION")
FAVORITE_TEAM = os.environ.get("FAVORITE_TEAM", "").lower()

TAKIM_ADLARI = {
    "gs": "Galatasaray",
    "fb": "Fenerbahçe",
    "bjk": "Beşiktaş",
    "ts": "Trabzonspor",
}

TAKIM_ID_MAP = {"gs": "432", "fb": "436", "bjk": "1895", "ts": "997"}


def ensuredir(path):
    os.makedirs(path, exist_ok=True)


def simdi_iso():
    return datetime.now(timezone.utc).isoformat()


def oku_json(dosya_adi):
    yol = os.path.join(DATA_DIR, dosya_adi)
    if not os.path.exists(yol):
        return None
    with open(yol, "r", encoding="utf-8") as f:
        return json.load(f)


def kaydet_json(dosya_adi, veri):
    ensuredir(DATA_DIR)
    yol = os.path.join(DATA_DIR, dosya_adi)
    with open(yol, "w", encoding="utf-8") as f:
        json.dump(veri, f, ensure_ascii=False, indent=2)


def bildirim_zaten_gonderildi(olay_anahtari):
    gonderilen = oku_json("gonderilen_bildirimler.json") or {"gonderilen": []}
    return olay_anahtari in gonderilen["gonderilen"]


def bildirim_gonderildi_isaretle(olay_anahtari):
    gonderilen = oku_json("gonderilen_bildirimler.json") or {"gonderilen": []}
    if olay_anahtari not in gonderilen["gonderilen"]:
        gonderilen["gonderilen"].append(olay_anahtari)
        gonderilen["gonderilen"] = gonderilen["gonderilen"][-100:]
        kaydet_json("gonderilen_bildirimler.json", gonderilen)


def webpush_gonder(baslik, icerik):
    if not VAPID_PRIVATE_KEY or not PUSH_SUBSCRIPTION_ENV:
        print("[Push] VAPID_PRIVATE_KEY veya PUSH_SUBSCRIPTION eksik, bildirim atlanıyor.")
        return False

    try:
        from pywebpush import WebPUSH, WebPushException

        abonelik = json.loads(PUSH_SUBSCRIPTION_ENV)

        webpush = WebPUSH(
            vapid_private_key=VAPID_PRIVATE_KEY,
            vapid_public_key="",
            vapid_claims={"sub": "mailto:wuuspor@example.com"},
        )

        payload = json.dumps({
            "title": baslik,
            "body": icerik,
            "icon": "/icons/icon-192.png",
            "badge": "/icons/icon-72.png",
            "data": {"url": "/"},
        })

        webpush.send_notification(
            subscription_info=abonelik,
            data=payload,
            ttl=1000,
        )
        print(f"[Push] Bildirim gönderildi: {baslik} - {icerik}")
        return True
    except Exception as hata:
        print(f"[Push] Hata: {hata}")
        return False


def favori_takim_macini_bul(maclar):
    if not FAVORITE_TEAM or not maclar:
        return None
    favori_id = TAKIM_ID_MAP.get(FAVORITE_TEAM)
    for mac in maclar:
        ev = mac.get("evSahibi", {})
        dep = mac.get("deplasman", {})
        if ev.get("id") == favori_id or dep.get("id") == favori_id:
            return mac
    return None


def main():
    print("=" * 50)
    print("WUUspor — Bildirim Gönderici (Python)")
    print("=" * 50)

    if not FAVORITE_TEAM:
        print("[Push] FAVORITE_TEAM belirtilmedi, işlem atlanıyor.")
        return

    print(f"[Push] Favori takım: {TAKIM_ADLARI.get(FAVORITE_TEAM, FAVORITE_TEAM)}")

    mac_verisi = oku_json("mac_verileri.json")
    if not mac_verisi:
        print("[Push] mac_verileri.json bulunamadı, maç verisi yok.")
        return

    maclar = mac_verisi.get("maclar", [])
    mac = favori_takim_macini_bul(maclar)

    if not mac:
        print(f"[Push] {TAKIM_ADLARI.get(FAVORITE_TEAM)} için maç bulunamadı.")
        return

    ev = mac.get("evSahibi", {})
    dep = mac.get("deplasman", {})
    durum = mac.get("durumKisaDetay", "")
    dakika = mac.get("dakika", "")
    canli = mac.get("canli", False)

    if canli and dakika and dakika.isdigit() and int(dakika) <= 5:
        olay_anahtari = f"mac_basladi_{mac['id']}"
        if not bildirim_zaten_gonderildi(olay_anahtari):
            baslik = "Maç Başladı!"
            icerik = f"{TAKIM_ADLARI.get(FAVORITE_TEAM)} maçı başladı: {ev.get('ad')} {ev.get('skorEv')} - {dep.get('skorDep')} {dep.get('ad')}"
            if webpush_gonder(baslik, icerik):
                bildirim_gonderildi_isaretle(olay_anahtari)

    onceki_skor = oku_json("son_skor.json") or {}
    favori_key = f"skor_{FAVORITE_TEAM}_{mac['id']}"
    mevcut_skor = f"{ev.get('skorEv')}-{dep.get('skorDep')}"

    if onceki_skor.get(favori_key) and onceki_skor[favori_key] != mevcut_skor:
        olay_anahtari = f"gol_{mac['id']}_{mevcut_skor}"
        if not bildirim_zaten_gonderildi(olay_anahtari):
            baslik = "Gol!"
            onceki = onceki_skor[favori_key].split("-")
            onceki_ev = int(onceki[0]) if onceki[0].isdigit() else 0
            onceki_dep = int(onceki[1]) if len(onceki) > 1 and onceki[1].isdigit() else 0
            mevcut_ev = int(ev.get("skorEv") or 0)
            mevcut_dep = int(dep.get("skorDep") or 0)

            if mevcut_ev > onceki_ev and ev.get("id") == favori_id:
                golcu_takim = ev.get("ad")
            elif mevcut_dep > onceki_dep and dep.get("id") == favori_id:
                golcu_takim = dep.get("ad")
            else:
                golcu_takim = "Takım"

            icerik = f"{golcu_takim} gol attı! Skor: {mevcut_ev} - {mevcut_dep}"
            if webpush_gonder(baslik, icerik):
                bildirim_gonderildi_isaretle(olay_anahtari)

    onceki_skor[favori_key] = mevcut_skor
    kaydet_json("son_skor.json", onceki_skor)

    print("[Push] Kontrol tamamlandı.")
    print("=" * 50)


if __name__ == "__main__":
    main()