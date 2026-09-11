(function (KQ) {
  'use strict';
  const $ = id => document.getElementById(id);
  const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const crest = (id, label = '') => '<img class="crest" src="assets/wappen/' + id + '.svg" alt="' + escape(label) + '">';
  let game = null;
  let result = null;
  let latestScore = null;
  let feedbackTimeout = null;
  function storageNote() { $('storage-note').hidden = KQ.storage.available; }
  function show(view) {
    document.querySelectorAll('.view').forEach(node => { node.hidden = node.id !== view + '-view'; });
    $('map-panel').hidden = !['game', 'learn'].includes(view);
    window.scrollTo(0, 0);
  }
  function home() {
    show('home');
    $('quiz-cards').innerHTML = Object.entries(KQ.CONFIG).map(([id, config], index) => {
      const best = KQ.storage.getBest(id);
      return '<article class="quiz-card"><div class="card-top"><span class="quiz-icon" aria-hidden="true">' + config.icon + '</span><span class="round-badge">' + config.rounds + ' Runden</span></div><p class="card-number">QUIZ 0' + (index + 1) + '</p><h2>' + config.title + '</h2><p class="card-description">' + config.description + '</p><div class="best-time"><span>DEINE BESTZEIT</span><strong>' + (best ? KQ.formatTime(best.totalMs, true) + ' <small>· ' + escape(best.name) + '</small>' : 'Noch keine Zeit') + '</strong></div><div class="card-actions"><a class="primary" href="#/quiz/' + id + '">Spielen <span aria-hidden="true">→</span></a><a href="#/rangliste/' + id + '">Rangliste</a></div></article>';
    }).join('');
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
      result = { quizId: this.id, ...time, errors: this.history.reduce((sum, r) => sum + r.errors, 0), rounds: this.history, saved: false, date: new Date().toISOString() };
      const best = KQ.storage.getBest(this.id);
      result.isBest = !best || result.totalMs < best.totalMs;
      game = null;
      location.hash = '#/ergebnis';
    }
    dispose() { clearTimeout(feedbackTimeout); this.timer.stop(); KQ.map.onSelect = null; this.locked = true; }
  }
  function saveResult() {
    if (!result || result.saved) return;
    const name = ($('player-name')?.value || '').trim().slice(0, 12) || 'Anonym';
    const entry = { name, totalMs: result.totalMs, netMs: result.netMs, penaltyMs: result.penaltyMs, errors: result.errors, date: result.date };
    KQ.storage.addScore(result.quizId, entry);
    result.saved = true; latestScore = { quizId: result.quizId, ...entry }; storageNote();
  }
  function results() {
    if (!result) { location.replace('#/'); return; }
    show('result');
    const perfect = result.rounds.filter(r => r.errors === 0).length;
    $('result-view').innerHTML = '<p class="eyebrow">' + KQ.CONFIG[result.quizId].title + ' · GESCHAFFT</p><h1 id="result-title">Die Schweiz liegt dir!</h1>' + (result.isBest ? '<p class="new-best">✦ Neue Bestzeit!</p>' : '') + '<div class="result-time">' + KQ.formatTime(result.totalMs, true) + '</div><p class="result-caption">Deine Gesamtzeit</p><div class="result-stats"><div><strong>' + KQ.formatTime(result.netMs, true) + '</strong><span>Nettozeit</span></div><div><strong>+' + result.penaltyMs / 1000 + ' s</strong><span>Malus · ' + result.errors + ' Fehler</span></div><div><strong>' + perfect + ' von ' + result.rounds.length + '</strong><span>Runden fehlerfrei</span></div></div><h2>Deine Kantone</h2><ul class="round-results ' + (result.quizId === 'blitz' ? 'compact' : '') + '">' + result.rounds.map(r => '<li>' + crest(r.id) + '<span>' + escape(KQ.byId[r.id].name) + ' <small>(' + r.id + ')</small></span><strong class="' + (r.errors ? 'error-text' : 'success-text') + '">' + (r.errors ? '✗ ' + r.errors + ' Fehler' : '✓') + '</strong></li>').join('') + '</ul><form id="score-form"><label for="player-name">Dein Name <span>(freiwillig)</span></label><div class="name-row"><input id="player-name" name="name" maxlength="12" autocomplete="nickname" placeholder="Anonym" value="' + escape(KQ.storage.load().lastName) + '"' + (result.saved ? ' disabled' : '') + '><button class="primary" type="submit">' + (result.saved ? 'Rangliste ansehen' : 'In Rangliste eintragen') + '</button></div></form><div class="result-actions"><button class="secondary" id="play-again">Nochmals spielen</button><a id="result-home" href="#/">Zur Übersicht</a></div>';
    $('score-form').onsubmit = event => { event.preventDefault(); saveResult(); location.hash = '#/rangliste/' + result.quizId; };
    $('play-again').onclick = () => { saveResult(); location.hash = '#/quiz/' + result.quizId; };
    $('result-home').onclick = saveResult;
    storageNote();
  }
  function leaderboard(id) {
    show('leaderboard');
    const scores = KQ.storage.load().scores[id];
    $('leaderboard-view').innerHTML = '<a class="back-link" href="#/">← Zur Übersicht</a><p class="eyebrow">DEINE TOP 10</p><h1 id="leaderboard-title">' + KQ.CONFIG[id].title + '</h1><p>Die schnellsten Gesamtzeiten auf diesem Gerät.</p>' + (scores.length ? '<div class="table-scroll"><table><caption class="sr-only">Rangliste: ' + KQ.CONFIG[id].title + '</caption><thead><tr><th>Rang</th><th>Name</th><th>Gesamtzeit</th><th>Fehler</th><th>Datum</th></tr></thead><tbody>' + scores.map((score, index) => '<tr' + (latestScore?.quizId === id && latestScore.date === score.date && latestScore.totalMs === score.totalMs && latestScore.name === score.name ? ' class="latest"' : '') + '><td>' + (index + 1) + '</td><th scope="row">' + escape(score.name) + '</th><td class="score-time">' + KQ.formatTime(score.totalMs, true) + '</td><td>' + score.errors + '</td><td>' + new Date(score.date).toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' }) + '</td></tr>').join('') + '</tbody></table></div>' : '<div class="empty-state"><span aria-hidden="true">◎</span><h2>Hier ist Platz für deine erste Zeit.</h2><p>Spiele eine Runde und trage dich ein.</p></div>') + '<div class="leaderboard-actions"><a class="primary" href="#/quiz/' + id + '">' + (latestScore?.quizId === id ? 'Nochmals spielen' : 'Spielen') + ' →</a><button class="quiet" id="clear-scores"' + (scores.length ? '' : ' disabled') + '>Rangliste löschen</button></div>';
    $('clear-scores').onclick = () => { if (confirm('Die Rangliste für «' + KQ.CONFIG[id].title + '» wirklich löschen?')) { KQ.storage.clear(id); leaderboard(id); } };
    storageNote();
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
