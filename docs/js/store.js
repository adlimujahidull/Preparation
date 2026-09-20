/**
 * store.js — Satu-satunya modul yang tahu bentuk data aplikasi AI-200.
 * Mengelola state lokal di memori, caching localStorage (offline-first),
 * dirty tracking, dan batch commit ke GitHub REST API.
 */

const Store = (() => {
  const CACHE_PREFIX = 'ai200_cache_';
  const DIRTY_KEYS = new Set();
  const listeners = new Set();

  let autoSaveTimeout = null;
  let isFlushing = false;
  let lastSaveStatus = 'saved'; // 'saved' | 'dirty' | 'saving' | 'offline' | 'conflict'
  let lastErrorMessage = '';

  // Internal state container
  const state = {
    config: { examDate: '', passingScore: 700 },
    plan: { weeks: [] },
    resources: { resources: [] },
    cards: { cards: [] },
    progress: {},
    labs: { labs: [] },
    decisions: { decisions: [] },
    examHistory: [],
    exams: {},       // { [id]: examData }
    notes: {},       // { [fileName]: { content, sha, path } }
    objectives: [],  // 27 official AI-200 objectives
    setup: { items: [] }
  };

  // State Change Notification
  function emitStatus(status, detail) {
    lastSaveStatus = status;
    if (detail) lastErrorMessage = detail;
    listeners.forEach(fn => {
      try {
        fn(status, detail);
      } catch (e) {
        console.error('Listener error:', e);
      }
    });
  }

  function onStatusChange(fn) {
    listeners.add(fn);
    fn(lastSaveStatus, lastErrorMessage);
    return () => listeners.delete(fn);
  }

  // Date format helper (local YYYY-MM-DD)
  function getTodayString() {
    if (typeof SRS !== 'undefined' && SRS.formatDate) {
      return SRS.formatDate(new Date());
    }
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  // LocalStorage Cache Helpers
  function saveToLocalCache(key, data) {
    try {
      localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(data));
    } catch (e) {
      console.warn('Gagal menulis cache localStorage:', key, e);
    }
  }

  function loadFromLocalCache(key, defaultVal) {
    try {
      const raw = localStorage.getItem(CACHE_PREFIX + key);
      return raw ? JSON.parse(raw) : defaultVal;
    } catch (e) {
      console.warn('Gagal membaca cache localStorage:', key, e);
      return defaultVal;
    }
  }

  // Dirty state & Auto-save trigger
  function markDirty(key, customCommitMsg) {
    DIRTY_KEYS.add(key);
    saveToLocalCache(key, state[key]);
    emitStatus('dirty');

    if (autoSaveTimeout) {
      clearTimeout(autoSaveTimeout);
    }
    // Auto-save after 30 seconds idle
    autoSaveTimeout = setTimeout(() => {
      if (DIRTY_KEYS.size > 0 && !isFlushing) {
        flush(customCommitMsg || 'auto-save: sync dirty files');
      }
    }, 30000);
  }

  function isDirty() {
    return DIRTY_KEYS.size > 0;
  }

  function getStatus() {
    return {
      status: lastSaveStatus,
      isDirty: isDirty(),
      dirtyCount: DIRTY_KEYS.size,
      lastError: lastErrorMessage
    };
  }

  // Initial Load (Cache first + parallel fetch from GitHub API)
  async function init() {
    // 1. Instant load from local cache
    state.config = loadFromLocalCache('config', state.config);
    state.plan = loadFromLocalCache('plan', state.plan);
    state.resources = loadFromLocalCache('resources', state.resources);
    state.cards = loadFromLocalCache('cards', state.cards);
    state.progress = loadFromLocalCache('progress', state.progress);
    state.labs = loadFromLocalCache('labs', state.labs);
    state.decisions = loadFromLocalCache('decisions', state.decisions);
    state.examHistory = loadFromLocalCache('examHistory', state.examHistory);
    state.exams = loadFromLocalCache('exams', state.exams);
    state.notes = loadFromLocalCache('notes', state.notes);
    state.objectives = loadFromLocalCache('objectives', []);
    state.setup = loadFromLocalCache('setup', { items: [] });

    // Load static objectives if cache is empty
    if (!state.objectives || state.objectives.length === 0) {
      try {
        const staticRes = await fetch('data/objectives.json');
        if (staticRes.ok) {
          state.objectives = await staticRes.json();
          saveToLocalCache('objectives', state.objectives);
        }
      } catch (e) {
        // quiet fallback
      }
    }

    // Load static setup if cache is empty
    if (!state.setup || !state.setup.items || state.setup.items.length === 0) {
      try {
        const setupRes = await fetch('data/setup.json');
        if (setupRes.ok) {
          state.setup = await setupRes.json();
          saveToLocalCache('setup', state.setup);
        }
      } catch (e) {
        // quiet fallback
      }
    }

    // B1/S3: Ensure startDate is present in config
    if (!state.config.startDate) {
      state.config.startDate = (typeof SRS !== 'undefined' && SRS.formatDate) 
        ? SRS.formatDate(new Date()) 
        : getTodayString();
      saveToLocalCache('config', state.config);
      markDirty('config', 'init: set default startDate');
    }

    // 2. If configured and online, refresh in background
    if (GitHubAPI.hasConfig() && navigator.onLine) {
      await refreshFromGitHub();
    } else if (!navigator.onLine) {
      emitStatus('offline', 'Aplikasi berjalan dalam mode offline.');
    }
  }

  async function refreshFromGitHub() {
    try {
      emitStatus('saving', 'Menyinkronkan data dengan GitHub...');

      const fetchFile = async (path, key, defaultVal, isJson = true) => {
        try {
          const res = await GitHubAPI.getFile(path);
          if (!res || !res.content) {
            return defaultVal;
          }
          if (isJson) {
            const parsed = JSON.parse(res.content);
            saveToLocalCache(key, parsed);
            return parsed;
          }
          return res.content;
        } catch (e) {
          console.warn(`Gagal memuat ${path}:`, e);
          return loadFromLocalCache(key, defaultVal);
        }
      };

      // Parallel fetch all data files
      const [
        cfg,
        planData,
        resData,
        cardsData,
        progressData,
        labsData,
        decisionsData,
        examHistoryData,
        objectivesData,
        setupData
      ] = await Promise.all([
        fetchFile('data/config.json', 'config', { examDate: '', passingScore: 700 }),
        fetchFile('data/plan.json', 'plan', { weeks: [] }),
        fetchFile('data/resources.json', 'resources', { resources: [] }),
        fetchFile('data/cards.json', 'cards', { cards: [] }),
        fetchFile('data/progress.json', 'progress', {}),
        fetchFile('data/labs.json', 'labs', { labs: [] }),
        fetchFile('data/decisions.json', 'decisions', { decisions: [] }),
        fetchFile('data/exam-history.json', 'examHistory', []),
        fetchFile('data/objectives.json', 'objectives', state.objectives || []),
        fetchFile('data/setup.json', 'setup', state.setup || { items: [] })
      ]);

      state.config = cfg || { examDate: '', passingScore: 700 };
      if (!state.config.startDate) {
        state.config.startDate = (typeof SRS !== 'undefined' && SRS.formatDate) 
          ? SRS.formatDate(new Date()) 
          : getTodayString();
      }
      state.plan = planData || { weeks: [] };
      state.resources = resData || { resources: [] };
      state.cards = cardsData || { cards: [] };
      state.progress = progressData || {};
      state.labs = labsData || { labs: [] };
      state.decisions = decisionsData || { decisions: [] };
      state.examHistory = Array.isArray(examHistoryData) ? examHistoryData : [];
      if (Array.isArray(objectivesData) && objectivesData.length > 0) {
        state.objectives = objectivesData;
      }
      if (setupData && setupData.items) {
        state.setup = setupData;
      }

      // List and fetch exams
      try {
        const examFiles = await GitHubAPI.listDir('data/exams');
        for (const ef of examFiles) {
          if (ef.name.endsWith('.json')) {
            const examKey = ef.name.replace('.json', '');
            const ed = await fetchFile(ef.path, `exam_${examKey}`, null);
            if (ed) state.exams[examKey] = ed;
          }
        }
        saveToLocalCache('exams', state.exams);
      } catch (e) {
        console.warn('Gagal memuat list ujian:', e);
      }

      // List and fetch notes
      try {
        const noteFiles = await GitHubAPI.listDir('notes');
        for (const nf of noteFiles) {
          if (nf.name.endsWith('.md')) {
            const contentRes = await GitHubAPI.getFile(nf.path);
            if (contentRes) {
              state.notes[nf.name] = {
                name: nf.name,
                path: nf.path,
                content: contentRes.content,
                sha: contentRes.sha
              };
            }
          }
        }
        saveToLocalCache('notes', state.notes);
      } catch (e) {
        console.warn('Gagal memuat list catatan:', e);
      }

      emitStatus('saved');
    } catch (err) {
      console.error('Error saat sinkronisasi GitHub:', err);
      emitStatus('saved'); // Keep functional with local cache
    }
  }

  // Flush dirty files to GitHub
  async function flush(customCommitMessage) {
    if (isFlushing) return;
    if (!GitHubAPI.hasConfig()) {
      console.warn('Token belum diatur, perubahan hanya tersimpan di cache lokal.');
      emitStatus('saved');
      return;
    }
    if (!navigator.onLine) {
      emitStatus('offline', 'Tidak ada koneksi internet. Perubahan akan dikirim saat online.');
      return;
    }

    if (DIRTY_KEYS.size === 0) {
      emitStatus('saved');
      return;
    }

    isFlushing = true;
    emitStatus('saving', 'Menyimpan perubahan ke repositori...');

    const keysToSave = Array.from(DIRTY_KEYS);
    const defaultMsg = customCommitMessage || `Update ${keysToSave.join(', ')}`;

    try {
      for (const key of keysToSave) {
        let filePath = '';
        let content = '';

        if (key === 'config') {
          filePath = 'data/config.json';
          content = JSON.stringify(state.config, null, 2);
        } else if (key === 'plan') {
          filePath = 'data/plan.json';
          content = JSON.stringify(state.plan, null, 2);
        } else if (key === 'resources') {
          filePath = 'data/resources.json';
          content = JSON.stringify(state.resources, null, 2);
        } else if (key === 'cards') {
          filePath = 'data/cards.json';
          content = JSON.stringify(state.cards, null, 2);
        } else if (key === 'progress') {
          filePath = 'data/progress.json';
          content = JSON.stringify(state.progress, null, 2);
        } else if (key === 'labs') {
          filePath = 'data/labs.json';
          content = JSON.stringify(state.labs, null, 2);
        } else if (key === 'decisions') {
          filePath = 'data/decisions.json';
          content = JSON.stringify(state.decisions, null, 2);
        } else if (key === 'examHistory') {
          filePath = 'data/exam-history.json';
          content = JSON.stringify(state.examHistory, null, 2);
        } else if (key === 'objectives') {
          filePath = 'data/objectives.json';
          content = JSON.stringify(state.objectives, null, 2);
        } else if (key === 'setup') {
          filePath = 'data/setup.json';
          content = JSON.stringify(state.setup, null, 2);
        } else if (key.startsWith('note:')) {
          const noteName = key.replace('note:', '');
          const noteObj = state.notes[noteName];
          if (noteObj) {
            filePath = `notes/${noteName}`;
            content = noteObj.content;
          }
        } else if (key.startsWith('exam:')) {
          const examKey = key.replace('exam:', '');
          const examObj = state.exams[examKey];
          if (examObj) {
            filePath = `data/exams/${examKey}.json`;
            content = JSON.stringify(examObj, null, 2);
          }
        }

        if (filePath && content) {
          await GitHubAPI.putFile(filePath, content, defaultMsg);
          DIRTY_KEYS.delete(key);
        }
      }

      emitStatus('saved');
    } catch (err) {
      console.error('Error saat menyimpan file:', err);
      if (err.isConflict) {
        emitStatus('conflict', err.message);
        alert('PERINGATAN KONFLIK: Data di repositori telah diubah dari perangkat lain.\nAplikasi akan mengambil data terbaru untuk mencegah penimpaan tidak sengaja.');
        await refreshFromGitHub();
      } else {
        emitStatus('dirty', `Gagal menyimpan: ${err.message}`);
      }
    } finally {
      isFlushing = false;
    }
  }

  // =========================================================================
  // Data Accessors & Mutators
  // =========================================================================

  // Config
  function getConfig() {
    return state.config || { examDate: '', passingScore: 700 };
  }

  function setConfig(newCfg) {
    state.config = { ...state.config, ...newCfg };
    markDirty('config', 'config: update target tanggal ujian / nilai kelulusan');
  }

  // Plan & Tasks
  function getPlan() {
    return state.plan || { weeks: [] };
  }

  function toggleTask(taskId, isDone) {
    let changed = false;
    if (state.plan && state.plan.weeks) {
      for (const week of state.plan.weeks) {
        for (const task of week.tasks) {
          if (task.id === taskId) {
            task.done = (isDone !== undefined) ? isDone : !task.done;
            changed = true;
            break;
          }
        }
        if (changed) break;
      }
    }
    if (changed) {
      markDirty('plan', `plan: toggle task ${taskId}`);
    }
    return changed;
  }

  // Resources
  function getResources() {
    return (state.resources && state.resources.resources) ? state.resources.resources : [];
  }

  function updateResource(resourceId, updates) {
    const list = getResources();
    const item = list.find(r => r.id === resourceId);
    if (item) {
      Object.assign(item, updates);
      markDirty('resources', `resources: update ${item.title}`);
      return true;
    }
    return false;
  }

  function addResource(newRes) {
    if (!state.resources) state.resources = { resources: [] };
    if (!state.resources.resources) state.resources.resources = [];
    
    const id = newRes.id || `r${String(state.resources.resources.length + 1).padStart(3, '0')}`;
    const entry = {
      id,
      title: newRes.title || 'Untitled Resource',
      type: newRes.type || 'lab',
      url: newRes.url || '',
      domain: newRes.domain || 'umum',
      week: Number(newRes.week) || 1,
      minutes: Number(newRes.minutes) || 30,
      status: newRes.status || 'belum',
      rating: newRes.rating || null,
      note: newRes.note || ''
    };
    state.resources.resources.push(entry);
    markDirty('resources', `resources: add ${entry.title}`);
    return entry;
  }

  // Cards
  function getCards() {
    return (state.cards && state.cards.cards) ? state.cards.cards : [];
  }

  function addCard(newCard) {
    if (!state.cards) state.cards = { cards: [] };
    if (!state.cards.cards) state.cards.cards = [];
    
    const nextNum = state.cards.cards.length + 1;
    const id = newCard.id || `c${String(nextNum).padStart(3, '0')}`;
    const today = getTodayString();
    
    const entry = {
      id,
      objective: newCard.objective || null,
      domain: newCard.domain || 'containers',
      type: newCard.type || 'recall', // 'recall' | 'decision'
      question: newCard.question || '',
      answer: newCard.answer || '',
      source: 'self',
      created: today
    };
    state.cards.cards.push(entry);
    markDirty('cards', `cards: add new card ${id} [${entry.domain}]`);
    return entry;
  }

  // Progress (SRS State)
  function getProgress() {
    return state.progress || {};
  }

  function updateCardProgress(cardId, isRight) {
    if (!state.progress) state.progress = {};
    const curr = state.progress[cardId] || { box: 1, last: null, right: 0, wrong: 0 };
    const today = getTodayString();

    if (isRight) {
      curr.box = Math.min((curr.box || 1) + 1, 5);
      curr.right = (curr.right || 0) + 1;
    } else {
      curr.box = 1;
      curr.wrong = (curr.wrong || 0) + 1;
    }
    curr.last = today;
    state.progress[cardId] = curr;
    markDirty('progress');
    return curr;
  }

  // Labs
  function getLabs() {
    return (state.labs && state.labs.labs) ? state.labs.labs : [];
  }

  function addLab(labEntry) {
    if (!state.labs) state.labs = { labs: [] };
    if (!state.labs.labs) state.labs.labs = [];

    const today = getTodayString();
    const entry = {
      lab: labEntry.lab || 'unnamed-lab',
      date: labEntry.date || today,
      minutes: Number(labEntry.minutes) || 30,
      resource_group: labEntry.resource_group || '',
      deleted: labEntry.deleted !== undefined ? labEntry.deleted : false,
      blocker: labEntry.blocker || '',
      takeaway: labEntry.takeaway || ''
    };
    state.labs.labs.push(entry);
    markDirty('labs', `lab: log ${entry.lab}`);
    return entry;
  }

  function markLabRgDeleted(labIndex) {
    const list = getLabs();
    if (list[labIndex]) {
      list[labIndex].deleted = true;
      markDirty('labs', `lab: mark RG ${list[labIndex].resource_group} deleted`);
      return true;
    }
    return false;
  }

  // Decisions
  function getDecisions() {
    return (state.decisions && state.decisions.decisions) ? state.decisions.decisions : [];
  }

  function addDecision(dec) {
    if (!state.decisions) state.decisions = { decisions: [] };
    if (!state.decisions.decisions) state.decisions.decisions = [];
    const today = getTodayString();
    const entry = {
      id: dec.id || `d${state.decisions.decisions.length + 1}`,
      title: dec.title || 'New Decision Table',
      options: Array.isArray(dec.options) ? dec.options : [],
      updated: today
    };
    state.decisions.decisions.push(entry);
    markDirty('decisions', `decisions: add ${entry.title}`);
    return entry;
  }

  function updateDecision(id, decUpdates) {
    const list = getDecisions();
    const item = list.find(d => d.id === id);
    if (item) {
      Object.assign(item, decUpdates);
      item.updated = getTodayString();
      markDirty('decisions', `decisions: update ${item.title}`);
      return true;
    }
    return false;
  }

  function deleteDecision(id) {
    if (state.decisions && state.decisions.decisions) {
      const idx = state.decisions.decisions.findIndex(d => d.id === id);
      if (idx !== -1) {
        state.decisions.decisions.splice(idx, 1);
        markDirty('decisions', `decisions: delete ${id}`);
        return true;
      }
    }
    return false;
  }

  // Exams
  function getExams() {
    return state.exams || {};
  }

  function getExamHistory() {
    return Array.isArray(state.examHistory) ? state.examHistory : [];
  }

  function recordExamResult(result) {
    if (!Array.isArray(state.examHistory)) state.examHistory = [];
    state.examHistory.push({
      set: result.set,
      date: result.date || getTodayString(),
      score: result.score,
      total: result.total,
      minutes: result.minutes,
      wrong_domains: result.wrong_domains || []
    });
    markDirty('examHistory', `exam: record score ${result.score}/1000 for ${result.set}`);
  }

  // Notes
  function getNotes() {
    return state.notes || {};
  }

  function saveNote(name, content) {
    if (!state.notes) state.notes = {};
    const safeName = name.endsWith('.md') ? name : `${name}.md`;
    state.notes[safeName] = {
      name: safeName,
      path: `notes/${safeName}`,
      content: content,
      sha: state.notes[safeName] ? state.notes[safeName].sha : undefined
    };
    saveToLocalCache('notes', state.notes);
    markDirty(`note:${safeName}`, `notes: update ${safeName}`);
    return state.notes[safeName];
  }

  // Objectives (AI-200 official 27 objectives)
  function getObjectives() {
    return state.objectives || [];
  }

  function getObjectiveById(id) {
    if (!id) return null;
    const clean = String(id).toLowerCase().trim();
    const norm = clean.replace('obj-', 'o');
    return (state.objectives || []).find(o => {
      const oNorm = o.id.toLowerCase().replace('obj-', 'o');
      return o.id.toLowerCase() === clean || oNorm === norm;
    });
  }

  function setLastTouchedObjective(id) {
    if (!id) return;
    const obj = getObjectiveById(id);
    const objId = obj ? obj.id.replace('obj-', 'o') : id;
    state.config.lastTouchedObjective = objId;
    saveToLocalCache('config', state.config);
    markDirty('config', `config: set lastTouchedObjective ${objId}`);
  }

  function advanceObjective(id) {
    const obj = getObjectiveById(id);
    if (!obj) return false;
    if (obj.status === 'belum') {
      obj.status = 'dibaca';
    } else if (obj.status === 'dibaca') {
      obj.status = 'dipraktikkan';
    }
    setLastTouchedObjective(obj.id);
    saveToLocalCache('objectives', state.objectives);
    markDirty('objectives', `advance objective ${obj.id} to ${obj.status}`);
    return true;
  }

  function skipObjectiveStep(id, targetStatus) {
    const obj = getObjectiveById(id);
    if (!obj) return false;
    const valid = ['belum', 'dibaca', 'dipraktikkan', 'kuasai'];
    if (!valid.includes(targetStatus)) return false;
    obj.status = targetStatus;
    setLastTouchedObjective(obj.id);
    saveToLocalCache('objectives', state.objectives);
    markDirty('objectives', `skip objective ${obj.id} to ${targetStatus}`);
    return true;
  }

  function demoteObjectiveStep(id) {
    const obj = getObjectiveById(id);
    if (!obj) return false;
    if (obj.status === 'kuasai') obj.status = 'dipraktikkan';
    else if (obj.status === 'dipraktikkan') obj.status = 'dibaca';
    else if (obj.status === 'dibaca') obj.status = 'belum';
    setLastTouchedObjective(obj.id);
    saveToLocalCache('objectives', state.objectives);
    markDirty('objectives', `demote objective ${obj.id} to ${obj.status}`);
    return true;
  }

  // S4: Validasi explanation
  function validasiExplanation(teks, objective) {
    const t = (teks || '').trim();
    if (t.length < 80) {
      return { valid: false, error: 'Terlalu pendek. Tulis minimal 80 karakter dengan kalimatmu sendiri.' };
    }
    const tLower = t.toLowerCase();
    const objText = (objective && objective.text ? objective.text.trim().toLowerCase() : '');
    if (objText && (tLower.includes(objText) || objText.includes(tLower))) {
      return { valid: false, error: 'Ini menyalin teks objective. Tulis dengan kalimatmu sendiri.' };
    }
    if (objective && objective.intro) {
      const introText = objective.intro.trim().toLowerCase();
      if (introText && introText.includes(tLower)) {
        return { valid: false, error: 'Ini menyalin pengantar. Tulis dengan kalimatmu sendiri.' };
      }
    }
    return { valid: true };
  }

  function completeObjectiveKuasai(id, explanation, confidence) {
    const obj = getObjectiveById(id);
    if (!obj) return { success: false, error: 'Objective tidak ditemukan' };
    const v = validasiExplanation(explanation, obj);
    if (!v.valid) return { success: false, error: v.error };

    obj.status = 'kuasai';
    obj.explanation = (explanation || '').trim();
    obj.explanation_date = getTodayString();
    if (confidence !== undefined) obj.confidence = confidence;
    setLastTouchedObjective(obj.id);
    saveToLocalCache('objectives', state.objectives);
    markDirty('objectives', `complete kuasai for ${obj.id}`);
    return { success: true };
  }

  function updateObjectiveStatus(id, newStatus, newConfidence) {
    const obj = getObjectiveById(id);
    if (!obj) return;
    if (newStatus !== undefined) obj.status = newStatus;
    if (newConfidence !== undefined) obj.confidence = newConfidence;
    setLastTouchedObjective(obj.id);
    saveToLocalCache('objectives', state.objectives);
    markDirty('objectives', `Update status/confidence ${id}`);
  }

  // Setup Items (A9)
  function getSetup() {
    return (state.setup && state.setup.items) ? state.setup.items : [];
  }

  function toggleSetupItem(id) {
    if (!state.setup || !state.setup.items) return false;
    const item = state.setup.items.find(s => s.id === id);
    if (item) {
      item.done = !item.done;
      saveToLocalCache('setup', state.setup);
      markDirty('setup', `setup: toggle item ${id}`);
      return true;
    }
    return false;
  }

  // S3: Pacing Indicator
  function getPacingMetrics() {
    const cfg = getConfig();
    if (!cfg.examDate) return null;

    const objectives = getObjectives();
    const total = 27;
    const selesai = objectives.filter(o => o.status === 'kuasai').length;
    const sisa = total - selesai;

    const hariIni = new Date();
    hariIni.setHours(0, 0, 0, 0);

    const examD = new Date(cfg.examDate);
    examD.setHours(0, 0, 0, 0);

    const msPerDay = 1000 * 60 * 60 * 24;
    const diffDays = Math.ceil((examD - hariIni) / msPerDay);
    const hariSisa = diffDays;
    const mingguSisa = Math.max(hariSisa / 7, 0.5);
    const lajuDibutuhkan = sisa / mingguSisa;

    const startD = cfg.startDate ? new Date(cfg.startDate) : new Date(hariIni);
    startD.setHours(0, 0, 0, 0);
    const diffStart = (hariIni - startD) / msPerDay;
    const hariBerjalan = Math.max(diffStart, 1);
    const mingguBerjalan = Math.max(hariBerjalan / 7, 0.5);
    const lajuAktual = selesai / mingguBerjalan;

    const proyeksi = selesai + (lajuAktual * mingguSisa);
    const selisih = Math.round(total - proyeksi);

    let statusText = '';
    if (selisih <= 0) {
      statusText = 'Sesuai jadwal';
    } else if (selisih >= 1 && selisih <= 3) {
      statusText = 'Sedikit tertinggal';
    } else {
      statusText = `Tertinggal ${selisih} objective`;
    }

    const reqStr = lajuDibutuhkan.toFixed(1).replace('.', ',');
    const actStr = lajuAktual.toFixed(1).replace('.', ',');

    return {
      total,
      selesai,
      sisa,
      hariSisa,
      mingguSisa,
      lajuDibutuhkan,
      hariBerjalan,
      mingguBerjalan,
      lajuAktual,
      proyeksi,
      selisih,
      statusText,
      formattedString: `${selesai}/${total} objective · butuh ${reqStr}/minggu · laju kamu ${actStr}/minggu · ${statusText}`
    };
  }

  // S2: Tindakan Berikutnya di Hari Ini
  function tindakanBerikutnya() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const msPerDay = 1000 * 60 * 60 * 24;

    // 1 — biaya, selalu menang
    const labs = getLabs();
    const uncleanedRgs = [];
    labs.forEach((lab, idx) => {
      if (lab.resource_group && lab.deleted === false) {
        const labDate = new Date(lab.date);
        labDate.setHours(0, 0, 0, 0);
        const ageDays = Math.floor((today - labDate) / msPerDay);
        if (ageDays >= 1) {
          uncleanedRgs.push({ ...lab, labIndex: idx, ageDays });
        }
      }
    });

    if (uncleanedRgs.length > 0) {
      uncleanedRgs.sort((a, b) => b.ageDays - a.ageDays);
      const oldest = uncleanedRgs[0];
      return {
        jenis: 'hapus_rg',
        rg: oldest.resource_group,
        perintah: `az group delete --name ${oldest.resource_group} --yes --no-wait`,
        labIndex: oldest.labIndex,
        labName: oldest.lab,
        ageDays: oldest.ageDays
      };
    }

    // 2 — setup
    const setupItems = getSetup();
    const undoneSetup = setupItems.find(s => !s.done);
    if (undoneSetup) {
      return {
        jenis: 'setup',
        item: undoneSetup
      };
    }

    // 3 — tanggal ujian
    const cfg = getConfig();
    if (!cfg.examDate) {
      return { jenis: 'isi_tanggal' };
    }

    // 4 — drill
    const cards = getCards();
    const progress = getProgress();
    const objMap = {};
    (state.objectives || []).forEach(o => {
      objMap[o.id] = o;
      objMap[o.id.replace('obj-', 'o')] = o;
    });
    const dueCards = (typeof SRS !== 'undefined' && SRS.getDueCards)
      ? SRS.getDueCards(cards, progress, objMap)
      : [];
    const n = dueCards.length;
    if (n >= 10) {
      return { jenis: 'drill', jumlah: n };
    }

    // 5 — objective berikutnya
    let mingguIni = 1;
    const plan = getPlan();
    if (plan.weeks && plan.weeks.length > 0) {
      for (const w of plan.weeks) {
        if (w.tasks && w.tasks.some(t => !t.done)) {
          mingguIni = w.n;
          break;
        }
      }
    }

    const objectives = getObjectives();
    let kandidat = objectives.filter(o => o.week === mingguIni && o.status !== 'kuasai');
    if (kandidat.length === 0) {
      const unmastered = objectives.filter(o => o.status !== 'kuasai');
      if (unmastered.length > 0) {
        const minWeek = Math.min(...unmastered.map(o => o.week || 99));
        kandidat = unmastered.filter(o => o.week === minWeek);
      }
    }

    if (kandidat.length === 0) {
      return { jenis: 'selesai' };
    }

    kandidat.sort((a, b) => a.id.localeCompare(b.id));
    const o = kandidat[0];
    let langkah = 'baca';
    if (o.status === 'dibaca') langkah = 'praktik';
    else if (o.status === 'dipraktikkan') langkah = 'kuasai';

    return { jenis: 'objective', objective: o, langkah };
  }

  // S5: Penurunan status dari ujian
  function saatUjianDiselesaikan(hasil, setId) {
    const diturunkan = [];
    const today = getTodayString();
    let objChanged = false;
    let progressChanged = false;

    let wrongList = [];
    if (Array.isArray(hasil)) {
      wrongList = hasil.filter(q => q && !q.isCorrect);
    } else if (hasil && Array.isArray(hasil.wrongQuestions)) {
      wrongList = hasil.wrongQuestions.map(wq => wq.question || wq);
    } else if (hasil && Array.isArray(hasil.questions)) {
      wrongList = hasil.questions.filter(q => !q.isCorrect);
    }

    for (const s of wrongList) {
      if (!s.objective) continue;
      const o = getObjectiveById(s.objective);
      if (!o) continue;
      if (o.status !== 'kuasai') continue; // tidak pernah turun di bawah dipraktikkan

      o.status = 'dipraktikkan';
      o.demoted_at = today;
      o.demoted_reason = `salah di ujian ${setId || 'ujian'} soal ${s.id}`;
      objChanged = true;

      const oNorm = o.id.replace('obj-', 'o');
      const cards = getCards();
      for (const k of cards) {
        if (k.objective) {
          const kNorm = k.objective.replace('obj-', 'o');
          if (kNorm === oNorm || k.objective === o.id) {
            if (state.progress[k.id]) {
              delete state.progress[k.id];
              progressChanged = true;
            }
          }
        }
      }
      diturunkan.push({
        objectiveId: o.id,
        objectiveText: o.text,
        questionId: s.id,
        questionText: s.question || s.text
      });
    }

    if (objChanged) {
      saveToLocalCache('objectives', state.objectives);
      markDirty('objectives', `demote objectives from exam ${setId || ''}`);
    }
    if (progressChanged) {
      saveToLocalCache('progress', state.progress);
      markDirty('progress', `reset card progress for demoted objectives`);
    }

    return diturunkan;
  }

  function exportBackup() {
    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      config: state.config,
      plan: state.plan,
      resources: state.resources,
      cards: state.cards,
      progress: state.progress,
      labs: state.labs,
      decisions: state.decisions,
      examHistory: state.examHistory,
      exams: state.exams,
      notes: state.notes
    };
  }

  function importBackup(data) {
    if (!data || typeof data !== 'object') {
      throw new Error('Format file cadangan tidak valid (harus berupa JSON object).');
    }

    if (data.config && typeof data.config === 'object') {
      state.config = { ...state.config, ...data.config };
      markDirty('config', 'restore: config from backup');
    }
    if (data.plan && typeof data.plan === 'object' && Array.isArray(data.plan.weeks)) {
      state.plan = data.plan;
      markDirty('plan', 'restore: plan from backup');
    }
    if (data.resources && Array.isArray(data.resources.resources)) {
      state.resources = data.resources;
      markDirty('resources', 'restore: resources from backup');
    }
    if (data.cards && Array.isArray(data.cards.cards)) {
      state.cards = data.cards;
      markDirty('cards', 'restore: cards from backup');
    }
    if (data.progress && typeof data.progress === 'object') {
      state.progress = data.progress;
      markDirty('progress', 'restore: progress from backup');
    }
    if (data.labs && Array.isArray(data.labs.labs)) {
      state.labs = data.labs;
      markDirty('labs', 'restore: labs from backup');
    }
    if (data.decisions && Array.isArray(data.decisions.decisions)) {
      state.decisions = data.decisions;
      markDirty('decisions', 'restore: decisions from backup');
    }
    if (Array.isArray(data.examHistory)) {
      state.examHistory = data.examHistory;
      markDirty('examHistory', 'restore: exam history from backup');
    }
    if (data.exams && typeof data.exams === 'object') {
      state.exams = data.exams;
      saveToLocalCache('exams', state.exams);
    }
    if (data.notes && typeof data.notes === 'object') {
      state.notes = data.notes;
      saveToLocalCache('notes', state.notes);
      for (const noteName of Object.keys(state.notes)) {
        markDirty(`note:${noteName}`, `restore note: ${noteName}`);
      }
    }

    return true;
  }

  return {
    init,
    refreshFromGitHub,
    flush,
    isDirty,
    getStatus,
    onStatusChange,

    // Accessors
    getConfig,
    setConfig,
    getPlan,
    toggleTask,
    getResources,
    updateResource,
    addResource,
    getCards,
    addCard,
    getProgress,
    updateCardProgress,
    getLabs,
    addLab,
    markLabRgDeleted,
    getDecisions,
    addDecision,
    updateDecision,
    deleteDecision,
    getExams,
    getExamHistory,
    recordExamResult,
    getNotes,
    saveNote,
    exportBackup,
    importBackup,

    // Objectives (AI-200 official 27 objectives)
    getObjectives,
    getObjectiveById,
    updateObjectiveStatus,
    setLastTouchedObjective,
    advanceObjective,
    skipObjectiveStep,
    demoteObjectiveStep,
    validasiExplanation,
    completeObjectiveKuasai,

    // Setup Items (A9)
    getSetup,
    toggleSetupItem,

    // S2, S3, S5 Helpers
    getPacingMetrics,
    tindakanBerikutnya,
    saatUjianDiselesaikan
  };
})();

window.Store = Store;
