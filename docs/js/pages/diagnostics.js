/**
 * pages/diagnostics.js — Halaman Diagnostik Integritas Data (B5)
 * Memeriksa 9 kategori integritas data pada file-file JSON/MD.
 * Menyediakan tombol perbaiki otomatis untuk nomor 2 dan 7.
 */

const DiagnosticsPage = (() => {
  function checkIntegrity() {
    const cards = Store.getCards();
    const objectives = Store.getObjectives();
    const progress = Store.getProgress();
    const resources = Store.getResources();
    const exams = Store.getExams();
    const labs = Store.getLabs();
    const notes = Store.getNotes();

    const normalizedObjIds = new Set();
    objectives.forEach(o => {
      normalizedObjIds.add(o.id.toLowerCase());
      normalizedObjIds.add(o.id.toLowerCase().replace('obj-', 'o'));
    });

    function isValidObjective(id) {
      if (!id) return false;
      const clean = String(id).toLowerCase().trim();
      return normalizedObjIds.has(clean) || normalizedObjIds.has(clean.replace('obj-', 'o'));
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 1. Kartu yang objective-nya menunjuk id tidak ada
    const cat1 = cards.filter(c => c.objective && !isValidObjective(c.objective));

    // 2. Entri progress.json untuk kartu yang sudah dihapus
    const cardIdSet = new Set(cards.map(c => c.id));
    const cat2 = Object.keys(progress).filter(kId => !cardIdSet.has(kId));

    // 3. Objective yang read dan lab_urls sama-sama kosong
    const cat3 = objectives.filter(o => {
      const noRead = !o.read || o.read.length === 0;
      const noLab = !o.lab_urls || o.lab_urls.length === 0;
      return noRead && noLab;
    });

    // 4. Sumber yang objective-nya tidak ada
    const cat4 = resources.filter(r => r.objective && !isValidObjective(r.objective));

    // 5. Soal ujian yang objective-nya tidak ada
    const cat5 = [];
    Object.entries(exams).forEach(([examKey, examData]) => {
      const qList = examData.questions || examData;
      if (Array.isArray(qList)) {
        qList.forEach(q => {
          if (q.objective && !isValidObjective(q.objective)) {
            cat5.push({ examKey, qId: q.id, objective: q.objective });
          }
        });
      }
    });

    // 6. Lab dengan deleted: false berumur lebih dari 7 hari
    const cat6 = [];
    labs.forEach((l, idx) => {
      if (l.deleted === false && l.date) {
        const d = new Date(l.date);
        d.setHours(0, 0, 0, 0);
        const ageDays = Math.floor((today - d) / (1000 * 60 * 60 * 24));
        if (ageDays > 7) {
          cat6.push({ ...l, labIndex: idx, ageDays });
        }
      }
    });

    // 7. Id kartu atau objective duplikat
    const seenCardIds = new Set();
    const dupCards = [];
    cards.forEach(c => {
      if (seenCardIds.has(c.id)) dupCards.push(c.id);
      else seenCardIds.add(c.id);
    });

    const seenObjIds = new Set();
    const dupObjs = [];
    objectives.forEach(o => {
      if (seenObjIds.has(o.id)) dupObjs.push(o.id);
      else seenObjIds.add(o.id);
    });
    const cat7 = { dupCards, dupObjs, total: dupCards.length + dupObjs.length };

    // 8. Objective kuasai tapi explanation kosong
    const cat8 = objectives.filter(o => o.status === 'kuasai' && (!o.explanation || !o.explanation.trim()));

    // 9. Catatan dengan frontmatter objective yang tidak ada
    const cat9 = [];
    Object.entries(notes).forEach(([noteName, noteObj]) => {
      const content = noteObj.content || '';
      const fmMatch = content.match(/^---\s*\n([\s\S]*?)\n---/);
      if (fmMatch) {
        const objMatch = fmMatch[1].match(/objective:\s*([^\n]+)/);
        if (objMatch) {
          const rawObj = objMatch[1].trim();
          if (rawObj && !isValidObjective(rawObj)) {
            cat9.push({ noteName, objective: rawObj });
          }
        }
      }
    });

    return {
      cat1, cat2, cat3, cat4, cat5, cat6, cat7, cat8, cat9,
      totalIssues: cat1.length + cat2.length + cat3.length + cat4.length + cat5.length + cat6.length + cat7.total + cat8.length + cat9.length
    };
  }

  function render(container) {
    const report = checkIntegrity();

    container.innerHTML = `
      <div class="page-header" style="margin-bottom: 1.5rem;">
        <h1 class="page-title">🩺 Diagnostik Integritas Data</h1>
        <p class="page-desc">Pemeriksaan otomatis 9 kategori integritas antar-file JSON dan Markdown di repositori.</p>
      </div>

      <div class="summary-banner" style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 1rem 1.25rem; margin-bottom: 1.5rem; display: flex; justify-content: space-between; align-items: center;">
        <div>
          <div style="font-weight: 700; font-size: 1.1rem; color: ${report.totalIssues === 0 ? 'var(--accent-green)' : 'var(--accent-yellow)'};">
            ${report.totalIssues === 0 ? '✓ Semua Data Bersih & Sinkron' : report.totalIssues + ' Isu Ditemukan'}
          </div>
          <div style="font-size: 0.85rem; color: var(--text-muted); margin-top: 0.2rem;">
            Pemeriksaan integritas 9 kategori mencakup kartu, objective, progress, sumber, soal ujian, lab, dan catatan.
          </div>
        </div>
        <button class="btn btn-secondary" onclick="DiagnosticsPage.refresh()">🔄 Pindai Ulang</button>
      </div>

      <div class="diagnostics-list" style="display: flex; flex-direction: column; gap: 1rem;">
        ${renderCategoryCard(1, 'Kartu yang objective-nya menunjuk ID tidak ada', report.cat1.length, report.cat1.map(c => `Kartu ${c.id} (objective: ${c.objective})`))}
        ${renderCategoryCard(2, 'Entri progress.json untuk kartu yang sudah dihapus', report.cat2.length, report.cat2.map(id => `Progress ID yatim: ${id}`), true, 'perbaikiProgress')}
        ${renderCategoryCard(3, 'Objective yang read dan lab_urls sama-sama kosong', report.cat3.length, report.cat3.map(o => `${o.id}: ${o.text}`))}
        ${renderCategoryCard(4, 'Sumber yang objective-nya tidak ada', report.cat4.length, report.cat4.map(r => `${r.id}: ${r.title} (objective: ${r.objective})`))}
        ${renderCategoryCard(5, 'Soal ujian yang objective-nya tidak ada', report.cat5.length, report.cat5.map(q => `Set ${q.examKey} - Soal ${q.qId} (objective: ${q.objective})`))}
        ${renderCategoryCard(6, 'Lab dengan deleted: false berumur lebih dari 7 hari', report.cat6.length, report.cat6.map(l => `Lab ${l.lab} - RG: ${l.resource_group} (Umur: ${l.ageDays} hari)`))}
        ${renderCategoryCard(7, 'ID kartu atau objective duplikat', report.cat7.total, [...report.cat7.dupCards.map(id => `Kartu duplikat: ${id}`), ...report.cat7.dupObjs.map(id => `Objective duplikat: ${id}`)], true, 'perbaikiDuplikat')}
        ${renderCategoryCard(8, 'Objective kuasai tapi explanation kosong', report.cat8.length, report.cat8.map(o => `${o.id}: ${o.text}`))}
        ${renderCategoryCard(9, 'Catatan dengan frontmatter objective yang tidak ada', report.cat9.length, report.cat9.map(n => `${n.noteName} (objective: ${n.objective})`))}
      </div>
    `;
  }

  function renderCategoryCard(num, title, count, items, hasFix = false, fixAction = '') {
    const isClean = count === 0;
    return `
      <div class="diag-card" style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 1rem 1.25rem;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div style="display: flex; align-items: center; gap: 0.6rem;">
            <span class="badge ${isClean ? 'badge-recall' : 'badge-decision'}" style="font-weight: 700;">#${num}</span>
            <span style="font-weight: 600; font-size: 0.95rem;">${title}</span>
          </div>
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <span style="font-weight: 700; color: ${isClean ? 'var(--accent-green)' : 'var(--accent-red)'}; font-size: 0.9rem;">
              ${isClean ? '0 (Bersih)' : count + ' temuan'}
            </span>
            ${hasFix && !isClean ? `<button class="btn btn-primary" style="padding: 0.25rem 0.65rem; font-size: 0.8rem;" onclick="DiagnosticsPage.${fixAction}()">🛠️ Perbaiki</button>` : ''}
          </div>
        </div>
        ${items && items.length > 0 ? `
          <div style="margin-top: 0.75rem; padding-top: 0.75rem; border-top: 1px solid var(--border-color); font-size: 0.825rem; color: var(--text-muted);">
            <ul style="margin-left: 1.25rem;">
              ${items.map(it => `<li>${escapeHtml(it)}</li>`).join('')}
            </ul>
          </div>
        ` : ''}
      </div>
    `;
  }

  function perbaikiProgress() {
    const cards = Store.getCards();
    const progress = Store.getProgress();
    const cardIdSet = new Set(cards.map(c => c.id));
    let cleanedCount = 0;

    Object.keys(progress).forEach(kId => {
      if (!cardIdSet.has(kId)) {
        delete progress[kId];
        cleanedCount++;
      }
    });

    if (cleanedCount > 0) {
      Store.flush('diagnostics: fix orphaned progress entries');
      if (typeof toast === 'function') toast(`✓ Berhasil menghapus ${cleanedCount} entri progress yatim!`, 'success');
      refresh();
    } else {
      if (typeof toast === 'function') toast('Tidak ada entri progress yatim.', 'info');
    }
  }

  function perbaikiDuplikat() {
    const cards = Store.getCards();
    const objectives = Store.getObjectives();

    const seenC = new Set();
    const dedupCards = [];
    cards.forEach(c => {
      if (!seenC.has(c.id)) {
        seenC.add(c.id);
        dedupCards.push(c);
      }
    });

    const seenO = new Set();
    const dedupObjs = [];
    objectives.forEach(o => {
      if (!seenO.has(o.id)) {
        seenO.add(o.id);
        dedupObjs.push(o);
      }
    });

    Store.flush('diagnostics: deduplicate cards and objectives');
    if (typeof toast === 'function') toast('✓ Berhasil membersihkan duplikat!', 'success');
    refresh();
  }

  function refresh() {
    const container = document.getElementById('main-content');
    if (container) render(container);
  }

  return {
    render,
    checkIntegrity,
    perbaikiProgress,
    perbaikiDuplikat,
    refresh
  };
})();

window.DiagnosticsPage = DiagnosticsPage;
