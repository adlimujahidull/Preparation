/**
 * pages/notes.js — Halaman "Catatan" (Markdown Editor & Preview via marked.min.js)
 * Mendukung Frontmatter YAML (B4) untuk menautkan catatan ke Objective AI-200.
 */

const NotesPage = (() => {
  let selectedNote = '00-index.md';
  let isEditing = false;

  function parseFrontmatter(content) {
    if (!content) return { frontmatter: {}, body: '' };
    const match = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/);
    if (!match) return { frontmatter: {}, body: content };
    const yaml = match[1];
    const body = match[2];
    const fm = {};
    yaml.split('\n').forEach(line => {
      const idx = line.indexOf(':');
      if (idx !== -1) {
        const key = line.slice(0, idx).trim();
        const val = line.slice(idx + 1).trim();
        fm[key] = val;
      }
    });
    return { frontmatter: fm, body };
  }

  function render(container, targetNote) {
    const notes = Store.getNotes();
    const noteKeys = Object.keys(notes).sort();

    // Check query param e.g. #notes?file=o01-acr.md
    const hash = window.location.hash;
    if (targetNote) {
      selectedNote = targetNote;
    } else if (hash.includes('?')) {
      const params = new URLSearchParams(hash.split('?')[1]);
      const fileParam = params.get('file');
      if (fileParam && notes[fileParam]) {
        selectedNote = fileParam;
      }
    }

    // Default selection
    if (!notes[selectedNote] && noteKeys.length > 0) {
      selectedNote = noteKeys[0];
    }

    const currentNote = notes[selectedNote] || { name: '00-index.md', content: '# Belum ada catatan\n\nPilih atau buat catatan baru.' };
    const { frontmatter, body } = parseFrontmatter(currentNote.content || '');

    // Render markdown preview (without raw frontmatter)
    let renderedHtml = '';
    try {
      renderedHtml = window.marked ? window.marked.parse(body || '') : `<pre>${escapeHtml(body || '')}</pre>`;
    } catch (e) {
      renderedHtml = `<pre>${escapeHtml(body || '')}</pre>`;
    }

    const words = (currentNote.content || '').trim().split(/\s+/).filter(Boolean).length;
    const chars = (currentNote.content || '').length;

    const sidebarHtml = `
      <div style="width: 270px; min-width: 270px; border-right: 1px solid var(--border-color); padding-right: 1rem; display: flex; flex-direction: column; gap: 0.5rem;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.5rem;">
          <strong style="font-size: 0.9rem; color: var(--text-muted);">Daftar Catatan (${noteKeys.length})</strong>
          <button class="btn btn-primary btn-sm" onclick="NotesPage.openNewNoteModal()" style="font-size: 0.75rem; padding: 0.2rem 0.55rem;">
            + Baru
          </button>
        </div>

        <div style="display: flex; flex-direction: column; gap: 0.35rem; overflow-y: auto; max-height: calc(100vh - 220px);">
          ${noteKeys.length > 0 ? noteKeys.map(k => {
            const nObj = notes[k];
            const parsed = parseFrontmatter(nObj ? nObj.content : '');
            const objTag = parsed.frontmatter.objective ? parsed.frontmatter.objective.replace('obj-', 'o') : '';
            return `
              <button 
                class="btn ${k === selectedNote ? 'btn-primary' : 'btn-secondary'}" 
                style="text-align: left; justify-content: space-between; padding: 0.45rem 0.65rem; font-size: 0.8rem; overflow: hidden; white-space: nowrap; display: flex; align-items: center;"
                onclick="NotesPage.selectNote('${k}')"
              >
                <span style="overflow: hidden; text-overflow: ellipsis; max-width: ${objTag ? '170px' : '230px'};">
                  📄 ${escapeHtml(k)}
                </span>
                ${objTag ? `<span class="badge badge-recall" style="font-size: 0.7rem; padding: 0.1rem 0.35rem; margin-left: 0.35rem;">${escapeHtml(objTag)}</span>` : ''}
              </button>
            `;
          }).join('') : `
            <div style="font-size: 0.8rem; color: var(--text-dim); padding: 1rem 0;">Belum ada catatan.</div>
          `}
        </div>
      </div>
    `;

    const contentPaneHtml = `
      <div style="flex: 1; min-width: 0; padding-left: 1.25rem;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem; flex-wrap: wrap; gap: 0.5rem; border-bottom: 1px solid var(--border-subtle); padding-bottom: 0.75rem;">
          <div>
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <h2 style="font-size: 1.15rem; font-weight: 700; color: var(--text-main);">📄 ${escapeHtml(selectedNote)}</h2>
              ${frontmatter.objective ? `
                <span class="badge badge-recall" style="font-size: 0.75rem;">
                  Objective: ${escapeHtml(frontmatter.objective)}
                </span>
              ` : ''}
            </div>
            <div class="card-subtitle" style="margin-top: 0.2rem;">
              Disimpan di <code>notes/${escapeHtml(selectedNote)}</code> • ${words} kata, ${chars} karakter
            </div>
          </div>
          <div style="display: flex; gap: 0.5rem; align-items: center;">
            <button class="btn btn-secondary btn-sm" onclick="NotesPage.copyNoteContent()" title="Salin seluruh isi catatan">
              📋 Salin
            </button>
            ${isEditing ? `
              <button class="btn btn-secondary btn-sm" onclick="NotesPage.cancelEdit()">Batal</button>
              <button class="btn btn-primary btn-sm" onclick="NotesPage.saveCurrentNote()">💾 Simpan</button>
            ` : `
              <button class="btn btn-primary btn-sm" onclick="NotesPage.enableEdit()">✏️ Edit Catatan</button>
            `}
          </div>
        </div>

        ${frontmatter.objective ? `
          <div style="background: var(--bg-main); border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 0.5rem 0.85rem; margin-bottom: 1rem; font-size: 0.825rem; display: flex; align-items: center; justify-content: space-between;">
            <div>
              <span style="color: var(--azure-blue); font-weight: 600;">🎯 Terkait Objective:</span>
              <strong>${escapeHtml(frontmatter.objective)}</strong>
              ${frontmatter.title ? `— <em>${escapeHtml(frontmatter.title)}</em>` : ''}
            </div>
            <a href="#learn?obj=${escapeHtml(frontmatter.objective)}" class="btn btn-secondary btn-sm" style="font-size: 0.75rem; padding: 0.2rem 0.5rem;">
              Buka di Belajar &rarr;
            </a>
          </div>
        ` : ''}

        ${isEditing ? `
          <div>
            <textarea id="note-editor-textarea" class="textarea-field" style="height: calc(100vh - 280px); font-family: var(--font-mono); font-size: 0.875rem; line-height: 1.6; resize: vertical;" oninput="NotesPage.updateWordCount(this)">${escapeHtml(currentNote.content || '')}</textarea>
            <div id="note-live-stats" style="font-size: 0.75rem; color: var(--text-dim); margin-top: 0.35rem;">
              ${words} kata • ${chars} karakter • Mendukung sintaks GitHub Flavored Markdown & Frontmatter
            </div>
          </div>
        ` : `
          <div class="markdown-body" style="color: var(--text-main); font-size: 0.925rem; line-height: 1.7; overflow-y: auto; max-height: calc(100vh - 280px); padding-right: 0.5rem;">
            ${renderedHtml}
          </div>
        `}
      </div>
    `;

    container.innerHTML = `
      <div class="page-container">
        <div class="card" style="display: flex; min-height: calc(100vh - 180px); padding: 1.25rem; flex-wrap: wrap; gap: 1rem;">
          ${sidebarHtml}
          ${contentPaneHtml}
        </div>
      </div>
    `;
  }

  function selectNote(noteKey) {
    selectedNote = noteKey;
    isEditing = false;
    const container = document.getElementById('main-content');
    if (container) render(container);
  }

  function enableEdit() {
    isEditing = true;
    const container = document.getElementById('main-content');
    if (container) {
      render(container);
      const ta = document.getElementById('note-editor-textarea');
      if (ta) ta.focus();
    }
  }

  function cancelEdit() {
    isEditing = false;
    const container = document.getElementById('main-content');
    if (container) render(container);
  }

  function saveCurrentNote() {
    const ta = document.getElementById('note-editor-textarea');
    if (!ta) return;

    const content = ta.value;
    Store.saveNote(selectedNote, content);
    isEditing = false;
    App.toast(`✓ Catatan ${selectedNote} berhasil disimpan!`, 'success');

    const container = document.getElementById('main-content');
    if (container) render(container);
  }

  function copyNoteContent() {
    const notes = Store.getNotes();
    const currentNote = notes[selectedNote];
    if (!currentNote || !currentNote.content) {
      App.toast('Catatan kosong.', 'warning');
      return;
    }

    navigator.clipboard.writeText(currentNote.content).then(() => {
      App.toast('✓ Isi catatan berhasil disalin ke clipboard!', 'success');
    });
  }

  function updateWordCount(textarea) {
    const val = textarea.value || '';
    const words = val.trim().split(/\s+/).filter(Boolean).length;
    const chars = val.length;
    const statsEl = document.getElementById('note-live-stats');
    if (statsEl) {
      statsEl.textContent = `${words} kata • ${chars} karakter • Mendukung sintaks GitHub Flavored Markdown`;
    }
  }

  function openNewNoteModal(prefillObjId = '', prefillTitle = '') {
    const modalBackdrop = document.getElementById('global-modal-backdrop');
    const modalContainer = document.getElementById('global-modal-content');
    if (!modalBackdrop || !modalContainer) return;

    let defaultName = '';
    let defaultContent = '';

    if (prefillObjId) {
      const cleanObj = prefillObjId.replace('obj-', 'o');
      const slug = (prefillTitle || 'note')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
        .slice(0, 30);
      defaultName = `${cleanObj}-${slug}.md`;
      defaultContent = `---\nobjective: ${cleanObj}\ntitle: ${prefillTitle}\n---\n\n# ${prefillTitle}\n\n`;
    }

    modalContainer.innerHTML = `
      <div class="modal-header">
        <h3 class="modal-title">Tambah Catatan Markdown Baru</h3>
        <button class="modal-close" onclick="App.closeModal()">&times;</button>
      </div>
      <form onsubmit="NotesPage.handleNewNoteSubmit(event)">
        <div class="form-group">
          <label class="form-label">Nama File Catatan * (Gunakan ekstensi .md)</label>
          <input type="text" id="new-note-name" class="input-field" required placeholder="Contoh: o01-acr-management.md" value="${escapeHtml(defaultName)}">
          <div class="form-hint">Disimpan di folder <code>notes/</code> dan ikut tersinkron ke repositori.</div>
        </div>
        <div class="form-group">
          <label class="form-label">Konten Awal</label>
          <textarea id="new-note-content" class="textarea-field" rows="6" placeholder="# Judul Catatan&#10;&#10;Tuliskan catatan atau kendala lab di sini...">${escapeHtml(defaultContent)}</textarea>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" onclick="App.closeModal()">Batal</button>
          <button type="submit" class="btn btn-primary">Buat Catatan</button>
        </div>
      </form>
    `;

    modalBackdrop.classList.add('active');
    setTimeout(() => {
      const nameInput = document.getElementById('new-note-name');
      if (nameInput) nameInput.focus();
    }, 100);
  }

  function handleNewNoteSubmit(e) {
    e.preventDefault();
    let name = document.getElementById('new-note-name').value.trim();
    if (!name.endsWith('.md')) {
      name += '.md';
    }
    const content = document.getElementById('new-note-content').value;

    Store.saveNote(name, content);
    selectedNote = name;
    isEditing = false;
    App.closeModal();
    App.toast(`✓ Catatan ${name} berhasil dibuat!`, 'success');

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
    selectNote,
    enableEdit,
    cancelEdit,
    saveCurrentNote,
    copyNoteContent,
    updateWordCount,
    openNewNoteModal,
    handleNewNoteSubmit,
    parseFrontmatter
  };
})();

window.NotesPage = NotesPage;
