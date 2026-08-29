/**
 * pages/drill.js — Halaman "Drill" (Spaced Repetition Leitner Flashcards Session)
 */

const DrillPage = (() => {
  let sessionCards = [];
  let currentIndex = 0;
  let isAnswerVisible = false;
  let sessionStats = {
    total: 0,
    right: 0,
    wrong: 0,
    failedCards: []
  };
  let isSessionFinished = false;

  function parseHashFilters() {
    const hash = window.location.hash;
    const qIndex = hash.indexOf('?');
    if (qIndex === -1) return {};
    const queryStr = hash.slice(qIndex + 1);
    const params = new URLSearchParams(queryStr);
    return {
      domain: params.get('domain') || undefined,
      type: params.get('type') || undefined,
      week: params.get('week') || undefined,
      all: params.get('all') === '1'
    };
  }

  function startSession() {
    const filters = parseHashFilters();
    const cards = Store.getCards();
    const progress = Store.getProgress();

    sessionCards = SRS.getDueCards(cards, progress, filters);
    // Shuffle cards randomly for better recall
    sessionCards.sort(() => Math.random() - 0.5);

    currentIndex = 0;
    isAnswerVisible = false;
    sessionStats = {
      total: sessionCards.length,
      right: 0,
      wrong: 0,
      failedCards: []
    };
    isSessionFinished = false;
  }

  function render(container) {
    if (sessionCards.length === 0 && !isSessionFinished) {
      startSession();
    }

    if (sessionCards.length === 0 && !isSessionFinished) {
      const filters = parseHashFilters();
      container.innerHTML = `
        <div class="page-container" style="max-width: 680px; margin: 0 auto; text-align: center; padding-top: 2rem;">
          <div class="card" style="padding: 2.5rem 1.5rem;">
            <div style="font-size: 3rem; margin-bottom: 1rem;">🎉</div>
            <h2 style="font-size: 1.35rem; font-weight: 800; margin-bottom: 0.5rem;">Tidak Ada Kartu Jatuh Tempo!</h2>
            <p style="color: var(--text-muted); font-size: 0.9rem; margin-bottom: 1.5rem;">
              Semua kartu pada filter ini sudah dipelajari sesuai interval Leitner hari ini.
            </p>
            <div style="display: flex; justify-content: center; gap: 0.75rem; flex-wrap: wrap;">
              <a href="#drill?all=1" class="btn btn-primary btn-sm" onclick="setTimeout(() => DrillPage.restartWithAll(), 50)">
                ⚡ Tinjau Semua Kartu (Latihan Bebas)
              </a>
              <button class="btn btn-secondary btn-sm" onclick="App.openQuickCardModal()">
                + Tambah Kartu Baru (Alt+N)
              </button>
              <a href="#today" class="btn btn-secondary btn-sm">
                Kembali ke Hari Ini
              </a>
            </div>
          </div>
        </div>
      `;
      return;
    }

    if (isSessionFinished) {
      renderSummary(container);
      return;
    }

    const currentCard = sessionCards[currentIndex];
    const progress = Store.getProgress();
    const currentProgress = progress[currentCard.id] || { box: 1, right: 0, wrong: 0 };
    const progressPercent = Math.round(((currentIndex) / sessionCards.length) * 100);

    container.innerHTML = `
      <div class="page-container" style="max-width: 720px; margin: 0 auto;">
        <!-- Header Drill Session -->
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.75rem;">
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <span class="badge badge-${currentCard.domain}">${currentCard.domain}</span>
            <span class="badge ${currentCard.type === 'decision' ? 'badge-article' : 'badge-lab'}">${currentCard.type.toUpperCase()}</span>
            <span style="font-size: 0.75rem; color: var(--text-dim);">Kotak SRS: ${currentProgress.box || 1}/5</span>
          </div>
          <div style="font-size: 0.85rem; font-weight: 600; color: var(--azure-light);">
            Kartu ${currentIndex + 1} dari ${sessionCards.length}
          </div>
        </div>

        <!-- Progress Bar -->
        <div class="progress-bar-container" style="height: 6px; margin-bottom: 1.25rem;">
          <div class="progress-bar-fill" style="width: ${progressPercent}%;"></div>
        </div>

        <!-- Flashcard View -->
        <div class="card" style="min-height: 280px; display: flex; flex-direction: column; justify-content: space-between; padding: 2rem 1.5rem; background: linear-gradient(180deg, var(--bg-card), rgba(17, 24, 39, 0.95)); border-color: #374151;">
          
          <!-- Question -->
          <div>
            <div style="font-size: 0.75rem; text-transform: uppercase; letter-spacing: 1px; color: var(--text-dim); margin-bottom: 0.75rem; font-weight: 700;">
              PERTANYAAN / SKENARIO
            </div>
            <div style="font-size: 1.15rem; font-weight: 600; line-height: 1.5; color: var(--text-main);">
              ${escapeHtml(currentCard.question)}
            </div>
          </div>

          <!-- Answer Section -->
          ${isAnswerVisible ? `
            <div style="margin-top: 1.5rem; padding-top: 1.25rem; border-top: 1px solid var(--border-color);">
              <div style="font-size: 0.75rem; text-transform: uppercase; letter-spacing: 1px; color: var(--accent-green); margin-bottom: 0.5rem; font-weight: 700;">
                JAWABAN
              </div>
              <div style="font-size: 1rem; line-height: 1.6; color: #e5e7eb; white-space: pre-line;">
                ${escapeHtml(currentCard.answer)}
              </div>
            </div>
          ` : ''}

          <!-- Action Buttons -->
          <div style="margin-top: 2rem;">
            ${!isAnswerVisible ? `
              <button class="btn btn-primary btn-block" style="padding: 0.8rem;" onclick="DrillPage.showAnswer()">
                👁️ Lihat Jawaban
              </button>
            ` : `
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                <button class="btn btn-danger" style="padding: 0.8rem; font-size: 1rem;" onclick="DrillPage.rateCard(false)">
                  ❌ Salah (Kembali ke Box 1)
                </button>
                <button class="btn btn-primary" style="background-color: var(--accent-green); border-color: var(--accent-green); padding: 0.8rem; font-size: 1rem;" onclick="DrillPage.rateCard(true)">
                  ✅ Benar (Naik Box)
                </button>
              </div>
            `}
          </div>

        </div>

        <!-- Quick filter / reset link -->
        <div style="display: flex; justify-content: space-between; margin-top: 1rem; font-size: 0.8rem;">
          <a href="#today" style="color: var(--text-muted); text-decoration: none;">&larr; Keluar dari Sesi</a>
          <span style="color: var(--text-dim);">Pintasan: <code>Alt+N</code> tambah kartu baru</span>
        </div>
      </div>
    `;
  }

  function showAnswer() {
    isAnswerVisible = true;
    const container = document.getElementById('main-content');
    if (container) render(container);
  }

  function rateCard(isRight) {
    const card = sessionCards[currentIndex];
    Store.updateCardProgress(card.id, isRight);

    if (isRight) {
      sessionStats.right++;
    } else {
      sessionStats.wrong++;
      sessionStats.failedCards.push(card);
    }

    currentIndex++;
    isAnswerVisible = false;

    if (currentIndex >= sessionCards.length) {
      isSessionFinished = true;
      // Auto flush to GitHub
      Store.flush(`drill: ${sessionStats.total} kartu, ${sessionStats.right} benar`);
    }

    const container = document.getElementById('main-content');
    if (container) render(container);
  }

  function renderSummary(container) {
    const rightPercent = sessionStats.total > 0 ? Math.round((sessionStats.right / sessionStats.total) * 100) : 0;

    container.innerHTML = `
      <div class="page-container" style="max-width: 720px; margin: 0 auto;">
        <div class="card" style="text-align: center; padding: 2.5rem 1.5rem; margin-bottom: 1.5rem;">
          <div style="font-size: 3rem; margin-bottom: 0.75rem;">
            ${rightPercent >= 80 ? '🎯' : '💪'}
          </div>
          <h2 style="font-size: 1.4rem; font-weight: 800; margin-bottom: 0.5rem;">Sesi Drill Selesai!</h2>
          <div class="card-subtitle" style="margin-bottom: 1.5rem;">
            Hasil sesi telah otomatis disimpan dan diperbarui di sistem Leitner.
          </div>

          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-bottom: 1.5rem;">
            <div style="background-color: var(--bg-main); padding: 1rem; border-radius: var(--radius-md);">
              <div class="card-title">Total Kartu</div>
              <div class="card-value" style="font-size: 1.5rem;">${sessionStats.total}</div>
            </div>
            <div style="background-color: var(--bg-main); padding: 1rem; border-radius: var(--radius-md);">
              <div class="card-title">Benar</div>
              <div class="card-value" style="font-size: 1.5rem; color: var(--accent-green);">${sessionStats.right}</div>
            </div>
            <div style="background-color: var(--bg-main); padding: 1rem; border-radius: var(--radius-md);">
              <div class="card-title">Akurasi</div>
              <div class="card-value" style="font-size: 1.5rem; color: var(--azure-light);">${rightPercent}%</div>
            </div>
          </div>

          <div style="display: flex; justify-content: center; gap: 0.75rem; flex-wrap: wrap;">
            <button class="btn btn-primary btn-sm" onclick="DrillPage.restartSession()">
              🔄 Ulangi Sesi Baru
            </button>
            <a href="#today" class="btn btn-secondary btn-sm">
              Kembali ke Hari Ini
            </a>
          </div>
        </div>

        <!-- Failed Cards Review -->
        ${sessionStats.failedCards.length > 0 ? `
          <div class="card">
            <h3 style="font-size: 1.1rem; font-weight: 700; color: #fca5a5; margin-bottom: 1rem;">
              Daftar Kartu yang Perlu Diingat Kembali (${sessionStats.failedCards.length})
            </h3>
            <div style="display: flex; flex-direction: column; gap: 1rem;">
              ${sessionStats.failedCards.map(c => `
                <div style="background-color: var(--bg-main); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 1rem;">
                  <div style="display: flex; gap: 0.4rem; margin-bottom: 0.4rem;">
                    <span class="badge badge-${c.domain}">${c.domain}</span>
                    <span class="badge badge-lab">${c.type}</span>
                  </div>
                  <div style="font-weight: 600; font-size: 0.95rem; margin-bottom: 0.4rem;">
                    ${escapeHtml(c.question)}
                  </div>
                  <div style="font-size: 0.875rem; color: var(--text-muted); line-height: 1.5; white-space: pre-line; border-top: 1px solid var(--border-subtle); padding-top: 0.4rem;">
                    ${escapeHtml(c.answer)}
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

      </div>
    `;
  }

  function restartSession() {
    startSession();
    const container = document.getElementById('main-content');
    if (container) render(container);
  }

  function restartWithAll() {
    window.location.hash = '#drill?all=1';
    startSession();
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
    showAnswer,
    rateCard,
    restartSession,
    restartWithAll
  };
})();

window.DrillPage = DrillPage;
