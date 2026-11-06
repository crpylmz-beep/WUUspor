/* ========================================
   WUUspor — Haber ve Transfer Verisi (haberler.js)
   data/haberler.json ve data/transferler.json dosyalarından
   RSS haberlerini yükler ve ekrana yazar.
   Hiçbir sahte/static veri kullanılmayacak.
   ======================================== */

const WUUHaberler = (() => {

  const TAKIM_KISA = {
    gs: 'GS', fb: 'FB', bjk: 'BJK', ts: 'TS'
  };

  /* --- JSON yükle (yoksa boş dön) --- */
  async function jsonYukle(dosya) {
    try {
      const cevap = await fetch(`./data/${dosya}`, { cache: 'no-store' });
      if (!cevap.ok) return null;
      return await cevap.json();
    } catch (hata) {
      console.error(`Haber JSON yüklenemedi: ${dosya}`, hata);
      return null;
    }
  }

  /* --- Tarih formatı (TR, kısa) --- */
  function tarihKisa(iso) {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return iso;
    }
  }

  /* --- Haber kartı HTML'i --- */
  function haberKartiHtml(h) {
    const takimEtiket = h.takimlar && h.takimlar.length > 0
      ? h.takimlar.map(t => `<span class="news-tag">${TAKIM_KISA[t] || t.toUpperCase()}</span>`).join('')
      : '';
    const kategoriRenk = h.kategori === 'transfer'
      ? 'style="background:rgba(255,214,10,0.15);color:#FFD60A;"'
      : 'style="background:rgba(48,209,88,0.15);color:#30D158;"';
    const transferTag = h.transferDurumu
      ? `<span class="news-tag" ${kategoriRenk}>${h.transferDurumu === 'resmi' ? 'RESMİ' : 'SÖYLENTİ'}</span>`
      : '';
    return `
      <article class="news-card" onclick="location.href='${h.link}'">
        <div class="news-header">
          ${takimEtiket}
          <span class="news-source">${h.kaynak || 'Kaynak'}</span>
          <span class="news-time">${tarihKisa(h.yayinTarihi)}</span>
          ${transferTag}
        </div>
        <h3 class="news-title">${h.baslik || 'Haber'}</h3>
        <p class="news-summary">${h.ozet || ''}</p>
        <div class="news-footer">
          <span>${h.kategori === 'transfer' ? 'Transfer' : 'Haber'} · ${h.kaynak || ''}</span>
          <a class="news-link" href="${h.link}" target="_blank" rel="noopener">Devamı →</a>
        </div>
      </article>
    `;
  }

  /* --- Haberler ekranını doldur --- */
  async function haberleriYukleVeGoster() {
    const liste = document.getElementById('news-list');
    if (!liste) return;

    const veri = await jsonYukle('haberler.json');
    const haberler = (veri && veri.haberler) || [];

    if (haberler.length === 0) {
      liste.innerHTML = `
        <div class="empty-state" style="height:auto;padding:24px;">
          <h2>Henüz haber yok</h2>
          <p style="color:var(--color-text-secondary);">RSS akışlarından veri bekleniyor.</p>
        </div>`;
      return;
    }

    // En yeni habere göre sırala (yayinTarihi ters)
    const sirali = [...haberler].sort((a, b) => {
      return new Date(b.yayinTarihi || 0) - new Date(a.yayinTarihi || 0);
    });

    liste.innerHTML = sirali.map(haberKartiHtml).join('');
  }

  /* --- Transferler ekranını doldur --- */
  async function transferleriYukleVeGoster() {
    const liste = document.getElementById('transfer-list');
    const filtreler = document.getElementById('transfer-filters');
    if (!liste) return;

    const veri = await jsonYukle('transferler.json');
    const transferler = (veri && veri.transferler) || [];

    // Filtre çipleri
    if (filtreler) {
      filtreler.innerHTML = `
        <button class="chip chip-active" data-filter="tum">Hepsi</button>
        <button class="chip" data-filter="resmi">Resmi</button>
        <button class="chip" data-filter="soylenti">Söylenti</button>
      `;
      filtreler.querySelectorAll('.chip').forEach(chip => {
        chip.addEventListener('click', () => {
          filtreler.querySelectorAll('.chip').forEach(c => c.classList.remove('chip-active'));
          chip.classList.add('chip-active');
          transferleriFiltrele(chip.dataset.filter);
        });
      });
    }

    function render(filtre = 'tum') {
      const filtreli = filtre === 'tum'
        ? transferler
        : transferler.filter(t => t.transferDurumu === filtre);

      if (filtreli.length === 0) {
        liste.innerHTML = `
          <div class="empty-state" style="height:auto;padding:24px;">
            <p style="color:var(--color-text-secondary);">Eşleşen transfer bulunamadı.</p>
          </div>`;
        return;
      }

      const sirali = [...filtreli].sort((a, b) => {
        return new Date(b.yayinTarihi || 0) - new Date(a.yayinTarihi || 0);
      });

      liste.innerHTML = sirali.map(t => {
        const resmi = t.transferDurumu === 'resmi';
        return `
          <article class="news-card">
            <div class="news-header">
              ${(t.takimlar || []).map(tk => `<span class="news-tag">${TAKIM_KISA[tk] || tk.toUpperCase()}</span>`).join('')}
              <span class="news-source">${t.kaynak || 'Kaynak'}</span>
              <span class="news-time">${tarihKisa(t.yayinTarihi)}</span>
              <span class="news-tag" style="background:rgba(255,214,10,0.15);color:#FFD60A;">${resmi ? 'RESMİ' : 'SÖYLENTİ'}</span>
            </div>
            <h3 class="news-title">${t.baslik || 'Transfer Haberi'}</h3>
            <p class="news-summary">${t.ozet || ''}</p>
            <div class="news-footer">
              <span>Transfer · ${t.kaynak || ''}</span>
              <a class="news-link" href="${t.link}" target="_blank" rel="noopener">Detay →</a>
            </div>
          </article>
        `;
      }).join('');
    }

    window.transferleriFiltrele = render;
    render();
  }

  /* --- Takım panelinde son haberleri göster --- */
  async function takimHaberleriniYukle(takimKodu, limit = 3) {
    const veri = await jsonYukle('haberler.json');
    const haberler = (veri && veri.haberler) || [];
    const filtreli = haberler.filter(h =>
      h.takimlar && h.takimlar.includes(takimKodu)
    ).sort((a, b) => new Date(b.yayinTarihi || 0) - new Date(a.yayinTarihi || 0))
      .slice(0, limit);

    const container = document.getElementById('tp-news');
    if (!container) return;

    if (filtreli.length === 0) {
      container.innerHTML = '<p style="color:var(--color-text-secondary);font-size:12px;">Takım speciali haber yok.</p>';
      return;
    }

    container.innerHTML = filtreli.map(h => `
      <div style="display:flex;flex-direction:column;gap:4px;padding:8px 0;border-bottom:1px solid var(--color-border);font-size:12px;">
        <div style="font-weight:600;color:var(--color-text);">${h.baslik || 'Haber'}</div>
        <div style="color:var(--color-text-secondary);">${tarihKisa(h.yayinTarihi)} · ${h.kaynak || ''}</div>
      </div>
    `).join('');
  }

  return {
    haberleriYukleVeGoster,
    transferleriYukleVeGoster,
    takimHaberleriniYukle
  };

})();

window.WUUHaberler = WUUHaberler;
