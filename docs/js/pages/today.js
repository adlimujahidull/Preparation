/**
 * pages/today.js — Halaman "Hari Ini" (Dashboard Prioritas S2, Ringkasan Singkat, & Pacing S3)
 * Mengimplementasikan A8 (Satu Tindakan Utama S2), A9 (Setup Checklist Widget),
 * dan B1 (Indikator Laju S3).
 */

const TodayPage = (() => {
  let isSetupOpen = false;

  function render(container) {
    const config = Store.getConfig();
    const plan = Store.getPlan();
    const cards = Store.getCards();
    const progress = Store.getProgress();
    const objectives = Store.getObjectives();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const objMap = {};
    objectives.forEach(o => {
      objMap[o.id] = o;
      objMap[o.id.replace('obj-', 'o')] = o;
    });

    // Sole source of truth for due cards (S1)
    const dueCards = (typeof SRS !== 'undefined' && SRS.getDueCards)
      ? SRS.getDueCards(cards, progress, objMap)
      : [];

    // S2: Single Prominent Next Action
    const nextAction = Store.tindakanBerikutnya();
    let actionBannerHtml = '';

    if (nextAction.jenis === 'hapus_rg') {
      actionBannerHtml = `
        <div class="hero-action-card" style="background: var(--accent-red-bg); border: 2px solid var(--accent-red-border); border-radius: var(--radius-lg); padding: 1.5rem; margin-bottom: 1.5rem;">
          <div style="display: flex; align-items: center; gap: 0.5rem; color: var(--accent-red); font-weight: 700; font-size: 1.15rem; margin-bottom: 0.5rem;">
            <span>⚠️</span> <span>PERINGATAN BIAYA AZURE: Hapus Resource Group Segera</span>
          </div>
          <p style="font-size: 0.95rem; color: var(--text-main); margin-bottom: 0.75rem; line-height: 1.5;">
            Resource Group <code>${escapeHtml(nextAction.rg)}</code> dari aktivitas <strong>${escapeHtml(nextAction.labName)}</strong> masih aktif sejak <strong>${nextAction.ageDays} hari lalu</strong>. Azure mengenakan biaya per jam selama RG belum dihapus!
          </p>
          <div style="background: var(--bg-main); border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 0.6rem 0.85rem; font-family: var(--font-mono); font-size: 0.85rem; margin-bottom: 1rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem;">
            <code>${escapeHtml(nextAction.perintah)}</code>
            <button class="btn btn-secondary btn-sm" onclick="TodayPage.copyCommand('${escapeHtml(nextAction.perintah)}', this)">
              📋 Salin CLI
            </button>
          </div>
          <div>
            <button class="btn btn-primary" style="background: var(--accent-red); border-color: var(--accent-red); padding: 0.65rem 1.25rem; font-size: 0.95rem; font-weight: 700;" onclick="TodayPage.markRgCleaned(${nextAction.labIndex})">
              ✓ Tandai RG Sudah Dihapus
            </button>
          </div>
        </div>
      `;
    } else if (nextAction.jenis === 'setup') {
      actionBannerHtml = `
        <div class="hero-action-card" style="background: var(--bg-card); border: 2px solid var(--azure-blue); border-radius: var(--radius-lg); padding: 1.5rem; margin-bottom: 1.5rem;">
          <div style="display: flex; align-items: center; gap: 0.5rem; color: var(--azure-blue); font-weight: 700; font-size: 1.15rem; margin-bottom: 0.4rem;">
            <span>🛠️</span> <span>Tindakan Berikutnya: Setup & Administrasi</span>
          </div>
          <p style="font-size: 1.05rem; font-weight: 600; color: var(--text-main); margin-bottom: 0.5rem;">
            ${escapeHtml(nextAction.item.title)}
          </p>
          <p style="font-size: 0.875rem; color: var(--text-muted); margin-bottom: 1rem;">
            Selesaikan langkah administratif ini untuk memastikan kelancaran belajar dan ujian Anda.
          </p>
          <div style="display: flex; gap: 0.75rem; align-items: center; flex-wrap: wrap;">
            ${nextAction.item.url ? `
              <a href="${nextAction.item.url}" target="_blank" rel="noopener noreferrer" class="btn btn-primary" style="padding: 0.6rem 1.25rem; font-weight: 600;" onclick="TodayPage.handleSetupAndDone('${nextAction.item.id}')">
                Buka & Selesaikan Langkah Ini ↗
              </a>
            ` : ''}
            <button class="btn ${nextAction.item.url ? 'btn-secondary' : 'btn-primary'}" style="padding: 0.6rem 1.25rem; font-weight: 600;" onclick="TodayPage.toggleSetup('${nextAction.item.id}')">
              ✓ Tandai Selesai
            </button>
          </div>
        </div>
      `;
    } else if (nextAction.jenis === 'isi_tanggal') {
      actionBannerHtml = `
        <div class="hero-action-card" style="background: var(--bg-card); border: 2px solid var(--azure-blue); border-radius: var(--radius-lg); padding: 1.5rem; margin-bottom: 1.5rem;">
          <div style="display: flex; align-items: center; gap: 0.5rem; color: var(--azure-blue); font-weight: 700; font-size: 1.15rem; margin-bottom: 0.4rem;">
            <span>📅</span> <span>Tindakan Berikutnya: Tentukan Tanggal Ujian</span>
          </div>
          <p style="font-size: 0.95rem; color: var(--text-muted); margin-bottom: 1rem;">
            Target tanggal ujian dibutuhkan sistem untuk mengaktifkan indikator laju belajar dan hitung mundur persiapan.
          </p>
          <a href="#settings" class="btn btn-primary" style="padding: 0.6rem 1.25rem; font-weight: 600;">
            Atur Tanggal Ujian di Pengaturan &rarr;
          </a>
        </div>
      `;
    } else if (nextAction.jenis === 'drill') {
      actionBannerHtml = `
        <div class="hero-action-card" style="background: var(--bg-card); border: 2px solid var(--azure-blue); border-radius: var(--radius-lg); padding: 1.5rem; margin-bottom: 1.5rem;">
          <div style="display: flex; align-items: center; gap: 0.5rem; color: var(--azure-blue); font-weight: 700; font-size: 1.15rem; margin-bottom: 0.4rem;">
            <span>⚡</span> <span>Tindakan Berikutnya: Latihan Spaced Repetition</span>
          </div>
          <p style="font-size: 1.05rem; font-weight: 600; color: var(--text-main); margin-bottom: 0.5rem;">
            Ada ${nextAction.jumlah} kartu aktif yang jatuh tempo hari ini
          </p>
          <p style="font-size: 0.875rem; color: var(--text-muted); margin-bottom: 1rem;">
            Jaga ingatan jangka panjangmu sebelum materi terlupakan.
          </p>
          <a href="#practice?tab=drill" class="btn btn-primary" style="padding: 0.6rem 1.25rem; font-weight: 600;">
            Mulai Sesi Drill Sekarang (${nextAction.jumlah} Kartu) &rarr;
          </a>
        </div>
      `;
    } else if (nextAction.jenis === 'objective') {
      const o = nextAction.objective;
      const oNorm = o.id.replace('obj-', 'o');
      let langkahDesc = '';
      if (nextAction.langkah === 'baca') {
        langkahDesc = 'Langkah 1: Baca materi resmi terverifikasi Microsoft Learn.';
      } else if (nextAction.langkah === 'praktik') {
        langkahDesc = 'Langkah 2: Kerjakan hands-on lab mandiri di terminal / Azure.';
      } else {
        langkahDesc = 'Langkah 3: Kuasai objective dan buktikan pemahaman dengan kata-katamu sendiri.';
      }

      actionBannerHtml = `
        <div class="hero-action-card" style="background: var(--bg-card); border: 2px solid var(--azure-blue); border-radius: var(--radius-lg); padding: 1.5rem; margin-bottom: 1.5rem;">
          <div style="display: flex; align-items: center; gap: 0.5rem; color: var(--azure-blue); font-weight: 700; font-size: 1.15rem; margin-bottom: 0.4rem;">
            <span>🎯</span> <span>Tindakan Berikutnya: Pelajari Objective ${oNorm}</span>
          </div>
          <div style="font-size: 1.05rem; font-weight: 700; color: var(--text-main); margin-bottom: 0.35rem;">
            ${escapeHtml(o.text)}
          </div>
          <p style="font-size: 0.875rem; color: var(--text-muted); margin-bottom: 1rem;">
            ${langkahDesc}
          </p>
          <a href="#learn?obj=${o.id}" class="btn btn-primary" style="padding: 0.6rem 1.25rem; font-weight: 600;">
            Lanjutkan Belajar ${oNorm} (${nextAction.langkah.toUpperCase()}) &rarr;
          </a>
        </div>
      `;
    } else if (nextAction.jenis === 'selesai') {
      actionBannerHtml = `
        <div class="hero-action-card" style="background: var(--accent-green-bg); border: 2px solid var(--accent-green-border); border-radius: var(--radius-lg); padding: 1.5rem; margin-bottom: 1.5rem;">
          <div style="display: flex; align-items: center; gap: 0.5rem; color: var(--accent-green); font-weight: 700; font-size: 1.15rem; margin-bottom: 0.4rem;">
            <span>🎉</span> <span>Seluruh 27 Objective Telah Dikuasai!</span>
          </div>
          <p style="font-size: 0.95rem; color: var(--text-main); margin-bottom: 1rem;">
            Persiapan materi AI-200 telah tuntas. Uji kesiapan akhir dengan simulasi ujian penuh.
          </p>
          <a href="#practice?tab=exams" class="btn btn-primary" style="padding: 0.6rem 1.25rem; font-weight: 600;">
            Mulai Simulasi Ujian &rarr;
          </a>
        </div>
      `;
    }

    // 1. Calculate Countdown
    let countdownText = 'Belum diatur';
    let countdownSub = 'Atur tanggal ujian di Pengaturan';
    if (config.examDate) {
      const examDate = new Date(config.examDate);
      examDate.setHours(0, 0, 0, 0);
      const diffTime = examDate - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      countdownText = diffDays >= 0 ? `${diffDays} Hari Lagi` : `Lewat ${Math.abs(diffDays)} Hari`;
      countdownSub = `Target: ${config.examDate}`;
    }

    // 2. Active Week Progress
    let currentWeekNum = 1;
    if (plan.weeks && plan.weeks.length > 0) {
      for (const w of plan.weeks) {
        if (w.tasks && w.tasks.some(t => !t.done)) {
          currentWeekNum = w.n;
          break;
        }
      }
    }
    const currentWeek = plan.weeks ? plan.weeks.find(w => w.n === currentWeekNum) : null;
    const currentWeekTotal = currentWeek ? currentWeek.tasks.length : 0;
    const currentWeekDone = currentWeek ? currentWeek.tasks.filter(t => t.done).length : 0;
    const currentWeekPercent = currentWeekTotal > 0 ? Math.round((currentWeekDone / currentWeekTotal) * 100) : 0;

    // 3. Pacing Line (B1 & S3)
    const pacing = Store.getPacingMetrics();
    let pacingRowHtml = '';
    if (pacing) {
      pacingRowHtml = `
        <div class="pacing-line-banner" style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 0.85rem 1.25rem; margin-bottom: 1.5rem; font-size: 0.9rem; color: var(--text-main); display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.5rem;">
          <div>
            <span>${pacing.selesai}/${pacing.total} objective · butuh ${pacing.lajuDibutuhkan.toFixed(1).replace('.', ',')}/minggu · laju kamu ${pacing.lajuAktual.toFixed(1).replace('.', ',')}/minggu · </span>
            <strong style="color: ${pacing.selisih <= 0 ? 'var(--accent-green)' : (pacing.selisih <= 3 ? 'var(--accent-yellow)' : 'var(--accent-red)')};">${escapeHtml(pacing.statusText)}</strong>
          </div>
          <a href="#stats" style="font-size: 0.8rem; color: var(--azure-blue); text-decoration: underline;">
            Lihat Detail Statistik &rarr;
          </a>
        </div>
      `;
    }

    // 4. Setup Checklist Widget (A9)
    const setupItems = Store.getSetup();
    const allSetupDone = setupItems.length > 0 && setupItems.every(s => s.done);
    const setupDoneCount = setupItems.filter(s => s.done).length;

    let setupWidgetHtml = '';
    if (setupItems.length > 0) {
      if (allSetupDone && !isSetupOpen) {
        setupWidgetHtml = `
          <div style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 0.75rem 1.25rem; margin-top: 1.5rem; display: flex; justify-content: space-between; align-items: center;">
            <div style="font-size: 0.875rem; color: var(--accent-green); font-weight: 600;">
              ✓ Setup & Administrasi Selesai (${setupDoneCount}/${setupItems.length})
            </div>
            <button class="btn btn-ghost btn-sm" onclick="TodayPage.toggleSetupOpen()">
              Buka Checklist &rarr;
            </button>
          </div>
        `;
      } else {
        setupWidgetHtml = `
          <div style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 1.25rem; margin-top: 1.5rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
              <h3 style="font-size: 1rem; font-weight: 700; margin: 0; color: var(--text-main);">
                🛠️ Setup & Administrasi (${setupDoneCount}/${setupItems.length} Selesai)
              </h3>
              ${allSetupDone ? `
                <button class="btn btn-ghost btn-sm" onclick="TodayPage.toggleSetupOpen()">
                  Ciutkan
                </button>
              ` : ''}
            </div>
            <div style="display: flex; flex-direction: column; gap: 0.6rem;">
              ${setupItems.map(s => `
                <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.45rem 0.6rem; border-radius: var(--radius-sm); background: var(--bg-main); border: 1px solid var(--border-subtle);">
                  <label style="display: flex; align-items: center; gap: 0.6rem; font-size: 0.875rem; cursor: pointer; color: ${s.done ? 'var(--text-dim)' : 'var(--text-main)'}; text-decoration: ${s.done ? 'line-through' : 'none'}; flex: 1;">
                    <input type="checkbox" class="task-checkbox" ${s.done ? 'checked' : ''} onchange="TodayPage.toggleSetup('${s.id}')">
                    <span>${escapeHtml(s.title)}</span>
                  </label>
                  ${s.url ? `
                    <a href="${s.url}" target="_blank" rel="noopener noreferrer" style="font-size: 0.75rem; color: var(--azure-blue); text-decoration: underline; margin-left: 0.5rem;">
                      Buka tautan ↗
                    </a>
                  ` : ''}
                </div>
              `).join('')}
            </div>
          </div>
        `;
      }
    }

    container.innerHTML = `
      <div class="today-page-container" style="max-width: 960px; margin: 0 auto; padding: 0.5rem 0 2rem 0;">
        <!-- Single Prominent Next Action (A8 & S2) -->
        ${actionBannerHtml}

        <!-- Pacing Line (B1 & S3) -->
        ${pacingRowHtml}

        <!-- Ringkasan Singkat Beneath (A8): Hitung Mundur, Minggu Berjalan, Kartu Aktif Jatuh Tempo -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem;">
          <!-- 1. Hitung Mundur -->
          <div class="card" style="padding: 1.25rem; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-md);">
            <div style="font-size: 0.8rem; font-weight: 600; color: var(--text-muted); margin-bottom: 0.35rem; text-transform: uppercase;">
              Target Ujian
            </div>
            <div style="font-size: 1.5rem; font-weight: 700; color: var(--text-main); margin-bottom: 0.25rem;">
              ${countdownText}
            </div>
            <div style="font-size: 0.8rem; color: var(--text-dim);">
              ${countdownSub}
            </div>
          </div>

          <!-- 2. Progress Minggu Berjalan -->
          <div class="card" style="padding: 1.25rem; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-md);">
            <div style="font-size: 0.8rem; font-weight: 600; color: var(--text-muted); margin-bottom: 0.35rem; text-transform: uppercase;">
              Minggu Berjalan (M${currentWeekNum})
            </div>
            <div style="font-size: 1.5rem; font-weight: 700; color: var(--text-main); margin-bottom: 0.25rem;">
              ${currentWeekDone}/${currentWeekTotal} Task
            </div>
            <div style="font-size: 0.8rem; color: var(--text-dim);">
              ${currentWeekPercent}% kurikulum selesai
            </div>
          </div>

          <!-- 3. Kartu Aktif Jatuh Tempo -->
          <div class="card" style="padding: 1.25rem; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-md);">
            <div style="font-size: 0.8rem; font-weight: 600; color: var(--text-muted); margin-bottom: 0.35rem; text-transform: uppercase;">
              Kartu Aktif Jatuh Tempo
            </div>
            <div style="font-size: 1.5rem; font-weight: 700; color: ${dueCards.length > 0 ? 'var(--accent-green)' : 'var(--text-main)'}; margin-bottom: 0.25rem;">
              ${dueCards.length} Kartu
            </div>
            <div style="font-size: 0.8rem; color: var(--text-dim);">
              ${dueCards.length > 0 ? 'Siap di-drill hari ini' : 'Semua kartu aktif sudah tuntas'}
            </div>
          </div>
        </div>

        <!-- Setup Checklist Widget (A9) -->
        ${setupWidgetHtml}
      </div>
    `;
  }

  function toggleSetup(id) {
    Store.toggleSetupItem(id);
    const container = document.getElementById('main-content');
    if (container) render(container);
  }

  function handleSetupAndDone(id) {
    Store.toggleSetupItem(id);
    const container = document.getElementById('main-content');
    if (container) render(container);
  }

  function toggleSetupOpen() {
    isSetupOpen = !isSetupOpen;
    const container = document.getElementById('main-content');
    if (container) render(container);
  }

  function markRgCleaned(labIndex) {
    Store.markLabRgDeleted(labIndex);
    if (typeof App !== 'undefined' && App.toast) {
      App.toast('✓ Resource Group berhasil ditandai sudah dihapus!', 'success');
    }
    const container = document.getElementById('main-content');
    if (container) render(container);
  }

  function copyCommand(cmd, btn) {
    navigator.clipboard.writeText(cmd).then(() => {
      if (btn) {
        const orig = btn.textContent;
        btn.textContent = '✓ Tersalin!';
        setTimeout(() => { btn.textContent = orig; }, 1500);
      }
    });
  }

  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  return {
    render,
    toggleSetup,
    handleSetupAndDone,
    toggleSetupOpen,
    markRgCleaned,
    copyCommand
  };
})();

window.TodayPage = TodayPage;
