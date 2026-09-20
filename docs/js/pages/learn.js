/**
 * pages/learn.js — Halaman "Belajar" (27 Objective Resmi AI-200, 6-Week Filter, & 3-Step Guided Study)
 * Mengimplementasikan A3 (3-Step State Machine), A4 (Filter Minggu & Domain Ratio),
 * B2 (Pembuktian Kuasai via Explanation S4), dan B4 (Tautan Catatan).
 */

const LearnPage = (() => {
  let activeObjId = 'obj-01';
  let selectedWeek = null; // null = Semua, or 1..6
  let searchFilter = '';
  let editingExplanation = false;

  function calculateCurrentWeek() {
    const plan = Store.getPlan();
    if (plan.weeks && plan.weeks.length > 0) {
      for (const w of plan.weeks) {
        if (w.tasks && w.tasks.some(t => !t.done)) {
          return w.n;
        }
      }
    }
    return 1;
  }

  function render(container) {
    const objectives = Store.getObjectives();
    const currentWeekNum = calculateCurrentWeek();

    // Default to current week if first load
    if (selectedWeek === null) {
      selectedWeek = currentWeekNum;
    }

    // Check URL parameter e.g. #learn?obj=obj-05 or #learn?obj=o05
    const hashParts = window.location.hash.split('?');
    if (hashParts.length > 1) {
      const params = new URLSearchParams(hashParts[1]);
      const reqId = params.get('obj');
      if (reqId) {
        const found = Store.getObjectiveById(reqId);
        if (found) {
          activeObjId = found.id;
        }
      }
    }

    // Filter objectives:
    // If selectedWeek is a number, we show all objectives up to selectedWeek normally,
    // but future objectives (o.week > selectedWeek) are rendered DIMMED with a week badge (A4).
    // If selectedWeek === 'all', all 27 are rendered without dimming (V3).
    const filtered = objectives.filter(o => {
      if (searchFilter) {
        const q = searchFilter.toLowerCase();
        const tMatch = o.text.toLowerCase().includes(q);
        const idMatch = o.id.toLowerCase().includes(q) || o.id.toLowerCase().replace('obj-', 'o').includes(q);
        const subMatch = o.subgroup && o.subgroup.toLowerCase().includes(q);
        if (!tMatch && !idMatch && !subMatch) return false;
      }
      return true;
    });

    // Ensure activeObjId is valid in list
    let currentObj = objectives.find(o => o.id === activeObjId);
    if (!currentObj && objectives.length > 0) {
      currentObj = objectives[0];
      activeObjId = currentObj.id;
    }

    // Progress per Domain (A4): Rasio objective kuasai dibanding total objective domain itu
    const domains = [
      { key: 'containers', label: 'Containers' },
      { key: 'data', label: 'Data' },
      { key: 'integration', label: 'Integration' },
      { key: 'ops', label: 'Security & Ops' }
    ];

    const domainProgressHtml = domains.map(d => {
      const domainObjs = objectives.filter(o => o.domain === d.key);
      const total = domainObjs.length;
      const kuasai = domainObjs.filter(o => o.status === 'kuasai').length;
      const pct = total > 0 ? Math.round((kuasai / total) * 100) : 0;
      return `
        <div class="domain-prog-card" style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 0.5rem 0.75rem; flex: 1; min-width: 140px;">
          <div style="display: flex; justify-content: space-between; font-size: 0.75rem; font-weight: 600; color: var(--text-muted); margin-bottom: 0.25rem;">
            <span>${d.label}</span>
            <span>${kuasai}/${total} (${pct}%)</span>
          </div>
          <div style="background: var(--bg-main); height: 5px; border-radius: 9999px; overflow: hidden;">
            <div style="width: ${pct}%; height: 100%; background: var(--azure-blue); border-radius: 9999px;"></div>
          </div>
        </div>
      `;
    }).join('');

    // Week Filter Bar (A4)
    const weekButtonsHtml = [
      { id: 'all', label: 'Semua (27)' },
      { id: 1, label: 'Minggu 1' },
      { id: 2, label: 'Minggu 2' },
      { id: 3, label: 'Minggu 3' },
      { id: 4, label: 'Minggu 4' },
      { id: 5, label: 'Minggu 5' },
      { id: 6, label: 'Minggu 6' }
    ].map(w => {
      const isAct = selectedWeek === w.id;
      const isCur = w.id === currentWeekNum;
      return `
        <button 
          class="btn ${isAct ? 'btn-primary' : 'btn-secondary'} btn-sm" 
          onclick="LearnPage.selectWeek('${w.id}')"
          style="font-size: 0.8rem; padding: 0.35rem 0.75rem; position: relative;"
        >
          ${w.label} ${isCur ? '•' : ''}
        </button>
      `;
    }).join('');

    // Render Sidebar Objective Items
    const sidebarHtml = filtered.length === 0 ? `
      <div style="padding: 2rem 1rem; text-align: center; color: var(--text-dim);">
        Tidak ada objective yang cocok dengan pencarian.
      </div>
    ` : filtered.map(o => {
      const isActive = o.id === activeObjId;
      const oWeek = o.week || 2;
      const isFuture = (typeof selectedWeek === 'number') && (oWeek > selectedWeek);

      let statusBadgeClass = 'status-badge-belum';
      let statusIcon = '⏳';
      if (o.status === 'kuasai') {
        statusBadgeClass = 'status-badge-kuasai';
        statusIcon = '🏆';
      } else if (o.status === 'dipraktikkan') {
        statusBadgeClass = 'status-badge-dipraktikkan';
        statusIcon = '🧪';
      } else if (o.status === 'dibaca') {
        statusBadgeClass = 'status-badge-dibaca';
        statusIcon = '📖';
      }

      return `
        <div 
          class="learn-item-card ${isActive ? 'active' : ''} ${isFuture ? 'dimmed-future' : ''}" 
          onclick="LearnPage.selectObjective('${o.id}')"
          style="${isFuture ? 'opacity: 0.55; filter: grayscale(0.2);' : ''}"
        >
          <div class="learn-item-top" style="display: flex; align-items: center; justify-content: space-between; gap: 0.4rem;">
            <span class="learn-item-id" style="font-weight: 700;">${o.id.replace('obj-', 'o')}</span>
            <div style="display: flex; gap: 0.3rem; align-items: center;">
              ${isFuture ? `<span class="badge badge-lab" style="font-size: 0.65rem; padding: 0.1rem 0.35rem;">Minggu ${oWeek}</span>` : ''}
              <span class="learn-item-badge ${statusBadgeClass}">${statusIcon} ${o.status}</span>
            </div>
          </div>
          <div class="learn-item-text" style="margin-top: 0.25rem;">${escapeHtml(o.text)}</div>
          <div class="learn-item-meta" style="margin-top: 0.25rem; display: flex; justify-content: space-between;">
            <span>${escapeHtml(o.subgroup || o.domain)}</span>
            <span>⏱️ ${o.read_minutes}m</span>
          </div>
        </div>
      `;
    }).join('');

    // Active Objective Detail Pane
    let detailHtml = '';
    if (currentObj) {
      const oNorm = currentObj.id.replace('obj-', 'o');
      const currentIndex = objectives.findIndex(o => o.id === currentObj.id);
      const prevObj = currentIndex > 0 ? objectives[currentIndex - 1] : null;
      const nextObj = currentIndex < objectives.length - 1 ? objectives[currentIndex + 1] : null;

      // Check linked note (B4)
      const notes = Store.getNotes();
      let linkedNoteName = null;
      Object.entries(notes).forEach(([nName, nObj]) => {
        if (!linkedNoteName) {
          const content = nObj.content || '';
          const match = content.match(/^---\s*\n([\s\S]*?)\n---/);
          if (match) {
            const objMatch = match[1].match(/objective:\s*([^\n]+)/);
            if (objMatch) {
              const val = objMatch[1].trim().toLowerCase();
              if (val === currentObj.id.toLowerCase() || val === oNorm.toLowerCase()) {
                linkedNoteName = nName;
              }
            }
          } else if (nName.startsWith(`${oNorm}-`) || nName.startsWith(`${currentObj.id}-`)) {
            linkedNoteName = nName;
          }
        }
      });

      // Render Step 1 Baca Cards
      const readCardsHtml = (currentObj.read && currentObj.read.length > 0) ? currentObj.read.map(r => `
        <div class="read-material-card" style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 0.85rem 1rem; margin-bottom: 0.75rem;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 0.5rem; margin-bottom: 0.4rem;">
            <h4 style="font-size: 0.95rem; font-weight: 600; color: var(--text-main); margin: 0;">
              ${escapeHtml(r.title)}
            </h4>
            <span class="badge-read-minutes" style="white-space: nowrap; font-size: 0.75rem; color: var(--text-dim); background: var(--bg-main); padding: 0.15rem 0.45rem; border-radius: 4px; border: 1px solid var(--border-color);">
              ⏱️ ${r.minutes} Menit
            </span>
          </div>

          <div style="font-size: 0.825rem; color: var(--azure-blue); font-weight: 500; margin-bottom: 0.5rem;">
            Target Bagian: <em>"${escapeHtml(r.section)}"</em>
          </div>

          ${r.covers && r.covers.length > 0 ? `
            <div style="display: flex; flex-wrap: wrap; gap: 0.35rem; margin-bottom: 0.75rem;">
              ${r.covers.map(c => `<span class="tag-chip" style="font-size: 0.7rem; background: var(--bg-main); border: 1px solid var(--border-color); padding: 0.1rem 0.4rem; border-radius: 3px;">${escapeHtml(c)}</span>`).join('')}
            </div>
          ` : ''}

          <div>
            <a href="${r.url}" target="_blank" rel="noopener noreferrer" class="btn btn-secondary btn-sm" style="font-size: 0.8rem; padding: 0.3rem 0.65rem;">
              Buka di Microsoft Learn ↗
            </a>
          </div>
        </div>
      `).join('') : `
        <div style="padding: 1rem; color: var(--text-dim); font-size: 0.85rem; font-style: italic;">
          Belum ada tautan bacaan terverifikasi untuk objective ini.
        </div>
      `;

      // Render Step 2 Lab list
      const labUrlsHtml = (currentObj.lab_urls && currentObj.lab_urls.length > 0) ? `
        <div style="display: flex; flex-direction: column; gap: 0.4rem; margin-bottom: 1rem;">
          ${currentObj.lab_urls.map(u => `
            <div style="background: var(--bg-main); padding: 0.5rem 0.75rem; border-radius: var(--radius-sm); border: 1px solid var(--border-color); font-size: 0.85rem;">
              <a href="${u}" target="_blank" rel="noopener noreferrer" style="color: var(--azure-blue); text-decoration: underline; word-break: break-all;">
                🔗 ${escapeHtml(u)} &rarr;
              </a>
            </div>
          `).join('')}
        </div>
      ` : `
        <div style="font-size: 0.85rem; color: var(--text-dim); margin-bottom: 1rem;">
          Belum ada tautan lab resmi. Tulis kode sendiri di folder <code>week-*/</code>.
        </div>
      `;

      // Step Status Machine states
      const isBelum = currentObj.status === 'belum';
      const isDibaca = currentObj.status === 'dibaca';
      const isDipraktikkan = currentObj.status === 'dipraktikkan';
      const isKuasai = currentObj.status === 'kuasai';

      detailHtml = `
        <div class="learn-detail-container">
          <!-- Header Card -->
          <div class="learn-obj-header-card" style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 1.25rem; margin-bottom: 1.25rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; flex-wrap: wrap; gap: 0.5rem;">
              <div style="font-size: 0.8rem; color: var(--text-muted);">
                ${escapeHtml(currentObj.domain.toUpperCase())} &rsaquo; ${escapeHtml(currentObj.subgroup || '')} • Minggu ${currentObj.week || 2}
              </div>
              
              <!-- Discrete Action Controls (A3): Lewati & Turunkan -->
              <div style="display: flex; align-items: center; gap: 0.4rem;">
                <button 
                  class="btn btn-ghost btn-sm" 
                  style="font-size: 0.75rem; padding: 0.2rem 0.5rem; color: var(--text-dim);" 
                  onclick="LearnPage.handleSkipStep('${currentObj.id}')"
                  title="Lompat ke status berikutnya secara sengaja"
                >
                  Lewati langkah ini &rarr;
                </button>
                <button 
                  class="btn btn-ghost btn-sm" 
                  style="font-size: 0.75rem; padding: 0.2rem 0.5rem; color: var(--text-dim);" 
                  onclick="LearnPage.handleDemoteStep('${currentObj.id}')"
                  title="Turunkan status satu tingkat ke belakang"
                >
                  &larr; Turunkan status
                </button>
              </div>
            </div>

            <div style="display: flex; align-items: baseline; gap: 0.75rem; margin-bottom: 0.75rem;">
              <span class="badge badge-lab" style="font-size: 0.95rem; font-weight: 700; padding: 0.25rem 0.6rem;">${oNorm}</span>
              <h2 style="font-size: 1.2rem; font-weight: 700; margin: 0; color: var(--text-main);">${escapeHtml(currentObj.text)}</h2>
            </div>

            <!-- Current Status Badge & Linked Note Bar (B4) -->
            <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.75rem; padding-top: 0.75rem; border-top: 1px solid var(--border-subtle);">
              <div style="display: flex; align-items: center; gap: 0.5rem;">
                <span style="font-size: 0.85rem; color: var(--text-muted);">Status Saat Ini:</span>
                <span class="badge ${isKuasai ? 'badge-recall' : (isDipraktikkan ? 'badge-lab' : (isDibaca ? 'badge-type' : 'badge-decision'))}" style="font-weight: 700; text-transform: uppercase;">
                  ${currentObj.status}
                </span>
                ${currentObj.confidence ? `
                  <span style="font-size: 0.85rem; color: var(--accent-yellow); margin-left: 0.5rem;">
                    ★ ${currentObj.confidence}/5
                  </span>
                ` : ''}
              </div>

              <!-- Note Link (B4) -->
              <div>
                ${linkedNoteName ? `
                  <a href="#notes?file=${encodeURIComponent(linkedNoteName)}" class="btn btn-secondary btn-sm" style="font-size: 0.8rem; padding: 0.25rem 0.65rem;">
                    📝 Buka Catatan: ${escapeHtml(linkedNoteName)} &rarr;
                  </a>
                ` : `
                  <button class="btn btn-secondary btn-sm" style="font-size: 0.8rem; padding: 0.25rem 0.65rem;" onclick="NotesPage.openNewNoteModal('${oNorm}', '${escapeHtml(currentObj.text)}')">
                    ✍️ Tulis Catatan
                  </button>
                `}
              </div>
            </div>
          </div>

          <!-- INTRO (Paragraf Pengantar di Atas Tiga Langkah) -->
          <div style="background: var(--bg-card); border-left: 4px solid var(--azure-blue); border-radius: var(--radius-sm); padding: 0.85rem 1rem; margin-bottom: 1.25rem; font-size: 0.875rem; line-height: 1.5;">
            <div style="font-weight: 700; font-size: 0.8rem; color: var(--azure-blue); margin-bottom: 0.25rem; text-transform: uppercase;">
              Pengantar Objective
            </div>
            <p style="margin: 0; color: var(--text-main);">
              ${escapeHtml(currentObj.intro || 'Pelajari objective resmi ini sesuai panduan Microsoft Learn terverifikasi.')}
            </p>
          </div>

          <!-- READ NOTE (Peringatan Kuning jika ada isinya) -->
          ${currentObj.read_note ? `
            <div style="background: var(--accent-yellow-bg); border: 1px solid var(--accent-yellow-border); color: #92400e; border-radius: var(--radius-sm); padding: 0.75rem 1rem; margin-bottom: 1.25rem; font-size: 0.85rem; display: flex; gap: 0.6rem; align-items: flex-start;">
              <span style="font-size: 1.1rem;">⚠️</span>
              <div>
                <strong style="display: block; margin-bottom: 0.15rem;">Catatan Cakupan Materi:</strong>
                <span>${escapeHtml(currentObj.read_note)}</span>
              </div>
            </div>
          ` : ''}

          <!-- TIGA LANGKAH BELAJAR (A3 Mesin Status) -->
          <div class="learn-three-steps" style="display: flex; flex-direction: column; gap: 1.25rem;">

            <!-- LANGKAH 1: BACA -->
            <div class="step-card" style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 1.25rem;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; flex-wrap: wrap; gap: 0.5rem;">
                <div style="display: flex; align-items: center; gap: 0.6rem;">
                  <span class="badge ${!isBelum ? 'badge-recall' : 'badge-lab'}" style="font-weight: 700; font-size: 0.85rem; width: 26px; height: 26px; display: inline-flex; align-items: center; justify-content: center; border-radius: 50%;">1</span>
                  <h3 style="font-size: 1.05rem; font-weight: 700; margin: 0; color: var(--text-main);">Langkah 1: Baca Materi</h3>
                </div>
                <div>
                  ${isBelum ? `
                    <button class="btn btn-primary btn-sm" onclick="LearnPage.advance('${currentObj.id}')">
                      ✓ Tandai Langkah 1 Selesai
                    </button>
                  ` : `
                    <span style="color: var(--accent-green); font-size: 0.85rem; font-weight: 600;">
                      ✓ Selesai Dibaca
                    </span>
                  `}
                </div>
              </div>

              <div>
                ${readCardsHtml}
              </div>
            </div>

            <!-- LANGKAH 2: PRAKTIK (Terkunci saat belum) -->
            <div class="step-card" style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 1.25rem; ${isBelum ? 'opacity: 0.6;' : ''}">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; flex-wrap: wrap; gap: 0.5rem;">
                <div style="display: flex; align-items: center; gap: 0.6rem;">
                  <span class="badge ${(isDipraktikkan || isKuasai) ? 'badge-recall' : 'badge-lab'}" style="font-weight: 700; font-size: 0.85rem; width: 26px; height: 26px; display: inline-flex; align-items: center; justify-content: center; border-radius: 50%;">2</span>
                  <h3 style="font-size: 1.05rem; font-weight: 700; margin: 0; color: var(--text-main);">Langkah 2: Praktik (Hands-on Lab)</h3>
                </div>
                <div>
                  ${isBelum ? `
                    <button class="btn btn-secondary btn-sm" disabled style="cursor: not-allowed; opacity: 0.6;" title="Selesaikan langkah 1 terlebih dahulu">
                      🔒 Terkunci (Selesaikan Langkah 1)
                    </button>
                  ` : (isDibaca ? `
                    <button class="btn btn-primary btn-sm" onclick="LearnPage.advance('${currentObj.id}')">
                      ✓ Tandai Langkah 2 Selesai
                    </button>
                  ` : `
                    <span style="color: var(--accent-green); font-size: 0.85rem; font-weight: 600;">
                      ✓ Selesai Dipraktikkan
                    </span>
                  `)}
                </div>
              </div>

              <div>
                ${labUrlsHtml}
                <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                  <button class="btn btn-secondary btn-sm" onclick="App.openQuickLabModal('${escapeHtml(currentObj.text)}')">
                    🧪 Catat Log Lab & Resource Group
                  </button>
                </div>
              </div>
            </div>

            <!-- LANGKAH 3: KUASAI (Terkunci saat belum / dibaca; Pembuktian B2 via Explanation S4) -->
            <div class="step-card" style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 1.25rem; ${(isBelum || isDibaca) ? 'opacity: 0.6;' : ''}">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; flex-wrap: wrap; gap: 0.5rem;">
                <div style="display: flex; align-items: center; gap: 0.6rem;">
                  <span class="badge ${isKuasai ? 'badge-recall' : 'badge-lab'}" style="font-weight: 700; font-size: 0.85rem; width: 26px; height: 26px; display: inline-flex; align-items: center; justify-content: center; border-radius: 50%;">3</span>
                  <h3 style="font-size: 1.05rem; font-weight: 700; margin: 0; color: var(--text-main);">Langkah 3: Kuasai & Buktikan Pemahaman</h3>
                </div>
                <div>
                  ${(isBelum || isDibaca) ? `
                    <button class="btn btn-secondary btn-sm" disabled style="cursor: not-allowed; opacity: 0.6;">
                      🔒 Terkunci (Selesaikan Langkah 1 & 2)
                    </button>
                  ` : (isKuasai && !editingExplanation ? `
                    <button class="btn btn-secondary btn-sm" onclick="LearnPage.enableEditExplanation()">
                      ✏️ Ubah Penjelasan
                    </button>
                  ` : '')}
                </div>
              </div>

              ${(isBelum || isDibaca) ? `
                <div style="font-size: 0.85rem; color: var(--text-dim);">
                  Langkah ini akan terbuka setelah Anda menandai langkah 1 dan langkah 2 selesai.
                </div>
              ` : (isKuasai && !editingExplanation ? `
                <div>
                  <div style="background: var(--accent-green-bg); border: 1px solid var(--accent-green-border); border-radius: var(--radius-sm); padding: 0.85rem 1rem; margin-bottom: 1rem;">
                    <div style="font-size: 0.8rem; font-weight: 700; color: var(--accent-green); margin-bottom: 0.35rem;">
                      ✓ Dikuasai pada ${currentObj.explanation_date || 'hari ini'}
                    </div>
                    <div style="font-size: 0.9rem; color: var(--text-main); font-style: italic; line-height: 1.6;">
                      "${escapeHtml(currentObj.explanation || '')}"
                    </div>
                  </div>
                  <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                    <a href="#practice?tab=drill" class="btn btn-primary btn-sm">⚡ Latihan Drill Kartu</a>
                    <a href="#practice?tab=decisions" class="btn btn-secondary btn-sm">⚖️ Tabel Keputusan</a>
                  </div>
                </div>
              ` : `
                <!-- B2 & S4: Form Penjelasan Mandiri -->
                <div>
                  <form onsubmit="LearnPage.handleSubmitKuasai(event, '${currentObj.id}')">
                    <div class="form-group">
                      <label class="form-label" style="font-weight: 600; font-size: 0.9rem; color: var(--text-main);">
                        Jelaskan objective ini dengan kalimatmu sendiri, tanpa membuka apa pun.
                      </label>
                      <textarea 
                        id="explanation-input" 
                        class="textarea-field" 
                        rows="4" 
                        required 
                        placeholder="Tulis minimal 80 karakter penjelasan esensial objective ini sesuai pemahaman pribadimu..."
                        oninput="LearnPage.validateLiveExplanation('${currentObj.id}')"
                      >${escapeHtml(currentObj.explanation || '')}</textarea>
                      <div id="explanation-live-error" style="font-size: 0.8rem; color: var(--accent-red); margin-top: 0.35rem;"></div>
                      <div id="explanation-char-count" style="font-size: 0.75rem; color: var(--text-dim); margin-top: 0.2rem;">
                        0 karakter (minimal 80 karakter)
                      </div>
                    </div>

                    <div class="form-group" style="margin-top: 0.75rem;">
                      <label class="form-label" style="font-size: 0.825rem;">Tingkat Keyakinan Diri (Confidence 1–5)</label>
                      <select id="explanation-confidence" class="select-field" style="width: auto; max-width: 200px;">
                        <option value="5" ${currentObj.confidence === 5 ? 'selected' : ''}>★★★★★ 5 — Sangat Yakin</option>
                        <option value="4" ${currentObj.confidence === 4 ? 'selected' : ''}>★★★★☆ 4 — Yakin</option>
                        <option value="3" ${(!currentObj.confidence || currentObj.confidence === 3) ? 'selected' : ''}>★★★☆☆ 3 — Cukup Paham</option>
                        <option value="2" ${currentObj.confidence === 2 ? 'selected' : ''}>★★☆☆☆ 2 — Kurang Yakin</option>
                        <option value="1" ${currentObj.confidence === 1 ? 'selected' : ''}>★☆☆☆☆ 1 — Masih Ragu</option>
                      </select>
                    </div>

                    <div style="display: flex; gap: 0.5rem; margin-top: 1rem;">
                      <button type="submit" id="btn-submit-kuasai" class="btn btn-primary" disabled>
                        🏆 Simpan & Tandai Kuasai
                      </button>
                      ${editingExplanation ? `
                        <button type="button" class="btn btn-secondary" onclick="LearnPage.cancelEditExplanation()">
                          Batal
                        </button>
                      ` : ''}
                    </div>
                  </form>
                </div>
              `)}
            </div>

          </div>

          <!-- Bottom Navigation Next / Prev -->
          <div class="learn-nav-footer" style="display: flex; justify-content: space-between; margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid var(--border-color);">
            ${prevObj ? `
              <button class="btn btn-secondary" onclick="LearnPage.selectObjective('${prevObj.id}')">
                &larr; ${prevObj.id.replace('obj-', 'o')}: ${escapeHtml(prevObj.text.slice(0, 32))}...
              </button>
            ` : '<div></div>'}

            ${nextObj ? `
              <button class="btn btn-primary" onclick="LearnPage.selectObjective('${nextObj.id}')">
                ${nextObj.id.replace('obj-', 'o')}: ${escapeHtml(nextObj.text.slice(0, 32))}... &rarr;
              </button>
            ` : '<div></div>'}
          </div>
        </div>
      `;
    }

    container.innerHTML = `
      <div class="learn-page-container">
        <!-- Top Week Filter Bar (A4) -->
        <div class="learn-top-bar" style="margin-bottom: 1.25rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; flex-wrap: wrap; gap: 0.5rem;">
            <div>
              <h1 class="page-title" style="margin: 0;">🎯 Belajar Objective AI-200</h1>
              <p class="page-desc" style="margin: 0.2rem 0 0 0;">27 butir resmi Skills Measured. Pelajari bahan bacaan, praktikkkan mandiri, dan kuasai materi.</p>
            </div>
            <div style="display: flex; gap: 0.5rem; align-items: center;">
              <input 
                type="text" 
                class="input-field" 
                placeholder="Filter nama/id..." 
                value="${escapeHtml(searchFilter)}" 
                oninput="LearnPage.handleSearch(this.value)"
                style="width: 180px; padding: 0.35rem 0.65rem; font-size: 0.85rem;"
              >
            </div>
          </div>

          <!-- 6-Week Filter Buttons -->
          <div style="display: flex; gap: 0.4rem; overflow-x: auto; padding-bottom: 0.35rem; scrollbar-width: none;">
            ${weekButtonsHtml}
          </div>

          <!-- Domain Progress Bars (A4) -->
          <div style="display: flex; gap: 0.5rem; margin-top: 0.85rem; flex-wrap: wrap;">
            ${domainProgressHtml}
          </div>
        </div>

        <!-- Master-Detail Layout -->
        <div class="learn-main-grid" style="display: grid; grid-template-columns: 340px 1fr; gap: 1.25rem; align-items: start;">
          <!-- Left: List -->
          <div class="learn-sidebar" style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-md); max-height: calc(100vh - 240px); overflow-y: auto; padding: 0.75rem; display: flex; flex-direction: column; gap: 0.5rem;">
            ${sidebarHtml}
          </div>

          <!-- Right: Objective Detail -->
          <div class="learn-detail-pane">
            ${detailHtml}
          </div>
        </div>
      </div>
    `;

    // Trigger initial live validation if in dipraktikkan state
    if (currentObj && (currentObj.status === 'dipraktikkan' || editingExplanation)) {
      validateLiveExplanation(currentObj.id);
    }
  }

  function selectObjective(id) {
    activeObjId = id;
    editingExplanation = false;
    const container = document.getElementById('main-content');
    if (container) render(container);
  }

  function selectWeek(weekVal) {
    if (weekVal === 'all') {
      selectedWeek = 'all';
    } else {
      selectedWeek = Number(weekVal);
    }
    const container = document.getElementById('main-content');
    if (container) render(container);
  }

  function handleSearch(val) {
    searchFilter = val;
    const container = document.getElementById('main-content');
    if (container) render(container);
  }

  function advance(id) {
    Store.advanceObjective(id);
    const container = document.getElementById('main-content');
    if (container) render(container);
  }

  function handleSkipStep(id) {
    const obj = Store.getObjectiveById(id);
    if (!obj) return;
    let nextStatus = 'dibaca';
    if (obj.status === 'dibaca') nextStatus = 'dipraktikkan';
    else if (obj.status === 'dipraktikkan') nextStatus = 'kuasai';
    Store.skipObjectiveStep(id, nextStatus);
    const container = document.getElementById('main-content');
    if (container) render(container);
  }

  function handleDemoteStep(id) {
    Store.demoteObjectiveStep(id);
    editingExplanation = false;
    const container = document.getElementById('main-content');
    if (container) render(container);
  }

  function enableEditExplanation() {
    editingExplanation = true;
    const container = document.getElementById('main-content');
    if (container) render(container);
  }

  function cancelEditExplanation() {
    editingExplanation = false;
    const container = document.getElementById('main-content');
    if (container) render(container);
  }

  function validateLiveExplanation(id) {
    const ta = document.getElementById('explanation-input');
    const errBox = document.getElementById('explanation-live-error');
    const countBox = document.getElementById('explanation-char-count');
    const btn = document.getElementById('btn-submit-kuasai');
    if (!ta || !errBox || !btn) return;

    const text = ta.value || '';
    const obj = Store.getObjectiveById(id);
    const result = Store.validasiExplanation(text, obj);

    if (countBox) {
      countBox.textContent = `${text.trim().length} karakter (minimal 80 karakter)`;
    }

    if (!result.valid) {
      errBox.textContent = result.error;
      btn.disabled = true;
    } else {
      errBox.textContent = '';
      btn.disabled = false;
    }
  }

  function handleSubmitKuasai(e, id) {
    e.preventDefault();
    const ta = document.getElementById('explanation-input');
    const confSelect = document.getElementById('explanation-confidence');
    if (!ta) return;

    const explanation = ta.value;
    const confidence = confSelect ? Number(confSelect.value) : 3;

    const res = Store.completeObjectiveKuasai(id, explanation, confidence);
    if (res.success) {
      editingExplanation = false;
      if (typeof App !== 'undefined' && App.toast) {
        App.toast('🏆 Selamat! Objective berhasil dikuasai!', 'success');
      }
      if (typeof App !== 'undefined' && App.confetti) {
        App.confetti();
      }
      const container = document.getElementById('main-content');
      if (container) render(container);
    } else {
      const errBox = document.getElementById('explanation-live-error');
      if (errBox) errBox.textContent = res.error;
    }
  }

  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  return {
    render,
    selectObjective,
    selectWeek,
    handleSearch,
    advance,
    handleSkipStep,
    handleDemoteStep,
    enableEditExplanation,
    cancelEditExplanation,
    validateLiveExplanation,
    handleSubmitKuasai
  };
})();

window.LearnPage = LearnPage;
