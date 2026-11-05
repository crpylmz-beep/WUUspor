/* ========================================
   WUUspor — Bildirim / Web Push (push.js)
   Telefon tarafında: bildirim izni, push subscription oluşturma.
   Hiçbir yapay zeka servisi kullanılmayacak.
   ======================================== */

const WUUPush = (() => {

  // VAPID Public Key (vapid_olustur.py ile üretilen public key buraya yapıştırılacak)
  const VAPID_PUBLIC_KEY = "BU_YERI_VAPID_PUBLIC_KEYILE_DEGISTIRIN";

  let swRegistration = null;

  async function init() {
    if (!("serviceWorker" in navigator)) {
      console.log("Service Worker desteklenmiyor.");
      return;
    }

    if (!("PushManager" in window)) {
      console.log("Push API desteklenmiyor.");
      return;
    }

    try {
      swRegistration = await navigator.serviceWorker.register("/sw.js");
      console.log("Service Worker kayıt edildi:", swRegistration.scope);
    } catch (hata) {
      console.error("Service Worker kayıt hatası:", hata);
    }
  }

  function urlBase64ToUint8Array(base64String) {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  async function bildirimIzniAl() {
    if (!swRegistration) return null;

    try {
      const izin = await Notification.requestPermission();
      if (izin !== "granted") {
        console.log("Bildirim izni reddedildi.");
        return null;
      }

      const subscribeOptions = {
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      };

      const abonelik = await swRegistration.pushManager.subscribe(subscribeOptions);
      console.log("Push aboneliği oluşturuldu.");

      // Abonelik bilgisini konsola yazdır (kullanıcı kopyalayıp GitHub Secret'a ekleyecek)
      const abonelikJSON = JSON.stringify(abonelik);
      console.log("PUSH_SUBSCRIPTION (kopyalayın, GitHub Secrets'a ekleyin):");
      console.log(abonelikJSON);

      return abonelik;
    } catch (hata) {
      console.error("Bildirim aboneliği hatası:", hata);
      return null;
    }
  }

  async function bildirimDurumu() {
    if (!swRegistration) return "hazir_degil";

    try {
      const abonelik = await swRegistration.pushManager.getSubscription();
      return abonelik ? "aktif" : "pasif";
    } catch (hata) {
      return "hata";
    }
  }

  return {
    init,
    bildirimIzniAl,
    bildirimDurumu,
  };

})();

window.WUUPush = WUUPush;