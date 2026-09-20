/**
 * srs.js — Spaced Repetition System (Leitner 5-box) & Status Objective Filter
 * Mengimplementasikan Spesifikasi Teknis S1 secara presisi.
 */

const SRS = (() => {
  const OBJ_TERBUKA = ['dibaca', 'dipraktikkan', 'kuasai'];

  function parseDate(dateStr) {
    if (!dateStr) return null;
    if (dateStr instanceof Date) {
      const d = new Date(dateStr);
      d.setHours(0, 0, 0, 0);
      return d;
    }
    const parts = String(dateStr).split('-');
    if (parts.length !== 3) return null;
    return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  }

  function formatDate(d) {
    if (!d) return '';
    const dateObj = d instanceof Date ? d : new Date(d);
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Normalisasi lookup map untuk objective: dukung baik 'obj-01' maupun 'o01'
  function getObjectiveMap(objectiveById) {
    if (!objectiveById) {
      if (typeof Store !== 'undefined' && Store.getObjectives) {
        const list = Store.getObjectives();
        const map = {};
        list.forEach(o => {
          map[o.id] = o;
          map[o.id.replace('obj-', 'o')] = o;
        });
        return map;
      }
      return {};
    }
    // Jika sudah berupa map/object
    return objectiveById;
  }

  function lookupObjective(objId, objMap) {
    if (!objId || !objMap) return null;
    if (objMap[objId]) return objMap[objId];
    const alt = objId.startsWith('obj-') ? objId.replace('obj-', 'o') : (objId.startsWith('o') ? 'obj-' + objId.slice(1).padStart(2, '0') : objId);
    return objMap[alt] || null;
  }

  // S1: kartuAktif
  function kartuAktif(kartu, objectiveById) {
    if (!kartu.objective) return true; // kosong atau null -> true
    const objMap = getObjectiveMap(objectiveById);
    const obj = lookupObjective(kartu.objective, objMap);
    if (!obj) return true; // yatim, muncul di Diagnostik
    return OBJ_TERBUKA.includes(obj.status);
  }

  // S1: intervalHari
  function intervalHari(box, tipeKartu) {
    const b = Math.min(Math.max(Number(box) || 1, 1), 5);
    const dasar = [1, 2, 4, 8, 16][b - 1];
    if (tipeKartu === 'decision') {
      return Math.max(1, Math.floor(dasar * 0.6));
    }
    return dasar;
  }

  // S1: jatuhTempo
  function jatuhTempo(kartu, progress, objectiveById, hariIni) {
    // WAJIB diperiksa paling awal: jika BUKAN kartuAktif -> false
    if (!kartuAktif(kartu, objectiveById)) {
      return false;
    }

    const p = progress ? progress[kartu.id] : null;
    // Jika belum pernah didrill -> langsung jatuh tempo
    if (!p || !p.last) {
      return true;
    }

    const lastDate = parseDate(p.last);
    if (!lastDate) return true;

    const interval = intervalHari(p.box || 1, kartu.type);
    const dueDate = new Date(lastDate);
    dueDate.setDate(dueDate.getDate() + interval);
    dueDate.setHours(0, 0, 0, 0);

    const today = hariIni ? parseDate(hariIni) : new Date();
    today.setHours(0, 0, 0, 0);

    return dueDate <= today;
  }

  // Satu-satunya fungsi perolehan kartu jatuh tempo
  function getDueCards(cards, progress, objectiveById, filters = {}, hariIni = null) {
    const objMap = getObjectiveMap(objectiveById);
    const todayStr = hariIni || formatDate(new Date());

    return (cards || []).filter(card => {
      // Filter domain
      if (filters.domain && filters.domain !== 'all' && card.domain !== filters.domain) return false;
      // Filter type
      if (filters.type && filters.type !== 'all' && card.type !== filters.type) return false;
      // Filter objective
      if (filters.objective && filters.objective !== 'all' && card.objective !== filters.objective) return false;

      // Jika meminta seluruh kartu aktif (misal untuk drill all)
      if (filters.all === true || filters.all === '1') {
        return kartuAktif(card, objMap);
      }

      return jatuhTempo(card, progress, objMap, todayStr);
    });
  }

  function getActiveCards(cards, objectiveById) {
    const objMap = getObjectiveMap(objectiveById);
    return (cards || []).filter(c => kartuAktif(c, objMap));
  }

  function getDormantCards(cards, objectiveById) {
    const objMap = getObjectiveMap(objectiveById);
    return (cards || []).filter(c => !kartuAktif(c, objMap));
  }

  return {
    OBJ_TERBUKA,
    parseDate,
    formatDate,
    kartuAktif,
    intervalHari,
    getInterval: intervalHari, // alias kompatibilitas
    jatuhTempo,
    isCardDue: (card, p, today, objById) => jatuhTempo(card, { [card.id]: p }, objById, today),
    getDueCards,
    getActiveCards,
    getDormantCards
  };
})();

window.SRS = SRS;
