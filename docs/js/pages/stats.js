/**
 * pages/stats.js — Halaman "Statistik" (Analisis Rasio Self/Seed, Top Failed Cards, Lab Hours, & SRS Box)
 */

const StatsPage = (() => {
  function render(container) {
    const cards = Store.getCards();
    const progress = Store.getProgress();
    const resources = Store.getResources();
    const labs = Store.getLabs();

    // 1. Rasio Self vs Seed Cards
    let selfCardsCount = 0;
    let seedCardsCount = 0;
    const domainCounts = { containers: 0, data: 0, integration: 0, ops: 0, umum: 0 };

    cards.forEach(c => {
      if (c.source === 'self') selfCardsCount++;
      else seedCardsCount++;

      const d = c.domain || 'umum';
      domainCounts[d] = (domainCounts[d] || 0) + 1;
    });

    const totalCards = cards.length;
    const selfPercent = totalCards > 0 ? Math.round((selfCardsCount / totalCards) * 100) : 0;

    // 2. SRS Box Distribution (Box 1-5)
    const boxCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    cards.forEach(c => {
      const p = progress[c.id];
      const box = p ? (p.box || 1) : 1;
      boxCounts[box] = (boxCounts[box] || 0) + 1;
    });

    // 3. Top 10 Failed Cards
    const cardsWithFailRatio = [];
    cards.forEach(c => {
      const p = progress[c.id];
      if (p && (p.right + p.wrong) > 0) {
        const totalAttempts = p.right + p.wrong;
        const failRatio = p.wrong / totalAttempts;
        cardsWithFailRatio.push({
          card: c,
          progress: p,
          failRatio,
          totalAttempts
        });
      }
    });

    cardsWithFailRatio.sort((a, b) => b.failRatio - a.failRatio || b.progress.wrong - a.progress.wrong);
    const top10Failed = cardsWithFailRatio.slice(0, 10);

    // 4. Lab Hours & Resources Per Week
    const weekStats = {};
    for (let w = 1; w <= 6; w++) {
      weekStats[w] = { totalRes: 0, doneRes: 0 };
    }

    resources.forEach(r => {
      const w = r.week;
      if (w && weekStats[w]) {
        weekStats[w].totalRes++;
        if (r.status === 'selesai') {
          weekStats[w].doneRes++;
        }
      }
    });

    let totalLabMinutes = labs.reduce((acc, l) => acc + (Number(l.minutes) || 0), 0);
    let totalLabHours = (totalLabMinutes / 60).toFixed(1);

    container.innerHTML = `
      <div class="page-container" style="max-width: 900px; margin: 0 auto;">
        <h1 style="font-size: 1.35rem; font-weight: 800; margin-bottom: 0.5rem; color: var(--text-main);">Statistik & Metrik Belajar</h1>
        <div class="card-subtitle" style="margin-bottom: 1.5rem;">
          Pantau progres hafalan, rasio kartu buatan sendiri, dan akumulasi jam lab.
        </div>

        <!-- Top Overview Stats -->
        <div class="dashboard-grid" style="margin-bottom: 1.5rem;">
          
          <!-- Self vs Seed Ratio -->
          <div class="card">
            <div class="card-title-row">
              <span class="card-title">Rasio Kartu Mandiri (Self vs Seed)</span>
              <span class="badge ${selfPercent >= 50 ? 'badge-article' : 'badge-video'}">${selfPercent}% Self</span>
            </div>
            <div style="font-size: 1.6rem; font-weight: 800; margin-top: 0.5rem;">
              <span style="color: var(--accent-green);">${selfCardsCount} Self</span> / <span style="color: var(--text-dim);">${seedCardsCount} Seed</span>
            </div>
            <div class="card-subtitle" style="margin-top: 0.5rem; line-height: 1.4;">
              ${selfCardsCount === 0 ? '⚠️ Belum ada kartu buatan sendiri. Buat kartu dari kebingungan saat lab (Alt+N).' : 'Bagus! Kartu mandiri terus bertambah seiring pengerjaan lab.'}
            </div>
            <div class="progress-bar-container" style="margin-top: 0.75rem;">
              <div class="progress-bar-fill" style="width: ${selfPercent}%; background: linear-gradient(90deg, var(--accent-green), var(--azure-blue));"></div>
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
            <div class="card-subtitle" style="margin-top: 0.5rem;">
              Akumulasi durasi praktikum Azure yang tercatat di <code>labs.json</code>.
            </div>
            <div style="margin-top: 0.75rem;">
              <button class="btn btn-secondary btn-sm" onclick="App.openQuickLabModal()">
                + Catat Sesi Lab Baru (Alt+L)
              </button>
            </div>
          </div>

        </div>

        <!-- SRS Box Distribution -->
        <div class="card" style="margin-bottom: 1.5rem;">
          <h2 style="font-size: 1.1rem; font-weight: 700; margin-bottom: 1rem; color: var(--azure-blue);">
            🧠 Distribusi Spaced Repetition (Leitner 5 Box)
          </h2>
          <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 0.75rem; text-align: center;">
            ${[1, 2, 3, 4, 5].map(b => {
              const cnt = boxCounts[b] || 0;
              const pct = totalCards > 0 ? Math.round((cnt / totalCards) * 100) : 0;
              return `
                <div style="background-color: #f8fafc; padding: 0.85rem 0.5rem; border-radius: var(--radius-md); border: 1px solid var(--border-color); border-top: 3px solid ${b === 5 ? 'var(--accent-green)' : b >= 3 ? 'var(--azure-blue)' : 'var(--accent-yellow)'};">
                  <div style="font-size: 0.75rem; color: var(--text-dim); font-weight: 700;">BOX ${b}</div>
                  <div style="font-size: 1.35rem; font-weight: 800; margin: 0.2rem 0; color: var(--text-main);">${cnt}</div>
                  <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600;">${pct}%</div>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- Resources Completion Per Week -->
        <div class="card" style="margin-bottom: 1.5rem;">
          <h2 style="font-size: 1.1rem; font-weight: 700; margin-bottom: 1rem; color: var(--azure-blue);">
            📚 Progres Sumber Selesai per Minggu
          </h2>
          <div style="display: flex; flex-direction: column; gap: 0.75rem;">
            ${[1, 2, 3, 4, 5, 6].map(w => {
              const st = weekStats[w];
              const pct = st.totalRes > 0 ? Math.round((st.doneRes / st.totalRes) * 100) : 0;
              return `
                <div>
                  <div style="display: flex; justify-content: space-between; font-size: 0.85rem; font-weight: 600; margin-bottom: 0.25rem;">
                    <span>Minggu ${w}</span>
                    <span>${st.doneRes} / ${st.totalRes} Selesai (${pct}%)</span>
                  </div>
                  <div class="progress-bar-container" style="height: 6px; margin: 0;">
                    <div class="progress-bar-fill" style="width: ${pct}%;"></div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- Top 10 Cards with Highest Failure Ratio -->
        <div class="card">
          <h2 style="font-size: 1.1rem; font-weight: 700; margin-bottom: 0.5rem; color: var(--accent-red);">
            ⚠️ 10 Kartu dengan Tingkat Kesalahan Tertinggi
          </h2>
          <div class="card-subtitle" style="margin-bottom: 1rem;">
            Kartu-kartu ini paling sering dijawab salah saat sesi drill dan butuh perhatian khusus.
          </div>

          ${top10Failed.length > 0 ? `
            <div style="display: flex; flex-direction: column; gap: 0.75rem;">
              ${top10Failed.map((item, idx) => {
                const failPercent = Math.round(item.failRatio * 100);
                return `
                  <div style="background-color: #f8fafc; border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 0.85rem 1rem;">
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.35rem;">
                      <div style="display: flex; gap: 0.4rem;">
                        <span class="badge badge-${item.card.domain}">${item.card.domain}</span>
                        <span class="badge badge-lab">${item.card.type}</span>
                      </div>
                      <span style="font-size: 0.8rem; font-weight: 700; color: var(--accent-red);">
                        ${item.progress.wrong} Salah / ${item.totalAttempts} Drill (${failPercent}%)
                      </span>
                    </div>
                    <div style="font-size: 0.9rem; font-weight: 600; color: var(--text-main); margin-bottom: 0.3rem;">
                      ${escapeHtml(item.card.question)}
                    </div>
                    <div style="font-size: 0.8rem; color: var(--text-dim); line-height: 1.4;">
                      Jawaban: ${escapeHtml(item.card.answer.slice(0, 120))}...
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          ` : `
            <div style="text-align: center; padding: 2rem 1rem; color: var(--text-dim); font-size: 0.875rem;">
              Belum ada riwayat kegagalan kartu. Lakukan sesi drill untuk melihat statistik ini.
            </div>
          `}
        </div>

      </div>
    `;
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  return {
    render
  };
})();

window.StatsPage = StatsPage;
