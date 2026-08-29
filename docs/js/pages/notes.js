/**
 * pages/notes.js — Halaman "Catatan" (Markdown Editor & Preview via marked.min.js)
 */

const NotesPage = (() => {
  let selectedNote = '00-index.md';
  let isEditing = false;

  function render(container) {
    const notes = Store.getNotes();
    const noteKeys = Object.keys(notes).sort();

    // Default selection
    if (!notes[selectedNote] && noteKeys.length > 0) {
      selectedNote = noteKeys[0];
    }

    const currentNote = notes[selectedNote] || { name: '00-index.md', content: '# Belum ada catatan\n\nPilih atau buat catatan baru.' };

    // Render markdown preview
    let renderedHtml = '';
    try {
      renderedHtml = window.marked ? window.marked.parse(currentNote.content || '') : `<pre>${escapeHtml(currentNote.content || '')}</pre>`;
    } catch (e) {
      renderedHtml = `<pre>${escapeHtml(currentNote.content || '')}</pre>`;
    }

    const sidebarHtml = `
      <div style="width: 260px; min-width: 260px; border-right: 1px solid var(--border-color); padding-right: 1rem; display: flex; flex-direction: column; gap: 0.5rem;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.5rem;">
          <strong style="font-size: 0.9rem; color: var(--text-muted);">Daftar Catatan</strong>
          <button class="btn btn-primary btn-sm" onclick="NotesPage.openNewNoteModal()" style="font-size: 0.75rem; padding: 0.2rem 0.5rem;">
            + Baru
          </button>
        </div>

        <div style="display: flex; flex-direction: column; gap: 0.25rem; overflow-y: auto; max-height: calc(100vh - 220px);">
          ${noteKeys.length > 0 ? noteKeys.map(k => `
            <button 
              class="btn ${k === selectedNote ? 'btn-primary' : 'btn-secondary'}" 
              style="text-align: left; justify-content: flex-start; padding: 0.45rem 0.65rem; font-size: 0.8rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;"
              onclick="NotesPage.selectNote('${k}')"
            >
              📄 ${escapeHtml(k)}
            </button>
          `).join('') : `
            <div style="font-size: 0.8rem; color: var(--text-dim); padding: 1rem 0;">Belum ada catatan.</div>
          `}
        </div>
      </div>
    `;

    const contentPaneHtml = `
      <div style="flex: 1; min-width: 0; padding-left: 1.25rem;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem; flex-wrap: wrap; gap: 0.5rem; border-bottom: 1px solid var(--border-subtle); padding-bottom: 0.75rem;">
          <div>
            <h2 style="font-size: 1.15rem; font-weight: 700;">📄 ${escapeHtml(selectedNote)}</h2>
            <div class="card-subtitle">Disimpan di direktori <code>notes/${escapeHtml(selectedNote)}</code></div>
          </div>
          <div style="display: flex; gap: 0.5rem;">
            ${isEditing ? `
              <button class="btn btn-secondary btn-sm" onclick="NotesPage.cancelEdit()">Batal</button>
              <button class="btn btn-primary btn-sm" onclick="NotesPage.saveCurrentNote()">💾 Simpan Catatan</button>
            ` : `
              <button class="btn btn-secondary btn-sm" onclick="NotesPage.enableEdit()">✏️ Edit Catatan</button>
            `}
          </div>
        </div>

        ${isEditing ? `
          <div>
            <textarea id="note-editor-textarea" class="textarea-field" style="height: calc(100vh - 280px); font-family: var(--font-mono); font-size: 0.875rem; line-height: 1.6; resize: vertical;">${escapeHtml(currentNote.content || '')}</textarea>
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
        <div class="card" style="display: flex; min-height: calc(100vh - 180px); padding: 1.25rem; flex-wrap: wrap;">
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
    if (container) render(container);
    setTimeout(() => {
      const ta = document.getElementById('note-editor-textarea');
      if (ta) ta.focus();
    }, 50);
  }

  function cancelEdit() {
    isEditing = false;
    const container = document.getElementById('main-content');
    if (container) render(container);
  }

  function saveCurrentNote() {
    const ta = document.getElementById('note-editor-textarea');
    if (!ta) return;
    const newContent = ta.value;

    Store.saveNote(selectedNote, newContent);
    isEditing = false;
    const container = document.getElementById('main-content');
    if (container) render(container);
  }

  function openNewNoteModal() {
    const modalBackdrop = document.getElementById('global-modal-backdrop');
    const modalContainer = document.getElementById('global-modal-content');
    if (!modalBackdrop || !modalContainer) return;

    modalContainer.innerHTML = `
      <div class="modal-header">
        <h3 class="modal-title">📝 Buat Catatan Topik Baru</h3>
        <button class="modal-close" onclick="App.closeModal()">&times;</button>
      </div>
      <form onsubmit="NotesPage.handleNewNoteSubmit(event)">
        <div class="form-group">
          <label class="form-label">Nama File Catatan (.md) *</label>
          <input type="text" id="new-note-filename" class="input-field" required placeholder="Contoh: aks-troubleshooting.md">
          <div class="form-hint">Gunakan format lowercase dengan tanda hubung, otomatis berakhiran <code>.md</code>.</div>
        </div>
        <div class="form-group">
          <label class="form-label">Judul Utama / Isi Awal</label>
          <textarea id="new-note-initial" class="textarea-field" rows="4" placeholder="# Judul Topik&#10;&#10;Catatan awal..."></textarea>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" onclick="App.closeModal()">Batal</button>
          <button type="submit" class="btn btn-primary">Buat Catatan</button>
        </div>
      </form>
    `;

    modalBackdrop.classList.add('active');
    setTimeout(() => {
      const fnInput = document.getElementById('new-note-filename');
      if (fnInput) fnInput.focus();
    }, 100);
  }

  function handleNewNoteSubmit(e) {
    e.preventDefault();
    let name = document.getElementById('new-note-filename').value.trim();
    if (!name.endsWith('.md')) name += '.md';
    let initial = document.getElementById('new-note-initial').value;
    if (!initial.trim()) {
      initial = `# ${name.replace('.md', '')}\n\n`;
    }

    Store.saveNote(name, initial);
    selectedNote = name;
    isEditing = true;
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
    selectNote,
    enableEdit,
    cancelEdit,
    saveCurrentNote,
    openNewNoteModal,
    handleNewNoteSubmit
  };
})();

window.NotesPage = NotesPage;
