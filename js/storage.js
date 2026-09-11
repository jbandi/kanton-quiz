(function (KQ) {
  'use strict';
  const KEY = 'kantonquiz.v1';
  const empty = () => ({ lastName: '', scores: Object.fromEntries(Object.keys(KQ.CONFIG).map(id => [id, []])) });
  let memory = empty();
  function validEntry(e) {
    return e && typeof e.name === 'string' && e.name.length <= 12 &&
      ['totalMs', 'netMs', 'penaltyMs', 'errors'].every(key => Number.isFinite(e[key]) && e[key] >= 0) &&
      Number.isInteger(e.errors) && Math.abs(e.totalMs - e.netMs - e.penaltyMs) < 1 &&
      typeof e.date === 'string' && Number.isFinite(Date.parse(e.date));
  }
  function clean(raw) {
    const result = empty();
    if (!raw || typeof raw !== 'object') return result;
    if (typeof raw.lastName === 'string') result.lastName = raw.lastName.slice(0, 12);
    for (const id of Object.keys(result.scores)) {
      if (Array.isArray(raw.scores?.[id])) result.scores[id] = raw.scores[id].filter(validEntry)
        .map(e => ({ name: e.name, totalMs: e.totalMs, netMs: e.netMs, penaltyMs: e.penaltyMs, errors: e.errors, date: e.date }))
        .sort((a, b) => a.totalMs - b.totalMs).slice(0, 10);
    }
    return result;
  }
  KQ.storage = {
    available: true,
    load() {
      if (!this.available) return structuredCopy(memory);
      try { memory = clean(JSON.parse(localStorage.getItem(KEY))); }
      catch (error) { if (error instanceof SyntaxError) memory = empty(); else this.available = false; }
      return structuredCopy(memory);
    },
    save(data) {
      memory = clean(data);
      try { localStorage.setItem(KEY, JSON.stringify(memory)); }
      catch (_) { this.available = false; }
      return structuredCopy(memory);
    },
    addScore(id, entry) {
      const data = this.load();
      if (!Object.hasOwn(data.scores, id) || !validEntry(entry)) return data;
      data.lastName = entry.name;
      data.scores[id].push(entry);
      return this.save(data);
    },
    getBest(id) { return this.load().scores[id]?.[0] || null; },
    clear(id) {
      const data = this.load();
      if (Object.hasOwn(data.scores, id)) data.scores[id] = [];
      return this.save(data);
    }
  };
  function structuredCopy(value) { return JSON.parse(JSON.stringify(value)); }
})(window.KQ);
