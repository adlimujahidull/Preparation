/**
 * app.js — Router, Global Modals, Shortcuts, Toast, Confetti, Themes, & Multi-Device Sync
 */

const App = (() => {
  let activeRoute = 'today';
  let isSyncing = false;

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
    initTheme();
    Store.onStatusChange(updateStatusIndicator);
    await Store.init();

    if (!GitHubAPI.hasConfig()) {
      showSetupModal();
    }

    setupShortcuts();
    setupSearch();
    setupMultiDeviceSync();

    window.addEventListener('hashchange', handleRouting);
    handleRouting();

    window.addEventListener('online', () => {
      toast('Koneksi internet kembali. Menyinkronkan perubahan...', 'info');
      Store.flush('online: sync queued offline changes');
    });

    window.addEventListener('offline', () => {
      updateStatusIndicator('offline', 'Koneksi internet terputus.');
      toast('Mode offline aktif. Perubahan disimpan di perangkat ini.', 'warning');
    });

    // Protect against leaving with unsaved changes
    window.addEventListener('beforeunload', (e) => {
      if (Store.isDirty()) {
        e.preventDefault();
        e.returnValue = 'Masih ada perubahan yang belum tersimpan ke GitHub. Yakin ingin keluar?';
      }
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

  // =========================================================================
  // Theme Toggle (Light & Dark)
  // =========================================================================
  function initTheme() {
    const saved = localStorage.getItem('app-theme') || 'light';
    applyTheme(saved);
  }

  function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    localStorage.setItem('app-theme', next);
    toast(`Mode ${next === 'dark' ? 'Gelap 🌙' : 'Terang ☀️'} aktif`, 'info', 1800);
  }

  function applyTheme(theme) {
    const btn = document.getElementById('theme-toggle-btn');
    if (theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
      if (btn) btn.textContent = '🌙';
    } else {
      document.documentElement.removeAttribute('data-theme');
      if (btn) btn.textContent = '☀️';
    }
  }

  // =========================================================================
  // Celebration Confetti (Pure Canvas)
  // =========================================================================
  function confetti() {
    const canvas = document.getElementById('confetti-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors = ['#0078d4', '#059669', '#d97706', '#7c3aed', '#ec4899', '#38bdf8', '#10b981'];
    const particles = [];
    for (let i = 0; i < 90; i++) {
      particles.push({
        x: canvas.width / 2 + (Math.random() - 0.5) * 100,
        y: canvas.height / 2 + (Math.random() - 0.5) * 60,
        vx: (Math.random() - 0.5) * 18,
        vy: (Math.random() - 0.75) * 16,
        size: Math.random() * 8 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        vr: (Math.random() - 0.5) * 12
      });
    }

    let start = Date.now();
    function step() {
      const elapsed = Date.now() - start;
      if (elapsed > 2400) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        return;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const opacity = Math.max(0, 1 - (elapsed / 2400));

      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.38; // gravity
        p.rotation += p.vr;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = opacity;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();
      });

      requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
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
      label.textContent = 'Ada perubahan';
      pill.title = 'Ada perubahan belum tersimpan. Klik untuk simpan sekarang.';
    } else if (status === 'saving') {
      label.textContent = detail || 'Menyimpan...';
      pill.title = 'Sedang menyinkronkan dengan GitHub API...';
    } else if (status === 'offline') {
      label.textContent = 'Offline';
      pill.title = 'Mode offline. Perubahan disimpan di perangkat dan akan dikirim saat online.';
    } else if (status === 'conflict') {
      label.textContent = 'Konflik Data';
      pill.title = detail || 'Data telah diubah dari perangkat lain.';
    }
  }

  // =========================================================================
  // Multi-Device Sync
  // =========================================================================
  async function syncData() {
    if (isSyncing) return;
    isSyncing = true;

    const spinner = document.getElementById('sync-spinner-icon');
    if (spinner) spinner.classList.add('spin-animate');

    try {
      if (Store.isDirty()) {
        toast('Menyimpan perubahan lokal ke GitHub sebelum sinkronisasi...', 'info', 2000);
        await Store.flush('sync: flush before pull');
      }

      toast('Menarik data terbaru dari repositori...', 'info', 2000);
      await Store.refreshFromGitHub();
      handleRouting();
      toast('✓ Data berhasil disinkronkan dengan GitHub!', 'success');
    } catch (err) {
      console.error('Sync failed:', err);
      toast(`Gagal sinkron: ${err.message}`, 'error');
    } finally {
      isSyncing = false;
      if (spinner) spinner.classList.remove('spin-animate');
    }
  }

  function setupMultiDeviceSync() {
    window.addEventListener('focus', async () => {
      if (!Store.isDirty() && GitHubAPI.hasConfig() && navigator.onLine) {
        try {
          await Store.refreshFromGitHub();
          handleRouting();
        } catch (e) {
          // Quiet background check
        }
      }
    });
  }

  // =========================================================================
  // Toast Notifications
  // =========================================================================
  function toast(message, type = 'info', duration = 3200) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    
    let icon = 'ℹ️';
    if (type === 'success') icon = '✓';
    else if (type === 'warning') icon = '⚠️';
    else if (type === 'error') icon = '✕';

    el.innerHTML = `
      <div style="display:flex; align-items:center; gap:0.5rem;">
        <span style="font-weight:700;">${icon}</span>
        <span>${escapeHtml(message)}</span>
      </div>
      <button class="toast-close" onclick="this.parentElement.remove()">&times;</button>
    `;

    container.appendChild(el);
    setTimeout(() => el.classList.add('show'), 20);

    setTimeout(() => {
      el.classList.remove('show');
      setTimeout(() => el.remove(), 300);
    }, duration);
  }

  // =========================================================================
  // Modals & Setup
  // =========================================================================
  function showSetupModal() {
    const existing = GitHubAPI.getConfig() || { owner: 'adlimujahidull', repo: 'Preparation', branch: 'main', token: '' };
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

      <div style="background-color: var(--bg-main); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 0.85rem 1rem; margin-bottom: 1.25rem; font-size: 0.825rem; color: var(--text-main); line-height: 1.5;">
        <strong style="color: var(--azure-blue);">Panduan Membuat Token:</strong>
        <ol style="margin-left: 1.25rem; margin-top: 0.35rem;">
          <li>Buka <em>GitHub &rarr; Settings &rarr; Developer Settings &rarr; Personal access tokens &rarr; Fine-grained tokens</em>.</li>
          <li>Repository access: <strong>Only select repositories</strong> (pilih <code>Preparation</code>).</li>
          <li>Permissions: Buka <strong>Repository permissions</strong> &rarr; cari <strong>Contents</strong> &rarr; pilih <strong>Read and write</strong>.</li>
          <li>Masa berlaku: <strong>90 hari</strong>.</li>
        </ol>
      </div>

      <div id="setup-error-msg" style="display: none; background-color: var(--accent-red-bg); color: var(--accent-red); border: 1px solid var(--accent-red-border); padding: 0.6rem 0.85rem; border-radius: var(--radius-sm); font-size: 0.825rem; margin-bottom: 1rem;"></div>

      <form id="setup-gh-form" onsubmit="App.handleSetupSubmit(event)">
        <div class="form-group">
          <label class="form-label">GitHub Owner / Username *</label>
          <input type="text" id="setup-owner" class="input-field" required placeholder="Contoh: adlimujahidull" value="${escapeHtml(existing.owner)}">
        </div>
        <div class="form-group">
          <label class="form-label">Nama Repository *</label>
          <input type="text" id="setup-repo" class="input-field" required placeholder="Preparation" value="${escapeHtml(existing.repo)}">
        </div>
        <div class="form-group">
          <label class="form-label">Branch *</label>
          <input type="text" id="setup-branch" class="input-field" required placeholder="main" value="${escapeHtml(existing.branch || 'main')}">
        </div>
        <div class="form-group">
          <label class="form-label">Fine-Grained Personal Access Token (PAT) *</label>
          <input type="password" id="setup-token" class="input-field" required placeholder="github_pat_..." value="${escapeHtml(existing.token)}">
          <div class="form-hint">Token disimpan secara aman di <code>localStorage</code> perangkat ini dan tidak pernah di-commit ke repositori.</div>
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
    toast('✓ Berhasil terhubung ke repositori!', 'success');
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
        <h3 class="modal-title">🧪 Catat Aktivitas Lab Cepat</h3>
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
    toast('✓ Log aktivitas lab berhasil disimpan!', 'success');
    handleRouting();
  }

  function openQuickCardModal() {
    const modalBackdrop = document.getElementById('global-modal-backdrop');
    const modalContainer = document.getElementById('global-modal-content');
    if (!modalBackdrop || !modalContainer) return;

    modalContainer.innerHTML = `
      <div class="modal-header">
        <h3 class="modal-title">💡 Tambah Kartu Hafalan Cepat</h3>
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
    toast('✓ Kartu hafalan baru berhasil dibuat!', 'success');
    handleRouting();
  }

  // =========================================================================
  // Keyboard Shortcuts Cheatsheet Modal
  // =========================================================================
  function openShortcutsModal() {
    const modalBackdrop = document.getElementById('global-modal-backdrop');
    const modalContainer = document.getElementById('global-modal-content');
    if (!modalBackdrop || !modalContainer) return;

    modalContainer.innerHTML = `
      <div class="modal-header">
        <h3 class="modal-title">⌨️ Panduan Pintasan Keyboard (Shortcuts)</h3>
        <button class="modal-close" onclick="App.closeModal()">&times;</button>
      </div>
      <div style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1.25rem;">
        Belajar lebih cepat tanpa perlu menyentuh mouse. Gunakan kombinasi tombol praktis berikut:
      </div>

      <!-- Akses Cepat Global -->
      <div class="shortcut-group">
        <div class="shortcut-group-title">🌐 Navigasi & Akses Global</div>
        <div class="shortcut-row">
          <span>Catat Aktivitas Hands-on Lab & RG Azure</span>
          <div><kbd>Alt</kbd> + <kbd>L</kbd></div>
        </div>
        <div class="shortcut-row">
          <span>Tambah Kartu Hafalan Baru (Flashcard)</span>
          <div><kbd>Alt</kbd> + <kbd>N</kbd></div>
        </div>
        <div class="shortcut-row">
          <span>Fokus ke Pencarian Global Seluruh Materi</span>
          <div><kbd>/</kbd></div>
        </div>
        <div class="shortcut-row">
          <span>Buka Panduan Pintasan Keyboard Ini</span>
          <div><kbd>?</kbd></div>
        </div>
        <div class="shortcut-row">
          <span>Tutup Jendela Pop-up / Modal</span>
          <div><kbd>Esc</kbd></div>
        </div>
      </div>

      <!-- Saat Sesi Drill Kartu -->
      <div class="shortcut-group">
        <div class="shortcut-group-title">⚡ Saat Sesi Drill Hafalan (#drill)</div>
        <div class="shortcut-row">
          <span>Buka / Tampilkan Jawaban Kartu</span>
          <div><kbd>Spasi</kbd> atau <kbd>Enter</kbd></div>
        </div>
        <div class="shortcut-row">
          <span>Tandai SALAH (Kembali ke Box 1)</span>
          <div><kbd>1</kbd> atau <kbd>←</kbd></div>
        </div>
        <div class="shortcut-row">
          <span>Tandai BENAR (Naik Box Leitner)</span>
          <div><kbd>2</kbd> atau <kbd>→</kbd></div>
        </div>
      </div>

      <!-- Saat Simulasi Ujian -->
      <div class="shortcut-group">
        <div class="shortcut-group-title">🎯 Saat Simulasi Ujian (#exams)</div>
        <div class="shortcut-row">
          <span>Pilih Opsi Jawaban</span>
          <div><kbd>A</kbd> / <kbd>B</kbd> / <kbd>C</kbd> / <kbd>D</kbd> atau <kbd>1-4</kbd></div>
        </div>
        <div class="shortcut-row">
          <span>Tandai (Flag) Soal untuk Ditinjau</span>
          <div><kbd>F</kbd></div>
        </div>
        <div class="shortcut-row">
          <span>Pindah ke Soal Berikutnya / Sebelumnya</span>
          <div><kbd>→</kbd> / <kbd>←</kbd></div>
        </div>
        <div class="shortcut-row">
          <span>Jeda (Pause) / Lanjutkan Timer Ujian</span>
          <div><kbd>P</kbd></div>
        </div>
      </div>

      <div class="modal-footer" style="margin-top: 1rem; justify-content: space-between;">
        <span style="font-size: 0.75rem; color: var(--text-dim);">💡 Tombol ⌨️ di header selalu siap dibuka kapan saja</span>
        <button type="button" class="btn btn-primary btn-sm" onclick="App.closeModal()">Mengerti & Tutup</button>
      </div>
    `;

    modalBackdrop.classList.add('active');
  }

  function closeModal() {
    const modalBackdrop = document.getElementById('global-modal-backdrop');
    if (modalBackdrop) modalBackdrop.classList.remove('active');
  }

  function setupShortcuts() {
    window.addEventListener('keydown', (e) => {
      const tag = (e.target && e.target.tagName) ? e.target.tagName.toLowerCase() : '';
      const isInput = tag === 'input' || tag === 'textarea';

      if (e.altKey && (e.key === 'l' || e.key === 'L')) {
        e.preventDefault();
        openQuickLabModal();
      } else if (e.altKey && (e.key === 'n' || e.key === 'N')) {
        e.preventDefault();
        openQuickCardModal();
      } else if (e.key === 'Escape') {
        closeModal();
      } else if (!isInput && e.key === '/') {
        e.preventDefault();
        const si = document.getElementById('global-search-input');
        if (si) {
          si.focus();
          si.select();
        }
      } else if (!isInput && (e.key === '?' || (e.shiftKey && e.key === '/'))) {
        e.preventDefault();
        openShortcutsModal();
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
                <div style="background-color: var(--bg-main); padding: 0.6rem 0.85rem; border-radius: var(--radius-sm); border: 1px solid var(--border-color); font-size: 0.85rem;">
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
                <div style="background-color: var(--bg-main); padding: 0.6rem 0.85rem; border-radius: var(--radius-sm); border: 1px solid var(--border-color); font-size: 0.85rem;">
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
                <div style="background-color: var(--bg-main); padding: 0.6rem 0.85rem; border-radius: var(--radius-sm); border: 1px solid var(--border-color); font-size: 0.85rem;">
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
                <div style="background-color: var(--bg-main); padding: 0.6rem 0.85rem; border-radius: var(--radius-sm); border: 1px solid var(--border-color); font-size: 0.85rem;">
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
    openShortcutsModal,
    closeModal,
    syncData,
    toast,
    confetti,
    toggleTheme
  };
})();

window.App = App;
window.addEventListener('DOMContentLoaded', App.init);
