/* ========================================
   WUUspor — Alt Sekme Menüsü (tabs.js)
   5 sekme: Ana Sayfa · Maçlar · Puan · Haberler · Transfer
   ======================================== */

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', (e) => {
      e.preventDefault();
      const targetScreen = tab.dataset.tab;

      // URL güncelle (geçmiş için)
      history.pushState(null, '', `#${targetScreen}`);

      WUUApp.showScreen(targetScreen);
    });
  });

  // İlk yüklemede hash varsa ona göre ekranı aç
  const initialHash = window.location.hash.replace('#', '');
  if (initialHash && ['home', 'matches', 'standings', 'news', 'transfer'].includes(initialHash)) {
    // Onboarding daha sonra kontrol edilecek
  }
});