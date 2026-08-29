/**
 * pages/decisions.js — Halaman "Keputusan" (Tabel Arsitektur & Mode Kuis Recall)
 */

const DecisionsPage = (() => {
  let isQuizMode = false;
  let revealedQuizIds = new Set();

  function render(container) {
    const decisions = Store.getDecisions();

    const headerActionsHtml = `
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 0.75rem;">
        <div>
          <h1 style="font-size: 1.35rem; font-weight: 800; color: var(--text-main);">Tabel Keputusan Arsitektur</h1>
          <div class="card-subtitle">Aset paling berharga: kriteria pemilihan layanan Azure untuk soal skenario ujian</div>
        </div>

        <div style="display: flex; gap: 0.5rem; align-items: center;">
          <button class="btn ${isQuizMode ? 'btn-primary' : 'btn-secondary'} btn-sm" onclick="DecisionsPage.toggleQuizMode()">
            🎯 ${isQuizMode ? 'Mode Belajar Biasa' : 'Mode Kuis Recall'}
          </button>
          <button class="btn btn-primary btn-sm" onclick="DecisionsPage.openAddDecisionModal()">
            + Tabel Baru
          </button>
        </div>
      </div>
    `;

    if (decisions.length === 0) {
      container.innerHTML = `
        <div class="page-container" style="max-width: 820px; margin: 0 auto;">
          ${headerActionsHtml}
          <div class="card" style="text-align: center; padding: 3rem 1rem; color: var(--text-dim);">
            Belum ada tabel keputusan. Klik "+ Tabel Baru" untuk membuat perbandingan pertama Anda.
          </div>
        </div>
      `;
      return;
    }

    const tablesHtml = decisions.map(d => {
      const isRevealed = revealedQuizIds.has(d.id);

      return `
        <div class="card" style="margin-bottom: 1.5rem;">
          <div class="card-title-row" style="margin-bottom: 0.75rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem;">
            <div>
              <h2 style="font-size: 1.15rem; font-weight: 700; color: var(--azure-blue);">⚖️ ${escapeHtml(d.title)}</h2>
              <div class="card-subtitle">Terakhir diupdate: ${d.updated || '—'}</div>
            </div>
            <div style="display: flex; gap: 0.4rem;">
              <button class="btn btn-secondary btn-sm" onclick="DecisionsPage.openEditDecisionModal('${d.id}')">
                ✏️ Edit
              </button>
              <button class="btn btn-danger btn-sm" onclick="DecisionsPage.deleteDecision('${d.id}')">
                🗑️
              </button>
            </div>
          </div>

          ${isQuizMode && !isRevealed ? `
            <!-- Mode Kuis: Hidden Content -->
            <div style="text-align: center; padding: 2rem 1rem; background-color: #f8fafc; border-radius: var(--radius-md); border: 1px solid var(--border-color);">
              <div style="font-size: 0.95rem; font-weight: 600; color: var(--text-main); margin-bottom: 0.5rem;">
                Sebutkan pemicu (triggers) & kapan memilih masing-masing opsi dari ingatan Anda!
              </div>
              <p style="font-size: 0.8rem; color: var(--text-dim); margin-bottom: 1.25rem;">
                Misal: pertimbangan biaya, latensi, scale-to-zero, GPU, atau kompleksitas.
              </p>
              <button class="btn btn-primary btn-sm" onclick="DecisionsPage.revealQuiz('${d.id}')">
                👁️ Buka & Cocokkan dengan Catatan
              </button>
            </div>
          ` : `
            <!-- Full Decision Table Content -->
            ${d.options && d.options.length > 0 ? `
              <div style="display: flex; flex-direction: column; gap: 0.75rem;">
                ${d.options.map(opt => `
                  <div style="background-color: #f8fafc; border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 0.85rem 1rem;">
                    <div style="font-weight: 700; font-size: 0.95rem; color: var(--azure-blue); margin-bottom: 0.35rem;">
                      🔹 ${escapeHtml(opt.name)}
                    </div>
                    <div style="font-size: 0.875rem; color: var(--text-main); line-height: 1.5; white-space: pre-line;">
                      <strong style="color: var(--accent-green);">Pilih saat (Pick When):</strong> ${escapeHtml(opt.pick_when || 'Belum diisi.')}
                    </div>
                  </div>
                `).join('')}
              </div>
            ` : `
              <div style="padding: 1.5rem; text-align: center; color: var(--text-dim); font-size: 0.875rem; background-color: #f8fafc; border-radius: var(--radius-md); border: 1px solid var(--border-color);">
                Opsi perbandingan masih kosong. Klik "Edit" untuk menambahkan pilihan layanan dan pemicunya.
              </div>
            `}
          `}
        </div>
      `;
    }).join('');

    container.innerHTML = `
      <div class="page-container" style="max-width: 820px; margin: 0 auto;">
        ${headerActionsHtml}
        ${tablesHtml}
      </div>
    `;
  }

  function toggleQuizMode() {
    isQuizMode = !isQuizMode;
    revealedQuizIds.clear();
    const container = document.getElementById('main-content');
    if (container) render(container);
  }

  function revealQuiz(id) {
    revealedQuizIds.add(id);
    const container = document.getElementById('main-content');
    if (container) render(container);
  }

  function deleteDecision(id) {
    if (confirm('Hapus tabel keputusan ini?')) {
      Store.deleteDecision(id);
      const container = document.getElementById('main-content');
      if (container) render(container);
    }
  }

  function openAddDecisionModal() {
    const modalBackdrop = document.getElementById('global-modal-backdrop');
    const modalContainer = document.getElementById('global-modal-content');
    if (!modalBackdrop || !modalContainer) return;

    modalContainer.innerHTML = `
      <div class="modal-header">
        <h3 class="modal-title">Tambah Tabel Keputusan Baru</h3>
        <button class="modal-close" onclick="App.closeModal()">&times;</button>
      </div>
      <form onsubmit="DecisionsPage.handleAddSubmit(event)">
        <div class="form-group">
          <label class="form-label">Judul Perbandingan *</label>
          <input type="text" id="new-dec-title" class="input-field" required placeholder="Contoh: Azure OpenAI vs Phi-3 Local Sidecar">
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" onclick="App.closeModal()">Batal</button>
          <button type="submit" class="btn btn-primary">Buat Tabel</button>
        </div>
      </form>
    `;

    modalBackdrop.classList.add('active');
  }

  function handleAddSubmit(e) {
    e.preventDefault();
    const title = document.getElementById('new-dec-title').value.trim();
    Store.addDecision({ title, options: [] });
    App.closeModal();
    const container = document.getElementById('main-content');
    if (container) render(container);
  }

  function openEditDecisionModal(id) {
    const decisions = Store.getDecisions();
    const target = decisions.find(d => d.id === id);
    if (!target) return;

    const modalBackdrop = document.getElementById('global-modal-backdrop');
    const modalContainer = document.getElementById('global-modal-content');
    if (!modalBackdrop || !modalContainer) return;

    const optionsText = (target.options || []).map(o => `${o.name} | ${o.pick_when}`).join('\n');

    modalContainer.innerHTML = `
      <div class="modal-header">
        <h3 class="modal-title">Edit Tabel Keputusan</h3>
        <button class="modal-close" onclick="App.closeModal()">&times;</button>
      </div>
      <form onsubmit="DecisionsPage.handleEditSubmit(event, '${id}')">
        <div class="form-group">
          <label class="form-label">Judul Perbandingan *</label>
          <input type="text" id="edit-dec-title" class="input-field" required value="${escapeHtml(target.title)}">
        </div>
        <div class="form-group">
          <label class="form-label">Daftar Opsi & Pemicu (Satu opsi per baris, pisahkan dengan '|')</label>
          <textarea id="edit-dec-options" class="textarea-field" rows="6" placeholder="Nama Layanan | Kapan memilih layanan ini...">${escapeHtml(optionsText)}</textarea>
          <div class="form-hint">Format: <code>Nama Opsi | Pemicu (Pick When)</code><br>Contoh: <code>Container Apps | Butuh scale-to-zero dan HTTP trigger ringan</code></div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" onclick="App.closeModal()">Batal</button>
          <button type="submit" class="btn btn-primary">Simpan Perubahan</button>
        </div>
      </form>
    `;

    modalBackdrop.classList.add('active');
  }

  function handleEditSubmit(e, id) {
    e.preventDefault();
    const title = document.getElementById('edit-dec-title').value.trim();
    const rawOptions = document.getElementById('edit-dec-options').value;

    const options = [];
    rawOptions.split('\n').forEach(line => {
      const parts = line.split('|');
      if (parts.length >= 2 && parts[0].trim()) {
        options.push({
          name: parts[0].trim(),
          pick_when: parts.slice(1).join('|').trim()
        });
      }
    });

    Store.updateDecision(id, { title, options });
    App.closeModal();
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
    toggleQuizMode,
    revealQuiz,
    deleteDecision,
    openAddDecisionModal,
    handleAddSubmit,
    openEditDecisionModal,
    handleEditSubmit
  };
})();

window.DecisionsPage = DecisionsPage;
