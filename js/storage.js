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

(function (KQ) {
  'use strict';
  const KEY = 'kantonquiz.online.v1';
  const copy = value => JSON.parse(JSON.stringify(value));
  const empty = () => ({ nickname: null, reservation: null, pending: [], recent: null, personal: {} });
  KQ.normalizeNickname = value => typeof value === 'string' ? value.trim().replace(/[a-z]/g, c => c.toUpperCase()) : '';
  KQ.validNickname = value => typeof value === 'string' && /^[A-Z0-9_-]{2,12}$/.test(value);
  const uuid = value => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
  const validScore = s => s && Object.hasOwn(KQ.CONFIG, s.quizId) &&
    ['netMs', 'penaltyMs', 'errors', 'totalMs'].every(k => Number.isSafeInteger(s[k]) && s[k] >= 0) &&
    s.netMs >= 1 && s.netMs <= 86400000 && s.errors <= 10000 &&
    s.penaltyMs === s.errors * KQ.CONFIG[s.quizId].penalty && s.totalMs === s.netMs + s.penaltyMs;
  function clean(raw) {
    const state = empty();
    if (!raw || typeof raw !== 'object') return state;
    if (KQ.validNickname(raw.nickname)) state.nickname = raw.nickname;
    if (KQ.validNickname(raw.reservation?.nickname) && uuid(raw.reservation?.requestId)) state.reservation = raw.reservation;
    if (Array.isArray(raw.pending)) state.pending = raw.pending.filter(s => validScore(s) && KQ.validNickname(s.nickname) && uuid(s.id));
    if (validScore(raw.recent) && Array.isArray(raw.recent.rounds) && raw.recent.rounds.every(r => KQ.byId[r.id] && Number.isInteger(r.errors) && r.errors >= 0)) state.recent = raw.recent;
    for (const id of Object.keys(KQ.CONFIG)) if (Number.isSafeInteger(raw.personal?.[id]) && raw.personal[id] > 0) state.personal[id] = raw.personal[id];
    return state;
  }
  let memory = empty(); let loaded = false;
  KQ.onlineStorage = {
    available: true,
    load() {
      if (!loaded) {
        loaded = true;
        try { memory = clean(JSON.parse(localStorage.getItem(KEY))); }
        catch (error) { if (!(error instanceof SyntaxError)) this.available = false; }
      }
      return copy(memory);
    },
    update(fn) {
      const state = this.load(); fn(state); memory = clean(state);
      try { localStorage.setItem(KEY, JSON.stringify(memory)); }
      catch (_) { this.available = false; }
      return copy(memory);
    },
    reservation(name) {
      return this.update(state => {
        if (state.reservation?.nickname !== name) state.reservation = { nickname: name, requestId: crypto.randomUUID() };
      }).reservation;
    },
    confirm(name) { this.update(s => { s.nickname = name; s.reservation = null; }); },
    forget() { this.update(s => { s.nickname = null; s.reservation = null; }); },
    enqueue(score, name) {
      const entry = { ...score, nickname: name, id: crypto.randomUUID() };
      return this.update(s => {
        const old = s.pending.find(e => e.nickname === name && e.quizId === score.quizId);
        if (!old || score.totalMs < old.totalMs) {
          s.pending = s.pending.filter(e => e !== old); s.pending.push(entry);
        }
      }).pending.find(e => e.nickname === name && e.quizId === score.quizId);
    },
    remove(id) { this.update(s => { s.pending = s.pending.filter(e => e.id !== id); }); }
  };
})(window.KQ);
