/**
 * pages/today.js — Halaman "Hari ini" (Dashboard Ringkasan Belajar & Peringatan Azure RG)
 */

const TodayPage = (() => {
  function render(container) {
    const config = Store.getConfig();
    const plan = Store.getPlan();
    const resources = Store.getResources();
    const cards = Store.getCards();
    const progress = Store.getProgress();
    const labs = Store.getLabs();
    const examHistory = Store.getExamHistory();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 1. Calculate Countdown
    let countdownHtml = '';
    if (!config.examDate) {
      countdownHtml = `
        <div class="card-title">Target Tanggal Ujian</div>
        <div style="font-size: 1.15rem; font-weight: 700; color: var(--accent-yellow); margin-top: 0.4rem;">
          Belum diatur
        </div>
        <div class="card-subtitle">
          <a href="#settings" style="color: var(--azure-blue); text-decoration: underline;">Atur tanggal ujian di Pengaturan &rarr;</a>
        </div>
      `;
    } else {
      const examDate = new Date(config.examDate);
      examDate.setHours(0, 0, 0, 0);
      const diffTime = examDate - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      let dayDisplay = diffDays >= 0 ? `${diffDays} Hari Lagi` : `Sudah Lewat ${Math.abs(diffDays)} Hari`;
      let motivator = diffDays > 30 ? 'Waktu persiapan ideal. Konsisten 1-2 jam per hari.' : (diffDays > 7 ? 'Mulai perbanyak drill dan tabel keputusan!' : 'Fokus simulasi ujian & latihan constraint.');
      countdownHtml = `
        <div class="card-title-row">
          <span class="card-title">Target Ujian AI-200</span>
          <span class="badge badge-lab">${config.examDate}</span>
        </div>
        <div class="card-value">${dayDisplay}</div>
        <div class="card-subtitle">${motivator} • Passing score: ${config.passingScore || 700}/1000</div>
      `;
    }

    // 2. Active Week & Tasks
    let currentWeekNum = 1;
    if (plan.weeks && plan.weeks.length > 0) {
      for (const w of plan.weeks) {
        const hasUndone = w.tasks.some(t => !t.done);
        if (hasUndone) {
          currentWeekNum = w.n;
          break;
        }
      }
    }
    const currentWeek = plan.weeks ? plan.weeks.find(w => w.n === currentWeekNum) : null;
    const currentWeekTotal = currentWeek ? currentWeek.tasks.length : 0;
    const currentWeekDone = currentWeek ? currentWeek.tasks.filter(t => t.done).length : 0;
    const currentWeekPercent = currentWeekTotal > 0 ? Math.round((currentWeekDone / currentWeekTotal) * 100) : 0;
    const currentWeekTasks = currentWeek ? currentWeek.tasks.filter(t => !t.done) : [];

    // 3. Due Cards Count
    const dueCards = SRS.getDueCards(cards, progress);

    // 4. Resources in Progress
    const inProgressResources = resources.filter(r => r.status === 'sedang');

    // 5. Latest Exam Score
    const latestExam = examHistory.length > 0 ? examHistory[examHistory.length - 1] : null;

    // 6. Azure Resource Group Alert (> 1 day old and not deleted)
    const activeRgs = [];
    labs.forEach((lab, idx) => {
      if (lab.resource_group && lab.deleted === false) {
        const labDate = new Date(lab.date);
        labDate.setHours(0, 0, 0, 0);
        const ageDays = Math.floor((today - labDate) / (1000 * 60 * 60 * 24));
        if (ageDays >= 1) {
          activeRgs.push({ ...lab, labIndex: idx, ageDays });
        }
      }
    });

    let rgAlertHtml = '';
    if (activeRgs.length > 0) {
      rgAlertHtml = activeRgs.map(rg => {
        const cmd = `az group delete --name ${rg.resource_group} --yes --no-wait`;
        return `
          <div class="rg-alert-banner">
            <div class="rg-alert-header">
              <div class="rg-alert-title">
                ⚠️ PERINGATAN BIAYA AZURE: Resource Group Aktif (${rg.ageDays} hari lalu)
              </div>
              <button class="btn-mark-deleted" onclick="TodayPage.markRgCleaned(${rg.labIndex})">
                ✓ Tandai Sudah Dihapus
              </button>
            </div>
            <div style="font-size: 0.875rem; color: #991b1b;">
              Lab <strong>${escapeHtml(rg.lab)}</strong> menyisakan Resource Group <code>${escapeHtml(rg.resource_group)}</code> yang belum dihapus. Azure terus menagih per jam!
            </div>
            <div class="rg-alert-cmd-box">
              <span>${cmd}</span>
              <button class="btn-copy-cmd" onclick="TodayPage.copyCommand('${cmd}', this)">
                Salin Perintah CLI
              </button>
            </div>
          </div>
        `;
      }).join('');
    }

    container.innerHTML = `
      <div class="page-container">
        
        <!-- Azure RG Cost Alert Banner if any -->
        ${rgAlertHtml}

        <!-- Quick Action Bar -->
        <div style="display: flex; gap: 0.75rem; margin-bottom: 1.5rem; flex-wrap: wrap;">
          <a href="#drill" class="btn btn-primary btn-sm">
            ⚡ Mulai Drill Hari Ini (${dueCards.length} Jatuh Tempo)
          </a>
          <a href="#plan" class="btn btn-secondary btn-sm">
            📋 Lihat Kurikulum Minggu ${currentWeekNum}
          </a>
          <button class="btn btn-secondary btn-sm" onclick="App.openQuickLabModal()">
            🧪 Catat Sesi Lab (Alt+L)
          </button>
        </div>

        <!-- Dashboard Stat Cards -->
        <div class="dashboard-grid">
          
          <!-- Exam Countdown Card -->
          <div class="card card-countdown">
            ${countdownHtml}
          </div>

          <!-- Flashcard SRS Due Card -->
          <div class="card">
            <div class="card-title-row">
              <span class="card-title">Drill Kartu Hari Ini</span>
              <span class="badge ${dueCards.length > 0 ? 'badge-article' : 'badge-lab'}">
                ${dueCards.length > 0 ? 'Siap Di-review' : 'Tuntas'}
              </span>
            </div>
            <div class="card-value" style="color: ${dueCards.length > 0 ? 'var(--accent-green)' : 'var(--text-main)'};">
              ${dueCards.length} <span style="font-size: 1rem; font-weight: 600; color: var(--text-dim);">Kartu</span>
            </div>
            <div class="card-subtitle">
              ${dueCards.length > 0 ? 'Interval Leitner jatuh tempo hari ini.' : 'Semua kartu sudah dipelajari sesuai jadwal.'}
            </div>
            <div style="margin-top: 0.75rem;">
              <a href="#drill" class="btn btn-primary btn-sm btn-block">
                ${dueCards.length > 0 ? 'Mulai Sesi Drill Sekarang &rarr;' : 'Latihan Bebas (Semua Kartu) &rarr;'}
              </a>
            </div>
          </div>

          <!-- Active Week Progress -->
          <div class="card">
            <div class="card-title-row">
              <span class="card-title">Progres Minggu Ini</span>
              <span class="badge badge-lab">Minggu ${currentWeekNum}</span>
            </div>
            <div class="card-value" style="color: var(--azure-blue);">
              ${currentWeekDone} / ${currentWeekTotal} <span style="font-size: 1rem; font-weight: 600; color: var(--text-dim);">Task (${currentWeekPercent}%)</span>
            </div>
            <div class="progress-bar-container" style="margin-top: 0.5rem;">
              <div class="progress-bar-fill" style="width: ${currentWeekPercent}%;"></div>
            </div>
            <div class="card-subtitle" style="margin-top: 0.4rem;">
              ${currentWeek ? escapeHtml(currentWeek.title) : 'Kurikulum 6 Minggu'}
            </div>
          </div>

        </div>

        <!-- Main Content Split: Tasks of the Week & In-Progress Resources -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 1.5rem; margin-top: 1.5rem;">
          
          <!-- Current Week Tasks Checklist -->
          <div class="card">
            <div class="card-title-row">
              <h2 style="font-size: 1.1rem; font-weight: 700; color: var(--text-main);">
                Checklist Minggu ${currentWeekNum}: ${currentWeek ? escapeHtml(currentWeek.title) : ''}
              </h2>
              <a href="#plan" style="font-size: 0.8rem; color: var(--azure-blue); text-decoration: none;">Semua Minggu &rarr;</a>
            </div>

            ${currentWeekTasks.length > 0 ? `
              <div class="task-list">
                ${currentWeekTasks.slice(0, 6).map(t => `
                  <div class="task-item">
                    <input 
                      type="checkbox" 
                      class="task-checkbox" 
                      id="today_task_${t.id}" 
                      ${t.done ? 'checked' : ''} 
                      onchange="TodayPage.toggleTask('${t.id}', this.checked)"
                    >
                    <div class="task-content">
                      <label for="today_task_${t.id}" class="task-text">${escapeHtml(t.text)}</label>
                      ${t.url ? `
                        <div>
                          <a href="${t.url}" target="_blank" rel="noopener noreferrer" class="task-link">
                            🔗 Instruksi Lab Resmi &rarr;
                          </a>
                        </div>
                      ` : ''}
                    </div>
                  </div>
                `).join('')}
              </div>
            ` : `
              <div style="padding: 2rem 1rem; text-align: center; color: var(--text-dim); font-size: 0.9rem;">
                🎉 Semua task Minggu ${currentWeekNum} sudah selesai! Silakan lanjut ke minggu berikutnya di menu Rencana.
              </div>
            `}
          </div>

          <!-- Side Section: Resources in Progress & Recent Exams -->
          <div style="display: flex; flex-direction: column; gap: 1.5rem;">
            
            <!-- In Progress Resources -->
            <div class="card">
              <div class="card-title-row">
                <h3 style="font-size: 1rem; font-weight: 700; color: var(--text-main);">Materi Sedang Berjalan</h3>
                <a href="#resources" style="font-size: 0.8rem; color: var(--azure-blue); text-decoration: none;">Perpustakaan &rarr;</a>
              </div>

              ${inProgressResources.length > 0 ? `
                <div style="display: flex; flex-direction: column; gap: 0.6rem; margin-top: 0.5rem;">
                  ${inProgressResources.map(r => `
                    <div style="background-color: #f8fafc; border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 0.75rem;">
                      <div style="display: flex; gap: 0.4rem; margin-bottom: 0.25rem;">
                        <span class="badge badge-${r.type}">${r.type.toUpperCase()}</span>
                        <span class="badge badge-${r.domain}">${r.domain}</span>
                      </div>
                      <div style="font-weight: 600; font-size: 0.875rem; color: var(--text-main);">
                        ${escapeHtml(r.title)}
                      </div>
                      ${r.url ? `
                        <div style="margin-top: 0.35rem;">
                          <a href="${r.url}" target="_blank" class="task-link" style="font-size: 0.75rem;">
                            Buka Materi &rarr;
                          </a>
                        </div>
                      ` : ''}
                    </div>
                  `).join('')}
                </div>
              ` : `
                <div style="padding: 1.5rem 1rem; text-align: center; color: var(--text-dim); font-size: 0.85rem;">
                  Tidak ada materi dengan status "Sedang". Buka menu <strong>Sumber</strong> untuk memilih materi berikutnya.
                </div>
              `}
            </div>

            <!-- Latest Exam Simulator Result -->
            <div class="card">
              <div class="card-title-row">
                <h3 style="font-size: 1rem; font-weight: 700; color: var(--text-main);">Hasil Ujian Terakhir</h3>
                <a href="#exams" style="font-size: 0.8rem; color: var(--azure-blue); text-decoration: none;">Mulai Simulasi &rarr;</a>
              </div>

              ${latestExam ? `
                <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 0.5rem; background-color: #f8fafc; padding: 0.75rem 1rem; border-radius: var(--radius-md); border: 1px solid var(--border-color);">
                  <div>
                    <div style="font-weight: 600; font-size: 0.9rem; color: var(--text-main);">${escapeHtml(latestExam.set)}</div>
                    <div class="card-subtitle">${latestExam.date} • ${latestExam.minutes} menit</div>
                  </div>
                  <div style="text-align: right;">
                    <div style="font-size: 1.25rem; font-weight: 800; color: ${latestExam.score >= (config.passingScore || 700) ? 'var(--accent-green)' : 'var(--accent-red)'};">
                      ${latestExam.score}/1000
                    </div>
                    <span class="badge ${latestExam.score >= (config.passingScore || 700) ? 'badge-article' : 'badge-ops'}">
                      ${latestExam.score >= (config.passingScore || 700) ? 'LULUS' : 'PERLU REVIEW'}
                    </span>
                  </div>
                </div>
              ` : `
                <div style="padding: 1.5rem 1rem; text-align: center; color: var(--text-dim); font-size: 0.85rem;">
                  Belum pernah melakukan simulasi ujian. Uji kemampuan Anda di menu <strong>Ujian</strong>.
                </div>
              `}
            </div>

          </div>

        </div>

      </div>
    `;
  }

  function toggleTask(taskId, isDone) {
    Store.toggleTask(taskId, isDone);
    App.toast(isDone ? '✓ Task ditandai selesai' : 'Task dibuka kembali', 'info', 1500);
    const container = document.getElementById('main-content');
    if (container) render(container);
  }

  function copyCommand(cmd, btn) {
    navigator.clipboard.writeText(cmd).then(() => {
      const orig = btn.textContent;
      btn.textContent = 'Tersalin!';
      setTimeout(() => btn.textContent = orig, 2000);
      App.toast('✓ Perintah az CLI berhasil disalin ke clipboard', 'success', 2000);
    });
  }

  function markRgCleaned(labIndex) {
    Store.updateLab(labIndex, { deleted: true });
    App.toast('✓ Resource Group ditandai sudah dihapus', 'success', 2000);
    const container = document.getElementById('main-content');
    if (container) render(container);
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
    render,
    toggleTask,
    copyCommand,
    markRgCleaned
  };
})();

window.TodayPage = TodayPage;
