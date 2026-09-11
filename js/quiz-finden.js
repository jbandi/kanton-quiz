(function (KQ) {
  'use strict';
  KQ.quizzes.finden = {
    render(game) {
      const block = KQ.block(game.index, game.rounds.length);
      game.question(block === 1 ? 'Finde dieses Wappen auf der Karte' : 'Finde: ' + game.target[block === 0 ? 'name' : 'id'], 'Tippe auf den gesuchten Kanton.');
      if (block === 1) game.promptWappen(game.target.id);
      KQ.map.onSelect = id => {
        if (id === game.target.id) game.correct(id);
        else game.wrong(id, false);
      };
    }
  };
})(window.KQ);
