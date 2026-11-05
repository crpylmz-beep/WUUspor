/* ========================================
   WUUspor — Uygulama Kontrolcüsü (app.js)
   Navigasyon, ekran geçişleri, tema ve durum yönetimi.
   ======================================== */

const WUUApp = (() => {
  const screens = {
    home: document.getElementById('screen-home'),
    matches: document.getElementById('screen-matches'),
    standings: document.getElementById('screen-standings'),
    news: document.getElementById('screen-news'),
    transfer: document.getElementById('screen-transfer'),
    settings: document.getElementById('screen-settings'),
    matchDetail: document.getElementById('screen-match-detail'),
    teamPanel: document.getElementById('screen-team-panel'),
    onboarding: document.getElementById('screen-onboarding')
  };

  const overlays = {
    matchDetailBackdrop: document.getElementById('overlay-match-detail'),
    teamPanelBackdrop: document.getElementById('overlay-team-panel')
  };

  let currentScreen = 'home';

  /* --- Ekran değiştir --- */
  function showScreen(screenId) {
    // Tüm screen'leri gizle
    Object.values(screens).forEach(screen => {
      if (screen) screen.classList.remove('active');
    });

    // Hedef screen'ı göster
    const target = screens[screenId];
    if (target) {
      target.classList.add('active');
      currentScreen = screenId;
    }

    // Alt sekme menüsünü güncelle
    updateBottomTabs(screenId);
  }

  /* --- Alt sekme menüsü seçimini güncelle --- */
  function updateBottomTabs(activeScreen) {
    document.querySelectorAll('.tab').forEach(tab => {
      tab.classList.remove('active');
      const tabId = tab.dataset.tab;
      if (tabId === activeScreen) {
        tab.classList.add('active');
      }
    });
  }

  /* --- Takım rengini uygula (CSS değişkeni olarak) --- */
  function applyTeamColor(teamKey) {
    const root = document.documentElement;
    const colors = {
      gs: { primary: '#FDB912', secondary: '#A90432' },
      fb: { primary: '#FFED00', secondary: '#00205B' },
      bjk: { primary: '#FFFFFF', secondary: '#000000' },
      ts: { primary: '#7A1E3A', secondary: '#5DB7E8' }
    };

    if (colors[teamKey]) {
      root.style.setProperty('--team-accent', colors[teamKey].primary);
      root.style.setProperty('--team-accent-dark', colors[teamKey].secondary);
    } else {
      root.style.removeProperty('--team-accent');
      root.style.removeProperty('--team-accent-dark');
    }
  }

  /* --- İlk açılış (onboarding) kontrolü --- */
  function checkOnboarding() {
    const seen = localStorage.getItem('wuuspor_onboarding_seen');
    if (!seen) {
      showScreen('onboarding');
    } else {
      const fav = localStorage.getItem('wuuspor_favori');
      if (fav) {
        applyTeamColor(fav);
        showScreen('home');
      } else {
        showScreen('onboarding'); // Takım seçilmemişse onboarding'e yönlendir
      }
    }
  }

  /* --- Geri tuşu (Android) ve tarayıcı geri --- */
  function handleBack() {
    if (currentScreen === 'match-detail') {
      closeMatchDetail();
      return true;
    }
    if (currentScreen === 'team-panel') {
      closeTeamPanel();
      return true;
    }
    if (currentScreen !== 'home') {
      showScreen('home');
      return true;
    }
    return false;
  }

  /* --- Maç detayı aç / kapat --- */
  function openMatchDetail() {
    overlays.matchDetailBackdrop.classList.add('visible');
    screens.matchDetail.classList.add('visible');
    showScreen('match-detail');
  }

  function closeMatchDetail() {
    overlays.matchDetailBackdrop.classList.remove('visible');
    screens.matchDetail.classList.remove('visible');
    showScreen('home');
  }

  /* --- Takım paneli aç / kapat --- */
  function openTeamPanel() {
    overlays.teamPanelBackdrop.classList.add('visible');
    screens.teamPanel.classList.add('visible');
  }

  function closeTeamPanel() {
    overlays.teamPanelBackdrop.classList.remove('visible');
    screens.teamPanel.classList.remove('visible');
  }

  /* --- Tarih formatlama (Türkçe) --- */
  function formatDateTR(date) {
    const days = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
    const months = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
      'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
    const d = new Date(date);
    return `${d.getDate()} ${months[d.getMonth()]} ${days[d.getDay()]}`;
  }

  /* --- Saat formatlama (Europe/Istanbul) --- */
  function formatTimeTR(date) {
    return new Date(date).toLocaleTimeString('tr-TR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'Europe/Istanbul'
    });
  }

  /* --- Public API --- */
  return {
    init: () => {
      checkOnboarding();
      window.addEventListener('popstate', () => {
        if (!handleBack()) {
          // Tarayıcı geri tuşu ana sayfada ise kapatma
        }
      });
    },
    showScreen,
    applyTeamColor,
    openMatchDetail,
    closeMatchDetail,
    openTeamPanel,
    closeTeamPanel,
    formatDateTR,
    formatTimeTR,
    getCurrentScreen: () => currentScreen
  };
})();

window.WUUApp = WUUApp;