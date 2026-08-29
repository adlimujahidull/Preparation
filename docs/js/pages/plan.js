/**
 * pages/plan.js — Halaman "Rencana" (Checklist Kurikulum 6 Minggu & Progress Bar)
 */

const PlanPage = (() => {
  function render(container) {
    const plan = Store.getPlan();
    const weeks = plan.weeks || [];

    // Calculate total plan statistics
    let totalTasks = 0;
    let totalDone = 0;
    weeks.forEach(w => {
      w.tasks.forEach(t => {
        totalTasks++;
        if (t.done) totalDone++;
      });
    });
    const overallPercent = totalTasks > 0 ? Math.round((totalDone / totalTasks) * 100) : 0;

    const weeksHtml = weeks.map(w => {
      const weekTotal = w.tasks.length;
      const weekDone = w.tasks.filter(t => t.done).length;
      const weekPercent = weekTotal > 0 ? Math.round((weekDone / weekTotal) * 100) : 0;

      return `
        <div class="card" style="margin-bottom: 1.5rem;">
          <div class="card-title-row" style="margin-bottom: 0.5rem;">
            <div>
              <h2 style="font-size: 1.15rem; font-weight: 700;">Minggu ${w.n}: ${escapeHtml(w.title)}</h2>
              <div class="card-subtitle">${w.dates}</div>
            </div>
            <div style="text-align: right;">
              <span style="font-weight: 700; font-size: 0.95rem; color: var(--azure-light);">${weekDone}/${weekTotal}</span>
              <span style="font-size: 0.8rem; color: var(--text-dim);">(${weekPercent}%)</span>
            </div>
          </div>

          <div class="progress-bar-container">
            <div class="progress-bar-fill" style="width: ${weekPercent}%;"></div>
          </div>

          <div class="task-list">
            ${w.tasks.map(t => `
              <div class="task-item ${t.done ? 'task-done' : ''}">
                <input 
                  type="checkbox" 
                  class="task-checkbox" 
                  id="task_${t.id}" 
                  ${t.done ? 'checked' : ''} 
                  onchange="PlanPage.toggleTask('${t.id}', this.checked)"
                >
                <div class="task-content">
                  <label for="task_${t.id}" class="task-text">${escapeHtml(t.text)}</label>
                  ${t.url ? `
                    <div>
                      <a href="${t.url}" target="_blank" rel="noopener noreferrer" class="task-link">
                        🔗 Buka Tautan / Instruksi &rarr;
                      </a>
                    </div>
                  ` : ''}
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }).join('');

    container.innerHTML = `
      <div class="page-container">
        <!-- Plan Header Summary -->
        <div class="card" style="margin-bottom: 1.5rem; background: linear-gradient(135deg, rgba(0, 120, 212, 0.1), rgba(17, 24, 39, 0.8));">
          <div class="card-title-row">
            <div>
              <h1 style="font-size: 1.35rem; font-weight: 800;">Rencana Belajar 6 Minggu AI-200</h1>
              <div class="card-subtitle">Kurikulum terstruktur berbasis Microsoft Learn dan Skills Measured resmi</div>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 1.75rem; font-weight: 800; color: var(--azure-light);">${overallPercent}%</div>
              <div class="card-subtitle">${totalDone} dari ${totalTasks} task selesai</div>
            </div>
          </div>
          <div class="progress-bar-container" style="height: 10px; margin-top: 1rem;">
            <div class="progress-bar-fill" style="width: ${overallPercent}%;"></div>
          </div>
        </div>

        <!-- Weeks List -->
        <div>
          ${weeksHtml}
        </div>
      </div>
    `;
  }

  function toggleTask(taskId, isDone) {
    Store.toggleTask(taskId, isDone);
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
    toggleTask
  };
})();

window.PlanPage = PlanPage;
