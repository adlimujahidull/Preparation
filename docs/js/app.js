/**
 * app.js — Router, Global Modals, Shortcuts, & Application Bootstrap
 */

const App = (() => {
  let activeRoute = 'today';

  const routes = {
    'today': TodayPage,
    'plan': PlanPage,
    'resources': ResourcesPage,
    'notes': NotesPage,
    'drill': DrillPage,
    'exams': ExamsPage,
    'decisions': DecisionsPage,
    'stats': StatsPage,
    'settings': SettingsPage
  };

  async function init() {
    Store.onStatusChange(updateStatusIndicator);
    await Store.init();

    if (!GitHubAPI.hasConfig()) {
      showSetupModal();
    }

    setupShortcuts();
    setupSearch();

    window.addEventListener('hashchange', handleRouting);
    handleRouting();

    window.addEventListener('online', () => {
      Store.flush('online: sync queued offline changes');
    });
    window.addEventListener('offline', () => {
      updateStatusIndicator('offline', 'Koneksi internet terputus.');
    });
  }

  function handleRouting() {
    const hash = window.location.hash.slice(1) || 'today';
    const routeKey = hash.split('?')[0] || 'today';
    activeRoute = routes[routeKey] ? routeKey : 'today';

    document.querySelectorAll('.nav-link').forEach(link => {
      const href = link.getAttribute('href');
      if (href === `#${activeRoute}`) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });

    const container = document.getElementById('main-content');
    if (container && routes[activeRoute]) {
      routes[activeRoute].render(container);
    }
  }

  function updateStatusIndicator(status, detail) {
    const pill = document.getElementById('save-status-pill');
    const label = document.getElementById('save-status-label');
    if (!pill || !label) return;

    pill.className = `status-pill status-${status}`;
    if (status === 'saved') {
      label.textContent = 'Tersimpan';
      pill.title = 'Semua perubahan tersimpan di repositori GitHub';
    } else if (status === 'dirty') {
      label.textContent = 'Ada perubahan belum tersimpan';
      pill.title = 'Klik untuk menyimpan perubahan ke repositori sekarang';
    } else if (status === 'saving') {
      label.textContent = detail || 'Menyimpan...';
      pill.title = 'Sedang menyinkronkan dengan GitHub API...';
    } else if (status === 'offline') {
      label.textContent = 'Offline';
      pill.title = 'Mode offline. Perubahan disimpan di perangkat dan akan dikirim saat online.';
    } else if (status === 'conflict') {
      label.textContent = 'Konflik Sinkronisasi';
      pill.title = detail || 'Data telah diubah dari perangkat lain.';
    }
  }

  function showSetupModal() {
    const existing = GitHubAPI.getConfig() || { owner: 'adlimujahidull', repo: 'ai-200-prep', branch: 'main', token: '' };
    const modalBackdrop = document.getElementById('global-modal-backdrop');
    const modalContainer = document.getElementById('global-modal-content');
    if (!modalBackdrop || !modalContainer) return;

    modalContainer.innerHTML = `
      <div class="modal-header">
        <h3 class="modal-title">⚙️ Konfigurasi GitHub Repository</h3>
        <button class="modal-close" onclick="App.closeModal()">&times;</button>
      </div>
      <div style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1rem; line-height: 1.4;">
        Aplikasi ini serverless dan menggunakan repo GitHub Anda sebagai database. Masukkan Fine-Grained Personal Access Token (PAT) Anda.
      </div>

      <div style="background-color: #f8fafc; border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 0.85rem 1rem; margin-bottom: 1.25rem; font-size: 0.825rem; color: var(--text-main); line-height: 1.5;">
        <strong style="color: var(--azure-blue);">Panduan Membuat Token:</strong>
        <ol style="margin-left: 1.25rem; margin-top: 0.35rem;">
          <li>Buka <em>GitHub &rarr; Settings &rarr; Developer Settings &rarr; Personal access tokens &rarr; Fine-grained tokens</em>.</li>
          <li>Repository access: <strong>Only select repositories</strong> (pilih <code>ai-200-prep</code>).</li>
          <li>Permissions: Buka <strong>Repository permissions</strong> &rarr; cari <strong>Contents</strong> &rarr; pilih <strong>Read and write</strong>.</li>
          <li>Masa berlaku: <strong>90 hari</strong>.</li>
        </ol>
      </div>

      <div id="setup-error-msg" style="display: none; background-color: var(--accent-red-bg); color: #991b1b; border: 1px solid var(--accent-red-border); padding: 0.6rem 0.85rem; border-radius: var(--radius-sm); font-size: 0.825rem; margin-bottom: 1rem;"></div>

      <form id="setup-gh-form" onsubmit="App.handleSetupSubmit(event)">
        <div class="form-group">
          <label class="form-label">GitHub Owner / Username *</label>
          <input type="text" id="setup-owner" class="input-field" required placeholder="Contoh: adlimujahidull" value="${escapeHtml(existing.owner)}">
        </div>
        <div class="form-group">
          <label class="form-label">Nama Repository *</label>
          <input type="text" id="setup-repo" class="input-field" required placeholder="ai-200-prep" value="${escapeHtml(existing.repo)}">
        </div>
        <div class="form-group">
          <label class="form-label">Branch *</label>
          <input type="text" id="setup-branch" class="input-field" required placeholder="main" value="${escapeHtml(existing.branch || 'main')}">
        </div>
        <div class="form-group">
          <label class="form-label">Fine-Grained Personal Access Token (PAT) *</label>
          <input type="password" id="setup-token" class="input-field" required placeholder="github_pat_..." value="${escapeHtml(existing.token)}">
          <div class="form-hint">Token disimpan secara aman di <code>localStorage</code> perangkat ini dan tidak pernah di-commit.</div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" onclick="App.closeModal()">Tutup</button>
          <button type="submit" id="setup-submit-btn" class="btn btn-primary">Simpan & Hubungkan</button>
        </div>
      </form>
    `;

    modalBackdrop.classList.add('active');
  }

  async function handleSetupSubmit(e) {
    e.preventDefault();
    const errorBox = document.getElementById('setup-error-msg');
    const submitBtn = document.getElementById('setup-submit-btn');

    const owner = document.getElementById('setup-owner').value.trim();
    const repo = document.getElementById('setup-repo').value.trim();
    const branch = document.getElementById('setup-branch').value.trim() || 'main';
    const token = document.getElementById('setup-token').value.trim();

    errorBox.style.display = 'none';
    submitBtn.textContent = 'Memvalidasi...';
    submitBtn.disabled = true;

    const validation = await GitHubAPI.validateRepo(owner, repo, branch, token);

    if (!validation.ok) {
      errorBox.textContent = validation.error;
      errorBox.style.display = 'block';
      submitBtn.textContent = 'Simpan & Hubungkan';
      submitBtn.disabled = false;
      return;
    }

    GitHubAPI.setConfig({ owner, repo, branch, token });
    closeModal();
    await Store.refreshFromGitHub();
    handleRouting();
  }

  function openQuickLabModal() {
    const modalBackdrop = document.getElementById('global-modal-backdrop');
    const modalContainer = document.getElementById('global-modal-content');
    if (!modalBackdrop || !modalContainer) return;

    const todayStr = new Date().toISOString().split('T')[0];

    modalContainer.innerHTML = `
      <div class="modal-header">
        <h3 class="modal-title">🧪 Catat Aktivitas Lab Cepat (Alt+L)</h3>
        <button class="modal-close" onclick="App.closeModal()">&times;</button>
      </div>
      <form onsubmit="App.handleQuickLabSubmit(event)">
        <div class="form-group">
          <label class="form-label">Nama Lab / Aktivitas *</label>
          <input type="text" id="qlab-name" class="input-field" required placeholder="Contoh: aks-troubleshoot-readiness">
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
          <div class="form-group">
            <label class="form-label">Tanggal</label>
            <input type="date" id="qlab-date" class="input-field" value="${todayStr}">
          </div>
          <div class="form-group">
            <label class="form-label">Durasi (Menit)</label>
            <input type="number" id="qlab-minutes" class="input-field" value="30" min="5" max="300">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Nama Resource Group Azure (Jika pakai)</label>
          <input type="text" id="qlab-rg" class="input-field" placeholder="Contoh: rg-aks-lab">
          <div class="form-hint">PENTING: Jangan lupa hapus RG setelah lab agar tidak terkena tagihan per jam.</div>
        </div>
        <div class="form-group">
          <label style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.85rem; cursor: pointer; color: var(--text-main);">
            <input type="checkbox" id="qlab-deleted" class="task-checkbox">
            Resource Group sudah langsung dihapus saat lab selesai
          </label>
        </div>
        <div class="form-group">
          <label class="form-label">Kendala / Blocker yang Dihadapi</label>
          <input type="text" id="qlab-blocker" class="input-field" placeholder="Contoh: readiness probe gagal karena path mismatch">
        </div>
        <div class="form-group">
          <label class="form-label">Takeaway / Pelajaran Penting</label>
          <input type="text" id="qlab-takeaway" class="input-field" placeholder="Contoh: probe path harus match dengan route di container">
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" onclick="App.closeModal()">Batal</button>
          <button type="submit" class="btn btn-primary">Simpan Log Lab</button>
        </div>
      </form>
    `;

    modalBackdrop.classList.add('active');
    setTimeout(() => {
      const nameInput = document.getElementById('qlab-name');
      if (nameInput) nameInput.focus();
    }, 100);
  }

  function handleQuickLabSubmit(e) {
    e.preventDefault();
    const lab = document.getElementById('qlab-name').value.trim();
    const date = document.getElementById('qlab-date').value;
    const minutes = Number(document.getElementById('qlab-minutes').value) || 30;
    const resource_group = document.getElementById('qlab-rg').value.trim();
    const deleted = document.getElementById('qlab-deleted').checked;
    const blocker = document.getElementById('qlab-blocker').value.trim();
    const takeaway = document.getElementById('qlab-takeaway').value.trim();

    Store.addLab({
      lab,
      date,
      minutes,
      resource_group,
      deleted,
      blocker,
      takeaway
    });

    closeModal();
    handleRouting();
  }

  function openQuickCardModal() {
    const modalBackdrop = document.getElementById('global-modal-backdrop');
    const modalContainer = document.getElementById('global-modal-content');
    if (!modalBackdrop || !modalContainer) return;

    modalContainer.innerHTML = `
      <div class="modal-header">
        <h3 class="modal-title">💡 Tambah Kartu Hafalan Cepat (Alt+N)</h3>
        <button class="modal-close" onclick="App.closeModal()">&times;</button>
      </div>
      <form onsubmit="App.handleQuickCardSubmit(event)">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
          <div class="form-group">
            <label class="form-label">Domain *</label>
            <select id="qcard-domain" class="select-field">
              <option value="containers">Containers</option>
              <option value="data">Data Management</option>
              <option value="integration">Integration</option>
              <option value="ops">Security & Ops</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Tipe Kartu *</label>
            <select id="qcard-type" class="select-field">
              <option value="recall">Recall (Konsep / Perintah)</option>
              <option value="decision">Decision (Pilih Layanan & Alasan)</option>
            </select>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Pertanyaan / Skenario (Bahasa Inggris) *</label>
          <textarea id="qcard-q" class="textarea-field" rows="3" required placeholder="Contoh: When should you use Azure Container Apps instead of AKS?"></textarea>
        </div>
        <div class="form-group">
          <label class="form-label">Jawaban (Bahasa Inggris) *</label>
          <textarea id="qcard-a" class="textarea-field" rows="3" required placeholder="Contoh: Use ACA for serverless microservices with scale-to-zero..."></textarea>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" onclick="App.closeModal()">Batal</button>
          <button type="submit" class="btn btn-primary">Simpan Kartu</button>
        </div>
      </form>
    `;

    modalBackdrop.classList.add('active');
    setTimeout(() => {
      const qInput = document.getElementById('qcard-q');
      if (qInput) qInput.focus();
    }, 100);
  }

  function handleQuickCardSubmit(e) {
    e.preventDefault();
    const domain = document.getElementById('qcard-domain').value;
    const type = document.getElementById('qcard-type').value;
    const question = document.getElementById('qcard-q').value.trim();
    const answer = document.getElementById('qcard-a').value.trim();

    Store.addCard({ domain, type, question, answer });
    closeModal();
    handleRouting();
  }

  function closeModal() {
    const modalBackdrop = document.getElementById('global-modal-backdrop');
    if (modalBackdrop) modalBackdrop.classList.remove('active');
  }

  function setupShortcuts() {
    window.addEventListener('keydown', (e) => {
      if (e.altKey && (e.key === 'l' || e.key === 'L')) {
        e.preventDefault();
        openQuickLabModal();
      } else if (e.altKey && (e.key === 'n' || e.key === 'N')) {
        e.preventDefault();
        openQuickCardModal();
      } else if (e.key === 'Escape') {
        closeModal();
      }
    });
  }

  function setupSearch() {
    const searchInput = document.getElementById('global-search-input');
    if (!searchInput) return;

    searchInput.addEventListener('input', (e) => {
      const q = e.target.value.trim().toLowerCase();
      if (!q) {
        closeModal();
        return;
      }
      performSearch(q);
    });
  }

  function performSearch(query) {
    const cards = Store.getCards();
    const resources = Store.getResources();
    const decisions = Store.getDecisions();
    const notes = Store.getNotes();

    const matchedCards = cards.filter(c => 
      c.question.toLowerCase().includes(query) || c.answer.toLowerCase().includes(query)
    );
    const matchedResources = resources.filter(r => 
      r.title.toLowerCase().includes(query) || (r.note && r.note.toLowerCase().includes(query))
    );
    const matchedDecisions = decisions.filter(d => 
      d.title.toLowerCase().includes(query)
    );
    const matchedNotes = Object.values(notes).filter(n => 
      n.name.toLowerCase().includes(query) || (n.content && n.content.toLowerCase().includes(query))
    );

    const totalMatches = matchedCards.length + matchedResources.length + matchedDecisions.length + matchedNotes.length;

    const modalBackdrop = document.getElementById('global-modal-backdrop');
    const modalContainer = document.getElementById('global-modal-content');
    if (!modalBackdrop || !modalContainer) return;

    modalContainer.innerHTML = `
      <div class="modal-header">
        <h3 class="modal-title">🔍 Hasil Pencarian: "${escapeHtml(query)}"</h3>
        <button class="modal-close" onclick="App.closeModal()">&times;</button>
      </div>
      <div style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1rem;">
        Ditemukan <strong>${totalMatches}</strong> hasil di seluruh materi belajar.
      </div>
      <div style="display: flex; flex-direction: column; gap: 1rem; max-height: 60vh; overflow-y: auto;">
        
        <!-- Sumber -->
        ${matchedResources.length > 0 ? `
          <div>
            <h4 style="font-size: 0.85rem; color: var(--azure-blue); margin-bottom: 0.4rem; text-transform: uppercase; font-weight: 700;">Perpustakaan Sumber (${matchedResources.length})</h4>
            <div style="display: flex; flex-direction: column; gap: 0.4rem;">
              ${matchedResources.map(r => `
                <div style="background-color: #f8fafc; padding: 0.6rem 0.85rem; border-radius: var(--radius-sm); border: 1px solid var(--border-color); font-size: 0.85rem;">
                  <div style="font-weight: 600; color: var(--text-main);">${escapeHtml(r.title)}</div>
                  ${r.url ? `<a href="${r.url}" target="_blank" class="task-link" style="font-size: 0.75rem;">Buka Tautan &rarr;</a>` : ''}
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

        <!-- Kartu -->
        ${matchedCards.length > 0 ? `
          <div>
            <h4 style="font-size: 0.85rem; color: var(--azure-blue); margin-bottom: 0.4rem; text-transform: uppercase; font-weight: 700;">Kartu Hafalan (${matchedCards.length})</h4>
            <div style="display: flex; flex-direction: column; gap: 0.4rem;">
              ${matchedCards.map(c => `
                <div style="background-color: #f8fafc; padding: 0.6rem 0.85rem; border-radius: var(--radius-sm); border: 1px solid var(--border-color); font-size: 0.85rem;">
                  <div style="font-weight: 600; color: var(--text-main);">${escapeHtml(c.question)}</div>
                  <div style="color: var(--text-dim); font-size: 0.8rem; margin-top: 0.2rem;">${escapeHtml(c.answer.slice(0, 100))}...</div>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

        <!-- Keputusan -->
        ${matchedDecisions.length > 0 ? `
          <div>
            <h4 style="font-size: 0.85rem; color: var(--azure-blue); margin-bottom: 0.4rem; text-transform: uppercase; font-weight: 700;">Tabel Keputusan (${matchedDecisions.length})</h4>
            <div style="display: flex; flex-direction: column; gap: 0.4rem;">
              ${matchedDecisions.map(d => `
                <div style="background-color: #f8fafc; padding: 0.6rem 0.85rem; border-radius: var(--radius-sm); border: 1px solid var(--border-color); font-size: 0.85rem;">
                  <a href="#decisions" onclick="App.closeModal()" style="color: var(--azure-blue); font-weight: 600; text-decoration: none;">${escapeHtml(d.title)} &rarr;</a>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

        <!-- Catatan -->
        ${matchedNotes.length > 0 ? `
          <div>
            <h4 style="font-size: 0.85rem; color: var(--azure-blue); margin-bottom: 0.4rem; text-transform: uppercase; font-weight: 700;">Catatan (${matchedNotes.length})</h4>
            <div style="display: flex; flex-direction: column; gap: 0.4rem;">
              ${matchedNotes.map(n => `
                <div style="background-color: #f8fafc; padding: 0.6rem 0.85rem; border-radius: var(--radius-sm); border: 1px solid var(--border-color); font-size: 0.85rem;">
                  <a href="#notes" onclick="App.closeModal()" style="color: var(--azure-blue); font-weight: 600; text-decoration: none;">${escapeHtml(n.name)} &rarr;</a>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

        ${totalMatches === 0 ? `
          <div style="padding: 1.5rem; text-align: center; color: var(--text-dim); font-size: 0.875rem;">
            Tidak ada item yang mengandung kata "${escapeHtml(query)}".
          </div>
        ` : ''}

      </div>
    `;

    modalBackdrop.classList.add('active');
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
    init,
    showSetupModal,
    handleSetupSubmit,
    openQuickLabModal,
    handleQuickLabSubmit,
    openQuickCardModal,
    handleQuickCardSubmit,
    closeModal
  };
})();

window.App = App;
window.addEventListener('DOMContentLoaded', App.init);
