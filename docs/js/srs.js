/**
 * srs.js — Spaced Repetition System (Leitner 5-box)
 * Box intervals: 1, 2, 4, 8, 16 hari.
 * Kartu type: decision memakai interval lebih rapat: dikalikan 0.6 (dibulatkan ke bawah, minimal 1 hari).
 */

const SRS = (() => {
  const BASE_INTERVALS = {
    1: 1,
    2: 2,
    3: 4,
    4: 8,
    5: 16
  };

  function getInterval(box, cardType) {
    const b = Math.min(Math.max(Number(box) || 1, 1), 5);
    const base = BASE_INTERVALS[b] || 1;
    if (cardType === 'decision') {
      return Math.max(1, Math.floor(base * 0.6));
    }
    return base;
  }

  function parseDate(dateStr) {
    if (!dateStr) return null;
    const parts = dateStr.split('-');
    if (parts.length !== 3) return null;
    return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  }

  function formatDate(d) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function isCardDue(card, progressEntry, todayDate) {
    const today = todayDate ? new Date(todayDate) : new Date();
    today.setHours(0, 0, 0, 0);

    if (!progressEntry || !progressEntry.last) {
      // Kartu baru langsung jatuh tempo hari ini
      return true;
    }

    const lastDate = parseDate(progressEntry.last);
    if (!lastDate) return true;

    const interval = getInterval(progressEntry.box || 1, card.type);
    const dueDate = new Date(lastDate);
    dueDate.setDate(dueDate.getDate() + interval);
    dueDate.setHours(0, 0, 0, 0);

    return dueDate <= today;
  }

  function getDueCards(cards, progress, filters = {}) {
    const todayStr = formatDate(new Date());
    const all = filters.all === true || filters.all === '1';

    return cards.filter(card => {
      // Filter domain
      if (filters.domain && card.domain !== filters.domain) return false;
      // Filter type
      if (filters.type && card.type !== filters.type) return false;
      // Filter week (if card has week property)
      if (filters.week && card.week && String(card.week) !== String(filters.week)) return false;

      if (all) return true;

      const p = progress[card.id];
      return isCardDue(card, p, todayStr);
    });
  }

  return {
    getInterval,
    isCardDue,
    getDueCards,
    formatDate
  };
})();

window.SRS = SRS;
