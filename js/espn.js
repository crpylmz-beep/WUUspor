/* ========================================
   WUUspor — ESPN Veri Kaynağı (Aşama 2)
   Gerçek canlı skor, maç, puan ve kadro verileri.
   Hiçbir sahte/static veri kullanılmayacak.
   ======================================== */

const WUUESPN = (() => {

  /* --- Sabitler --- */
  const BASE = "https://site.api.espn.com/apis/site/v2/sports/soccer";
  const STANDINGS_BASE = "https://site.api.espn.com/apis/v2/sports/soccer"; // puan durumu için "apis/v2"

  const LIGLER = {
    tur1: { kod: "tur.1", ad: "Süper Lig", bayrak: "TR" },
    ucl:  { kod: "uefa.champions", ad: "Şampiyonlar Ligi", bayrak: "UCL" },
    uel:  { kod: "uefa.europa", ad: "Avrupa Ligi", bayrak: "UEL" },
    uclconf: { kod: "uefa.europa.conf", ad: "Konferans Ligi", bayrak: "UECL" }
  };

  /* 4 büyük takım ESPN ID'leri */
  TAKIM_ID = {
    gs: 432,
    fb: 436,
    bjk: 1895,
    ts: 997
  };

  /* --- Yardımcı: fetch + yeniden deneme (2 deneme, 3 sn aralık) --- */
  async function fetchWithRetry(url, deneme = 0) {
    try {
      const cevap = await fetch(url, {
        headers: {
          "Accept": "application/json",
          "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15"
        }
      });
      if (!cevap.ok) throw new Error("HTTP " + cevap.status);
      return await cevap.json();
    } catch (hata) {
      if (deneme < 1) {
        await new Promise((resolve) => setTimeout(resolve, 3000));
        return fetchWithRetry(url, deneme + 1);
      }
      throw hata;
    }
  }

  /* --- Tarih dizisi (YYYYMMDD) --- */
  function bugunYYYYMMDD() {
    const simdi = new Date();
    const y = simdi.getFullYear();
    const m = String(simdi.getMonth() + 1).padStart(2, "0");
    const g = String(simdi.getDate()).padStart(2, "0");
    return y + m + g;
  }

  return {
    BASE,
    STANDINGS_BASE,
    LIGLER,
    TAKIM_ID,
    fetchWithRetry,
    bugunYYYYMMDD,

    /* --- Günün maçları (scoreboard) --- */
    async getGununMaclari(ligKodu, tarih = null) {
      const t = tarih || this.bugunYYYYMMDD();
      const url = `${this.BASE}/${ligKodu}/scoreboard?dates=${t}`;
      const veri = await this.fetchWithRetry(url);
      return this.maclariNormalizeEt(veri);
    },

    /* ESPN maç listesini uygulama formatına dönüştür */
    maclariNormalizeEt(veri) {
      const maclar = [];
      if (!veri || !veri.events) return maclar;

      for (const olay of veri.events) {
        try {
          const mac = {
            id: olay.id,
            tarih: olay.date,
            durum: olay.status ? olay.status.type : null,
            hafta: olay.week ? olay.week.text : null,
            turuva: veri.league ? veri.league.name : null,
            evSahibi: null,
            deplasman: null,
            skor: null,
            dakika: null,
            canli: false
          };

          if (olay.competitions && olay.competitions[0]) {
            const comp = olay.competitions[0];
            const takimlar = comp.competitors || [];

            for (const takim of takimlar) {
              const takimBilgi = {
                id: takim.id,
                ad: takim.team ? takim.team.displayName : "Bilinmiyor",
                kisaAd: takim.team ? takim.team.shortName : "?",
                logo: takim.team ? takim.team.logo : null,
                puan: takim.score ? parseInt(takim.score, 10) : null,
                sinonir: takim.homeAway
              };
              if (takim.homeAway === "home") mac.evSahibi = takimBilgi;
              if (takim.homeAway === "away") mac.deplasman = takimBilgi;
            }

            if (comp.status) {
              mac.durum = comp.status.type;
              mac.dakika = comp.status.displayClock || null;
              mac.canli = comp.status.type && comp.status.type.state === "in";
            }
          }

          if (mac.evSahibi && mac.deplasman) {
            maclar.push(mac);
          }
        } catch (hata) {
          continue;
        }
      }

      return maclar;
    },

    /* --- Maç detayı (summary) --- */
    async getMacDetayi(ligKodu, eventId) {
      const url = `${this.BASE}/${ligKodu}/summary?event=${eventId}`;
      const veri = await this.fetchWithRetry(url);
      return this.detayiNormalizeEt(veri);
    },

    detayiNormalizeEt(veri) {
      const detay = {
        id: null,
        tarih: null,
        evSahibi: null,
        deplasman: null,
        skor: null,
        dakika: null,
        durum: null,
        turuva: null,
        stat: null,
        hakem: null,
        hafta: null,
        goller: [],
        olaylar: [],
        ilk11Ev: [],
        ilk11Dep: [],
        yedeklerEv: [],
        yedeklerDep: [],
        istatistikler: []
      };

      if (!veri) return detay;

      if (veri.header && veri.header.competitions && veri.header.competitions[0]) {
        const comp = veri.header.competitions[0];
        detay.id = comp.id;
        detay.tarih = comp.date;
        detay.durum = comp.status ? comp.status.type : null;
        detay.dakika = comp.status ? comp.status.displayClock : null;
        detay.hafta = comp.week ? comp.week.text : null;

        if (comp.status) {
          detay.canli = comp.status.type && comp.status.type.state === "in";
        }

        const takimlar = comp.competitors || [];
        for (const takim of takimlar) {
          const t = {
            id: takim.id,
            ad: takim.team ? takim.team.displayName : "Bilinmiyor",
            kisaAd: takim.team ? takim.team.shortName : "?",
            logo: takim.team ? takim.team.logo : null,
            puan: takim.score ? parseInt(takim.score, 10) : null,
            sinonir: takim.homeAway
          };
          if (takim.homeAway === "home") detay.evSahibi = t;
          if (takim.homeAway === "away") detay.deplasman = t;
        }
      }

      if (veri.gameInfo) {
        detay.stat = veri.gameInfo.venue ? veri.gameInfo.venue.fullName : null;
        detay.hakem = veri.gameInfo.referees
          ? veri.gameInfo.referees.map((r) => r.name).join(", ")
          : null;
      }

      // Olaylar (keyEvents veya plays)
      const olayKaynagi = veri.keyEvents || veri.plays || [];
      for (const olay of olayKaynagi) {
        try {
          const o = {
            dakika: null,
            tur: null,
            takim: null,
            oyuncu: null,
            aciklama: null
          };

          if (olay.clock) o.dakika = olay.clock.displayValue || null;
          if (olay.type) o.tur = olay.type.text || null;
          if (olay.athletes && olay.athletes[0])
            o.oyuncu = olay.athletes[0].fullName || null;
          if (olay.text) o.aciklama = olay.text || null;

          detay.olaylar.push(o);
        } catch (hata) {
          continue;
        }
      }

      return detay;
    },

    /* --- Puan durumu (standings) --- */
    async getPuanDurumu(ligKodu) {
      const url = `${this.STANDINGS_BASE}/${ligKodu}/standings`;
      const veri = await this.fetchWithRetry(url);
      return this.puaniNormalizeEt(veri, ligKodu);
    },

    puaniNormalizeEt(veri, ligKodu) {
      const sonuc = {
        lig: ligKodu,
        tur: null,
        gruplar: [],
        guncellendi: new Date().toISOString()
      };

      if (!veri) return sonuc;

      try {
        const children = veri.children || [];
        for (const child of children) {
          const standings = child.standings || [];
          for (const st of standings) {
            const grup = {
              ad: st.name || "Genel",
              sira: st.type ? st.type.text : null,
              takimlar: []
            };

            const entries = st.entries || [];
            for (const entry of entries) {
              const takim = entry.team || {};
              const stats = entry.stats || [];
              const statMap = {};
              for (const s of stats) {
                statMap[s.name] = s.value;
              }

              grup.takimlar.push({
                id: takim.id,
                ad: takim.displayName || "Bilinmiyor",
                kisaAd: takim.shortName || "?",
                logo: takim.logo || null,
                sira: entry.position ? parseInt(entry.position, 10) : null,
                oynanmis: statMap.playedGames ? parseInt(statMap.playedGames, 10) : null,
                galibiyet: statMap.wins ? parseInt(statMap.wins, 10) : null,
                beraberlik: statMap.draws ? parseInt(statMap.draws, 10) : null,
                maglubiyet: statMap.losses ? parseInt(statMap.losses, 10) : null,
                atilanGol: statMap.pointsFor ? parseInt(statMap.pointsFor, 10) : null,
                yenenGol: statMap.pointsAgainst
                  ? parseInt(statMap.pointsAgainst, 10)
                  : null,
                puan: statMap.points ? parseInt(statMap.points, 10) : null
              });
            }

            sonuc.gruplar.push(grup);
          }
        }
      } catch (hata) {
        // Yapı değişmiş olabilir, boş dön
      }

      return sonuc;
    },

    /* --- Takım takvimi (sıradaki maçlar) --- */
    async getTakimTakvimi(ligKodu, takimId) {
      const url = `${this.BASE}/${ligKodu}/teams/${takimId}/schedule?fixture=true`;
      const veri = await this.fetchWithRetry(url);
      return this.takvimiNormalizeEt(veri);
    },

    takvimiNormalizeEt(veri) {
      const takvim = [];
      if (!veri || !veri.events) return takvim;

      for (const olay of veri.events) {
        try {
          const mac = {
            id: olay.id,
            tarih: olay.date,
            rakip: null,
            evMi: null,
            turuva: null,
            durum: null
          };

          if (olay.competitions && olay.competitions[0]) {
            const comp = olay.competitions[0];
            const takimlar = comp.competitors || [];
            for (const takim of takimlar) {
              if (takim.homeAway === "home") mac.evMi = true;
              if (takim.homeAway === "away") mac.evMi = false;
            }
          }

          takvim.push(mac);
        } catch (hata) {
          continue;
        }
      }

      return takvim;
    }
  };

})();

window.WUUESPN = WUUESPN;