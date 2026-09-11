(function (KQ) {
  'use strict';
  const $ = id => document.getElementById(id);
  const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const crest = (id, label = '') => '<img class="crest" src="assets/wappen/' + id + '.svg" alt="' + escape(label) + '">';
  let game = null;
  let result = KQ.onlineStorage.load().recent;
  let viewVersion = 0;
  let feedbackTimeout = null;
  function storageNote() { $('storage-note').hidden = KQ.storage.available && KQ.onlineStorage.available; }
  function show(view) {
    viewVersion++;
    document.querySelectorAll('.view').forEach(node => { node.hidden = node.id !== view + '-view'; });
    $('map-panel').hidden = !['game', 'learn'].includes(view);
    window.scrollTo(0, 0);
  }
  function home() {
    show('home');
    $('quiz-cards').innerHTML = Object.entries(KQ.CONFIG).map(([id, config], index) => {

      return '<article class="quiz-card"><div class="card-top"><span class="quiz-icon" aria-hidden="true">' + config.icon + '</span><span class="round-badge">' + config.rounds + ' Runden</span></div><p class="card-number">QUIZ 0' + (index + 1) + '</p><h2>' + config.title + '</h2><p class="card-description">' + config.description + '</p><div class="best-time"><span>GEMEINSAME BESTZEIT</span><strong id="best-' + id + '">Wird geladen …</strong></div><div class="card-actions"><a class="primary" href="#/quiz/' + id + '">Spielen <span aria-hidden="true">→</span></a><a href="#/rangliste/' + id + '">Rangliste</a></div></article>';
    }).join('');
    const version = viewVersion;
    for (const id of Object.keys(KQ.CONFIG)) {
      KQ.api.leaderboard(id).then(data => {
        if (version !== viewVersion) return;
        $('best-' + id).textContent = data.entries.length ? KQ.formatTime(data.entries[0].totalMs, true) + ' · ' + data.entries[0].nickname : 'Noch keine Zeit';
      }).catch(error => { if (version === viewVersion) $('best-' + id).textContent = error.message + ' Über «Rangliste» erneut laden.'; });
    }
    storageNote();
  }
  function mountMap(slot) { $(slot).append($('map-panel')); $('map-panel').hidden = false; }
  class Game {
    constructor(id) {
      this.id = id;
      this.config = KQ.CONFIG[id];
      this.rounds = KQ.shuffle(KQ.KANTONE).slice(0, this.config.rounds);
      this.index = 0; this.errors = 0; this.history = []; this.locked = false;
      this.timer = new KQ.Timer(time => {
        $('timer').textContent = KQ.formatTime(time.totalMs);
        $('penalty-total').textContent = 'inkl. ' + Math.round(time.penaltyMs / 1000) + ' s Malus';
      });
    }
    start() {
      show('game'); mountMap('game-map-slot'); KQ.map.reset(); KQ.map.resetZoom();
      $('game-title').textContent = this.config.title;
      $('progress').max = this.rounds.length;
      this.render();
    }
    render() {
      this.target = this.rounds[this.index]; this.errors = 0; this.locked = false;
      KQ.map.reset(this.id === 'blitz');
      $('options').replaceChildren(); $('prompt-wappen').replaceChildren();
      $('feedback').hidden = true; $('feedback').onclick = null;
      $('check-answer').hidden = true; $('check-answer').onclick = null;
      $('round-counter').textContent = this.id === 'blitz' ? this.index + ' / ' + this.rounds.length : 'Runde ' + (this.index + 1) + ' von ' + this.rounds.length;
      $('progress').value = this.index;
      $('keyboard-hint').textContent = ['erkennen', 'nachbarn'].includes(this.id) ? 'Auch mit den Tasten 1–4' + (this.id === 'nachbarn' ? ' und Enter.' : '.') : 'Karte: mit Tab auswählen, mit Enter bestätigen. Zum Verschieben vergrössern.';
      KQ.quizzes[this.id].render(this);
      $('question').focus({ preventScroll: true });
      this.timer.resume();
    }
    question(title, hint) { $('question').textContent = title; $('question-hint').textContent = hint; }
    promptWappen(id) { $('prompt-wappen').innerHTML = crest(id, 'Gesuchtes Kantonswappen'); }
    options(ids, type, handler) {
      $('options').innerHTML = ids.map((id, index) => '<button class="option ' + (type === 'id' ? 'abbreviation' : '') + '" data-id="' + id + '"' + (this.id === 'nachbarn' ? ' aria-pressed="false"' : '') + '><kbd>' + (index + 1) + '</kbd>' + (type === 'wappen' ? crest(id, 'Wappen – Antwort ' + (index + 1)) : escape(type === 'both' ? KQ.byId[id].name + ' (' + id + ')' : KQ.byId[id][type])) + '</button>').join('');
      $('options').querySelectorAll('button').forEach(button => button.onclick = () => { if (!this.locked) handler(button.dataset.id, button); });
    }
    button(id) { return $('options').querySelector('[data-id="' + id + '"]'); }
    penalize(count = 1) {
      const ms = this.config.penalty * count;
      this.timer.addPenalty(ms);
      const pop = $('penalty-pop');
      pop.textContent = '+' + ms / 1000 + ' s';
      pop.classList.remove('animate'); $('timer').classList.remove('flash');
      void pop.offsetWidth;
      pop.classList.add('animate'); $('timer').classList.add('flash');
    }
    wrong(id, option) {
      if (this.locked) return;
      this.errors++; this.penalize();
      if (option) { const button = this.button(id); button.classList.add('wrong', 'shake'); button.disabled = true; }
      else {
        KQ.map.flash(id);
        if (this.id !== 'blitz') { KQ.map.paint(id, 'wrong'); KQ.map.disable(id); }
      }
    }
    correct(id) {
      if (this.locked) return;
      KQ.map.paint(id, 'correct'); KQ.map.disable(id);
      const button = this.button(id);
      if (button) button.classList.add('correct');
      if (this.id === 'blitz') {
        KQ.map.paint(id, 'success-flash');
        this.record(); this.index++;
        if (this.index === this.rounds.length) this.finish(); else this.render();
      } else this.completeRound('Richtig!');
    }
    record() { this.history.push({ id: this.target.id, errors: this.errors }); }
    completeRound(message) {
      this.locked = true;
      this.timer.pause(); this.record();
      $('options').querySelectorAll('button').forEach(button => { button.disabled = true; });
      KQ.map.onSelect = null;
      $('feedback').innerHTML = crest(this.target.id) + '<div><strong>' + escape(this.target.name) + ' (' + this.target.id + ') · Hauptort: ' + escape(this.target.hauptort) + '</strong><span>' + escape(message) + '</span></div>';
      $('feedback').hidden = false;
      if (this.id === 'nachbarn') $('feedback').onclick = () => this.next();
      feedbackTimeout = setTimeout(() => this.next(), this.config.feedback);
    }
    next() {
      if (!this.locked || game !== this) return;
      clearTimeout(feedbackTimeout); this.locked = false; this.index++;
      if (this.index === this.rounds.length) this.finish(); else this.render();
    }
    finish() {
      const time = this.timer.stop();
      time.netMs = Math.max(1, Math.round(time.netMs)); time.totalMs = time.netMs + time.penaltyMs;
      result = { quizId: this.id, ...time, errors: this.history.reduce((sum, r) => sum + r.errors, 0), rounds: this.history, saved: false, date: new Date().toISOString() };
      const best = KQ.onlineStorage.load().personal[this.id];
      result.isBest = !best || result.totalMs < best;
      KQ.onlineStorage.update(s => { s.recent = result; s.personal[this.id] = Math.min(best || Infinity, result.totalMs); });
      game = null;
      location.hash = '#/ergebnis';
    }
    dispose() { clearTimeout(feedbackTimeout); this.timer.stop(); KQ.map.onSelect = null; this.locked = true; }
  }
  function persistResult(target) {
    KQ.onlineStorage.update(s => { if (s.recent?.date === target.date) s.recent = target; });
    storageNote();
  }
  function changeNickname() {
    if (!confirm('Dein bisheriges Kürzel bleibt vergeben. Du kannst es hier anschliessend nicht erneut auswählen. Kürzel ändern?')) return;
    KQ.onlineStorage.forget();
    if (result) {
      // Queued attempts keep their identity; an unqueued result can choose a new one.
      if (!result.saved && !KQ.onlineStorage.load().pending.some(e => e.date === result.date)) result.assignedNickname = null;
      result.draft = ''; persistResult(result);
    }
    route();
  }
  async function submitResult(reserve = true) {
    const target = result;
    if (!target || target.sending || target.saved) return;
    let name = target.assignedNickname || KQ.onlineStorage.load().nickname;
    if (!name && !reserve) return;
    if (!name) {
      name = KQ.normalizeNickname($('player-name')?.value || target.draft || '');
      target.draft = name;
      if (!KQ.validNickname(name)) {
        target.message = 'Bitte 2–12 Zeichen verwenden: A–Z, 0–9, _ oder -.'; persistResult(target); results(); return;
      }
    }
    target.sending = true; target.message = 'Wird übertragen …';
    persistResult(target);
    if (location.hash === '#/ergebnis') results();
    try {
      if (!target.assignedNickname && !KQ.onlineStorage.load().nickname) {
        const reservation = KQ.onlineStorage.reservation(name);
        const confirmed = await KQ.api.reserve(reservation);
        KQ.onlineStorage.confirm(confirmed.nickname);
      }
      target.assignedNickname = name;
      const queued = KQ.onlineStorage.enqueue(target, name);
      persistResult(target);
      const response = await KQ.transfers.send(queued);
      target.saved = true;
      target.message = 'In gemeinsamer Rangliste gespeichert' + (response.improved ? '.' : '. Deine bisherige Bestzeit bleibt bestehen.');
    } catch (error) {
      target.message = 'Ergebnis noch nicht übertragen. ' + error.message;
      if (error.code === 'NICKNAME_NOT_FOUND') {
        target.assignedNickname = null;
        target.draft = name;
      }
    } finally {
      target.sending = false; persistResult(target);
      if (result === target && location.hash === '#/ergebnis') results();
    }
  }
  function results() {
    const storedResult = KQ.onlineStorage.load().recent;
    if (storedResult?.date === result?.date && storedResult?.saved && !result?.sending) result = storedResult;
    if (!result) { location.replace('#/'); return; }
    show('result');
    const perfect = result.rounds.filter(r => r.errors === 0).length;
    $('result-view').innerHTML = '<p class="eyebrow">' + KQ.CONFIG[result.quizId].title + ' · GESCHAFFT</p><h1 id="result-title">Die Schweiz liegt dir!</h1>' + (result.isBest ? '<p class="new-best">✦ Neue persönliche Bestzeit!</p>' : '') + '<div class="result-time">' + KQ.formatTime(result.totalMs, true) + '</div><p class="result-caption">Deine Gesamtzeit</p><div class="result-stats"><div><strong>' + KQ.formatTime(result.netMs, true) + '</strong><span>Nettozeit</span></div><div><strong>+' + result.penaltyMs / 1000 + ' s</strong><span>Malus · ' + result.errors + ' Fehler</span></div><div><strong>' + perfect + ' von ' + result.rounds.length + '</strong><span>Runden fehlerfrei</span></div></div><h2>Deine Kantone</h2><ul class="round-results ' + (result.quizId === 'blitz' ? 'compact' : '') + '">' + result.rounds.map(r => '<li>' + crest(r.id) + '<span>' + escape(KQ.byId[r.id].name) + ' <small>(' + r.id + ')</small></span><strong class="' + (r.errors ? 'error-text' : 'success-text') + '">' + (r.errors ? '✗ ' + r.errors + ' Fehler' : '✓') + '</strong></li>').join('') + '</ul><div id="result-sharing"></div><div class="result-actions"><button class="secondary" id="play-again">Nochmals spielen</button><a id="result-home" href="#/">Zur Übersicht</a><a href="#/rangliste/' + result.quizId + '">Rangliste ansehen</a></div>';
    const state = KQ.onlineStorage.load();
    const name = result.assignedNickname || state.nickname;
    const disabled = result.sending || result.saved || !!KQ.api.unavailable();
    $('result-sharing').innerHTML = '<form id="score-form">' + (name ? '<p>Dein Kürzel: <strong>' + escape(name) + '</strong></p>' :
      '<label for="player-name">Dein Kürzel</label><p id="nickname-hint">Wähle ein Kürzel statt deines vollständigen Namens. 2–12 Zeichen: A–Z, 0–9, _ oder -.</p><input id="player-name" autocomplete="nickname" aria-describedby="nickname-hint" value="' + escape(result.draft ?? state.reservation?.nickname ?? KQ.storage.load().lastName) + '"' + (result.sending ? ' disabled' : '') + '>') +
      '<button class="primary" type="submit"' + (disabled ? ' disabled' : '') + '>' + (result.saved ? 'Gespeichert' : 'In Rangliste eintragen') + '</button></form><p role="status">' + escape(result.message || 'Ergebnis noch nicht übertragen') + '</p><p>' + escape(KQ.api.unavailable()) + '</p>' + (state.nickname ? '<button class="quiet" id="change-nickname"' + (result.sending ? ' disabled' : '') + '>Kürzel ändern</button>' : '');
    if ($('player-name')) $('player-name').oninput = event => { result.draft = event.target.value; persistResult(result); };
    if ($('change-nickname')) $('change-nickname').onclick = changeNickname;
    $('score-form').onsubmit = event => { event.preventDefault(); void submitResult(); };
    $('play-again').onclick = () => { void submitResult(false); location.hash = '#/quiz/' + result.quizId; };
    $('result-home').onclick = () => { void submitResult(false); };
    storageNote();
  }
  function leaderboard(id) {
    show('leaderboard');
    const version = viewVersion;
    $('leaderboard-view').innerHTML = '<a class="back-link" href="#/">← Zur Übersicht</a><p class="eyebrow">GEMEINSAME RANGLISTE</p><h1 id="leaderboard-title">' + KQ.CONFIG[id].title + '</h1><p>Je Kürzel zählt die beste Gesamtzeit.</p><div id="ranking" aria-live="polite">Wird geladen …</div><div class="leaderboard-actions"><a class="primary" href="#/quiz/' + id + '">Spielen →</a><button id="refresh-scores">Aktualisieren</button></div><div id="pending-scores"></div>';
    $('refresh-scores').onclick = () => leaderboard(id);
    renderPending(id, version);
    KQ.api.leaderboard(id).then(data => {
      if (version !== viewVersion) return;
      $('ranking').innerHTML = data.entries.length ? '<div class="table-scroll"><table><caption class="sr-only">Rangliste</caption><thead><tr><th>Platz</th><th>Kürzel</th><th>Gesamtzeit</th><th>Fehler</th><th>Datum</th></tr></thead><tbody>' + data.entries.map((score, i) =>
        '<tr' + (score.nickname === KQ.onlineStorage.load().nickname ? ' class="latest"' : '') + '><td>' + (i + 1) + '</td><th scope="row">' + escape(score.nickname) + '</th><td class="score-time">' + KQ.formatTime(score.totalMs, true) + '</td><td>' + score.errors + '</td><td>' + new Date(score.achievedAt).toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' }) + '</td></tr>').join('') + '</tbody></table></div>' : '<p>Noch keine Einträge. Hier ist Platz für deine erste Zeit.</p>';
    }).catch(error => { if (version === viewVersion) $('ranking').textContent = 'Rangliste nicht geladen. ' + error.message + ' Mit «Aktualisieren» erneut versuchen.'; });
    storageNote();
  }
  function renderPending(id, version) {
    const state = KQ.onlineStorage.load();
    const entries = state.pending.filter(e => e.quizId === id);
    $('pending-scores').innerHTML = (state.nickname ? '<p>Dein Kürzel: <strong>' + escape(state.nickname) + '</strong> <button id="change-nickname-ranking">Kürzel ändern</button></p>' : '') +
      (entries.length ? '<h2>Ausstehende Übertragungen</h2>' : '') + entries.map(e => '<div class="pending-entry"><p>' + escape(e.nickname) + ' · ' + KQ.formatTime(e.totalMs, true) + '</p><button data-retry="' + e.id + '"' + (KQ.transfers.busy(e.id) ? ' disabled' : '') + '>' + (e.needsReservation ? 'Kürzel erneut reservieren und übertragen' : 'Erneut übertragen') + '</button><p role="status" id="status-' + e.id + '">Ergebnis noch nicht übertragen</p></div>').join('');
    if ($('change-nickname-ranking')) $('change-nickname-ranking').onclick = changeNickname;
    $('pending-scores').querySelectorAll('[data-retry]').forEach(button => button.onclick = async () => {
      const entry = entries.find(e => e.id === button.dataset.retry);
      button.disabled = true; $('status-' + entry.id).textContent = 'Wird übertragen …';
      try {
        if (entry.needsReservation) {
          const reserved = await KQ.api.reserve(KQ.onlineStorage.reservation(entry.nickname));
          // Retrying an old nickname must not replace a newer browser identity.
          if (!KQ.onlineStorage.load().nickname) KQ.onlineStorage.confirm(reserved.nickname);
          KQ.onlineStorage.update(s => { s.pending.forEach(e => { if (e.nickname === entry.nickname) e.needsReservation = false; }); });
        }
        await KQ.transfers.send(entry);
        if (version === viewVersion) leaderboard(id);
      } catch (error) {
        if (version !== viewVersion) return;
        renderPending(id, version);
        $('status-' + entry.id).textContent = 'Ergebnis noch nicht übertragen. ' + error.message;
      }
      storageNote();
    });
  }
  function learn() {
    show('learn'); mountMap('learn-map-slot'); KQ.map.reset(); KQ.map.resetZoom();
    $('canton-grid').innerHTML = KQ.KANTONE.map(k => '<button class="canton-card" id="learn-' + k.id + '" data-id="' + k.id + '" aria-pressed="false">' + crest(k.id) + '<span><strong>' + escape(k.name) + ' <small>' + k.id + '</small></strong><span>Hauptort: ' + escape(k.hauptort) + '</span></span></button>').join('');
    const select = (id, fromMap) => {
      KQ.map.reset(); KQ.map.labels(KQ.KANTONE.map(k => k.id)); KQ.map.paint(id, 'marked'); KQ.map.onSelect = key => select(key, true);
      document.querySelectorAll('.canton-card').forEach(node => { const active = node.dataset.id === id; node.classList.toggle('selected', active); node.setAttribute('aria-pressed', String(active)); });
      if (fromMap) $('learn-' + id).scrollIntoView({ block: 'nearest' });
      else KQ.map.node(id).scrollIntoView({ block: 'center', inline: 'center' });
    };
    KQ.map.labels(KQ.KANTONE.map(k => k.id));
    KQ.map.onSelect = id => select(id, true);
    document.querySelectorAll('.canton-card').forEach(node => node.onclick = () => select(node.dataset.id, false));
  }
  function route() {
    if (game) { game.dispose(); game = null; }
    clearTimeout(feedbackTimeout); KQ.map.reset();
    const parts = location.hash.replace(/^#\/?/, '').split('/');
    if (parts[0] === 'quiz' && Object.hasOwn(KQ.CONFIG, parts[1])) { result = null; game = new Game(parts[1]); game.start(); }
    else if (parts[0] === 'rangliste' && Object.hasOwn(KQ.CONFIG, parts[1])) leaderboard(parts[1]);
    else if (parts[0] === 'lernen') learn();
    else if (parts[0] === 'ergebnis') results();
    else home();
    if (!game) $('main').focus({ preventScroll: true });
  }
  // A page reload ends requests, but keeps the finished game and reservation attempt.
  if (result) result.sending = false;
  window.addEventListener('kq-scores-updated', event => {
    if (location.hash === '#/rangliste/' + event.detail) leaderboard(event.detail);
    else if (!location.hash || location.hash === '#/') home();
    else void KQ.api.leaderboard(event.detail).catch(() => {});
  });
  KQ.map.init();
  $('abort').onclick = () => { if (game && confirm('Quiz wirklich abbrechen? Diese Runde wird nicht gewertet.')) location.hash = '#/'; };
  document.addEventListener('keydown', event => {
    if (!game || event.repeat || event.ctrlKey || event.metaKey || event.altKey || /INPUT|TEXTAREA|SELECT/.test(event.target.tagName)) return;
    if (/^[1-4]$/.test(event.key)) { event.preventDefault(); $('options').querySelectorAll('button')[Number(event.key) - 1]?.click(); }
    if (event.key === 'Enter' && game.id === 'nachbarn') { event.preventDefault(); if (game.locked) game.next(); else $('check-answer').click(); }
  });
  // Use pointerdown so the click that submitted an answer cannot skip its own feedback.
  document.addEventListener('pointerdown', event => {
    if (game?.id === 'nachbarn' && game.locked && !event.target.closest('#abort, a, #zoom-in, #zoom-out')) game.next();
  });
  window.addEventListener('hashchange', route);
  route();
})(window.KQ);
