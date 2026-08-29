/**
 * pages/resources.js — Halaman "Sumber" (Perpustakaan Lab MS Learn, Video, & Dokumen)
 */

const ResourcesPage = (() => {
  let filters = {
    type: 'all',
    domain: 'all',
    week: 'all',
    status: 'all'
  };

  function render(container) {
    const resources = Store.getResources();

    // Apply filters
    const filtered = resources.filter(r => {
      if (filters.type !== 'all' && r.type !== filters.type) return false;
      if (filters.domain !== 'all' && r.domain !== filters.domain) return false;
      if (filters.week !== 'all' && String(r.week) !== String(filters.week)) return false;
      if (filters.status !== 'all' && r.status !== filters.status) return false;
      return true;
    });

    // Group by week
    const grouped = {};
    for (let w = 1; w <= 6; w++) {
      grouped[w] = [];
    }
    grouped['umum'] = [];

    filtered.forEach(r => {
      const w = r.week || 'umum';
      if (!grouped[w]) grouped[w] = [];
      grouped[w].push(r);
    });

    const filterBarHtml = `
      <div class="filter-bar">
        <div class="filter-group">
          <label class="form-label" style="margin:0;">Tipe:</label>
          <select class="select-field" style="width: auto; padding: 0.3rem 0.6rem;" onchange="ResourcesPage.setFilter('type', this.value)">
            <option value="all" ${filters.type === 'all' ? 'selected' : ''}>Semua Tipe</option>
            <option value="lab" ${filters.type === 'lab' ? 'selected' : ''}>Lab</option>
            <option value="doc" ${filters.type === 'doc' ? 'selected' : ''}>Dokumentasi</option>
            <option value="video" ${filters.type === 'video' ? 'selected' : ''}>Video</option>
            <option value="article" ${filters.type === 'article' ? 'selected' : ''}>Artikel</option>
          </select>
        </div>

        <div class="filter-group">
          <label class="form-label" style="margin:0;">Domain:</label>
          <select class="select-field" style="width: auto; padding: 0.3rem 0.6rem;" onchange="ResourcesPage.setFilter('domain', this.value)">
            <option value="all" ${filters.domain === 'all' ? 'selected' : ''}>Semua Domain</option>
            <option value="containers" ${filters.domain === 'containers' ? 'selected' : ''}>Containers</option>
            <option value="data" ${filters.domain === 'data' ? 'selected' : ''}>Data Management</option>
            <option value="integration" ${filters.domain === 'integration' ? 'selected' : ''}>Integration</option>
            <option value="ops" ${filters.domain === 'ops' ? 'selected' : ''}>Security & Ops</option>
            <option value="umum" ${filters.domain === 'umum' ? 'selected' : ''}>Umum</option>
          </select>
        </div>

        <div class="filter-group">
          <label class="form-label" style="margin:0;">Minggu:</label>
          <select class="select-field" style="width: auto; padding: 0.3rem 0.6rem;" onchange="ResourcesPage.setFilter('week', this.value)">
            <option value="all" ${filters.week === 'all' ? 'selected' : ''}>Semua Minggu</option>
            <option value="1" ${filters.week === '1' ? 'selected' : ''}>Minggu 1</option>
            <option value="2" ${filters.week === '2' ? 'selected' : ''}>Minggu 2</option>
            <option value="3" ${filters.week === '3' ? 'selected' : ''}>Minggu 3</option>
            <option value="4" ${filters.week === '4' ? 'selected' : ''}>Minggu 4</option>
            <option value="5" ${filters.week === '5' ? 'selected' : ''}>Minggu 5</option>
            <option value="6" ${filters.week === '6' ? 'selected' : ''}>Minggu 6</option>
          </select>
        </div>

        <div class="filter-group">
          <label class="form-label" style="margin:0;">Status:</label>
          <select class="select-field" style="width: auto; padding: 0.3rem 0.6rem;" onchange="ResourcesPage.setFilter('status', this.value)">
            <option value="all" ${filters.status === 'all' ? 'selected' : ''}>Semua Status</option>
            <option value="belum" ${filters.status === 'belum' ? 'selected' : ''}>Belum</option>
            <option value="sedang" ${filters.status === 'sedang' ? 'selected' : ''}>Sedang</option>
            <option value="selesai" ${filters.status === 'selesai' ? 'selected' : ''}>Selesai</option>
          </select>
        </div>

        <div style="margin-left: auto;">
          <button class="btn btn-primary btn-sm" onclick="ResourcesPage.openAddModal()">
            + Tambah Sumber
          </button>
        </div>
      </div>
    `;

    // Render grouped resources
    let groupsHtml = '';
    for (let w = 1; w <= 6; w++) {
      const items = grouped[w];
      if (items && items.length > 0) {
        groupsHtml += renderGroupSection(`Minggu ${w}`, items);
      }
    }
    if (grouped['umum'] && grouped['umum'].length > 0) {
      groupsHtml += renderGroupSection('Materi Umum & Rujukan', grouped['umum']);
    }

    if (!groupsHtml) {
      groupsHtml = `
        <div class="card" style="text-align: center; padding: 3rem 1rem; color: var(--text-dim);">
          Tidak ada sumber yang cocok dengan filter yang dipilih.
        </div>
      `;
    }

    container.innerHTML = `
      <div class="page-container">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem; flex-wrap: wrap; gap: 0.5rem;">
          <div>
            <h1 style="font-size: 1.35rem; font-weight: 800; color: var(--text-main);">Perpustakaan Sumber Belajar</h1>
            <div class="card-subtitle">Semua lab resmi Microsoft Learn, materi video, dan dokumentasi ujian</div>
          </div>
          <div style="font-size: 0.85rem; color: var(--text-muted);">
            Menampilkan <strong>${filtered.length}</strong> dari <strong>${resources.length}</strong> sumber
          </div>
        </div>

        ${filterBarHtml}
        ${groupsHtml}
      </div>
    `;
  }

  function renderGroupSection(title, items) {
    return `
      <div class="card" style="margin-bottom: 1.5rem;">
        <h2 style="font-size: 1.1rem; font-weight: 700; margin-bottom: 1rem; color: var(--azure-blue);">${title}</h2>
        <div style="display: flex; flex-direction: column; gap: 0.75rem;">
          ${items.map(r => `
            <div class="task-item" style="flex-direction: column; align-items: stretch; gap: 0.5rem; background-color: #f8fafc;">
              <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 0.5rem; flex-wrap: wrap;">
                <div>
                  <div style="display: flex; align-items: center; gap: 0.4rem; margin-bottom: 0.25rem;">
                    <span class="badge badge-${r.type}">${r.type.toUpperCase()}</span>
                    <span class="badge badge-${r.domain}">${r.domain}</span>
                    ${r.minutes ? `<span style="font-size: 0.75rem; color: var(--text-dim); font-weight: 600;">⏱️ ${r.minutes} menit</span>` : ''}
                  </div>
                  <div style="font-size: 0.95rem; font-weight: 600; color: var(--text-main);">
                    ${escapeHtml(r.title)}
                  </div>
                </div>

                <div style="display: flex; align-items: center; gap: 0.5rem;">
                  <select class="status-select" onchange="ResourcesPage.updateStatus('${r.id}', this.value)">
                    <option value="belum" ${r.status === 'belum' ? 'selected' : ''}>Belum</option>
                    <option value="sedang" ${r.status === 'sedang' ? 'selected' : ''}>Sedang</option>
                    <option value="selesai" ${r.status === 'selesai' ? 'selected' : ''}>Selesai</option>
                  </select>

                  <select class="status-select" onchange="ResourcesPage.updateRating('${r.id}', this.value)">
                    <option value="" ${!r.rating ? 'selected' : ''}>⭐ Rating</option>
                    <option value="5" ${r.rating === 5 ? 'selected' : ''}>⭐⭐⭐⭐⭐ (5)</option>
                    <option value="4" ${r.rating === 4 ? 'selected' : ''}>⭐⭐⭐⭐ (4)</option>
                    <option value="3" ${r.rating === 3 ? 'selected' : ''}>⭐⭐⭐ (3)</option>
                    <option value="2" ${r.rating === 2 ? 'selected' : ''}>⭐⭐ (2)</option>
                    <option value="1" ${r.rating === 1 ? 'selected' : ''}>⭐ (1)</option>
                  </select>
                </div>
              </div>

              ${r.url ? `
                <div>
                  <a href="${r.url}" target="_blank" rel="noopener noreferrer" class="task-link">
                    🔗 Buka Tautan Sumber &rarr;
                  </a>
                </div>
              ` : ''}

              <!-- Short note field -->
              <div style="margin-top: 0.25rem;">
                <input 
                  type="text" 
                  class="input-field" 
                  style="font-size: 0.8rem; padding: 0.35rem 0.6rem; background-color: #ffffff;" 
                  placeholder="Catatan singkat (misal: review bagian 3 lagi)..." 
                  value="${escapeHtml(r.note || '')}" 
                  onchange="ResourcesPage.updateNote('${r.id}', this.value)"
                >
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  function setFilter(key, val) {
    filters[key] = val;
    const container = document.getElementById('main-content');
    if (container) render(container);
  }

  function updateStatus(id, status) {
    Store.updateResource(id, { status });
  }

  function updateRating(id, ratingVal) {
    const rating = ratingVal ? Number(ratingVal) : null;
    Store.updateResource(id, { rating });
  }

  function updateNote(id, note) {
    Store.updateResource(id, { note });
  }

  function openAddModal() {
    const modalBackdrop = document.getElementById('global-modal-backdrop');
    const modalContainer = document.getElementById('global-modal-content');
    if (!modalBackdrop || !modalContainer) return;

    modalContainer.innerHTML = `
      <div class="modal-header">
        <h3 class="modal-title">Tambah Sumber Belajar Baru</h3>
        <button class="modal-close" onclick="App.closeModal()">&times;</button>
      </div>
      <form id="add-resource-form" onsubmit="ResourcesPage.handleAddSubmit(event)">
        <div class="form-group">
          <label class="form-label">Judul Sumber / Lab *</label>
          <input type="text" id="new-res-title" class="input-field" required placeholder="Contoh: Implementasi Vector Search di AKS">
        </div>
        <div class="form-group">
          <label class="form-label">URL / Tautan *</label>
          <input type="url" id="new-res-url" class="input-field" required placeholder="https://...">
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
          <div class="form-group">
            <label class="form-label">Tipe</label>
            <select id="new-res-type" class="select-field">
              <option value="lab">Lab</option>
              <option value="doc">Dokumentasi</option>
              <option value="video">Video</option>
              <option value="article">Artikel</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Domain</label>
            <select id="new-res-domain" class="select-field">
              <option value="containers">Containers</option>
              <option value="data">Data Management</option>
              <option value="integration">Integration</option>
              <option value="ops">Security & Ops</option>
              <option value="umum">Umum</option>
            </select>
          </div>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
          <div class="form-group">
            <label class="form-label">Minggu</label>
            <select id="new-res-week" class="select-field">
              <option value="1">Minggu 1</option>
              <option value="2">Minggu 2</option>
              <option value="3">Minggu 3</option>
              <option value="4">Minggu 4</option>
              <option value="5">Minggu 5</option>
              <option value="6">Minggu 6</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Estimasi Durasi (Menit)</label>
            <input type="number" id="new-res-minutes" class="input-field" value="30" min="5" max="300">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Catatan Tambahan</label>
          <input type="text" id="new-res-note" class="input-field" placeholder="Catatan awal...">
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" onclick="App.closeModal()">Batal</button>
          <button type="submit" class="btn btn-primary">Simpan Sumber</button>
        </div>
      </form>
    `;

    modalBackdrop.classList.add('active');
  }

  function handleAddSubmit(e) {
    e.preventDefault();
    const title = document.getElementById('new-res-title').value;
    const url = document.getElementById('new-res-url').value;
    const type = document.getElementById('new-res-type').value;
    const domain = document.getElementById('new-res-domain').value;
    const week = Number(document.getElementById('new-res-week').value);
    const minutes = Number(document.getElementById('new-res-minutes').value);
    const note = document.getElementById('new-res-note').value;

    Store.addResource({
      title,
      url,
      type,
      domain,
      week,
      minutes,
      note,
      status: 'belum'
    });

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
    setFilter,
    updateStatus,
    updateRating,
    updateNote,
    openAddModal,
    handleAddSubmit
  };
})();

window.ResourcesPage = ResourcesPage;
