(function (KQ) {
  'use strict';
  const pairs = { AI: 'AR', AR: 'AI', BS: 'BL', BL: 'BS', OW: 'NW', NW: 'OW' };
  KQ.recognitionOptions = function (target, block) {
    const priority = id => (pairs[target.id] === id ? 4 : 0) + (block === 2 && id[0] === target.id[0] ? 2 : 0);
    const order = list => KQ.shuffle(list).sort((a, b) => priority(b) - priority(a));
    const count = Math.min(target.nachbarn.length, 1 + Math.floor(Math.random() * 2));
    const neighbours = order(target.nachbarn).slice(0, count);
    const others = order(KQ.KANTONE.filter(k => k.id !== target.id && !target.nachbarn.includes(k.id)).map(k => k.id)).slice(0, 3 - count);
    return KQ.shuffle([target.id, ...neighbours, ...others]);
  };
  KQ.quizzes = KQ.quizzes || {};
  KQ.quizzes.erkennen = {
    render(game) {
      const block = KQ.block(game.index, game.rounds.length);
      game.question('Welcher Kanton ist markiert?', ['Wähle den Namen', 'Wähle das Wappen', 'Wähle das Kürzel'][block]);
      KQ.map.paint(game.target.id, 'marked');
      game.options(KQ.recognitionOptions(game.target, block), ['name', 'wappen', 'id'][block], id => {
        if (id === game.target.id) game.correct(id);
        else game.wrong(id, true);
      });
    }
  };
})(window.KQ);
