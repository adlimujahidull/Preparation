/**
 * pages/learn.js — Halaman "Belajar" (27 Objective Resmi AI-200 & 3-Step Guided Study)
 */

const LearnPage = (() => {
  let activeObjId = 'obj-01';
  let filters = {
    domain: 'all',
    status: 'all',
    search: ''
  };

  function render(container) {
    const objectives = Store.getObjectives();

    // Check if URL hash has specific obj parameter (e.g. #learn?obj=obj-05)
    const hashParts = window.location.hash.split('?');
    if (hashParts.length > 1) {
      const params = new URLSearchParams(hashParts[1]);
      const requestedId = params.get('obj');
      if (requestedId && objectives.some(o => o.id === requestedId)) {
        activeObjId = requestedId;
      }
    }

    // Filter objectives
    const filtered = objectives.filter(o => {
      if (filters.domain !== 'all' && o.domain !== filters.domain) return false;
      if (filters.status !== 'all' && o.status !== filters.status) return false;
      if (filters.search) {
        const q = filters.search.toLowerCase();
        const textMatch = o.text.toLowerCase().includes(q);
        const idMatch = o.id.toLowerCase().includes(q);
        const subMatch = o.subgroup && o.subgroup.toLowerCase().includes(q);
        const introMatch = o.intro && o.intro.toLowerCase().includes(q);
        if (!textMatch && !idMatch && !subMatch && !introMatch) return false;
      }
      return true;
    });

    // Ensure activeObjId is valid in list, or fallback
    let currentObj = objectives.find(o => o.id === activeObjId);
    if (!currentObj && objectives.length > 0) {
      currentObj = objectives[0];
      activeObjId = currentObj.id;
    }

    // Calculate overall stats
    const totalCount = objectives.length;
    const completedCount = objectives.filter(o => o.status === 'selesai').length;
    const inProgressCount = objectives.filter(o => o.status === 'sedang').length;
    const unstartedCount = objectives.filter(o => o.status === 'belum').length;
    const grandMinutes = objectives.reduce((acc, o) => acc + (o.read_minutes || 0), 0);
    const grandHours = (grandMinutes / 60).toFixed(1);

    // Render Sidebar Objective Items
    const sidebarHtml = filtered.length === 0 ? `
      <div style="padding: 2rem 1rem; text-align: center; color: var(--text-dim);">
        Tidak ada objective yang cocok dengan filter.
      </div>
    ` : filtered.map(o => {
      const isActive = o.id === activeObjId;
      let statusBadgeClass = 'status-badge-belum';
      let statusIcon = '⏳';
      if (o.status === 'selesai') {
        statusBadgeClass = 'status-badge-selesai';
        statusIcon = '✅';
      } else if (o.status === 'sedang') {
        statusBadgeClass = 'status-badge-sedang';
        statusIcon = '🔥';
      }

      return `
        <div 
          class="learn-item-card ${isActive ? 'active' : ''}" 
          onclick="LearnPage.selectObjective('${o.id}')"
        >
          <div class="learn-item-top">
            <span class="learn-item-id">${o.id}</span>
            <span class="learn-item-badge ${statusBadgeClass}">${statusIcon} ${o.status}</span>
            <span class="learn-item-time" title="Estimasi waktu membaca">⏱️ ${o.read_minutes}m</span>
          </div>
          <div class="learn-item-text">${escapeHtml(o.text)}</div>
          <div class="learn-item-meta">${escapeHtml(o.subgroup || o.domain)}</div>
        </div>
      `;
    }).join('');

    // Active Objective Detail
    let detailHtml = '';
    if (currentObj) {
      const currentIndex = objectives.findIndex(o => o.id === currentObj.id);
      const prevObj = currentIndex > 0 ? objectives[currentIndex - 1] : null;
      const nextObj = currentIndex < objectives.length - 1 ? objectives[currentIndex + 1] : null;

      // Render Step 1 Baca Cards
      const readCardsHtml = currentObj.read && currentObj.read.length > 0 ? currentObj.read.map(r => `
        <div class="read-material-card">
          <div class="read-card-header">
            <span class="badge badge-type badge-${r.type || 'how-to'}">${(r.type || 'how-to').toUpperCase()}</span>
            <span class="badge-read-minutes">⏱️ ${r.minutes} Menit Baca</span>
          </div>
          
          <h4 class="read-material-title">${escapeHtml(r.title)}</h4>
          
          <div class="read-material-section">
            <span class="section-icon">🎯</span>
            <span class="section-label">Target Bagian:</span>
            <span class="section-value"><em>"${escapeHtml(r.section)}"</em></span>
          </div>

          <div class="read-material-covers">
            <span class="covers-title">Mencakup Istilah:</span>
            <div class="covers-tags">
              ${(r.covers || []).map(c => `<span class="tag-chip">${escapeHtml(c)}</span>`).join('')}
            </div>
          </div>

          <div class="read-material-action">
            <a href="${r.url}" target="_blank" rel="noopener noreferrer" class="btn btn-primary btn-sm read-direct-btn">
              Buka Materi di Microsoft Learn ↗
            </a>
          </div>
        </div>
      `).join('') : `
        <div class="read-empty-card">
          Belum ada tautan bacaan resmi yang lolos uji untuk objective ini.
        </div>
      `;

      // Render Step 2 Lab list
      const labUrlsHtml = currentObj.lab_urls && currentObj.lab_urls.length > 0 ? `
        <div class="lab-urls-list">
          ${currentObj.lab_urls.map(u => `
            <div class="lab-url-item">
              <a href="${u}" target="_blank" rel="noopener noreferrer" class="task-link">🔗 ${escapeHtml(u)} &rarr;</a>
            </div>
          `).join('')}
        </div>
      ` : `
        <div style="font-size: 0.85rem; color: var(--text-dim); margin-bottom: 0.75rem;">
          Belum ada lab eksternal yang ditautkan. Kerjakan hands-on secara mandiri di subscription Azure atau Docker lokal.
        </div>
      `;

      detailHtml = `
        <div class="learn-detail-container">
          <!-- Objective Header -->
          <div class="learn-obj-header-card">
            <div class="learn-obj-breadcrumb">
              <span>${escapeHtml(currentObj.domain)}</span> &rsaquo; <span>${escapeHtml(currentObj.subgroup)}</span>
            </div>
            
            <div class="learn-obj-title-row">
              <span class="learn-obj-badge">${currentObj.id}</span>
              <h2 class="learn-obj-title">${escapeHtml(currentObj.text)}</h2>
            </div>

            <!-- Quick Status and Confidence Controls -->
            <div class="learn-status-bar">
              <div class="status-control-group">
                <span class="control-label">Status:</span>
                <button class="btn-status-pill ${currentObj.status === 'belum' ? 'active belum' : ''}" onclick="LearnPage.updateStatus('${currentObj.id}', 'belum')">
                  ⏳ Belum
                </button>
                <button class="btn-status-pill ${currentObj.status === 'sedang' ? 'active sedang' : ''}" onclick="LearnPage.updateStatus('${currentObj.id}', 'sedang')">
                  🔥 Sedang
                </button>
                <button class="btn-status-pill ${currentObj.status === 'selesai' ? 'active selesai' : ''}" onclick="LearnPage.updateStatus('${currentObj.id}', 'selesai')">
                  ✅ Selesai
                </button>
              </div>

              <div class="confidence-control-group">
                <span class="control-label">Tingkat Keyakinan (0-5):</span>
                <div class="confidence-stars">
                  ${[0, 1, 2, 3, 4, 5].map(score => `
                    <button 
                      class="star-btn ${currentObj.confidence >= score && score > 0 ? 'star-filled' : (score === 0 && currentObj.confidence === 0 ? 'star-zero' : '')}" 
                      onclick="LearnPage.updateConfidence('${currentObj.id}', ${score})"
                      title="Skor keyakinan ${score}/5"
                    >
                      ${score === 0 ? '0' : '★'}
                    </button>
                  `).join('')}
                </div>
              </div>
            </div>
          </div>

          <!-- INTRO (Paragraf Pengantar di Atas Tiga Langkah) -->
          <div class="learn-intro-banner">
            <div class="learn-intro-badge">
              <span>💡 PENGANTAR OBJECTIVE</span>
            </div>
            <p class="learn-intro-paragraph">
              ${escapeHtml(currentObj.intro || 'Pelajari objective resmi ini sesuai panduan Microsoft Learn terverifikasi.')}
            </p>
          </div>

          <!-- READ NOTE (Peringatan Kuning jika ada isinya) -->
          ${currentObj.read_note ? `
            <div class="learn-warning-banner">
              <div class="warning-icon">⚠️</div>
              <div class="warning-content">
                <div class="warning-title">Catatan Cakupan Materi</div>
                <div class="warning-text">${escapeHtml(currentObj.read_note)}</div>
              </div>
            </div>
          ` : ''}

          <!-- TIGA LANGKAH BELAJAR -->
          <div class="learn-three-steps">

            <!-- LANGKAH 1: BACA -->
            <div class="step-card">
              <div class="step-card-header">
                <div class="step-number-circle">1</div>
                <div class="step-info">
                  <h3 class="step-heading">Langkah 1: Baca — Materi Microsoft Learn</h3>
                  <div class="step-subheading">Pelajari langsung bagian materi yang diuji tanpa pengantar basa-basi</div>
                </div>
                <div class="step-minutes-badge">
                  ⏱️ <strong>${currentObj.read_minutes}</strong> Menit Total
                </div>
              </div>

              <div class="step-card-body">
                <div class="read-materials-grid">
                  ${readCardsHtml}
                </div>
              </div>
            </div>

            <!-- LANGKAH 2: PRAKTIK -->
            <div class="step-card">
              <div class="step-card-header">
                <div class="step-number-circle">2</div>
                <div class="step-info">
                  <h3 class="step-heading">Langkah 2: Praktik — Hands-on Lab Mandiri</h3>
                  <div class="step-subheading">Tulis kode sendiri di folder <code>week-*/</code>. Jangan menyalin solusi agar memahami proses debug.</div>
                </div>
              </div>

              <div class="step-card-body">
                ${labUrlsHtml}
                <div class="step-action-row">
                  <button class="btn btn-secondary btn-sm" onclick="App.openQuickLabModal('${escapeHtml(currentObj.text)}')">
                    🧪 Catat Lab Baru untuk Objective Ini
                  </button>
                  <a href="#resources" class="btn btn-ghost btn-sm">
                    Lihat Direktori Lab Sumber &rarr;
                  </a>
                </div>
              </div>
            </div>

            <!-- LANGKAH 3: EVALUASI & HAFALAN -->
            <div class="step-card">
              <div class="step-card-header">
                <div class="step-number-circle">3</div>
                <div class="step-info">
                  <h3 class="step-heading">Langkah 3: Evaluasi & Penguatan — SRS & Keputusan</h3>
                  <div class="step-subheading">Uji trade-off arsitektur dan retensi istilah sebelum ujian</div>
                </div>
              </div>

              <div class="step-card-body">
                <p style="font-size: 0.9rem; color: var(--text-muted); margin-bottom: 1rem;">
                  Setelah membaca dan mencoba lab, uji ingatanmu dengan kartu hafalan (SRS) atau periksa apakah kamu sudah bisa mengisi tabel perbandingan keputusan untuk layanan terkait.
                </p>
                <div class="step-action-row">
                  <a href="#drill" class="btn btn-primary btn-sm">
                    ⚡ Mulai Sesi Drill Hafalan
                  </a>
                  <a href="#decisions" class="btn btn-secondary btn-sm">
                    ⚖️ Buka Tabel Keputusan
                  </a>
                  <button class="btn btn-ghost btn-sm" onclick="App.openQuickCardModal('${escapeHtml(currentObj.id + ': ' + currentObj.text)}')">
                    💡 Tambah Kartu Hafalan Baru
                  </button>
                </div>
              </div>
            </div>

          </div>

          <!-- Bottom Navigation Next / Prev -->
          <div class="learn-nav-footer">
            ${prevObj ? `
              <button class="btn btn-secondary" onclick="LearnPage.selectObjective('${prevObj.id}')">
                &larr; ${prevObj.id}: ${escapeHtml(prevObj.text.slice(0, 32))}...
              </button>
            ` : '<div></div>'}

            ${nextObj ? `
              <button class="btn btn-primary" onclick="LearnPage.selectObjective('${nextObj.id}')">
                ${nextObj.id}: ${escapeHtml(nextObj.text.slice(0, 32))}... &rarr;
              </button>
            ` : '<div></div>'}
          </div>
        </div>
      `;
    }

    container.innerHTML = `
      <div class="page-container learn-page-wrapper">
        <!-- Top Summary Bar -->
        <div class="card learn-summary-card">
          <div class="learn-summary-content">
            <div>
              <h1 class="learn-main-title">🎯 Belajar Objective AI-200</h1>
              <p class="learn-main-desc">
                27 objective resmi Microsoft Azure AI-200 dipetakan langsung ke unit Microsoft Learn terverifikasi HTTP 200.
              </p>
            </div>
            <div class="learn-stat-badges">
              <div class="learn-stat-item">
                <div class="stat-number">${totalCount}</div>
                <div class="stat-label">Objective Resmi</div>
              </div>
              <div class="learn-stat-item">
                <div class="stat-number" style="color: var(--azure-blue);">${grandMinutes}m</div>
                <div class="stat-label">~${grandHours} Jam Bacaan</div>
              </div>
              <div class="learn-stat-item">
                <div class="stat-number" style="color: var(--accent-green);">${completedCount}</div>
                <div class="stat-label">Selesai</div>
              </div>
              <div class="learn-stat-item">
                <div class="stat-number" style="color: var(--accent-yellow);">${inProgressCount}</div>
                <div class="stat-label">Sedang Belajar</div>
              </div>
            </div>
          </div>

          <!-- Filter & Search Controls -->
          <div class="learn-filter-toolbar">
            <div class="learn-search-box">
              <input 
                type="text" 
                class="input-field" 
                placeholder="Cari teks objective, layanan, atau kata kunci..." 
                value="${escapeHtml(filters.search)}"
                oninput="LearnPage.setSearch(this.value)"
              >
            </div>

            <div class="learn-filter-selects">
              <select class="select-field" onchange="LearnPage.setDomain(this.value)">
                <option value="all" ${filters.domain === 'all' ? 'selected' : ''}>Semua Domain (27)</option>
                <option value="Develop containerized solutions on Azure" ${filters.domain === 'Develop containerized solutions on Azure' ? 'selected' : ''}>1. Container Solutions (7)</option>
                <option value="Develop AI solutions by using Azure data management services" ${filters.domain === 'Develop AI solutions by using Azure data management services' ? 'selected' : ''}>2. Data Management (12)</option>
                <option value="Connect to and consume Azure services" ${filters.domain === 'Connect to and consume Azure services' ? 'selected' : ''}>3. Connect Services (4)</option>
                <option value="Secure, monitor, and troubleshoot Azure solutions" ${filters.domain === 'Secure, monitor, and troubleshoot Azure solutions' ? 'selected' : ''}>4. Security & Ops (4)</option>
              </select>

              <select class="select-field" onchange="LearnPage.setStatus(this.value)">
                <option value="all" ${filters.status === 'all' ? 'selected' : ''}>Semua Status</option>
                <option value="belum" ${filters.status === 'belum' ? 'selected' : ''}>⏳ Belum (${unstartedCount})</option>
                <option value="sedang" ${filters.status === 'sedang' ? 'selected' : ''}>🔥 Sedang (${inProgressCount})</option>
                <option value="selesai" ${filters.status === 'selesai' ? 'selected' : ''}>✅ Selesai (${completedCount})</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Master-Detail Layout -->
        <div class="learn-workspace-layout">
          <!-- Left Sidebar List -->
          <aside class="learn-sidebar">
            <div class="learn-sidebar-header">
              Daftar Objective (${filtered.length})
            </div>
            <div class="learn-sidebar-list">
              ${sidebarHtml}
            </div>
          </aside>

          <!-- Right Content Area -->
          <section class="learn-content-area">
            ${detailHtml}
          </section>
        </div>
      </div>
    `;
  }

  function selectObjective(id) {
    activeObjId = id;
    window.location.hash = `#learn?obj=${id}`;
    const container = document.getElementById('main-content');
    if (container) render(container);
    window.scrollTo({ top: 180, behavior: 'smooth' });
  }

  function setSearch(val) {
    filters.search = val;
    const container = document.getElementById('main-content');
    if (container) render(container);
  }

  function setDomain(val) {
    filters.domain = val;
    const container = document.getElementById('main-content');
    if (container) render(container);
  }

  function setStatus(val) {
    filters.status = val;
    const container = document.getElementById('main-content');
    if (container) render(container);
  }

  function updateStatus(id, status) {
    Store.updateObjectiveStatus(id, status, undefined);
    const container = document.getElementById('main-content');
    if (container) render(container);
  }

  function updateConfidence(id, conf) {
    Store.updateObjectiveStatus(id, undefined, conf);
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
    selectObjective,
    setSearch,
    setDomain,
    setStatus,
    updateStatus,
    updateConfidence
  };
})();

window.LearnPage = LearnPage;
