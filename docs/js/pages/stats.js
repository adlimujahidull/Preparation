/**
 * pages/stats.js — Halaman "Statistik" (Analisis Metrik Belajar, Kartu Aktif/Dormant, & Pacing S3)
 * Mengimplementasikan A13 (Pemisahan Kartu Aktif vs Dormant & Kuasai per Domain)
 * dan B1 (Detail Analisis Indikator Laju S3).
 */

const StatsPage = (() => {
  function render(container) {
    const cards = Store.getCards();
    const progress = Store.getProgress();
    const objectives = Store.getObjectives();
    const labs = Store.getLabs();
    const config = Store.getConfig();

    const objMap = {};
    objectives.forEach(o => {
      objMap[o.id] = o;
      objMap[o.id.replace('obj-', 'o')] = o;
    });

    // 1. A13: Kartu Aktif vs Kartu Dormant
    const activeCards = SRS.getActiveCards(cards, objMap);
    const dormantCards = SRS.getDormantCards(cards, objMap);
    const totalCards = cards.length;
    const activePct = totalCards > 0 ? Math.round((activeCards.length / totalCards) * 100) : 0;
    const dormantPct = totalCards > 0 ? Math.round((dormantCards.length / totalCards) * 100) : 0;

    // Self vs Seed
    let selfCardsCount = 0;
    let seedCardsCount = 0;
    cards.forEach(c => {
      if (c.source === 'self') selfCardsCount++;
      else seedCardsCount++;
    });

    // 2. A13: Objective Kuasai per Domain
    const domains = [
      { key: 'containers', label: 'Containers' },
      { key: 'data', label: 'Data Management' },
      { key: 'integration', label: 'Integration' },
      { key: 'ops', label: 'Security & Ops' }
    ];

    const domainStats = domains.map(d => {
      const dObjs = objectives.filter(o => o.domain === d.key);
      const total = dObjs.length;
      const kuasai = dObjs.filter(o => o.status === 'kuasai').length;
      const dipraktikkan = dObjs.filter(o => o.status === 'dipraktikkan').length;
      const dibaca = dObjs.filter(o => o.status === 'dibaca').length;
      const belum = dObjs.filter(o => o.status === 'belum').length;
      const pct = total > 0 ? Math.round((kuasai / total) * 100) : 0;
      return { ...d, total, kuasai, dipraktikkan, dibaca, belum, pct };
    });

    // 3. B1: Indikator Laju Belajar (S3) Detail
    const pacing = Store.getPacingMetrics();
    let pacingDetailHtml = '';

    if (pacing) {
      pacingDetailHtml = `
        <div class="card" style="margin-bottom: 1.5rem; border: 1px solid var(--border-color);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; flex-wrap: wrap; gap: 0.5rem;">
            <div>
              <h2 style="font-size: 1.15rem; font-weight: 700; margin: 0; color: var(--azure-blue);">
                ⏱️ Indikator Laju Belajar (Spesifikasi Teknis S3)
              </h2>
              <div class="card-subtitle" style="margin-top: 0.2rem;">
                Perbandingan hitung mundur target ujian dengan progres penguasaan objective
              </div>
            </div>
            <span class="badge ${pacing.selisih <= 0 ? 'badge-recall' : (pacing.selisih <= 3 ? 'badge-article' : 'badge-decision')}" style="font-size: 0.85rem; font-weight: 700;">
              ${escapeHtml(pacing.statusText)}
            </span>
          </div>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 0.75rem; margin-bottom: 1.25rem;">
            <div style="background: var(--bg-main); padding: 0.85rem; border-radius: var(--radius-sm); border: 1px solid var(--border-subtle);">
              <div style="font-size: 0.75rem; color: var(--text-dim); font-weight: 700;">HARI & MINGGU SISA</div>
              <div style="font-size: 1.35rem; font-weight: 800; color: var(--text-main); margin: 0.2rem 0;">${pacing.hariSisa} hari</div>
              <div style="font-size: 0.75rem; color: var(--text-muted);">${pacing.mingguSisa.toFixed(1)} minggu tersisa</div>
            </div>

            <div style="background: var(--bg-main); padding: 0.85rem; border-radius: var(--radius-sm); border: 1px solid var(--border-subtle);">
              <div style="font-size: 0.75rem; color: var(--text-dim); font-weight: 700;">LAJU DIBUTUHKAN</div>
              <div style="font-size: 1.35rem; font-weight: 800; color: var(--azure-blue); margin: 0.2rem 0;">${pacing.lajuDibutuhkan.toFixed(1).replace('.', ',')} / mgg</div>
              <div style="font-size: 0.75rem; color: var(--text-muted);">Sisa ${pacing.sisa} dari ${pacing.total} objective</div>
            </div>

            <div style="background: var(--bg-main); padding: 0.85rem; border-radius: var(--radius-sm); border: 1px solid var(--border-subtle);">
              <div style="font-size: 0.75rem; color: var(--text-dim); font-weight: 700;">LAJU AKTUAL KAMU</div>
              <div style="font-size: 1.35rem; font-weight: 800; color: var(--accent-green); margin: 0.2rem 0;">${pacing.lajuAktual.toFixed(1).replace('.', ',')} / mgg</div>
              <div style="font-size: 0.75rem; color: var(--text-muted);">${pacing.selesai} kuasai dalam ${pacing.mingguBerjalan.toFixed(1)} mgg</div>
            </div>

            <div style="background: var(--bg-main); padding: 0.85rem; border-radius: var(--radius-sm); border: 1px solid var(--border-subtle);">
              <div style="font-size: 0.75rem; color: var(--text-dim); font-weight: 700;">PROYEKSI AKHIR</div>
              <div style="font-size: 1.35rem; font-weight: 800; color: ${pacing.selisih <= 0 ? 'var(--accent-green)' : 'var(--accent-yellow)'}; margin: 0.2rem 0;">${Math.round(pacing.proyeksi)} / ${pacing.total}</div>
              <div style="font-size: 0.75rem; color: var(--text-muted);">${pacing.selisih <= 0 ? 'Tepat target' : `Selisih ${pacing.selisih} objective`}</div>
            </div>
          </div>

          <div style="font-size: 0.85rem; background: var(--bg-main); border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 0.75rem 1rem;">
            <strong>Ringkasan Hari Ini:</strong> <code>${pacing.formattedString}</code>
          </div>
        </div>
      `;
    }

    // 4. SRS Box Distribution
    const boxCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    cards.forEach(c => {
      const p = progress[c.id];
      const box = p ? (p.box || 1) : 1;
      boxCounts[box] = (boxCounts[box] || 0) + 1;
    });

    // 5. Total Lab Hours
    const totalLabMinutes = labs.reduce((acc, l) => acc + (Number(l.minutes) || 0), 0);
    const totalLabHours = (totalLabMinutes / 60).toFixed(1);

    container.innerHTML = `
      <div class="page-container" style="max-width: 920px; margin: 0 auto; padding-bottom: 2rem;">
        <h1 style="font-size: 1.35rem; font-weight: 800; margin-bottom: 0.35rem; color: var(--text-main);">📊 Statistik & Metrik Belajar</h1>
        <div class="card-subtitle" style="margin-bottom: 1.5rem;">
          Analisis penguasaan objective per domain, pembagian kartu aktif vs dormant, dan metrik laju persiapan ujian.
        </div>

        <!-- B1 Pacing Detail if ExamDate set -->
        ${pacingDetailHtml}

        <!-- Top Overview Cards -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1rem; margin-bottom: 1.5rem;">
          
          <!-- A13: Kartu Aktif vs Dormant -->
          <div class="card">
            <div class="card-title-row">
              <span class="card-title">Kartu Aktif vs Dormant (A13)</span>
              <span class="badge badge-lab">${totalCards} Total Kartu</span>
            </div>
            <div style="display: flex; gap: 1.5rem; align-items: baseline; margin-top: 0.5rem;">
              <div>
                <div style="font-size: 1.6rem; font-weight: 800; color: var(--accent-green);">${activeCards.length}</div>
                <div style="font-size: 0.75rem; color: var(--text-dim); font-weight: 600;">AKTIF (${activePct}%)</div>
              </div>
              <div>
                <div style="font-size: 1.6rem; font-weight: 800; color: var(--accent-yellow);">${dormantCards.length}</div>
                <div style="font-size: 0.75rem; color: var(--text-dim); font-weight: 600;">DORMANT (${dormantPct}%)</div>
              </div>
            </div>
            <div class="card-subtitle" style="margin-top: 0.6rem; line-height: 1.4;">
              ${dormantCards.length > 0 ? `Terdapat ${dormantCards.length} kartu terkunci karena objective-nya belum berstatus dibaca/dipraktikkan/kuasai.` : 'Seluruh kartu telah aktif.'}
            </div>
            <div class="progress-bar-container" style="margin-top: 0.75rem;">
              <div class="progress-bar-fill" style="width: ${activePct}%; background: var(--accent-green);"></div>
            </div>
          </div>

          <!-- Total Lab Time -->
          <div class="card">
            <div class="card-title-row">
              <span class="card-title">Total Waktu Hands-on Lab</span>
              <span class="badge badge-lab">${labs.length} Sesi Lab</span>
            </div>
            <div class="card-value" style="color: var(--azure-blue); margin-top: 0.5rem;">
              ${totalLabHours} <span style="font-size: 1.1rem; font-weight: 600; color: var(--text-dim);">Jam</span>
            </div>
            <div class="card-subtitle" style="margin-top: 0.6rem;">
              Akumulasi durasi praktikum Azure yang tercatat di <code>labs.json</code>.
            </div>
            <div style="margin-top: 0.75rem;">
              <button class="btn btn-secondary btn-sm" onclick="App.openQuickLabModal()">
                + Catat Sesi Lab Baru (Alt+L)
              </button>
            </div>
          </div>

        </div>

        <!-- A13: Objective Kuasai per Domain -->
        <div class="card" style="margin-bottom: 1.5rem;">
          <h2 style="font-size: 1.1rem; font-weight: 700; margin-bottom: 0.75rem; color: var(--azure-blue);">
            🎯 Penguasaan Objective per Domain (A13)
          </h2>
          <div style="display: flex; flex-direction: column; gap: 1rem;">
            ${domainStats.map(d => `
              <div style="background: var(--bg-main); border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 0.85rem 1rem;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                  <span style="font-weight: 700; font-size: 0.95rem; color: var(--text-main);">${d.label}</span>
                  <span style="font-weight: 700; color: ${d.pct >= 70 ? 'var(--accent-green)' : 'var(--azure-blue)'}; font-size: 0.9rem;">
                    ${d.kuasai}/${d.total} Kuasai (${d.pct}%)
                  </span>
                </div>
                <div style="background: var(--bg-card); height: 8px; border-radius: 9999px; overflow: hidden; margin-bottom: 0.5rem; border: 1px solid var(--border-subtle);">
                  <div style="width: ${d.pct}%; height: 100%; background: var(--azure-blue); border-radius: 9999px;"></div>
                </div>
                <div style="display: flex; gap: 1rem; font-size: 0.75rem; color: var(--text-muted); flex-wrap: wrap;">
                  <span>🏆 Kuasai: <strong>${d.kuasai}</strong></span>
                  <span>🧪 Dipraktikkan: <strong>${d.dipraktikkan}</strong></span>
                  <span>📖 Dibaca: <strong>${d.dibaca}</strong></span>
                  <span>⏳ Belum: <strong>${d.belum}</strong></span>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- SRS Leitner Box Breakdown -->
        <div class="card">
          <h2 style="font-size: 1.1rem; font-weight: 700; margin-bottom: 1rem; color: var(--azure-blue);">
            🧠 Distribusi Spaced Repetition (Leitner 5 Box)
          </h2>
          <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 0.75rem; text-align: center;">
            ${[1, 2, 3, 4, 5].map(b => {
              const cnt = boxCounts[b] || 0;
              const pct = totalCards > 0 ? Math.round((cnt / totalCards) * 100) : 0;
              return `
                <div style="background-color: var(--bg-main); padding: 0.85rem 0.5rem; border-radius: var(--radius-md); border: 1px solid var(--border-color); border-top: 3px solid ${b === 5 ? 'var(--accent-green)' : b >= 3 ? 'var(--azure-blue)' : 'var(--accent-yellow)'};">
                  <div style="font-size: 0.75rem; color: var(--text-dim); font-weight: 700;">BOX ${b}</div>
                  <div style="font-size: 1.35rem; font-weight: 800; margin: 0.2rem 0; color: var(--text-main);">${cnt}</div>
                  <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600;">${pct}%</div>
                </div>
              `;
            }).join('')}
          </div>
        </div>

      </div>
    `;
  }

  return {
    render
  };
})();

window.StatsPage = StatsPage;
