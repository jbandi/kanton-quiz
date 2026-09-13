(function (KQ) {
  'use strict';
  KQ.quizzes['wappen-erkennen'] = {
    render(game) {
      game.question('Zu welchem Kanton gehört dieses Wappen?', 'Wähle den Namen.');
      game.promptWappen(game.target.id);
      game.options(KQ.recognitionOptions(game.target, 0), 'name', id => {
        if (id === game.target.id) game.correct(id);
        else game.wrong(id, true);
      });
    }
  };
  KQ.quizzes['wappen-blitz'] = {
    render(game) {
      game.question('Finde das Wappen: ' + game.target.name, 'Bereits gefundene Wappen bleiben grün.');
      const grid = document.getElementById('wappen-grid');
      // Keep the shuffled positions and buttons stable throughout the game.
      if (grid.childElementCount) return;
      KQ.shuffle(KQ.KANTONE).forEach((canton, index) => {
        const button = document.createElement('button');
        button.className = 'option';
        button.dataset.id = canton.id;
        button.setAttribute('aria-label', 'Wappen – Antwort ' + (index + 1));
        const img = document.createElement('img');
        img.className = 'crest';
        img.src = 'assets/wappen/' + canton.id + '.svg';
        img.alt = '';
        button.append(img);
        button.onclick = () => {
          if (game.locked || button.disabled) return;
          if (canton.id === game.target.id) {
            button.classList.remove('shake');
            button.classList.add('correct');
            button.disabled = true;
            button.setAttribute('aria-label', canton.name + ' – gefunden');
            game.correct(canton.id);
          } else {
            game.errors++;
            game.penalize();
            button.classList.remove('shake');
            void button.offsetWidth;
            button.classList.add('shake');
          }
        };
        grid.append(button);
      });
    }
  };
})(window.KQ);
