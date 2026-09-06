/**
 * pages/settings.js — Halaman "Pengaturan" (Target Tanggal Ujian, Status PAT, & Hapus Kredensial)
 */

const SettingsPage = (() => {
  function render(container) {
    const ghConfig = GitHubAPI.getConfig() || { owner: '', repo: '', branch: 'main' };
    const maskedToken = GitHubAPI.getMaskedToken();
    const appConfig = Store.getConfig();

    container.innerHTML = `
      <div class="page-container" style="max-width: 720px; margin: 0 auto;">
        <h1 style="font-size: 1.35rem; font-weight: 800; margin-bottom: 0.5rem; color: var(--text-main);">Pengaturan Aplikasi</h1>
        <div class="card-subtitle" style="margin-bottom: 1.5rem;">Kelola target ujian, kredensial GitHub, dan sinkronisasi perangkat.</div>

        <!-- Target Exam Settings -->
        <div class="card" style="margin-bottom: 1.5rem;">
          <h2 style="font-size: 1.1rem; font-weight: 700; margin-bottom: 1rem; color: var(--azure-blue);">Target & Konfigurasi Ujian</h2>
          <form onsubmit="SettingsPage.handleSaveExamConfig(event)">
            <div class="form-group">
              <label class="form-label">Target Tanggal Ujian AI-200</label>
              <input type="date" id="setting-exam-date" class="input-field" value="${escapeHtml(appConfig.examDate || '')}">
              <div class="form-hint">Tanggal ini disimpan di <code>data/config.json</code> dan tersinkron ke semua perangkat. Countdown di halaman Hari ini akan otomatis membaca tanggal ini.</div>
            </div>

            <div class="form-group">
              <label class="form-label">Target Skor Kelulusan (Passing Score)</label>
              <input type="number" id="setting-passing-score" class="input-field" value="${appConfig.passingScore || 700}" min="100" max="1000" step="10">
              <div class="form-hint">Skala ujian Microsoft: 0–1000 (standar kelulusan: 700).</div>
            </div>

            <button type="submit" class="btn btn-primary btn-sm">
              Simpan Konfigurasi Ujian
            </button>
          </form>
        </div>

        <!-- GitHub Connection Settings -->
        <div class="card" style="margin-bottom: 1.5rem;">
          <h2 style="font-size: 1.1rem; font-weight: 700; margin-bottom: 1rem; color: var(--azure-blue);">Koneksi Repositori GitHub</h2>
          
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-bottom: 1rem;">
            <div>
              <div class="form-label">Owner Repositori</div>
              <div style="font-weight: 600; color: var(--text-main);">${escapeHtml(ghConfig.owner || '—')}</div>
            </div>
            <div>
              <div class="form-label">Nama Repositori</div>
              <div style="font-weight: 600; color: var(--text-main);">${escapeHtml(ghConfig.repo || '—')}</div>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-bottom: 1.25rem;">
            <div>
              <div class="form-label">Branch</div>
              <div style="font-weight: 600; color: var(--text-main);">${escapeHtml(ghConfig.branch || 'main')}</div>
            </div>
            <div>
              <div class="form-label">Personal Access Token (PAT)</div>
              <div style="font-family: var(--font-mono); font-size: 0.875rem; color: var(--text-muted);">${maskedToken || 'Belum diatur'}</div>
            </div>
          </div>

          <div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
            <button class="btn btn-secondary btn-sm" onclick="SettingsPage.testConnection(this)">
              🔌 Uji Koneksi GitHub
            </button>
            <button class="btn btn-secondary btn-sm" onclick="App.showSetupModal()">
              ✏️ Ubah Konfigurasi / Token
            </button>
            <button class="btn btn-primary btn-sm" onclick="App.syncData()">
              🔄 Sinkronkan Data Sekarang
            </button>
          </div>
        </div>

        <!-- Danger Zone: Remove Token -->
        <div class="card" style="border-color: var(--accent-red-border); background-color: var(--accent-red-bg);">
          <h2 style="font-size: 1.1rem; font-weight: 700; color: #991b1b; margin-bottom: 0.5rem;">Zona Bahaya & Keamanan</h2>
          <p style="font-size: 0.85rem; color: #7f1d1d; margin-bottom: 1rem; line-height: 1.4;">
            Gunakan tombol di bawah ini jika Anda menggunakan laptop kantor atau perangkat bersama dan ingin membersihkan seluruh kredensial token dari <code>localStorage</code> perangkat ini.
          </p>

          <button class="btn btn-danger btn-sm" onclick="SettingsPage.handleRemoveToken()">
            🗑️ Hapus token dari perangkat ini
          </button>
        </div>
      </div>
    `;
  }

  function handleSaveExamConfig(e) {
    e.preventDefault();
    const examDate = document.getElementById('setting-exam-date').value;
    const passingScore = Number(document.getElementById('setting-passing-score').value) || 700;

    Store.setConfig({ examDate, passingScore });
    App.toast('✓ Konfigurasi target ujian berhasil diperbarui dan siap disinkronkan ke repo!', 'success');
  }

  async function testConnection(btn) {
    const cfg = GitHubAPI.getConfig();
    if (!cfg) {
      App.toast('Konfigurasi token belum ada.', 'warning');
      return;
    }
    const orig = btn.textContent;
    btn.textContent = 'Menguji...';
    btn.disabled = true;

    const res = await GitHubAPI.validateRepo(cfg.owner, cfg.repo, cfg.branch, cfg.token);
    btn.textContent = orig;
    btn.disabled = false;

    if (res.ok) {
      App.toast(`✓ Koneksi Berhasil! Terhubung ke repositori ${cfg.owner}/${cfg.repo} (branch: ${cfg.branch}).`, 'success', 4000);
    } else {
      App.toast(`Koneksi Gagal: ${res.error}`, 'error', 4000);
    }
  }

  function handleRemoveToken() {
    if (confirm('Apakah Anda yakin ingin menghapus token GitHub dan seluruh konfigurasi dari perangkat ini?')) {
      GitHubAPI.clearConfig();
      alert('Token dan konfigurasi lokal berhasil dihapus dari perangkat ini.');
      window.location.reload();
    }
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
    handleSaveExamConfig,
    testConnection,
    handleRemoveToken
  };
})();

window.SettingsPage = SettingsPage;
