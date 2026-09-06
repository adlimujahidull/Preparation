/**
 * pages/resources.js — Halaman "Sumber" (Perpustakaan Lab MS Learn, Video, & Dokumen)
 */

const ResourcesPage = (() => {
  let filters = {
    type: 'all',
    domain: 'all',
    week: 'all',
    status: 'all',
    search: '',
    chip: 'all'
  };

  function render(container) {
    const resources = Store.getResources();

    // Apply filters
    const filtered = resources.filter(r => {
      // Quick Chip Filter
      if (filters.chip === 'lab' && r.type !== 'lab') return false;
      if (filters.chip === 'doc' && r.type !== 'doc') return false;
      if (filters.chip === 'belum' && r.status !== 'belum') return false;
      if (filters.chip === 'sedang' && r.status !== 'sedang') return false;
      if (filters.chip === 'selesai' && r.status !== 'selesai') return false;

      // Dropdown filters
      if (filters.type !== 'all' && r.type !== filters.type) return false;
      if (filters.domain !== 'all' && r.domain !== filters.domain) return false;
      if (filters.week !== 'all' && String(r.week) !== String(filters.week)) return false;
      if (filters.status !== 'all' && r.status !== filters.status) return false;

      // Search filter
      if (filters.search) {
        const q = filters.search.toLowerCase();
        const titleMatch = r.title.toLowerCase().includes(q);
        const noteMatch = r.note && r.note.toLowerCase().includes(q);
        if (!titleMatch && !noteMatch) return false;
      }

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

    const chipsHtml = `
      <div class="filter-chips">
        <button class="chip ${filters.chip === 'all' ? 'active' : ''}" onclick="ResourcesPage.setChip('all')">
          Semua (${resources.length})
        </button>
        <button class="chip ${filters.chip === 'lab' ? 'active' : ''}" onclick="ResourcesPage.setChip('lab')">
          🧪 Lab Praktik (${resources.filter(r => r.type === 'lab').length})
        </button>
        <button class="chip ${filters.chip === 'doc' ? 'active' : ''}" onclick="ResourcesPage.setChip('doc')">
          📖 Panduan & Docs (${resources.filter(r => r.type === 'doc').length})
        </button>
        <button class="chip ${filters.chip === 'belum' ? 'active' : ''}" onclick="ResourcesPage.setChip('belum')">
          ⏳ Belum Dikerjakan (${resources.filter(r => r.status === 'belum').length})
        </button>
        <button class="chip ${filters.chip === 'sedang' ? 'active' : ''}" onclick="ResourcesPage.setChip('sedang')">
          🔥 Sedang Dipelajari (${resources.filter(r => r.status === 'sedang').length})
        </button>
        <button class="chip ${filters.chip === 'selesai' ? 'active' : ''}" onclick="ResourcesPage.setChip('selesai')">
          ✅ Selesai (${resources.filter(r => r.status === 'selesai').length})
        </button>
      </div>
    `;

    const filterBarHtml = `
      <div class="filter-bar">
        <!-- In-page resource search -->
        <div style="flex: 1; min-width: 180px;">
          <input 
            type="text" 
            class="input-field" 
            style="padding: 0.35rem 0.65rem; font-size: 0.8rem;" 
            placeholder="Filter nama lab / catatan..." 
            value="${escapeHtml(filters.search)}" 
            oninput="ResourcesPage.setSearch(this.value)"
          >
        </div>

        <div class="filter-group">
          <label class="form-label" style="margin:0;">Domain:</label>
          <select class="select-field" style="width: auto; padding: 0.3rem 0.6rem; font-size: 0.8rem;" onchange="ResourcesPage.setFilter('domain', this.value)">
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
          <select class="select-field" style="width: auto; padding: 0.3rem 0.6rem; font-size: 0.8rem;" onchange="ResourcesPage.setFilter('week', this.value)">
            <option value="all" ${filters.week === 'all' ? 'selected' : ''}>Semua Minggu</option>
            <option value="1" ${filters.week === '1' ? 'selected' : ''}>Minggu 1</option>
            <option value="2" ${filters.week === '2' ? 'selected' : ''}>Minggu 2</option>
            <option value="3" ${filters.week === '3' ? 'selected' : ''}>Minggu 3</option>
            <option value="4" ${filters.week === '4' ? 'selected' : ''}>Minggu 4</option>
            <option value="5" ${filters.week === '5' ? 'selected' : ''}>Minggu 5</option>
            <option value="6" ${filters.week === '6' ? 'selected' : ''}>Minggu 6</option>
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
      groupsHtml += renderGroupSection('Materi Rujukan & Panduan Arsitektur', grouped['umum']);
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
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.75rem; flex-wrap: wrap; gap: 0.5rem;">
          <div>
            <h1 style="font-size: 1.35rem; font-weight: 800; color: var(--text-main);">Perpustakaan Sumber Belajar</h1>
            <div class="card-subtitle">Lab hands-on Microsoft Learn terverifikasi, materi resmi, dan dokumen arsitektur</div>
          </div>
          <div style="font-size: 0.85rem; color: var(--text-muted);">
            Menampilkan <strong>${filtered.length}</strong> dari <strong>${resources.length}</strong> sumber
          </div>
        </div>

        ${chipsHtml}
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

  function setChip(chipKey) {
    filters.chip = chipKey;
    const container = document.getElementById('main-content');
    if (container) render(container);
  }

  function setFilter(key, val) {
    filters[key] = val;
    const container = document.getElementById('main-content');
    if (container) render(container);
  }

  function setSearch(query) {
    filters.search = query;
    const container = document.getElementById('main-content');
    if (container) render(container);
  }

  function updateStatus(id, status) {
    Store.updateResource(id, { status });
    App.toast('✓ Status sumber berhasil diperbarui', 'success', 1800);
  }

  function updateRating(id, ratingVal) {
    const rating = ratingVal ? Number(ratingVal) : null;
    Store.updateResource(id, { rating });
    App.toast('✓ Rating berhasil disimpan', 'success', 1800);
  }

  function updateNote(id, note) {
    Store.updateResource(id, { note });
    App.toast('✓ Catatan singkat tersimpan', 'success', 1800);
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
              <option value="umum">Umum / Rujukan</option>
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
    const weekVal = document.getElementById('new-res-week').value;
    const week = weekVal === 'umum' ? 'umum' : Number(weekVal);
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
    App.toast('✓ Sumber belajar baru berhasil ditambahkan!', 'success');
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
    setChip,
    setFilter,
    setSearch,
    updateStatus,
    updateRating,
    updateNote,
    openAddModal,
    handleAddSubmit
  };
})();

window.ResourcesPage = ResourcesPage;
