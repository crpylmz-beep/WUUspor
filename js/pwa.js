/* ========================================
   WUUspor — PWA / Service Worker (pwa.js)
   Uygulama kabuğu önbelleği ve güncelleme yönetimi.
   ======================================== */

const WUUPWA = (() => {
  let registration = null;

  async function register() {
    if ('serviceWorker' in navigator) {
      try {
        registration = await navigator.serviceWorker.register('sw.js', {
          scope: './'
        });
        console.log('Service Worker kaydedildi:', registration.scope);

        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('Yeni sürüm mevcut, sayfa yenileniyor...');
              window.location.reload();
            }
          });
        });
      } catch (err) {
        console.error('Service Worker kayıt hatası:', err);
      }
    } else {
      console.log('Bu tarayıcı Service Worker desteklemiyor.');
    }
  }

  function isStandalone() {
    return window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true;
  }

  return {
    register,
    isStandalone
  };
})();

window.WUUPWA = WUUPWA;