/* ========================================
   WUUspor — ESPN Veri Kaynağı (Aşama 2)
   Veri data/ klasöründeki JSON dosyalarından okunur (CORS'den kaçınmak için).
   Hiçbir sahte/static veri kullanılmayacak.
   ======================================== */

const WUUESPN = (() => {

  const LIGLER = {
    tur1: { kod: "tur.1", ad: "Süper Lig", bayrak: "TR" },
    ucl:  { kod: "uefa.champions", ad: "Şampiyonlar Ligi", bayrak: "UCL" },
    uel:  { kod: "uefa.europa", ad: "Avrupa Ligi", bayrak: "UEL" },
    uclconf: { kod: "uefa.europa.conf", ad: "Konferans Ligi", bayrak: "UECL" }
  };

  const TAKIM_ID = {
    gs: 432,
    fb: 436,
    bjk: 1895,
    ts: 997
  };

  /* --- JSON yükle (data/ klasöründen, relative path) --- */
  async function jsonYukle(dosya) {
    try {
      const cevap = await fetch(`data/${dosya}`, { cache: 'no-store' });
      if (!cevap.ok) return null;
      return await cevap.json();
    } catch (hata) {
      console.error(`JSON yüklenemedi: ${dosya}`, hata);
      return null;
    }
  }

  /* --- Maç listesini döndür (zaten espn.py tarafından normalize edilmiş) --- */
  function maclariAl(veri) {
    if (!veri || !veri.maclar) return [];
    return veri.maclar;
  }

  /* --- Puan durumunu döndür (lig kodu bazında) --- */
  function puaniAl(veri, ligKodu) {
    if (!veri || !veri.turler) return { lig: ligKodu, tur: null, gruplar: [], guncellendi: null };
    return veri.turler[ligKodu] || { lig: ligKodu, tur: null, gruplar: [], guncellendi: null };
  }

  /* --- Günün maçları (data/mac_verileri.json, yoksa data/mac_yedek.json) --- */
  async function getGununMaclari(ligKodu, tarih = null) {
    let veri = await jsonYukle('mac_verileri.json');
    if (!veri) {
      veri = await jsonYukle('mac_yedek.json');
    }
    const maclar = maclariAl(veri);
    if (ligKodu) {
      return maclar.filter(m => m.turuvaKodu === ligKodu);
    }
    return maclar;
  }

  /* --- Maç detayı (eventId'ye göre) --- */
  async function getMacDetayi(ligKodu, eventId) {
    let veri = await jsonYukle('mac_verileri.json');
    if (!veri) {
      veri = await jsonYukle('mac_yedek.json');
    }
    const maclar = maclariAl(veri);
    return maclar.find(m => String(m.id) === String(eventId)) || null;
  }

  /* --- Puan durumu (data/puan_durumu.json) --- */
  async function getPuanDurumu(ligKodu) {
    const veri = await jsonYukle('puan_durumu.json');
    return puaniAl(veri, ligKodu);
  }

  /* --- Takım takvimi (sıradaki maçlar, data/mac_verileri.json'dan) --- */
  async function getTakimTakvimi(ligKodu, takimId) {
    let veri = await jsonYukle('mac_verileri.json');
    if (!veri) {
      veri = await jsonYukle('mac_yedek.json');
    }
    const maclar = maclariAl(veri);
    const takimIdStr = String(takimId);
    return maclar.filter(m =>
      (m.evSahibi && String(m.evSahibi.id) === takimIdStr) ||
      (m.deplasman && String(m.deplasman.id) === takimIdStr)
    );
  }

  return {
    LIGLER,
    TAKIM_ID,
    jsonYukle,
    maclariAl,
    puaniAl,
    getGununMaclari,
    getMacDetayi,
    getPuanDurumu,
    getTakimTakvimi
  };

})();

window.WUUESPN = WUUESPN;