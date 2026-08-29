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
        <div class="card-title">Target Ujian</div>
        <div style="font-size: 1rem; color: var(--accent-yellow); margin-top: 0.5rem;">
          Belum diatur
        </div>
        <div class="card-subtitle">
          <a href="#settings" style="color: var(--azure-light); text-decoration: underline;">Atur tanggal ujian di Pengaturan &rarr;</a>
        </div>
      `;
    } else {
      const examDate = new Date(config.examDate);
      examDate.setHours(0, 0, 0, 0);
      const diffTime = examDate - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      let dayDisplay = diffDays >= 0 ? `${diffDays} Hari Lagi` : `Sudah Lewat ${Math.abs(diffDays)} Hari`;
      countdownHtml = `
        <div class="card-title">Target Ujian (${config.examDate})</div>
        <div class="card-value">${dayDisplay}</div>
        <div class="card-subtitle">Passing Score: ${config.passingScore || 700}/1000</div>
      `;
    }

    // 2. Active Week & Tasks
    // Default to week 1 if no date match, or determine current week by date
    let currentWeekNum = 1;
    if (plan.weeks && plan.weeks.length > 0) {
      currentWeekNum = 1; // Default
      // Check if user has ongoing tasks
      for (const w of plan.weeks) {
        const hasUndone = w.tasks.some(t => !t.done);
        if (hasUndone) {
          currentWeekNum = w.n;
          break;
        }
      }
    }
    const currentWeek = plan.weeks ? plan.weeks.find(w => w.n === currentWeekNum) : null;
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
            <div style="font-size: 0.875rem; color: #fecaca;">
              Lab <strong>${escapeHtml(rg.lab)}</strong> menyisakan Resource Group <code>${escapeHtml(rg.resource_group)}</code> yang belum dihapus. Azure terus menagih per jam!
            </div>
            <div class="rg-alert-cmd-box">
              <span>${cmd}</span>
              <button class="btn-copy-cmd" onclick="TodayPage.copyCommand('${cmd}', this)">
                Salin Perintah
              </button>
            </div>
          </div>
        `;
      }).join('');
    }

    container.innerHTML = `
      <div class="page-container">
        <!-- Resource Group Alert -->
        ${rgAlertHtml}

        <!-- Top Stats Grid -->
        <div class="dashboard-grid">
          <div class="card card-countdown">
            ${countdownHtml}
          </div>

          <div class="card">
            <div class="card-title-row">
              <span class="card-title">Drill Kartu Hari Ini</span>
              <span class="badge badge-lab">${dueCards.length} Kartu</span>
            </div>
            <div class="card-value">${dueCards.length}</div>
            <div class="card-subtitle" style="margin-bottom: 0.75rem;">
              ${dueCards.length > 0 ? 'Kartu jatuh tempo untuk review Leitner' : 'Semua kartu sudah dipelajari hari ini!'}
            </div>
            ${dueCards.length > 0 ? `
              <a href="#drill" class="btn btn-primary btn-sm btn-block">
                ⚡ Mulai Drill Sekarang
              </a>
            ` : `
              <a href="#drill?all=1" class="btn btn-secondary btn-sm btn-block">
                Tinjau Semua Kartu
              </a>
            `}
          </div>

          <div class="card">
            <div class="card-title-row">
              <span class="card-title">Ujian Latihan Terakhir</span>
              ${latestExam ? `<span class="badge ${latestExam.score >= (config.passingScore || 700) ? 'badge-article' : 'badge-ops'}">${latestExam.score}/1000</span>` : ''}
            </div>
            <div class="card-value">
              ${latestExam ? `${latestExam.score}` : '<span style="font-size: 1.25rem; color: var(--text-dim);">Belum ada</span>'}
            </div>
            <div class="card-subtitle" style="margin-bottom: 0.75rem;">
              ${latestExam ? `${latestExam.set} • ${latestExam.date}` : 'Uji kesiapan dengan simulasi ujian'}
            </div>
            <a href="#exams" class="btn btn-secondary btn-sm btn-block">
              ${latestExam ? 'Mulai Ujian Baru' : 'Coba Ujian Contoh'}
            </a>
          </div>
        </div>

        <!-- Two Column Main Layout -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 1.5rem;">
          
          <!-- Current Week Incomplete Tasks -->
          <div class="card">
            <div class="card-title-row">
              <div>
                <h2 style="font-size: 1.1rem; font-weight: 700;">Minggu ${currentWeek ? currentWeek.n : 1}: ${currentWeek ? escapeHtml(currentWeek.title) : ''}</h2>
                <div class="card-subtitle">${currentWeek ? currentWeek.dates : ''} • ${currentWeekTasks.length} task tersisa</div>
              </div>
              <a href="#plan" style="font-size: 0.8rem; color: var(--azure-light); text-decoration: none;">Lihat Rencana &rarr;</a>
            </div>

            <div class="task-list">
              ${currentWeekTasks.length > 0 ? currentWeekTasks.map(t => `
                <div class="task-item">
                  <input type="checkbox" class="task-checkbox" id="task_${t.id}" onchange="TodayPage.toggleTask('${t.id}', this.checked)">
                  <div class="task-content">
                    <label for="task_${t.id}" class="task-text">${escapeHtml(t.text)}</label>
                    ${t.url ? `
                      <div>
                        <a href="${t.url}" target="_blank" rel="noopener noreferrer" class="task-link">
                          🔗 Buka Materi / Lab &rarr;
                        </a>
                      </div>
                    ` : ''}
                  </div>
                </div>
              `).join('') : `
                <div style="padding: 1.5rem; text-align: center; color: var(--text-dim); font-size: 0.875rem;">
                  🎉 Hebat! Semua task minggu ini telah selesai.
                </div>
              `}
            </div>
          </div>

          <!-- Resources In Progress -->
          <div class="card">
            <div class="card-title-row">
              <h2 style="font-size: 1.1rem; font-weight: 700;">Sumber Sedang Dipelajari</h2>
              <a href="#resources" style="font-size: 0.8rem; color: var(--azure-light); text-decoration: none;">Semua Sumber &rarr;</a>
            </div>

            <div class="task-list">
              ${inProgressResources.length > 0 ? inProgressResources.map(r => `
                <div class="task-item">
                  <div class="task-content">
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.25rem;">
                      <span class="badge badge-${r.type}">${r.type.toUpperCase()}</span>
                      <span class="badge badge-${r.domain}">${r.domain}</span>
                    </div>
                    <div class="task-text" style="font-weight: 600;">${escapeHtml(r.title)}</div>
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 0.4rem;">
                      ${r.url ? `
                        <a href="${r.url}" target="_blank" rel="noopener noreferrer" class="task-link">
                          Buka Link (${r.minutes}m) &rarr;
                        </a>
                      ` : `<span>${r.minutes}m</span>`}
                      <select class="status-select" onchange="TodayPage.updateResourceStatus('${r.id}', this.value)">
                        <option value="belum">Belum</option>
                        <option value="sedang" selected>Sedang</option>
                        <option value="selesai">Selesai</option>
                      </select>
                    </div>
                  </div>
                </div>
              `).join('') : `
                <div style="padding: 1.5rem; text-align: center; color: var(--text-dim); font-size: 0.875rem;">
                  Tidak ada sumber dengan status "Sedang".
                  <br>
                  <a href="#resources" style="color: var(--azure-light); display: inline-block; margin-top: 0.5rem;">Pilih dari daftar sumber &rarr;</a>
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
    const container = document.getElementById('main-content');
    if (container) render(container);
  }

  function updateResourceStatus(resId, status) {
    Store.updateResource(resId, { status });
    const container = document.getElementById('main-content');
    if (container) render(container);
  }

  function markRgCleaned(labIndex) {
    if (confirm('Tandai Resource Group ini sudah dihapus di portal/CLI Azure?')) {
      Store.markLabRgDeleted(labIndex);
      const container = document.getElementById('main-content');
      if (container) render(container);
    }
  }

  function copyCommand(text, btnElem) {
    navigator.clipboard.writeText(text).then(() => {
      const orig = btnElem.textContent;
      btnElem.textContent = 'Tersalin!';
      setTimeout(() => { btnElem.textContent = orig; }, 2000);
    });
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
    updateResourceStatus,
    markRgCleaned,
    copyCommand
  };
})();

window.TodayPage = TodayPage;
