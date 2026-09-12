(function (KQ) {
  'use strict';
  KQ.map = {
    onSelect: null,
    init() {
      this.svg = document.getElementById('swiss-map');
      this.layer = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      this.layer.setAttribute('class', 'map-labels');
      this.layer.setAttribute('aria-hidden', 'true');
      this.svg.append(this.layer);
      this.svg.querySelectorAll('.kanton').forEach(node => {
        const id = node.id.slice(2);
        node.setAttribute('role', 'button');
        node.setAttribute('aria-label', KQ.byId[id].name);
        node.setAttribute('tabindex', '0');
        node.addEventListener('animationend', () => node.classList.remove('success-flash', 'flash'));
        node.addEventListener('click', () => this.select(id));
        node.addEventListener('keydown', event => {
          if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); event.stopPropagation(); this.select(id); }
        });
      });
      let zoom = 1;
      const applyZoom = () => {
        this.svg.style.width = (zoom * 100) + '%';
        document.getElementById('map-scroll').style.maxHeight = zoom === 1 ? 'none' : '600px';
        document.getElementById('zoom-out').disabled = zoom === 1;
        document.getElementById('zoom-in').disabled = zoom === 3;
      };
      document.getElementById('zoom-in').onclick = () => { zoom = Math.min(3, zoom + 0.5); applyZoom(); };
      document.getElementById('zoom-out').onclick = () => { zoom = Math.max(1, zoom - 0.5); applyZoom(); };
      this.resetZoom = () => { zoom = 1; applyZoom(); document.getElementById('map-scroll').scrollTo(0, 0); };
      applyZoom();
    },
    node(id) { return document.getElementById('k-' + id); },
    select(id) {
      if (this.node(id).getAttribute('aria-disabled') !== 'true' && this.onSelect) this.onSelect(id);
    },
    paint(id, state) { this.node(id).classList.add(state); },
    disable(id) { this.node(id).setAttribute('aria-disabled', 'true'); },
    flash(id) {
      const node = this.node(id);
      node.classList.remove('flash');
      void node.getBoundingClientRect();
      node.classList.add('flash');
    },
    reset(keepFound = false) {
      KQ.silhouette?.disable();
      this.onSelect = null;
      this.layer.replaceChildren();
      this.svg.querySelectorAll('.kanton').forEach(node => {
        const found = keepFound && node.classList.contains('correct');
        const flash = found && node.classList.contains('success-flash');
        node.setAttribute('class', 'kanton' + (found ? ' correct' : '') + (flash ? ' success-flash' : ''));
        node.setAttribute('aria-disabled', String(found));
      });
    },
    labels(ids) {
      this.layer.replaceChildren();
      ids.forEach(id => {
        const node = this.node(id);
        const paths = node.matches('path') ? [node] : [...node.querySelectorAll('path')];
        const path = paths.sort((a, b) => { const x = a.getBBox(), y = b.getBBox(); return y.width * y.height - x.width * x.height; })[0] || node;
        const box = path.getBBox();
        let point = this.svg.createSVGPoint();
        point.x = box.x + box.width / 2;
        point.y = box.y + box.height / 2;
        // Concave cantons: choose an interior point close to the bounding-box centre.
        if (path.isPointInFill && !path.isPointInFill(point)) {
          let distance = Infinity;
          for (let x = 0.1; x < 1; x += 0.1) for (let y = 0.1; y < 1; y += 0.1) {
            const candidate = this.svg.createSVGPoint();
            candidate.x = box.x + box.width * x; candidate.y = box.y + box.height * y;
            const d = (x - 0.5) ** 2 + (y - 0.5) ** 2;
            if (d < distance && path.isPointInFill(candidate)) { point = candidate; distance = d; }
          }
        }
        const matrix = this.svg.getCTM().inverse().multiply(path.getCTM());
        point = point.matrixTransform(matrix);
        const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        label.setAttribute('x', point.x); label.setAttribute('y', point.y);
        label.textContent = id;
        this.layer.append(label);
      });
    }
  };
})(window.KQ);
