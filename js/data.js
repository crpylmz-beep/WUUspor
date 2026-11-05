/* ========================================
   WUUspor — Veri Katmanı (Skeleton / Aşama 1)
   Gerçek veriler Aşama 2'de ESPN'den ve Actions'tan gelecek.
   Şimdilik boş yapılar tanımlanıyor.
   ======================================== */

const WUUData = {
  // Maç verileri (ESPN + yedek kaynaklar)
  matches: [],
  liveMatches: [],

  // Puan durumu (4 turnuva)
  standings: {},

  // Takım bilgileri
  teams: {},

  // Haberler
  news: [],

  // Transferler
  transfers: [],

  // Sakat / cezalı oyuncular
  injuries: {},

  // Kaynak durumu
  sourceStatus: {},

  // Son güncelleme
  lastUpdated: null,

  // Favori takım (localStorage'dan okunur)
  get favoriteTeam() {
    return localStorage.getItem('wuuspor_favori') || null;
  },

  set favoriteTeam(value) {
    localStorage.setItem('wuuspor_favori', value);
  }
};

window.WUUData = WUUData;