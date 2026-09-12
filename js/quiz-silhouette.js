(function (KQ) {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';
  // Radius in map coordinates: small cantons get 14 units, large ones 4.
  // It scales with zoom, so a location is judged identically at every zoom level.
  KQ.silhouette = {
    active: false,
    init() {
      this.svg = KQ.map.svg;
      this.areas = document.createElementNS(NS, 'g');
      this.areas.setAttribute('class', 'hit-areas');
      this.areas.setAttribute('aria-hidden', 'true');
      this.shapes = {};
      for (const canton of KQ.KANTONE) {
        const source = KQ.map.node(canton.id);
        const box = source.getBBox();
        const radius = Math.max(4, Math.min(14, 18 - Math.sqrt(box.width * box.height) / 8));
        const group = source.cloneNode(true);
        for (const node of [group, ...group.querySelectorAll('*')]) {
          for (const attr of ['id', 'class', 'tabindex', 'role', 'aria-label', 'aria-disabled']) node.removeAttribute(attr);
        }
        group.dataset.canton = canton.id;
        group.style.strokeWidth = String(radius * 2);
        group.style.strokeLinejoin = 'round';
        group.style.strokeLinecap = 'round';
        group.style.fill = group.style.stroke = 'hsl(' + (KQ.KANTONE.indexOf(canton) * 137.5 % 360) + ' 70% 45%)';
        this.areas.append(group);
        this.shapes[canton.id] = { radius, group, paths: group.matches('path') ? [group] : [...group.querySelectorAll('path')] };
      }
      this.svg.append(this.areas);
      this.marker = document.createElementNS(NS, 'circle');
      this.marker.setAttribute('r', '5'); this.marker.setAttribute('class', 'map-hit-marker');
      this.svg.append(this.marker);
      this.svg.addEventListener('click', event => {
        if (!this.active) return;
        event.stopImmediatePropagation();
        const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(this.svg.getScreenCTM().inverse());
        this.choose(point);
      }, true);
      this.svg.addEventListener('keydown', event => {
        if (!this.active) return;
        const moves = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
        if (moves[event.key]) {
          event.preventDefault();
          const step = event.shiftKey ? 24 : 8;
          this.cursor.x = Math.max(0, Math.min(1052, this.cursor.x + moves[event.key][0] * step));
          this.cursor.y = Math.max(0, Math.min(744, this.cursor.y + moves[event.key][1] * step));
          this.mark(this.cursor, 'cursor');
        } else if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); this.choose(this.cursor); }
      });
      this.disable();
    },
    contains(id, point) {
      return this.shapes[id].paths.some(path => {
        const local = new DOMPoint(point.x, point.y).matrixTransform(this.svg.getCTM().inverse().multiply(path.getCTM()).inverse());
        return path.isPointInFill(local) || path.isPointInStroke(local);
      });
    },
    choose(point) { this.cursor = { x: point.x, y: point.y }; if (this.onPoint) this.onPoint(point); },
    mark(point, state) {
      this.marker.setAttribute('cx', point.x); this.marker.setAttribute('cy', point.y);
      this.marker.dataset.state = state; this.marker.style.display = '';
    },
    enable(onPoint, debug = false) {
      this.active = true; this.onPoint = onPoint; this.cursor = { x: 526, y: 372 };
      this.svg.classList.add('silhouette'); this.svg.classList.toggle('show-hit-areas', debug);
      this.svg.setAttribute('tabindex', '0'); this.svg.setAttribute('aria-label', 'Schweizer Karte ohne Kantonsgrenzen. Pfeiltasten bewegen den Punkt, Enter bestätigt.');
      this.svg.querySelectorAll('.kanton').forEach(node => { node.setAttribute('tabindex', '-1'); node.setAttribute('aria-hidden', 'true'); });
    },
    disable() {
      this.active = false; this.onPoint = null;
      this.svg.classList.remove('silhouette', 'show-hit-areas');
      this.svg.removeAttribute('tabindex'); this.svg.setAttribute('aria-label', 'Karte der 26 Schweizer Kantone');
      this.svg.querySelectorAll('.kanton').forEach(node => { node.setAttribute('tabindex', '0'); node.removeAttribute('aria-hidden'); });
      this.marker.style.display = 'none';
    },
    inspect(id) {
      for (const [key, shape] of Object.entries(this.shapes)) shape.group.style.opacity = !id || key === id ? '0.45' : '0';
    }
  };
  KQ.quizzes.silhouette = {
    render(game) {
      const block = KQ.block(game.index, game.rounds.length);
      game.question(block === 1 ? 'Finde dieses Wappen auf der Karte' : 'Finde: ' + game.target[block === 0 ? 'name' : 'id'], 'Tippe dorthin, wo der Kanton liegt. Kleine Kantone haben einen Toleranzrand.');
      if (block === 1) game.promptWappen(game.target.id);
      document.getElementById('keyboard-hint').textContent = 'Karte: Pfeiltasten bewegen den Punkt, Umschalt beschleunigt, Enter bestätigt. Zum Verschieben vergrössern.';
      KQ.silhouette.enable(point => {
        if (game.locked) return;
        const hit = KQ.silhouette.contains(game.target.id, point);
        KQ.silhouette.mark(point, hit ? 'correct' : 'wrong');
        if (hit) game.correct(game.target.id);
        else { game.errors++; game.penalize(); }
      });
    }
  };
})(window.KQ);
