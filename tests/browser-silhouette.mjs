import assert from 'node:assert/strict';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || '../worker/node_modules/playwright/index.mjs');
const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || (process.env.CI ? undefined : 'chrome'), headless: true });
const page = await browser.newPage({ viewport: { width: 768, height: 1024 }, hasTouch: true });
const url = new URL('../index.html', import.meta.url).href;
const errors = []; page.on('pageerror', e => errors.push(e.message));
async function pointFor(id, tolerance = false) {
  return page.evaluate(({ id, tolerance }) => {
    const original = KQ.map.node(id);
    const paths = [...original.querySelectorAll('path')];
    const box = original.getBBox();
    const radius = KQ.silhouette.shapes[id].radius;
    for (let x = box.x - radius; x < box.x + box.width + radius; x += 2) {
      for (let y = box.y - radius; y < box.y + box.height + radius; y += 2) {
        const point = new DOMPoint(x, y);
        const inside = paths.some(p => p.isPointInFill(point));
        if ((tolerance ? !inside : inside) && KQ.silhouette.contains(id, point) && (!tolerance || [[-2,0],[2,0],[0,-2],[0,2]].every(([dx,dy]) => KQ.silhouette.contains(id, { x:x+dx, y:y+dy })))) return { x, y };
      }
    }
    throw Error('No test point for ' + id);
  }, { id, tolerance });
}
async function tap(point) {
  const screen = await page.evaluate(point => {
    const screen = new DOMPoint(point.x, point.y).matrixTransform(KQ.map.svg.getScreenCTM());
    return { x: screen.x, y: screen.y };
  }, point);
  await page.touchscreen.tap(screen.x, screen.y);
}
try {
  await page.goto(url + '#/trefferflaechen');
  assert.equal(await page.locator('#hitareas-view').isVisible(), true);
  const cantons = await page.evaluate(() => KQ.KANTONE);
  for (const canton of cantons) {
    const point = await pointFor(canton.id);
    assert.equal(await page.evaluate(({ id, point }) => KQ.silhouette.contains(id, point), { id: canton.id, point }), true);
  }
  for (const id of ['BS', 'AI', 'AR', 'ZG', 'NW', 'OW', 'GE']) {
    await page.locator('#hit-canton').selectOption(id);
    const point = await pointFor(id, true);
    await page.locator('#swiss-map').scrollIntoViewIfNeeded();
    await tap(point);
    assert.match(await page.locator('#hit-status').textContent(), /^Treffer:/, id + ' ' + JSON.stringify(point));
    // Verify the same map point remains accepted at a different display scale.
    await page.locator('#zoom-in').click();
    assert.equal(await page.evaluate(({ id, point }) => KQ.silhouette.contains(id, point), { id, point }), true);
    await page.locator('#zoom-out').click();
  }
  await page.locator('#hit-canton').selectOption('BS');
  await page.locator('#swiss-map').focus();
  const before = await page.evaluate(() => KQ.silhouette.cursor.x);
  await page.keyboard.press('ArrowRight');
  assert.equal(await page.evaluate(() => KQ.silhouette.cursor.x), before + 8);
  await page.keyboard.press('Shift+ArrowLeft');
  assert.equal(await page.evaluate(() => KQ.silhouette.cursor.x), before - 16);
  await page.keyboard.press('Enter');
  assert.ok((await page.locator('#hit-status').textContent()).length > 0);
  await page.locator('#hit-canton').selectOption('');
  await page.screenshot({ path: '/tmp/kanton-quiz-hitareas.png', fullPage: true });
  await page.goto(url + '#/');
  assert.equal(await page.locator('a[href*="trefferflaechen"]').count(), 0);
  await page.locator('a[href="#/quiz/silhouette"]').click();
  await page.clock.install();
  const seen = new Set();
  for (let i = 0; i < 9; i++) {
    await page.waitForFunction(i => document.getElementById('round-counter').textContent === 'Runde ' + (i + 1) + ' von 9', i);
    let id;
    if (i >= 3 && i < 6) id = (await page.locator('#prompt-wappen img').getAttribute('src')).match(/([A-Z]{2})\.svg/)[1];
    else {
      const text = (await page.locator('#question').textContent()).replace('Finde: ', '');
      id = cantons.find(k => k.name === text || k.id === text).id;
    }
    assert.ok(!seen.has(id)); seen.add(id);
    assert.equal(await page.locator('.map-labels text').count(), 0);
    assert.equal(await page.locator('.kanton[tabindex="0"]').count(), 0);
    const styles = await page.locator('.kanton').evaluateAll(nodes => nodes.map(n => { const s = getComputedStyle(n); return s.fill + '/' + s.stroke; }));
    assert.equal(new Set(styles).size, 1);
    if (i === 0) {
      await page.screenshot({ path: '/tmp/kanton-quiz-silhouette.png', fullPage: true });
      await tap({ x: 20, y: 20 });
      assert.equal(await page.locator('#penalty-total').textContent(), 'inkl. 10 s Malus');
      assert.equal(await page.evaluate(() => KQ.silhouette.contains('BS', { x: 20, y: 20 })), false);
    }
    const point = await pointFor(id, i === 0);
    await tap(point);
    assert.equal(await page.locator('#feedback').isVisible(), true);
    await page.clock.runFor(1300);
  }
  await page.locator('#score-form').waitFor();
  assert.equal(await page.locator('.round-results li').count(), 9);
  assert.equal(await page.evaluate(() => KQ.onlineStorage.load().recent.errors), 1);
  assert.equal(await page.evaluate(() => KQ.onlineStorage.load().recent.quizId), 'silhouette');
  await page.goto(url + '#/lernen');
  assert.equal(await page.locator('#swiss-map').evaluate(n => n.classList.contains('silhouette')), false);
  assert.equal(await page.locator('.kanton[tabindex="0"]').count(), 26);
  assert.equal(await page.locator('.map-labels text').count(), 26);
  assert.deepEqual(errors, []);
  console.log('✓ Silhouette: 26 Trefferflächen, Toleranz für kleine Kantone, Zoom, Touch, neun Runden mit Namen/Wappen/Kürzeln, Malus und Rückkehr zur normalen Karte.');
} finally { await browser.close(); }
