/**
 * pages/exams.js — Halaman "Ujian Latihan" (Simulasi Timer, Question Palette, Scoring 0-1000, & History)
 */

const ExamsPage = (() => {
  let activeExamKey = null;
  let activeExam = null;
  let userAnswers = {};
  let flaggedQuestions = new Set();
  let currentQIndex = 0;
  let timerInterval = null;
  let secondsRemaining = 0;
  let isExamFinished = false;
  let isPaused = false;
  let paletteFilter = 'all'; // 'all' | 'flagged' | 'unanswered'
  let examResult = null;
  let keyHandler = null;

  function render(container) {
    const exams = Store.getExams();
    const examKeys = Object.keys(exams);
    const history = Store.getExamHistory();
    const config = Store.getConfig();

    if (!activeExam) {
      cleanupKeys();
      renderSelection(container, exams, examKeys, history, config);
      return;
    }

    if (isExamFinished) {
      cleanupKeys();
      renderResult(container, config);
      return;
    }

    setupKeyboardControls();
    renderActiveExam(container);
  }

  function setupKeyboardControls() {
    if (keyHandler) {
      window.removeEventListener('keydown', keyHandler);
    }

    keyHandler = (e) => {
      const tag = (e.target && e.target.tagName) ? e.target.tagName.toLowerCase() : '';
      if (tag === 'input' || tag === 'textarea') return;
      if (!activeExam || isExamFinished) return;
      if (window.location.hash.split('?')[0] !== '#exams') return;

      if (e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        togglePause();
        return;
      }

      if (isPaused) return;

      const q = activeExam.questions[currentQIndex];
      if (!q) return;

      const optKeys = Object.keys(q.options || {});

      // 1-4 or A-D to select option
      if (e.key === '1' && optKeys[0]) {
        e.preventDefault();
        selectOption(q.id, optKeys[0]);
      } else if (e.key === '2' && optKeys[1]) {
        e.preventDefault();
        selectOption(q.id, optKeys[1]);
      } else if (e.key === '3' && optKeys[2]) {
        e.preventDefault();
        selectOption(q.id, optKeys[2]);
      } else if (e.key === '4' && optKeys[3]) {
        e.preventDefault();
        selectOption(q.id, optKeys[3]);
      } else if (e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        selectOption(q.id, 'a');
      } else if (e.key === 'b' || e.key === 'B') {
        e.preventDefault();
        selectOption(q.id, 'b');
      } else if (e.key === 'c' || e.key === 'C') {
        e.preventDefault();
        selectOption(q.id, 'c');
      } else if (e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        selectOption(q.id, 'd');
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        toggleFlag(q.id);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        nextQuestion();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        prevQuestion();
      }
    };

    window.addEventListener('keydown', keyHandler);
  }

  function cleanupKeys() {
    if (keyHandler) {
      window.removeEventListener('keydown', keyHandler);
      keyHandler = null;
    }
  }

  function renderSelection(container, exams, examKeys, history, config) {
    let historyHtml = '';
    if (history.length > 0) {
      historyHtml = `
        <div class="card" style="margin-top: 1.5rem;">
          <h2 style="font-size: 1.15rem; font-weight: 700; margin-bottom: 1rem; color: var(--azure-blue);">
            📈 Riwayat Skor Ujian Latihan
          </h2>
          <div style="display: flex; flex-direction: column; gap: 0.75rem;">
            ${history.slice().reverse().map(h => {
              const isPass = h.score >= (config.passingScore || 700);
              return `
                <div style="display: flex; align-items: center; justify-content: space-between; background-color: var(--bg-main); padding: 0.75rem 1rem; border-radius: var(--radius-md); border: 1px solid var(--border-color); border-left: 4px solid ${isPass ? 'var(--accent-green)' : 'var(--accent-red)'};">
                  <div>
                    <div style="font-weight: 600; font-size: 0.95rem; color: var(--text-main);">${escapeHtml(h.set)}</div>
                    <div class="card-subtitle">${h.date} • Durasi: ${h.minutes}m • Total Soal: ${h.total}</div>
                    ${h.wrong_domains && h.wrong_domains.length > 0 ? `
                      <div style="font-size: 0.75rem; color: var(--accent-red); margin-top: 0.2rem;">
                        Domain perlu perbaikan: ${h.wrong_domains.join(', ')}
                      </div>
                    ` : ''}
                  </div>
                  <div style="text-align: right;">
                    <div style="font-size: 1.35rem; font-weight: 800; color: ${isPass ? 'var(--accent-green)' : 'var(--accent-red)'};">
                      ${h.score}/1000
                    </div>
                    <span class="badge ${isPass ? 'badge-article' : 'badge-ops'}">
                      ${isPass ? 'LULUS (>=700)' : 'BELUM LULUS'}
                    </span>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
    }

    container.innerHTML = `
      <div class="page-container" style="max-width: 820px; margin: 0 auto;">
        <h1 style="font-size: 1.35rem; font-weight: 800; margin-bottom: 0.5rem; color: var(--text-main);">Simulasi Ujian Sertifikasi AI-200</h1>
        <div class="card-subtitle" style="margin-bottom: 1.5rem;">
          Latihan format multiple choice dengan timer mundur, question navigation, dan passing mark 700/1000.
        </div>

        <div class="dashboard-grid">
          ${examKeys.map(k => {
            const ex = exams[k];
            const qCount = ex.questions ? ex.questions.length : 0;
            return `
              <div class="card">
                <div class="card-title-row">
                  <span class="badge badge-lab">${k.toUpperCase()}</span>
                  <span style="font-size: 0.8rem; color: var(--text-dim); font-weight: 600;">⏱️ ${ex.minutes || 30} Menit</span>
                </div>
                <h3 style="font-size: 1.1rem; font-weight: 700; margin: 0.5rem 0; color: var(--text-main);">${escapeHtml(ex.title)}</h3>
                <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1.25rem;">
                  Jumlah soal: <strong>${qCount} butir</strong>. Meniru format ujian resmi Microsoft.
                </p>
                <button class="btn btn-primary btn-block" onclick="ExamsPage.startExam('${k}')">
                  🚀 Mulai Simulasi Ujian
                </button>
              </div>
            `;
          }).join('')}
        </div>

        ${historyHtml}
      </div>
    `;
  }

  function startExam(examKey) {
    const exams = Store.getExams();
    activeExamKey = examKey;
    activeExam = exams[examKey];
    if (!activeExam || !activeExam.questions || activeExam.questions.length === 0) {
      App.toast('Paket soal ujian tidak ditemukan atau kosong.', 'warning');
      return;
    }

    userAnswers = {};
    flaggedQuestions = new Set();
    currentQIndex = 0;
    isExamFinished = false;
    isPaused = false;
    paletteFilter = 'all';
    examResult = null;

    secondsRemaining = (activeExam.minutes || 30) * 60;
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(updateTimer, 1000);

    setupKeyboardControls();

    const container = document.getElementById('main-content');
    if (container) renderActiveExam(container);
  }

  function togglePause() {
    if (!activeExam || isExamFinished) return;
    isPaused = !isPaused;
    if (isPaused) {
      if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
      }
      App.toast('⏸️ Ujian dijeda. Waktu timer dihentikan sementara.', 'info');
    } else {
      if (!timerInterval) {
        timerInterval = setInterval(updateTimer, 1000);
      }
      App.toast('▶️ Ujian dilanjutkan.', 'info');
    }
    const container = document.getElementById('main-content');
    if (container) renderActiveExam(container);
  }

  function setPaletteFilter(filter) {
    paletteFilter = filter;
    const container = document.getElementById('main-content');
    if (container) renderActiveExam(container);
  }

  function updateTimer() {
    if (isPaused) return;
    secondsRemaining--;
    const timerElem = document.getElementById('exam-timer-display');
    if (timerElem) {
      const min = Math.floor(secondsRemaining / 60);
      const sec = secondsRemaining % 60;
      timerElem.textContent = `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
    }

    if (secondsRemaining <= 0) {
      clearInterval(timerInterval);
      App.toast('Waktu ujian telah habis! Menghitung skor...', 'warning', 4000);
      finishExam();
    }
  }

  function renderActiveExam(container) {
    const q = activeExam.questions[currentQIndex];
    const totalQ = activeExam.questions.length;
    const isFlagged = flaggedQuestions.has(q.id);
    const selectedAns = userAnswers[q.id];

    const answeredCount = Object.keys(userAnswers).length;
    const unansweredCount = totalQ - answeredCount;
    const flaggedCount = flaggedQuestions.size;

    const min = Math.floor(secondsRemaining / 60);
    const sec = secondsRemaining % 60;
    const timerStr = `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;

    const displayedQuestions = activeExam.questions.map((item, idx) => ({ item, idx })).filter(({ item, idx }) => {
      if (paletteFilter === 'flagged') return flaggedQuestions.has(item.id);
      if (paletteFilter === 'unanswered') return userAnswers[item.id] === undefined;
      return true;
    });

    const paletteHtml = displayedQuestions.length > 0 ? displayedQuestions.map(({ item, idx }) => {
      const isAns = userAnswers[item.id] !== undefined;
      const isFlg = flaggedQuestions.has(item.id);
      const isCurr = idx === currentQIndex;

      let style = 'background-color: var(--bg-card); color: var(--text-main); border: 1px solid var(--border-color);';
      if (isCurr) style = 'background-color: var(--azure-blue); color: #ffffff; border-color: var(--azure-blue); font-weight: 700; box-shadow: 0 0 0 2px var(--azure-glow);';
      else if (isFlg) style = 'background-color: var(--accent-red-bg); color: var(--accent-red); border-color: var(--accent-red-border); font-weight: 600;';
      else if (isAns) style = 'background-color: var(--accent-green-bg); color: var(--accent-green); border-color: var(--accent-green-border);';

      return `
        <button 
          class="btn" 
          style="width: 34px; height: 34px; padding: 0; font-size: 0.75rem; border-radius: var(--radius-sm); ${style}"
          onclick="ExamsPage.goToQuestion(${idx})"
          title="Soal ${idx + 1}${isFlg ? ' (Ditandai)' : ''}${isAns ? ' (Dijawab)' : ''}"
        >
          ${idx + 1}
        </button>
      `;
    }).join('') : `<span style="font-size: 0.8rem; color: var(--text-muted); padding: 0.35rem 0.5rem;">Tidak ada soal dalam filter ini.</span>`;

    container.innerHTML = `
      <div class="page-container" style="max-width: 820px; margin: 0 auto;">
        
        <!-- Exam Top Bar -->
        <div class="card" style="margin-bottom: 1rem; padding: 0.75rem 1.25rem; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.5rem;">
          <div>
            <strong style="font-size: 0.95rem; color: var(--text-main);">${escapeHtml(activeExam.title)}</strong>
            <span style="font-size: 0.8rem; color: var(--text-dim); margin-left: 0.5rem;">Soal ${currentQIndex + 1} dari ${totalQ}</span>
          </div>

          <div style="display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap;">
            <div style="font-size: 1.15rem; font-weight: 800; font-family: var(--font-mono); color: ${secondsRemaining < 300 ? 'var(--accent-red)' : 'var(--azure-blue)'};">
              ⏱️ <span id="exam-timer-display">${timerStr}</span>
            </div>
            <button class="btn btn-secondary btn-sm" onclick="ExamsPage.togglePause()" title="Pintasan: P">
              ${isPaused ? '▶️ Lanjutkan' : '⏸️ Jeda (P)'}
            </button>
            <button class="btn btn-danger btn-sm" onclick="ExamsPage.confirmFinishExam()">
              Selesaikan Ujian
            </button>
          </div>
        </div>

        <!-- Question Palette Filter & Container -->
        <div style="margin-bottom: 1rem;">
          <div style="display: flex; gap: 0.4rem; align-items: center; margin-bottom: 0.45rem; flex-wrap: wrap;">
            <span style="font-size: 0.75rem; font-weight: 700; color: var(--text-dim); text-transform: uppercase;">Filter Palet:</span>
            <button class="chip ${paletteFilter === 'all' ? 'active' : ''}" onclick="ExamsPage.setPaletteFilter('all')">
              Semua (${totalQ})
            </button>
            <button class="chip ${paletteFilter === 'flagged' ? 'active' : ''}" onclick="ExamsPage.setPaletteFilter('flagged')">
              🚩 Ditandai (${flaggedCount})
            </button>
            <button class="chip ${paletteFilter === 'unanswered' ? 'active' : ''}" onclick="ExamsPage.setPaletteFilter('unanswered')">
              ⏳ Belum Dijawab (${unansweredCount})
            </button>
          </div>

          <div style="display: flex; gap: 0.4rem; flex-wrap: wrap; padding: 0.6rem; background-color: var(--bg-card); border-radius: var(--radius-md); border: 1px solid var(--border-color); box-shadow: var(--shadow-sm); min-height: 48px; align-items: center;">
            ${paletteHtml}
          </div>
        </div>

        ${isPaused ? `
          <!-- Paused Overlay Card -->
          <div class="card" style="padding: 3.5rem 1.5rem; text-align: center; margin-bottom: 1.25rem;">
            <div style="font-size: 3rem; margin-bottom: 0.75rem;">⏸️</div>
            <h3 style="font-size: 1.3rem; font-weight: 800; color: var(--text-main); margin-bottom: 0.5rem;">Simulasi Ujian Sedang Dijeda</h3>
            <p style="font-size: 0.875rem; color: var(--text-muted); margin-bottom: 1.5rem; max-width: 480px; margin-left: auto; margin-right: auto;">
              Timer dibekukan pada <strong>${timerStr}</strong>. Pertanyaan disembunyikan sementara agar Anda dapat beristirahat tanpa mengurangi durasi ujian.
            </p>
            <button class="btn btn-primary" onclick="ExamsPage.togglePause()" style="padding: 0.75rem 1.75rem; font-size: 0.95rem;">
              ▶️ Lanjutkan Ujian <kbd style="margin-left: 0.4rem; background: rgba(255,255,255,0.25); color: #fff; border-color: rgba(255,255,255,0.4);">P</kbd>
            </button>
          </div>
        ` : `
          <!-- Main Question Card -->
          <div class="card" style="padding: 1.75rem; margin-bottom: 1.25rem;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem;">
              <span class="badge badge-${q.domain || 'containers'}">${(q.domain || 'containers').toUpperCase()}</span>
              
              <label style="display: flex; align-items: center; gap: 0.4rem; font-size: 0.85rem; cursor: pointer; color: ${isFlagged ? 'var(--accent-red)' : 'var(--text-muted)'}; font-weight: 500;">
                <input type="checkbox" ${isFlagged ? 'checked' : ''} onchange="ExamsPage.toggleFlag('${q.id}')">
                🚩 Tandai untuk ditinjau <kbd style="margin-left: 0.25rem;">F</kbd>
              </label>
            </div>

            <div style="font-size: 1.05rem; font-weight: 600; line-height: 1.6; margin-bottom: 1.5rem; color: var(--text-main);">
              ${escapeHtml(q.stem)}
            </div>

            <!-- Options -->
            <div style="display: flex; flex-direction: column; gap: 0.75rem;">
              ${Object.keys(q.options).map((optKey, idx) => {
                const optText = q.options[optKey];
                const isSelected = selectedAns === optKey;
                return `
                  <label 
                    style="display: flex; align-items: flex-start; gap: 0.75rem; padding: 0.85rem 1rem; border-radius: var(--radius-md); border: 1px solid ${isSelected ? 'var(--azure-blue)' : 'var(--border-color)'}; background-color: ${isSelected ? 'rgba(0, 120, 212, 0.08)' : 'var(--bg-main)'}; cursor: pointer; transition: var(--transition);"
                  >
                    <input 
                      type="radio" 
                      name="q_option" 
                      value="${optKey}" 
                      ${isSelected ? 'checked' : ''} 
                      onchange="ExamsPage.selectOption('${q.id}', '${optKey}')"
                      style="margin-top: 0.2rem; accent-color: var(--azure-blue);"
                    >
                    <div style="font-size: 0.9rem; line-height: 1.5; color: var(--text-main); flex: 1;">
                      <strong style="color: var(--azure-blue);">${optKey.toUpperCase()}.</strong> ${escapeHtml(optText)}
                    </div>
                    <kbd style="opacity: 0.7; font-size: 0.65rem;">${optKey.toUpperCase()}</kbd>
                  </label>
                `;
              }).join('')}
            </div>

            <!-- Keyboard Shortcuts Hint for Exam -->
            <div class="drill-keys-hint" style="margin-top: 1.25rem; justify-content: flex-start;">
              <span class="drill-key-item">⌨️ <kbd>A-D</kbd> atau <kbd>1-4</kbd> Pilih Opsi</span>
              <span class="drill-key-item"><kbd>F</kbd> Flag</span>
              <span class="drill-key-item"><kbd>P</kbd> Jeda</span>
              <span class="drill-key-item"><kbd>→</kbd> / <kbd>←</kbd> Pindah Soal</span>
            </div>
          </div>

          <!-- Navigation Buttons -->
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <button class="btn btn-secondary" ${currentQIndex === 0 ? 'disabled' : ''} onclick="ExamsPage.prevQuestion()">
              &larr; Soal Sebelumnya
            </button>

            <button class="btn btn-primary" onclick="ExamsPage.nextQuestion()">
              ${currentQIndex === totalQ - 1 ? 'Tinjau / Selesai &rarr;' : 'Soal Berikutnya &rarr;'}
            </button>
          </div>
        `}

      </div>
    `;
  }

  function selectOption(qId, optionKey) {
    userAnswers[qId] = optionKey;
    const container = document.getElementById('main-content');
    if (container) renderActiveExam(container);
  }

  function toggleFlag(qId) {
    if (flaggedQuestions.has(qId)) {
      flaggedQuestions.delete(qId);
    } else {
      flaggedQuestions.add(qId);
    }
    const container = document.getElementById('main-content');
    if (container) renderActiveExam(container);
  }

  function nextQuestion() {
    if (currentQIndex < activeExam.questions.length - 1) {
      currentQIndex++;
      const container = document.getElementById('main-content');
      if (container) renderActiveExam(container);
    } else {
      confirmFinishExam();
    }
  }

  function prevQuestion() {
    if (currentQIndex > 0) {
      currentQIndex--;
      const container = document.getElementById('main-content');
      if (container) renderActiveExam(container);
    }
  }

  function goToQuestion(idx) {
    currentQIndex = idx;
    const container = document.getElementById('main-content');
    if (container) renderActiveExam(container);
  }

  function confirmFinishExam() {
    const totalQ = activeExam.questions.length;
    const answeredCount = Object.keys(userAnswers).length;
    const unanswered = totalQ - answeredCount;

    let msg = 'Apakah Anda yakin ingin menyelesaikan ujian sekarang?';
    if (unanswered > 0) {
      msg = `Ada ${unanswered} soal yang belum dijawab. Yakin ingin menyelesaikan ujian?`;
    }

    if (confirm(msg)) {
      finishExam();
    }
  }

  function finishExam() {
    if (timerInterval) clearInterval(timerInterval);
    cleanupKeys();
    isExamFinished = true;

    let correctCount = 0;
    const wrongQuestions = [];
    const wrongDomainSet = new Set();

    activeExam.questions.forEach(q => {
      const userChoice = userAnswers[q.id];
      if (userChoice && userChoice.toLowerCase() === q.answer.toLowerCase()) {
        correctCount++;
      } else {
        wrongQuestions.push({
          question: q,
          userChoice: userChoice || 'Tidak dijawab'
        });
        if (q.domain) wrongDomainSet.add(q.domain);
      }
    });

    const totalQ = activeExam.questions.length;
    const scaledScore = totalQ > 0 ? Math.round((correctCount / totalQ) * 1000) : 0;
    const elapsedMinutes = Math.ceil(((activeExam.minutes || 30) * 60 - secondsRemaining) / 60);

    examResult = {
      set: activeExam.title || activeExamKey,
      date: new Date().toISOString().split('T')[0],
      score: scaledScore,
      total: totalQ,
      correct: correctCount,
      minutes: Math.max(1, elapsedMinutes),
      wrong_domains: Array.from(wrongDomainSet),
      wrongQuestions
    };

    Store.recordExamResult({
      set: examResult.set,
      date: examResult.date,
      score: examResult.score,
      total: examResult.total,
      minutes: examResult.minutes,
      wrong_domains: examResult.wrong_domains
    });

    Store.flush(`exam: score ${scaledScore}/1000 for ${examResult.set}`);
    App.toast(`✓ Hasil ujian tersimpan! Skor Anda: ${scaledScore}/1000`, 'success', 4000);

    const isPass = scaledScore >= ((config && config.passingScore) || 700);
    if (isPass && typeof App.confetti === 'function') {
      setTimeout(() => App.confetti(), 200);
    }

    const container = document.getElementById('main-content');
    if (container) renderResult(container, Store.getConfig());
  }

  function renderResult(container, config) {
    const isPass = examResult.score >= (config.passingScore || 700);

    container.innerHTML = `
      <div class="page-container" style="max-width: 820px; margin: 0 auto;">
        
        <!-- Score Card Banner -->
        <div class="card" style="text-align: center; padding: 2.5rem 1.5rem; margin-bottom: 1.5rem; border-color: ${isPass ? 'var(--accent-green-border)' : 'var(--accent-red-border)'}; background: ${isPass ? 'linear-gradient(180deg, var(--bg-card), var(--accent-green-bg))' : 'linear-gradient(180deg, var(--bg-card), var(--accent-red-bg))'};">
          <div style="font-size: 3.5rem; margin-bottom: 0.5rem;">
            ${isPass ? '🏆' : '📚'}
          </div>
          <h2 style="font-size: 1.5rem; font-weight: 800; margin-bottom: 0.25rem; color: ${isPass ? 'var(--accent-green)' : 'var(--accent-red)'};">
            ${isPass ? 'SELAMAT! ANDA LULUS' : 'BELUM LULUS (Terus Belajar)'}
          </h2>
          <div class="card-subtitle" style="margin-bottom: 1.5rem;">
            ${escapeHtml(examResult.set)} • Passing Score: ${config.passingScore || 700}/1000
          </div>

          <div style="font-size: 3rem; font-weight: 900; color: ${isPass ? 'var(--accent-green)' : 'var(--accent-red)'}; margin-bottom: 1rem;">
            ${examResult.score} <span style="font-size: 1.25rem; font-weight: 600; color: var(--text-dim);">/ 1000</span>
          </div>

          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; max-width: 500px; margin: 0 auto 1.5rem auto;">
            <div style="background-color: var(--bg-main); padding: 0.75rem; border-radius: var(--radius-md); border: 1px solid var(--border-color);">
              <div class="card-title">Benar</div>
              <div style="font-size: 1.25rem; font-weight: 700; color: var(--accent-green);">${examResult.correct}/${examResult.total}</div>
            </div>
            <div style="background-color: var(--bg-main); padding: 0.75rem; border-radius: var(--radius-md); border: 1px solid var(--border-color);">
              <div class="card-title">Salah</div>
              <div style="font-size: 1.25rem; font-weight: 700; color: var(--accent-red);">${examResult.total - examResult.correct}</div>
            </div>
            <div style="background-color: var(--bg-main); padding: 0.75rem; border-radius: var(--radius-md); border: 1px solid var(--border-color);">
              <div class="card-title">Durasi</div>
              <div style="font-size: 1.25rem; font-weight: 700; color: var(--azure-blue);">${examResult.minutes}m</div>
            </div>
          </div>

          <div style="display: flex; justify-content: center; gap: 0.75rem; flex-wrap: wrap;">
            <button class="btn btn-primary btn-sm" onclick="ExamsPage.resetExam()">
              📋 Kembali ke Daftar Ujian
            </button>
            <a href="#today" class="btn btn-secondary btn-sm">
              Kembali ke Hari Ini
            </a>
          </div>
        </div>

        <!-- Wrong Answers Review & Explanations -->
        ${examResult.wrongQuestions.length > 0 ? `
          <div class="card">
            <h3 style="font-size: 1.15rem; font-weight: 700; color: var(--accent-red); margin-bottom: 1rem;">
              Pembahasan Soal yang Salah (${examResult.wrongQuestions.length})
            </h3>
            <div style="display: flex; flex-direction: column; gap: 1.25rem;">
              ${examResult.wrongQuestions.map((item, idx) => {
                const q = item.question;
                return `
                  <div style="background-color: var(--bg-main); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 1.25rem;">
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.5rem;">
                      <span class="badge badge-${q.domain}">${q.domain}</span>
                      <span style="font-size: 0.8rem; color: var(--accent-red); font-weight: 600;">Jawaban Anda: ${item.userChoice.toUpperCase()}</span>
                    </div>

                    <div style="font-size: 0.95rem; font-weight: 600; line-height: 1.5; margin-bottom: 1rem; color: var(--text-main);">
                      ${escapeHtml(q.stem)}
                    </div>

                    <div style="background-color: var(--accent-green-bg); border: 1px solid var(--accent-green-border); border-radius: var(--radius-sm); padding: 0.75rem 1rem; margin-bottom: 0.75rem;">
                      <div style="font-size: 0.85rem; font-weight: 700; color: var(--accent-green); margin-bottom: 0.25rem;">
                        ✓ Jawaban Benar: ${q.answer.toUpperCase()}. ${escapeHtml(q.options[q.answer] || '')}
                      </div>
                    </div>

                    <div style="font-size: 0.85rem; color: var(--text-muted); line-height: 1.6; border-top: 1px solid var(--border-color); padding-top: 0.75rem;">
                      <strong style="color: var(--azure-blue);">Penjelasan:</strong> ${escapeHtml(q.explain || 'Tidak ada penjelasan tambahan.')}
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        ` : ''}

      </div>
    `;
  }

  function resetExam() {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = null;
    isPaused = false;
    activeExam = null;
    activeExamKey = null;
    isExamFinished = false;
    examResult = null;
    cleanupKeys();
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
    startExam,
    togglePause,
    setPaletteFilter,
    selectOption,
    toggleFlag,
    nextQuestion,
    prevQuestion,
    goToQuestion,
    confirmFinishExam,
    resetExam
  };
})();

window.ExamsPage = ExamsPage;
