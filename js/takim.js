/* ========================================
   WUUspor — Takım Paneli Verisi (takim.js)
   data/eksikler_*.json dosyasından sakat/cezalı oyuncu
   bilgilerini yükler ve takım panelini doldurur.
   Hiçbir sahte/static veri kullanılmayacak.
   ======================================== */

const WUUTakim = (() => {

  const TAKIM_ADLARI = {
    gs: 'Galatasaray', fb: 'Fenerbahçe', bjk: 'Beşiktaş', ts: 'Trabzonspor'
  };

  const TAKIM_ID = {
    gs: '432', fb: '436', bjk: '1895', ts: '997'
  };

  /* --- JSON yükle --- */
  async function jsonYukle(dosya) {
    try {
      const cevap = await fetch(`./data/${dosya}`, { cache: 'no-store' });
      if (!cevap.ok) return null;
      return await cevap.json();
    } catch (hata) {
      console.error(`Takım JSON yüklenemedi: ${dosya}`, hata);
      return null;
    }
  }

  /* --- Takım logosunu bul (data/mac_verileri.json'dan) --- */
  async function takimLogosuBul(takimKodu) {
    const veri = await WUUESPN.jsonYukle('mac_verileri.json');
    if (!veri) return null;
    const maclar = WUUESPN.maclariAl(veri);
    for (const mac of maclar) {
      for (const t of [mac.evSahibi, mac.deplasman]) {
        if (t && t.id && String(TAKIM_ID[takimKodu]) === String(t.id) && t.logo) {
          return t.logo;
        }
      }
    }
    return null;
  }

  /* --- Sakat / cezalı oyuncuları filtrele --- */
  function oyunculariAyir(oyuncular) {
    const sakatlar = [];
    const cezali = [];
    for (const o of oyuncular) {
      const durum = (o.durum || '').toLowerCase();
      const sakatlik = (o.sakatlıkTuru || o.sakatlikTuru || '').toLowerCase();
      if (durum.includes('sakat') || durum.includes('yaralı') || sakatlik.includes('sakat')) {
        sakatlar.push(o);
      } else if (durum.includes('ceza') || durum.includes('kart') || durum.includes('suspend')) {
        cezali.push(o);
      } else {
        sakatlar.push(o);
      }
    }
    return { sakatlar, cezali };
  }

  /* --- Sakat / cezalı satır HTML'i --- */
  function oyuncuSatirHtml(o) {
    return `
      <div class="injury-row">
        <div class="injury-info">
          <div class="injury-name">${o.ad || 'Oyuncu'}</div>
          <div class="injury-detail">${o.mevki || ''} · ${o.dönüşTarihi || o.donusTarihi || ''} ${o.kaçırılanMaç || o.kaciranMac || ''}</div>
        </div>
        <div class="injury-date">${o.durum || ''}</div>
      </div>
    `;
  }

  /* --- Takım panelini aç ve doldur --- */
  async function takimPaneliniAc(takimKodu) {
    const takimAd = TAKIM_ADLARI[takimKodu] || takimKodu;

    const elLogo = document.getElementById('tp-logo');
    const elName = document.getElementById('tp-name');
    const elRank = document.getElementById('tp-rank');

    if (elLogo) {
      const logo = await takimLogosuBul(takimKodu);
      if (logo) {
        elLogo.innerHTML = `<img src="${logo}" alt="${takimAd}">`;
      } else {
        elLogo.innerHTML = `<span class="logo-fallback">${takimKodu.toUpperCase()}</span>`;
        elLogo.style.backgroundColor = getTeamBgColor(takimKodu);
        elLogo.style.color = getTeamTextColor(takimKodu);
      }
    }
    if (elName) elName.textContent = takimAd;
    if (elRank) elRank.textContent = 'Süper Lig';

    const veri = await jsonYukle(`eksikler_${takimKodu}.json`);
    const tumOyuncular = (veri && veri.oyuncular) || [];
    const { sakatlar, cezali } = oyunculariAyir(tumOyuncular);

    const elSakat = document.getElementById('tp-injuries');
    const elCezali = document.getElementById('tp-suspensions');

    if (elSakat) {
      elSakat.innerHTML = sakatlar.length > 0
        ? sakatlar.map(oyuncuSatirHtml).join('')
        : '<p style="color:var(--color-text-secondary);font-size:12px;">Sakat oyuncu yok.</p>';
    }
    if (elCezali) {
      elCezali.innerHTML = cezali.length > 0
        ? cezali.map(oyuncuSatirHtml).join('')
        : '<p style="color:var(--color-text-secondary);font-size:12px;">Cezalı oyuncu yok.</p>';
    }

    if (typeof WUUHaberler !== 'undefined' && WUUHaberler.takimHaberleriniYukle) {
      await WUUHaberler.takimHaberleriniYukle(takimKodu, 3);
    }

    await takimFixturleriniYukle(takimKodu);

    WUUApp.openTeamPanel();
  }

  /* --- Takım fixtures (sıradaki maçlar) --- */
  async function takimFixturleriniYukle(takimKodu) {
    const container = document.getElementById('tp-fixtures');
    if (!container) return;

    const ligKodu = 'tur1';
    const takimId = TAKIM_ID[takimKodu];
    try {
      let veri = await WUUESPN.jsonYukle('mac_verileri.json');
      if (!veri) {
        veri = await WUUESPN.jsonYukle('mac_yedek.json');
      }
      const takvim = WUUESPN.maclariAl(veri).filter(m =>
        (m.evSahibi && String(m.evSahibi.id) === String(takimId)) ||
        (m.deplasman && String(m.deplasman.id) === String(takimId))
      );
      const gelcek = takvim.slice(0, 3);
      if (gelcek.length === 0) {
        container.innerHTML = '<p style="color:var(--color-text-secondary);font-size:12px;">Fikstür yok.</p>';
        return;
      }
      container.innerHTML = gelcek.map(m => {
        const tarih = m.tarih ? WUUApp.formatTimeTR(m.tarih) : '';
        return `
          <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--color-border);font-size:12px;">
            <span style="color:var(--color-text-secondary);">${tarih}</span>
            <span style="color:var(--color-text);font-weight:600;">${m.rakip || 'Rakip'}</span>
          </div>
        `;
      }).join('');
    } catch (hata) {
      container.innerHTML = '<p style="color:var(--color-text-secondary);font-size:12px;">Fikstür yüklenemedi.</p>';
    }
  }

  function getTeamBgColor(kod) {
    const c = { gs: '#A90432', fb: '#00205B', bjk: '#000000', ts: '#7A1E3A' };
    return c[kod] || '#222833';
  }

  function getTeamTextColor(kod) {
    const c = { gs: '#FDB912', fb: '#FFED00', bjk: '#FFFFFF', ts: '#5DB7E8' };
    return c[kod] || '#F2F4F7';
  }

  return {
    takimPaneliniAc
  };

})();

window.WUUTakim = WUUTakim;