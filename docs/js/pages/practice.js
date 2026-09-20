/**
 * pages/practice.js — Halaman Latihan Terpadu (A1)
 * Menggabungkan 3 subtab: Drill (Flashcard Spaced Repetition), Ujian (Simulasi & Bank Soal),
 * dan Keputusan (Tabel Perbandingan Layanan Azure).
 */

const PracticePage = (() => {
  let currentSubtab = 'drill'; // 'drill' | 'exams' | 'decisions'

  function render(container, initialTab) {
    if (initialTab && ['drill', 'exams', 'decisions'].includes(initialTab)) {
      currentSubtab = initialTab;
    } else {
      const hash = window.location.hash;
      if (hash.includes('?')) {
        const params = new URLSearchParams(hash.split('?')[1]);
        const t = params.get('tab');
        if (t && ['drill', 'exams', 'decisions'].includes(t)) {
          currentSubtab = t;
        }
      }
    }

    container.innerHTML = `<div class="page-header" style="margin-bottom: 1.25rem;"><h1 class="page-title">⚡ Latihan</h1><p class="page-desc">Uji pemahaman dan daya ingat: Spaced repetition flashcard, simulasi ujian sertifikasi, dan tabel pertimbangan keputusan arsitektur.</p></div><div class="practice-subnav" style="display: flex; gap: 0.5rem; margin-bottom: 1.5rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem;"><button id="subtab-btn-drill" class="btn ${ currentSubtab === 'drill' ? 'btn-primary' : 'btn-secondary' }" onclick="PracticePage.switchTab('drill')">⚡ Drill</button><button id="subtab-btn-exams" class="btn ${ currentSubtab === 'exams' ? 'btn-primary' : 'btn-secondary' }" onclick="PracticePage.switchTab('exams')">🎯 Ujian</button><button id="subtab-btn-decisions" class="btn ${ currentSubtab === 'decisions' ? 'btn-primary' : 'btn-secondary' }" onclick="PracticePage.switchTab('decisions')">⚖️ Keputusan</button></div><div id="practice-subcontent"></div>`;

    renderSubtabContent();
  }

  function switchTab(tabName) {
    currentSubtab = tabName;
    ['drill', 'exams', 'decisions'].forEach(t => {
      const btn = document.getElementById(`subtab-btn-${t}`);
      if (btn) {
        btn.className = (t === tabName) ? 'btn btn-primary' : 'btn btn-secondary';
      }
    });
    renderSubtabContent();
  }

  function renderSubtabContent() {
    const subContainer = document.getElementById('practice-subcontent');
    if (!subContainer) return;

    if (currentSubtab === 'drill' && typeof DrillPage !== 'undefined') {
      DrillPage.render(subContainer);
    } else if (currentSubtab === 'exams' && typeof ExamsPage !== 'undefined') {
      ExamsPage.render(subContainer);
    } else if (currentSubtab === 'decisions' && typeof DecisionsPage !== 'undefined') {
      DecisionsPage.render(subContainer);
    }
  }

  return {
    render,
    switchTab
  }
})();

window.PracticePage = PracticePage;