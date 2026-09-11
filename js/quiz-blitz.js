(function (KQ) {
  'use strict';
  KQ.quizzes.blitz = {
    render(game) {
      game.question('Finde: ' + game.target.name, game.target.id + ' · Bereits gefundene Kantone bleiben grün.');
      KQ.map.onSelect = id => {
        if (id === game.target.id) game.correct(id);
        else game.wrong(id, false);
      };
    }
  };
})(window.KQ);
