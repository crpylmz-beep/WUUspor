/* ========================================
   WUUspor — Maç Yöneticisi (maclar.js)
   Veri data/ klasöründeki JSON dosyalarından okunur.
   Hiçbir sahte/static veri kullanılmayacak.
   ======================================== */

const WUUMaclar = (() => {

  let otomatikYenilemeId = null;
  let canliMacVar = false;

  /* --- Tüm maçları data/ klasöründen yükle --- */
  async function tumTurnuvalarinMaclariniYukle() {
    const sonuclariGoster = document.getElementById("home-today-matches");
    const canliTicker = document.getElementById("home-live-ticker");

    if (!sonuclariGoster) return;

    let veri = await WUUESPN.jsonYukle('mac_verileri.json');
    if (!veri) {
      veri = await WUUESPN.jsonYukle('mac_yedek.json');
    }

    const tumMaclar = WUUESPN.maclariAl(veri);
    let hataVar = false;

    for (const mac of tumMaclar) {
      mac.turuvaAd = WUUESPN.LIGLER[mac.turuvaKodu] ? WUUESPN.LIGLER[mac.turuvaKodu].ad : mac.turuvaKodu;
      if (mac.canli) canliMacVar = true;
    }

    canliTickeriGuncelle(tumMaclar);
    gununMaclariniGuncelle(tumMaclar);

    return { toplam: tumMaclar.length, canli: canliMacVar ? tumMaclar.filter(m => m.canli).length : 0, hata: hataVar };
  }

  /* --- Canlı şeridi (yatay kaydırma) --- */
  function canliTickeriGuncelle(maclar) {
    const ticker = document.getElementById("home-live-ticker");
    if (!ticker) return;

    const canliMaclar = maclar.filter((m) => m.canli);

    if (canliMaclar.length === 0) {
      ticker.innerHTML = `
        <div style="text-align:center;color:var(--color-text-secondary);padding:20px;">
          Canlı maç yok
        </div>`;
      return;
    }

    ticker.innerHTML = "";
    for (const mac of canliMaclar) {
      const kart = document.createElement("div");
      kart.className = "ticker-card";
      kart.innerHTML = `
        <div class="team-cell" style="gap:8px;">
          <div class="team-logo" style="width:24px;height:24px;font-size:12px;">
            <span class="logo-fallback">${mac.evSahibi.kisaAd}</span>
          </div>
          <span class="team-name-small">${mac.evSahibi.ad}</span>
        </div>
        <div class="match-score">${mac.evSahibi.puan ?? "-"} - ${mac.deplasman.puan ?? "-"}</div>
        <div class="team-cell" style="gap:8px;flex-direction:row-reverse;justify-content:flex-end;">
          <span class="team-name-small">${mac.deplasman.ad}</span>
          <div class="team-logo" style="width:24px;height:24px;font-size:12px;">
            <span class="logo-fallback">${mac.deplasman.kisaAd}</span>
          </div>
        </div>
        <div class="match-minute">
          <span class="live-dot"></span>
          ${mac.dakika ?? "'"}
        </div>
      `;
      ticker.appendChild(kart);
    }
  }

  /* --- Günün maçları listesi (Ana Sayfa) --- */
  function gununMaclariniGuncelle(maclar) {
    const liste = document.getElementById("home-today-matches");
    if (!liste) return;

    const buyukIdler = [432, 436, 1895, 997];
    const sirali = [...maclar].sort((a, b) => {
      const aBuyuk = buyukIdler.includes(a.evSahibi?.id) || buyukIdler.includes(a.deplasman?.id) ? 1 : 0;
      const bBuyuk = buyukIdler.includes(b.evSahibi?.id) || buyukIdler.includes(b.deplasman?.id) ? 1 : 0;
      return bBuyuk - aBuyuk;
    });

    const gosterilecek = sirali.slice(0, 3);

    if (gosterilecek.length === 0) {
      liste.innerHTML = `
        <div class="empty-state" style="height:auto;padding:20px;">
          <p style="color:var(--color-text-secondary);">Şu an maç yok</p>
        </div>`;
      return;
    }

    liste.innerHTML = "";
    for (const mac of gosterilecek) {
      const satir = document.createElement("div");
      satir.className = "match-row" + (buyukIdler.includes(mac.evSahibi?.id) || buyukIdler.includes(mac.deplasman?.id) ? " big-four" : "");
      satir.innerHTML = `
        <div class="team-cell team-cell-big">
          <div class="team-logo" style="width:40px;height:40px;font-size:16px;">
            <span class="logo-fallback">${mac.evSahibi.kisaAd}</span>
          </div>
          <span class="team-name-big">${mac.evSahibi.ad}</span>
        </div>
        <div class="match-score">${mac.evSahibi.puan ?? "-"} - ${mac.deplasman.puan ?? "-"}</div>
        <div class="team-cell team-cell-big" style="flex-direction:row-reverse;justify-content:flex-end;">
          <span class="team-name-big">${mac.deplasman.ad}</span>
          <div class="team-logo" style="width:40px;height:40px;font-size:16px;">
            <span class="logo-fallback">${mac.deplasman.kisaAd}</span>
          </div>
        </div>
        <div class="match-status ${mac.canli ? "live" : "done"}">
          ${mac.canli ? ("CANLI " + (mac.dakika ?? "")) : (mac.durum?.shortDetail || "Maç")}
        </div>
      `;
      satir.onclick = () => macDetayiAc(mac.id, mac.turuvaKodu);
      liste.appendChild(satir);
    }
  }


  /* --- Maç detayı aç --- */
  async function macDetayiAc(eventId, ligKodu) {
    try {
      const detay = await WUUESPN.getMacDetayi(ligKodu, eventId);
      macDetayiArayuzeYaz(detay);
      WUUApp.openMatchDetail();
    } catch (hata) {
      console.error("Maç detayı alınamadı:", hata);
      alert("Maç detayı yüklenemedi. Lütfen tekrar deneyin.");
    }
  }


  /* --- Maç detayı arayüzüne yaz --- */
  function macDetayiArayuzeYaz(detay) {
    if (!detay) {
      alert("Maç detayı bulunamadı.");
      return;
    }
    const elHome = document.getElementById("md-home-name");
    const elAway = document.getElementById("md-away-name");
    const elHomeSkor = document.getElementById("md-home-score");
    const elAwaySkor = document.getElementById("md-away-score");
    const elMinute = document.getElementById("md-minute-text");
    const elComp = document.getElementById("md-competition");
    const elHomeLogo = document.getElementById("md-home-logo");
    const elAwayLogo = document.getElementById("md-away-logo");

    if (elHome && detay.evSahibi) elHome.textContent = detay.evSahibi.ad;
    if (elAway && detay.deplasman) elAway.textContent = detay.deplasman.ad;
    if (elHomeSkor && detay.evSahibi) elHomeSkor.textContent = detay.evSahibi.puan ?? "-";
    if (elAwaySkor && detay.deplasman) elAwaySkor.textContent = detay.deplasman.puan ?? "-";
    if (elMinute) elMinute.textContent = detay.dakika ? detay.dakika + "'" : "-";
    if (elComp) elComp.textContent = detay.turuva || "Maç Detayı";

    if (elHomeLogo && detay.evSahibi && detay.evSahibi.logo) {
      elHomeLogo.innerHTML = `<img src="${detay.evSahibi.logo}" alt="${detay.evSahibi.ad}">`;
    }
    if (elAwayLogo && detay.deplasman && detay.deplasman.logo) {
      elAwayLogo.innerHTML = `<img src="${detay.deplasman.logo}" alt="${detay.deplasman.ad}">`;
    }

    const content = document.getElementById("md-content-summary");
    if (content) {
      let html = "";
      if (detay.olaylar && detay.olaylar.length > 0) {
        html = '<div style="display:flex;flex-direction:column;gap:12px;">';
        for (const olay of detay.olaylar) {
          html += `
            <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--color-border);">
              <span style="font-size:12px;color:var(--color-text-secondary);">${olay.dakika ?? ""}</span>
              <span style="font-size:13px;color:var(--color-text);">${olay.aciklama || olay.tur || "Olay"}</span>
            </div>`;
        }
        html += "</div>";
      } else {
        html = '<div class="empty-state" style="height:auto;padding:20px;"><p style="color:var(--color-text-secondary);">Maç olayı bulunamadı.</p></div>';
      }
      content.innerHTML = html;
    }
  }

  /* --- Puan durumunu yükle (data/puan_durumu.json) --- */
  async function tumPuanlariniYukle() {
    const tumStandings = {};

    for (const [anahtar, lig] of Object.entries(WUUESPN.LIGLER)) {
      try {
        const standings = await WUUESPN.getPuanDurumu(anahtar);
        tumStandings[anahtar] = standings;
      } catch (hata) {
        console.error(lig.ad + " puan durumu çekilemedi:", hata);
      }
    }

    return tumStandings;
  }

  /* --- Puan tablosunu arayüze yaz (Süper Lig varsayılan) --- */
  function puanTablosunaYaz(standings, ligKodu = "tur1") {
    const veri = standings[ligKodu];
    const body = document.getElementById("standings-body");
    const zoneInfo = document.getElementById("standings-zone-info");

    if (!body || !veri) return;

    body.innerHTML = "";

    const grup = veri.gruplar[0];
    if (!grup) return;

    for (const takim of grup.takimlar) {
      const satir = document.createElement("tr");
      const favori = localStorage.getItem("wuuspor_favori");
      const buyukIdler = [432, 436, 1895, 997];
      const buyukMu = buyukIdler.includes(Number(takim.id));
      satir.className = (favori && String(takim.id) === String(WUUESPN.TAKIM_ID[favori])) ? "favored" : (buyukMu ? "big-four" : "");

      satir.innerHTML = `
        <td class="standings-pos">${takim.sira ?? "-"}</td>
        <td style="display:flex;align-items:center;gap:8px;">
          <div class="team-logo" style="width:24px;height:24px;font-size:12px;">
            <span class="logo-fallback">${takim.kisaAd}</span>
          </div>
          <span>${takim.ad}</span>
        </td>
        <td>${takim.oynanmis ?? "-"}</td>
        <td>${takim.galibiyet ?? "-"}</td>
        <td>${takim.beraberlik ?? "-"}</td>
        <td>${takim.maglubiyet ?? "-"}</td>
        <td>${takim.atilanGol ?? "-"}</td>
        <td>${takim.yenenGol ?? "-"}</td>
        <td class="standings-pts">${takim.puan ?? "-"}</td>
      `;
      body.appendChild(satir);
    }

    if (zoneInfo) {
      if (ligKodu === "tur1") {
        zoneInfo.textContent = "1-3: Avrupa kupası · 18: Küme düşme";
      } else {
        zoneInfo.textContent = "Puan durumu: " + veri.lig;
      }
    }
  }

  /* --- Otomatik yenileme başlat --- */
  function otomatikYenilemeyiBaslat() {
    if (otomatikYenilemeId) clearInterval(otomatikYenilemeId);

    const aralik = canliMacVar ? 20000 : 120000;

    otomatikYenilemeId = setInterval(async () => {
      try {
        await tumTurnuvalarinMaclariniYukle();
      } catch (hata) {
        console.error("Otomatik yenileme hatası:", hata);
      }
    }, aralik);
  }

  function otomatikYenilemeyiDurdur() {
    if (otomatikYenilemeId) {
      clearInterval(otomatikYenilemeId);
      otomatikYenilemeId = null;
    }
  }

  return {
    tumTurnuvalarinMaclariniYukle,
    tumPuanlariniYukle,
    puanTablosunaYaz,
    otomatikYenilemeyiBaslat,
    otomatikYenilemeyiDurdur,
    macDetayiAc
  };

})();

window.WUUMaclar = WUUMaclar;