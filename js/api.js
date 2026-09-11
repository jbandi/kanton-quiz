(function (KQ) {
  'use strict';
  function unavailable() {
    if (location.protocol === 'file:') return 'Gemeinsame Rangliste nur in der Online-App: https://jbandi.github.io/kanton-quiz/';
    if (!KQ.API_CONFIG.baseUrl) return 'Die gemeinsame Rangliste ist noch nicht konfiguriert.';
    return '';
  }
  async function request(path, method = 'GET', data) {
    if (unavailable()) throw new Error(unavailable());
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), KQ.API_CONFIG.timeoutMs);
    try {
      const response = await fetch(KQ.API_CONFIG.baseUrl.replace(/\/$/, '') + '/api/v1/' + path, {
        method, signal: controller.signal, credentials: 'omit', cache: 'no-store',
        headers: data ? { 'Content-Type': 'application/json' } : {},
        body: data ? JSON.stringify(data) : undefined
      });
      const payload = await response.json();
      if (!response.ok) throw Object.assign(new Error(payload.error?.message || 'Anfrage fehlgeschlagen.'), { code: payload.error?.code });
      return payload;
    } catch (error) {
      if (error.name === 'AbortError') throw new Error('Zeitüberschreitung. Bitte erneut versuchen.');
      if (error instanceof TypeError) throw new Error('Keine Verbindung zur gemeinsamen Rangliste. Bitte erneut versuchen.');
      throw error;
    } finally { clearTimeout(timeout); }
  }
  KQ.api = {
    unavailable,
    reserve: reservation => request('players', 'POST', reservation),
    score: ({ nickname, quizId, netMs, penaltyMs, errors }) => request('scores', 'PUT', { nickname, quizId, netMs, penaltyMs, errors }),
    leaderboard: id => request('leaderboard?quizId=' + encodeURIComponent(id))
  };
  // One in-flight promise per queued entry; retries never acquire a different nickname.
  const sending = new Map();
  KQ.transfers = {
    send(entry) {
      if (sending.has(entry.id)) return sending.get(entry.id);
      const task = KQ.api.score(entry).then(response => {
        KQ.onlineStorage.update(s => {
          s.pending = s.pending.filter(e => e.id !== entry.id);
          if (s.recent?.date === entry.date && s.recent?.assignedNickname === entry.nickname) {
            s.recent.saved = true; s.recent.sending = false;
            s.recent.message = 'In gemeinsamer Rangliste gespeichert.';
          }
        });
        window.dispatchEvent(new CustomEvent('kq-scores-updated', { detail: entry.quizId }));
        return response;
      }).catch(error => {
        if (error.code === 'NICKNAME_NOT_FOUND') {
          KQ.onlineStorage.update(s => {
            if (s.nickname === entry.nickname) s.nickname = null;
            s.pending.forEach(e => { if (e.nickname === entry.nickname) e.needsReservation = true; });
          });
        }
        throw error;
      }).finally(() => sending.delete(entry.id));
      sending.set(entry.id, task); return task;
    },
    busy: id => sending.has(id)
  };
})(window.KQ);
