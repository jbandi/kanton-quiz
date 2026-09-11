(function (KQ) {
  'use strict';
  KQ.neighbourOptions = function (target) {
    const count = 1 + Math.floor(Math.random() * Math.min(3, target.nachbarn.length));
    const correct = KQ.shuffle(target.nachbarn).slice(0, count);
    const second = new Set(target.nachbarn.flatMap(id => KQ.byId[id].nachbarn));
    const wrong = KQ.shuffle(KQ.KANTONE.filter(k => k.id !== target.id && !target.nachbarn.includes(k.id)).map(k => k.id))
      .sort((a, b) => Number(second.has(b)) - Number(second.has(a))).slice(0, 4 - count);
    return KQ.shuffle([...correct, ...wrong]);
  };
  KQ.quizzes.nachbarn = {
    render(game) {
      game.question('Welche dieser Kantone grenzen an ' + game.target.name + '?', 'Wähle alle passenden Nachbarn und drücke «Prüfen».');
      KQ.map.paint(game.target.id, 'marked');
      const selected = new Set();
      const choices = KQ.neighbourOptions(game.target);
      const check = document.getElementById('check-answer');
      check.hidden = false;
      check.disabled = true;
      game.options(choices, 'both', (id, button) => {
        if (selected.has(id)) selected.delete(id); else selected.add(id);
        button.classList.toggle('selected', selected.has(id));
        button.setAttribute('aria-pressed', String(selected.has(id)));
        check.disabled = selected.size === 0;
      });
      check.onclick = () => {
        if (game.locked || !selected.size) return;
        let errors = 0;
        choices.forEach(id => {
          const right = game.target.nachbarn.includes(id);
          const picked = selected.has(id);
          const button = game.button(id);
          button.disabled = true;
          if (right && picked) button.classList.add('correct');
          if (!right && picked) { button.classList.add('judged-wrong'); errors++; }
          if (right && !picked) { button.classList.add('missed'); errors++; }
        });
        check.disabled = true;
        game.target.nachbarn.forEach(id => KQ.map.paint(id, 'correct'));
        KQ.map.labels(choices);
        game.errors += errors;
        if (errors) game.penalize(errors);
        game.completeRound(errors ? errors + ' Fehler · Orange = vergessen. Tippe zum Weitergehen.' : 'Alle Nachbarn richtig! Tippe zum Weitergehen.');
      };
    }
  };
})(window.KQ);
